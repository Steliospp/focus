import React, { useEffect, useRef } from "react";
import { View, Animated, Easing } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";

interface BreathingRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
  urgency?: "normal" | "warning" | "critical";
}

const GRADIENT_COLORS: Record<string, { start: string; end: string }> = {
  normal: { start: "#D97706", end: "#F59E0B" },
  warning: { start: "#EF4444", end: "#F59E0B" },
  critical: { start: "#EF4444", end: "#DC2626" },
};

export function BreathingRing({
  progress,
  size = 200,
  strokeWidth = 10,
  children,
  urgency = "normal",
}: BreathingRingProps) {
  const breathScale = useRef(new Animated.Value(1)).current;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const strokeDashoffset = circumference * (1 - progress);
  const colors = GRADIENT_COLORS[urgency];

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(breathScale, {
          toValue: 1.03,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathScale, {
          toValue: 1.0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    anim.start();

    return () => {
      anim.stop();
    };
  }, []);

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View style={{ transform: [{ scale: breathScale }] }}>
        <Svg width={size} height={size}>
          <Defs>
            <SvgGradient id="breathRingGradient" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.start} />
              <Stop offset="1" stopColor={colors.end} />
            </SvgGradient>
          </Defs>

          {/* Background track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(250,248,244,0.08)"
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress arc */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#breathRingGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${center}, ${center}`}
          />
        </Svg>
      </Animated.View>

      {/* Center children */}
      <View
        style={{
          position: "absolute",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </View>
    </View>
  );
}
