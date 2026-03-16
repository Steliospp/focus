import React from "react";
import { View } from "react-native";

interface ProgressBarProps {
  fillPercent: number;
  color?: "accent" | "green" | "amber" | "red";
  className?: string;
}

const colorMap: Record<string, string> = {
  accent: "bg-accent",
  green: "bg-semantic-green",
  amber: "bg-semantic-amber",
  red: "bg-semantic-red",
};

export function ProgressBar({
  fillPercent,
  color = "accent",
  className,
}: ProgressBarProps) {
  return (
    <View className={`h-2 rounded-full bg-white/10 overflow-hidden ${className ?? ""}`}>
      <View
        className={`h-full rounded-full ${colorMap[color]}`}
        style={{ width: `${Math.min(100, Math.max(0, fillPercent))}%` }}
      />
    </View>
  );
}
