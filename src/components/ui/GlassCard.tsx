import React from "react";
import { View, ViewStyle } from "react-native";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  dark?: boolean;
  soft?: boolean;
}

export function GlassCard({ children, className, style }: GlassCardProps) {
  return (
    <View className={className ?? ""} style={style}>
      {children}
    </View>
  );
}
