import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { GlassCard } from "../components/ui/GlassCard";
import { TagBadge } from "../components/ui/TagBadge";
import { theme } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = NativeStackScreenProps<RootStackParamList, "ActiveSession">;

function getCurrentSubtaskIndex(
  subtasks: { text: string; minutes: number }[],
  elapsedMinutes: number
): number {
  if (!subtasks.length) return 0;
  let cumulative = 0;
  for (let i = 0; i < subtasks.length; i++) {
    cumulative += subtasks[i].minutes;
    if (elapsedMinutes < cumulative) return i;
  }
  return subtasks.length - 1;
}

export function ActiveSessionScreen({ route, navigation }: Props) {
  const { task, durationMinutes, beforePhotoUri } = route.params;
  const totalSeconds = durationMinutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  const size = 220;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = useRef(new Animated.Value(circumference)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const progress = 1 - secondsLeft / totalSeconds;
  useEffect(() => {
    Animated.timing(dashOffset, {
      toValue: circumference * (1 - progress),
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress, circumference, dashOffset]);

  const hasNavigated = useRef(false);
  useEffect(() => {
    if (secondsLeft > 0 || hasNavigated.current) return;
    hasNavigated.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (task.requiresBeforePhoto) {
      navigation.replace("VerifyBeforeAfter", {
        task,
        beforeUri: beforePhotoUri,
        earlyEnd: false,
      });
    } else {
      navigation.replace("VerifyScreenshot", { task, earlyEnd: false });
    }
  }, [secondsLeft, task, navigation]);

  const goToVerify = (earlyEnd: boolean) => {
    const minutesEarly = earlyEnd ? Math.ceil(secondsLeft / 60) : 0;
    if (task.requiresBeforePhoto) {
      navigation.navigate("VerifyBeforeAfter", {
        task,
        beforeUri: beforePhotoUri,
        earlyEnd,
        minutesEarly,
      });
    } else {
      navigation.navigate("VerifyScreenshot", { task, earlyEnd, minutesEarly });
    }
  };

  const handleEndEarly = () => {
    Alert.alert(
      "End session early?",
      undefined,
      [
        { text: "Cancel", style: "cancel" },
        { text: "End", onPress: () => goToVerify(true) },
      ]
    );
  };

  const mins = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const secs = (secondsLeft % 60).toString().padStart(2, "0");
  const subtasks = task.subtasks ?? [];
  const elapsedMinutes = (totalSeconds - secondsLeft) / 60;
  const currentSubtaskIndex = getCurrentSubtaskIndex(subtasks, elapsedMinutes);
  const currentSubtaskText = subtasks[currentSubtaskIndex]?.text ?? "Current subtask";
  const stepCount = Math.max(subtasks.length, 1);

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <View className="flex-1 px-5">
        {/* Top bar */}
        <View className="flex-row items-center justify-between mt-2 mb-8">
          <Text className="text-text-secondary text-sm">Block 1 of 1</Text>
          <TagBadge label={task.taskType === "study" ? "Study" : "Focus"} variant="accent" />
        </View>

        {/* Timer ring */}
        <View className="items-center mb-8">
          <View style={{ width: size, height: size }} className="items-center justify-center">
            <Svg width={size} height={size} className="absolute">
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <AnimatedCircle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={theme.colors.accent}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </Svg>
            <Text className="text-text-primary text-5xl font-light">
              {mins}:{secs}
            </Text>
            <Text className="text-text-muted text-sm mt-1">remaining</Text>
          </View>
        </View>

        {/* Current subtask */}
        <GlassCard className="p-5 mb-6">
          <Text className="text-text-muted text-xs uppercase tracking-wider mb-2">
            Current subtask
          </Text>
          <Text className="text-text-primary text-base font-medium mb-3">
            {currentSubtaskText}
          </Text>
          <View className="flex-row gap-2">
            {Array.from({ length: stepCount }).map((_, i) => (
              <View
                key={i}
                className={`flex-1 h-1.5 rounded-full ${
                  i === currentSubtaskIndex ? "bg-accent" : "bg-white/10"
                }`}
              />
            ))}
          </View>
        </GlassCard>

        {/* Sound row */}
        <GlassCard className="p-4 flex-row items-center mb-auto">
          <Ionicons name="rainy" size={20} color={theme.colors.accent} />
          <Text className="text-text-secondary text-sm ml-3 flex-1">Rain sounds</Text>
          <View className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
            <View className="w-3/4 h-full bg-accent/50 rounded-full" />
          </View>
        </GlassCard>

        {/* End early */}
        <TouchableOpacity onPress={handleEndEarly} className="items-center py-6">
          <Text className="text-text-muted text-sm underline">End early</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
