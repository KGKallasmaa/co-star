import { fetch } from "expo/fetch";
import type { FounderProfile } from "./profile";

export function getApiBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return `https://${domain}/api/`;
  }
  return "/api/";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ── Shared SSE reader ─────────────────────────────────────────────────────────
// Calls onEvent with each parsed `data:` payload. Return true from onEvent to stop.

async function readSSE(
  body: ReadableStream<Uint8Array> | null,
  onEvent: (obj: any) => boolean | void
): Promise<void> {
  const reader = body?.getReader();
  if (!reader) throw new Error("No response stream.");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const stop = onEvent(JSON.parse(line.slice(6)));
        if (stop === true) return;
      } catch {}
    }
  }
}

// ── Single advisor ────────────────────────────────────────────────────────────

export async function streamChat(
  characterId: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
  profile?: FounderProfile
): Promise<void> {
  const base = getApiBaseUrl();

  let response: Response;
  try {
    response = (await fetch(`${base}chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ characterId, messages, profile }),
    })) as unknown as Response;
  } catch {
    onError("Couldn't reach your advisor. Check your connection.");
    return;
  }

  if (!response.ok) {
    onError("Failed to connect to advisor.");
    return;
  }

  let settled = false;
  try {
    await readSSE(response.body as any, (parsed) => {
      if (parsed.error) {
        settled = true;
        onError(parsed.error);
        return true;
      }
      if (parsed.done) {
        settled = true;
        onDone();
        return true;
      }
      if (parsed.content) onChunk(parsed.content);
    });
  } catch {
    if (!settled) onError("The connection dropped mid-thought. Try again.");
    return;
  }

  if (!settled) onDone();
}

// ── The council ───────────────────────────────────────────────────────────────

export interface CouncilHandlers {
  /** The 2–3 advisors convened, ordered most-qualified first. */
  onPanel: (advisors: string[], lead: string, reason: string) => void;
  /** A voice (advisor id, or "council" for the closing synthesis) begins. */
  onAdvisorStart: (advisorId: string) => void;
  onDelta: (advisorId: string, text: string) => void;
  onAdvisorDone: (advisorId: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}

export async function streamCouncil(
  messages: ChatMessage[],
  profile: FounderProfile | undefined,
  h: CouncilHandlers
): Promise<void> {
  const base = getApiBaseUrl();

  let response: Response;
  try {
    response = (await fetch(`${base}council`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ messages, profile }),
    })) as unknown as Response;
  } catch {
    h.onError("Couldn't reach the council. Check your connection.");
    return;
  }

  if (!response.ok) {
    h.onError("Failed to convene the council.");
    return;
  }

  let settled = false;
  try {
    await readSSE(response.body as any, (e) => {
      switch (e.type) {
        case "panel":
          h.onPanel(e.advisors ?? [], e.lead ?? "", e.reason ?? "");
          break;
        case "advisorStart":
          h.onAdvisorStart(e.advisorId);
          break;
        case "delta":
          h.onDelta(e.advisorId, e.content ?? "");
          break;
        case "advisorDone":
          h.onAdvisorDone(e.advisorId);
          break;
        case "error":
          settled = true;
          h.onError(e.message ?? "The council ran into something.");
          return true;
        case "done":
          settled = true;
          h.onDone();
          return true;
      }
    });
  } catch {
    if (!settled) h.onError("The council connection dropped. Try again.");
    return;
  }

  if (!settled) h.onDone();
}
