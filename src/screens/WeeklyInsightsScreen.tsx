import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard } from "../components/ui/GlassCard";
import { StatBox } from "../components/ui/StatBox";

const INSIGHTS = [
  { color: "#4ADE80", text: "You focused 40% more on Tuesdays — consider scheduling hard tasks then." },
  { color: "#60A5FA", text: "Your average session length increased from 18m to 23m this week." },
  { color: "#FBBF24", text: "2 sessions ended early on Wednesday — you mentioned feeling tired." },
  { color: "#F87171", text: "Verification rate dropped to 60% — try the before/after photo method." },
];

export function WeeklyInsightsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <View className="mt-2 mb-6">
          <Text className="text-text-primary text-2xl font-bold">This week</Text>
          <Text className="text-text-muted text-sm">Mar 10 — Mar 16</Text>
        </View>

        {/* 2x2 stat grid */}
        <View className="gap-3 mb-6">
          <View className="flex-row gap-3">
            <StatBox value="3h 20m" label="Focus time" color="accent" />
            <StatBox value="8" label="Sessions" color="green" />
          </View>
          <View className="flex-row gap-3">
            <StatBox value="75%" label="Verified" color="amber" />
            <StatBox value="7" label="Streak" color="red" />
          </View>
        </View>

        {/* Insight cards */}
        <View className="gap-3 mb-6">
          {INSIGHTS.map((insight, i) => (
            <GlassCard
              key={i}
              className="p-4"
              style={{ borderLeftWidth: 3, borderLeftColor: insight.color }}
            >
              <Text className="text-text-primary text-sm">{insight.text}</Text>
            </GlassCard>
          ))}
        </View>

        {/* Weekly reflection */}
        <GlassCard className="p-5 mb-8">
          <Text className="text-text-muted text-xs uppercase tracking-wider mb-2">
            Weekly reflection
          </Text>
          <Text className="text-text-primary text-sm">
            Great progress on the research project. Try to maintain your Tuesday
            momentum and use before/after photos more consistently.
          </Text>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}
