import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { getApiBaseUrl } from "@/lib/api";

const PERKS = [
  { icon: "✦", text: "Six distinct advisor voices" },
  { icon: "◈", text: "Unlimited conversations, no cap" },
  { icon: "◴", text: "The Board: Paul, Marc & Sam at once" },
  { icon: "⊳", text: "Streaming AI — feels alive, not queued" },
  { icon: "◑", text: "Your history, always saved" },
];

async function getOrCreateDeviceId(): Promise<string> {
  const key = "costar_device_id";
  let id = await AsyncStorage.getItem(key).catch(() => null);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    await AsyncStorage.setItem(key, id).catch(() => {});
  }
  return id;
}

export default function PaywallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const [purchasing, setPurchasing] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

  const handleSubscribe = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPurchasing(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      const base = getApiBaseUrl();
      const resp = await fetch(`${base}stripe/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
      const data = await resp.json() as { url?: string; error?: string };
      if (data.url) {
        await Linking.openURL(data.url);
      } else {
        console.warn("Checkout error:", data.error);
        await finishOnboarding();
      }
    } catch (err) {
      console.warn("Checkout failed:", err);
      await finishOnboarding();
    } finally {
      setPurchasing(false);
    }
  }, []);

  const handleCheckSubscription = useCallback(async () => {
    setChecking(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      const base = getApiBaseUrl();
      const resp = await fetch(`${base}stripe/subscription?deviceId=${encodeURIComponent(deviceId)}`);
      const data = await resp.json() as { active?: boolean };
      if (data.active) {
        await finishOnboarding();
      }
    } catch {}
    setChecking(false);
  }, []);

  async function handleSkip() {
    await finishOnboarding();
  }

  async function finishOnboarding() {
    await AsyncStorage.setItem("costar_onboarded", "true").catch(() => {});
    router.replace("/(tabs)" as never);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[`${colors.saber}18`, colors.background, colors.background]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <Animated.View
        style={[
          styles.inner,
          {
            paddingTop: insets.top + 32,
            paddingBottom: insets.bottom + 24,
            opacity: fadeIn,
          },
        ]}
      >
        <View style={styles.top}>
          <Text style={[styles.badge, { color: colors.saber, borderColor: `${colors.saber}44` }]}>
            FOUNDERS PRO
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Your advisors are ready.
          </Text>
          <Text style={[styles.subtitle, { color: colors.dim }]}>
            The loneliest part of building shouldn't cost you your clarity.
          </Text>
        </View>

        <View style={styles.perks}>
          {PERKS.map((perk) => (
            <View key={perk.text} style={styles.perkRow}>
              <Text style={[styles.perkIcon, { color: colors.saber }]}>{perk.icon}</Text>
              <Text style={[styles.perkText, { color: colors.foreground }]}>{perk.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.bottom}>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.foreground }]}>$10</Text>
            <Text style={[styles.pricePer, { color: colors.dim }]}> / month</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: colors.saber, opacity: pressed || purchasing ? 0.85 : 1 },
            ]}
            onPress={handleSubscribe}
            disabled={purchasing || checking}
          >
            {purchasing ? (
              <ActivityIndicator color="#04111f" />
            ) : (
              <Text style={styles.ctaText}>Subscribe · $10/month</Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.restoreBtn, { borderColor: colors.line }]}
            onPress={handleCheckSubscription}
            disabled={purchasing || checking}
          >
            {checking ? (
              <ActivityIndicator size="small" color={colors.dim} />
            ) : (
              <Text style={[styles.restoreText, { color: colors.dim }]}>
                Already subscribed? Check status
              </Text>
            )}
          </Pressable>

          <Pressable onPress={handleSkip} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: colors.faint }]}>
              Continue without subscribing
            </Text>
          </Pressable>

          <Text style={[styles.legal, { color: colors.faint }]}>
            Cancel anytime. Billed monthly via Stripe. No App Store fees.
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: "space-between" },
  top: { gap: 12, alignItems: "center" },
  badge: {
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    fontStyle: "italic",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    lineHeight: 22,
  },
  perks: { gap: 14, paddingVertical: 8 },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  perkIcon: { fontSize: 16, width: 20, textAlign: "center" },
  perkText: { fontSize: 15, fontWeight: "500", flex: 1 },
  bottom: { gap: 12, alignItems: "center" },
  priceRow: { flexDirection: "row", alignItems: "baseline" },
  price: { fontSize: 38, fontWeight: "700" },
  pricePer: { fontSize: 18 },
  ctaButton: {
    width: "100%",
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: "center",
  },
  ctaText: {
    color: "#04111f",
    fontSize: 17,
    fontWeight: "700",
  },
  restoreBtn: {
    width: "100%",
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  restoreText: { fontSize: 14 },
  skipBtn: { paddingVertical: 4 },
  skipText: { fontSize: 14 },
  legal: { fontSize: 11, textAlign: "center", lineHeight: 16 },
});
