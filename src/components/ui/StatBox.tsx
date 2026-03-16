import React from "react";
import { View, Text } from "react-native";
import { GlassCard } from "./GlassCard";

interface StatBoxProps {
  value: string;
  label: string;
  color?: "accent" | "green" | "amber" | "red";
}

const colorMap: Record<string, string> = {
  accent: "text-accent",
  green: "text-semantic-green",
  amber: "text-semantic-amber",
  red: "text-semantic-red",
};

export function StatBox({ value, label, color = "accent" }: StatBoxProps) {
  return (
    <GlassCard className="flex-1 p-4 items-center">
      <Text className={`text-2xl font-bold ${colorMap[color]}`}>{value}</Text>
      <Text className="text-text-muted text-xs mt-1">{label}</Text>
    </GlassCard>
  );
}
