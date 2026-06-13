import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  Pressable,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { CHARACTERS, CHARACTER_IDS } from "@/constants/characters";

const ADVISOR_DESCS: Record<string, string> = {
  paul: "First-principles clarity. He dismantles the story you tell yourself.",
  garry: "Bias to action. Ship it, talk to users, launch now.",
  marc: "P(doom) zero. Raise more, move faster, bet on tech.",
  sam: "A founder in it right now. Sits in the hard feeling with you.",
  vc: "Translates what VCs actually mean when they ghost you.",
  elon: "Delete the requirement. The deadline is now.",
};

export default function PickAdvisorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string | null>(null);
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  async function handleContinue() {
    if (!selected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await AsyncStorage.setItem("costar_default_advisor", selected).catch(() => {});
    router.push("/(onboarding)/name");
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        style={[
          styles.inner,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
            opacity: fadeIn,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Who do you want in your corner?
          </Text>
          <Text style={[styles.subtitle, { color: colors.dim }]}>
            Pick your default advisor. You can always switch.
          </Text>
        </View>

        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {CHARACTER_IDS.map((id) => {
            const char = CHARACTERS[id]!;
            const isSelected = selected === id;
            return (
              <Pressable
                key={id}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: isSelected
                      ? `${char.color}22`
                      : colors.card,
                    borderColor: isSelected ? char.color : colors.line,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setSelected(id);
                }}
              >
                <View style={[styles.avatar, { backgroundColor: char.color }]}>
                  <Text style={styles.avatarText}>{char.initials}</Text>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.charName, { color: colors.foreground }]}>
                      {char.name}
                    </Text>
                    <Text style={[styles.charRole, { color: char.color }]}>
                      {char.role}
                    </Text>
                  </View>
                  <Text style={[styles.charDesc, { color: colors.dim }]}>
                    {ADVISOR_DESCS[id]}
                  </Text>
                </View>
                {isSelected && (
                  <Text style={[styles.check, { color: char.color }]}>✓</Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              {
                backgroundColor: selected ? colors.saber : colors.background2,
                borderColor: selected ? colors.saber : colors.line,
                borderWidth: 1,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={handleContinue}
            disabled={!selected}
          >
            <Text
              style={[
                styles.ctaText,
                { color: selected ? "#04111f" : colors.faint },
              ]}
            >
              Continue
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 20 },
  header: { marginBottom: 20, gap: 6 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  list: { flex: 1 },
  listContent: { gap: 10, paddingBottom: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cardBody: { flex: 1, gap: 3 },
  cardTop: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  charName: { fontSize: 15, fontWeight: "600" },
  charRole: { fontSize: 11, fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace" },
  charDesc: { fontSize: 13, lineHeight: 18 },
  check: { fontSize: 18, fontWeight: "700" },
  footer: { paddingTop: 12 },
  ctaButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  ctaText: { fontSize: 16, fontWeight: "700" },
});
