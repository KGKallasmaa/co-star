import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  Pressable,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { patchProfile } from "@/lib/profile";

export default function NameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("Karl");
  const fadeIn = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    setTimeout(() => inputRef.current?.focus(), 400);
  }, []);

  async function handleContinue() {
    const trimmed = name.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await patchProfile({ name: trimmed });
    router.push("/(onboarding)/startup");
  }

  function handleSkip() {
    router.push("/(onboarding)/startup");
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View
          style={[
            styles.inner,
            {
              paddingTop: insets.top + 40,
              paddingBottom: insets.bottom + 24,
              opacity: fadeIn,
            },
          ]}
        >
          <View style={styles.content}>
            <Text style={[styles.star, { color: colors.saber }]}>✦</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              What do we call you?
            </Text>
            <Text style={[styles.subtitle, { color: colors.dim }]}>
              Your advisors want to know who they're talking to.
            </Text>

            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.card, borderColor: colors.line },
              ]}
            >
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Your first name"
                placeholderTextColor={colors.faint}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                maxLength={40}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.ctaButton,
                {
                  backgroundColor: name.trim() ? colors.saber : colors.background2,
                  borderColor: name.trim() ? colors.saber : colors.line,
                  borderWidth: 1,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={handleContinue}
              disabled={!name.trim()}
            >
              <Text
                style={[
                  styles.ctaText,
                  { color: name.trim() ? "#04111f" : colors.faint },
                ]}
              >
                Continue
              </Text>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  content: { gap: 16, alignItems: "center" },
  star: { fontSize: 40 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    fontStyle: "italic",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    lineHeight: 22,
  },
  inputWrapper: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 8,
  },
  input: {
    paddingHorizontal: 18,
    paddingVertical: 17,
    fontSize: 18,
    fontWeight: "500",
  },
  footer: { gap: 12, alignItems: "center" },
  ctaButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  ctaText: { fontSize: 16, fontWeight: "700" },
  skipBtn: { paddingVertical: 8 },
  skipText: { fontSize: 13 },
});
