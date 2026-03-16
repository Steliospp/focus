import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { GlassCard } from "../components/ui/GlassCard";
import { StreakDots } from "../components/ui/StreakDots";
import { SectionLabel } from "../components/ui/SectionLabel";
import { SessionCard } from "../components/ui/SessionCard";
import type { RootStackParamList } from "../navigation/RootNavigator";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const today = new Date().getDay();

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between mt-2 mb-6">
          <View>
            <Text className="text-text-primary text-2xl font-bold">
              Good day, Stelios
            </Text>
            <View className="flex-row gap-3 mt-2">
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
          <View className="w-10 h-10 rounded-full bg-accent/20 items-center justify-center">
            <Text className="text-accent text-base font-bold">S</Text>
          </View>
        </View>

        {/* Streak Card */}
        <GlassCard className="p-5 mb-4">
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

        {/* Task Input Card */}
        <TouchableOpacity
          onPress={() => navigation.navigate("TaskInput")}
          activeOpacity={0.7}
        >
          <View className="border-2 border-dashed border-white/10 rounded-card p-8 items-center mb-6">
            <Text className="text-text-muted text-base">
              What are you working on?
            </Text>
          </View>
        </TouchableOpacity>

        {/* Rolled Over */}
        <SectionLabel label="Rolled over" className="mb-3" />

        <View className="gap-3 mb-8">
          <SessionCard
            emoji="📝"
            title="Research report"
            subtitle="Yesterday · 2 subtasks left"
            badge={{ label: "Partial", variant: "amber" }}
            time="25m"
            onPress={() => navigation.navigate("Breakdown")}
          />
          <SessionCard
            emoji="🧹"
            title="Clean desk"
            subtitle="Yesterday · Not started"
            badge={{ label: "Tiny", variant: "red" }}
            time="5m"
            onPress={() => navigation.navigate("TinyTask")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
