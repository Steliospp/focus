import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Animated, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { GlassCard } from "../components/ui/GlassCard";
import { StatBox } from "../components/ui/StatBox";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { saveSession, calculateStreak } from "../services/storage";

type Props = NativeStackScreenProps<RootStackParamList, "SessionComplete">;

export function SessionCompleteScreen({ route, navigation }: Props) {
  const { sessionSummary } = route.params;
  const [streak, setStreak] = useState<number | undefined>(sessionSummary.streak);
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  useEffect(() => {
    const run = async () => {
      try {
        const completedAt = sessionSummary.completedAt ?? new Date().toISOString();
        const completedTime = new Date(completedAt).getTime();
        const durationMs = sessionSummary.durationMinutes * 60 * 1000;
        const startedAt = new Date(completedTime - durationMs).toISOString();

        await saveSession({
          id: `${completedTime}`,
          taskTitle: sessionSummary.taskTitle,
          taskType: sessionSummary.taskType,
          startedAt,
          completedAt,
          durationMinutes: sessionSummary.durationMinutes,
          verified: sessionSummary.verified,
          beforeUri: sessionSummary.beforeUri,
          afterUri: sessionSummary.afterUri,
          recallAnswer: sessionSummary.recallAnswer,
          frictionAnswers: sessionSummary.frictionAnswers,
        });

        const s = await calculateStreak();
        setStreak(s);
      } catch {
        // ignore storage errors for now
      }
    };
    run();
  }, [sessionSummary]);

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ alignItems: "center" }}
      >
        {/* Green glow check */}
        <View className="mt-12 mb-6 items-center">
          <View className="w-24 h-24 rounded-full bg-semantic-green/10 items-center justify-center">
            <Animated.View
              style={{ transform: [{ scale }] }}
              className="w-16 h-16 rounded-full bg-semantic-green/20 items-center justify-center"
            >
              <Text className="text-semantic-green text-3xl">✓</Text>
            </Animated.View>
          </View>
        </View>

        <Text className="text-text-primary text-2xl font-bold mb-1">Session logged</Text>
        <Text className="text-text-muted text-sm mb-8">
          {sessionSummary.taskTitle} · {sessionSummary.durationMinutes} min
        </Text>

        {/* Stats row */}
        <View className="flex-row gap-3 mb-6 w-full">
          <StatBox value={`${sessionSummary.durationMinutes}m`} label="Focused" color="accent" />
          <StatBox value={sessionSummary.subtasksTotal != null ? `${sessionSummary.subtasksDone ?? 0}/${sessionSummary.subtasksTotal}` : "—"} label="Subtasks" color="green" />
          <StatBox value={String(streak ?? sessionSummary.streak ?? 0)} label="Streak" color="amber" />
        </View>

        {/* Before/After strip for transformation */}
        {sessionSummary.taskType === "transformation" && (
          <View className="flex-row gap-3 mb-4 w-full">
            <View className="flex-1 h-20 bg-bg-elevated rounded-card border border-white/8 items-center justify-center">
              {sessionSummary.beforeUri ? (
                <Image
                  source={{ uri: sessionSummary.beforeUri }}
                  className="w-full h-full rounded-card"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-text-muted text-xs">Before</Text>
              )}
            </View>
            <View className="flex-1 h-20 bg-bg-elevated rounded-card border border-white/8 items-center justify-center">
              {sessionSummary.afterUri ? (
                <Image
                  source={{ uri: sessionSummary.afterUri }}
                  className="w-full h-full rounded-card"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-text-muted text-xs">After</Text>
              )}
            </View>
          </View>
        )}

        {/* Recall saved for study */}
        {sessionSummary.taskType === "study" && sessionSummary.recallAnswer && (
          <GlassCard className="p-5 mb-8 w-full">
            <Text className="text-text-muted text-xs uppercase tracking-wider mb-2">
              Recall saved
            </Text>
            <Text className="text-text-primary text-sm italic">
              {sessionSummary.recallAnswer}
            </Text>
          </GlassCard>
        )}

        {/* Buttons */}
        <View className="w-full gap-3 mb-10">
          <PrimaryButton
            title="Done for now"
            variant="outline"
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: "Tabs" }],
              })
            }
          />
          <PrimaryButton
            title="Next session →"
            onPress={() => navigation.navigate("TaskInput")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
