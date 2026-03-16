import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { GlassCard } from "../components/ui/GlassCard";
import { StreakDots } from "../components/ui/StreakDots";
import { SectionLabel } from "../components/ui/SectionLabel";
import { SessionCard } from "../components/ui/SessionCard";
import { SoftGradientBg } from "../components/ui/SoftGradientBg";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { TaskData } from "../navigation/types";
import { getAllSessions, calculateStreak, getBacklogTasks, type Session, type BacklogTask } from "../services/storage";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function sessionToRolledOverTask(s: Session): TaskData {
  const isTiny = s.taskType === "tiny" || (s.durationMinutes <= 10);
  return {
    taskTitle: s.taskTitle,
    taskType: s.taskType ?? "transformation",
    estimatedMinutes: s.durationMinutes,
    isTiny,
    isProject: s.taskType === "project",
    subtasks: [],
    suggestedDuration: s.durationMinutes,
    requiresBeforePhoto: false,
    subject: null,
  };
}

function taskEmoji(taskType?: string): string {
  if (taskType === "study") return "📚";
  if (taskType === "tiny") return "🧹";
  return "📝";
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const today = new Date().getDay();
  const [streak, setStreak] = useState(0);
  const [rolledOver, setRolledOver] = useState<Session[]>([]);
  const [backlog, setBacklog] = useState<BacklogTask[]>([]);

  const load = () => {
    getAllSessions().then((sessions) => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      const fromYesterday = sessions.filter(
        (s) => s.completedAt && s.completedAt.slice(0, 10) === yesterdayStr
      );
      const partialOrNotStarted = fromYesterday.filter((s) => s.verified === false);
      setRolledOver(partialOrNotStarted);
    });
    getBacklogTasks().then(setBacklog);
    calculateStreak().then(setStreak);
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

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
                  {streak === 0 ? "No streak yet" : `${streak} day streak`}
                </Text>
                <Text className="text-text-muted text-sm mt-1">
                  {streak > 0 ? "Keep it going!" : "Complete a session today"}
                </Text>
              </View>
              <StreakDots filledUpTo={Math.min(streak, 7)} total={7} />
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
            {rolledOver.map((s) => {
              const task = sessionToRolledOverTask(s);
              const isTiny = task.isTiny;
              return (
                <SessionCard
                  key={s.id}
                  emoji={taskEmoji(s.taskType)}
                  title={s.taskTitle}
                  subtitle={`Yesterday · ${s.verified === false ? "Partial" : "Not started"}`}
                  badge={
                    isTiny
                      ? { label: "Tiny", variant: "red" }
                      : { label: "Partial", variant: "amber" }
                  }
                  time={`${s.durationMinutes}m`}
                  onPress={() =>
                    isTiny
                      ? navigation.navigate("TinyTask", { task })
                      : navigation.navigate("Breakdown", { task })
                  }
                />
              );
            })}
          </View>

          {backlog.length > 0 && (
            <>
              <SectionLabel label="Saved for later" className="mb-3" />
              <View className="gap-3 mb-10">
                {backlog.map((t) => (
                  <SessionCard
                    key={t.id}
                    emoji="📝"
                    title={t.text}
                    subtitle="Backlog"
                    time={undefined}
                    onPress={() =>
                      navigation.navigate("TaskInput", {
                        initialTask: t.text,
                      })
                    }
                  />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </SoftGradientBg>
  );
}
