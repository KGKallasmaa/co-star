import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  Pressable,
  TextInput,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { patchProfile, STARTUP_STAGES } from "@/lib/profile";

// Pre-filled with believable defaults so onboarding is tap-tap-Continue on stage.
export default function StartupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState("Founder & CEO");
  const [startupName, setStartupName] = useState("Cadence");
  const [oneLiner, setOneLiner] = useState(
    "an AI copilot that runs standups and status for engineering teams"
  );
  const [stage, setStage] = useState<string>("Pre-seed");
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  async function handleContinue() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await patchProfile({
      role: role.trim() || undefined,
      startupName: startupName.trim() || undefined,
      oneLiner: oneLiner.trim() || undefined,
      stage,
    });
    router.push("/(onboarding)/paywall");
  }

  function handleSkip() {
    router.push("/(onboarding)/paywall");
  }

  const styles = makeStyles(colors);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View
          style={[
            styles.inner,
            { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 18, opacity: fadeIn },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
          >
            <Text style={[styles.star, { color: colors.saber }]}>✦</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Tell me about your startup.
            </Text>
            <Text style={[styles.subtitle, { color: colors.dim }]}>
              So every advisor speaks to your actual situation — not generic advice.
            </Text>

            <Field label="YOUR ROLE" value={role} onChange={setRole} placeholder="Founder & CEO" colors={colors} />
            <Field label="STARTUP" value={startupName} onChange={setStartupName} placeholder="Company name" colors={colors} />
            <Field label="WHAT YOU'RE BUILDING" value={oneLiner} onChange={setOneLiner} placeholder="One line a stranger would understand" colors={colors} multiline />

            <Text style={styles.fieldLabel}>STAGE</Text>
            <View style={styles.chips}>
              {STARTUP_STAGES.map((sg) => {
                const sel = stage === sg;
                return (
                  <Pressable
                    key={sg}
                    onPress={() => { Haptics.selectionAsync().catch(() => {}); setStage(sg); }}
                    style={({ pressed }) => [
                      styles.chip,
                      { borderColor: sel ? colors.saber : colors.line, backgroundColor: sel ? `${colors.saber}22` : colors.card, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: sel ? colors.saber : colors.dim }]}>{sg}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [styles.cta, { backgroundColor: colors.saber, opacity: pressed ? 0.85 : 1 }]}
              onPress={handleContinue}
            >
              <Text style={styles.ctaText}>Continue</Text>
            </Pressable>
            <Pressable onPress={handleSkip} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: colors.faint }]}>Skip for now</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  colors,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  colors: ReturnType<typeof useColors>;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          color: colors.faint,
          fontSize: 9.5,
          letterSpacing: 1.4,
          fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
          marginBottom: 7,
        }}
      >
        {label}
      </Text>
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12 }}>
        <TextInput
          style={{
            color: colors.foreground,
            fontSize: 15,
            paddingHorizontal: 14,
            paddingVertical: 12,
            minHeight: multiline ? 58 : undefined,
            textAlignVertical: multiline ? "top" : "center",
          }}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          multiline={multiline}
        />
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    inner: { flex: 1, paddingHorizontal: 22, justifyContent: "space-between" },
    scroll: { paddingBottom: 12 },
    star: { fontSize: 36, marginBottom: 8 },
    title: {
      fontSize: 27,
      fontWeight: "700",
      fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
      lineHeight: 34,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 21,
      fontStyle: "italic",
      fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
      marginTop: 6,
      marginBottom: 22,
    },
    fieldLabel: {
      color: colors.faint,
      fontSize: 9.5,
      letterSpacing: 1.4,
      fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
      marginBottom: 9,
    },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { borderWidth: 1, borderRadius: 11, paddingVertical: 9, paddingHorizontal: 14 },
    chipText: { fontSize: 12.5, fontWeight: "600" },
    footer: { gap: 10, alignItems: "center", paddingTop: 10 },
    cta: { width: "100%", paddingVertical: 16, borderRadius: 14, alignItems: "center" },
    ctaText: { color: "#04111f", fontSize: 16, fontWeight: "700" },
    skipBtn: { paddingVertical: 6 },
    skipText: { fontSize: 13 },
  });
}
