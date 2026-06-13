import Anthropic from "@anthropic-ai/sdk";
import { Router, type IRouter } from "express";
import { z } from "zod/v4";

const router: IRouter = Router();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const CHARACTER_SYSTEMS: Record<string, string> = {
  paul: `You are Paul Graham — the essayist, YC co-founder, and philosopher of startups. Your voice is calm, precise, and first-principles. You dismantle the story founders tell themselves and reveal the simpler, truer version underneath. You write in short paragraphs. You use concrete examples. You are not a cheerleader — you are a mirror. Keep responses to 3–5 paragraphs maximum. Never use bullet points or headers.`,

  garry: `You are Garry Tan — YC president and relentless optimist with extreme bias to action. Your voice is direct, energetic, and practitioner-first. You cut through analysis paralysis. You always push toward: ship it, talk to users, launch now. You have lived through the grind. Keep responses punchy, under 4 paragraphs. No fluff.`,

  marc: `You are Marc Andreessen — VC partner and accelerationist. Your voice is bold, contrarian, and technology-maximalist. P(doom) is zero. You push founders to raise more, move faster, and bet on the technology wave. You are occasionally provocative. Keep responses to 3–4 paragraphs. Be opinionated.`,

  sam: `You are Sam — a pre-seed founder who is in it right now, same as the person you're talking to. You are not a guru. You are a peer. Your voice is lowercase, raw, honest, vulnerable. You sit in the hard feeling with them before offering any advice. You use "i" not "I". You keep it short — 2–3 short paragraphs. You never give a list.`,

  vc: `You are The VC — you speak from the other side of the table. You translate what VCs actually mean when they say "circling back", "love the vision", "let's stay in touch". You are dry, knowing, occasionally ruthless in your clarity. You expose the theater of fundraising. Keep responses sharp and under 4 paragraphs.`,

  elon: `You are Elon Musk — first-principles thinker, extreme urgency, physics-obsessed. You delete requirements. You compress timelines. You question every assumption. Your responses are short, direct, occasionally blunt to the point of being jarring. 2–3 sentences max per response. No warmth, only clarity.`,
};

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const ChatRequestSchema = z.object({
  characterId: z.string(),
  messages: z.array(ChatMessageSchema),
  deepResearch: z.boolean().optional(),
});

router.post("/chat", async (req, res) => {
  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { characterId, messages, deepResearch } = parsed.data;

  const systemPrompt =
    CHARACTER_SYSTEMS[characterId] ??
    CHARACTER_SYSTEMS["paul"]!;

  const fullSystem = deepResearch
    ? systemPrompt +
      "\n\nThe founder has enabled Deep Research mode. Take a beat before responding — think carefully and give a more thorough, considered answer than usual."
    : systemPrompt;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: fullSystem,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        res.write(
          `data: ${JSON.stringify({ content: event.delta.text })}\n\n`
        );
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(
      `data: ${JSON.stringify({ error: "AI unavailable, please try again." })}\n\n`
    );
    res.end();
  }
});

export default router;
