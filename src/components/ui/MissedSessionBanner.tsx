import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";

interface MissedSessionBannerProps {
  missedCount: number;
  taskName: string;
  onPress: () => void;
  onDismiss: () => void;
}

export function MissedSessionBanner({
  missedCount,
  taskName,
  onPress,
  onDismiss,
}: MissedSessionBannerProps) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <View
        style={{
          backgroundColor: "rgba(220,60,60,0.1)",
          borderWidth: 1,
          borderColor: "rgba(220,60,60,0.2)",
          borderRadius: theme.radius.md,
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <Text style={{ fontSize: 18, marginRight: 10 }}>⚠️</Text>
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: "500",
            color: theme.colors.semantic.red,
          }}
        >
          You missed {missedCount} session{missedCount !== 1 ? "s" : ""} for{" "}
          {taskName}. Tap to reschedule.
        </Text>
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          <Ionicons
            name="close"
            size={18}
            color={theme.colors.semantic.red}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
