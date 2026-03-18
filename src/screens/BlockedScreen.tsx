import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

import { MascotOrb } from "../components/ui/MascotOrb";
import { useAppStore } from "../store/useAppStore";
import { fonts } from "../constants/fonts";

type Nav = NativeStackNavigationProp<any>;

export function BlockedScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<{ params: { app?: string } }>>();
  const appName = route.params?.app ?? "This app";

  const currentTaskId = useAppStore((s) => s.currentTaskId);
  const task = useAppStore((s) =>
    s.tasks.find((t) => t.id === s.currentTaskId)
  );
  const emergencyUnlocksRemaining = useAppStore(
    (s) => s.emergencyUnlocksRemaining
  );
  const useEmergencyUnlock = useAppStore((s) => s.useEmergencyUnlock);
  const setCurrentTask = useAppStore((s) => s.setCurrentTask);
  const updateTask = useAppStore((s) => s.updateTask);

  const handleBackToWork = () => {
    if (currentTaskId) {
      navigation.navigate("ActiveTask", { taskId: currentTaskId });
    } else {
      navigation.navigate("Tabs");
    }
  };

  const handleEmergencyUnlock = () => {
    if (emergencyUnlocksRemaining <= 0) {
      Alert.alert(
        "No unlocks remaining",
        "No emergency unlocks remaining this week."
      );
      return;
    }

    Alert.alert(
      "Emergency unlock",
      `Are you sure? You have ${emergencyUnlocksRemaining} unlock${emergencyUnlocksRemaining === 1 ? "" : "s"} left this week.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlock",
          style: "destructive",
          onPress: () => {
            useEmergencyUnlock("Emergency unlock requested");
            if (currentTaskId) {
              updateTask(currentTaskId, { status: "todo" });
            }
            setCurrentTask(null);
            navigation.navigate("Tabs");
          },
        },
      ]
    );
  };

  // Calculate progress
  const elapsedMs = task?.startedAt
    ? Date.now() - new Date(task.startedAt).getTime()
    : 0;
  const totalMs = (task?.estimatedMinutes ?? 25) * 60 * 1000;
  const progressPct = Math.min((elapsedMs / totalMs) * 100, 100);
  const elapsedMin = Math.round(elapsedMs / 60000);

  return (
    <View style={{ flex: 1, backgroundColor: "#FAF8F4" }}>
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* Spacer to push content toward center */}
        <View style={{ flex: 1 }} />

        {/* Centered content */}
        <View style={{ alignItems: "center" }}>
          {/* MascotOrb */}
          <MascotOrb mood="warning" size={80} />

          {/* "Not yet." */}
          <Text
            style={{
              fontFamily: "CormorantGaramond-Italic",
              fontSize: 42,
              color: "#1C1917",
              textAlign: "center",
              marginTop: 24,
            }}
          >
            Not yet.
          </Text>

          {/* Emoji */}
          <Text
            style={{
              fontSize: 28,
              textAlign: "center",
              marginTop: 8,
            }}
          >
            {"\u{1F440}"}
          </Text>

          {/* Contextual message */}
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 16,
              color: "#78716C",
              textAlign: "center",
              marginTop: 16,
              maxWidth: 280,
              lineHeight: 24,
            }}
          >
            You're {elapsedMin} min into your{" "}
            {task ? `"${task.name}"` : "current"} session. {appName} will be
            here when you're done.
          </Text>

          {/* Progress bar */}
          <View
            style={{
              width: "100%",
              height: 4,
              borderRadius: 9999,
              backgroundColor: "#E7E5E4",
              marginTop: 32,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${Math.round(progressPct)}%` as any,
                height: "100%",
                borderRadius: 9999,
                backgroundColor: "#D97706",
              }}
            />
          </View>
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Bottom actions */}
        <View style={{ alignItems: "center", paddingBottom: 24 }}>
          {/* Back to work link */}
          <TouchableOpacity
            onPress={handleBackToWork}
            activeOpacity={0.7}
            style={{ paddingVertical: 12 }}
          >
            <Text
              style={{
                fontFamily: fonts.bodyMedium,
                fontSize: 16,
                color: "#D97706",
              }}
            >
              back to work {"\u2192"}
            </Text>
          </TouchableOpacity>

          {/* Emergency unlock - subtle */}
          <TouchableOpacity
            onPress={handleEmergencyUnlock}
            activeOpacity={0.7}
            style={{ paddingVertical: 8, marginTop: 32 }}
          >
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 12,
                color: "#A8A29E",
              }}
            >
              emergency unlock
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
