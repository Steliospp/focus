import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

import { useAppStore } from "../store/useAppStore";

type Nav = NativeStackNavigationProp<any>;

function formatWriteDate(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const month = d.toLocaleDateString("en-US", { month: "long" }).toLowerCase();
  const date = d.getDate();
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).toLowerCase();
  return `${day}, ${month} ${date} · ${time}`;
}

export function JournalWriteScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<{ params: { entryId: string } }>>();
  const entryId = route.params.entryId;

  const entry = useAppStore((s) =>
    s.journalEntries.find((e) => e.id === entryId)
  );
  const tasks = useAppStore((s) => s.tasks);
  const updateJournalEntry = useAppStore((s) => s.updateJournalEntry);
  const removeJournalEntry = useAppStore((s) => s.removeJournalEntry);

  const isAutoEntry = entry?.type === "auto";
  const linkedTask = entry?.taskId
    ? tasks.find((t) => t.id === entry.taskId)
    : null;

  const [content, setContent] = useState(entry?.content ?? "");
  const [hasTyped, setHasTyped] = useState((entry?.content ?? "").length > 0);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save every 3 seconds for manual entries
  useEffect(() => {
    if (isAutoEntry || !entry) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      updateJournalEntry(entryId, {
        content,
        updatedAt: new Date().toISOString(),
      });
    }, 3000);
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, [content]);

  const handleTextChange = (text: string) => {
    setContent(text);
    if (!hasTyped && text.length > 0) setHasTyped(true);
  };

  const handleDone = useCallback(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    if (!isAutoEntry && entry) {
      // If empty, remove the entry
      if (content.trim().length === 0) {
        removeJournalEntry(entryId);
      } else {
        updateJournalEntry(entryId, {
          content,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    navigation.goBack();
  }, [content, entryId, isAutoEntry, entry]);

  const handleDelete = () => {
    Alert.alert("Delete entry?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          removeJournalEntry(entryId);
          navigation.goBack();
        },
      },
    ]);
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  if (!entry) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FAF8F4" }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontFamily: "DMSans-Regular", fontSize: 16, color: "#A8A29E" }}>
            Entry not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Auto entry (task log) — read only ──
  if (isAutoEntry) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FAF8F4" }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 60 }}
        >
          {/* Date */}
          <Text
            style={{
              fontFamily: "DMSans-Regular",
              fontSize: 13,
              color: "#A8A29E",
              textAlign: "center",
              marginBottom: 32,
              marginTop: 8,
            }}
          >
            {formatWriteDate(entry.createdAt)}
          </Text>

          {/* Task completion info */}
          {linkedTask && (
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontFamily: "CormorantGaramond-Italic",
                  fontSize: 22,
                  color: "#1C1917",
                  marginBottom: 8,
                }}
              >
                completed: {linkedTask.name}
              </Text>
              {entry.taskScore != null && (
                <Text
                  style={{
                    fontFamily: "DMSans-Regular",
                    fontSize: 15,
                    color: "#78716C",
                    marginBottom: 12,
                  }}
                >
                  score: {entry.taskScore}/100
                </Text>
              )}
              {linkedTask.aiGrade?.comment && (
                <Text
                  style={{
                    fontFamily: "DMSans-Regular",
                    fontSize: 14,
                    color: "#A8A29E",
                    lineHeight: 20,
                    marginBottom: 16,
                  }}
                >
                  {linkedTask.aiGrade.comment}
                </Text>
              )}
            </View>
          )}

          {/* Reflection content */}
          {entry.content.length > 0 && (
            <View>
              <Text
                style={{
                  fontFamily: "DMSans-Regular",
                  fontSize: 12,
                  color: "#A8A29E",
                  textTransform: "lowercase",
                  marginBottom: 6,
                }}
              >
                your reflection:
              </Text>
              <Text
                style={{
                  fontFamily: "CormorantGaramond-Italic",
                  fontSize: 18,
                  color: "#1C1917",
                  lineHeight: 28,
                }}
              >
                {entry.content}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom: close only */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingBottom: 16,
          }}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={{ fontFamily: "DMSans-Regular", fontSize: 15, color: "#78716C" }}>
              close
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Manual entry — write/edit ──
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
            height: 40,
          }}
        >
          {/* Done — appears after typing */}
          {hasTyped ? (
            <TouchableOpacity onPress={handleDone} hitSlop={12}>
              <Text
                style={{
                  fontFamily: "DMSans-Regular",
                  fontSize: 15,
                  color: "#A8A29E",
                }}
              >
                done
              </Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <View />
        </View>

        {/* Date */}
        <Text
          style={{
            fontFamily: "DMSans-Regular",
            fontSize: 13,
            color: "#A8A29E",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          {formatWriteDate(entry.createdAt)}
        </Text>

        {/* Writing canvas */}
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 24 }}
          keyboardDismissMode="interactive"
        >
          <TextInput
            value={content}
            onChangeText={handleTextChange}
            multiline
            autoFocus
            style={{
              fontFamily: "CormorantGaramond-Regular",
              fontSize: 20,
              color: "#1C1917",
              lineHeight: 32,
              minHeight: 300,
              textAlignVertical: "top",
            }}
          />
        </ScrollView>

        {/* Bottom bar */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 24,
            paddingVertical: 12,
          }}
        >
          {/* Edit/delete for existing entries with content */}
          {entry.content.length > 0 ? (
            <TouchableOpacity onPress={handleDelete} activeOpacity={0.7}>
              <Text style={{ fontFamily: "DMSans-Regular", fontSize: 13, color: "#A8A29E" }}>
                delete
              </Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}

          {/* Word count */}
          <Text
            style={{
              fontFamily: "DMSans-Regular",
              fontSize: 12,
              color: "#D6D3D1",
            }}
          >
            {wordCount > 0 ? `${wordCount} words` : ""}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
