import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "./GlassCard";

interface PhaseRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  sessions: string;
  color: string;
  status: "done" | "active" | "pending";
}

export function PhaseRow({ icon, name, sessions, color, status }: PhaseRowProps) {
  return (
    <GlassCard className="p-4">
      <View className="flex-row items-center">
        <View
          className="w-1 h-10 rounded-full mr-3"
          style={{ backgroundColor: color }}
        />
        <Ionicons name={icon} size={20} color={color} />
        <View className="flex-1 ml-3">
          <Text className="text-text-primary text-sm font-medium">{name}</Text>
          <Text className="text-text-muted text-xs">{sessions}</Text>
        </View>
        {status === "done" && (
          <Ionicons name="checkmark-circle" size={20} color="#4ADE80" />
        )}
        {status === "active" && (
          <View className="w-2 h-2 rounded-full bg-accent" />
        )}
        {status === "pending" && (
          <View className="w-2 h-2 rounded-full bg-white/20" />
        )}
      </View>
    </GlassCard>
  );
}
