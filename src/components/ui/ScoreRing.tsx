import React, { useEffect, useState, useRef } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";
import { theme } from "../../theme";

interface ScoreRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

export function ScoreRing({
  percentage,
  size = 120,
  strokeWidth = 10,
  children,
}: ScoreRingProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  useEffect(() => {
    const target = Math.min(100, Math.max(0, percentage));
    const duration = 1000;
    const startTime = Date.now();
    const startValue = animatedValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (target - startValue) * eased;

      setAnimatedValue(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [percentage]);

  const strokeDashoffset =
    circumference - (animatedValue / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#D97706" />
            <Stop offset="1" stopColor="#F59E0B" />
          </SvgGradient>
        </Defs>

        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress arc */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>

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
