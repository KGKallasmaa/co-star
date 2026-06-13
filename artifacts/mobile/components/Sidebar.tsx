import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Dimensions,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { CHARACTER_IDS, CHARACTERS, BOARD_MEMBER_IDS } from "@/constants/characters";
import CharacterAvatar from "./CharacterAvatar";
import type { SavedConv, SavedTake } from "@/lib/storage";

const SIDEBAR_WIDTH = Math.min(Dimensions.get("window").width * 0.84, 320);

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelectCharacter: (charId: string) => void;
  onOpenBoard: () => void;
  onOpenSettings: () => void;
  savedConvs: SavedConv[];
  savedTakes: SavedTake[];
  onLoadConv: (conv: SavedConv) => void;
  onDeleteConv: (id: string) => void;
}

export default function Sidebar({
  visible,
  onClose,
  onNewChat,
  onSelectCharacter,
  onOpenBoard,
  onOpenSettings,
  savedConvs,
  savedTakes,
  onLoadConv,
  onDeleteConv,
}: SidebarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [shouldRender, setShouldRender] = useState(false);
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 90,
          friction: 16,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -SIDEBAR_WIDTH,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setShouldRender(false));
    }
  }, [visible]);

  const styles = makeStyles(colors, insets);

  if (!shouldRender) return null;

  function confirmDelete(id: string, title: string) {
    Alert.alert("Delete conversation", `"${title.slice(0, 40)}…"`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDeleteConv(id),
      },
    ]);
  }

  return (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View style={[styles.sidebar, { transform: [{ translateX }] }]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.brand}>
              <Text style={styles.brandStar}>✦</Text>
              <Text style={styles.brandName}>Co-Star</Text>
            </View>

            <TouchableOpacity
              style={styles.boardPin}
              onPress={() => { onOpenBoard(); onClose(); }}
              activeOpacity={0.7}
            >
              <View style={styles.boardStack}>
                {BOARD_MEMBER_IDS.slice(0, 3).map((id) => (
                  <CharacterAvatar
                    key={id}
                    initials={CHARACTERS[id]!.initials}
                    color={CHARACTERS[id]!.color}
                    size={28}
                  />
                ))}
              </View>
              <View style={styles.boardInfo}>
                <View style={styles.boardTitleRow}>
                  <Text style={styles.boardTitle}>The Board</Text>
                  <View style={styles.boardDot} />
                </View>
                <Text style={styles.boardSubtitle} numberOfLines={1}>
                  Paul, Marc & Sam in the room
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={() => { onNewChat(); onClose(); }}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={17} color={colors.foreground} />
              <Text style={styles.newChatText}>New conversation</Text>
            </TouchableOpacity>

            {savedConvs.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>History</Text>
                {savedConvs.map((conv) => {
                  const char = CHARACTERS[conv.charId];
                  return (
                    <TouchableOpacity
                      key={conv.id}
                      style={styles.convItem}
                      onPress={() => { onLoadConv(conv); onClose(); }}
                      onLongPress={() => confirmDelete(conv.id, conv.title)}
                      activeOpacity={0.7}
                    >
                      {conv.boardMode ? (
                        <View style={styles.boardMiniStack}>
                          {BOARD_MEMBER_IDS.slice(0, 2).map((id) => (
                            <CharacterAvatar
                              key={id}
                              initials={CHARACTERS[id]!.initials}
                              color={CHARACTERS[id]!.color}
                              size={20}
                            />
                          ))}
                        </View>
                      ) : (
                        <CharacterAvatar
                          initials={char?.initials ?? "??"}
                          color={char?.color ?? "#555"}
                          size={24}
                        />
                      )}
                      <Text style={styles.convPreview} numberOfLines={1}>
                        {conv.title}
                      </Text>
                      <Text style={styles.convTime}>{relativeTime(conv.ts)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {savedTakes.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Saved takes</Text>
                {savedTakes.slice(0, 6).map((take) => {
                  const char = CHARACTERS[take.charId];
                  return (
                    <View key={take.id} style={[styles.takeItem, { borderLeftColor: char?.color ?? colors.line }]}>
                      <Text style={[styles.takeText, { color: colors.dim }]} numberOfLines={2}>
                        {take.text.slice(0, 100)}
                      </Text>
                      <Text style={[styles.takeName, { color: char?.color ?? colors.faint }]}>
                        — {char?.name ?? "?"}
                      </Text>
                    </View>
                  );
                })}
              </>
            )}

            <Text style={styles.sectionLabel}>Advisors</Text>
            {CHARACTER_IDS.map((id) => {
              const char = CHARACTERS[id]!;
              return (
                <TouchableOpacity
                  key={id}
                  style={styles.charItem}
                  onPress={() => { onSelectCharacter(id); onClose(); }}
                  activeOpacity={0.7}
                >
                  <CharacterAvatar initials={char.initials} color={char.color} size={24} />
                  <View style={styles.charBody}>
                    <Text style={styles.charName}>{char.name}</Text>
                    <Text style={styles.charVoice} numberOfLines={1}>{char.voice}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => { onOpenSettings(); onClose(); }}
              activeOpacity={0.7}
            >
              <Feather name="settings" size={16} color={colors.dim} />
              <Text style={styles.settingsText}>You & your startup</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Co-Star for Founders</Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 86400000 * 7) return `${Math.floor(diff / 86400000)}d`;
  return new Date(ts).toLocaleDateString("en", { month: "short", day: "numeric" });
}

function makeStyles(
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>,
  insets: { top: number; bottom: number }
) {
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(5,8,13,0.72)",
    },
    sidebar: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      width: SIDEBAR_WIDTH,
      backgroundColor: colors.background2,
      borderRightWidth: 1,
      borderRightColor: colors.line,
    },
    scrollContent: {
      paddingTop: topPad + 6,
      paddingHorizontal: 14,
      paddingBottom: Math.max(insets.bottom, 24),
    },
    brand: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 4,
      marginBottom: 4,
    },
    brandStar: { color: colors.saber, fontSize: 18 },
    brandName: {
      color: colors.foreground,
      fontSize: 20,
      fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
      fontWeight: "400",
    },
    boardPin: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: "rgba(63,169,245,0.08)",
      borderWidth: 1,
      borderColor: "rgba(63,169,245,0.25)",
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
    },
    boardStack: { flexDirection: "row", marginRight: -4 },
    boardInfo: { flex: 1, minWidth: 0 },
    boardTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
    boardTitle: {
      color: colors.foreground,
      fontSize: 15,
      fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    },
    boardDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: colors.saber,
    },
    boardSubtitle: { color: colors.dim, fontSize: 11, marginTop: 2 },
    newChatBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 12,
      marginBottom: 6,
    },
    newChatText: { color: colors.foreground, fontSize: 14, fontWeight: "500" },
    sectionLabel: {
      color: colors.faint,
      fontSize: 9.5,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
      marginTop: 18,
      marginBottom: 8,
      marginLeft: 4,
    },
    convItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 9,
      paddingHorizontal: 8,
      borderRadius: 10,
    },
    boardMiniStack: { flexDirection: "row", width: 24 },
    convPreview: { flex: 1, color: colors.dim, fontSize: 13 },
    convTime: {
      color: colors.faint,
      fontSize: 9,
      fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    },
    charItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 9,
      paddingHorizontal: 8,
      borderRadius: 10,
    },
    charBody: { flex: 1, minWidth: 0, gap: 1 },
    takeItem: {
      borderLeftWidth: 2,
      paddingLeft: 10,
      paddingVertical: 8,
      marginVertical: 3,
      gap: 4,
    },
    takeText: {
      fontSize: 12.5,
      lineHeight: 18,
      fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
      fontStyle: "italic",
    },
    takeName: {
      fontSize: 10,
      fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
      letterSpacing: 0.3,
    },
    charName: { color: colors.dim, fontSize: 13.5 },
    charVoice: {
      color: colors.faint,
      fontSize: 10,
      lineHeight: 14,
    },
    footer: {
      marginTop: 28,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.line,
      alignItems: "center",
    },
    footerText: {
      color: colors.faint,
      fontSize: 10,
      fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
      letterSpacing: 0.5,
    },
  });
}
