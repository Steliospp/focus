import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MascotOrb } from "../components/ui/MascotOrb";
import { MissedSessionBanner } from "../components/ui/MissedSessionBanner";
import { DeadlineCard } from "../components/ui/DeadlineCard";
import { useAppStore } from "../store/useAppStore";
import { useDeadlineScheduling } from "../hooks/useDeadlineScheduling";
import { useRecurringTasks } from "../hooks/useRecurringTasks";
import { theme } from "../theme";
import { fonts } from "../constants/fonts";

type Nav = NativeStackNavigationProp<any>;

function getGreeting(
  userName: string,
  pendingCount: number,
  completedCount: number,
  totalMinutes: number,
  hasLateTasks: boolean
): { title: string; emoji: string; subtitle: string } {
  const h = new Date().getHours();
  const allDone = pendingCount === 0 && completedCount > 0;

  if (allDone) {
    return {
      title: "You're done for today.",
      emoji: "\u{1F33F}",
      subtitle: `${totalMinutes}m of real work. Proud of you.`,
    };
  }

  if (hasLateTasks) {
    return {
      title: "Hey, that essay won't write itself",
      emoji: "\u{1F440}",
      subtitle: "1 thing overdue",
    };
  }

  if (completedCount > 0) {
    return {
      title: "Nice, one down.",
      emoji: "\u{2728}",
      subtitle: `${pendingCount} more and you're free`,
    };
  }

  if (h >= 20 && pendingCount > 0) {
    return {
      title: "Still time to do one thing.",
      emoji: "\u{1F319}",
      subtitle: "Tomorrow will thank you",
    };
  }

  const timeGreeting =
    h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";

  return {
    title: `${timeGreeting}, ${userName}`,
    emoji: "\u{1F440}",
    subtitle:
      pendingCount > 0
        ? `${pendingCount} thing${pendingCount === 1 ? "" : "s"} waiting on you`
        : "Nothing scheduled yet. Enjoy the calm.",
  };
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { tasks, userName, streakDays, totalFocusMinutes } = useAppStore();
  const {
    getUpcomingDeadlines,
    getMissedSessions,
    getParentProgress,
    getDaysUntil,
    getUrgencyLevel,
  } = useDeadlineScheduling();

  useRecurringTasks();

  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [dismissedParentIds, setDismissedParentIds] = useState<string[]>([]);

  // Group missed sessions by parent task
  const missedSessions = getMissedSessions();
  const missedByParent = missedSessions.reduce<
    Record<string, { parentId: string; parentName: string; count: number }>
  >((acc, session) => {
    const pid = session.parentTaskId!;
    if (!acc[pid]) {
      const parent = tasks.find((t) => t.id === pid);
      acc[pid] = {
        parentId: pid,
        parentName: parent?.name ?? session.name,
        count: 0,
      };
    }
    acc[pid].count += 1;
    return acc;
  }, {});
  const missedBanners = Object.values(missedByParent).filter(
    (b) => !dismissedParentIds.includes(b.parentId)
  );

  const upcomingDeadlines = getUpcomingDeadlines();

  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  threeDaysFromNow.setHours(23, 59, 59, 999);
  const todayStr = new Date().toISOString().split("T")[0];

  const pendingTasks = tasks.filter((t) => {
    if (t.isRecurringTemplate) return false;
    if (t.status === "completed" || t.status === "failed") return false;
    if (t.status === "active" || t.status === "late") return true;
    if (t.scheduledDate) {
      return t.scheduledDate <= threeDaysFromNow.toISOString().split("T")[0];
    }
    if (t.hardDeadline) {
      return t.hardDeadline <= threeDaysFromNow.toISOString().split("T")[0];
    }
    if (t.deadline) {
      return new Date(t.deadline) <= threeDaysFromNow;
    }
    if (t.createdAt) {
      return t.createdAt.split("T")[0] === todayStr;
    }
    return true;
  });

  // Sort pending tasks by priority: urgent > high > medium > low > undefined
  const priorityOrder: Record<string, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  pendingTasks.sort((a, b) => {
    const pa = priorityOrder[a.priority ?? "medium"] ?? 2;
    const pb = priorityOrder[b.priority ?? "medium"] ?? 2;
    return pa - pb;
  });

  const completedTasks = tasks.filter((t) => t.status === "completed");
  const completedCount = completedTasks.length;
  const hasLateTasks = pendingTasks.some((t) => t.status === "late");

  const {
    title: greetingTitle,
    emoji: greetingEmoji,
    subtitle: greetingSubtitle,
  } = getGreeting(
    userName,
    pendingTasks.length,
    completedCount,
    totalFocusMinutes,
    hasLateTasks
  );

  const orbMood =
    completedCount > 0 && pendingTasks.length === 0
      ? "happy"
      : hasLateTasks
        ? "warning"
        : "default";

  const handleTaskPress = (task: (typeof tasks)[0]) => {
    if (
      (task.status === "todo" || task.status === "late") &&
      !task.aiAnalysis
    ) {
      navigation.navigate("AddTask", { taskId: task.id });
    } else if (
      task.status === "todo" ||
      task.status === "late" ||
      task.status === "active"
    ) {
      navigation.navigate("ActiveTask", { taskId: task.id });
    } else if (task.status === "completed") {
      navigation.navigate("Reflect", { taskId: task.id });
    }
  };

  const getStatusDotColor = (status: string) => {
    if (status === "todo") return "#78716C";
    if (status === "active") return "#F59E0B";
    if (status === "completed") return "#84CC16";
    if (status === "late") return "#EF4444";
    return "#A8A29E";
  };

  const getStatusTextColor = (status: string) => {
    if (status === "late") return "#EF4444";
    if (status === "active") return "#F59E0B";
    return "#78716C";
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FAF8F4" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Missed session banners */}
          {missedBanners.map((b) => (
            <MissedSessionBanner
              key={b.parentId}
              missedCount={b.count}
              taskName={b.parentName}
              onPress={() =>
                Alert.alert(
                  "Reschedule",
                  "Rescheduling coming soon. You can view your calendar to adjust sessions.",
                  [{ text: "OK" }]
                )
              }
              onDismiss={() =>
                setDismissedParentIds((prev) => [...prev, b.parentId])
              }
            />
          ))}

          {/* Greeting hero */}
          <View style={{ paddingTop: 40, paddingBottom: 8, alignItems: "center" }}>
            <Text
              style={{
                fontFamily: fonts.heading,
                fontSize: 38,
                color: "#1C1917",
                textAlign: "center",
                lineHeight: 44,
              }}
            >
              {greetingTitle}
            </Text>

            <Text
              style={{
                fontSize: 28,
                textAlign: "center",
                marginTop: 12,
              }}
            >
              {greetingEmoji}
            </Text>

            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 16,
                color: "#78716C",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              {greetingSubtitle}
            </Text>
          </View>

          {/* MascotOrb */}
          <View style={{ alignItems: "center", marginVertical: 24 }}>
            <MascotOrb mood={orbMood} size={80} />
          </View>

          {/* Streak */}
          {streakDays > 0 && (
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 14,
                color: "#A8A29E",
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              {"\u{1F525}"} {streakDays} day streak
            </Text>
          )}

          {/* Today section header */}
          <View style={{ marginBottom: 4 }}>
            <Text
              style={{
                fontFamily: fonts.bodyMedium,
                fontSize: 13,
                color: "#78716C",
                marginBottom: 8,
              }}
            >
              Today
            </Text>
            <View
              style={{
                height: 1,
                backgroundColor: "#E7E5E4",
              }}
            />
          </View>

          {/* Task list */}
          {pendingTasks.length === 0 && completedCount === 0 && (
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 15,
                color: "#A8A29E",
                paddingVertical: 16,
              }}
            >
              No tasks yet. Add one to get started!
            </Text>
          )}
          {pendingTasks.length === 0 && completedCount > 0 && (
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 15,
                color: "#A8A29E",
                paddingVertical: 16,
              }}
            >
              All done for today!
            </Text>
          )}

          {pendingTasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              activeOpacity={0.6}
              onPress={() => handleTaskPress(task)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 16,
                ...(task.status === "late"
                  ? {
                      borderLeftWidth: 3,
                      borderLeftColor: "#EF4444",
                      paddingLeft: 12,
                    }
                  : {}),
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: getStatusDotColor(task.status),
                  marginRight: 14,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 16,
                    color: "#1C1917",
                  }}
                  numberOfLines={1}
                >
                  {task.name}
                </Text>
              </View>
              {task.estimatedMinutes > 0 && (
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    color: getStatusTextColor(task.status),
                    marginLeft: 12,
                  }}
                >
                  {task.estimatedMinutes} min
                </Text>
              )}
            </TouchableOpacity>
          ))}

          {/* Completed section */}
          {completedCount > 0 && (
            <View style={{ marginTop: 16 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setCompletedExpanded(!completedExpanded)}
                style={{ paddingVertical: 10 }}
              >
                <Text
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 16,
                    color: "#A8A29E",
                  }}
                >
                  Done today ({completedCount})
                </Text>
              </TouchableOpacity>

              {completedExpanded &&
                completedTasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    activeOpacity={0.6}
                    onPress={() => handleTaskPress(task)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 16,
                      opacity: 0.5,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#84CC16",
                        marginRight: 14,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: fonts.bodyMedium,
                          fontSize: 16,
                          color: "#1C1917",
                          textDecorationLine: "line-through",
                        }}
                        numberOfLines={1}
                      >
                        {task.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          )}

          {/* Add something */}
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => navigation.navigate("AddTask")}
            style={{ paddingVertical: 16 }}
          >
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 16,
                color: "#78716C",
              }}
            >
              + add something
            </Text>
          </TouchableOpacity>

          {/* Upcoming Deadlines */}
          {upcomingDeadlines.length > 0 && (
            <View style={{ marginTop: 24, marginBottom: 4 }}>
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 13,
                  color: "#78716C",
                  marginBottom: 8,
                }}
              >
                Deadlines
              </Text>
              <View
                style={{
                  height: 1,
                  backgroundColor: "#E7E5E4",
                  marginBottom: 8,
                }}
              />
              {upcomingDeadlines.map((deadline) => {
                const days = getDaysUntil(deadline.hardDeadline!);
                const urgency = getUrgencyLevel(deadline.hardDeadline!);
                const { completed, total } = getParentProgress(deadline.id);
                return (
                  <DeadlineCard
                    key={deadline.id}
                    taskName={deadline.name}
                    daysUntil={days}
                    urgency={urgency}
                    sessionsCompleted={completed}
                    totalSessions={total}
                    onPress={() =>
                      navigation.navigate("Tabs", { screen: "Calendar" })
                    }
                  />
                );
              })}
            </View>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
