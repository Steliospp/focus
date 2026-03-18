import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "../store/useAppStore";
import type { JournalEntry } from "../store/useAppStore";

// ── Helpers ──────────────────────────────────────────────────────────

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const month = d.toLocaleDateString("en-US", { month: "long" }).toLowerCase();
  const date = d.getDate();
  return `${day}, ${month} ${date}`;
}

function groupByDate(entries: JournalEntry[]): Record<string, JournalEntry[]> {
  const groups: Record<string, JournalEntry[]> = {};
  for (const entry of entries) {
    if (!groups[entry.date]) groups[entry.date] = [];
    groups[entry.date].push(entry);
  }
  return groups;
}

function getMondayISO(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ── Component ────────────────────────────────────────────────────────

export function JournalScreen() {
  const entries = useAppStore((s) => s.journalEntries);
  const weeklyInsights = useAppStore((s) => s.weeklyInsights);
  const tasks = useAppStore((s) => s.tasks);
  const addJournalEntry = useAppStore((s) => s.addJournalEntry);
  const updateJournalEntry = useAppStore((s) => s.updateJournalEntry);

  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Current week insight
  const currentMonday = getMondayISO(new Date());
  const currentInsight = weeklyInsights.find((i) => i.weekOf === currentMonday);

  // Sorted entries (newest first)
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries],
  );

  const grouped = useMemo(() => groupByDate(sortedEntries), [sortedEntries]);
  const sortedDates = useMemo(
    () => Object.keys(grouped).sort((a, b) => b.localeCompare(a)),
    [grouped],
  );

  // Selected entry object
  const activeEntry = selectedEntry
    ? entries.find((e) => e.id === selectedEntry) ?? null
    : null;

  // Auto-save debounce for composing
  useEffect(() => {
    if (!composing && !selectedEntry) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (selectedEntry && activeEntry && activeEntry.type === "manual") {
      debounceRef.current = setTimeout(() => {
        updateJournalEntry(selectedEntry, {
          content: draftContent,
          updatedAt: new Date().toISOString(),
        });
      }, 3000);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draftContent, composing, selectedEntry, activeEntry, updateJournalEntry]);

  // ── Start composing ────────────────────────────────────────────────
  const handleNewEntry = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
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
    setDraftContent("");
    setSelectedEntry(entry.id);
    setComposing(true);
  }, [addJournalEntry]);

  // ── Done editing ───────────────────────────────────────────────────
  const handleDone = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (selectedEntry) {
      updateJournalEntry(selectedEntry, {
        content: draftContent,
        updatedAt: new Date().toISOString(),
      });
    }
    setSelectedEntry(null);
    setComposing(false);
    setDraftContent("");
  }, [selectedEntry, draftContent, updateJournalEntry]);

  // ── Tap entry ──────────────────────────────────────────────────────
  const handleTapEntry = useCallback(
    (entry: JournalEntry) => {
      setSelectedEntry(entry.id);
      setDraftContent(entry.content);
      if (entry.type === "manual") setComposing(true);
      else setComposing(false);
    },
    [],
  );

  // ── Back ───────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    handleDone();
  }, [handleDone]);

  // ── Detail / Compose View ─────────────────────────────────────────
  if (selectedEntry || composing) {
    const linkedTask =
      activeEntry?.taskId
        ? tasks.find((t) => t.id === activeEntry.taskId)
        : null;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FAF8F4" }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Top bar */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 24,
              paddingTop: 8,
              paddingBottom: 12,
            }}
          >
            <TouchableOpacity onPress={handleBack} hitSlop={12}>
              <Text
                style={{
                  fontFamily: "DMSans-Medium",
                  fontSize: 16,
                  color: "#78716C",
                }}
              >
                {"<"} back
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDone} hitSlop={12}>
              <Text
                style={{
                  fontFamily: "DMSans-Medium",
                  fontSize: 16,
                  color: "#D97706",
                }}
              >
                done
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date */}
          {activeEntry && (
            <Text
              style={{
                fontFamily: "DMSans-Medium",
                fontSize: 13,
                color: "#A8A29E",
                paddingHorizontal: 24,
                marginBottom: 16,
              }}
            >
              {formatDateHeader(activeEntry.date)}
            </Text>
          )}

          {/* Auto entry task info */}
          {activeEntry?.type === "auto" && linkedTask && (
            <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
              <Text
                style={{
                  fontFamily: "CormorantGaramond-Italic",
                  fontSize: 20,
                  color: "#1C1917",
                  marginBottom: 4,
                }}
              >
                Completed {linkedTask.name}
              </Text>
              {activeEntry.taskScore != null && (
                <Text
                  style={{
                    fontFamily: "DMSans-Regular",
                    fontSize: 14,
                    color: "#78716C",
                  }}
                >
                  Score: {activeEntry.taskScore}/100
                </Text>
              )}
            </View>
          )}

          {/* Content area */}
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 24 }}
            keyboardDismissMode="interactive"
          >
            {composing || activeEntry?.type === "manual" ? (
              <TextInput
                value={draftContent}
                onChangeText={setDraftContent}
                placeholder="what's on your mind?"
                placeholderTextColor="#A8A29E"
                multiline
                autoFocus={composing}
                style={{
                  fontFamily: "DMSans-Regular",
                  fontSize: 17,
                  color: "#1C1917",
                  lineHeight: 26,
                  minHeight: 200,
                  textAlignVertical: "top",
                }}
              />
            ) : (
              <Text
                style={{
                  fontFamily: "DMSans-Regular",
                  fontSize: 17,
                  color: "#1C1917",
                  lineHeight: 26,
                }}
              >
                {activeEntry?.content}
              </Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Journal Home View ──────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAF8F4" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <Text
          style={{
            fontFamily: "CormorantGaramond-Italic",
            fontSize: 32,
            color: "#1C1917",
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 20,
          }}
        >
          your journal
        </Text>

        {/* Weekly insight */}
        {currentInsight && (
          <View
            style={{
              marginHorizontal: 24,
              marginBottom: 28,
              backgroundColor: "rgba(245,158,11,0.08)",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <Text
              style={{
                fontFamily: "CormorantGaramond-Italic",
                fontSize: 17,
                color: "#1C1917",
                lineHeight: 24,
              }}
            >
              {currentInsight.content}
            </Text>
            <Text
              style={{
                fontFamily: "DMSans-Regular",
                fontSize: 12,
                color: "#A8A29E",
                marginTop: 12,
              }}
            >
              {currentInsight.tasksCompleted} tasks completed{" "}
              {"  "}
              {currentInsight.totalFocusMinutes} min focused
            </Text>
          </View>
        )}

        {/* Entries grouped by date */}
        {sortedDates.map((date) => (
          <View key={date} style={{ marginBottom: 8 }}>
            {/* Date header */}
            <Text
              style={{
                fontFamily: "DMSans-Medium",
                fontSize: 13,
                color: "#78716C",
                paddingHorizontal: 24,
                marginBottom: 12,
                textTransform: "lowercase",
              }}
            >
              {formatDateHeader(date)}
            </Text>

            {/* Entries for this date */}
            {grouped[date].map((entry) => {
              const linkedTask =
                entry.taskId
                  ? tasks.find((t) => t.id === entry.taskId)
                  : null;
              const preview =
                entry.type === "auto" && linkedTask
                  ? `Completed ${linkedTask.name} \u00B7 ${entry.taskScore ?? "?"}/100`
                  : entry.content.slice(0, 60) + (entry.content.length > 60 ? "..." : "");

              return (
                <TouchableOpacity
                  key={entry.id}
                  onPress={() => handleTapEntry(entry)}
                  activeOpacity={0.6}
                  style={{ paddingHorizontal: 24, marginBottom: 24 }}
                >
                  <Text
                    style={{
                      fontFamily: "CormorantGaramond-Italic",
                      fontSize: 18,
                      color: "#1C1917",
                      marginBottom: 4,
                    }}
                    numberOfLines={2}
                  >
                    {preview}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "DMSans-Regular",
                      fontSize: 12,
                      color: "#A8A29E",
                    }}
                  >
                    {formatTime(entry.createdAt)}
                    {"  \u00B7  "}
                    {entry.type === "auto" ? "from task" : "note"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Empty state */}
        {sortedEntries.length === 0 && (
          <View style={{ paddingHorizontal: 24, paddingTop: 40, alignItems: "center" }}>
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

      {/* Bottom CTA */}
      <TouchableOpacity
        onPress={handleNewEntry}
        activeOpacity={0.7}
        style={{
          paddingHorizontal: 24,
          paddingVertical: 16,
          borderTopWidth: 1,
          borderTopColor: "rgba(0,0,0,0.04)",
        }}
      >
        <Text
          style={{
            fontFamily: "DMSans-Medium",
            fontSize: 15,
            color: "#D97706",
          }}
        >
          {"write something \u2192"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
