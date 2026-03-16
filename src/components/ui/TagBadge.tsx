import React from "react";
import { View, Text } from "react-native";

type TagVariant = "green" | "amber" | "red" | "accent";

interface TagBadgeProps {
  label: string;
  variant?: TagVariant;
}

const variantClasses: Record<TagVariant, { bg: string; text: string }> = {
  green: { bg: "bg-semantic-green/15", text: "text-semantic-green" },
  amber: { bg: "bg-semantic-amber/15", text: "text-semantic-amber" },
  red: { bg: "bg-semantic-red/15", text: "text-semantic-red" },
  accent: { bg: "bg-accent/15", text: "text-accent" },
};

export function TagBadge({ label, variant = "accent" }: TagBadgeProps) {
  const v = variantClasses[variant];
  return (
    <View className={`${v.bg} px-3 py-1 rounded-pill self-start`}>
      <Text className={`${v.text} text-xs font-medium`}>{label}</Text>
    </View>
  );
}
