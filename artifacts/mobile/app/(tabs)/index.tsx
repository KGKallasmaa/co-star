import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Animated,
  Platform,
  Pressable,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import { useColors } from "@/hooks/useColors";
import {
  CHARACTERS,
  BOARD_MEMBER_IDS,
  COUNCIL_ID,
  ROAST_LINES,
  TEMPLATES,
} from "@/constants/characters";
import { matchDemo } from "@/constants/demo";
import { streamChat, streamCouncil, type ChatMessage } from "@/lib/api";
import {
  loadProfile,
  saveProfile,
  type FounderProfile,
} from "@/lib/profile";
import {
  loadConversations,
  saveConversation,
  deleteConversation,
  loadSavedTakes,
  saveTake,
  type SavedConv,
  type SavedMessage,
  type SavedTake,
} from "@/lib/storage";
import CharacterAvatar from "@/components/CharacterAvatar";
import LogoStar from "@/components/LogoStar";
import HomeScreen from "@/components/HomeScreen";
import Sidebar from "@/components/Sidebar";
import CharacterSheet from "@/components/CharacterSheet";
import SettingsSheet from "@/components/SettingsSheet";

// ─── Mode: one source of truth for who's answering ────────────────────────────
// auto   → the right voice is picked per message
// single → locked to one advisor for EVERY message until you change it
// council→ the most-qualified voices debate, then "the call"
export type ChatMode =
  | { kind: "auto" }
  | { kind: "single"; id: string }
  | { kind: "council" };

type MessageType = "user" | "ai" | "routing";

interface Message {
  id: string;
  type: MessageType;
  charId?: string;
  text: string;
  timestamp: number;
}

let _msgCounter = 0;
function uid() {
  _msgCounter++;
  return `msg-${Date.now()}-${_msgCounter}-${Math.random().toString(36).slice(2, 9)}`;
}
function convId() {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function takeId() {
  return `take-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Blinking cursor ──────────────────────────────────────────────────────────

function BlinkingCursor({ color }: { color: string }) {
  const op = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.Text style={{ opacity: op, color, fontSize: 15, lineHeight: 23 }}> ▋</Animated.Text>
  );
}

// ─── Live pulsing dot ─────────────────────────────────────────────────────────

function LiveDot({ active, color }: { active: boolean; color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const op = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    if (active) {
      Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.6, duration: 700, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      Animated.timing(op, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  }, [active]);

  return (
    <Animated.View
      style={{
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: color,
        transform: [{ scale }],
        opacity: op,
      }}
    />
  );
}

// ─── Typing dots bubble ───────────────────────────────────────────────────────

function TypingBubble({ charId }: { charId: string }) {
  const colors = useColors();
  const char = CHARACTERS[charId];
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const makeLoop = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 280, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );
    const a1 = makeLoop(dot1, 0);
    const a2 = makeLoop(dot2, 160);
    const a3 = makeLoop(dot3, 320);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  if (!char) return null;
  return (
    <FadeSlideIn>
      <View style={tbStyles.row}>
        <CharacterAvatar initials={char.initials} color={char.color} size={30} />
        <View style={[tbStyles.bubble, { backgroundColor: colors.card, borderLeftColor: char.color, borderColor: colors.line }]}>
          <View style={tbStyles.dots}>
            {[dot1, dot2, dot3].map((d, i) => (
              <Animated.View key={i} style={[tbStyles.dot, { backgroundColor: char.color, opacity: d }]} />
            ))}
          </View>
        </View>
      </View>
    </FadeSlideIn>
  );
}
const tbStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 9, paddingHorizontal: 14, paddingVertical: 4, maxWidth: "90%" },
  bubble: { borderWidth: 1, borderLeftWidth: 3, borderRadius: 15, borderTopLeftRadius: 5, paddingHorizontal: 14, paddingVertical: 12 },
  dots: { flexDirection: "row", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

// ─── Fade + slide entrance wrapper ───────────────────────────────────────────

function FadeSlideIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Routing chip ─────────────────────────────────────────────────────────────

function RoutingChip({ text }: { text: string }) {
  const colors = useColors();
  return (
    <View style={[rcStyles.chip, { backgroundColor: colors.background2, borderColor: colors.line }]}>
      <Text style={[rcStyles.text, { color: colors.faint }]}>{text}</Text>
    </View>
  );
}
const rcStyles = StyleSheet.create({
  chip: {
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginVertical: 4,
  },
  text: {
    fontSize: 9.5,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    letterSpacing: 0.2,
  },
});

// ─── AI paragraph renderer ────────────────────────────────────────────────────

function AIText({ text, color, isStreaming }: { text: string; color: string; isStreaming: boolean }) {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  if (paragraphs.length === 0) return null;

  return (
    <View>
      {paragraphs.map((para, i) => (
        <Text key={i} style={[aiTextStyles.para, { color }, i > 0 && aiTextStyles.gap]}>
          {para.trim()}
          {isStreaming && i === paragraphs.length - 1 && (
            <BlinkingCursor color={color} />
          )}
        </Text>
      ))}
    </View>
  );
}
const aiTextStyles = StyleSheet.create({
  para: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  gap: { marginTop: 12 },
});

// ─── Message row ──────────────────────────────────────────────────────────────

interface MessageRowProps {
  message: Message;
  isStreaming: boolean;
  isNew: boolean;
  onSave: (msg: Message) => void;
}

function MessageRow({ message, isStreaming, isNew, onSave }: MessageRowProps) {
  const colors = useColors();
  const [menuOpen, setMenuOpen] = useState(false);

  if (message.type === "routing") {
    return (
      <FadeSlideIn>
        <RoutingChip text={message.text} />
      </FadeSlideIn>
    );
  }

  if (message.type === "user") {
    const inner = (
      <View style={mrStyles.userRow}>
        <View style={[mrStyles.userBubble, { backgroundColor: colors.saber }]}>
          <Text style={[mrStyles.userText, { color: "#04111f" }]}>{message.text}</Text>
        </View>
      </View>
    );
    return isNew ? <FadeSlideIn>{inner}</FadeSlideIn> : inner;
  }

  const char = CHARACTERS[message.charId!];
  if (!char) return null;
  const isCouncil = message.charId === COUNCIL_ID;

  async function handleShare() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setMenuOpen(false);
    const snippet = message.text.length > 240
      ? message.text.slice(0, 240).trimEnd() + "…"
      : message.text;
    await Share.share({
      message: `"${snippet}"\n\n— ${char!.name}, via Co-Star for Founders`,
    });
  }

  function handleSaveTake() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setMenuOpen(false);
    onSave(message);
  }

  const bubble = (
    <Pressable
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        setMenuOpen((v) => !v);
      }}
      onPress={() => menuOpen && setMenuOpen(false)}
    >
      <View style={mrStyles.aiRow}>
        <CharacterAvatar initials={char.initials} color={char.color} size={30} />
        <View style={mrStyles.aiColumn}>
          <View
            style={[
              mrStyles.aiBubble,
              {
                backgroundColor: isCouncil ? "rgba(217,169,76,0.07)" : colors.card,
                borderColor: isCouncil ? "rgba(217,169,76,0.35)" : colors.line,
                borderLeftColor: char.color,
              },
            ]}
          >
            <Text style={[mrStyles.aiName, { color: char.color }]}>
              {isCouncil ? "THE CALL" : char.name.toUpperCase()}
            </Text>
            <AIText text={message.text} color={colors.foreground} isStreaming={isStreaming} />
          </View>
          {menuOpen && (
            <View style={[mrStyles.actionMenu, { backgroundColor: colors.background2, borderColor: colors.line }]}>
              <TouchableOpacity style={mrStyles.actionItem} onPress={handleSaveTake} activeOpacity={0.7}>
                <Feather name="bookmark" size={13} color={colors.saber} />
                <Text style={[mrStyles.actionText, { color: colors.foreground }]}>Save this take</Text>
              </TouchableOpacity>
              <View style={[mrStyles.actionDivider, { backgroundColor: colors.line }]} />
              <TouchableOpacity style={mrStyles.actionItem} onPress={handleShare} activeOpacity={0.7}>
                <Feather name="share" size={13} color={colors.dim} />
                <Text style={[mrStyles.actionText, { color: colors.foreground }]}>Share</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );

  return isNew && !isStreaming ? <FadeSlideIn>{bubble}</FadeSlideIn> : bubble;
}

const mrStyles = StyleSheet.create({
  userRow: {
    alignSelf: "flex-end",
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 3,
  },
  userBubble: {
    borderRadius: 18,
    borderTopRightRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  userText: { fontSize: 15, fontWeight: "500", lineHeight: 21 },
  aiRow: {
    flexDirection: "row",
    gap: 9,
    maxWidth: "92%",
    paddingHorizontal: 14,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  aiColumn: { flex: 1, gap: 4 },
  aiBubble: {
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 15,
    borderTopLeftRadius: 5,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  aiName: {
    fontSize: 9,
    letterSpacing: 1,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    marginBottom: 7,
  },
  actionMenu: {
    borderWidth: 1,
    borderRadius: 12,
    marginLeft: 2,
    overflow: "hidden",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  actionDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 8 },
  actionText: { fontSize: 13 },
});

// ─── Main chat screen ─────────────────────────────────────────────────────────

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [mode, setMode] = useState<ChatMode>({ kind: "auto" });
  const [typingCharId, setTypingCharId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<"characters" | "templates">("characters");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [savedConvs, setSavedConvs] = useState<SavedConv[]>([]);
  const [savedTakes, setSavedTakes] = useState<SavedTake[]>([]);
  const [profile, setProfile] = useState<FounderProfile>({});
  const [defaultAdvisor, setDefaultAdvisor] = useState("paul");
  const [councilPanel, setCouncilPanel] = useState<string[]>([]);

  const conversationRef = useRef<ChatMessage[]>([]);
  const currentConvIdRef = useRef<string | null>(null);
  const streamingMsgIdRef = useRef<string | null>(null);
  const renderedMsgIds = useRef(new Set<string>());
  const initializedRef = useRef(false);

  // Refs mirror state so streaming callbacks never read a stale value.
  const modeRef = useRef<ChatMode>({ kind: "auto" });
  const profileRef = useRef<FounderProfile>({});
  const defaultAdvisorRef = useRef("paul");
  const lastResponderRef = useRef("paul"); // who answered last in auto mode

  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);

  const started = messages.length > 0;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    modeRef.current = mode;
    AsyncStorage.setItem("costar_mode", JSON.stringify(mode)).catch(() => {});
  }, [mode]);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { defaultAdvisorRef.current = defaultAdvisor; }, [defaultAdvisor]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      Promise.all([
        loadConversations(),
        loadSavedTakes(),
        loadProfile(),
        AsyncStorage.getItem("costar_default_advisor"),
        AsyncStorage.getItem("costar_mode"),
      ]).then(([convs, takes, prof, advisor, modeRaw]) => {
        setSavedConvs(convs);
        setSavedTakes(takes);
        setProfile(prof);
        profileRef.current = prof;
        const adv = advisor || "paul";
        setDefaultAdvisor(adv);
        defaultAdvisorRef.current = adv;
        lastResponderRef.current = adv;

        let restored: ChatMode | null = null;
        try { if (modeRaw) restored = JSON.parse(modeRaw) as ChatMode; } catch {}
        const valid =
          restored &&
          ((restored.kind === "single" && !!restored.id) ||
            restored.kind === "auto" ||
            restored.kind === "council");
        if (valid && restored) {
          setMode(restored);
          modeRef.current = restored;
        }
        // No saved mode → default to Auto (the CoStar blend): the hero experience,
        // and the mode the scripted demo prompts fire in.
      }).catch(() => {});
    }
  }, []);

  const persistConversation = useCallback(
    (msgs: Message[], history: ChatMessage[], charId: string, boardMode: boolean) => {
      if (msgs.length === 0) return;
      const firstUser = [...msgs].reverse().find((m) => m.type === "user");
      if (!firstUser) return;
      const id = currentConvIdRef.current ?? convId();
      currentConvIdRef.current = id;
      const conv: SavedConv = {
        id,
        title: firstUser.text.slice(0, 80),
        charId: charId === "auto" ? "paul" : charId,
        boardMode,
        messages: msgs as SavedMessage[],
        history,
        ts: Date.now(),
      };
      saveConversation(conv).then(() =>
        loadConversations().then(setSavedConvs).catch(() => {})
      );
    },
    []
  );

  const addMessage = useCallback((msg: Omit<Message, "id" | "timestamp">): Message => {
    const full: Message = { ...msg, id: uid(), timestamp: Date.now() };
    setMessages((prev) => [full, ...prev]);
    return full;
  }, []);

  // Reset the conversation. Passing no mode KEEPS the current one (stickiness).
  const resetChat = useCallback((nextMode?: ChatMode) => {
    setMessages([]);
    setInputText("");
    setTypingCharId(null);
    setIsProcessing(false);
    setPlusMenuOpen(false);
    setStreamingMsgId(null);
    setCouncilPanel([]);
    conversationRef.current = [];
    currentConvIdRef.current = null;
    streamingMsgIdRef.current = null;
    renderedMsgIds.current.clear();
    if (nextMode) {
      setMode(nextMode);
      modeRef.current = nextMode;
    }
  }, []);

  const loadConv = useCallback((conv: SavedConv) => {
    currentConvIdRef.current = conv.id;
    conversationRef.current = conv.history;
    renderedMsgIds.current.clear();
    conv.messages.forEach((m) => renderedMsgIds.current.add(m.id));
    setMessages(conv.messages as Message[]);
    const nextMode: ChatMode = conv.boardMode
      ? { kind: "council" }
      : conv.charId && conv.charId !== "auto"
        ? { kind: "single", id: conv.charId }
        : { kind: "auto" };
    setMode(nextMode);
    modeRef.current = nextMode;
    if (nextMode.kind === "single") lastResponderRef.current = nextMode.id;
    setIsProcessing(false);
    setTypingCharId(null);
    setStreamingMsgId(null);
    setCouncilPanel([]);
  }, []);

  const handleDeleteConv = useCallback((id: string) => {
    deleteConversation(id).then(() =>
      loadConversations().then(setSavedConvs).catch(() => {})
    );
    if (currentConvIdRef.current === id) resetChat();
  }, [resetChat]);

  const handleSaveMessage = useCallback((msg: Message) => {
    if (!msg.charId) return;
    const take: SavedTake = {
      id: takeId(),
      charId: msg.charId,
      text: msg.text,
      ts: Date.now(),
    };
    saveTake(take).then(() =>
      loadSavedTakes().then(setSavedTakes).catch(() => {})
    );
  }, []);

  const streamSingleResponse = useCallback(
    async (charId: string, _userText: string, history: ChatMessage[]) => {
      setTypingCharId(charId);

      const msgId = uid();
      streamingMsgIdRef.current = msgId;
      setStreamingMsgId(msgId);
      let fullContent = "";
      let assistantAdded = false;

      await streamChat(
        charId,
        history,
        (chunk) => {
          fullContent += chunk;
          if (!assistantAdded) {
            setTypingCharId(null);
            renderedMsgIds.current.add(msgId);
            setMessages((prev) => [
              { id: msgId, type: "ai", charId, text: fullContent, timestamp: Date.now() },
              ...prev,
            ]);
            assistantAdded = true;
          } else {
            setMessages((prev) => {
              const updated = [...prev];
              const idx = updated.findIndex((m) => m.id === msgId);
              if (idx !== -1) updated[idx] = { ...updated[idx]!, text: fullContent };
              return updated;
            });
          }
        },
        () => {
          setTypingCharId(null);
          streamingMsgIdRef.current = null;
          setStreamingMsgId(null);
          if (!assistantAdded) {
            setMessages((prev) => [
              { id: msgId, type: "ai", charId, text: "…", timestamp: Date.now() },
              ...prev,
            ]);
          }
          const newHistory: ChatMessage[] = [
            ...history,
            { role: "assistant", content: fullContent },
          ];
          conversationRef.current = newHistory;
          setMessages((prev) => {
            persistConversation(prev, newHistory, charId, false);
            return prev;
          });
        },
        (errMsg) => {
          setTypingCharId(null);
          streamingMsgIdRef.current = null;
          setStreamingMsgId(null);
          setMessages((prev) => [
            { id: msgId, type: "ai", charId, text: errMsg, timestamp: Date.now() },
            ...prev,
          ]);
        },
        profileRef.current
      );
    },
    [persistConversation]
  );

  const runSingleAIResponse = useCallback(
    async (charId: string, userText: string, history: ChatMessage[]) => {
      await streamSingleResponse(charId, userText, history);
      setIsProcessing(false);
    },
    [streamSingleResponse]
  );

  // The council: most-qualified voices debate, then "the call".
  const runCouncilResponse = useCallback(
    async (history: ChatMessage[]) => {
      const takes: { id: string; text: string }[] = [];
      let segId: string | null = null;
      let segChar: string | null = null;
      let segText = "";
      let segAdded = false;

      const startSeg = (advisorId: string) => {
        if (segChar) takes.push({ id: segChar, text: segText });
        segChar = advisorId;
        segId = uid();
        segText = "";
        segAdded = false;
        setTypingCharId(advisorId);
      };
      const pushDelta = (text: string) => {
        if (!segId) return;
        segText += text;
        const id = segId;
        const ch = segChar!;
        const txt = segText;
        if (!segAdded) {
          setTypingCharId(null);
          renderedMsgIds.current.add(id);
          streamingMsgIdRef.current = id;
          setStreamingMsgId(id);
          setMessages((prev) => [
            { id, type: "ai", charId: ch, text: txt, timestamp: Date.now() },
            ...prev,
          ]);
          segAdded = true;
        } else {
          setMessages((prev) => {
            const updated = [...prev];
            const idx = updated.findIndex((m) => m.id === id);
            if (idx !== -1) updated[idx] = { ...updated[idx]!, text: txt };
            return updated;
          });
        }
      };

      await streamCouncil(history, profileRef.current, {
        onPanel: (advisors) => {
          setCouncilPanel(advisors);
          const names = advisors.map((id) => CHARACTERS[id]?.name ?? id).join(" · ");
          addMessage({ type: "routing", text: `✦ the council convenes · ${names}` });
        },
        onAdvisorStart: (advisorId) => startSeg(advisorId),
        onDelta: (_id, text) => pushDelta(text),
        onAdvisorDone: () => {
          streamingMsgIdRef.current = null;
          setStreamingMsgId(null);
        },
        onError: (msg) => {
          setTypingCharId(null);
          streamingMsgIdRef.current = null;
          setStreamingMsgId(null);
          if (segChar && segText) takes.push({ id: segChar, text: segText });
          segChar = null;
          addMessage({ type: "ai", charId: COUNCIL_ID, text: msg });
        },
        onDone: () => {
          setTypingCharId(null);
          streamingMsgIdRef.current = null;
          setStreamingMsgId(null);
          if (segChar) { takes.push({ id: segChar, text: segText }); segChar = null; }
          const summary = takes
            .filter((t) => t.text.trim())
            .map((t) => `${CHARACTERS[t.id]?.name ?? t.id}: ${t.text.trim()}`)
            .join("\n\n");
          const newHistory: ChatMessage[] = [
            ...history,
            { role: "assistant", content: summary || "(the council weighed in)" },
          ];
          conversationRef.current = newHistory;
          setMessages((prev) => {
            persistConversation(prev, newHistory, COUNCIL_ID, true);
            return prev;
          });
        },
      });
      setIsProcessing(false);
    },
    [addMessage, persistConversation]
  );

  const runRoastSequence = useCallback(async (_history: ChatMessage[]) => {
    setTypingCharId("vc");
    await new Promise<void>((r) => setTimeout(r, 1000));
    setTypingCharId(null);
    for (let i = 0; i < ROAST_LINES.length; i++) {
      addMessage({ type: "ai", charId: "vc", text: ROAST_LINES[i]! });
      if (i < ROAST_LINES.length - 1) await new Promise<void>((r) => setTimeout(r, 1100));
    }
    setIsProcessing(false);
  }, [addMessage]);

  // Bulletproof demo: stream a crafted reply locally (no API) for the featured
  // hero prompts, so the stage moment always lands even if the network doesn't.
  const playScripted = useCallback(
    async (charId: string, text: string, history: ChatMessage[]) => {
      setTypingCharId(charId);
      await new Promise<void>((r) => setTimeout(r, 750));
      setTypingCharId(null);

      const msgId = uid();
      renderedMsgIds.current.add(msgId);
      streamingMsgIdRef.current = msgId;
      setStreamingMsgId(msgId);
      setMessages((prev) => [
        { id: msgId, type: "ai", charId, text: "", timestamp: Date.now() },
        ...prev,
      ]);

      const tokens = text.split(/(\s+)/); // keep whitespace tokens
      let acc = "";
      for (let i = 0; i < tokens.length; i++) {
        acc += tokens[i];
        const snapshot = acc;
        setMessages((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex((mm) => mm.id === msgId);
          if (idx !== -1) updated[idx] = { ...updated[idx]!, text: snapshot };
          return updated;
        });
        if (tokens[i]!.trim().length) await new Promise<void>((r) => setTimeout(r, 26));
      }

      streamingMsgIdRef.current = null;
      setStreamingMsgId(null);
      const newHistory: ChatMessage[] = [
        ...history,
        { role: "assistant", content: text },
      ];
      conversationRef.current = newHistory;
      setMessages((prev) => {
        persistConversation(prev, newHistory, charId, false);
        return prev;
      });
      setIsProcessing(false);
    },
    [persistConversation]
  );

  const handleSend = useCallback(
    (text?: string) => {
      const msg = (text ?? inputText).trim();
      if (!msg || isProcessing) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setInputText("");
      setPlusMenuOpen(false);
      if (!currentConvIdRef.current) currentConvIdRef.current = convId();

      addMessage({ type: "user", text: msg });
      setIsProcessing(true);

      const history: ChatMessage[] = [
        ...conversationRef.current,
        { role: "user", content: msg },
      ];

      const m = modeRef.current;
      if (m.kind === "council") { runCouncilResponse(history); return; }

      if (m.kind === "auto") {
        // Auto IS CoStar — the blended therapist + co-founder voice.
        const demo = matchDemo(msg);
        if (demo) {
          lastResponderRef.current = demo.reply.charId;
          playScripted(demo.reply.charId, demo.reply.text, history);
          return;
        }
        lastResponderRef.current = "costar";
        runSingleAIResponse("costar", msg, history);
        return;
      }

      // single — locked to this advisor for EVERY message until changed
      lastResponderRef.current = m.id;
      runSingleAIResponse(m.id, msg, history);
    },
    [inputText, isProcessing, addMessage, runCouncilResponse, runSingleAIResponse, playScripted]
  );

  // ── Mode handlers ──
  const setSingle = useCallback((id: string) => {
    setMode({ kind: "single", id });
    modeRef.current = { kind: "single", id };
    setDefaultAdvisor(id);
    defaultAdvisorRef.current = id;
    lastResponderRef.current = id;
    AsyncStorage.setItem("costar_default_advisor", id).catch(() => {});
  }, []);

  const handlePickCharacter = useCallback((id: string) => {
    if (id === "auto") {
      setMode({ kind: "auto" });
      modeRef.current = { kind: "auto" };
    } else {
      setSingle(id);
    }
  }, [setSingle]);

  const handleSelectAuto = useCallback(() => {
    setMode({ kind: "auto" });
    modeRef.current = { kind: "auto" };
  }, []);

  const handleSelectSingle = useCallback(() => {
    setSingle(defaultAdvisorRef.current);
  }, [setSingle]);

  const handleSelectCouncil = useCallback(() => {
    setMode({ kind: "council" });
    modeRef.current = { kind: "council" };
    setCouncilPanel([]);
  }, []);

  const openCouncil = useCallback(() => {
    resetChat({ kind: "council" });
  }, [resetChat]);

  const handleGreatness = useCallback(() => {
    const prompt = "I'm trying to build something that actually matters — not just a startup that exits, but something great. Be honest with me: am I on the path, or just surviving and calling it progress?";
    handleSend(prompt);
  }, [handleSend]);

  const handleSelectTemplate = useCallback(
    (templateId: string) => {
      const tpl = TEMPLATES.find((t) => t.id === templateId);
      if (!tpl) return;
      if (tpl.characterId === "board") {
        openCouncil();
        setInputText(tpl.prompt);
        return;
      }
      setSingle(tpl.characterId);
      if (tpl.id === "roast") {
        if (!currentConvIdRef.current) currentConvIdRef.current = convId();
        addMessage({ type: "user", text: tpl.prompt });
        setIsProcessing(true);
        runRoastSequence([{ role: "user", content: tpl.prompt }]);
        return;
      }
      setInputText(tpl.prompt);
    },
    [openCouncil, setSingle, addMessage, runRoastSequence]
  );

  const handleSaveProfile = useCallback((p: FounderProfile) => {
    setProfile(p);
    profileRef.current = p;
    saveProfile(p);
  }, []);

  // ── Derived view state ──
  const accent =
    mode.kind === "single" ? (CHARACTERS[mode.id]?.color ?? colors.saber) : colors.saber;
  const singleActive = mode.kind === "single";
  const headerAdvisorId =
    mode.kind === "single" ? mode.id : mode.kind === "auto" ? lastResponderRef.current : null;
  const headerAdvisor = headerAdvisorId ? CHARACTERS[headerAdvisorId] : null;
  const headerCouncil = councilPanel.length ? councilPanel : BOARD_MEMBER_IDS;

  const styles = makeStyles(colors, topPad, bottomPad);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ─── Top bar ─── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => { setPlusMenuOpen(false); setSidebarOpen(true); }}
          activeOpacity={0.7}
        >
          <Feather name="menu" size={21} color={colors.dim} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {started && mode.kind === "council" ? (
            <>
              <View style={styles.headerStack}>
                {headerCouncil.slice(0, 3).map((id, i) => (
                  <View key={id} style={i > 0 ? styles.headerStackOverlap : undefined}>
                    <CharacterAvatar
                      initials={CHARACTERS[id]?.initials ?? "?"}
                      color={CHARACTERS[id]?.color ?? "#555"}
                      size={24}
                    />
                  </View>
                ))}
              </View>
              <Text style={[styles.headerAdvisorName, { color: colors.foreground }]}>The Council</Text>
              <LiveDot active={isProcessing} color={colors.saber} />
            </>
          ) : started && headerAdvisor ? (
            <>
              <CharacterAvatar initials={headerAdvisor.initials} color={headerAdvisor.color} size={26} />
              <Text style={[styles.headerAdvisorName, { color: colors.foreground }]}>{headerAdvisor.name}</Text>
              <LiveDot active={isProcessing} color={headerAdvisor.color} />
            </>
          ) : (
            <LogoStar size={26} color={colors.saber} />
          )}
        </View>

        <TouchableOpacity style={styles.iconBtn} onPress={() => resetChat()} activeOpacity={0.7}>
          <Feather name="edit-2" size={19} color={colors.dim} />
        </TouchableOpacity>
      </View>

      {/* ─── Main content ─── */}
      <KeyboardAvoidingView behavior="padding" style={styles.flex} keyboardVerticalOffset={0}>
        {!started ? (
          <HomeScreen
            profile={profile}
            mode={mode}
            defaultAdvisorId={defaultAdvisor}
            onSelectAuto={handleSelectAuto}
            onSelectSingle={handleSelectSingle}
            onSelectAdvisor={handlePickCharacter}
            onSelectCouncil={handleSelectCouncil}
            onSendPrompt={handleSend}
            onGreatness={handleGreatness}
          />
        ) : (
          <FlatList
            inverted
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isNew = !renderedMsgIds.current.has(item.id);
              if (isNew) renderedMsgIds.current.add(item.id);
              return (
                <MessageRow
                  message={item}
                  isStreaming={item.id === streamingMsgId}
                  isNew={isNew}
                  onSave={handleSaveMessage}
                />
              );
            }}
            ListHeaderComponent={typingCharId ? <TypingBubble charId={typingCharId} /> : null}
            contentContainerStyle={styles.chatContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* ─── Composer ─── */}
        <View style={styles.composerWrapper}>
          {plusMenuOpen && (
            <View style={[styles.plusMenu, { backgroundColor: colors.background2, borderColor: colors.line }]}>
              <TouchableOpacity
                style={styles.plusMenuItem}
                onPress={() => { setPlusMenuOpen(false); setSheetTab("characters"); setSheetOpen(true); }}
                activeOpacity={0.7}
              >
                <Feather name="users" size={19} color={colors.dim} />
                <Text style={[styles.plusMenuText, { color: colors.foreground }]}>Browse advisors</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.plusMenuItem}
                onPress={() => { setPlusMenuOpen(false); setSheetTab("templates"); setSheetOpen(true); }}
                activeOpacity={0.7}
              >
                <Feather name="layout" size={19} color={colors.dim} />
                <Text style={[styles.plusMenuText, { color: colors.foreground }]}>Templates</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.plusMenuItem}
                onPress={() => { setPlusMenuOpen(false); openCouncil(); }}
                activeOpacity={0.7}
              >
                <Feather name="message-circle" size={19} color={colors.dim} />
                <Text style={[styles.plusMenuText, { color: colors.foreground }]}>Summon the council</Text>
              </TouchableOpacity>
            </View>
          )}
          {plusMenuOpen && (
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setPlusMenuOpen(false)} />
          )}

          <View style={[styles.composer, { backgroundColor: colors.card, borderColor: singleActive ? `${accent}55` : colors.line }]}>
            <View style={styles.composerRow1}>
              <TextInput
                style={[styles.composerInput, { color: colors.foreground }]}
                multiline
                placeholder={
                  mode.kind === "council"
                    ? "Put something on the table…"
                    : mode.kind === "single"
                      ? `What's on your mind, for ${CHARACTERS[mode.id]?.name ?? "them"}?`
                      : "What's on your mind?"
                }
                placeholderTextColor={colors.faint}
                value={inputText}
                onChangeText={setInputText}
                maxLength={2000}
                returnKeyType="default"
                blurOnSubmit={false}
              />
            </View>
            <View style={styles.composerRow2}>
              <View style={styles.composerLeft}>
                <TouchableOpacity
                  style={[styles.plusBtn, { backgroundColor: colors.background2, borderColor: colors.line }]}
                  onPress={() => setPlusMenuOpen((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Feather name="plus" size={16} color={colors.dim} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.charPicker, { backgroundColor: colors.background2, borderColor: colors.line }]}
                  onPress={() => { setSheetTab("characters"); setSheetOpen(true); }}
                  activeOpacity={0.7}
                >
                  {mode.kind === "council" ? (
                    <View style={[styles.autoIcon, { backgroundColor: "rgba(63,169,245,0.2)" }]}>
                      <Text style={[styles.autoIconText, { color: colors.saber }]}>◈</Text>
                    </View>
                  ) : mode.kind === "auto" ? (
                    <View style={[styles.autoIcon, { backgroundColor: colors.saber }]}>
                      <Text style={[styles.autoIconText, { color: "#04111f" }]}>✦</Text>
                    </View>
                  ) : (
                    <CharacterAvatar
                      initials={CHARACTERS[mode.id]?.initials ?? "?"}
                      color={CHARACTERS[mode.id]?.color ?? "#555"}
                      size={20}
                    />
                  )}
                  <Text style={[styles.charPickerName, { color: colors.foreground }]}>
                    {mode.kind === "council" ? "The Council" : mode.kind === "auto" ? "Auto" : CHARACTERS[mode.id]?.name ?? ""}
                  </Text>
                  <Text style={[styles.charPickerChevron, { color: colors.faint }]}>▾</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.composerRight}>
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: accent, shadowColor: accent }, (!inputText.trim() || isProcessing) && styles.sendBtnDisabled]}
                  onPress={() => handleSend()}
                  disabled={!inputText.trim() || isProcessing}
                  activeOpacity={0.85}
                >
                  <Feather name="arrow-up" size={18} color="#04111f" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={[styles.disclaimer, { color: colors.faint }]}>
            Coaching and company — not a substitute for professionals.
          </Text>
        </View>
      </KeyboardAvoidingView>

      <Sidebar
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={() => resetChat()}
        onSelectCharacter={handlePickCharacter}
        onOpenBoard={openCouncil}
        onOpenSettings={() => setSettingsOpen(true)}
        savedConvs={savedConvs}
        savedTakes={savedTakes}
        onLoadConv={loadConv}
        onDeleteConv={handleDeleteConv}
      />

      <CharacterSheet
        visible={sheetOpen}
        initialTab={sheetTab}
        selectedCharId={mode.kind === "single" ? mode.id : "auto"}
        isBoardMode={mode.kind === "council"}
        onClose={() => setSheetOpen(false)}
        onSelectCharacter={handlePickCharacter}
        onSelectBoard={openCouncil}
        onSelectTemplate={handleSelectTemplate}
      />

      <SettingsSheet
        visible={settingsOpen}
        profile={profile}
        defaultAdvisorId={defaultAdvisor}
        onClose={() => setSettingsOpen(false)}
        onSaveProfile={handleSaveProfile}
        onPickDefaultAdvisor={(id) => { setDefaultAdvisor(id); AsyncStorage.setItem("costar_default_advisor", id).catch(() => {}); }}
      />
    </View>
  );
}

function makeStyles(
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>,
  topPad: number,
  bottomPad: number
) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: topPad + 6,
      paddingBottom: 10,
      paddingHorizontal: 18,
      backgroundColor: colors.background,
    },
    iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    headerCenter: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, justifyContent: "center" },
    headerStack: { flexDirection: "row", alignItems: "center" },
    headerStackOverlap: { marginLeft: -9 },
    headerAdvisorName: { fontSize: 15, fontWeight: "500" },
    headerTitle: {
      fontSize: 16,
      fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
      letterSpacing: 0.3,
    },
    chatContent: { paddingVertical: 12, paddingBottom: 8 },
    composerWrapper: {
      marginHorizontal: 14,
      marginBottom: Math.max(bottomPad, 8),
      marginTop: 4,
    },
    plusMenu: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 6,
      marginBottom: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    },
    plusMenuItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10 },
    plusMenuText: { fontSize: 14 },
    composer: { borderWidth: 1, borderRadius: 22, padding: 6 },
    composerRow1: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
    composerInput: { fontSize: 15, lineHeight: 21, maxHeight: 90, backgroundColor: "transparent" },
    composerRow2: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 4,
      paddingBottom: 2,
    },
    composerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
    composerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
    plusBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    charPicker: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderWidth: 1,
      borderRadius: 18,
      paddingVertical: 5,
      paddingHorizontal: 10,
      paddingLeft: 6,
    },
    autoIcon: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    autoIconText: { fontSize: 10, fontWeight: "700" },
    charPickerName: { fontSize: 13, fontWeight: "500" },
    charPickerChevron: { fontSize: 11 },
    sendBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "rgba(63,169,245,0.5)",
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 12,
      shadowOpacity: 1,
      elevation: 4,
    },
    sendBtnDisabled: { opacity: 0.35 },
    disclaimer: {
      fontSize: 8,
      textAlign: "center",
      paddingHorizontal: 30,
      paddingTop: 6,
      lineHeight: 14,
      fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    },
  });
}
