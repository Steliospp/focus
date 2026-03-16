import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { SessionCard } from "../components/ui/SessionCard";
import { SoftGradientBg } from "../components/ui/SoftGradientBg";
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
    <SoftGradientBg>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="flex-row items-start justify-between mt-1 mb-6">
            <View>
              <Text className="text-text-primary text-3xl font-bold tracking-tight">
                History
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate("WeeklyInsights")}>
                <Text className="text-text-muted text-base mt-1">
                  12 sessions this month
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("Settings")}
              className="w-11 h-11 rounded-full bg-white/10 items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Filter pills - reference style: soft selected state */}
          <View className="flex-row flex-wrap gap-3 mb-8">
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.8}
                className={`px-5 py-3 rounded-card-lg ${
                  f === activeFilter
                    ? "bg-accent"
                    : "bg-white/5"
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
          <Text className="text-text-muted text-xs uppercase tracking-widest font-semibold mb-4">
            Today
          </Text>
          <View className="gap-3 mb-8">
            {TODAY_SESSIONS.map((s) => (
              <SessionCard key={s.title} {...s} />
            ))}
          </View>

          {/* Yesterday */}
          <Text className="text-text-muted text-xs uppercase tracking-widest font-semibold mb-4">
            Yesterday
          </Text>
          <View className="gap-3 mb-10">
            {YESTERDAY_SESSIONS.map((s) => (
              <SessionCard key={s.title} {...s} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </SoftGradientBg>
  );
}
