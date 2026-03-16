import React from "react";
import { View, StyleSheet } from "react-native";
import { theme } from "../../theme";

interface SoftGradientBgProps {
  children: React.ReactNode;
  className?: string;
}

export function SoftGradientBg({ children, className }: SoftGradientBgProps) {
  return (
    <View className={`flex-1 ${className ?? ""}`} style={styles.wrapper}>
      <View style={[styles.gradient, { backgroundColor: "#0a0908" }]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  gradient: StyleSheet.absoluteFillObject,
  content: { flex: 1 },
});
