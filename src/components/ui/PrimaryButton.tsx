import React from "react";
import { TouchableOpacity, Text, ViewStyle } from "react-native";

interface PrimaryButtonProps {
  title: string;
  onPress?: () => void;
  variant?: "accent" | "green" | "surface" | "outline";
  className?: string;
  style?: ViewStyle;
}

const variantClasses: Record<string, { bg: string; text: string }> = {
  accent: { bg: "bg-accent", text: "text-bg-primary" },
  green: { bg: "bg-semantic-green", text: "text-bg-primary" },
  surface: { bg: "bg-bg-elevated", text: "text-text-primary" },
  outline: { bg: "bg-transparent border border-white/10", text: "text-text-primary" },
};

export function PrimaryButton({
  title,
  onPress,
  variant = "accent",
  className,
  style,
}: PrimaryButtonProps) {
  const v = variantClasses[variant];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={`${v.bg} rounded-pill py-4 items-center ${className ?? ""}`}
      style={style}
    >
      <Text className={`${v.text} font-semibold text-base`}>{title}</Text>
    </TouchableOpacity>
  );
}
