import React from "react";
import { View } from "react-native";
import Svg, { Polygon } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  glow?: boolean;
}

// 8-pointed north star: 4 long cardinal points + 4 short diagonal points.
function buildPoints(scale: number): string {
  const cx = 50;
  const cy = 50;
  const longR = 48 * scale;
  const medR = 22 * scale;
  const innerR = 9 * scale;
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i * 22.5 - 90) * (Math.PI / 180);
    let r: number;
    if (i % 2 === 1) r = innerR;
    else r = i % 4 === 0 ? longR : medR;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return pts.join(" ");
}

const OUTER = buildPoints(1);
const INNER = buildPoints(0.5);

export default function LogoStar({ size = 28, color = "#3FA9F5", glow = true }: Props) {
  return (
    <View
      style={
        glow
          ? {
              shadowColor: color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.85,
              shadowRadius: size * 0.4,
            }
          : undefined
      }
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Polygon points={OUTER} fill={color} />
        <Polygon points={INNER} fill="#ffffff" opacity={0.35} />
      </Svg>
    </View>
  );
}
