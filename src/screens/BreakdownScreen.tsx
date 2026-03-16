import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../components/ui/GlassCard";
import { TagBadge } from "../components/ui/TagBadge";
import { SectionLabel } from "../components/ui/SectionLabel";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/RootNavigator";

const SUBTASKS = [
  { num: "01", text: "Gather sources and references", time: "5m" },
  { num: "02", text: "Create outline structure", time: "5m" },
  { num: "03", text: "Write first draft of key sections", time: "10m" },
  { num: "04", text: "Review and polish", time: "5m" },
];

const DURATIONS = [15, 25, 45];

export function BreakdownScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedDuration, setSelectedDuration] = useState(25);

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4 mt-2">
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>

        {/* Header */}
        <View className="flex-row items-center gap-3 mb-1">
          <Text className="text-text-primary text-2xl font-bold">Research report</Text>
        </View>
        <View className="flex-row items-center gap-2 mb-6">
          <TagBadge label="Study mode" variant="accent" />
          <Text className="text-text-muted text-sm">~25 min total</Text>
        </View>

        {/* Subtasks */}
        <SectionLabel label="Subtasks" className="mb-3" />
        <View className="gap-3 mb-6">
          {SUBTASKS.map((st) => (
            <GlassCard key={st.num} className="p-4">
              <View className="flex-row items-center">
                <Text className="text-accent text-sm font-bold mr-3 w-6">
                  {st.num}
                </Text>
                <Text className="text-text-primary text-sm flex-1">{st.text}</Text>
                <Text className="text-text-muted text-xs">{st.time}</Text>
              </View>
            </GlassCard>
          ))}
        </View>

        {/* Duration pills */}
        <View className="flex-row gap-3 mb-6">
          {DURATIONS.map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => setSelectedDuration(d)}
              className={`flex-1 py-3 rounded-pill items-center ${
                d === selectedDuration
                  ? "bg-accent"
                  : "bg-bg-elevated border border-white/8"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  d === selectedDuration ? "text-bg-primary" : "text-text-secondary"
                }`}
              >
                {d}m
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sound card */}
        <GlassCard className="p-4 flex-row items-center mb-8">
          <Ionicons name="rainy" size={24} color={theme.colors.accent} />
          <View className="ml-3 flex-1">
            <Text className="text-text-primary text-sm font-medium">Rain sounds</Text>
            <Text className="text-text-muted text-xs">headphones</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
        </GlassCard>

        <PrimaryButton
          title="Start session →"
          onPress={() => navigation.navigate("ActiveSession")}
        />
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
