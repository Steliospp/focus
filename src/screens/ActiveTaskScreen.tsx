import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

import { SoftGradientBg } from "../components/ui/SoftGradientBg";
import { ProofUpload } from "../components/ui/ProofUpload";
import { BreathingRing } from "../components/ui/BreathingRing";
import { MascotOrb } from "../components/ui/MascotOrb";
import { useAppStore } from "../store/useAppStore";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/RootNavigator";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ActiveTaskRouteProp = RouteProp<RootStackParamList, "ActiveTask">;

type ScreenPhase = "active" | "nowWeWait" | "waitResume" | "waitOverdue";

export function ActiveTaskScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<ActiveTaskRouteProp>();
  const taskId = route.params.taskId;
  const autoAdvanceFromProof = route.params.autoAdvanceFromProof ?? false;

  const task = useAppStore((s) => s.tasks.find((t) => t.id === taskId));
  const updateTask = useAppStore((s) => s.updateTask);
  const setCurrentTask = useAppStore((s) => s.setCurrentTask);

  const isMultiStep = task?.isMultiStep && task.subtasks && task.subtasks.length > 0;
  const currentIndex = task?.currentSubtaskIndex ?? 0;
  const currentSubtask = isMultiStep ? task!.subtasks![currentIndex] : null;

  // Determine timer duration based on current subtask or whole task
  const activeDuration = isMultiStep
    ? (currentSubtask?.estimatedMinutes ?? 25) * 60
    : (task?.estimatedMinutes ?? 25) * 60;

  const [totalSeconds, setTotalSeconds] = useState(activeDuration);
  const [elapsed, setElapsed] = useState(0);
  // Photo proof: keyed by prompt ID -> image URI
  const [capturedPhotos, setCapturedPhotos] = useState<Record<string, string>>({});
  const [timerDone, setTimerDone] = useState(false);

  // Phase state
  const [phase, setPhase] = useState<ScreenPhase>("active");
  const [waitRemainingSeconds, setWaitRemainingSeconds] = useState(0);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const startTimeRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastHapticMinRef = useRef<number>(0);
  const hasHandledAutoAdvance = useRef(false);
  const nowWeWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isStrictMode = task?.strictnessLevel === "deep_focus" || task?.strictnessLevel === "hardcore";

  // Check if there's ANOTHER task in a wait phase (nested session indicator)
  const waitingParentTask = useAppStore((s) =>
    s.tasks.find(
      (t) =>
        t.id !== taskId &&
        t.isMultiStep &&
        t.subtasks?.some((sub) => sub.status === "waiting") &&
        (t as any).waitPhaseStartedAt,
    )
  );
  const waitingParentSubtask = waitingParentTask?.subtasks?.find((s) => s.status === "waiting");
  const waitingParentRemaining = (() => {
    if (!waitingParentTask || !waitingParentSubtask) return 0;
    const startedAt = (waitingParentTask as any).waitPhaseStartedAt as string;
    const elapsedMs = Date.now() - new Date(startedAt).getTime();
    const totalMs = waitingParentSubtask.waitMinutesAfter * 60 * 1000;
    return Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000 / 60));
  })();

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastMessage(null));
  }, [toastOpacity]);

  // Request notification permissions on mount
  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  // Schedule all wait notifications and return their IDs
  const scheduleWaitNotifications = useCallback(async (
    waitMinutes: number,
    taskName: string,
    waitReason: string,
    nextStepName: string,
    nextStepIndex: number,
  ): Promise<string[]> => {
    const ids: string[] = [];

    // Primary notification when wait ends
    const primaryId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${taskName} 👕`,
        body: `${waitReason} done — time for ${nextStepName}`,
        data: { taskId, nextStepIndex },
      },
      trigger: { seconds: waitMinutes * 60, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
    });
    ids.push(primaryId);

    // Follow-up after 10 min past wait end
    if (waitMinutes * 60 + 600 > waitMinutes * 60) {
      const followUp10Id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "still waiting on you 👀",
          body: nextStepName,
          data: { taskId, nextStepIndex },
        },
        trigger: { seconds: waitMinutes * 60 + 600, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
      });
      ids.push(followUp10Id);
    }

    // Follow-up after 30 min past wait end
    const followUp30Id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "don't forget...",
        body: `${waitReason} — things might not wait forever`,
        data: { taskId, nextStepIndex },
      },
      trigger: { seconds: waitMinutes * 60 + 1800, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
    });
    ids.push(followUp30Id);

    return ids;
  }, [taskId]);

  // Cancel previously scheduled notifications for this task
  const cancelTaskNotifications = useCallback(async () => {
    const notifIds = (task as any)?.scheduledNotificationIds as string[] | undefined;
    if (notifIds && notifIds.length > 0) {
      for (const id of notifIds) {
        try {
          await Notifications.cancelScheduledNotificationAsync(id);
        } catch {
          // ignore if already fired
        }
      }
      updateTask(taskId, { scheduledNotificationIds: [] } as any);
    }
  }, [task, taskId, updateTask]);

  // Enter the "now we wait" transition: shows for 3 seconds, then goes home
  const enterWaitTransition = useCallback(async (
    waitMinutes: number,
    waitReason: string,
    nextStepName: string,
    nextStepIndex: number,
  ) => {
    setPhase("nowWeWait");
    setWaitRemainingSeconds(waitMinutes * 60);

    // Schedule notifications
    const notifIds = await scheduleWaitNotifications(
      waitMinutes,
      task?.name ?? "Task",
      waitReason,
      nextStepName,
      nextStepIndex,
    );

    // Store wait phase data on the task
    updateTask(taskId, {
      waitPhaseStartedAt: new Date().toISOString(),
      scheduledNotificationIds: notifIds,
    } as any);

    // Clear currentTaskId so apps unlock
    setCurrentTask(null);

    // After 3 seconds, navigate to WaitPhase screen
    nowWeWaitTimerRef.current = setTimeout(() => {
      navigation.navigate("WaitPhase", { taskId });
    }, 3000);
  }, [scheduleWaitNotifications, task?.name, taskId, updateTask, setCurrentTask, navigation]);

  // Check if we're resuming into a wait phase
  useEffect(() => {
    if (!task || !isMultiStep) return;

    const waitStartedAt = (task as any).waitPhaseStartedAt as string | undefined;
    if (currentSubtask?.status === "waiting" && waitStartedAt) {
      // Redirect to WaitPhase screen for both ongoing and expired waits
      navigation.navigate("WaitPhase", { taskId });
      return;
    }

    // Not in wait phase — normal active
    setPhase("active");
  }, []);

  // Handle auto-advance from proof
  useEffect(() => {
    if (!autoAdvanceFromProof || hasHandledAutoAdvance.current || !task) return;
    hasHandledAutoAdvance.current = true;

    if (!isMultiStep) return;

    const sub = currentSubtask;
    if (!sub) return;

    const isLastStep = currentIndex >= task.subtasks!.length - 1;
    const hasWait = sub.waitMinutesAfter > 0 && !isLastStep;

    if (hasWait) {
      const nextStep = task.subtasks![currentIndex + 1];
      enterWaitTransition(
        sub.waitMinutesAfter,
        sub.waitReason || "processing",
        nextStep?.name ?? "next step",
        currentIndex + 1,
      );
    }
    // If no wait, we just stay on active phase showing the current (already advanced) step
  }, [autoAdvanceFromProof, task, isMultiStep, currentSubtask, currentIndex, enterWaitTransition]);

  const isHandler = task?.archetype === "handler";

  // Set task as active on mount
  useEffect(() => {
    if (phase === "waitResume" || phase === "nowWeWait") return;

    // Handler tasks don't lock apps
    if (!isHandler) {
      setCurrentTask(taskId);
    }
    updateTask(taskId, {
      status: "active",
      startedAt: task?.startedAt ?? new Date().toISOString(),
    });

    // If multi-step and first subtask is pending, activate it
    if (isMultiStep && currentSubtask?.status === "pending") {
      const updatedSubtasks = [...task!.subtasks!];
      updatedSubtasks[currentIndex] = { ...updatedSubtasks[currentIndex], status: "active" };
      updateTask(taskId, { subtasks: updatedSubtasks });
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (nowWeWaitTimerRef.current) clearTimeout(nowWeWaitTimerRef.current);
    };
  }, []);

  // Reset timer when subtask changes
  useEffect(() => {
    if (phase === "active") {
      setTotalSeconds(activeDuration);
      setElapsed(0);
      setTimerDone(false);
      startTimeRef.current = Date.now();
    }
  }, [currentIndex, phase]);

  // Active task timer
  useEffect(() => {
    if (phase !== "active" && phase !== "waitOverdue") return;

    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedSec = Math.floor((now - startTimeRef.current) / 1000);
      setElapsed(elapsedSec);

      // Haptic pulse every 25 min
      const elapsedMin = Math.floor(elapsedSec / 60);
      if (elapsedMin > 0 && elapsedMin % 25 === 0 && elapsedMin !== lastHapticMinRef.current) {
        lastHapticMinRef.current = elapsedMin;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      if (elapsedSec >= totalSeconds && !timerDone) {
        setTimerDone(true);
        Alert.alert("Time's up!", "Ready to submit proof?");
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [totalSeconds, phase]);

  // Wait resume countdown (for display only — user is free to leave)
  useEffect(() => {
    if (phase !== "waitResume") return;

    const interval = setInterval(() => {
      setWaitRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Wait is done — transition to overdue/active
          setPhase("waitOverdue");
          cancelTaskNotifications();
          setCurrentTask(taskId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, cancelTaskNotifications, setCurrentTask, taskId]);

  const handleExtendTime = useCallback((mins: number) => {
    setTotalSeconds((prev) => prev + mins * 60);
  }, []);

  const handleStartNextStepEarly = async () => {
    // Cancel wait notifications
    await cancelTaskNotifications();

    // Advance to next step
    const subtasks = [...task!.subtasks!];
    const nextIndex = currentIndex + 1;
    subtasks[currentIndex] = { ...subtasks[currentIndex], status: "completed" };
    subtasks[nextIndex] = { ...subtasks[nextIndex], status: "active" };
    updateTask(taskId, {
      currentSubtaskIndex: nextIndex,
      subtasks,
      waitPhaseStartedAt: undefined,
    } as any);

    // Lock apps again
    setCurrentTask(taskId);
    setPhase("active");
    showToast(`🔒 Apps locked — starting step ${nextIndex + 1}`);
  };

  const handleMarkComplete = () => {
    if (isMultiStep) {
      handleSubtaskComplete();
    } else {
      handleSingleTaskComplete();
    }
  };

  const handleSingleTaskComplete = () => {
    const finishedEarly = elapsed < totalSeconds;
    const delta = finishedEarly
      ? Math.floor((totalSeconds - elapsed) / 60)
      : Math.floor((elapsed - totalSeconds) / 60);

    updateTask(taskId, {
      startedAt: task?.startedAt ?? new Date().toISOString(),
      finishedEarly,
      minutesDelta: delta,
    });

    // Where to go after this task completes
    const returnToWaitPhase = waitingParentTask ? waitingParentTask.id : null;

    // Handler tasks: just mark done, no proof needed
    if (isHandler || task?.proofType === "honor") {
      if (isHandler) {
        updateTask(taskId, {
          status: "completed",
          completedAt: new Date().toISOString(),
        });
        setCurrentTask(null);
        if (returnToWaitPhase) {
          navigation.navigate("WaitPhase", { taskId: returnToWaitPhase });
        } else {
          navigation.navigate("Tabs");
        }
        return;
      }
      navigation.navigate("Reflect", { taskId });
    } else {
      navigation.navigate("ProofGate", {
        taskId,
        capturedPhotos,
      });
    }
  };

  const handleSubtaskComplete = () => {
    const subtasks = [...task!.subtasks!];
    const sub = subtasks[currentIndex];

    // Mark current subtask completed
    subtasks[currentIndex] = { ...sub, status: "completed" };

    const isLastStep = currentIndex >= subtasks.length - 1;
    const hasWait = sub.waitMinutesAfter > 0 && !isLastStep;

    if (isLastStep) {
      // All subtasks done — mark parent complete
      const finishedEarly = elapsed < totalSeconds;
      const delta = finishedEarly
        ? Math.floor((totalSeconds - elapsed) / 60)
        : Math.floor((elapsed - totalSeconds) / 60);

      updateTask(taskId, {
        subtasks,
        finishedEarly,
        minutesDelta: delta,
      });

      if (task?.proofType === "honor") {
        navigation.navigate("Reflect", { taskId });
      } else {
        navigation.navigate("ProofGate", {
          taskId,
          capturedPhotos,
        });
      }
    } else if (hasWait) {
      // Enter "now we wait" transition
      subtasks[currentIndex] = { ...subtasks[currentIndex], status: "waiting" };
      updateTask(taskId, { subtasks });

      const nextStep = subtasks[currentIndex + 1];
      enterWaitTransition(
        sub.waitMinutesAfter,
        sub.waitReason || "processing",
        nextStep?.name ?? "next step",
        currentIndex + 1,
      );
    } else {
      // Move to next subtask immediately — no wait
      const nextIndex = currentIndex + 1;
      subtasks[nextIndex] = { ...subtasks[nextIndex], status: "active" };
      updateTask(taskId, {
        subtasks,
        currentSubtaskIndex: nextIndex,
      });
      // Keep captured photos across steps
    }
  };

  // Handle overdue: advance to next step
  const handleStartOverdueStep = async () => {
    await cancelTaskNotifications();

    const subtasks = [...task!.subtasks!];
    const nextIndex = currentIndex + 1;

    if (nextIndex < subtasks.length) {
      subtasks[currentIndex] = { ...subtasks[currentIndex], status: "completed" };
      subtasks[nextIndex] = { ...subtasks[nextIndex], status: "active" };
      updateTask(taskId, {
        currentSubtaskIndex: nextIndex,
        subtasks,
        waitPhaseStartedAt: undefined,
      } as any);

      setPhase("active");
      showToast(`🔒 Apps locked — starting step ${nextIndex + 1}`);
    }
  };

  if (!task) {
    return (
      <SoftGradientBg dark>
        <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "rgba(250,248,244,0.3)", fontFamily: "DMSans-Regular", fontSize: 16 }}>Task not found</Text>
        </SafeAreaView>
      </SoftGradientBg>
    );
  }

  const remaining = Math.max(0, totalSeconds - elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = totalSeconds > 0 ? Math.min(elapsed / totalSeconds, 1) : 0;

  const currentProofType = isMultiStep ? currentSubtask?.proofType : task.proofType;

  // Determine urgency for BreathingRing
  const remainingMinutes = remaining / 60;
  const urgency: "normal" | "warning" | "critical" =
    remainingMinutes < 1 ? "critical" : remainingMinutes < 5 ? "warning" : "normal";

  const waitMin = Math.floor(waitRemainingSeconds / 60);
  const waitSec = waitRemainingSeconds % 60;

  // ==================== "NOW WE WAIT" TRANSITION ====================
  if (phase === "nowWeWait") {
    const waitMinutes = currentSubtask?.waitMinutesAfter ?? 0;
    const waitReason = currentSubtask?.waitReason ?? "";

    return (
      <SoftGradientBg dark>
        <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
          <MascotOrb mood="default" size={64} />

          <Text
            style={{
              fontFamily: "CormorantGaramond-Italic",
              fontSize: 32,
              color: "#FAF8F4",
              textAlign: "center",
              marginTop: 32,
            }}
          >
            now we wait.
          </Text>

          <Text
            style={{
              fontFamily: "DMSans-Regular",
              fontSize: 16,
              color: "rgba(250,248,244,0.6)",
              textAlign: "center",
              marginTop: 16,
            }}
          >
            {waitMinutes} min — {waitReason}
          </Text>

          <Text
            style={{
              fontFamily: "DMSans-Regular",
              fontSize: 14,
              color: "rgba(250,248,244,0.3)",
              textAlign: "center",
              marginTop: 12,
            }}
          >
            apps unlocked until it's done 🔓
          </Text>
        </SafeAreaView>
      </SoftGradientBg>
    );
  }

  // ==================== WAIT RESUME (user opened app during wait) ====================
  if (phase === "waitResume") {
    const nextStep = isMultiStep && currentIndex + 1 < task.subtasks!.length
      ? task.subtasks![currentIndex + 1]
      : null;

    return (
      <SoftGradientBg dark>
        <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
          <MascotOrb mood="default" size={56} />

          <Text
            style={{
              fontFamily: "CormorantGaramond-Italic",
              fontSize: 32,
              color: "#FAF8F4",
              textAlign: "center",
              marginTop: 32,
            }}
          >
            you're free for now
          </Text>

          <Text
            style={{
              fontFamily: "DMSans-Light",
              fontSize: 42,
              color: "rgba(250,248,244,0.6)",
              fontVariant: ["tabular-nums"],
              textAlign: "center",
              marginTop: 24,
            }}
          >
            {String(waitMin).padStart(2, "0")}:{String(waitSec).padStart(2, "0")}
          </Text>

          <Text
            style={{
              fontFamily: "DMSans-Regular",
              fontSize: 14,
              color: "rgba(250,248,244,0.3)",
              marginTop: 4,
            }}
          >
            remaining
          </Text>

          {nextStep && (
            <TouchableOpacity
              onPress={handleStartNextStepEarly}
              activeOpacity={0.7}
              style={{ marginTop: 40 }}
            >
              <Text style={{ fontFamily: "DMSans-Medium", fontSize: 16, color: "#D97706" }}>
                start next step early →
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate("Tabs")}
            activeOpacity={0.7}
            style={{ marginTop: 20 }}
          >
            <Text style={{ fontFamily: "DMSans-Regular", fontSize: 14, color: "rgba(250,248,244,0.3)" }}>
              go back
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </SoftGradientBg>
    );
  }

  // ==================== WAIT OVERDUE (wait passed, next step waiting) ====================
  if (phase === "waitOverdue") {
    const nextStep = isMultiStep && currentIndex + 1 < task.subtasks!.length
      ? task.subtasks![currentIndex + 1]
      : null;

    return (
      <SoftGradientBg dark>
        <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
          <MascotOrb mood="warning" size={56} />

          <Text
            style={{
              fontFamily: "CormorantGaramond-Italic",
              fontSize: 28,
              color: "#FAF8F4",
              textAlign: "center",
              marginTop: 32,
            }}
          >
            you're behind
          </Text>

          {nextStep && (
            <Text
              style={{
                fontFamily: "DMSans-Regular",
                fontSize: 16,
                color: "rgba(250,248,244,0.6)",
                textAlign: "center",
                marginTop: 12,
              }}
            >
              {nextStep.name} is waiting
            </Text>
          )}

          <TouchableOpacity
            onPress={handleStartOverdueStep}
            activeOpacity={0.7}
            style={{
              marginTop: 40,
              paddingVertical: 16,
              paddingHorizontal: 32,
              backgroundColor: "#D97706",
              borderRadius: 16,
            }}
          >
            <Text style={{ fontFamily: "DMSans-Medium", fontSize: 16, color: "#FAF8F4" }}>
              start now →
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </SoftGradientBg>
    );
  }

  // ==================== ACTIVE PHASE ====================
  return (
    <SoftGradientBg dark>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Toast overlay */}
        {toastMessage && (
          <Animated.View
            style={{
              position: "absolute",
              top: 60,
              left: 20,
              right: 20,
              zIndex: 100,
              opacity: toastOpacity,
              backgroundColor: "rgba(28,25,23,0.92)",
              borderRadius: 16,
              paddingVertical: 14,
              paddingHorizontal: 20,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FAF8F4", fontFamily: "DMSans-Medium", fontSize: 15, textAlign: "center" }}>
              {toastMessage}
            </Text>
          </Animated.View>
        )}

        {/* Wait bar — nested session indicator */}
        {waitingParentTask && waitingParentSubtask && (
          <View style={{
            backgroundColor: "rgba(217,119,6,0.15)",
            paddingVertical: 6,
            paddingHorizontal: 16,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
          }}>
            <Text style={{
              fontFamily: "DMSans-Regular",
              fontSize: 12,
              color: "#D97706",
            }}>
              {"\u23F1"} {waitingParentSubtask.waitReason}: {waitingParentRemaining} min left
            </Text>
          </View>
        )}

        {/* MascotOrb — top right */}
        <View style={{ position: "absolute", top: waitingParentTask ? 90 : 60, right: 20, zIndex: 50 }}>
          <MascotOrb mood="locked" size={40} />
        </View>

        <ScrollView
          style={{ flex: 1, paddingHorizontal: 20 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ height: 30 }} />

          {/* Step pill (multi-step only) */}
          {isMultiStep && currentSubtask && (
            <Text
              style={{
                fontFamily: "DMSans-Regular",
                fontSize: 13,
                color: "rgba(250,248,244,0.3)",
                textAlign: "center",
              }}
            >
              step {currentIndex + 1} of {task.subtasks!.length} — {currentSubtask.name.toLowerCase()}
            </Text>
          )}

          {/* Task name */}
          <Text
            style={{
              fontFamily: "CormorantGaramond-Italic",
              fontSize: 36,
              color: "#FAF8F4",
              textAlign: "center",
              marginTop: 40,
            }}
          >
            {task.name}
          </Text>

          {/* Step dots (multi-step only) */}
          {isMultiStep && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16 }}>
              {task.subtasks!.map((sub, i) => {
                const isCompleted = sub.status === "completed";
                const isCurrent = i === currentIndex;
                const isWaiting = sub.status === "waiting";
                return (
                  <View
                    key={sub.id}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: isCompleted
                        ? "#84CC16"
                        : isCurrent
                          ? "#F59E0B"
                          : isWaiting
                            ? "#D97706"
                            : "rgba(250,248,244,0.15)",
                    }}
                  />
                );
              })}
            </View>
          )}

          {/* Current subtask name */}
          {isMultiStep && currentSubtask && (
            <Text
              style={{
                fontFamily: "DMSans-Medium",
                fontSize: 16,
                color: "#F59E0B",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              {currentSubtask.name}
            </Text>
          )}

          {/* BreathingRing timer */}
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <BreathingRing
              progress={progress}
              size={220}
              strokeWidth={10}
              urgency={urgency}
            >
              <Text
                style={{
                  fontFamily: "DMSans-Light",
                  fontSize: 48,
                  color: "#FAF8F4",
                  fontVariant: ["tabular-nums"],
                }}
              >
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </Text>
              <Text style={{ fontFamily: "DMSans-Regular", fontSize: 14, color: "rgba(250,248,244,0.3)", marginTop: 4 }}>
                remaining
              </Text>
            </BreathingRing>
          </View>

          {/* Photo prompts (before/during) */}
          {currentProofType === "photo" && (() => {
            const prompts = (task.aiAnalysis?.photoPrompts ?? []).filter(p => {
              if (!p.requiresPhoto) return false;
              if (p.photoTiming !== "start" && p.photoTiming !== "during") return false;
              if (isMultiStep && p.stepIndex !== undefined && p.stepIndex !== currentIndex) return false;
              if (isMultiStep && p.stepId && p.stepId !== currentSubtask?.id) return false;
              if (capturedPhotos[p.id]) return false;
              return true;
            });
            if (prompts.length === 0) return null;
            return (
              <View style={{ marginTop: 24, gap: 10, alignItems: "center" }}>
                {prompts.map((prompt) => (
                  <TouchableOpacity
                    key={prompt.id}
                    activeOpacity={0.7}
                    onPress={() => {}}
                  >
                    <ProofUpload
                      label={`📸 ${prompt.photoPrompt}`}
                      imageUri={null}
                      onImageSelect={(uri) =>
                        setCapturedPhotos((prev) => ({ ...prev, [prompt.id]: uri }))
                      }
                    />
                  </TouchableOpacity>
                ))}
              </View>
            );
          })()}

          {/* Before photo fallback text */}
          {currentProofType === "photo" && (task.aiAnalysis?.photoPrompts ?? []).length === 0 && (
            <Text
              style={{
                fontFamily: "DMSans-Regular",
                fontSize: 14,
                color: "rgba(250,248,244,0.3)",
                textAlign: "center",
                marginTop: 24,
              }}
            >
              📸 take before photo
            </Text>
          )}

          {/* Spacer */}
          <View style={{ flex: 1, minHeight: 20 }} />

          {/* Bottom buttons */}
          <View style={{ paddingBottom: 16, alignItems: "center" }}>
            {/* Main action — text only */}
            <TouchableOpacity
              onPress={handleMarkComplete}
              activeOpacity={0.7}
              style={{ paddingVertical: 16, alignItems: "center" }}
            >
              <Text style={{ fontFamily: "DMSans-Medium", fontSize: 16, color: "#FAF8F4" }}>
                {isMultiStep
                  ? currentIndex >= task.subtasks!.length - 1
                    ? "I'm done →"
                    : "done with this step →"
                  : "I'm done →"}
              </Text>
            </TouchableOpacity>

            {/* Need more time */}
            <TouchableOpacity
              onPress={() => handleExtendTime(10)}
              activeOpacity={0.6}
              style={{ paddingVertical: 8, marginTop: 4 }}
            >
              <Text style={{ fontFamily: "DMSans-Regular", fontSize: 13, color: "rgba(250,248,244,0.3)" }}>
                need more time?
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SoftGradientBg>
  );
}
