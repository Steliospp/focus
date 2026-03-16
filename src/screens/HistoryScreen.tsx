import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { SessionCard } from "../components/ui/SessionCard";
import { SoftGradientBg } from "../components/ui/SoftGradientBg";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getAllSessions, type Session } from "../services/storage";

const FILTERS = ["All", "This week", "Projects", "Study"];

function sessionEmoji(s: Session): string {
  if (s.taskType === "study") return "📚";
  if (s.taskType === "tiny" || s.durationMinutes <= 10) return "🧹";
  if (s.taskType === "project") return "📋";
  return "📝";
}

function sessionBadge(s: Session): { label: string; variant: "green" | "amber" | "red" | "accent" } {
  if (s.taskType === "tiny" || s.durationMinutes <= 10)
    return { label: "Tiny", variant: "accent" };
  if (s.verified) return { label: "Full", variant: "green" };
  return { label: "Partial", variant: "amber" };
}

function groupSessionsByDate(sessions: Session[]): { today: Session[]; yesterday: Session[]; earlier: Session[] } {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const today: Session[] = [];
  const yesterdayList: Session[] = [];
  const earlier: Session[] = [];

  for (const s of sessions) {
    const date = s.completedAt?.slice(0, 10);
    if (!date) continue;
    if (date === todayStr) today.push(s);
    else if (date === yesterdayStr) yesterdayList.push(s);
    else earlier.push(s);
  }

  earlier.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  return { today, yesterday: yesterdayList, earlier };
}

function filterSessions(sessions: Session[], filter: string): Session[] {
  if (filter === "All") return sessions;
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);

  if (filter === "This week") {
    return sessions.filter((s) => (s.completedAt ?? "").slice(0, 10) >= weekAgoStr);
  }
  if (filter === "Projects") {
    return sessions.filter((s) => s.taskType === "project");
  }
  if (filter === "Study") {
    return sessions.filter((s) => s.taskType === "study");
  }
  return sessions;
}

export function HistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeFilter, setActiveFilter] = useState("All");
  const [sessions, setSessions] = useState<Session[]>([]);

  const load = useCallback(() => {
    getAllSessions().then(setSessions);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = filterSessions(sessions, activeFilter);
  const { today, yesterday, earlier } = groupSessionsByDate(filtered);

  const thisMonth = sessions.filter((s) => {
    const d = s.completedAt?.slice(0, 7);
    const thisMonthStr = new Date().toISOString().slice(0, 7);
    return d === thisMonthStr;
  }).length;

  const renderSection = (label: string, list: Session[]) => {
    if (list.length === 0) return null;
    return (
      <>
        <Text className="text-text-muted text-xs uppercase tracking-widest font-semibold mb-4">
          {label}
        </Text>
        <View className="gap-3 mb-8">
          {list.map((s) => (
            <SessionCard
              key={s.id}
              emoji={sessionEmoji(s)}
              title={s.taskTitle}
              subtitle={s.completedAt ? new Date(s.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined}
              badge={sessionBadge(s)}
              time={`${s.durationMinutes}m`}
            />
          ))}
        </View>
      </>
    );
  };

  return (
    <SoftGradientBg>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="flex-row items-start justify-between mt-1 mb-6">
            <View>
              <Text className="text-text-primary text-3xl font-bold tracking-tight">
                History
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate("WeeklyInsights")}>
                <Text className="text-text-muted text-base mt-1">
                  {thisMonth} session{thisMonth !== 1 ? "s" : ""} this month
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("Settings")}
              className="w-11 h-11 rounded-full bg-white/10 items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Filter pills - reference style: soft selected state */}
          <View className="flex-row flex-wrap gap-3 mb-8">
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.8}
                className={`px-5 py-3 rounded-card-lg ${
                  f === activeFilter
                    ? "bg-accent"
                    : "bg-white/5"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    f === activeFilter ? "text-bg-primary" : "text-text-secondary"
                  }`}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {renderSection("Today", today)}
          {renderSection("Yesterday", yesterday)}
          {renderSection("Earlier", earlier)}
          <View className="h-10" />
        </ScrollView>
      </SafeAreaView>
    </SoftGradientBg>
  );
}
