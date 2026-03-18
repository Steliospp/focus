import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { GlassCard } from "./GlassCard";
import { theme } from "../../theme";

interface DeadlineCardProps {
  taskName: string;
  daysUntil: number;
  urgency: "red" | "amber" | "green";
  sessionsCompleted: number;
  totalSessions: number;
  onPress: () => void;
}

const urgencyColors: Record<"red" | "amber" | "green", string> = {
  red: theme.colors.semantic.red,
  amber: theme.colors.semantic.amber,
  green: theme.colors.semantic.green,
};

export function DeadlineCard({
  taskName,
  daysUntil,
  urgency,
  sessionsCompleted,
  totalSessions,
  onPress,
}: DeadlineCardProps) {
  const color = urgencyColors[urgency];
  const progress = totalSessions > 0 ? sessionsCompleted / totalSessions : 0;

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <GlassCard soft className="p-4 mb-3">
        {/* Header row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: theme.colors.text.primary,
              flex: 1,
              marginRight: 8,
            }}
            numberOfLines={1}
          >
            {taskName}
          </Text>

          {/* Urgency badge */}
          <View
            style={{
              backgroundColor: color + "1A",
              borderRadius: theme.radius.lg,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "600", color }}>
              {daysUntil} day{daysUntil !== 1 ? "s" : ""} left
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: "rgba(0,0,0,0.06)",
            marginBottom: 6,
          }}
        >
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: color,
              width: `${Math.min(progress * 100, 100)}%`,
            }}
          />
        </View>

        {/* Session count */}
        <Text
          style={{
            fontSize: 12,
            color: theme.colors.text.secondary,
          }}
        >
          {sessionsCompleted} of {totalSessions} sessions done
        </Text>
      </GlassCard>
    </TouchableOpacity>
  );
}
