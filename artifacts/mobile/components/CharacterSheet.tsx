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
import { useColors } from "@/hooks/useColors";
import {
  CHARACTER_IDS,
  CHARACTERS,
  TEMPLATES,
} from "@/constants/characters";
import CharacterAvatar from "./CharacterAvatar";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface CharacterSheetProps {
  visible: boolean;
  initialTab?: "characters" | "templates";
  selectedCharId: string;
  isBoardMode: boolean;
  onClose: () => void;
  onSelectCharacter: (charId: string) => void;
  onSelectBoard: () => void;
  onSelectTemplate: (templateId: string) => void;
}

export default function CharacterSheet({
  visible,
  initialTab = "characters",
  selectedCharId,
  isBoardMode,
  onClose,
  onSelectCharacter,
  onSelectBoard,
  onSelectTemplate,
}: CharacterSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"characters" | "templates">(initialTab);
  const [shouldRender, setShouldRender] = useState(false);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      setShouldRender(true);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 15,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start(() => setShouldRender(false));
    }
  }, [visible]);

  const styles = makeStyles(colors, insets);
  if (!shouldRender) return null;

  const isAutoSelected = selectedCharId === "auto" && !isBoardMode;
  const isBoardSelected = isBoardMode;

  return (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
        >
          <View style={styles.grab} />

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "characters" && styles.tabActive]}
              onPress={() => setActiveTab("characters")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "characters" && styles.tabTextActive,
                ]}
              >
                Characters
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "templates" && styles.tabActive]}
              onPress={() => setActiveTab("templates")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "templates" && styles.tabTextActive,
                ]}
              >
                Templates
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {activeTab === "characters" ? (
              <View>
                <Text style={styles.sectionLabel}>
                  Switch like a model · Auto picks for you
                </Text>
                <View style={styles.grid}>
                  <TouchableOpacity
                    style={[styles.card, isAutoSelected && styles.cardSelected]}
                    onPress={() => {
                      onSelectCharacter("auto");
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.autoAvatar}>
                      <Text style={styles.autoStar}>✦</Text>
                    </View>
                    <Text style={styles.cardName}>Auto</Text>
                    <Text style={styles.cardRole}>recommended</Text>
                    <Text style={styles.cardVoice}>
                      We read your message and bring the right voice.
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.card, isBoardSelected && styles.cardSelected]}
                    onPress={() => {
                      onSelectBoard();
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.autoAvatar, { backgroundColor: "rgba(63,169,245,0.15)" }]}>
                      <Text style={[styles.autoStar, { fontSize: 14 }]}>◈</Text>
                    </View>
                    <Text style={styles.cardName}>The Board</Text>
                    <Text style={styles.cardRole}>group session</Text>
                    <Text style={styles.cardVoice}>
                      Paul, Marc, and Sam weigh in together.
                    </Text>
                  </TouchableOpacity>

                  {CHARACTER_IDS.map((id) => {
                    const char = CHARACTERS[id];
                    const isSelected = !isBoardMode && selectedCharId === id;
                    return (
                      <TouchableOpacity
                        key={id}
                        style={[styles.card, isSelected && styles.cardSelected]}
                        onPress={() => {
                          onSelectCharacter(id);
                          onClose();
                        }}
                        activeOpacity={0.7}
                      >
                        <CharacterAvatar
                          initials={char.initials}
                          color={char.color}
                          size={44}
                        />
                        <Text style={styles.cardName}>{char.name}</Text>
                        <Text style={[styles.cardRole, { color: char.color }]}>
                          {char.role}
                        </Text>
                        <Text style={styles.cardVoice}>{char.voice}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={{ height: 24 }} />
              </View>
            ) : (
              <View>
                <Text style={styles.sectionLabel}>Start from a moment</Text>
                {TEMPLATES.map((tpl) => (
                  <TouchableOpacity
                    key={tpl.id}
                    style={[styles.templateItem, tpl.isFeatured && styles.templateFeatured]}
                    onPress={() => {
                      onSelectTemplate(tpl.id);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.templateIcon}>
                      <Text style={styles.templateIconText}>{tpl.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.templateName}>{tpl.name}</Text>
                      <Text style={styles.templateDesc}>{tpl.desc}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                <View style={{ height: 24 }} />
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function makeStyles(
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>,
  insets: { top: number; bottom: number }
) {
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(5,8,13,0.74)",
    },
    sheet: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: SCREEN_HEIGHT * 0.88,
      backgroundColor: colors.background2,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderTopWidth: 1,
      borderTopColor: "rgba(63,169,245,0.2)",
      paddingBottom: bottomPad,
    },
    grab: {
      width: 38,
      height: 4,
      backgroundColor: colors.faint,
      borderRadius: 3,
      alignSelf: "center",
      marginTop: 10,
      marginBottom: 10,
      opacity: 0.5,
    },
    tabs: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 24,
      marginBottom: 4,
    },
    tab: {
      flex: 1,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 13,
      paddingVertical: 11,
      alignItems: "center",
    },
    tabActive: {
      backgroundColor: colors.saber,
      borderColor: colors.saber,
    },
    tabText: {
      color: colors.dim,
      fontSize: 13,
      fontWeight: "600",
    },
    tabTextActive: {
      color: "#04111f",
    },
    sectionLabel: {
      color: colors.faint,
      fontSize: 9.5,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 10,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: 12,
      gap: 0,
    },
    card: {
      width: "50%",
      padding: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 16,
      margin: 4,
    },
    cardSelected: {
      borderColor: colors.saber,
      backgroundColor: colors.card2,
    },
    autoAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.saber,
      alignItems: "center",
      justifyContent: "center",
    },
    autoStar: {
      color: "#04111f",
      fontSize: 20,
      fontWeight: "700",
    },
    cardName: {
      color: colors.foreground,
      fontSize: 17,
      fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
      marginTop: 10,
      lineHeight: 20,
    },
    cardRole: {
      color: colors.saber,
      fontSize: 8.5,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
      marginTop: 5,
    },
    cardVoice: {
      color: colors.dim,
      fontSize: 11.5,
      lineHeight: 16,
      marginTop: 8,
    },
    templateItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 14,
      padding: 14,
      marginHorizontal: 24,
      marginBottom: 9,
    },
    templateFeatured: {
      backgroundColor: "rgba(63,169,245,0.07)",
      borderColor: "rgba(63,169,245,0.35)",
    },
    templateIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    templateIconText: {
      color: colors.saber,
      fontSize: 17,
      fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    },
    templateName: {
      color: colors.foreground,
      fontSize: 15,
      fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    },
    templateDesc: {
      color: colors.dim,
      fontSize: 9,
      fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
      marginTop: 3,
    },
  });
}
