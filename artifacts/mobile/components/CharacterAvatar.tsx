import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  initials: string;
  color: string;
  size?: number;
}

export default function CharacterAvatar({ initials, color, size = 40 }: Props) {
  const fontSize = Math.round(size * 0.3);
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <Text style={[styles.text, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", justifyContent: "center" },
  text: { color: "#fff", fontWeight: "700", letterSpacing: 0.3 },
});
