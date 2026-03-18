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
import type { Subtask } from "../store/useAppStore";

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

type Nav = NativeStackNavigationProp<any>;

export function ActiveTaskScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<{ params: { taskId: string } }>>();
  const taskId = route.params.taskId;

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

  // Wait phase state
  const [inWaitPhase, setInWaitPhase] = useState(false);
  const [waitSecondsLeft, setWaitSecondsLeft] = useState(0);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const startTimeRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waitIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notificationIdRef = useRef<string | null>(null);
  const lastHapticMinRef = useRef<number>(0);

  const isStrictMode = task?.strictnessLevel === "deep_focus" || task?.strictnessLevel === "hardcore";

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

  // Schedule a notification when entering wait phase
  const scheduleWaitNotification = useCallback(async (waitSeconds: number, nextStepName: string) => {
    // Cancel any previous wait notification
    if (notificationIdRef.current) {
      await Notifications.cancelScheduledNotificationAsync(notificationIdRef.current);
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time for the next step!",
        body: `${nextStepName} \uD83D\uDC55`,
        sound: true,
      },
      trigger: { seconds: waitSeconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
    });
    notificationIdRef.current = id;
  }, []);

  // Check if we're resuming into a wait phase
  useEffect(() => {
    if (isMultiStep && currentSubtask?.status === "waiting") {
      setInWaitPhase(true);
      setWaitSecondsLeft(currentSubtask.waitMinutesAfter * 60);
    }
  }, []);

  // Set task as active on mount
  useEffect(() => {
    setCurrentTask(taskId);
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
      if (waitIntervalRef.current) clearInterval(waitIntervalRef.current);
    };
  }, []);

  // Reset timer when subtask changes
  useEffect(() => {
    if (!inWaitPhase) {
      setTotalSeconds(activeDuration);
      setElapsed(0);
      setTimerDone(false);
      startTimeRef.current = Date.now();
    }
  }, [currentIndex, inWaitPhase]);

  // Active task timer
  useEffect(() => {
    if (inWaitPhase) return;

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
  }, [totalSeconds, inWaitPhase]);

  // Wait phase timer
  useEffect(() => {
    if (!inWaitPhase || waitSecondsLeft <= 0) return;

    const waitStart = Date.now();
    const initialWait = waitSecondsLeft;

    waitIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedWait = Math.floor((now - waitStart) / 1000);
      const remaining = Math.max(0, initialWait - elapsedWait);
      setWaitSecondsLeft(remaining);

      if (remaining <= 0) {
        if (waitIntervalRef.current) clearInterval(waitIntervalRef.current);
        handleWaitComplete();
      }
    }, 1000);

    return () => {
      if (waitIntervalRef.current) clearInterval(waitIntervalRef.current);
    };
  }, [inWaitPhase]);

  const handleWaitComplete = async () => {
    // Cancel scheduled notification
    if (notificationIdRef.current) {
      await Notifications.cancelScheduledNotificationAsync(notificationIdRef.current);
      notificationIdRef.current = null;
    }

    setInWaitPhase(false);
    const nextIndex = currentIndex + 1;
    const subtasks = task!.subtasks!;

    if (nextIndex < subtasks.length) {
      const updatedSubtasks = [...subtasks];
      updatedSubtasks[nextIndex] = { ...updatedSubtasks[nextIndex], status: "active" };
      updateTask(taskId, { currentSubtaskIndex: nextIndex, subtasks: updatedSubtasks });

      showToast(`\uD83D\uDD12 Apps locked \u2014 starting step ${nextIndex + 1}`);
    }
  };

  const handleExtendTime = useCallback((mins: number) => {
    setTotalSeconds((prev) => prev + mins * 60);
  }, []);

  const handleSkipWait = () => {
    if (waitIntervalRef.current) clearInterval(waitIntervalRef.current);
    setWaitSecondsLeft(0);
    handleWaitComplete();
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

    if (task?.proofType === "honor") {
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
      // Enter wait phase
      subtasks[currentIndex] = { ...subtasks[currentIndex], status: "waiting" };
      updateTask(taskId, { subtasks });
      setInWaitPhase(true);
      setWaitSecondsLeft(sub.waitMinutesAfter * 60);
      // Keep captured photos across steps

      // Schedule local notification for when wait ends
      const nextStep = subtasks[currentIndex + 1];
      if (nextStep) {
        scheduleWaitNotification(sub.waitMinutesAfter * 60, nextStep.name);
      }
    } else {
      // Move to next subtask immediately
      const nextIndex = currentIndex + 1;
      subtasks[nextIndex] = { ...subtasks[nextIndex], status: "active" };
      updateTask(taskId, {
        subtasks,
        currentSubtaskIndex: nextIndex,
      });
      // Keep captured photos across steps
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

  const waitMin = Math.floor(waitSecondsLeft / 60);
  const waitSec = waitSecondsLeft % 60;

  const currentProofType = isMultiStep ? currentSubtask?.proofType : task.proofType;

  // Determine urgency for BreathingRing
  const remainingMinutes = remaining / 60;
  const urgency: "normal" | "warning" | "critical" =
    remainingMinutes < 1 ? "critical" : remainingMinutes < 5 ? "warning" : "normal";

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

        {/* MascotOrb — top right */}
        <View style={{ position: "absolute", top: 60, right: 20, zIndex: 50 }}>
          <MascotOrb mood={inWaitPhase ? "default" : "locked"} size={40} />
        </View>

        <ScrollView
          style={{ flex: 1, paddingHorizontal: 20 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ height: 30 }} />

          {/* ========== ACTIVE PHASE ========== */}
          {!inWaitPhase ? (
            <>
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
                          label={`\uD83D\uDCF8 ${prompt.photoPrompt}`}
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
                  {"\uD83D\uDCF8"} take before photo
                </Text>
              )}
            </>
          ) : (
            /* ========== WAIT PHASE ========== */
            <>
              <View style={{ height: 10 }} />

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

              {/* Wait reason */}
              {isMultiStep && currentSubtask && currentSubtask.waitReason && (
                <Text
                  style={{
                    fontFamily: "DMSans-Regular",
                    fontSize: 14,
                    color: "rgba(250,248,244,0.3)",
                    textAlign: "center",
                    marginTop: 8,
                  }}
                >
                  {currentSubtask.waitReason}
                </Text>
              )}

              {/* Wait countdown */}
              <View style={{ alignItems: "center", marginTop: 48 }}>
                <Text
                  style={{
                    fontFamily: "DMSans-Light",
                    fontSize: 48,
                    color: "rgba(250,248,244,0.6)",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {String(waitMin).padStart(2, "0")}:{String(waitSec).padStart(2, "0")}
                </Text>
                <Text style={{ fontFamily: "DMSans-Regular", fontSize: 14, color: "rgba(250,248,244,0.3)", marginTop: 4 }}>
                  until next step
                </Text>

                {/* Next step preview — text only, no card */}
                {currentIndex + 1 < task.subtasks!.length && (
                  <View style={{ marginTop: 40, alignItems: "center", width: "100%" }}>
                    <Text style={{ fontFamily: "DMSans-Medium", fontSize: 11, color: "rgba(250,248,244,0.3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                      up next
                    </Text>
                    <Text style={{ fontFamily: "DMSans-Medium", fontSize: 18, color: "#FAF8F4", textAlign: "center" }}>
                      {task.subtasks![currentIndex + 1].name}
                    </Text>
                    <Text style={{ fontFamily: "DMSans-Regular", fontSize: 14, color: "rgba(250,248,244,0.3)", marginTop: 4 }}>
                      {task.subtasks![currentIndex + 1].estimatedMinutes} min
                    </Text>

                    <TouchableOpacity
                      onPress={handleSkipWait}
                      activeOpacity={0.7}
                      style={{ marginTop: 24 }}
                    >
                      <Text style={{ fontFamily: "DMSans-Medium", fontSize: 16, color: "#D97706" }}>
                        I'm ready early {"\u2192"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Spacer */}
          <View style={{ flex: 1, minHeight: 20 }} />

          {/* Bottom buttons */}
          <View style={{ paddingBottom: 16, alignItems: "center" }}>
            {inWaitPhase ? (
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
                style={{ paddingVertical: 12 }}
              >
                <Text style={{ fontFamily: "DMSans-Regular", fontSize: 14, color: "rgba(250,248,244,0.3)" }}>
                  go back
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                {/* Main action — text only */}
                <TouchableOpacity
                  onPress={handleMarkComplete}
                  activeOpacity={0.7}
                  style={{ paddingVertical: 16, alignItems: "center" }}
                >
                  <Text style={{ fontFamily: "DMSans-Medium", fontSize: 16, color: "#FAF8F4" }}>
                    {isMultiStep
                      ? currentIndex >= task.subtasks!.length - 1
                        ? "I'm done \u2192"
                        : "done with this step \u2192"
                      : "I'm done \u2192"}
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
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </SoftGradientBg>
  );
}
