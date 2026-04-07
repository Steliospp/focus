import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  PanResponder,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore, type Horizon, type Task } from "../store/useAppStore";
import { fonts } from "../constants/fonts";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/RootNavigator";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const HORIZONS: Horizon[] = ["today", "soon", "someday"];
const HORIZON_LABELS: Record<Horizon, string> = {
  today: "today",
  soon: "soon",
  someday: "someday",
};
const HORIZON_SUBLABELS: Record<Horizon, string> = {
  today: "must happen today",
  soon: "this week",
  someday: "whenever",
};
const TODAY_MAX = 5;

// ── TaskRow ──────────────────────────────────────────────────────────

function TaskRow({
  task,
  contexts,
  horizon,
}: {
  task: Task;
  contexts: ReturnType<typeof useAppStore.getState>["contexts"];
  horizon: Horizon;
}) {
  const [expanded, setExpanded] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { updateTask, moveTaskToHorizon, removeTask, toggleListSubtask } = useAppStore();

  const context = contexts.find((c) => c.id === task.contextId);
  const dotColor = context?.color ?? "#78716C";
  const subtaskCount = task.listSubtasks?.length ?? 0;
  const subtasksDone = task.listSubtasks?.filter((s) => s.done).length ?? 0;
  const allSubtasksDone = subtaskCount > 0 && subtasksDone === subtaskCount;

  // Auto-complete parent when all subtasks done
  React.useEffect(() => {
    if (allSubtasksDone && task.status !== "completed") {
      updateTask(task.id, { status: "completed" });
    }
  }, [allSubtasksDone]);

  const deadlineLabel = useMemo(() => {
    if (!task.deadline) return null;
    const dl = new Date(task.deadline);
    const now = new Date();
    const diffMs = dl.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffMs < 0) return { text: "overdue", color: theme.colors.semantic.red };
    if (diffHours < 24) {
      const h = Math.floor(diffHours);
      return {
        text: h < 1 ? "< 1 hr" : `${h}h`,
        color: theme.colors.semantic.amber,
      };
    }

    const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const dayName = days[dl.getDay()];
    const timeStr = dl.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    if (diffHours < 48) return { text: `tomorrow ${timeStr}`, color: theme.colors.text.secondary };
    return { text: `${dayName} ${timeStr}`, color: theme.colors.text.muted };
  }, [task.deadline]);

  const handleToggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const handleStartTask = () => {
    navigation.navigate("TaskDetail", { taskId: task.id, quickStart: true });
  };

  const moveOptions = HORIZONS.filter((h) => h !== horizon);

  return (
    <View style={styles.taskRow}>
      <TouchableOpacity
        style={styles.taskRowMain}
        onPress={handleToggleExpand}
        activeOpacity={0.7}
      >
        {/* Context dot */}
        <View style={[styles.contextDot, { backgroundColor: dotColor }]} />

        {/* Task name */}
        <View style={styles.taskNameContainer}>
          <Text
            style={[
              styles.taskName,
              task.status === "completed" && styles.taskNameCompleted,
            ]}
            numberOfLines={expanded ? undefined : 1}
          >
            {task.name}
          </Text>
          {subtaskCount > 0 && !expanded && (
            <Text style={styles.subtaskIndicator}>
              {" "}
              ›{subtaskCount - subtasksDone}
            </Text>
          )}
        </View>

        {/* Deadline or urgency indicator */}
        <View style={styles.taskRowRight}>
          {task.horizon === "today" && deadlineLabel?.color === theme.colors.semantic.amber && (
            <Text style={[styles.urgencyBang, { color: theme.colors.semantic.amber }]}>!</Text>
          )}
          {horizon !== "someday" && deadlineLabel && (
            <Text style={[styles.deadlineText, { color: deadlineLabel.color }]}>
              {deadlineLabel.text}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded content */}
      {expanded && (
        <View style={styles.expandedContent}>
          {/* Subtasks */}
          {task.listSubtasks && task.listSubtasks.length > 0 && (
            <View style={styles.subtasksList}>
              {task.listSubtasks.map((st) => (
                <TouchableOpacity
                  key={st.id}
                  style={styles.subtaskRow}
                  onPress={() => toggleListSubtask(task.id, st.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.subtaskCheckbox,
                      st.done && styles.subtaskCheckboxDone,
                    ]}
                  >
                    {st.done && (
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.subtaskText,
                      st.done && styles.subtaskTextDone,
                    ]}
                  >
                    {st.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleStartTask}>
              <Text style={styles.actionBtnTextAccent}>do it now →</Text>
            </TouchableOpacity>

            {moveOptions.map((h) => (
              <TouchableOpacity
                key={h}
                style={styles.actionBtn}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  moveTaskToHorizon(task.id, h);
                }}
              >
                <Text style={styles.actionBtnText}>→ {h}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate("AddTask", { taskId: task.id })}
            >
              <Text style={styles.actionBtnText}>edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { marginLeft: "auto" }]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                removeTask(task.id);
              }}
            >
              <Text style={[styles.actionBtnText, { color: theme.colors.semantic.red }]}>
                delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ── HorizonList ──────────────────────────────────────────────────────

function HorizonList({
  horizon,
  tasks,
  contexts,
  activeFilter,
}: {
  horizon: Horizon;
  tasks: Task[];
  contexts: ReturnType<typeof useAppStore.getState>["contexts"];
  activeFilter: string | null;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Filter by context if active
  let filtered = activeFilter
    ? tasks.filter((t) => t.contextId === activeFilter)
    : tasks;

  // Sort: soon tasks by deadline (closest first), today by urgency
  if (horizon === "soon") {
    filtered = [...filtered].sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }

  // Group someday tasks by context with "life" at the bottom
  if (horizon === "someday") {
    filtered = [...filtered].sort((a, b) => {
      const ctxA = contexts.find((c) => c.id === a.contextId);
      const ctxB = contexts.find((c) => c.id === b.contextId);
      if (ctxA?.isDefault && !ctxB?.isDefault) return 1;
      if (!ctxA?.isDefault && ctxB?.isDefault) return -1;
      const nameA = ctxA?.name ?? "";
      const nameB = ctxB?.name ?? "";
      return nameA.localeCompare(nameB);
    });
  }

  // Show "life" label in someday for grouped life tasks
  let lastContextId = "";

  return (
    <ScrollView
      style={styles.horizonList}
      contentContainerStyle={styles.horizonListContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Horizon header */}
      <View style={styles.horizonHeader}>
        <Text style={styles.horizonTitle}>{HORIZON_LABELS[horizon]}</Text>
        <Text style={styles.horizonSubtitle}>{HORIZON_SUBLABELS[horizon]}</Text>
        {horizon === "today" && (
          <Text style={styles.horizonCount}>
            {filtered.filter((t) => t.status !== "completed").length}/{TODAY_MAX}
          </Text>
        )}
      </View>

      {/* Task list */}
      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {horizon === "today"
              ? "nothing for today yet"
              : horizon === "soon"
              ? "nothing coming up this week"
              : "no someday tasks yet"}
          </Text>
          <TouchableOpacity
            style={styles.emptyAddBtn}
            onPress={() => navigation.navigate("AddTask")}
          >
            <Text style={styles.emptyAddText}>+ add a task</Text>
          </TouchableOpacity>
        </View>
      ) : (
        filtered.map((task) => {
          const ctx = contexts.find((c) => c.id === task.contextId);
          const showContextLabel =
            horizon === "someday" &&
            ctx?.isDefault &&
            task.contextId !== lastContextId;

          if (task.contextId) lastContextId = task.contextId;

          return (
            <React.Fragment key={task.id}>
              {showContextLabel && (
                <Text style={styles.contextGroupLabel}>{ctx?.name}</Text>
              )}
              <TaskRow task={task} contexts={contexts} horizon={horizon} />
            </React.Fragment>
          );
        })
      )}

      {/* Add task button at bottom */}
      {filtered.length > 0 && (
        <TouchableOpacity
          style={styles.addTaskBottom}
          onPress={() => navigation.navigate("AddTask")}
        >
          <Ionicons name="add" size={18} color={theme.colors.text.muted} />
          <Text style={styles.addTaskBottomText}>add task</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────

export function MyListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tasks = useAppStore((s) => s.tasks);
  const contexts = useAppStore((s) => s.contexts);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const panX = useRef(new Animated.Value(0)).current;

  // Group tasks by horizon (only non-completed)
  const tasksByHorizon = useMemo(() => {
    const grouped: Record<Horizon, Task[]> = { today: [], soon: [], someday: [] };
    for (const task of tasks) {
      if (task.status === "completed" || task.status === "failed") continue;
      const h = task.horizon ?? "someday";
      grouped[h].push(task);
    }
    return grouped;
  }, [tasks]);

  // Contexts that are actually in use
  const activeContexts = useMemo(() => {
    const usedIds = new Set(tasks.map((t) => t.contextId).filter(Boolean));
    return contexts.filter((c) => usedIds.has(c.id));
  }, [tasks, contexts]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderMove: (_, gs) => {
        panX.setValue(gs.dx);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -SWIPE_THRESHOLD && currentIndex < 2) {
          setCurrentIndex((i) => i + 1);
        } else if (gs.dx > SWIPE_THRESHOLD && currentIndex > 0) {
          setCurrentIndex((i) => i - 1);
        }
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 10,
        }).start();
      },
    })
  ).current;

  const handleFilterPress = useCallback(
    (contextId: string) => {
      setActiveFilter((prev) => (prev === contextId ? null : contextId));
    },
    []
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>my list</Text>
        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.pasteBtn}
            onPress={() => navigation.navigate("PasteList" as any)}
          >
            <Ionicons name="clipboard-outline" size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => navigation.navigate("ListSettings" as any)}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Context filter dots */}
      {activeContexts.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {activeContexts.map((ctx) => (
            <TouchableOpacity
              key={ctx.id}
              style={[
                styles.filterChip,
                activeFilter === ctx.id && styles.filterChipActive,
              ]}
              onPress={() => handleFilterPress(ctx.id)}
            >
              <View style={[styles.filterDot, { backgroundColor: ctx.color }]} />
              <Text
                style={[
                  styles.filterLabel,
                  activeFilter === ctx.id && styles.filterLabelActive,
                ]}
              >
                {ctx.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Horizon indicator dots */}
      <View style={styles.horizonDots}>
        {HORIZONS.map((h, i) => (
          <TouchableOpacity
            key={h}
            onPress={() => setCurrentIndex(i)}
            style={styles.horizonDotTouchable}
          >
            <View
              style={[
                styles.horizonDot,
                i === currentIndex && styles.horizonDotActive,
              ]}
            />
            <Text
              style={[
                styles.horizonDotLabel,
                i === currentIndex && styles.horizonDotLabelActive,
              ]}
            >
              {h}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Swipeable horizon panels */}
      <Animated.View
        style={[
          styles.horizonContainer,
          {
            transform: [
              {
                translateX: Animated.add(
                  panX,
                  new Animated.Value(-currentIndex * SCREEN_WIDTH)
                ),
              },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {HORIZONS.map((horizon) => (
          <View key={horizon} style={[styles.horizonPanel, { width: SCREEN_WIDTH }]}>
            <HorizonList
              horizon={horizon}
              tasks={tasksByHorizon[horizon]}
              contexts={contexts}
              activeFilter={activeFilter}
            />
          </View>
        ))}
      </Animated.View>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg.primary,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  screenTitle: {
    fontFamily: fonts.heading,
    fontSize: 34,
    color: theme.colors.text.primary,
  },
  topBarRight: {
    flexDirection: "row",
    gap: 12,
  },
  pasteBtn: {
    padding: 6,
  },
  settingsBtn: {
    padding: 6,
  },
  filterRow: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.04)",
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: "rgba(0,0,0,0.10)",
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  filterLabelActive: {
    color: theme.colors.text.primary,
  },
  horizonDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    paddingVertical: 10,
  },
  horizonDotTouchable: {
    alignItems: "center",
    gap: 4,
  },
  horizonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.text.muted,
  },
  horizonDotActive: {
    backgroundColor: theme.colors.accent,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  horizonDotLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: theme.colors.text.muted,
  },
  horizonDotLabelActive: {
    fontFamily: fonts.bodyMedium,
    color: theme.colors.text.primary,
  },
  horizonContainer: {
    flex: 1,
    flexDirection: "row",
    width: SCREEN_WIDTH * 3,
  },
  horizonPanel: {
    flex: 1,
  },
  horizonList: {
    flex: 1,
  },
  horizonListContent: {
    paddingHorizontal: 20,
  },
  horizonHeader: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  horizonTitle: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: theme.colors.text.primary,
  },
  horizonSubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: theme.colors.text.muted,
    marginTop: 2,
  },
  horizonCount: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.accent,
    marginTop: 4,
  },
  emptyState: {
    paddingTop: 60,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: theme.colors.text.muted,
  },
  emptyAddBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  emptyAddText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  contextGroupLabel: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: theme.colors.text.muted,
    fontStyle: "italic",
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  taskRow: {
    marginBottom: 2,
  },
  taskRowMain: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  contextDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  taskNameContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
  },
  taskName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 17,
    color: theme.colors.text.primary,
    flexShrink: 1,
  },
  taskNameCompleted: {
    textDecorationLine: "line-through",
    color: theme.colors.text.muted,
  },
  subtaskIndicator: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: theme.colors.text.muted,
  },
  taskRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
  },
  urgencyBang: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
  },
  deadlineText: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
  expandedContent: {
    paddingLeft: 24,
    paddingBottom: 12,
  },
  subtasksList: {
    gap: 2,
    marginBottom: 12,
  },
  subtaskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 10,
  },
  subtaskCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: theme.colors.text.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  subtaskCheckboxDone: {
    backgroundColor: theme.colors.semantic.green,
    borderColor: theme.colors.semantic.green,
  },
  subtaskText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: theme.colors.text.secondary,
  },
  subtaskTextDone: {
    textDecorationLine: "line-through",
    color: theme.colors.text.muted,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  actionBtnText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  actionBtnTextAccent: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.accent,
  },
  addTaskBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    marginTop: 8,
  },
  addTaskBottomText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: theme.colors.text.muted,
  },
});
