import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  LayoutAnimation,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore, type Horizon } from "../store/useAppStore";
import { parseListText, type ParsedListItem } from "../services/ai";
import { fonts } from "../constants/fonts";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/RootNavigator";

const HORIZON_EMOJI: Record<Horizon, string> = {
  today: "now",
  soon: "soon",
  someday: "later",
};

export function PasteListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { addTask, addContext, contexts } = useAppStore();

  const [rawText, setRawText] = useState("");
  const [phase, setPhase] = useState<"input" | "parsing" | "review" | "done">("input");
  const [parsedItems, setParsedItems] = useState<ParsedListItem[]>([]);
  const [detectedContexts, setDetectedContexts] = useState<Array<{ name: string; color: string }>>([]);

  const handleParse = async () => {
    if (!rawText.trim()) return;
    setPhase("parsing");

    try {
      const result = await parseListText(rawText);
      setParsedItems(result.items);
      setDetectedContexts(result.detectedContexts);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setPhase("review");
    } catch {
      setPhase("input");
    }
  };

  const handleConfirm = () => {
    // Create any new contexts
    for (const ctx of detectedContexts) {
      const exists = contexts.find(
        (c) => c.name.toLowerCase() === ctx.name.toLowerCase()
      );
      if (!exists) {
        addContext({
          id: `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          name: ctx.name,
          color: ctx.color,
          isDefault: ctx.name.toLowerCase() === "life",
        });
      }
    }

    // Create tasks
    for (const item of parsedItems) {
      const existingCtx = contexts.find(
        (c) => c.name.toLowerCase() === (item.contextName ?? "life").toLowerCase()
      );
      const newCtx = detectedContexts.find(
        (c) => c.name.toLowerCase() === (item.contextName ?? "life").toLowerCase()
      );

      const contextId =
        existingCtx?.id ??
        (newCtx ? `ctx-${newCtx.name.toLowerCase().replace(/\s+/g, "-")}` : "ctx-life");

      addTask({
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: item.name,
        description: "",
        category: "other",
        estimatedMinutes: 30,
        deadline: item.deadline,
        blockedApps: [],
        proofType: "honor",
        status: "todo",
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        aiAnalysis: null,
        proofSubmission: null,
        aiGrade: null,
        reflectionAnswers: {},
        horizon: item.horizon,
        contextId,
        listSubtasks: item.subtasks.map((text, i) => ({
          id: `ls-${Date.now()}-${i}`,
          text,
          done: false,
        })),
      });
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPhase("done");
  };

  const handleRemoveItem = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setParsedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Input Phase ────────────────────────────────────────────────────

  if (phase === "input" || phase === "parsing") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.inputContent}>
          <Text style={styles.heroText}>got a list somewhere already?</Text>
          <Text style={styles.subText}>paste it here →</Text>

          <TextInput
            style={styles.textInput}
            multiline
            placeholder={"Capsô\n- finish prototype\n- send to Alex\n\nCS 150\n- Assignment due Saturday\n- Exam 2\n\nURGENT call dentist\nclean my house"}
            placeholderTextColor={theme.colors.text.muted}
            value={rawText}
            onChangeText={setRawText}
            textAlignVertical="top"
            autoFocus
          />

          <TouchableOpacity
            style={[styles.parseBtn, !rawText.trim() && styles.parseBtnDisabled]}
            onPress={handleParse}
            disabled={!rawText.trim() || phase === "parsing"}
          >
            {phase === "parsing" ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.parseBtnText}>organize this</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Done Phase ─────────────────────────────────────────────────────

  if (phase === "done") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.doneContent}>
          <Text style={styles.doneEmoji}>✓</Text>
          <Text style={styles.doneTitle}>
            {parsedItems.length} tasks organized
          </Text>
          <Text style={styles.doneSubtitle}>
            across {detectedContexts.length} context{detectedContexts.length !== 1 ? "s" : ""}
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.doneBtnText}>see my list</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Review Phase ───────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setPhase("input")}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          found {parsedItems.length} tasks
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Detected contexts */}
      <View style={styles.contextsRow}>
        {detectedContexts.map((ctx) => (
          <View key={ctx.name} style={styles.contextChip}>
            <View style={[styles.contextChipDot, { backgroundColor: ctx.color }]} />
            <Text style={styles.contextChipText}>{ctx.name}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        style={styles.reviewList}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {parsedItems.map((item, index) => {
          const ctxInfo = detectedContexts.find(
            (c) => c.name === item.contextName
          );
          return (
            <View key={index} style={styles.reviewRow}>
              <View style={styles.reviewRowMain}>
                <View
                  style={[
                    styles.reviewDot,
                    { backgroundColor: ctxInfo?.color ?? "#78716C" },
                  ]}
                />
                <View style={styles.reviewInfo}>
                  <Text style={styles.reviewName}>{item.name}</Text>
                  <View style={styles.reviewMeta}>
                    <Text style={styles.reviewHorizon}>
                      {HORIZON_EMOJI[item.horizon]}
                    </Text>
                    {item.deadline && (
                      <Text style={styles.reviewDeadline}>
                        {new Date(item.deadline).toLocaleDateString([], {
                          weekday: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Text>
                    )}
                    {item.isUrgent && (
                      <Text style={styles.reviewUrgent}>!</Text>
                    )}
                  </View>
                  {item.subtasks.length > 0 && (
                    <Text style={styles.reviewSubtasks}>
                      {item.subtasks.length} subtask{item.subtasks.length !== 1 ? "s" : ""}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveItem(index)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={20} color={theme.colors.text.muted} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Confirm bar */}
      <View style={styles.confirmBar}>
        <Text style={styles.confirmText}>does this look right?</Text>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
          <Text style={styles.confirmBtnText}>looks good</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: theme.colors.text.primary,
  },
  inputContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  heroText: {
    fontFamily: fonts.heading,
    fontSize: 34,
    color: theme.colors.text.primary,
    fontStyle: "italic",
  },
  subText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: theme.colors.text.muted,
    marginTop: 4,
    marginBottom: 24,
  },
  textInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: theme.colors.text.primary,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    maxHeight: 320,
    lineHeight: 22,
  },
  parseBtn: {
    marginTop: 16,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
  },
  parseBtnDisabled: {
    opacity: 0.4,
  },
  parseBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: "#fff",
  },
  contextsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  contextChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  contextChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contextChipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  reviewList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  reviewRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  reviewRowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reviewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  reviewMeta: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  reviewHorizon: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: theme.colors.text.muted,
  },
  reviewDeadline: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  reviewUrgent: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: theme.colors.semantic.amber,
  },
  reviewSubtasks: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: theme.colors.text.muted,
    marginTop: 2,
  },
  confirmBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.bg.primary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  confirmText: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: theme.colors.text.primary,
    fontStyle: "italic",
  },
  confirmBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
  },
  confirmBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: "#fff",
  },
  doneContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  doneEmoji: {
    fontSize: 48,
    color: theme.colors.semantic.green,
    marginBottom: 16,
  },
  doneTitle: {
    fontFamily: fonts.heading,
    fontSize: 34,
    color: theme.colors.text.primary,
    textAlign: "center",
    fontStyle: "italic",
  },
  doneSubtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: theme.colors.text.muted,
    marginTop: 4,
    marginBottom: 32,
  },
  doneBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
  },
  doneBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: "#fff",
  },
});
