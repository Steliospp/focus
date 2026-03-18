import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../components/ui/GlassCard";
import { SectionLabel } from "../components/ui/SectionLabel";
import { SoftGradientBg } from "../components/ui/SoftGradientBg";
import { useAppStore, type TaskCategory } from "../store/useAppStore";
import { theme } from "../theme";
import { fonts, textStyles } from "../constants/fonts";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const mins = Math.round((now.getTime() - d.getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  study: "Study", writing: "Writing", coding: "Coding", practice: "Practice",
  chores: "Chores", fitness: "Fitness", creative: "Creative", work: "Work",
  errands: "Errands", other: "Other",
};

export function StatsScreen() {
  const { tasks, streakDays, totalFocusMinutes, subjects } = useAppStore();
  const [historyFilter, setHistoryFilter] = useState<TaskCategory | "all">("all");

  const completedTasks = tasks.filter((t) => t.status === "completed");
  const failedTasks = tasks.filter((t) => t.status === "failed");

  // Average AI score from graded tasks
  const gradedTasks = tasks.filter((t) => t.aiGrade != null);
  const avgScore =
    gradedTasks.length > 0
      ? Math.round(
          gradedTasks.reduce((sum, t) => sum + (t.aiGrade?.score ?? 0), 0) /
            gradedTasks.length
        )
      : 0;

  // Honesty score: % of tasks where user self-reported honestly
  const tasksWithHonesty = completedTasks.filter(
    (t) => t.honestySelfReport != null
  );
  const honestTasks = tasksWithHonesty.filter(
    (t) =>
      t.honestySelfReport === "rushed" || t.honestySelfReport === "skipped"
  );
  // Honesty score rewards honest self-reporting (admitting rushing/skipping)
  const honestyScore =
    tasksWithHonesty.length > 0
      ? Math.round(
          ((honestTasks.length + completedTasks.filter((t) => t.honestySelfReport === "full").length) /
            Math.max(tasksWithHonesty.length, 1)) *
            100
        )
      : null;

  // Behavioral insights
  const rushCount = completedTasks.filter(
    (t) => t.honestySelfReport === "rushed" || t.honestySelfReport === "skipped"
  ).length;
  const showRushNudge = rushCount >= 3;

  const underestimatedCount = completedTasks.filter(
    (t) => t.delayReason === "underestimated"
  ).length;
  const showTimeNudge = underestimatedCount >= 3;

  // Mock weekly data from totalFocusMinutes
  const weeklyData = React.useMemo(() => {
    const base = Math.round(totalFocusMinutes / 7);
    const variance = [1.3, 0.8, 1.1, 0.6, 1.4, 0.9, 1.0];
    return variance.map((v) => Math.round(base * v));
  }, [totalFocusMinutes]);

  const maxBar = Math.max(...weeklyData, 1);

  // Best day
  const bestDayIdx = weeklyData.indexOf(Math.max(...weeklyData));
  const bestDay = DAY_LABELS[bestDayIdx] ?? "\u2014";

  return (
    <SoftGradientBg>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text
            style={{
              ...textStyles.hero,
              fontSize: 36,
              color: theme.colors.text.primary,
              marginTop: 8,
              marginBottom: 24,
            }}
          >
            Your Stats
          </Text>

          {/* Streak */}
          <View className="items-center mb-8">
            <Text style={{ fontSize: 48 }}>{"\uD83D\uDD25"}</Text>
            <Text
              style={{
                fontSize: 42,
                fontWeight: "700",
                color: theme.colors.text.primary,
                marginTop: 4,
              }}
            >
              {streakDays}
            </Text>
            <Text
              className="text-base"
              style={{ color: theme.colors.text.secondary }}
            >
              Day Streak
            </Text>
          </View>

          {/* Behavioral nudges */}
          {showRushNudge && (
            <GlassCard
              style={{
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: theme.colors.semantic.amber + "30",
              }}
            >
              <Text
                style={{
                  color: theme.colors.semantic.amber,
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 4,
                }}
              >
                Pattern detected
              </Text>
              <Text
                style={{
                  color: theme.colors.text.secondary,
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                You tend to rush tasks when finishing early. Try setting longer
                time estimates to give yourself breathing room.
              </Text>
            </GlassCard>
          )}

          {showTimeNudge && (
            <GlassCard
              style={{
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: theme.colors.accentLight + "30",
              }}
            >
              <Text
                style={{
                  color: theme.colors.accentLight,
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 4,
                }}
              >
                Time estimation tip
              </Text>
              <Text
                style={{
                  color: theme.colors.text.secondary,
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                You frequently underestimate task duration. AI will add a 20%
                buffer to your future time estimates.
              </Text>
            </GlassCard>
          )}

          {/* Weekly bar chart */}
          <SectionLabel label="THIS WEEK" className="mb-4" />
          <GlassCard soft className="p-4 mb-6">
            <View
              className="flex-row justify-between items-end"
              style={{ height: 140 }}
            >
              {weeklyData.map((mins, i) => {
                const barHeight = Math.max(
                  4,
                  Math.round((mins / maxBar) * 120)
                );
                return (
                  <View
                    key={DAY_LABELS[i]}
                    className="items-center flex-1"
                  >
                    <Text
                      className="text-xs mb-1"
                      style={{ color: theme.colors.text.secondary }}
                    >
                      {mins}m
                    </Text>
                    <LinearGradient
                      colors={[theme.colors.accent, theme.colors.accentLight]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={{
                        width: 28,
                        height: barHeight,
                        borderTopLeftRadius: 8,
                        borderTopRightRadius: 8,
                      }}
                    />
                    <Text
                      className="text-xs mt-2"
                      style={{ color: theme.colors.text.secondary }}
                    >
                      {DAY_LABELS[i]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </GlassCard>

          {/* Stats grid */}
          <View className="flex-row flex-wrap gap-3 mb-6">
            <GlassCard
              soft
              className="p-4 items-center"
              style={{ width: "48%" } as any}
            >
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "700",
                  color: theme.colors.text.primary,
                }}
              >
                {completedTasks.length}
              </Text>
              <Text
                className="text-sm mt-1"
                style={{ color: theme.colors.text.secondary }}
              >
                Completed
              </Text>
            </GlassCard>

            <GlassCard
              soft
              className="p-4 items-center"
              style={{ width: "48%" } as any}
            >
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "700",
                  color: theme.colors.text.primary,
                }}
              >
                {failedTasks.length}
              </Text>
              <Text
                className="text-sm mt-1"
                style={{ color: theme.colors.text.secondary }}
              >
                Failed
              </Text>
            </GlassCard>

            <GlassCard
              soft
              className="p-4 items-center"
              style={{ width: "48%" } as any}
            >
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "700",
                  color: theme.colors.text.primary,
                }}
              >
                {avgScore > 0 ? avgScore : "\u2014"}
              </Text>
              <Text
                className="text-sm mt-1"
                style={{ color: theme.colors.text.secondary }}
              >
                Avg Score
              </Text>
            </GlassCard>

            <GlassCard
              soft
              className="p-4 items-center"
              style={{ width: "48%" } as any}
            >
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "700",
                  color:
                    honestyScore !== null && honestyScore >= 80
                      ? theme.colors.semantic.green
                      : theme.colors.text.primary,
                }}
              >
                {honestyScore !== null ? `${honestyScore}%` : "\u2014"}
              </Text>
              <Text
                className="text-sm mt-1"
                style={{ color: theme.colors.text.secondary }}
              >
                Honesty
              </Text>
            </GlassCard>
          </View>

          {/* By Subject */}
          {subjects.length > 0 && (
            <>
              <SectionLabel label="BY SUBJECT" className="mb-3" />
              <View style={{ gap: 8, marginBottom: 24 }}>
                {subjects.map((sub) => {
                  const subTasks = completedTasks.filter((t) => t.subjectId === sub.id);
                  const subMinutes = subTasks.reduce((s, t) => s + t.estimatedMinutes, 0);
                  const subAvg = subTasks.length > 0
                    ? Math.round(subTasks.reduce((s, t) => s + (t.finalScore ?? t.aiGrade?.score ?? 0), 0) / subTasks.length)
                    : 0;
                  return (
                    <GlassCard key={sub.id} soft style={{ padding: 14, borderLeftWidth: 4, borderLeftColor: sub.color }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View>
                          <Text style={{ fontSize: 15, fontWeight: "600", color: theme.colors.text.primary }}>{sub.name}</Text>
                          <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginTop: 2 }}>
                            {subTasks.length} tasks · {subMinutes} min
                          </Text>
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: "700", color: subAvg >= 75 ? theme.colors.semantic.green : theme.colors.text.primary }}>
                          {subAvg > 0 ? subAvg : "\u2014"}
                        </Text>
                      </View>
                    </GlassCard>
                  );
                })}
              </View>
            </>
          )}

          {/* Time Estimation Accuracy */}
          {(() => {
            const tasksWithDelta = completedTasks.filter((t) => t.minutesDelta != null);
            if (tasksWithDelta.length < 2) return null;

            const overCount = tasksWithDelta.filter((t) => !t.finishedEarly).length;
            const underCount = tasksWithDelta.filter((t) => t.finishedEarly).length;
            const avgDelta = Math.round(
              tasksWithDelta.reduce((s, t) => s + (t.minutesDelta ?? 0), 0) / tasksWithDelta.length
            );

            return (
              <>
                <SectionLabel label="TIME ESTIMATION" className="mb-3" />
                <GlassCard soft style={{ padding: 16, marginBottom: 24 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 22, fontWeight: "700", color: theme.colors.semantic.green }}>{underCount}</Text>
                      <Text style={{ fontSize: 12, color: theme.colors.text.secondary }}>Finished early</Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 22, fontWeight: "700", color: theme.colors.semantic.red }}>{overCount}</Text>
                      <Text style={{ fontSize: 12, color: theme.colors.text.secondary }}>Ran over</Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 22, fontWeight: "700", color: theme.colors.text.primary }}>{avgDelta}m</Text>
                      <Text style={{ fontSize: 12, color: theme.colors.text.secondary }}>Avg delta</Text>
                    </View>
                  </View>
                </GlassCard>
              </>
            );
          })()}

          {/* AI Grading History */}
          <SectionLabel label="GRADING HISTORY" className="mb-3" />

          {/* Category filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <TouchableOpacity
              onPress={() => setHistoryFilter("all")}
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
                backgroundColor: historyFilter === "all" ? theme.colors.accent + "20" : "rgba(0,0,0,0.05)",
                marginRight: 6,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: historyFilter === "all" ? "700" : "500", color: historyFilter === "all" ? theme.colors.accent : theme.colors.text.secondary }}>
                All
              </Text>
            </TouchableOpacity>
            {(Object.keys(CATEGORY_LABELS) as TaskCategory[]).map((cat) => {
              const count = gradedTasks.filter((t) => t.category === cat).length;
              if (count === 0) return null;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setHistoryFilter(cat)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
                    backgroundColor: historyFilter === cat ? theme.colors.accent + "20" : "rgba(0,0,0,0.05)",
                    marginRight: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: historyFilter === cat ? "700" : "500", color: historyFilter === cat ? theme.colors.accent : theme.colors.text.secondary }}>
                    {CATEGORY_LABELS[cat]} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {(() => {
            const filtered = historyFilter === "all"
              ? gradedTasks
              : gradedTasks.filter((t) => t.category === historyFilter);
            if (filtered.length === 0) return (
              <Text className="text-sm py-4" style={{ color: theme.colors.text.muted }}>No graded tasks yet.</Text>
            );
            return filtered.map((task) => (
              <View
                key={task.id}
                className="flex-row items-center py-3"
                style={{ borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.06)" }}
              >
                <View className="flex-1">
                  <Text className="text-[15px]" style={{ color: theme.colors.text.primary }} numberOfLines={1}>
                    {task.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.colors.text.muted, marginTop: 2 }}>
                    {CATEGORY_LABELS[task.category]} · {task.estimatedMinutes}m
                  </Text>
                </View>
                {task.aiGrade && (
                  <View
                    style={{
                      backgroundColor:
                        (task.finalScore ?? task.aiGrade.score) >= 80
                          ? theme.colors.semantic.green
                          : (task.finalScore ?? task.aiGrade.score) >= 60
                          ? theme.colors.semantic.amber
                          : theme.colors.semantic.red,
                      borderRadius: 10,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      marginRight: 8,
                    }}
                  >
                    <Text className="text-white text-xs font-bold">
                      {task.finalScore ?? task.aiGrade.score}
                    </Text>
                  </View>
                )}
                <Text className="text-xs" style={{ color: theme.colors.text.muted }}>
                  {task.completedAt ? timeAgo(task.completedAt) : ""}
                </Text>
              </View>
            ));
          })()}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </SoftGradientBg>
  );
}
