import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { GlassCard } from "./GlassCard";
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
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <GlassCard className="p-4">
        <View className="flex-row items-center">
          <Text className="text-2xl mr-3">{emoji}</Text>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-text-primary text-base font-medium flex-shrink" numberOfLines={1}>
                {title}
              </Text>
              {badge && <TagBadge label={badge.label} variant={badge.variant} />}
            </View>
            {subtitle && (
              <Text className="text-text-muted text-sm mt-0.5">{subtitle}</Text>
            )}
          </View>
          {time && (
            <Text className="text-text-secondary text-sm ml-2">{time}</Text>
          )}
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}
