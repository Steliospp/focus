import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { TagBadge } from "./TagBadge";

interface SessionCardProps {
  emoji: string;
  title: string;
  subtitle?: string;
  badge?: { label: string; variant?: "green" | "amber" | "red" | "accent" };
  time?: string;
  onPress?: () => void;
}

export function SessionCard({
  emoji,
  title,
  subtitle,
  badge,
  time,
  onPress,
}: SessionCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="rounded-card-lg overflow-hidden bg-white/[0.06] border border-white/[0.06]"
    >
      <View className="p-4 flex-row items-center">
        <View className="w-11 h-11 rounded-2xl bg-white/10 items-center justify-center mr-4">
          <Text className="text-xl">{emoji}</Text>
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text
              className="text-text-primary text-base font-medium flex-shrink"
              numberOfLines={1}
            >
              {title}
            </Text>
            {badge && <TagBadge label={badge.label} variant={badge.variant} />}
          </View>
          {subtitle && (
            <Text className="text-text-muted text-sm mt-0.5" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        {time && (
          <Text className="text-text-secondary text-sm font-medium ml-3">
            {time}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
