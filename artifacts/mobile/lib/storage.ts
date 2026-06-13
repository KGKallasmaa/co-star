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

export interface SavedTake {
  id: string;
  charId: string;
  text: string;
  ts: number;
}

const CONV_KEY = "costar_convs_v2";
const TAKES_KEY = "costar_saved_takes";
const MAX_CONVS = 30;
const MAX_TAKES = 50;

// ─── Conversations ────────────────────────────────────────────────────────────

export async function loadConversations(): Promise<SavedConv[]> {
  try {
    const raw = await AsyncStorage.getItem(CONV_KEY);
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
    if (idx !== -1) { all[idx] = conv; } else { all.unshift(conv); }
    await AsyncStorage.setItem(CONV_KEY, JSON.stringify(all.slice(0, MAX_CONVS)));
  } catch {}
}

export async function deleteConversation(id: string): Promise<void> {
  try {
    const all = await loadConversations();
    await AsyncStorage.setItem(CONV_KEY, JSON.stringify(all.filter((c) => c.id !== id)));
  } catch {}
}

// ─── Saved takes ──────────────────────────────────────────────────────────────

export async function loadSavedTakes(): Promise<SavedTake[]> {
  try {
    const raw = await AsyncStorage.getItem(TAKES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedTake[];
  } catch {
    return [];
  }
}

export async function saveTake(take: SavedTake): Promise<void> {
  try {
    const all = await loadSavedTakes();
    all.unshift(take);
    await AsyncStorage.setItem(TAKES_KEY, JSON.stringify(all.slice(0, MAX_TAKES)));
  } catch {}
}

export async function deleteTake(id: string): Promise<void> {
  try {
    const all = await loadSavedTakes();
    await AsyncStorage.setItem(TAKES_KEY, JSON.stringify(all.filter((t) => t.id !== id)));
  } catch {}
}
