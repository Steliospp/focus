import React from "react";
import { View } from "react-native";

interface StreakDotsProps {
  filledUpTo: number;
  total?: number;
}

export function StreakDots({ filledUpTo, total = 7 }: StreakDotsProps) {
  return (
    <View className="flex-row items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={`w-3 h-3 rounded-full ${
            i < filledUpTo ? "bg-accent" : "bg-white/10"
          }`}
        />
      ))}
    </View>
  );
}
