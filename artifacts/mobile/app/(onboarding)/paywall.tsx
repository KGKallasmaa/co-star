import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  Pressable,
  ActivityIndicator,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";

const RC_KEYS_SET =
  !!process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY &&
  !!process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY &&
  !!process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

const PERKS = [
  { icon: "✦", text: "Real AI — six distinct advisor voices" },
  { icon: "◈", text: "Unlimited conversations, no cap" },
  { icon: "◴", text: "The Board: Paul, Marc & Sam at once" },
  { icon: "⊳", text: "Deep research mode for big decisions" },
  { icon: "◑", text: "Your history, always saved" },
];

export default function PaywallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

  async function handleSubscribe() {
    if (!RC_KEYS_SET) {
      await finishOnboarding();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setConfirmVisible(true);
  }

  async function handleConfirmedPurchase() {
    setConfirmVisible(false);
    setPurchasing(true);
    try {
      const { useSubscription } = await import("@/lib/revenuecat");
      const sub = (useSubscription as any)();
      const pkg = sub.offerings?.current?.availablePackages?.[0];
      if (pkg) {
        await sub.purchase(pkg);
      }
    } catch {}
    setPurchasing(false);
    await finishOnboarding();
  }

  async function handleSkip() {
    await finishOnboarding();
  }

  async function handleRestore() {
    if (!RC_KEYS_SET) {
      await finishOnboarding();
      return;
    }
    setRestoring(true);
    try {
      const { useSubscription } = await import("@/lib/revenuecat");
      const sub = (useSubscription as any)();
      await sub.restore();
    } catch {}
    setRestoring(false);
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
          <PriceDisplay colors={colors} />

          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: colors.saber, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleSubscribe}
            disabled={purchasing}
          >
            {purchasing ? (
              <ActivityIndicator color="#04111f" />
            ) : (
              <Text style={styles.ctaText}>Start free trial · $9.99/mo</Text>
            )}
          </Pressable>

          <Pressable onPress={handleSkip} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: colors.faint }]}>
              Continue without subscribing
            </Text>
          </Pressable>

          <Pressable onPress={handleRestore} disabled={restoring}>
            {restoring ? (
              <ActivityIndicator size="small" color={colors.faint} />
            ) : (
              <Text style={[styles.restoreText, { color: colors.faint }]}>Restore purchases</Text>
            )}
          </Pressable>

          <Text style={[styles.legal, { color: colors.faint }]}>
            Cancel anytime. Billed monthly. Charges to your App Store account.
          </Text>
        </View>
      </Animated.View>

      <Modal transparent visible={confirmVisible} animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setConfirmVisible(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.line }]}
            onPress={() => {}}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Confirm purchase
            </Text>
            <Text style={[styles.modalBody, { color: colors.dim }]}>
              Subscribe for $9.99/month? This is a test store transaction.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, { borderColor: colors.line }]}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.dim }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtnPrimary, { backgroundColor: colors.saber }]}
                onPress={handleConfirmedPurchase}
              >
                <Text style={[styles.modalBtnText, { color: "#04111f" }]}>Subscribe</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function PriceDisplay({ colors }: { colors: ReturnType<typeof useColors> }) {
  if (!RC_KEYS_SET) {
    return (
      <View style={styles.priceRow}>
        <Text style={[styles.price, { color: colors.foreground }]}>$9.99</Text>
        <Text style={[styles.pricePer, { color: colors.dim }]}> / month</Text>
      </View>
    );
  }

  return (
    <PriceFromRC colors={colors} />
  );
}

function PriceFromRC({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [price, setPrice] = React.useState<string | null>(null);

  React.useEffect(() => {
    import("@/lib/revenuecat").then(({ useSubscription }) => {
      const sub = (useSubscription as any)();
      const pkg = sub.offerings?.current?.availablePackages?.[0];
      if (pkg?.product?.priceString) {
        setPrice(pkg.product.priceString);
      }
    }).catch(() => {});
  }, []);

  return (
    <View style={styles.priceRow}>
      <Text style={[styles.price, { color: colors.foreground }]}>{price ?? "$9.99"}</Text>
      <Text style={[styles.pricePer, { color: colors.dim }]}> / month</Text>
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
  skipBtn: { paddingVertical: 4 },
  skipText: { fontSize: 14 },
  restoreText: { fontSize: 12 },
  legal: { fontSize: 11, textAlign: "center", lineHeight: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalBody: { fontSize: 14, lineHeight: 20 },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  modalBtnPrimary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  modalBtnText: { fontSize: 15, fontWeight: "600" },
});
