import Anthropic from "@anthropic-ai/sdk";
import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { buildSystem } from "../../advisors";

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

const ChatRequestSchema = z.object({
  characterId: z.string(),
  messages: z.array(ChatMessageSchema),
  profile: ProfileSchema,
});

router.post("/chat", async (req, res) => {
  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { characterId, messages, profile } = parsed.data;

  const fullSystem = buildSystem(characterId, profile);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
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
  } catch (err: any) {
    const msg =
      err?.status === 404
        ? "This model isn't available yet on your API key. Try again shortly."
        : "Something went wrong. Try again.";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
});

export default router;
