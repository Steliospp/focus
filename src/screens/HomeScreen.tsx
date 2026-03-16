import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { GlassCard } from "../components/ui/GlassCard";
import { StreakDots } from "../components/ui/StreakDots";
import { SectionLabel } from "../components/ui/SectionLabel";
import { SessionCard } from "../components/ui/SessionCard";
import { SoftGradientBg } from "../components/ui/SoftGradientBg";
import type { RootStackParamList } from "../navigation/RootNavigator";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const today = new Date().getDay();

  return (
    <SoftGradientBg>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="flex-row items-center justify-between mt-1 mb-6">
            <View>
              <Text className="text-text-primary text-3xl font-bold tracking-tight">
                Good day, Stelios
              </Text>
              <View className="flex-row gap-4 mt-3">
                {DAYS.map((d, i) => (
                  <Text
                    key={i}
                    className={`text-sm font-medium ${
                      i === today ? "text-accent" : "text-text-muted"
                    }`}
                  >
                    {d}
                  </Text>
                ))}
              </View>
            </View>
            <View className="w-12 h-12 rounded-full bg-accent/20 items-center justify-center">
              <Text className="text-accent text-lg font-bold">S</Text>
            </View>
          </View>

          {/* Streak Card - soft style */}
          <GlassCard soft className="p-5 mb-5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-text-primary text-lg font-semibold">
                  6 day streak
                </Text>
                <Text className="text-text-muted text-sm mt-1">Keep it going!</Text>
              </View>
              <StreakDots filledUpTo={6} />
            </View>
          </GlassCard>

          {/* Task Input - reference style rounded CTA */}
          <TouchableOpacity
            onPress={() => navigation.navigate("TaskInput")}
            activeOpacity={0.8}
            className="mb-6"
          >
            <View className="border-2 border-dashed border-white/10 rounded-card-lg py-8 items-center">
              <Text className="text-text-muted text-base">
                What are you working on?
              </Text>
            </View>
          </TouchableOpacity>

          <SectionLabel label="Rolled over" className="mb-3" />

          <View className="gap-3 mb-10">
            <SessionCard
              emoji="📝"
              title="Research report"
              subtitle="Yesterday · 2 subtasks left"
              badge={{ label: "Partial", variant: "amber" }}
              time="25m"
              onPress={() =>
                navigation.navigate("Breakdown", {
                  task: {
                    taskTitle: "Research report",
                    taskType: "transformation",
                    estimatedMinutes: 25,
                    isTiny: false,
                    isProject: false,
                    subtasks: [
                      { text: "Gather sources and references", minutes: 5 },
                      { text: "Create outline structure", minutes: 5 },
                      { text: "Write first draft of key sections", minutes: 10 },
                      { text: "Review and polish", minutes: 5 },
                    ],
                    suggestedDuration: 25,
                    requiresBeforePhoto: true,
                    subject: null,
                  },
                })
              }
            />
            <SessionCard
              emoji="🧹"
              title="Clean desk"
              subtitle="Yesterday · Not started"
              badge={{ label: "Tiny", variant: "red" }}
              time="5m"
              onPress={() =>
                navigation.navigate("TinyTask", {
                  task: {
                    taskTitle: "Clean desk",
                    estimatedMinutes: 5,
                    isTiny: true,
                    isProject: false,
                    subtasks: [],
                    suggestedDuration: 5,
                    requiresBeforePhoto: false,
                    subject: null,
                  },
                })
              }
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </SoftGradientBg>
  );
}
