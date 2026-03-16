import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SessionCard } from "../components/ui/SessionCard";
import type { RootStackParamList } from "../navigation/RootNavigator";

const FILTERS = ["All", "This week", "Projects", "Study"];

const TODAY_SESSIONS = [
  { emoji: "📝", title: "Research report", badge: { label: "Full", variant: "green" as const }, time: "25m" },
  { emoji: "🧹", title: "Clean desk", badge: { label: "Tiny", variant: "accent" as const }, time: "3m" },
];

const YESTERDAY_SESSIONS = [
  { emoji: "📚", title: "Study biology ch. 4", badge: { label: "Partial", variant: "amber" as const }, time: "18m" },
  { emoji: "📧", title: "Reply to emails", badge: { label: "Full", variant: "green" as const }, time: "15m" },
];

export function HistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeFilter, setActiveFilter] = useState("All");

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <View className="mt-2 mb-4">
          <Text className="text-text-primary text-2xl font-bold">History</Text>
          <Text className="text-text-muted text-sm">12 sessions this month</Text>
        </View>

        {/* Filter pills */}
        <View className="flex-row gap-2 mb-6">
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-pill ${
                f === activeFilter
                  ? "bg-accent"
                  : "bg-bg-elevated border border-white/8"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  f === activeFilter ? "text-bg-primary" : "text-text-secondary"
                }`}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today */}
        <Text className="text-text-muted text-xs uppercase tracking-widest font-medium mb-3">
          Today
        </Text>
        <View className="gap-3 mb-6">
          {TODAY_SESSIONS.map((s) => (
            <SessionCard key={s.title} {...s} />
          ))}
        </View>

        {/* Yesterday */}
        <Text className="text-text-muted text-xs uppercase tracking-widest font-medium mb-3">
          Yesterday
        </Text>
        <View className="gap-3 mb-8">
          {YESTERDAY_SESSIONS.map((s) => (
            <SessionCard key={s.title} {...s} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
