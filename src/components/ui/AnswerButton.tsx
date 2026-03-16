import React from "react";
import { TouchableOpacity, Text } from "react-native";

interface AnswerButtonProps {
  text: string;
  selected?: boolean;
  onPress?: () => void;
}

export function AnswerButton({ text, selected = false, onPress }: AnswerButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`p-4 rounded-card border ${
        selected
          ? "border-accent bg-accent/10"
          : "border-white/8 bg-bg-elevated"
      }`}
    >
      <Text
        className={`text-sm font-medium ${
          selected ? "text-accent" : "text-text-primary"
        }`}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
}
