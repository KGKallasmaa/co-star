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
  getTimeGreeting,
} from "@/constants/characters";
import { DEMO_SCRIPTS } from "@/constants/demo";
import { type FounderProfile, hasStartupContext } from "@/lib/profile";
import CharacterAvatar from "@/components/CharacterAvatar";
import LogoStar from "@/components/LogoStar";

type Mode = { kind: "auto" } | { kind: "single"; id: string } | { kind: "council" };

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

interface HomeScreenProps {
  profile: FounderProfile;
  mode: Mode;
  defaultAdvisorId: string;
  onSelectAuto: () => void;
  onSelectSingle: () => void;
  onSelectAdvisor: (id: string) => void;
  onSelectCouncil: () => void;
  onSendPrompt: (text: string) => void;
  onGreatness: () => void;
}

export default function HomeScreen({
  profile,
  mode,
  defaultAdvisorId,
  onSelectAuto,
  onSelectSingle,
  onSelectAdvisor,
  onSelectCouncil,
  onSendPrompt,
  onGreatness,
}: HomeScreenProps) {
  const colors = useColors();
  const presenceFade = useRef(new Animated.Value(1)).current;

  const modeKind = mode.kind;
  const activeAdvisorId = mode.kind === "single" ? mode.id : defaultAdvisorId;
  const singleAdvisor = CHARACTERS[activeAdvisorId] ?? CHARACTERS["paul"]!;
  const accent = modeKind === "single" ? singleAdvisor.color : colors.saber;
  const greeting = getTimeGreeting(profile.name);
  const hasCo = hasStartupContext(profile);
  const councilMembers = BOARD_MEMBER_IDS.map((id) => CHARACTERS[id]!).filter(Boolean);

  // crossfade presence when mode / advisor changes
  useEffect(() => {
    presenceFade.setValue(0);
    Animated.timing(presenceFade, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [modeKind, activeAdvisorId]);

  const tap = (fn: () => void) => () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    fn();
  };

  const modes = [
    { key: "auto" as const, label: "CoStar", onPress: onSelectAuto },
    { key: "single" as const, label: "One advisor", onPress: onSelectSingle },
    { key: "council" as const, label: "The Council", onPress: onSelectCouncil },
  ];

  const title =
    modeKind === "council"
      ? "Put it to the room."
      : modeKind === "single"
        ? `${singleAdvisor.name} is in the room.`
        : hasCo
          ? `What's going on\nwith ${profile.startupName ?? "your startup"}?`
          : "What can't you say\nout loud right now?";

  const featured = DEMO_SCRIPTS[0];
  const rest = DEMO_SCRIPTS.slice(1);

  return (
    <View style={{ flex: 1 }}>
      <StarField />
      <LinearGradient
        colors={[`${accent}1A`, "transparent"]}
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
          <Text style={[s.title, { color: colors.foreground }]}>{title}</Text>
        </FadeSlideIn>

        {/* Mode selector */}
        <FadeSlideIn delay={70}>
          <View style={[s.segment, { backgroundColor: colors.background2, borderColor: colors.line }]}>
            {modes.map((opt) => {
              const active = modeKind === opt.key;
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
        {modeKind === "single" && (
          <FadeSlideIn delay={20}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.advisorScroll}
            >
              {CHARACTER_IDS.map((id) => {
                const char = CHARACTERS[id]!;
                const sel = id === activeAdvisorId;
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
            {modeKind === "auto" && (
              <>
                <View style={[s.glow, { shadowColor: colors.saber }]}>
                  <LogoStar size={64} color={colors.saber} />
                </View>
                <Text style={[s.presenceLine, { color: colors.foreground }]}>
                  {hasCo
                    ? `The co-founder you can finally be honest with — and who actually knows ${profile.startupName}.`
                    : "The co-founder you can finally be honest with. Tell me the thing you can't tell anyone else."}
                </Text>
                <Text style={[s.presenceWho, { color: colors.saber }]}>COSTAR · THERAPIST + CO-FOUNDER</Text>
              </>
            )}

            {modeKind === "single" && (
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

            {modeKind === "council" && (
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
                  The most qualified voices for your question — in the room, and they won't always agree.
                </Text>
                <Text style={[s.presenceWho, { color: colors.saber }]}>
                  THE COUNCIL · ROUTED TO YOUR QUESTION
                </Text>
              </>
            )}
          </View>
        </Animated.View>

        {/* Featured — the demo hero */}
        {featured && (
          <FadeSlideIn delay={40}>
            <TouchableOpacity
              style={[s.featured, { borderColor: `${accent}55`, backgroundColor: `${accent}0E` }]}
              onPress={tap(() => onSendPrompt(featured.prompt))}
              activeOpacity={0.9}
            >
              <Text style={[s.featuredKicker, { color: accent }]}>{featured.hint.toUpperCase()}</Text>
              <Text style={[s.featuredText, { color: colors.foreground }]}>"{featured.prompt}"</Text>
              <View style={s.featuredFoot}>
                <Text style={[s.featuredCta, { color: accent }]}>Tell CoStar</Text>
                <Feather name="arrow-up-right" size={15} color={accent} />
              </View>
            </TouchableOpacity>
          </FadeSlideIn>
        )}

        {/* More real moments */}
        <Text style={[s.sectionLabel, { color: colors.faint }]}>OR START WITH SOMETHING REAL</Text>
        <View style={s.examples}>
          {rest.map((d) => (
            <TouchableOpacity
              key={d.id}
              style={[s.exampleCard, { backgroundColor: colors.card, borderColor: colors.line }]}
              onPress={tap(() => onSendPrompt(d.prompt))}
              activeOpacity={0.85}
            >
              <Text style={[s.exampleText, { color: colors.foreground }]} numberOfLines={3}>
                {d.prompt}
              </Text>
              <Feather name="arrow-right" size={14} color={colors.faint} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[s.greatness, { borderColor: `${accent}40`, backgroundColor: `${accent}0A` }]}
            onPress={tap(onGreatness)}
            activeOpacity={0.85}
          >
            <Text style={[s.greatnessText, { color: colors.foreground }]}>In pursuit of greatness</Text>
            <Feather name="arrow-up-right" size={16} color={accent} />
          </TouchableOpacity>
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
  topGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 280 },
  kicker: { fontSize: 11, fontFamily: mono, letterSpacing: 1.6, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontFamily: serif, letterSpacing: -0.5, marginBottom: 24 },
  // Segment
  segment: { flexDirection: "row", borderWidth: 1, borderRadius: 14, padding: 4, gap: 4, marginBottom: 18 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: { fontSize: 12.5, fontWeight: "600", letterSpacing: 0.2 },
  // Advisor picker
  advisorScroll: { gap: 8, paddingBottom: 4, paddingRight: 8 },
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
  // Presence
  presence: { alignItems: "center", gap: 14, marginTop: 22, marginBottom: 26 },
  glow: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 26 },
  councilRow: { flexDirection: "row", alignItems: "center" },
  councilAvatar: { borderWidth: 2, borderRadius: 28 },
  presenceLine: {
    fontSize: 21,
    lineHeight: 30,
    fontFamily: serif,
    fontStyle: "italic",
    textAlign: "center",
    letterSpacing: -0.3,
    maxWidth: 330,
  },
  presenceWho: { fontSize: 10.5, fontFamily: mono, letterSpacing: 1 },
  // Featured
  featured: { borderWidth: 1, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 18, marginBottom: 26, gap: 10 },
  featuredKicker: { fontSize: 9.5, fontFamily: mono, letterSpacing: 1.2 },
  featuredText: { fontSize: 18, lineHeight: 26, fontFamily: serif, fontStyle: "italic", letterSpacing: -0.2 },
  featuredFoot: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  featuredCta: { fontSize: 13, fontWeight: "700" },
  // Examples
  sectionLabel: { fontSize: 10, fontFamily: mono, letterSpacing: 1.4, marginBottom: 12 },
  examples: { gap: 10 },
  exampleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  exampleText: { flex: 1, fontSize: 14.5, lineHeight: 20, fontFamily: serif },
  greatness: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 17,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  greatnessText: { fontSize: 17, fontFamily: serif, fontStyle: "italic", letterSpacing: -0.2 },
});
