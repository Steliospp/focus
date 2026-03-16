import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { TagBadge } from "../components/ui/TagBadge";
import { ProgressBar } from "../components/ui/ProgressBar";
import { AnswerButton } from "../components/ui/AnswerButton";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getFrictionQuestions, type FrictionQuestion } from "../services/ai";
import type { SessionSummary } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Friction">;

export function FrictionScreen({ route, navigation }: Props) {
  const { task, earlyEnd, minutesEarly } = route.params;
  const [questions, setQuestions] = useState<FrictionQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = await getFrictionQuestions(task, earlyEnd, minutesEarly);
        if (!cancelled) {
          setQuestions(qs);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setQuestions([]);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [task, earlyEnd, minutesEarly]);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length || 1;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  const handleNext = () => {
    const selectedOption =
      currentQuestion?.options[selectedIndex ?? 0] ?? currentQuestion?.options[0];
    if (selectedOption) {
      setAnswers((prev) => {
        const updated = [...prev];
        updated[currentIndex] = selectedOption;
        return updated;
      });
    }

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedIndex(null);
      return;
    }

    const sessionSummary: SessionSummary = {
      taskTitle: task.taskTitle,
      durationMinutes: task.estimatedMinutes,
      completedAt: new Date().toISOString(),
      verified: false,
      taskType: task.taskType,
      frictionAnswers: answers.concat(
        selectedOption ? [selectedOption] : []
      ),
    };

    navigation.navigate("SessionComplete", { sessionSummary });
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <View className="mt-6 mb-4">
          <View className="flex-row items-center gap-3 mb-1">
            <TagBadge label={`Ended ${minutesEarly} min early`} variant="amber" />
          </View>
          <Text className="text-text-muted text-sm mt-2">
            {questions.length > 0 ? `Question ${currentIndex + 1} of ${questions.length}` : "Loading questions..."}
          </Text>
        </View>

        <Text className="text-text-primary text-2xl font-bold mb-3">
          {currentQuestion?.question ?? "Why did you end your session early?"}
        </Text>
        <Text className="text-text-muted text-sm mb-4">
          {task.taskTitle} · {task.estimatedMinutes} min session
        </Text>

        <ProgressBar fillPercent={progress} color="amber" className="mb-8" />

        <View className="gap-3 mb-6">
          {!loading &&
            (currentQuestion?.options ?? []).map((a, i) => (
              <AnswerButton
                key={i}
                text={a}
                selected={i === selectedIndex}
                onPress={() => setSelectedIndex(i)}
              />
            ))}
        </View>

        <Text className="text-text-muted text-xs text-center mb-6">
          No wrong answer — this helps you understand your patterns
        </Text>

        <PrimaryButton
          title={currentIndex < totalQuestions - 1 ? "Next question →" : "Finish session →"}
          variant="surface"
          onPress={handleNext}
        />
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
