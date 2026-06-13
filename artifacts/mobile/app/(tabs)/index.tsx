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
  RESPONSES,
  ROAST_LINES,
  BOARD_INTRO,
  routeCharacter,
  QUICK_PROMPTS,
  TEMPLATES,
} from "@/constants/characters";
import CharacterAvatar from "@/components/CharacterAvatar";
import Sidebar, { type RecentChat } from "@/components/Sidebar";
import CharacterSheet from "@/components/CharacterSheet";

type MessageType = "user" | "ai" | "routing";

interface Message {
  id: string;
  type: MessageType;
  charId?: string;
  text: string;
  timestamp: number;
}

function uid() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 9);
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

function getResponse(charId: string, idx: number): string {
  const pool = RESPONSES[charId] ?? RESPONSES["paul"]!;
  return pool[idx % pool.length]!;
}

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
          Animated.timing(dot, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.delay(600 - delay),
        ])
      );
    const a1 = makeLoop(dot1, 0);
    const a2 = makeLoop(dot2, 160);
    const a3 = makeLoop(dot3, 320);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, []);

  if (!char) return null;

  return (
    <View style={tbStyles.row}>
      <CharacterAvatar initials={char.initials} color={char.color} size={30} />
      <View
        style={[tbStyles.bubble, { backgroundColor: colors.card, borderColor: colors.line }]}
      >
        <View style={tbStyles.dots}>
          {[dot1, dot2, dot3].map((d, i) => (
            <Animated.View
              key={i}
              style={[
                tbStyles.dot,
                { backgroundColor: colors.saber, opacity: d },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const tbStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 9, paddingHorizontal: 16, paddingVertical: 4, maxWidth: "90%" },
  bubble: {
    borderWidth: 1,
    borderRadius: 15,
    borderTopLeftRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dots: { flexDirection: "row", gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

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

function MessageRow({ message }: { message: Message }) {
  const colors = useColors();
  if (message.type === "routing") {
    return <RoutingChip text={message.text} />;
  }
  if (message.type === "user") {
    return (
      <View style={mrStyles.userRow}>
        <View style={[mrStyles.userBubble, { backgroundColor: colors.saber }]}>
          <Text style={[mrStyles.userText, { color: "#04111f" }]}>
            {message.text}
          </Text>
        </View>
      </View>
    );
  }
  const char = CHARACTERS[message.charId!];
  if (!char) return null;
  return (
    <View style={mrStyles.aiRow}>
      <CharacterAvatar initials={char.initials} color={char.color} size={30} />
      <View
        style={[
          mrStyles.aiBubble,
          { backgroundColor: colors.card, borderColor: colors.line },
        ]}
      >
        <Text
          style={[
            mrStyles.aiName,
            { color: char.color },
          ]}
        >
          {char.name.toUpperCase()}
        </Text>
        <Text
          style={[
            mrStyles.aiText,
            { color: colors.foreground },
          ]}
        >
          {message.text}
        </Text>
      </View>
    </View>
  );
}
const mrStyles = StyleSheet.create({
  userRow: {
    alignSelf: "flex-end",
    maxWidth: "82%",
    paddingHorizontal: 16,
    paddingVertical: 3,
  },
  userBubble: {
    borderRadius: 15,
    borderTopRightRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  userText: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  aiRow: {
    flexDirection: "row",
    gap: 9,
    maxWidth: "90%",
    paddingHorizontal: 16,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  aiBubble: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 15,
    borderTopLeftRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  aiName: {
    fontSize: 9,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    marginBottom: 4,
  },
  aiText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
});

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedCharId, setSelectedCharId] = useState("auto");
  const [isBoardMode, setIsBoardMode] = useState(false);
  const [deepResearch, setDeepResearch] = useState(false);
  const [typingCharId, setTypingCharId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<"characters" | "templates">("characters");
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const responseCountRef = useRef(0);

  const started = messages.length > 0;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    AsyncStorage.getItem("costar_recent_chats")
      .then((raw) => {
        if (raw) setRecentChats(JSON.parse(raw) as RecentChat[]);
      })
      .catch(() => {});
  }, []);

  const saveRecentChat = useCallback(
    (charId: string, preview: string) => {
      const chat: RecentChat = {
        id: uid(),
        charId,
        preview,
        time: relativeTime(Date.now()),
      };
      const updated = [chat, ...recentChats.slice(0, 4)];
      setRecentChats(updated);
      AsyncStorage.setItem("costar_recent_chats", JSON.stringify(updated)).catch(
        () => {}
      );
    },
    [recentChats]
  );

  const addMessage = useCallback((msg: Omit<Message, "id" | "timestamp">) => {
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
  }, []);

  const runAIResponse = useCallback(
    (charId: string, delayMs: number, responseIdx: number) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setTypingCharId(charId);
          const typeDuration = deepResearch ? 1800 : 900;
          setTimeout(() => {
            setTypingCharId(null);
            const text = getResponse(charId, responseIdx);
            addMessage({ type: "ai", charId, text });
            resolve();
          }, typeDuration);
        }, delayMs);
      });
    },
    [deepResearch, addMessage]
  );

  const runBoardResponse = useCallback(
    async (userText: string) => {
      const idx = responseCountRef.current++;
      await runAIResponse("paul", 0, idx);
      await runAIResponse("sam", 400, idx);
      await runAIResponse("marc", 400, idx + 1);
      setIsProcessing(false);
    },
    [runAIResponse]
  );

  const runSingleResponse = useCallback(
    async (charId: string) => {
      const idx = responseCountRef.current++;
      if (deepResearch) {
        addMessage({
          type: "routing",
          text: `✦ Deep research — pulling context & recent data…`,
        });
        await new Promise<void>((r) => setTimeout(r, 600));
      }
      await runAIResponse(charId, 0, idx);
      setIsProcessing(false);
    },
    [runAIResponse, deepResearch, addMessage]
  );

  const runRoastSequence = useCallback(async () => {
    setTypingCharId("vc");
    await new Promise<void>((r) => setTimeout(r, deepResearch ? 2000 : 1000));
    setTypingCharId(null);
    for (let i = 0; i < ROAST_LINES.length; i++) {
      const line = ROAST_LINES[i]!;
      addMessage({ type: "ai", charId: "vc", text: line });
      if (i < ROAST_LINES.length - 1) {
        await new Promise<void>((r) => setTimeout(r, 1100));
      }
    }
    setIsProcessing(false);
  }, [deepResearch, addMessage]);

  const handleSend = useCallback(
    (text?: string) => {
      const msg = (text ?? inputText).trim();
      if (!msg || isProcessing) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setInputText("");
      setPlusMenuOpen(false);
      addMessage({ type: "user", text: msg });
      setIsProcessing(true);

      let responder = selectedCharId;
      if (isBoardMode) {
        runBoardResponse(msg);
        return;
      }
      if (selectedCharId === "auto") {
        responder = routeCharacter(msg);
        addMessage({
          type: "routing",
          text: `✦ Auto brought in ${CHARACTERS[responder]?.name ?? responder}`,
        });
      }
      runSingleResponse(responder);
      saveRecentChat(responder, msg.slice(0, 50));
    },
    [
      inputText,
      isProcessing,
      selectedCharId,
      isBoardMode,
      addMessage,
      runBoardResponse,
      runSingleResponse,
      saveRecentChat,
    ]
  );

  const openBoard = useCallback(() => {
    setIsBoardMode(true);
    setSelectedCharId("auto");
    setMessages([]);
    setIsProcessing(true);

    const delay = 0;
    BOARD_INTRO.forEach((item, i) => {
      setTimeout(() => {
        addMessage({ type: "ai", charId: item.charId, text: item.text });
        if (i === BOARD_INTRO.length - 1) setIsProcessing(false);
      }, delay + i * 900);
    });
  }, [addMessage]);

  const handleSelectTemplate = useCallback(
    (templateId: string) => {
      const tpl = TEMPLATES.find((t) => t.id === templateId);
      if (!tpl) return;

      if (tpl.characterId === "board") {
        openBoard();
        return;
      }

      setSelectedCharId(tpl.characterId);
      setIsBoardMode(false);

      if (tpl.id === "roast") {
        addMessage({ type: "user", text: tpl.prompt });
        setIsProcessing(true);
        if (deepResearch) {
          addMessage({
            type: "routing",
            text: "✦ Deep research — reading their last 200 tweets & portfolio…",
          });
        }
        runRoastSequence();
        return;
      }

      setInputText(tpl.prompt);
    },
    [openBoard, addMessage, deepResearch, runRoastSequence]
  );

  const styles = makeStyles(colors, topPad, bottomPad);

  const title = isBoardMode
    ? "The Board"
    : selectedCharId !== "auto"
      ? CHARACTERS[selectedCharId]?.name ?? ""
      : "";

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => {
            setPlusMenuOpen(false);
            setSidebarOpen(true);
          }}
          activeOpacity={0.7}
        >
          <Feather name="menu" size={21} color={colors.dim} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{started ? title : ""}</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={resetChat}
          activeOpacity={0.7}
        >
          <Feather name="plus" size={21} color={colors.dim} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior="padding"
        style={styles.flex}
        keyboardVerticalOffset={0}
      >
        {!started ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.emptyContainer}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.greeting}>
              <Text style={styles.greetingStar}>✦</Text>
              {" In pursuit of\ngreatness"}
            </Text>
            <Text style={styles.greetingSub}>
              The lonely part of building. Tell us what's actually going on —
              we'll bring the right voice.
            </Text>
            <View style={styles.chips}>
              {QUICK_PROMPTS.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  style={styles.chip}
                  onPress={() => handleSend(p.text)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipText}>{p.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.chip, styles.chipRoast]}
                onPress={() => handleSelectTemplate("roast")}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, styles.chipRoastText]}>
                  ◈ Roast my VC
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <FlatList
            inverted
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageRow message={item} />}
            ListHeaderComponent={
              typingCharId ? <TypingBubble charId={typingCharId} /> : null
            }
            contentContainerStyle={styles.chatContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={styles.composerWrapper}>
          {plusMenuOpen && (
            <View
              style={[
                styles.plusMenu,
                { backgroundColor: colors.background2, borderColor: colors.line },
              ]}
            >
              <TouchableOpacity
                style={styles.plusMenuItem}
                onPress={() => {
                  setPlusMenuOpen(false);
                  setSheetTab("characters");
                  setSheetOpen(true);
                }}
                activeOpacity={0.7}
              >
                <Feather name="users" size={19} color={colors.dim} />
                <Text style={[styles.plusMenuText, { color: colors.foreground }]}>
                  Browse characters
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.plusMenuItem}
                onPress={() => {
                  setPlusMenuOpen(false);
                  setSheetTab("templates");
                  setSheetOpen(true);
                }}
                activeOpacity={0.7}
              >
                <Feather name="layout" size={19} color={colors.dim} />
                <Text style={[styles.plusMenuText, { color: colors.foreground }]}>
                  Templates
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.plusMenuItem}
                onPress={() => {
                  setPlusMenuOpen(false);
                  openBoard();
                }}
                activeOpacity={0.7}
              >
                <Feather name="message-circle" size={19} color={colors.dim} />
                <Text style={[styles.plusMenuText, { color: colors.foreground }]}>
                  Talk to the board
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {plusMenuOpen && (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setPlusMenuOpen(false)}
            />
          )}

          <View
            style={[
              styles.composer,
              { backgroundColor: colors.card, borderColor: colors.line },
            ]}
          >
            <View style={styles.composerRow1}>
              <TextInput
                style={[styles.composerInput, { color: colors.foreground }]}
                multiline
                placeholder="What's on your mind tonight?"
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
                  style={[
                    styles.plusBtn,
                    {
                      backgroundColor: colors.background2,
                      borderColor: colors.line,
                    },
                  ]}
                  onPress={() => setPlusMenuOpen((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.plusBtnText, { color: colors.dim }]}>
                    +
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.charPicker,
                    {
                      backgroundColor: colors.background2,
                      borderColor: colors.line,
                    },
                  ]}
                  onPress={() => {
                    setSheetTab("characters");
                    setSheetOpen(true);
                  }}
                  activeOpacity={0.7}
                >
                  {isBoardMode ? (
                    <View
                      style={[
                        styles.autoIcon,
                        { backgroundColor: "rgba(63,169,245,0.2)" },
                      ]}
                    >
                      <Text style={[styles.autoIconText, { color: colors.saber }]}>◈</Text>
                    </View>
                  ) : selectedCharId === "auto" ? (
                    <View
                      style={[
                        styles.autoIcon,
                        { backgroundColor: colors.saber },
                      ]}
                    >
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
                    {isBoardMode
                      ? "The Board"
                      : selectedCharId === "auto"
                        ? "Auto"
                        : CHARACTERS[selectedCharId]?.name ?? ""}
                  </Text>
                  <Text style={[styles.charPickerChevron, { color: colors.faint }]}>
                    ▾
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.composerRight}>
                <TouchableOpacity
                  style={[
                    styles.researchToggle,
                    {
                      backgroundColor: colors.background2,
                      borderColor: deepResearch
                        ? colors.saber
                        : colors.line,
                    },
                  ]}
                  onPress={() => setDeepResearch((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="search"
                    size={13}
                    color={deepResearch ? colors.saber : colors.dim}
                  />
                  <Text
                    style={[
                      styles.researchText,
                      { color: deepResearch ? colors.saber : colors.dim },
                    ]}
                  >
                    deep research
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    { backgroundColor: colors.saber },
                    (!inputText.trim() || isProcessing) && styles.sendBtnDisabled,
                  ]}
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
            Co-Star is coaching and company, not professional help.
          </Text>
        </View>
      </KeyboardAvoidingView>

      <Sidebar
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={resetChat}
        onSelectCharacter={(id) => {
          setSelectedCharId(id);
          setIsBoardMode(false);
        }}
        onOpenBoard={openBoard}
        recentChats={recentChats}
      />

      <CharacterSheet
        visible={sheetOpen}
        initialTab={sheetTab}
        selectedCharId={selectedCharId}
        isBoardMode={isBoardMode}
        onClose={() => setSheetOpen(false)}
        onSelectCharacter={(id) => {
          setSelectedCharId(id);
          setIsBoardMode(false);
        }}
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
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: { flex: 1 },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: topPad + 6,
      paddingBottom: 8,
      paddingHorizontal: 18,
      backgroundColor: colors.background,
    },
    iconBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    topTitle: {
      color: colors.dim,
      fontSize: 16,
      fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 26,
      paddingBottom: 80,
    },
    greeting: {
      color: colors.foreground,
      fontSize: 30,
      fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
      fontWeight: "400",
      letterSpacing: -0.5,
      lineHeight: 38,
      textAlign: "center",
    },
    greetingStar: {
      color: colors.saber,
    },
    greetingSub: {
      color: colors.dim,
      fontSize: 14,
      fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
      fontStyle: "italic",
      textAlign: "center",
      marginTop: 12,
      lineHeight: 21,
      maxWidth: 280,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "center",
      marginTop: 26,
      maxWidth: 340,
    },
    chip: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 20,
      paddingVertical: 9,
      paddingHorizontal: 13,
    },
    chipText: {
      color: colors.foreground,
      fontSize: 12.5,
    },
    chipRoast: {
      borderColor: "rgba(63,169,245,0.4)",
    },
    chipRoastText: {
      color: colors.saber,
    },
    chatContent: {
      paddingVertical: 12,
      paddingBottom: 8,
    },
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
    plusMenuItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    plusMenuText: {
      fontSize: 14,
    },
    composer: {
      borderWidth: 1,
      borderRadius: 22,
      padding: 6,
    },
    composerRow1: {
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 4,
    },
    composerInput: {
      fontSize: 15,
      lineHeight: 21,
      maxHeight: 90,
      backgroundColor: "transparent",
    },
    composerRow2: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 4,
      paddingBottom: 2,
    },
    composerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    composerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    plusBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    plusBtnText: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: "300",
    },
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
    autoIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    autoIconText: {
      fontSize: 10,
      fontWeight: "700",
    },
    charPickerName: {
      fontSize: 13,
      fontWeight: "500",
    },
    charPickerChevron: {
      fontSize: 11,
    },
    researchToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderRadius: 16,
      paddingVertical: 6,
      paddingHorizontal: 10,
      marginRight: 6,
    },
    researchText: {
      fontSize: 9,
      fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    },
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
    sendBtnDisabled: {
      opacity: 0.4,
    },
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
