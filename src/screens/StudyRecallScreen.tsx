import React from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../components/ui/GlassCard";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "StudyRecall">;

export function StudyRecallScreen({ route, navigation }: Props) {
  const { task, subject } = route.params;

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4 mt-2">
          <Ionicons name="close" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>

        <Text className="text-text-primary text-2xl font-bold mb-1">
          Study recall check
        </Text>
        <Text className="text-text-muted text-sm mb-6">{subject ?? task.taskTitle}</Text>

        {/* Screenshot card */}
        <GlassCard className="p-5 items-center mb-4">
          <Ionicons name="camera" size={32} color={theme.colors.text.muted} />
          <Text className="text-text-secondary text-sm mt-2">
            Take a screenshot of your notes
          </Text>
          <TouchableOpacity className="mt-3 bg-bg-elevated px-4 py-2 rounded-pill border border-white/8">
            <Text className="text-accent text-sm font-medium">Open camera</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Recall question */}
        <GlassCard className="p-5 mb-4">
          <Text className="text-text-muted text-xs uppercase tracking-wider mb-2">
            Recall question
          </Text>
          <Text className="text-text-primary text-base italic">
            "What are the four stages of mitosis and what happens in each?"
          </Text>
        </GlassCard>

        {/* Answer input */}
        <View className="border-l-2 border-accent pl-4 mb-4">
          <TextInput
            placeholder="Type your answer from memory..."
            placeholderTextColor={theme.colors.text.muted}
            className="text-text-primary text-base py-2"
            multiline
          />
        </View>

        <Text className="text-text-muted text-xs text-center mb-6">
          No grading — this is just for your own recall practice
        </Text>

        <PrimaryButton
          title="Log session →"
          onPress={() =>
            navigation.navigate("SessionComplete", {
              sessionSummary: {
                taskTitle: task.taskTitle,
                durationMinutes: task.estimatedMinutes,
                completedAt: new Date().toISOString(),
                verified: true,
              },
            })
          }
        />
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
