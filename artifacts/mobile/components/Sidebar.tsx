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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import {
  CHARACTER_IDS,
  CHARACTERS,
  BOARD_MEMBER_IDS,
} from "@/constants/characters";
import CharacterAvatar from "./CharacterAvatar";

const SIDEBAR_WIDTH = Math.min(Dimensions.get("window").width * 0.84, 320);

export interface RecentChat {
  id: string;
  charId: string;
  preview: string;
  time: string;
}

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelectCharacter: (charId: string) => void;
  onOpenBoard: () => void;
  recentChats: RecentChat[];
}

export default function Sidebar({
  visible,
  onClose,
  onNewChat,
  onSelectCharacter,
  onOpenBoard,
  recentChats,
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

  return (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          style={[styles.sidebar, { transform: [{ translateX }] }]}
        >
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
              onPress={() => {
                onOpenBoard();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.boardStack}>
                {BOARD_MEMBER_IDS.slice(0, 3).map((id) => (
                  <CharacterAvatar
                    key={id}
                    initials={CHARACTERS[id].initials}
                    color={CHARACTERS[id].color}
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
                  3 founders + a VC, in the room
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={() => {
                onNewChat();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={17} color={colors.foreground} />
              <Text style={styles.newChatText}>New conversation</Text>
            </TouchableOpacity>

            {recentChats.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Recent</Text>
                {recentChats.map((chat) => (
                  <TouchableOpacity
                    key={chat.id}
                    style={styles.convItem}
                    onPress={() => {
                      onSelectCharacter(chat.charId);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <CharacterAvatar
                      initials={CHARACTERS[chat.charId]?.initials ?? "??"}
                      color={CHARACTERS[chat.charId]?.color ?? "#555"}
                      size={24}
                    />
                    <Text style={styles.convPreview} numberOfLines={1}>
                      {chat.preview}
                    </Text>
                    <Text style={styles.convTime}>{chat.time}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <Text style={styles.sectionLabel}>Characters</Text>
            {CHARACTER_IDS.map((id) => {
              const char = CHARACTERS[id];
              return (
                <TouchableOpacity
                  key={id}
                  style={styles.charItem}
                  onPress={() => {
                    onSelectCharacter(id);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <CharacterAvatar
                    initials={char.initials}
                    color={char.color}
                    size={24}
                  />
                  <Text style={styles.charName}>{char.name}</Text>
                  <Text style={styles.charRole} numberOfLines={1}>
                    {char.role}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof import("@/hooks/useColors").useColors>, insets: { top: number; bottom: number }) {
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(5,8,13,0.65)",
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
    brandStar: {
      color: colors.saber,
      fontSize: 18,
    },
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
    boardStack: {
      flexDirection: "row",
      gap: -6,
    },
    boardInfo: { flex: 1, minWidth: 0 },
    boardTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
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
    boardSubtitle: {
      color: colors.dim,
      fontSize: 11,
      marginTop: 2,
    },
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
    newChatText: {
      color: colors.foreground,
      fontSize: 14,
      fontWeight: "500",
    },
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
    convPreview: {
      flex: 1,
      color: colors.dim,
      fontSize: 13.5,
    },
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
    charName: {
      color: colors.dim,
      fontSize: 13.5,
      flex: 1,
    },
    charRole: {
      color: colors.faint,
      fontSize: 10,
      fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
      maxWidth: 100,
    },
  });
}
