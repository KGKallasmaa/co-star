import React, { useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";
import {
  CHARACTERS,
  CHARACTER_IDS,
  BOARD_MEMBER_IDS,
  ADVISOR_GREETINGS,
  QUICK_PROMPTS,
  getTimeGreeting,
} from "@/constants/characters";
import CharacterAvatar from "@/components/CharacterAvatar";
import LogoStar from "@/components/LogoStar";

// ─── Fade + slide entrance ────────────────────────────────────────────────────

function FadeSlideIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 320, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
      {children}
    </Animated.View>
  );
}

function StarField() {
  const stars = useMemo(
    () =>
      Array.from({ length: 46 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.6 + 0.5,
        opacity: Math.random() * 0.5 + 0.12,
      })),
    []
  );
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {stars.map((star, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            borderRadius: star.size / 2,
            backgroundColor: "#ffffff",
            opacity: star.opacity,
          }}
        />
      ))}
    </View>
  );
}

type HomeMode = "auto" | "single" | "council";

interface HomeScreenProps {
  userName: string | null;
  selectedCharId: string;
  isBoardMode: boolean;
  onSelectAuto: () => void;
  onSelectAdvisor: (id: string) => void;
  onSelectCouncil: () => void;
  onSendPrompt: (text: string) => void;
  onGreatness: () => void;
}

export default function HomeScreen({
  userName,
  selectedCharId,
  isBoardMode,
  onSelectAuto,
  onSelectAdvisor,
  onSelectCouncil,
  onSendPrompt,
  onGreatness,
}: HomeScreenProps) {
  const colors = useColors();
  const presenceFade = useRef(new Animated.Value(1)).current;

  const mode: HomeMode = isBoardMode ? "council" : selectedCharId === "auto" ? "auto" : "single";
  const singleAdvisor = mode === "single" ? CHARACTERS[selectedCharId] ?? CHARACTERS["paul"]! : null;
  const accent = singleAdvisor ? singleAdvisor.color : colors.saber;
  const greeting = getTimeGreeting(userName);
  const councilMembers = BOARD_MEMBER_IDS.map((id) => CHARACTERS[id]!).filter(Boolean);

  // crossfade presence when mode / advisor changes
  useEffect(() => {
    presenceFade.setValue(0);
    Animated.timing(presenceFade, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [mode, selectedCharId]);

  const tap = (fn: () => void) => () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    fn();
  };

  const modes = [
    { key: "auto" as const, label: "Auto", onPress: onSelectAuto },
    { key: "single" as const, label: "One advisor", onPress: () => onSelectAdvisor(singleAdvisor?.id ?? "paul") },
    { key: "council" as const, label: "The Council", onPress: onSelectCouncil },
  ];

  return (
    <View style={{ flex: 1 }}>
      <StarField />
      <LinearGradient
        colors={[`${colors.saber}14`, "transparent"]}
        style={s.topGlow}
        pointerEvents="none"
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      {/* Greeting */}
      <FadeSlideIn delay={0}>
        <Text style={[s.kicker, { color: colors.faint }]}>{greeting.toUpperCase()}</Text>
        <Text style={[s.title, { color: colors.foreground }]}>
          Who do you want{"\n"}in the room?
        </Text>
      </FadeSlideIn>

      {/* Mode selector */}
      <FadeSlideIn delay={70}>
        <View style={[s.segment, { backgroundColor: colors.background2, borderColor: colors.line }]}>
          {modes.map((opt) => {
            const active = mode === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[s.segmentBtn, active && { backgroundColor: `${accent}22`, borderColor: `${accent}70` }]}
                onPress={tap(opt.onPress)}
                activeOpacity={0.85}
              >
                <Text style={[s.segmentText, { color: active ? accent : colors.dim }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </FadeSlideIn>

      {/* Advisor picker — single mode only */}
      {mode === "single" && (
        <FadeSlideIn delay={20}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.advisorScroll}
          >
            {CHARACTER_IDS.map((id) => {
              const char = CHARACTERS[id]!;
              const sel = id === selectedCharId;
              return (
                <TouchableOpacity
                  key={id}
                  style={[
                    s.advisorPick,
                    {
                      borderColor: sel ? char.color : colors.line,
                      backgroundColor: sel ? `${char.color}16` : "transparent",
                    },
                  ]}
                  onPress={tap(() => onSelectAdvisor(id))}
                  activeOpacity={0.85}
                >
                  <CharacterAvatar initials={char.initials} color={char.color} size={26} />
                  <View>
                    <Text style={[s.advisorPickName, { color: sel ? char.color : colors.foreground }]}>
                      {char.name}
                    </Text>
                    <Text style={[s.advisorPickRole, { color: colors.faint }]} numberOfLines={1}>
                      {char.role}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </FadeSlideIn>
      )}

      {/* Presence */}
      <Animated.View style={{ opacity: presenceFade }}>
        <View style={s.presence}>
          {mode === "auto" && (
            <>
              <View style={[s.glow, { shadowColor: colors.saber }]}>
                <LogoStar size={64} color={colors.saber} />
              </View>
              <Text style={[s.presenceLine, { color: colors.foreground }]}>
                Tell me what's going on. I'll bring in whoever you need.
              </Text>
              <Text style={[s.presenceWho, { color: colors.saber }]}>AUTO · THE RIGHT VOICE</Text>
            </>
          )}

          {mode === "single" && singleAdvisor && (
            <>
              <View style={[s.glow, { shadowColor: accent }]}>
                <CharacterAvatar initials={singleAdvisor.initials} color={accent} size={64} />
              </View>
              <Text style={[s.presenceLine, { color: colors.foreground }]}>
                "{ADVISOR_GREETINGS[singleAdvisor.id] ?? ADVISOR_GREETINGS["paul"]}"
              </Text>
              <Text style={[s.presenceWho, { color: accent }]}>
                {singleAdvisor.name.toUpperCase()} · {singleAdvisor.role.toUpperCase()}
              </Text>
            </>
          )}

          {mode === "council" && (
            <>
              <View style={s.councilRow}>
                {councilMembers.map((char, i) => (
                  <View
                    key={char.id}
                    style={[
                      s.councilAvatar,
                      { borderColor: colors.background },
                      i > 0 && { marginLeft: -14 },
                    ]}
                  >
                    <CharacterAvatar initials={char.initials} color={char.color} size={52} />
                  </View>
                ))}
              </View>
              <Text style={[s.presenceLine, { color: colors.foreground }]}>
                Three voices who won't always agree. Put something on the table.
              </Text>
              <Text style={[s.presenceWho, { color: colors.saber }]}>
                THE COUNCIL · {councilMembers.map((c) => c.name).join(" · ").toUpperCase()}
              </Text>
            </>
          )}
        </View>
      </Animated.View>

      {/* In pursuit of greatness */}
      <TouchableOpacity
        style={[s.greatness, { borderColor: `${accent}40`, backgroundColor: `${accent}0A` }]}
        onPress={tap(onGreatness)}
        activeOpacity={0.85}
      >
        <Text style={[s.greatnessText, { color: colors.foreground }]}>In pursuit of greatness</Text>
        <Feather name="arrow-up-right" size={16} color={accent} />
      </TouchableOpacity>

      {/* Example prompts */}
      <Text style={[s.sectionLabel, { color: colors.faint }]}>OR START WITH SOMETHING REAL</Text>
      <View style={s.examples}>
        {QUICK_PROMPTS.map((p) => (
          <TouchableOpacity
            key={p.label}
            style={[s.exampleCard, { backgroundColor: colors.card, borderColor: colors.line }]}
            onPress={tap(() => onSendPrompt(p.text))}
            activeOpacity={0.85}
          >
            <Text style={[s.exampleText, { color: colors.foreground }]} numberOfLines={3}>
              {p.text}
            </Text>
            <Feather name="arrow-right" size={14} color={colors.faint} />
          </TouchableOpacity>
        ))}
      </View>
      </ScrollView>
    </View>
  );
}

const mono = Platform.OS === "ios" ? "Courier New" : "monospace";
const serif = Platform.OS === "ios" ? "Georgia" : "serif";

const s = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 120,
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  kicker: {
    fontSize: 11,
    fontFamily: mono,
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: serif,
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  // ── Segment ────────────────────────────────────────────────
  segment: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
    gap: 4,
    marginBottom: 18,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    fontSize: 12.5,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  // ── Advisor picker ─────────────────────────────────────────
  advisorScroll: {
    gap: 8,
    paddingBottom: 4,
    paddingRight: 8,
  },
  advisorPick: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  advisorPickName: { fontSize: 13.5, fontWeight: "600" },
  advisorPickRole: { fontSize: 10.5, marginTop: 1 },
  // ── Presence ───────────────────────────────────────────────
  presence: {
    alignItems: "center",
    gap: 14,
    marginTop: 26,
    marginBottom: 28,
  },
  glow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 26,
  },
  councilRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  councilAvatar: {
    borderWidth: 2,
    borderRadius: 28,
  },
  presenceLine: {
    fontSize: 21,
    lineHeight: 30,
    fontFamily: serif,
    fontStyle: "italic",
    textAlign: "center",
    letterSpacing: -0.3,
    maxWidth: 320,
  },
  presenceWho: {
    fontSize: 10.5,
    fontFamily: mono,
    letterSpacing: 1,
  },
  // ── Greatness ──────────────────────────────────────────────
  greatness: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 17,
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  greatnessText: {
    fontSize: 17,
    fontFamily: serif,
    fontStyle: "italic",
    letterSpacing: -0.2,
  },
  // ── Examples ───────────────────────────────────────────────
  sectionLabel: {
    fontSize: 10,
    fontFamily: mono,
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  examples: {
    gap: 10,
  },
  exampleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  exampleText: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 20,
    fontFamily: serif,
  },
});
