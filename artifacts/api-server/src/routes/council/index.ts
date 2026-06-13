import Anthropic from "@anthropic-ai/sdk";
import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import {
  ADVISORS,
  ADVISOR_IDS,
  COUNCIL_ID,
  buildSystem,
  founderContext,
  scoreAdvisors,
  type FounderProfile,
} from "../../advisors";

const router: IRouter = Router();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const ProfileSchema = z
  .object({
    name: z.string().optional(),
    role: z.string().optional(),
    startupName: z.string().optional(),
    oneLiner: z.string().optional(),
    stage: z.string().optional(),
  })
  .optional();

const CouncilRequestSchema = z.object({
  messages: z.array(ChatMessageSchema),
  profile: ProfileSchema,
});

function sse(res: any, obj: unknown) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`);
}

// ── Panel selection ──────────────────────────────────────────────────────────
// Pick the 2–3 most qualified advisors for this question, ordered by relevance.
// A fast model does the judging; keyword scoring is the instant fallback so the
// council never stalls during a live demo.

async function selectPanel(
  question: string,
  _profile?: FounderProfile
): Promise<{ panel: string[]; lead: string; reason: string }> {
  const fallback = () => {
    const ranked = scoreAdvisors(question);
    const top = ranked.filter((id, i) => i < 3);
    const panel = (top.length >= 2 ? top : ["paul", "garry", "sam"]).slice(0, 3);
    return { panel, lead: panel[0]!, reason: "" };
  };

  if (!question.trim()) return fallback();

  try {
    const roster = ADVISOR_IDS.map(
      (id) => `- ${id}: ${ADVISORS[id]!.name} — ${ADVISORS[id]!.expertise}`
    ).join("\n");
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      system: `You convene a council of startup advisors. Given a founder's question, pick the 2–3 MOST qualified to weigh in, ordered most-qualified first. Roster:\n${roster}\n\nReturn ONLY compact JSON, no prose: {"panel":["id","id"],"lead":"id","reason":"<≤6 words why this mix>"}. Choose voices that will productively DISAGREE — not three who'd say the same thing.`,
      messages: [{ role: "user", content: question.slice(0, 2000) }],
    });
    const text = msg.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    const json = JSON.parse(
      text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)
    );
    let panel: string[] = Array.isArray(json.panel)
      ? json.panel.filter((id: string) => ADVISOR_IDS.includes(id))
      : [];
    panel = [...new Set(panel)].slice(0, 3);
    if (panel.length < 2) return fallback();
    const lead =
      typeof json.lead === "string" && panel.includes(json.lead)
        ? json.lead
        : panel[0]!;
    return {
      panel,
      lead,
      reason: typeof json.reason === "string" ? json.reason.slice(0, 80) : "",
    };
  } catch {
    return fallback();
  }
}

// ── Route ────────────────────────────────────────────────────────────────────

router.post("/council", async (req, res) => {
  const parsed = CouncilRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { messages, profile } = parsed.data;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const question = lastUser?.content ?? "";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let closed = false;
  req.on("close", () => {
    closed = true;
  });

  try {
    const { panel, lead, reason } = await selectPanel(question, profile);
    sse(res, { type: "panel", advisors: panel, lead, reason });

    const takes: { id: string; text: string }[] = [];
    const apiMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    for (const id of panel) {
      if (closed) return;
      const others = panel
        .filter((p) => p !== id)
        .map((p) => ADVISORS[p]!.name)
        .join(" and ");
      const transcript = takes.length
        ? `\n\nWhat the others have said so far in this session:\n${takes
            .map((t) => `${ADVISORS[t.id]!.name}: "${t.text.trim()}"`)
            .join("\n\n")}`
        : "";
      const extra = `You are in a live council with ${others}, debating in front of the founder. This is a fast, candid exchange — NOT a monologue. Keep it to 2–3 short paragraphs. ${
        takes.length
          ? "React to what the others just said: agree and sharpen it, or push back by name where you genuinely disagree — then add the thing only you would see."
          : "You're opening the debate. Stake out your view clearly so the others have something real to push against."
      }${transcript}`;

      sse(res, { type: "advisorStart", advisorId: id });
      let full = "";
      const stream = client.messages.stream({
        model: "claude-sonnet-4-5",
        max_tokens: 500,
        system: buildSystem(id, profile, extra),
        messages: apiMessages,
      });
      for await (const event of stream) {
        if (closed) break;
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          full += event.delta.text;
          sse(res, { type: "delta", advisorId: id, content: event.delta.text });
        }
      }
      takes.push({ id, text: full });
      sse(res, { type: "advisorDone", advisorId: id });
    }

    // ── The call: a short synthesis spoken as "the room" ──
    if (!closed && takes.length) {
      const names = panel.map((p) => ADVISORS[p]!.name).join(", ");
      const synthSystem =
        `You are the chair of this founder's council. ${names} just weighed in. In 2–3 sentences, cut to the call: name where they actually agree, the one real tension between them, and what you'd do first. Decisive, plain, no lists, no preamble. Speak as "the room", not as any one advisor.` +
        founderContext(profile);
      sse(res, { type: "advisorStart", advisorId: COUNCIL_ID });
      const synthStream = client.messages.stream({
        model: "claude-sonnet-4-5",
        max_tokens: 240,
        system: synthSystem,
        messages: [
          ...apiMessages,
          {
            role: "user",
            content: `The council said:\n${takes
              .map((t) => `${ADVISORS[t.id]!.name}: ${t.text.trim()}`)
              .join("\n\n")}\n\nNow give me the call.`,
          },
        ],
      });
      for await (const event of synthStream) {
        if (closed) break;
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          sse(res, {
            type: "delta",
            advisorId: COUNCIL_ID,
            content: event.delta.text,
          });
        }
      }
      sse(res, { type: "advisorDone", advisorId: COUNCIL_ID });
    }

    sse(res, { type: "done" });
    res.end();
  } catch (err: any) {
    const msg =
      err?.status === 404
        ? "This model isn't available yet on your API key. Try again shortly."
        : "The council ran into something. Try again.";
    sse(res, { type: "error", message: msg });
    res.end();
  }
});

export default router;
