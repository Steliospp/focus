import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { MascotOrb } from "../components/ui/MascotOrb";
import { useAppStore } from "../store/useAppStore";
import { suggestWaitActivity, type WaitSuggestion } from "../services/ai";
import { theme } from "../theme";
import { fonts } from "../constants/fonts";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type WaitPhaseRouteProp = RouteProp<RootStackParamList, "WaitPhase">;

export function WaitPhaseScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<WaitPhaseRouteProp>();
  const { taskId } = route.params;

  const task = useAppStore((s) => s.tasks.find((t) => t.id === taskId));
  const allTasks = useAppStore((s) => s.tasks);
  const updateTask = useAppStore((s) => s.updateTask);
  const setCurrentTask = useAppStore((s) => s.setCurrentTask);

  const isMultiStep = task?.isMultiStep && task.subtasks && task.subtasks.length > 0;
  const currentIndex = task?.currentSubtaskIndex ?? 0;
  const currentSubtask = isMultiStep ? task!.subtasks![currentIndex] : null;
  const waitReason = currentSubtask?.waitReason ?? "";
  const waitMinutesTotal = currentSubtask?.waitMinutesAfter ?? 0;

  // Calculate remaining time
  const waitStartedAt = (task as any)?.waitPhaseStartedAt as string | undefined;
  const getInitialRemaining = (): number => {
    if (!waitStartedAt) return waitMinutesTotal * 60;
    const elapsedMs = Date.now() - new Date(waitStartedAt).getTime();
    const remainingSec = Math.max(0, waitMinutesTotal * 60 - Math.floor(elapsedMs / 1000));
    return remainingSec;
  };

  const [remainingSeconds, setRemainingSeconds] = useState(getInitialRemaining);
  const [suggestion, setSuggestion] = useState<WaitSuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(true);
  const [waitExpired, setWaitExpired] = useState(remainingSeconds <= 0);
  const [nestedTaskCompleted, setNestedTaskCompleted] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const suggestionFade = useRef(new Animated.Value(0)).current;

  // Entry animation
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (waitExpired) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setWaitExpired(true);
          // Lock apps again and cancel notifications
          setCurrentTask(taskId);
          cancelNotifications();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [waitExpired]);

  // Fetch AI suggestion
  useEffect(() => {
    fetchSuggestion();
  }, []);

  const fetchSuggestion = async () => {
    setLoadingSuggestion(true);
    suggestionFade.setValue(0);
    const freeMin = Math.floor(remainingSeconds / 60);
    // Exclude the current parent task from suggestions
    const otherTasks = allTasks.filter((t) => t.id !== taskId);
    const result = await suggestWaitActivity(freeMin, otherTasks);
    setSuggestion(result);
    setLoadingSuggestion(false);
    Animated.timing(suggestionFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const cancelNotifications = async () => {
    const notifIds = (task as any)?.scheduledNotificationIds as string[] | undefined;
    if (notifIds?.length) {
      for (const id of notifIds) {
        try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
      }
      updateTask(taskId, { scheduledNotificationIds: [] } as any);
    }
  };

  // Start nested task
  const handleDoItNow = () => {
    if (!suggestion?.taskId) return;
    navigation.navigate("ActiveTask", { taskId: suggestion.taskId });
  };

  // Remind when done — just go home
  const handleRemindLater = () => {
    navigation.navigate("Tabs");
  };

  // Start next step (wait expired or early)
  const handleStartNextStep = async () => {
    await cancelNotifications();
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
      setCurrentTask(taskId);
      navigation.navigate("ActiveTask", { taskId });
    }
  };

  // Add something while waiting
  const handleAddTask = () => {
    navigation.navigate("AddTask");
  };

  const remainMin = Math.floor(remainingSeconds / 60);
  const remainSec = remainingSeconds % 60;

  if (!task) {
    navigation.navigate("Tabs");
    return null;
  }

  // ==================== WAIT EXPIRED ====================
  if (waitExpired) {
    const nextStep = isMultiStep && currentIndex + 1 < task.subtasks!.length
      ? task.subtasks![currentIndex + 1] : null;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.primary }}>
        <Animated.View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32, opacity: fadeAnim }}>
          <MascotOrb mood="happy" size={60} />

          <Text style={{
            fontFamily: fonts.heading, fontSize: 28,
            color: theme.colors.text.primary, textAlign: "center", marginTop: 32,
          }}>
            {nestedTaskCompleted ? "nice work." : `${waitReason} is done.`}
          </Text>

          {nextStep && (
            <Text style={{
              fontFamily: fonts.body, fontSize: 16,
              color: theme.colors.text.secondary, textAlign: "center", marginTop: 12,
            }}>
              time for {nextStep.name.toLowerCase()}
            </Text>
          )}

          <TouchableOpacity
            onPress={handleStartNextStep}
            activeOpacity={0.7}
            style={{ marginTop: 40 }}
          >
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: theme.colors.accent }}>
              let's go {"\u2192"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ==================== ACTIVE WAIT PHASE ====================
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.primary }}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* Top: amber pill with wait status */}
        <View style={{ alignItems: "center", paddingTop: 16 }}>
          <View style={{
            flexDirection: "row", alignItems: "center",
            backgroundColor: "rgba(217,119,6,0.1)",
            paddingHorizontal: 16, paddingVertical: 8,
            borderRadius: 20,
          }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: theme.colors.accent }}>
              {"\u21BB"} {waitReason} {"\u00B7"} {remainMin} min left
            </Text>
          </View>
        </View>

        {/* Main content */}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
          {/* Orb */}
          <MascotOrb mood="default" size={56} />

          {/* "you've got X free minutes" */}
          <Text style={{
            fontFamily: fonts.heading, fontSize: 32,
            color: theme.colors.text.primary, textAlign: "center", marginTop: 32,
          }}>
            you've got {remainMin} free minutes.
          </Text>

          {/* AI suggestion */}
          {loadingSuggestion ? (
            <Text style={{
              fontFamily: fonts.body, fontSize: 16,
              color: theme.colors.text.muted, marginTop: 24,
            }}>
              checking your list...
            </Text>
          ) : suggestion ? (
            <Animated.View style={{ alignItems: "center", marginTop: 28, opacity: suggestionFade }}>
              <Text style={{
                fontFamily: fonts.body, fontSize: 18,
                color: theme.colors.text.primary, textAlign: "center", lineHeight: 26,
              }}>
                {suggestion.suggestionHeadline}
              </Text>

              <Text style={{
                fontFamily: fonts.body, fontSize: 15,
                color: theme.colors.text.secondary, textAlign: "center", marginTop: 8,
              }}>
                {suggestion.suggestionSubtext}
              </Text>

              {/* Action buttons */}
              <View style={{ marginTop: 36, alignItems: "center" }}>
                {suggestion.hasSuggestion && suggestion.taskId ? (
                  <>
                    <TouchableOpacity onPress={handleDoItNow} activeOpacity={0.7}>
                      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: theme.colors.accent }}>
                        do it now {"\u2192"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleRemindLater} activeOpacity={0.7} style={{ marginTop: 20 }}>
                      <Text style={{ fontFamily: fonts.body, fontSize: 15, color: theme.colors.text.muted }}>
                        remind me when {waitReason.toLowerCase()}'s done
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : suggestion.hasSuggestion === false && !suggestion.isRest ? (
                  // No tasks — offer to add one
                  <TouchableOpacity onPress={handleAddTask} activeOpacity={0.7}>
                    <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: theme.colors.accent }}>
                      add something {"\u2192"}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  // Rest suggestion
                  <TouchableOpacity onPress={handleRemindLater} activeOpacity={0.7}>
                    <Text style={{ fontFamily: fonts.body, fontSize: 15, color: theme.colors.text.muted }}>
                      remind me when it's done
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          ) : null}
        </View>

        {/* Bottom: start next step early */}
        {isMultiStep && currentIndex + 1 < task.subtasks!.length && (
          <View style={{ paddingBottom: 32, alignItems: "center" }}>
            <TouchableOpacity onPress={handleStartNextStep} activeOpacity={0.7}>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: theme.colors.text.muted }}>
                start next step early {"\u2192"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}
