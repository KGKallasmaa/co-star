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
  ScrollView,
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
  CHARACTER_IDS,
  BOARD_MEMBER_IDS,
  ROAST_LINES,
  BOARD_INTRO,
  routeCharacter,
  QUICK_PROMPTS,
  TEMPLATES,
  ADVISOR_GREETINGS,
  getDailyPrompt,
  getTimeGreeting,
} from "@/constants/characters";
import { streamChat, type ChatMessage } from "@/lib/api";
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
import Sidebar from "@/components/Sidebar";
import CharacterSheet from "@/components/CharacterSheet";

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
          <View style={[mrStyles.aiBubble, { backgroundColor: colors.card, borderColor: colors.line, borderLeftColor: char.color }]}>
            <Text style={[mrStyles.aiName, { color: char.color }]}>{char.name.toUpperCase()}</Text>
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

// ─── Home screen — personalized empty state ───────────────────────────────────

interface HomeScreenProps {
  userName: string | null;
  defaultAdvisor: string;
  onSendPrompt: (text: string) => void;
  onGreatness: () => void;
  onDailyPrompt: () => void;
  onAdvisorChange: (id: string) => void;
}

function HomeScreen({ userName, defaultAdvisor, onSendPrompt, onGreatness, onDailyPrompt, onAdvisorChange }: HomeScreenProps) {
  const colors = useColors();
  const [selectedId, setSelectedId] = useState(defaultAdvisor);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropAnim = useRef(new Animated.Value(0)).current;
  const advisorFade = useRef(new Animated.Value(1)).current;

  // Sync when parent loads stored advisor from AsyncStorage
  useEffect(() => {
    setSelectedId(defaultAdvisor);
  }, [defaultAdvisor]);

  const advisor = CHARACTERS[selectedId] ?? CHARACTERS["paul"]!;
  const accent = advisor.color;
  const greeting = getTimeGreeting(userName);
  const daily = getDailyPrompt();
  const dailyAdvisor = CHARACTERS[daily.charId] ?? CHARACTERS["paul"]!;
  const advisorGreeting = ADVISOR_GREETINGS[selectedId] ?? ADVISOR_GREETINGS["paul"]!;

  const toggleDropdown = useCallback(() => {
    const toValue = dropdownOpen ? 0 : 1;
    Animated.timing(dropAnim, { toValue, duration: 220, useNativeDriver: false }).start();
    setDropdownOpen((v) => !v);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [dropdownOpen, dropAnim]);

  const handleSelectAdvisor = useCallback((id: string) => {
    Animated.timing(dropAnim, { toValue: 0, duration: 160, useNativeDriver: false }).start();
    setDropdownOpen(false);
    if (id === selectedId) return;
    Animated.sequence([
      Animated.timing(advisorFade, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(advisorFade, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
    setSelectedId(id);
    onAdvisorChange(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [selectedId, dropAnim, advisorFade, onAdvisorChange]);

  const dropdownHeight = dropAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, CHARACTER_IDS.length * 52 + 8],
  });
  const dropdownOpacity = dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={hsStyles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Time greeting */}
      <FadeSlideIn delay={0}>
        <Text style={[hsStyles.timeGreeting, { color: colors.dim }]}>{greeting}</Text>
      </FadeSlideIn>

      {/* Advisor selector dropdown */}
      <FadeSlideIn delay={60}>
        <View style={hsStyles.dropdownWrap}>
          <TouchableOpacity
            style={[hsStyles.dropdownBtn, { borderColor: `${accent}50`, backgroundColor: `${accent}0A` }]}
            onPress={toggleDropdown}
            activeOpacity={0.8}
          >
            <Text style={[hsStyles.dropdownBtnLabel, { color: colors.faint }]}>TALKING TO</Text>
            <View style={hsStyles.dropdownBtnRow}>
              <View style={[hsStyles.advisorDot, { backgroundColor: accent }]} />
              <Text style={[hsStyles.dropdownBtnName, { color: accent }]}>{advisor.name}</Text>
              <Text style={[hsStyles.dropdownBtnRole, { color: colors.dim }]}>{advisor.role}</Text>
              <Feather
                name={dropdownOpen ? "chevron-up" : "chevron-down"}
                size={13}
                color={colors.faint}
              />
            </View>
          </TouchableOpacity>

          <Animated.View
            style={[
              hsStyles.dropdownList,
              { maxHeight: dropdownHeight, opacity: dropdownOpacity, borderColor: `${accent}28` },
            ]}
          >
            <View style={hsStyles.dropdownListInner}>
              {CHARACTER_IDS.map((id) => {
                const char = CHARACTERS[id]!;
                const isSel = id === selectedId;
                return (
                  <TouchableOpacity
                    key={id}
                    style={[
                      hsStyles.dropdownItem,
                      isSel && { backgroundColor: `${char.color}18` },
                    ]}
                    onPress={() => handleSelectAdvisor(id)}
                    activeOpacity={0.75}
                  >
                    <View style={[hsStyles.advisorDot, { backgroundColor: char.color }]} />
                    <Text style={[hsStyles.dropdownItemName, { color: isSel ? char.color : colors.foreground }]}>
                      {char.name}
                    </Text>
                    <Text style={[hsStyles.dropdownItemRole, { color: colors.faint }]}>{char.role}</Text>
                    {isSel && <Feather name="check" size={12} color={char.color} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </FadeSlideIn>

      {/* Advisor presence — fades when switching */}
      <Animated.View style={{ opacity: advisorFade }}>
        <View style={hsStyles.advisorBlock}>
          <View style={[hsStyles.advisorGlow, { shadowColor: accent }]}>
            <CharacterAvatar initials={advisor.initials} color={accent} size={64} />
          </View>
          <Text style={[hsStyles.advisorGreeting, { color: colors.foreground }]}>
            "{advisorGreeting}"
          </Text>
          <Text style={[hsStyles.advisorName, { color: accent }]}>
            — {advisor.name}
          </Text>
        </View>
      </Animated.View>

      {/* In pursuit of greatness card */}
      <TouchableOpacity
        style={[hsStyles.greatnessCard, { backgroundColor: colors.card, borderColor: `${accent}40` }]}
        onPress={onGreatness}
        activeOpacity={0.8}
      >
        <Text style={[hsStyles.greatnessStar, { color: accent }]}>✦</Text>
        <Text style={[hsStyles.greatnessText, { color: colors.foreground }]}>In pursuit of greatness</Text>
      </TouchableOpacity>

      {/* Daily prompt card */}
      <TouchableOpacity
        style={[hsStyles.dailyCard, { backgroundColor: colors.card, borderColor: colors.line, borderLeftColor: `${accent}60`, borderLeftWidth: 2 }]}
        onPress={onDailyPrompt}
        activeOpacity={0.8}
      >
        <View style={hsStyles.dailyHeader}>
          <Text style={[hsStyles.dailyLabel, { color: colors.faint }]}>TODAY · FROM {dailyAdvisor.name.toUpperCase()}</Text>
          <Feather name="arrow-right" size={13} color={colors.faint} />
        </View>
        <Text style={[hsStyles.dailyText, { color: colors.foreground }]}>
          "{daily.text}"
        </Text>
      </TouchableOpacity>

      {/* Quick prompts */}
      <View style={hsStyles.chips}>
        {QUICK_PROMPTS.map((p) => (
          <TouchableOpacity
            key={p.label}
            style={[hsStyles.chip, { backgroundColor: colors.card, borderColor: colors.line }]}
            onPress={() => onSendPrompt(p.text)}
            activeOpacity={0.7}
          >
            <Text style={[hsStyles.chipText, { color: colors.foreground }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const hsStyles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 100,
    paddingTop: 24,
    gap: 0,
  },
  timeGreeting: {
    fontSize: 15,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    letterSpacing: 0.3,
    marginBottom: 20,
  },
  // ── Dropdown ────────────────────────────────────────────────────────
  dropdownWrap: {
    marginBottom: 28,
  },
  dropdownBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 4,
  },
  dropdownBtnLabel: {
    fontSize: 9,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  dropdownBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  advisorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dropdownBtnName: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  dropdownBtnRole: {
    fontSize: 12,
    flex: 1,
  },
  dropdownList: {
    overflow: "hidden",
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    marginTop: -2,
  },
  dropdownListInner: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 10,
  },
  dropdownItemName: {
    fontSize: 14,
    fontWeight: "500",
    minWidth: 50,
  },
  dropdownItemRole: {
    fontSize: 12,
    flex: 1,
  },
  // ── Advisor presence ────────────────────────────────────────────────
  advisorBlock: {
    alignItems: "center",
    marginBottom: 28,
    gap: 14,
  },
  advisorGlow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 0,
  },
  advisorGreeting: {
    fontSize: 22,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 32,
    letterSpacing: -0.3,
    maxWidth: 300,
  },
  advisorName: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    letterSpacing: 0.5,
  },
  // ── Cards ────────────────────────────────────────────────────────────
  greatnessCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  greatnessStar: {
    fontSize: 22,
    lineHeight: 26,
  },
  greatnessText: {
    fontSize: 17,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontStyle: "italic",
    letterSpacing: -0.2,
  },
  dailyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    gap: 10,
  },
  dailyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dailyLabel: {
    fontSize: 9,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    letterSpacing: 1.2,
  },
  dailyText: {
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontStyle: "italic",
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  chipText: { fontSize: 12.5 },
});

// ─── Main chat screen ─────────────────────────────────────────────────────────

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedCharId, setSelectedCharId] = useState("auto");
  const [isBoardMode, setIsBoardMode] = useState(false);
  const [typingCharId, setTypingCharId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<"characters" | "templates">("characters");
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [savedConvs, setSavedConvs] = useState<SavedConv[]>([]);
  const [savedTakes, setSavedTakes] = useState<SavedTake[]>([]);
  const [userName, setUserName] = useState<string | null>(null);
  const [defaultAdvisor, setDefaultAdvisor] = useState("paul");

  const conversationRef = useRef<ChatMessage[]>([]);
  const currentConvIdRef = useRef<string | null>(null);
  const currentCharIdRef = useRef("auto");
  const streamingMsgIdRef = useRef<string | null>(null);
  const renderedMsgIds = useRef(new Set<string>());
  const initializedRef = useRef(false);

  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);

  const started = messages.length > 0;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      Promise.all([
        loadConversations(),
        loadSavedTakes(),
        AsyncStorage.getItem("costar_user_name"),
        AsyncStorage.getItem("costar_default_advisor"),
      ]).then(([convs, takes, name, advisor]) => {
        setSavedConvs(convs);
        setSavedTakes(takes);
        if (name) setUserName(name);
        if (advisor) setDefaultAdvisor(advisor);
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

  const resetChat = useCallback(() => {
    setMessages([]);
    setInputText("");
    setSelectedCharId("auto");
    setIsBoardMode(false);
    setTypingCharId(null);
    setIsProcessing(false);
    setPlusMenuOpen(false);
    setStreamingMsgId(null);
    conversationRef.current = [];
    currentConvIdRef.current = null;
    streamingMsgIdRef.current = null;
    renderedMsgIds.current.clear();
  }, []);

  const loadConv = useCallback((conv: SavedConv) => {
    currentConvIdRef.current = conv.id;
    conversationRef.current = conv.history;
    currentCharIdRef.current = conv.charId;
    renderedMsgIds.current.clear();
    // Mark all loaded messages as already-rendered (no entrance animation)
    conv.messages.forEach((m) => renderedMsgIds.current.add(m.id));
    setMessages(conv.messages as Message[]);
    setIsBoardMode(conv.boardMode);
    setSelectedCharId(conv.boardMode ? "auto" : conv.charId);
    setIsProcessing(false);
    setTypingCharId(null);
    setStreamingMsgId(null);
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
            renderedMsgIds.current.add(msgId); // streaming msg: no entrance anim
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
            persistConversation(prev, newHistory, currentCharIdRef.current, isBoardMode);
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
        }
      );
    },
    [isBoardMode, persistConversation]
  );

  const runBoardResponse = useCallback(
    async (userText: string, history: ChatMessage[]) => {
      for (const charId of ["paul", "sam", "marc"] as const) {
        await streamSingleResponse(charId, userText, history);
        await new Promise<void>((r) => setTimeout(r, 200));
      }
      setIsProcessing(false);
    },
    [streamSingleResponse]
  );

  const runSingleAIResponse = useCallback(
    async (charId: string, userText: string, history: ChatMessage[]) => {
      await streamSingleResponse(charId, userText, history);
      setIsProcessing(false);
    },
    [streamSingleResponse]
  );

  const runRoastSequence = useCallback(async (history: ChatMessage[]) => {
    setTypingCharId("vc");
    await new Promise<void>((r) => setTimeout(r, 1000));
    setTypingCharId(null);
    for (let i = 0; i < ROAST_LINES.length; i++) {
      addMessage({ type: "ai", charId: "vc", text: ROAST_LINES[i]! });
      if (i < ROAST_LINES.length - 1) await new Promise<void>((r) => setTimeout(r, 1100));
    }
    setIsProcessing(false);
  }, [addMessage]);

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

      if (isBoardMode) { runBoardResponse(msg, history); return; }

      let responder = selectedCharId;
      if (selectedCharId === "auto") {
        responder = routeCharacter(msg);
        addMessage({ type: "routing", text: `✦ brought in ${CHARACTERS[responder]?.name ?? responder}` });
      }
      currentCharIdRef.current = responder;
      runSingleAIResponse(responder, msg, history);
    },
    [inputText, isProcessing, selectedCharId, isBoardMode, addMessage, runBoardResponse, runSingleAIResponse]
  );

  const handleAdvisorChange = useCallback((id: string) => {
    setDefaultAdvisor(id);
    setSelectedCharId(id);
    currentCharIdRef.current = id;
    AsyncStorage.setItem("costar_default_advisor", id).catch(() => {});
  }, []);

  const handleGreatness = useCallback(() => {
    const prompt = "I'm trying to build something truly great — not just a successful startup, but something that matters. Help me think honestly about whether I'm actually on the right path, or just surviving.";
    handleSend(prompt);
  }, [handleSend]);

  const handleDailyPrompt = useCallback(() => {
    const daily = getDailyPrompt();
    const advisor = CHARACTERS[daily.charId];
    if (advisor) {
      setSelectedCharId(daily.charId);
      currentCharIdRef.current = daily.charId;
      setIsBoardMode(false);
    }
    handleSend(daily.text);
  }, [handleSend]);

  const openBoard = useCallback(() => {
    setIsBoardMode(true);
    setSelectedCharId("auto");
    setMessages([]);
    setIsProcessing(true);
    conversationRef.current = [];
    currentConvIdRef.current = convId();
    currentCharIdRef.current = "board";
    renderedMsgIds.current.clear();
    BOARD_INTRO.forEach((item, i) => {
      setTimeout(() => {
        addMessage({ type: "ai", charId: item.charId, text: item.text });
        if (i === BOARD_INTRO.length - 1) setIsProcessing(false);
      }, i * 900);
    });
  }, [addMessage]);

  const handleSelectTemplate = useCallback(
    (templateId: string) => {
      const tpl = TEMPLATES.find((t) => t.id === templateId);
      if (!tpl) return;
      if (tpl.characterId === "board") { openBoard(); return; }
      setSelectedCharId(tpl.characterId);
      setIsBoardMode(false);
      currentCharIdRef.current = tpl.characterId;
      if (tpl.id === "roast") {
        addMessage({ type: "user", text: tpl.prompt });
        setIsProcessing(true);
        runRoastSequence([{ role: "user", content: tpl.prompt }]);
        return;
      }
      setInputText(tpl.prompt);
    },
    [openBoard, addMessage, runRoastSequence]
  );

  // Derive active advisor for header display
  const activeAdvisor = isBoardMode
    ? null
    : CHARACTERS[selectedCharId === "auto" ? (currentCharIdRef.current || "paul") : selectedCharId];

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
          {started && !isBoardMode && activeAdvisor ? (
            <>
              <CharacterAvatar initials={activeAdvisor.initials} color={activeAdvisor.color} size={26} />
              <Text style={[styles.headerAdvisorName, { color: colors.foreground }]}>{activeAdvisor.name}</Text>
              <LiveDot active={isProcessing} color={colors.saber} />
            </>
          ) : started && isBoardMode ? (
            <>
              <Text style={[styles.headerTitle, { color: colors.dim }]}>The Board</Text>
              <LiveDot active={isProcessing} color={colors.saber} />
            </>
          ) : (
            <Text style={[styles.headerTitle, { color: colors.saber }]}>✦ Co-Star</Text>
          )}
        </View>

        <TouchableOpacity style={styles.iconBtn} onPress={resetChat} activeOpacity={0.7}>
          <Feather name="edit-2" size={19} color={colors.dim} />
        </TouchableOpacity>
      </View>

      {/* ─── Main content ─── */}
      <KeyboardAvoidingView behavior="padding" style={styles.flex} keyboardVerticalOffset={0}>
        {!started ? (
          <HomeScreen
            userName={userName}
            defaultAdvisor={defaultAdvisor}
            onSendPrompt={handleSend}
            onGreatness={handleGreatness}
            onDailyPrompt={handleDailyPrompt}
            onAdvisorChange={handleAdvisorChange}
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
                onPress={() => { setPlusMenuOpen(false); openBoard(); }}
                activeOpacity={0.7}
              >
                <Feather name="message-circle" size={19} color={colors.dim} />
                <Text style={[styles.plusMenuText, { color: colors.foreground }]}>Talk to the board</Text>
              </TouchableOpacity>
            </View>
          )}
          {plusMenuOpen && (
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setPlusMenuOpen(false)} />
          )}

          <View style={[styles.composer, { backgroundColor: colors.card, borderColor: colors.line }]}>
            <View style={styles.composerRow1}>
              <TextInput
                style={[styles.composerInput, { color: colors.foreground }]}
                multiline
                placeholder="What's on your mind?"
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
                  {isBoardMode ? (
                    <View style={[styles.autoIcon, { backgroundColor: "rgba(63,169,245,0.2)" }]}>
                      <Text style={[styles.autoIconText, { color: colors.saber }]}>◈</Text>
                    </View>
                  ) : selectedCharId === "auto" ? (
                    <View style={[styles.autoIcon, { backgroundColor: colors.saber }]}>
                      <Text style={[styles.autoIconText, { color: "#04111f" }]}>✦</Text>
                    </View>
                  ) : (
                    <CharacterAvatar
                      initials={CHARACTERS[selectedCharId]?.initials ?? "?"}
                      color={CHARACTERS[selectedCharId]?.color ?? "#555"}
                      size={20}
                    />
                  )}
                  <Text style={[styles.charPickerName, { color: colors.foreground }]}>
                    {isBoardMode ? "The Board" : selectedCharId === "auto" ? "Auto" : CHARACTERS[selectedCharId]?.name ?? ""}
                  </Text>
                  <Text style={[styles.charPickerChevron, { color: colors.faint }]}>▾</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.composerRight}>
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: colors.saber }, (!inputText.trim() || isProcessing) && styles.sendBtnDisabled]}
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
        onNewChat={resetChat}
        onSelectCharacter={(id) => { setSelectedCharId(id); setIsBoardMode(false); currentCharIdRef.current = id; }}
        onOpenBoard={openBoard}
        savedConvs={savedConvs}
        savedTakes={savedTakes}
        onLoadConv={loadConv}
        onDeleteConv={handleDeleteConv}
      />

      <CharacterSheet
        visible={sheetOpen}
        initialTab={sheetTab}
        selectedCharId={selectedCharId}
        isBoardMode={isBoardMode}
        onClose={() => setSheetOpen(false)}
        onSelectCharacter={(id) => { setSelectedCharId(id); setIsBoardMode(false); currentCharIdRef.current = id; }}
        onSelectBoard={openBoard}
        onSelectTemplate={handleSelectTemplate}
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
    researchToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderWidth: 1,
      borderRadius: 16,
      paddingVertical: 6,
      paddingHorizontal: 9,
    },
    researchText: { fontSize: 9, fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace" },
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
