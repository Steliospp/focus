import React from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../components/ui/GlassCard";
import { SectionLabel } from "../components/ui/SectionLabel";
import { PhaseRow } from "../components/ui/PhaseRow";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "ProjectSetup">;

const PHASES = [
  { icon: "search" as const, name: "Research", sessions: "3 sessions", color: "#4ADE80" },
  { icon: "document-text" as const, name: "Outline", sessions: "2 sessions", color: "#60A5FA" },
  { icon: "create" as const, name: "First draft", sessions: "5 sessions", color: "#D4A574" },
  { icon: "git-merge" as const, name: "Revisions", sessions: "3 sessions", color: "#C084FC" },
  { icon: "checkmark-done" as const, name: "Final review", sessions: "2 sessions", color: "#FBBF24" },
];

export function ProjectSetupScreen({ navigation }: Props) {

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4 mt-2">
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>

        <Text className="text-text-primary text-2xl font-bold mb-6">New project</Text>

        {/* Input cards */}
        <View className="gap-3 mb-6">
          <GlassCard className="p-4">
            <Text className="text-text-muted text-xs mb-1">Project name</Text>
            <TextInput
              placeholder="e.g., Research paper"
              placeholderTextColor={theme.colors.text.muted}
              className="text-text-primary text-base"
            />
          </GlassCard>
          <GlassCard className="p-4">
            <Text className="text-text-muted text-xs mb-1">Deadline</Text>
            <TextInput
              placeholder="e.g., March 30"
              placeholderTextColor={theme.colors.text.muted}
              className="text-text-primary text-base"
            />
          </GlassCard>
          <GlassCard className="p-4">
            <Text className="text-text-muted text-xs mb-1">Estimated hours</Text>
            <TextInput
              placeholder="e.g., 15"
              placeholderTextColor={theme.colors.text.muted}
              className="text-text-primary text-base"
              keyboardType="numeric"
            />
          </GlassCard>
        </View>

        <SectionLabel label="AI phase plan" className="mb-3" />
        <View className="gap-3 mb-8">
          {PHASES.map((p) => (
            <PhaseRow
              key={p.name}
              icon={p.icon}
              name={p.name}
              sessions={p.sessions}
              color={p.color}
              status="pending"
            />
          ))}
        </View>

        <PrimaryButton
          title="Create project →"
          onPress={() =>
            navigation.navigate("ProjectTracker", {
              project: {
                projectId: "proj-1",
                projectName: "Research paper",
                deadline: "March 30",
                estimatedHours: 15,
                phases: PHASES.map((p) => ({ name: p.name, sessions: p.sessions, color: p.color })),
              },
            })
          }
        />
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
