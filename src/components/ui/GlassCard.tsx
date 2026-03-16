import React from "react";
import { View, ViewStyle, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { theme } from "../../theme";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  intensity?: number;
}

export function GlassCard({
  children,
  className,
  style,
  intensity = theme.blur.intensity,
}: GlassCardProps) {
  return (
    <View
      className={`overflow-hidden rounded-card ${className ?? ""}`}
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
