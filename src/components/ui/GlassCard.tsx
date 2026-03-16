import React from "react";
import { View, ViewStyle, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { theme } from "../../theme";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  intensity?: number;
  /** Softer look: no blur, just subtle fill (reference-style cards) */
  soft?: boolean;
}

export function GlassCard({
  children,
  className,
  style,
  intensity = theme.blur.intensity,
  soft = false,
}: GlassCardProps) {
  if (soft) {
    return (
      <View
        className={`overflow-hidden rounded-card-lg bg-white/[0.06] border border-white/[0.06] ${className ?? ""}`}
        style={style}
      >
        {children}
      </View>
    );
  }
  return (
    <View
      className={`overflow-hidden rounded-card-lg ${className ?? ""}`}
      style={[styles.container, style]}
    >
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.overlay} />
      <View className="relative z-10">{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.glass.fill,
  },
});
