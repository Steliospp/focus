import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { TagBadge } from "../components/ui/TagBadge";
import { ProgressBar } from "../components/ui/ProgressBar";
import { AnswerButton } from "../components/ui/AnswerButton";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Friction">;

const ANSWERS = [
  "I finished what I needed to do",
  "I got distracted",
  "The task was harder than expected",
  "I need a break first",
];

export function FrictionScreen({ route, navigation }: Props) {
  const { task, earlyEnd, minutesEarly } = route.params;
  const [selected, setSelected] = useState(1);

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <View className="mt-6 mb-4">
          <View className="flex-row items-center gap-3 mb-1">
            <TagBadge label="Ended 8 min early" variant="amber" />
          </View>
          <Text className="text-text-muted text-sm mt-2">Question 1 of 2</Text>
        </View>

        <Text className="text-text-primary text-2xl font-bold mb-3">
          Why did you end your session early?
        </Text>
        <Text className="text-text-muted text-sm mb-4">
          {task.taskTitle} · {task.estimatedMinutes} min session
        </Text>

        <ProgressBar fillPercent={50} color="amber" className="mb-8" />

        <View className="gap-3 mb-6">
          {ANSWERS.map((a, i) => (
            <AnswerButton
              key={i}
              text={a}
              selected={i === selected}
              onPress={() => setSelected(i)}
            />
          ))}
        </View>

        <Text className="text-text-muted text-xs text-center mb-6">
          No wrong answer — this helps you understand your patterns
        </Text>

        <PrimaryButton
          title="Next question →"
          variant="surface"
          onPress={() =>
            navigation.navigate("SessionComplete", {
              sessionSummary: {
                taskTitle: task.taskTitle,
                durationMinutes: task.estimatedMinutes,
                completedAt: new Date().toISOString(),
                verified: false,
              },
            })
          }
        />
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
