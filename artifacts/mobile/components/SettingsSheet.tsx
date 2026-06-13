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
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { CHARACTER_IDS, CHARACTERS } from "@/constants/characters";
import { STARTUP_STAGES, type FounderProfile } from "@/lib/profile";
import CharacterAvatar from "./CharacterAvatar";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const mono = Platform.OS === "ios" ? "Courier New" : "monospace";
const serif = Platform.OS === "ios" ? "Georgia" : "serif";

interface Props {
  visible: boolean;
  profile: FounderProfile;
  defaultAdvisorId: string;
  onClose: () => void;
  onSaveProfile: (p: FounderProfile) => void;
  onPickDefaultAdvisor: (id: string) => void;
}

export default function SettingsSheet({
  visible,
  profile,
  defaultAdvisorId,
  onClose,
  onSaveProfile,
  onPickDefaultAdvisor,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [shouldRender, setShouldRender] = useState(false);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [startupName, setStartupName] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [stage, setStage] = useState<string | undefined>(undefined);
  const [advisor, setAdvisor] = useState(defaultAdvisorId);

  useEffect(() => {
    if (visible) {
      setName(profile.name ?? "");
      setRole(profile.role ?? "");
      setStartupName(profile.startupName ?? "");
      setOneLiner(profile.oneLiner ?? "");
      setStage(profile.stage);
      setAdvisor(defaultAdvisorId);
      setShouldRender(true);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 15 }),
        Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 280, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => setShouldRender(false));
    }
  }, [visible]);

  const styles = makeStyles(colors, insets);
  if (!shouldRender) return null;

  function handleSave() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const p: FounderProfile = {
      name: name.trim() || undefined,
      role: role.trim() || undefined,
      startupName: startupName.trim() || undefined,
      oneLiner: oneLiner.trim() || undefined,
      stage,
    };
    onSaveProfile(p);
    onPickDefaultAdvisor(advisor);
    onClose();
  }

  return (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView behavior="padding" style={styles.kav} keyboardVerticalOffset={0}>
          <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
            <View style={styles.grab} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>You &amp; your startup</Text>
              <TouchableOpacity onPress={handleSave} activeOpacity={0.85} style={styles.saveBtn}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sub}>Your advisors read this before every reply.</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              <Labeled label="YOUR NAME" colors={colors}>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="First name" placeholderTextColor={colors.faint} autoCapitalize="words" />
              </Labeled>
              <Labeled label="YOUR ROLE" colors={colors}>
                <TextInput style={styles.input} value={role} onChangeText={setRole} placeholder="Founder & CEO" placeholderTextColor={colors.faint} />
              </Labeled>
              <Labeled label="STARTUP" colors={colors}>
                <TextInput style={styles.input} value={startupName} onChangeText={setStartupName} placeholder="Company name" placeholderTextColor={colors.faint} />
              </Labeled>
              <Labeled label="WHAT YOU'RE BUILDING" colors={colors}>
                <TextInput style={[styles.input, styles.inputMulti]} value={oneLiner} onChangeText={setOneLiner} placeholder="One line a stranger would understand" placeholderTextColor={colors.faint} multiline />
              </Labeled>

              <Text style={styles.fieldLabel}>STAGE</Text>
              <View style={styles.chips}>
                {STARTUP_STAGES.map((s) => {
                  const sel = stage === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => { Haptics.selectionAsync().catch(() => {}); setStage(sel ? undefined : s); }}
                      style={[styles.chip, sel && { backgroundColor: `${colors.saber}22`, borderColor: colors.saber }]}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.chipText, { color: sel ? colors.saber : colors.dim }]}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>DEFAULT ADVISOR</Text>
              <View style={styles.chips}>
                {CHARACTER_IDS.map((id) => {
                  const c = CHARACTERS[id]!;
                  const sel = advisor === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => { Haptics.selectionAsync().catch(() => {}); setAdvisor(id); }}
                      style={[styles.advisorChip, { borderColor: sel ? c.color : colors.line, backgroundColor: sel ? `${c.color}18` : "transparent" }]}
                      activeOpacity={0.85}
                    >
                      <CharacterAvatar initials={c.initials} color={c.color} size={22} />
                      <Text style={[styles.advisorName, { color: sel ? c.color : colors.dim }]}>{c.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Labeled({
  label,
  colors,
  children,
}: {
  label: string;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: colors.faint, fontSize: 9.5, letterSpacing: 1.4, fontFamily: mono, marginBottom: 7 }}>
        {label}
      </Text>
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12 }}>
        {children}
      </View>
    </View>
  );
}

function makeStyles(
  colors: ReturnType<typeof useColors>,
  insets: { top: number; bottom: number }
) {
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  return StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(5,8,13,0.74)" },
    kav: { flex: 1, justifyContent: "flex-end" },
    sheet: {
      maxHeight: SCREEN_HEIGHT * 0.9,
      backgroundColor: colors.background2,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderTopWidth: 1,
      borderTopColor: "rgba(63,169,245,0.2)",
      paddingHorizontal: 22,
      paddingBottom: Math.max(bottomPad, 14),
    },
    grab: { width: 38, height: 4, backgroundColor: colors.faint, borderRadius: 3, alignSelf: "center", marginTop: 10, marginBottom: 8, opacity: 0.5 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
    title: { color: colors.foreground, fontSize: 22, fontFamily: serif },
    saveBtn: { backgroundColor: colors.saber, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 9 },
    saveText: { color: "#04111f", fontSize: 14, fontWeight: "700" },
    sub: { color: colors.dim, fontSize: 12.5, marginTop: 4, marginBottom: 16, fontStyle: "italic", fontFamily: serif },
    input: { color: colors.foreground, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
    inputMulti: { minHeight: 58, textAlignVertical: "top" },
    fieldLabel: { color: colors.faint, fontSize: 9.5, letterSpacing: 1.4, fontFamily: mono, marginBottom: 9, marginTop: 4 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
    chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 11, paddingVertical: 8, paddingHorizontal: 13, backgroundColor: colors.card },
    chipText: { fontSize: 12.5, fontWeight: "600" },
    advisorChip: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 11 },
    advisorName: { fontSize: 13, fontWeight: "600" },
  });
}
