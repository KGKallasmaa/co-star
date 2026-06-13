import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ChatMessage } from "./api";

export interface SavedMessage {
  id: string;
  type: "user" | "ai" | "routing";
  charId?: string;
  text: string;
  timestamp: number;
}

export interface SavedConv {
  id: string;
  title: string;
  charId: string;
  boardMode: boolean;
  messages: SavedMessage[];
  history: ChatMessage[];
  ts: number;
}

const KEY = "costar_convs_v2";
const MAX_CONVS = 30;

export async function loadConversations(): Promise<SavedConv[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedConv[];
  } catch {
    return [];
  }
}

export async function saveConversation(conv: SavedConv): Promise<void> {
  try {
    const all = await loadConversations();
    const idx = all.findIndex((c) => c.id === conv.id);
    if (idx !== -1) {
      all[idx] = conv;
    } else {
      all.unshift(conv);
    }
    const trimmed = all.slice(0, MAX_CONVS);
    await AsyncStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {}
}

export async function deleteConversation(id: string): Promise<void> {
  try {
    const all = await loadConversations();
    const filtered = all.filter((c) => c.id !== id);
    await AsyncStorage.setItem(KEY, JSON.stringify(filtered));
  } catch {}
}
