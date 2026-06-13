import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  Pressable,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";

const { width, height } = Dimensions.get("window");

const STARS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 0.5,
  delay: Math.random() * 3000,
}));

function StarField() {
  const anims = useRef(STARS.map(() => new Animated.Value(0.2))).current;

  useEffect(() => {
    const loops = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(STARS[i]!.delay),
          Animated.timing(anim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.2, duration: 1500, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {STARS.map((star, i) => (
        <Animated.View
          key={star.id}
          style={{
            position: "absolute",
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            borderRadius: star.size / 2,
            backgroundColor: "#ffffff",
            opacity: anims[i],
          }}
        />
      ))}
    </View>
  );
}

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 900, delay: 300, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 900, delay: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  function handleContinue() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push("/(onboarding)/pick-advisor");
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StarField />
      <LinearGradient
        colors={["transparent", colors.background]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      <Animated.View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 32,
            opacity: fadeIn,
            transform: [{ translateY: slideUp }],
          },
        ]}
      >
        <View style={styles.top}>
          <Text style={[styles.star, { color: colors.saber }]}>✦</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Co-Star{"\n"}for Founders
          </Text>
          <Text style={[styles.subtitle, { color: colors.dim }]}>
            The loneliest part of building is having no one to talk to who actually gets it.
          </Text>
          <Text style={[styles.subtitle2, { color: colors.faint }]}>
            Six advisors. Real AI. Always honest.
          </Text>
        </View>

        <View style={styles.advisorRow}>
          {["PG", "GT", "MA", "SA", "VC", "EL"].map((initials, i) => (
            <View
              key={initials}
              style={[
                styles.advisorDot,
                {
                  backgroundColor: ADVISOR_COLORS[i],
                  opacity: 0.9,
                },
              ]}
            >
              <Text style={styles.advisorInitials}>{initials}</Text>
            </View>
          ))}
        </View>

        <View style={styles.bottom}>
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: colors.saber, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleContinue}
          >
            <Text style={styles.ctaText}>Meet your advisors</Text>
          </Pressable>

          <Pressable
            onPress={async () => {
              await AsyncStorage.setItem("costar_onboarded", "true").catch(() => {});
              router.replace("/(tabs)/");
            }}
            hitSlop={12}
          >
            <Text style={[styles.skipText, { color: colors.faint }]}>
              Skip onboarding →
            </Text>
          </Pressable>

          <Text style={[styles.legal, { color: colors.faint }]}>
            Not a substitute for actual advice. Just better than spiraling alone.
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const ADVISOR_COLORS = ["#5B7A8C", "#3E8C7A", "#3FA9F5", "#7E8CA8", "#5566A8", "#6B7280"];

const styles = StyleSheet.create({
  container: { flex: 1 },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  top: { alignItems: "center", gap: 16 },
  star: {
    fontSize: 48,
    marginBottom: 4,
  },
  title: {
    fontSize: 42,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -1,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    lineHeight: 50,
  },
  subtitle: {
    fontSize: 17,
    textAlign: "center",
    lineHeight: 26,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontStyle: "italic",
    marginTop: 4,
  },
  subtitle2: {
    fontSize: 13,
    textAlign: "center",
    letterSpacing: 0.5,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    marginTop: 4,
  },
  advisorRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginVertical: 20,
  },
  advisorDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  advisorInitials: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  bottom: { gap: 14, alignItems: "center" },
  skipText: {
    fontSize: 12,
    letterSpacing: 0.3,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
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
    letterSpacing: 0.2,
  },
  legal: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    fontStyle: "italic",
  },
});
