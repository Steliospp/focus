import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAppStore } from "../store/useAppStore";
import type { JournalEntry, WeeklyInsight } from "../store/useAppStore";

type Nav = NativeStackNavigationProp<any>;

// ── Helpers ──────────────────────────────────────────────────────────

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const month = d.toLocaleDateString("en-US", { month: "long" }).toLowerCase();
  const date = d.getDate();
  return `${day}, ${month} ${date}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
}

function getMondayISO(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

interface DateGroup {
  date: string;
  entries: JournalEntry[];
  insight: WeeklyInsight | null; // weekly insight pinned to this week's Monday
}

function groupByDate(
  entries: JournalEntry[],
  insights: WeeklyInsight[],
): DateGroup[] {
  const groups: Record<string, JournalEntry[]> = {};
  for (const entry of entries) {
    if (!groups[entry.date]) groups[entry.date] = [];
    groups[entry.date].push(entry);
  }

  // Build insight lookup by the Sunday they were generated
  // Pin each insight to its weekOf (Monday) date
  const insightByMonday: Record<string, WeeklyInsight> = {};
  for (const ins of insights) {
    insightByMonday[ins.weekOf] = ins;
  }

  const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  const result: DateGroup[] = [];
  const usedInsights = new Set<string>();

  for (const date of dates) {
    const monday = getMondayISO(new Date(date + "T12:00:00"));
    const insight = insightByMonday[monday] && !usedInsights.has(monday)
      ? insightByMonday[monday]
      : null;
    if (insight) usedInsights.add(monday);

    result.push({
      date,
      entries: groups[date].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      insight,
    });
  }

  return result;
}

// ── Component ────────────────────────────────────────────────────────

export function JournalScreen() {
  const navigation = useNavigation<Nav>();
  const entries = useAppStore((s) => s.journalEntries);
  const weeklyInsights = useAppStore((s) => s.weeklyInsights);
  const tasks = useAppStore((s) => s.tasks);
  const addJournalEntry = useAppStore((s) => s.addJournalEntry);

  const groups = useMemo(
    () => groupByDate(entries, weeklyInsights),
    [entries, weeklyInsights],
  );

  const today = todayISO();
  const hasTodayGroup = groups.some((g) => g.date === today);

  // ── New entry ────────────────────────────────────────────────────
  const handleNewEntry = useCallback(() => {
    const now = new Date().toISOString();
    const entry: JournalEntry = {
      id: `journal-manual-${Date.now()}`,
      date: today,
      content: "",
      createdAt: now,
      updatedAt: now,
      type: "manual",
    };
    addJournalEntry(entry);
    navigation.navigate("JournalEntry", { entryId: entry.id });
  }, [addJournalEntry, navigation, today]);

  // ── Tap entry ────────────────────────────────────────────────────
  const handleTapEntry = useCallback(
    (entry: JournalEntry) => {
      navigation.navigate("JournalEntry", { entryId: entry.id });
    },
    [navigation],
  );

  // ── Render entry row ─────────────────────────────────────────────
  const renderEntry = (entry: JournalEntry) => {
    const linkedTask = entry.taskId
      ? tasks.find((t) => t.id === entry.taskId)
      : null;

    // AUTO-ENTRY (task log)
    if (entry.type === "auto" && linkedTask) {
      return (
        <TouchableOpacity
          key={entry.id}
          onPress={() => handleTapEntry(entry)}
          activeOpacity={0.6}
          style={{ paddingHorizontal: 24, marginBottom: 20 }}
        >
          <Text
            style={{
              fontFamily: "DMSans-Regular",
              fontSize: 15,
              color: "#A8A29E",
            }}
            numberOfLines={1}
          >
            completed: {linkedTask.name}
            {entry.taskScore != null ? ` · ${entry.taskScore}/100` : ""}
          </Text>
          {entry.content.length > 0 && (
            <Text
              style={{
                fontFamily: "CormorantGaramond-Italic",
                fontSize: 15,
                color: "#78716C",
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {entry.content}
            </Text>
          )}
          <Text
            style={{
              fontFamily: "DMSans-Regular",
              fontSize: 11,
              color: "#D6D3D1",
              marginTop: 2,
            }}
          >
            {formatTime(entry.createdAt)} · from task
          </Text>
        </TouchableOpacity>
      );
    }

    // FREE WRITE (manual)
    const firstLine = entry.content.split("\n")[0] || "";
    const preview = firstLine.length > 80 ? firstLine.slice(0, 80) + "..." : firstLine;

    return (
      <TouchableOpacity
        key={entry.id}
        onPress={() => handleTapEntry(entry)}
        activeOpacity={0.6}
        style={{ paddingHorizontal: 24, marginBottom: 20 }}
      >
        <Text
          style={{
            fontFamily: "CormorantGaramond-Italic",
            fontSize: 18,
            color: "#1C1917",
          }}
          numberOfLines={2}
        >
          {preview || "empty entry"}
        </Text>
        <Text
          style={{
            fontFamily: "DMSans-Regular",
            fontSize: 11,
            color: "#D6D3D1",
            marginTop: 2,
          }}
        >
          {formatTime(entry.createdAt)} · note
        </Text>
      </TouchableOpacity>
    );
  };

  // ── Render weekly insight ────────────────────────────────────────
  const renderInsight = (insight: WeeklyInsight) => (
    <View
      key={insight.id}
      style={{
        paddingHorizontal: 24,
        marginBottom: 24,
        flexDirection: "row",
      }}
    >
      {/* Amber left border */}
      <View
        style={{
          width: 2,
          backgroundColor: "#D97706",
          borderRadius: 1,
          marginRight: 14,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: "DMSans-Medium",
            fontSize: 11,
            color: "#D97706",
            textTransform: "lowercase",
            marginBottom: 6,
          }}
        >
          ✦ this week
        </Text>
        <Text
          style={{
            fontFamily: "CormorantGaramond-Italic",
            fontSize: 17,
            color: "#1C1917",
            lineHeight: 24,
          }}
        >
          {insight.content}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAF8F4" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* Header */}
        <Text
          style={{
            fontFamily: "CormorantGaramond-Italic",
            fontSize: 32,
            color: "#1C1917",
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 24,
          }}
        >
          your journal
        </Text>

        {/* Today's section — always show, with open invite to write */}
        {!hasTodayGroup && (
          <View style={{ marginBottom: 8 }}>
            <Text
              style={{
                fontFamily: "DMSans-Regular",
                fontSize: 13,
                color: "#A8A29E",
                paddingHorizontal: 24,
                marginBottom: 14,
              }}
            >
              {formatDateHeader(today)}
            </Text>

            {/* Open diary line */}
            <TouchableOpacity
              onPress={handleNewEntry}
              activeOpacity={0.6}
              style={{ paddingHorizontal: 24, marginBottom: 20 }}
            >
              <Text
                style={{
                  fontFamily: "CormorantGaramond-Italic",
                  fontSize: 18,
                  color: "#A8A29E",
                }}
              >
                · what's on your mind today?
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Grouped entries */}
        {groups.map((group) => (
          <View key={group.date} style={{ marginBottom: 8 }}>
            {/* Date header */}
            <Text
              style={{
                fontFamily: "DMSans-Regular",
                fontSize: 13,
                color: "#A8A29E",
                paddingHorizontal: 24,
                marginBottom: 14,
              }}
            >
              {formatDateHeader(group.date)}
            </Text>

            {/* "what's on your mind" for today's group */}
            {group.date === today && (
              <TouchableOpacity
                onPress={handleNewEntry}
                activeOpacity={0.6}
                style={{ paddingHorizontal: 24, marginBottom: 20 }}
              >
                <Text
                  style={{
                    fontFamily: "CormorantGaramond-Italic",
                    fontSize: 18,
                    color: "#A8A29E",
                  }}
                >
                  · what's on your mind today?
                </Text>
              </TouchableOpacity>
            )}

            {/* Weekly insight pinned at top of its week */}
            {group.insight && renderInsight(group.insight)}

            {/* Entries */}
            {group.entries.map(renderEntry)}
          </View>
        ))}

        {/* Empty state */}
        {entries.length === 0 && (
          <View style={{ paddingHorizontal: 24, paddingTop: 32, alignItems: "center" }}>
            <Text
              style={{
                fontFamily: "CormorantGaramond-Italic",
                fontSize: 20,
                color: "#A8A29E",
                textAlign: "center",
                lineHeight: 28,
              }}
            >
              your journal is empty.{"\n"}complete a task or write something to get started.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating amber ✦ shortcut — bottom right */}
      <TouchableOpacity
        onPress={handleNewEntry}
        activeOpacity={0.7}
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "rgba(217,119,6,0.1)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 18, color: "#D97706" }}>✦</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
