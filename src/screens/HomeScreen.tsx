import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../components/ui/GlassCard";
import { SectionLabel } from "../components/ui/SectionLabel";
import { SoftGradientBg } from "../components/ui/SoftGradientBg";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import type { RootStackParamList } from "../navigation/RootNavigator";
import {
  getActiveTask,
  getAllSessions,
  type ActiveTask,
  type Session,
} from "../services/storage";
import { theme } from "../theme";

function formatTimeAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const mins = Math.round((now.getTime() - d.getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [recent, setRecent] = useState<Session[]>([]);

  const load = () => {
    getActiveTask().then(setActiveTask);
    getAllSessions().then((sessions) => {
      const withDate = sessions.filter((s) => s.completedAt);
      withDate.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
      setRecent(withDate.slice(0, 10));
    });
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
          {activeTask ? (
            <>
              <GlassCard
                className="p-5 mb-4"
                style={{ borderColor: theme.colors.semantic.lockRed + "40", borderWidth: 1 }}
              >
                <View className="flex-row items-center mb-2">
                  <Ionicons
                    name="lock-closed"
                    size={24}
                    color={theme.colors.semantic.lockRed}
                  />
                  <Text
                    className="text-lg font-bold ml-2"
                    style={{ color: theme.colors.semantic.lockRed }}
                  >
                    {activeTask.blockedAppIds.length} app
                    {activeTask.blockedAppIds.length !== 1 ? "s" : ""} locked
                  </Text>
                </View>
                <Text className="text-text-muted text-sm mb-1">Working on:</Text>
                <Text className="text-text-primary text-xl font-semibold mb-4">
                  {activeTask.title}
                </Text>
                <PrimaryButton
                  title="PROVE COMPLETION"
                  onPress={() => navigation.navigate("ProofGate")}
                />
              </GlassCard>
              <Text className="text-text-muted text-sm mb-2">Currently blocked:</Text>
              <View className="flex-row flex-wrap gap-2 mb-6">
                {(activeTask.blockedAppNames ?? activeTask.blockedAppIds).map((name) => (
                  <View
                    key={name}
                    className="px-3 py-1.5 rounded-full bg-white/10"
                  >
                    <Text className="text-text-secondary text-sm">{name}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <TouchableOpacity
            onPress={() => navigation.navigate("CreateTask", {})}
            activeOpacity={0.8}
            className="mb-6"
          >
            <View className="border-2 border-dashed border-white/10 rounded-card-lg py-6 items-center">
              <Ionicons name="add-circle-outline" size={28} color={theme.colors.accent} />
              <Text className="text-text-muted text-base mt-2">NEW TASK</Text>
            </View>
          </TouchableOpacity>

          <SectionLabel label="Recent" className="mb-3" />
          <View className="gap-2 mb-10">
            {recent.map((s) => (
              <View
                key={s.id}
                className="flex-row items-center py-3 border-b border-white/5"
              >
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.semantic.green} />
                <Text className="text-text-primary flex-1 ml-3" numberOfLines={1}>
                  {s.taskTitle}
                </Text>
                <Text className="text-text-muted text-sm">
                  {s.completedAt ? formatTimeAgo(s.completedAt) : ""}
                </Text>
              </View>
            ))}
            {recent.length === 0 && (
              <Text className="text-text-muted text-sm py-4">No completed tasks yet</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </SoftGradientBg>
  );
}
