import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../theme";

interface SoftGradientBgProps {
  children: React.ReactNode;
  className?: string;
}

export function SoftGradientBg({ children, className }: SoftGradientBgProps) {
  return (
    <View className={`flex-1 ${className ?? ""}`} style={styles.wrapper}>
      <LinearGradient
        colors={[
          theme.colors.bg.gradient.top,
          theme.colors.bg.gradient.middle,
          theme.colors.bg.gradient.bottom,
        ]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  content: { flex: 1 },
});
