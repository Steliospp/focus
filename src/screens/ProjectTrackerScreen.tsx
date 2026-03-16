import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../components/ui/GlassCard";
import { ProgressBar } from "../components/ui/ProgressBar";
import { SectionLabel } from "../components/ui/SectionLabel";
import { PhaseRow } from "../components/ui/PhaseRow";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/RootNavigator";

export function ProjectTrackerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4 mt-2">
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>

        <Text className="text-text-primary text-2xl font-bold">Research paper</Text>
        <Text className="text-text-muted text-sm mb-6">Due March 30</Text>

        {/* Pace card */}
        <GlassCard className="p-5 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View>
              <Text className="text-semantic-green text-sm font-semibold">On pace</Text>
              <Text className="text-text-muted text-xs mt-0.5">4 of 15 sessions done</Text>
            </View>
            <Text className="text-text-primary text-3xl font-bold">27%</Text>
          </View>
          <ProgressBar fillPercent={27} color="green" />
        </GlassCard>

        <SectionLabel label="Sessions" className="mb-3" />
        <View className="gap-3 mb-8">
          <PhaseRow icon="search" name="Research" sessions="3/3 sessions" color="#4ADE80" status="done" />
          <PhaseRow icon="document-text" name="Outline" sessions="1/2 sessions" color="#60A5FA" status="active" />
          <PhaseRow icon="create" name="First draft" sessions="0/5 sessions" color="#D4A574" status="pending" />
          <PhaseRow icon="git-merge" name="Revisions" sessions="0/3 sessions" color="#C084FC" status="pending" />
          <PhaseRow icon="checkmark-done" name="Final review" sessions="0/2 sessions" color="#FBBF24" status="pending" />
        </View>

        <PrimaryButton
          title="Start today's session →"
          onPress={() => navigation.navigate("TaskInput")}
        />
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
