import { fetch } from "expo/fetch";

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

export async function streamChat(
  characterId: string,
  messages: ChatMessage[],
  deepResearch: boolean,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void
): Promise<void> {
  const base = getApiBaseUrl();

  const response = await fetch(`${base}chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ characterId, messages, deepResearch }),
  });

  if (!response.ok) {
    onError("Failed to connect to advisor.");
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError("No response stream.");
    return;
  }

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
      const data = line.slice(6);
      try {
        const parsed = JSON.parse(data) as {
          content?: string;
          done?: boolean;
          error?: string;
        };
        if (parsed.error) {
          onError(parsed.error);
          return;
        }
        if (parsed.done) {
          onDone();
          return;
        }
        if (parsed.content) {
          onChunk(parsed.content);
        }
      } catch {}
    }
  }

  onDone();
}
