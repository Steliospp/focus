import React from "react";
import { View, Text } from "react-native";
import { GlassCard } from "./GlassCard";
import { theme } from "../../theme";
import type { AIAnalysis } from "../../store/useAppStore";

interface AIAnalysisBoxProps {
  analysis: AIAnalysis;
}

const difficultyColor: Record<string, string> = {
  easy: theme.colors.semantic.green,
  medium: theme.colors.semantic.amber,
  hard: theme.colors.semantic.red,
};

export function AIAnalysisBox({ analysis }: AIAnalysisBoxProps) {
  const diffColor =
    difficultyColor[analysis.estimatedDifficulty] ?? theme.colors.text.secondary;

  return (
    <GlassCard dark style={{ padding: 16 }}>
      {/* Header */}
      <View className="flex-row items-center mb-3">
        <Text style={{ fontSize: 18, marginRight: 6 }}>{"\u{1F9E0}"}</Text>
        <Text
          className="font-semibold text-[15px] flex-1"
          style={{ color: "rgba(255,255,255,0.9)" }}
        >
          AI Analysis {"\u2014"} How this will be graded
        </Text>
      </View>

      {/* Grading criteria */}
      {analysis.gradingCriteria.map((criterion, i) => (
        <View key={i} className="flex-row items-start mb-2">
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: theme.colors.accent,
              marginTop: 5,
              marginRight: 10,
            }}
          />
          <Text
            className="flex-1 text-[14px] leading-5"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            {criterion}
          </Text>
        </View>
      ))}

      {/* What good looks like */}
      {analysis.whatGoodLooksLike ? (
        <Text
          className="text-[13px] mt-2 leading-5"
          style={{
            color: "rgba(255,255,255,0.7)",
            fontStyle: "italic",
          }}
        >
          {analysis.whatGoodLooksLike}
        </Text>
      ) : null}

      {/* Difficulty badge */}
      <View className="flex-row mt-3">
        <View
          style={{
            backgroundColor: diffColor,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 3,
          }}
        >
          <Text className="text-xs font-semibold text-white">
            {analysis.estimatedDifficulty.charAt(0).toUpperCase() +
              analysis.estimatedDifficulty.slice(1)}
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}
