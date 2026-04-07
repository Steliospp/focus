import React, { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";
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
  hasLateTasks: boolean,
  capturedCount: number,
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

  const listNote =
    capturedCount > 0 ? `\n${capturedCount} thing${capturedCount === 1 ? "" : "s"} on your list` : "";

  return {
    title: `${timeGreeting}, ${userName}`,
    emoji: "\u{1F440}",
    subtitle:
      pendingCount > 0
        ? `${pendingCount} thing${pendingCount === 1 ? "" : "s"} waiting on you${listNote}`
        : capturedCount > 0
          ? `${capturedCount} thing${capturedCount === 1 ? "" : "s"} on your list`
          : "Nothing scheduled yet. Enjoy the calm.",
  };
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const {
    tasks,
    capturedTasks,
    userName,
    streakDays,
    totalFocusMinutes,
    updateTask,
    removeTask,
    addTask,
    setCurrentTask,
    addCapturedTask,
    removeCapturedTask,
    markCapturedTaskDone,
  } = useAppStore();
  const {
    getUpcomingDeadlines,
    getMissedSessions,
    getParentProgress,
    getDaysUntil,
    getUrgencyLevel,
  } = useDeadlineScheduling();

  useRecurringTasks();

  const [captureText, setCaptureText] = useState("");
  const [captureFocused, setCaptureFocused] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [dismissedParentIds, setDismissedParentIds] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  const handleCapture = () => {
    const text = captureText.trim();
    if (!text) return;
    addCapturedTask(text);
    setCaptureText("");
    // Keep keyboard open for rapid entry
  };

  // Active (not done) captured tasks
  const activeCaptured = capturedTasks.filter((t) => !t.doneAt);
  // Recently done captured tasks (last 24h, for "done today" count)
  const todayStr = new Date().toISOString().split("T")[0];
  const doneCapturedToday = capturedTasks.filter(
    (t) => t.doneAt && t.doneAt.split("T")[0] === todayStr
  );

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

  const backlogTasks = tasks.filter((t) => t.status === "backlog");
  const [backlogExpanded, setBacklogExpanded] = useState(false);
  const [editingBacklogId, setEditingBacklogId] = useState<string | null>(null);
  const [editingBacklogName, setEditingBacklogName] = useState("");

  const pendingTasks = tasks.filter((t) => {
    if (t.isRecurringTemplate) return false;
    if (t.status === "completed" || t.status === "failed" || t.status === "backlog") return false;
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
  const totalDoneToday = completedCount + doneCapturedToday.length;
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
    hasLateTasks,
    activeCaptured.length,
  );

  const orbMood =
    completedCount > 0 && pendingTasks.length === 0
      ? "happy"
      : hasLateTasks
        ? "warning"
        : "default";

  // Status shown purely through text color
  const getTaskNameColor = (status: string) => {
    if (status === "active") return "#D97706";  // amber
    if (status === "late") return "#EF4444";     // red
    if (status === "completed") return "#A8A29E"; // gray
    return "#1C1917";                             // dark (todo)
  };

  const handleTaskTap = (task: (typeof tasks)[0]) => {
    if (task.status === "active") {
      // Active tasks go straight to session
      navigation.navigate("ActiveTask", { taskId: task.id });
      return;
    }
    if (task.status === "completed") {
      navigation.navigate("Reflect", { taskId: task.id });
      return;
    }
    // Toggle expand for todo/late tasks
    setExpandedTaskId((prev) => (prev === task.id ? null : task.id));
  };

  const handleDoItNow = (task: (typeof tasks)[0]) => {
    if (!task.aiAnalysis) {
      navigation.navigate("AddTask", { taskId: task.id });
    } else {
      navigation.navigate("ActiveTask", { taskId: task.id });
    }
  };

  const handleCapturedAction = (item: typeof activeCaptured[0]) => {
    Alert.alert(item.text, undefined, [
      {
        text: "do it now \u2192",
        onPress: () => {
          removeCapturedTask(item.id);
          navigation.navigate("AddTask", { prefilledName: item.text });
        },
      },
      {
        text: "schedule it \u2192",
        onPress: () => {
          removeCapturedTask(item.id);
          navigation.navigate("AddTask", { prefilledName: item.text, prefilledDate: undefined });
        },
      },
      {
        text: "it's done \u2713",
        onPress: () => {
          markCapturedTaskDone(item.id);
        },
      },
      {
        text: "delete",
        style: "destructive",
        onPress: () => removeCapturedTask(item.id),
      },
      { text: "cancel", style: "cancel" },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FAF8F4" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── CAPTURE INPUT ── */}
          <View
            style={{
              marginTop: 12,
              height: 64,
              justifyContent: "center",
              borderBottomWidth: 1.5,
              borderBottomColor: captureFocused ? "#D97706" : "#E7E5E4",
            }}
          >
            <TextInput
              ref={inputRef}
              value={captureText}
              onChangeText={setCaptureText}
              onSubmitEditing={handleCapture}
              onFocus={() => setCaptureFocused(true)}
              onBlur={() => setCaptureFocused(false)}
              placeholder="what's on your mind..."
              placeholderTextColor="#A8A29E"
              returnKeyType="done"
              blurOnSubmit={false}
              style={{
                fontFamily: fonts.heading,
                fontSize: 22,
                color: captureText.length > 0 ? "#1C1917" : "#A8A29E",
                paddingHorizontal: 4,
              }}
            />
          </View>

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

          {/* ── GREETING ── */}
          <View style={{ paddingTop: 32, paddingBottom: 8, alignItems: "center" }}>
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

          {/* ── ORB ── */}
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

          {/* ── TODAY ── */}
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
            <View key={task.id}>
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => handleTaskTap(task)}
                style={{
                  height: 56,
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 17,
                    color: getTaskNameColor(task.status),
                    ...(task.status === "late" ? {} : {}),
                  }}
                  numberOfLines={1}
                >
                  {task.name}
                  {task.status === "late" && (
                    <Text style={{ fontFamily: fonts.body, fontSize: 14, color: "#EF4444" }}>
                      {"  "}late
                    </Text>
                  )}
                </Text>
              </TouchableOpacity>

              {/* Expanded inline actions */}
              {expandedTaskId === task.id && (
                <View style={{ paddingBottom: 12, paddingLeft: 4 }}>
                  <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={() => handleDoItNow(task)}
                    style={{ paddingVertical: 10 }}
                  >
                    <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: "#D97706" }}>
                      do it now {"\u2192"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={() => navigation.navigate("AddTask", { prefilledName: task.name })}
                    style={{ paddingVertical: 10 }}
                  >
                    <Text style={{ fontFamily: fonts.body, fontSize: 15, color: "#78716C" }}>
                      reschedule
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

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

          {/* ── YOUR LIST (captured tasks) ── */}
          {activeCaptured.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <View style={{ marginBottom: 4 }}>
                <Text
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 18,
                    color: "#A8A29E",
                    marginBottom: 8,
                  }}
                >
                  your list
                </Text>
                <View
                  style={{
                    height: 1,
                    backgroundColor: "#E7E5E4",
                  }}
                />
              </View>

              {activeCaptured.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.6}
                  onLongPress={() => handleCapturedAction(item)}
                  delayLongPress={300}
                  style={{
                    paddingVertical: 14,
                    paddingLeft: 4,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 16,
                      color: "#1C1917",
                      lineHeight: 22,
                    }}
                    numberOfLines={2}
                  >
                    {item.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── SOMEDAY / BACKLOG ── */}
          {backlogTasks.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setBacklogExpanded(!backlogExpanded)}
                style={{ paddingVertical: 10 }}
              >
                <Text
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 16,
                    color: "#A8A29E",
                  }}
                >
                  someday ({backlogTasks.length})
                </Text>
              </TouchableOpacity>

              {backlogExpanded &&
                backlogTasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    activeOpacity={0.6}
                    onPress={() => {
                      setEditingBacklogId(task.id);
                      setEditingBacklogName(task.name);
                    }}
                    onLongPress={() => {
                      Alert.alert(task.name, undefined, [
                        {
                          text: "schedule this",
                          onPress: () => navigation.navigate("AddTask", { prefilledName: task.name }),
                        },
                        {
                          text: "do it now",
                          onPress: () => {
                            // Route through AddTask so AI classifies the task
                            removeTask(task.id);
                            navigation.navigate("AddTask", { prefilledName: task.name });
                          },
                        },
                        {
                          text: "delete",
                          style: "destructive",
                          onPress: () => removeTask(task.id),
                        },
                        { text: "cancel", style: "cancel" },
                      ]);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      paddingLeft: 8,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.body, fontSize: 14, color: "#A8A29E", marginRight: 10 }}>{"\u00B7"}</Text>
                    {editingBacklogId === task.id ? (
                      <TextInput
                        value={editingBacklogName}
                        onChangeText={setEditingBacklogName}
                        onBlur={() => {
                          if (editingBacklogName.trim()) {
                            updateTask(task.id, { name: editingBacklogName.trim() });
                          }
                          setEditingBacklogId(null);
                        }}
                        onSubmitEditing={() => {
                          if (editingBacklogName.trim()) {
                            updateTask(task.id, { name: editingBacklogName.trim() });
                          }
                          setEditingBacklogId(null);
                        }}
                        autoFocus
                        style={{
                          flex: 1,
                          fontFamily: fonts.body,
                          fontSize: 15,
                          color: "#78716C",
                          paddingVertical: 0,
                        }}
                      />
                    ) : (
                      <Text
                        style={{
                          flex: 1,
                          fontFamily: fonts.body,
                          fontSize: 15,
                          color: "#78716C",
                        }}
                        numberOfLines={1}
                      >
                        {task.name}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
            </View>
          )}

          {/* ── DONE TODAY ── */}
          {totalDoneToday > 0 && (
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
                  done today ({totalDoneToday})
                </Text>
              </TouchableOpacity>

              {completedExpanded && (
                <>
                  {completedTasks.map((task) => (
                    <View
                      key={task.id}
                      style={{ height: 48, justifyContent: "center" }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.bodyMedium,
                          fontSize: 17,
                          color: "#A8A29E",
                          textDecorationLine: "line-through",
                        }}
                        numberOfLines={1}
                      >
                        {task.name}
                      </Text>
                    </View>
                  ))}

                  {doneCapturedToday.map((item) => (
                    <View
                      key={item.id}
                      style={{ height: 48, justifyContent: "center" }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.bodyMedium,
                          fontSize: 17,
                          color: "#A8A29E",
                          textDecorationLine: "line-through",
                        }}
                        numberOfLines={1}
                      >
                        {item.text}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {/* ── UPCOMING DEADLINES ── */}
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
