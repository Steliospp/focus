import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { theme } from "../theme";
import { fonts } from "../constants/fonts";
import { useAppStore, Task } from "../store/useAppStore";
import { BottomSheet } from "../components/ui/BottomSheet";
import type { RootStackParamList } from "../navigation/RootNavigator";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

// ---------------------------------------------------------------------------
// Importance mapping
// ---------------------------------------------------------------------------
type ImportanceKey = "urgent" | "normal" | "someday";
const IMPORTANCE_OPTIONS: { key: ImportanceKey; label: string }[] = [
  { key: "urgent", label: "needs to happen today" },
  { key: "normal", label: "this week is fine" },
  { key: "someday", label: "whenever I get to it" },
];

function importanceFromPriority(p?: string): ImportanceKey {
  if (p === "urgent" || p === "high") return "urgent";
  if (p === "low") return "someday";
  return "normal";
}

function priorityFromImportance(i: ImportanceKey): "urgent" | "medium" | "low" {
  if (i === "urgent") return "urgent";
  if (i === "someday") return "low";
  return "medium";
}

// ---------------------------------------------------------------------------
// Blocking apps
// ---------------------------------------------------------------------------
const POPULAR_APPS = [
  "Instagram",
  "TikTok",
  "Snapchat",
  "YouTube",
  "Reddit",
  "Discord",
  "X/Twitter",
  "BeReal",
  "Threads",
];

const BLOCKING_LEVELS = [
  { key: "social", label: "just social media" },
  { key: "except_work", label: "everything except work tools" },
  { key: "everything", label: "everything, no exceptions" },
];

// ---------------------------------------------------------------------------
// Proof descriptions
// ---------------------------------------------------------------------------
function proofDescription(task: Task): string {
  if (task.proofType === "written") return "essay text when done";
  if (task.proofType === "photo") return "a photo of the finished result";
  return "no proof needed — honor system";
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
function friendlyDeadline(deadline: string | null): string {
  if (!deadline) return "no deadline";
  const d = new Date(deadline);
  const now = new Date();
  const diffDays = Math.ceil(
    (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (diffDays < 0) return `overdue · was ${d.toLocaleDateString()}`;
  if (diffDays === 0) return `today at ${timeStr}`;
  if (diffDays === 1) return `tomorrow at ${timeStr}`;

  const weekday = d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  if (diffDays <= 7) return `${weekday} ${timeStr}`;
  return `${d.toLocaleDateString()} ${timeStr}`;
}

function friendlyDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function TaskDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "TaskDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { taskId, quickStart } = route.params;

  const task = useAppStore((s) => s.tasks.find((t) => t.id === taskId));
  const updateTask = useAppStore((s) => s.updateTask);
  const setCurrentTask = useAppStore((s) => s.setCurrentTask);
  const globalBlockedApps = useAppStore((s) => s.blockedApps);

  // Local editing state
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const [showBlockingSheet, setShowBlockingSheet] = useState(false);
  const [localBlockedApps, setLocalBlockedApps] = useState<string[]>(
    task?.blockedApps ?? []
  );
  const [blockingLevel, setBlockingLevel] = useState("social");
  const [showQuickStart, setShowQuickStart] = useState(quickStart === true);

  if (!task) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.primary }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: fonts.body, color: theme.colors.text.secondary }}>
            Task not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isBlocking = task.blockedApps.length > 0;
  const importance = importanceFromPriority(task.priority);
  const sessions = task.sessionPlan?.totalSessions ?? 1;

  // ---- Quick-start overlay for captured tasks ----
  if (showQuickStart) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.primary }}>
        <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: "center" }}>
          <Text
            style={{
              fontFamily: fonts.heading,
              fontSize: 36,
              lineHeight: 44,
              color: theme.colors.text.primary,
              marginBottom: 40,
            }}
          >
            {task.name}
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setCurrentTask(task.id);
              updateTask(task.id, { status: "active", startedAt: new Date().toISOString() });
              navigation.replace("ActiveTask", { taskId: task.id });
            }}
            style={{
              backgroundColor: theme.colors.accent,
              borderRadius: 9999,
              paddingVertical: 18,
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bodyMedium,
                fontSize: 17,
                color: "#FFFFFF",
              }}
            >
              ready when you are →
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => setShowQuickStart(false)}
            style={{ alignItems: "center", paddingVertical: 12 }}
          >
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 14,
                color: theme.colors.text.secondary,
              }}
            >
              edit details
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Summary line ----
  const summaryParts: string[] = [];
  summaryParts.push(friendlyDuration(task.estimatedMinutes));
  if (task.deadline) {
    const d = new Date(task.deadline);
    const dayName = d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const diffDays = Math.ceil(
      (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays <= 7 && diffDays >= 0) summaryParts.push(`due ${dayName}`);
    else summaryParts.push(`due ${d.toLocaleDateString()}`);
  }
  if (task.blockedApps.length > 0) {
    summaryParts.push(`${task.blockedApps.length} apps blocked`);
  }
  const summaryLine = summaryParts.join(" · ");

  // ---- Handlers ----
  const handleDoItNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentTask(task.id);
    updateTask(task.id, { status: "active", startedAt: new Date().toISOString() });
    navigation.replace("ActiveTask", { taskId: task.id });
  };

  const handleSchedule = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("AddTask", { taskId: task.id });
  };

  const handleImportanceChange = (key: ImportanceKey) => {
    Haptics.selectionAsync();
    updateTask(task.id, { priority: priorityFromImportance(key) });
  };

  const handleBlockingToggle = (value: boolean) => {
    Haptics.selectionAsync();
    if (value) {
      // Restore global defaults
      updateTask(task.id, { blockedApps: globalBlockedApps });
      setLocalBlockedApps(globalBlockedApps);
    } else {
      updateTask(task.id, { blockedApps: [] });
      setLocalBlockedApps([]);
    }
  };

  const handleSessionChange = (delta: number) => {
    Haptics.selectionAsync();
    const current = sessions;
    const next = Math.max(1, Math.min(5, current + delta));
    const minutesPerSession = Math.round(task.estimatedMinutes / next);
    updateTask(task.id, {
      sessionPlan: {
        totalSessions: next,
        totalEstimatedMinutes: task.estimatedMinutes,
        createdAt: task.sessionPlan?.createdAt ?? new Date().toISOString(),
      },
    });
  };

  const handleProofChange = (type: "written" | "photo" | "honor") => {
    Haptics.selectionAsync();
    updateTask(task.id, { proofType: type });
  };

  const toggleBlockedApp = (app: string) => {
    Haptics.selectionAsync();
    setLocalBlockedApps((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]
    );
  };

  const saveBlocking = () => {
    updateTask(task.id, { blockedApps: localBlockedApps });
    setShowBlockingSheet(false);
  };

  const handleDescriptionSave = () => {
    updateTask(task.id, { description: descriptionDraft });
    setEditingDescription(false);
  };

  // ---- Assignment text extraction ----
  const assignmentText =
    task.aiAnalysis?.whatGoodLooksLike ?? null;

  // ---- Blocking summary ----
  const blockingSummary = () => {
    if (task.blockedApps.length === 0) return "none";
    if (task.blockedApps.length <= 2) return task.blockedApps.join(" · ");
    return `${task.blockedApps.slice(0, 2).join(" · ")} · +${task.blockedApps.length - 2} more`;
  };

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.primary }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── LAYER 1: THE GLANCE ─── */}
        <View style={{ paddingHorizontal: 28, paddingTop: 16 }}>
          {/* Back button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ alignSelf: "flex-start", marginBottom: 24 }}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.text.secondary}
            />
          </TouchableOpacity>

          {/* Task name */}
          <Text
            style={{
              fontFamily: fonts.heading,
              fontSize: 34,
              lineHeight: 42,
              color: theme.colors.text.primary,
              marginBottom: 8,
            }}
          >
            {task.name}
          </Text>

          {/* Summary line */}
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: theme.colors.text.secondary,
              marginBottom: 32,
            }}
          >
            {summaryLine}
          </Text>

          {/* Two buttons */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 40 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleDoItNow}
              style={{
                flex: 1,
                backgroundColor: theme.colors.accent,
                borderRadius: 9999,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 15,
                  color: "#FFFFFF",
                }}
              >
                do it now →
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSchedule}
              style={{
                flex: 1,
                backgroundColor: theme.colors.bg.elevated,
                borderRadius: 9999,
                paddingVertical: 16,
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 15,
                  color: theme.colors.text.secondary,
                }}
              >
                schedule →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── DIVIDER ─── */}
        <View
          style={{
            height: 1,
            backgroundColor: theme.colors.divider,
            marginHorizontal: 28,
          }}
        />

        {/* ─── LAYER 2: SCROLL-TO-REVEAL DETAILS ─── */}
        <View style={{ paddingHorizontal: 28, paddingTop: 28 }}>
          {/* ── SECTION: the task (description) ── */}
          {editingDescription ? (
            <TextInput
              value={descriptionDraft}
              onChangeText={setDescriptionDraft}
              onBlur={handleDescriptionSave}
              multiline
              autoFocus
              style={{
                fontFamily: fonts.body,
                fontSize: 15,
                lineHeight: 22,
                color: theme.colors.text.primary,
                marginBottom: 20,
                minHeight: 60,
              }}
              placeholderTextColor={theme.colors.text.muted}
              placeholder="add details..."
            />
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setDescriptionDraft(task.description || "");
                setEditingDescription(true);
              }}
              style={{ marginBottom: 20 }}
            >
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 15,
                  lineHeight: 22,
                  color: task.description
                    ? theme.colors.text.primary
                    : theme.colors.text.muted,
                  fontStyle: task.description ? "normal" : "italic",
                }}
              >
                {task.description || "add details..."}
              </Text>
            </TouchableOpacity>
          )}

          {/* Assignment extraction block */}
          {assignmentText && (
            <View
              style={{
                borderLeftWidth: 2,
                borderLeftColor: theme.colors.border,
                paddingLeft: 16,
                marginBottom: 28,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodyLight,
                  fontSize: 13,
                  color: theme.colors.text.secondary,
                  marginBottom: 4,
                }}
              >
                from your assignment:
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 14,
                  lineHeight: 20,
                  color: theme.colors.text.secondary,
                }}
              >
                {assignmentText}
              </Text>
            </View>
          )}

          {/* ── DIVIDER ── */}
          <View
            style={{
              height: 1,
              backgroundColor: theme.colors.divider,
              marginBottom: 20,
            }}
          />

          {/* ── DETAIL ROWS ── */}

          {/* When */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setShowDatePicker(!showDatePicker);
            }}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 14,
            }}
          >
            <Text style={labelStyle}>when</Text>
            <Text style={valueStyle}>{friendlyDeadline(task.deadline)}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <View style={{ marginBottom: 8, gap: 8 }}>
              {[
                { label: "today", offset: 0 },
                { label: "tomorrow", offset: 1 },
                { label: "this week", offset: 5 },
                { label: "next week", offset: 8 },
              ].map((opt) => {
                const d = new Date();
                d.setDate(d.getDate() + opt.offset);
                d.setHours(23, 59, 0, 0);
                return (
                  <TouchableOpacity
                    key={opt.label}
                    activeOpacity={0.7}
                    onPress={() => {
                      Haptics.selectionAsync();
                      updateTask(task.id, { deadline: d.toISOString() });
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setShowDatePicker(false);
                    }}
                    style={{ paddingVertical: 6 }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 14,
                        color: theme.colors.text.primary,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => {
                  updateTask(task.id, { deadline: null });
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setShowDatePicker(false);
                }}
                style={{ paddingVertical: 6 }}
              >
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 13,
                    color: theme.colors.text.muted,
                  }}
                >
                  clear deadline
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Sessions (only if 45+ min) */}
          {task.estimatedMinutes >= 45 && (
            <View style={{ paddingVertical: 14 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={labelStyle}>sessions</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <TouchableOpacity
                    onPress={() => handleSessionChange(-1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    disabled={sessions <= 1}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodyMedium,
                        fontSize: 18,
                        color:
                          sessions <= 1
                            ? theme.colors.text.muted
                            : theme.colors.accent,
                      }}
                    >
                      −
                    </Text>
                  </TouchableOpacity>
                  <Text style={valueStyle}>
                    {sessions === 1
                      ? "1 session"
                      : `${sessions} sessions · ${Math.round(task.estimatedMinutes / sessions)} min each`}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleSessionChange(1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    disabled={sessions >= 5}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodyMedium,
                        fontSize: 18,
                        color:
                          sessions >= 5
                            ? theme.colors.text.muted
                            : theme.colors.accent,
                      }}
                    >
                      +
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Importance */}
          <View style={{ paddingVertical: 14 }}>
            <Text style={[labelStyle, { marginBottom: 12 }]}>
              how important is this?
            </Text>
            <View style={{ gap: 8 }}>
              {IMPORTANCE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  activeOpacity={0.7}
                  onPress={() => handleImportanceChange(opt.key)}
                  style={{ paddingVertical: 4 }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 14,
                      color:
                        importance === opt.key
                          ? theme.colors.text.primary
                          : theme.colors.text.muted,
                      textDecorationLine:
                        importance === opt.key ? "underline" : "none",
                      textDecorationColor: theme.colors.accent,
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Blocking */}
          <View style={{ paddingVertical: 14 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={labelStyle}>block while working?</Text>
              <Switch
                value={isBlocking}
                onValueChange={handleBlockingToggle}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.accentSoft,
                }}
                thumbColor={isBlocking ? theme.colors.accent : "#f4f3f4"}
              />
            </View>

            {isBlocking && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setLocalBlockedApps([...task.blockedApps]);
                  setShowBlockingSheet(true);
                }}
                style={{ marginTop: 12 }}
              >
                {/* Horizontal pill list of blocked apps */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  scrollEnabled={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {task.blockedApps.map((app) => (
                    <View
                      key={app}
                      style={{
                        backgroundColor: theme.colors.accentSoft,
                        borderRadius: 9999,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.body,
                          fontSize: 13,
                          color: theme.colors.accent,
                        }}
                      >
                        {app}
                      </Text>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={{
                      borderRadius: 9999,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderWidth: 1,
                      borderColor: theme.colors.accentSoft,
                      borderStyle: "dashed",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 13,
                        color: theme.colors.accent,
                      }}
                    >
                      + add app
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </TouchableOpacity>
            )}

            {!isBlocking && (
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: theme.colors.text.muted,
                  fontStyle: "italic",
                  marginTop: 8,
                }}
              >
                apps won't be blocked — you're trusting yourself
              </Text>
            )}
          </View>

          {/* Proof */}
          <View style={{ paddingVertical: 14 }}>
            {!showProof ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut
                  );
                  setShowProof(true);
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    color: theme.colors.text.secondary,
                  }}
                >
                  how will this be verified? →
                </Text>
              </TouchableOpacity>
            ) : (
              <View>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    color: theme.colors.text.primary,
                    marginBottom: 12,
                  }}
                >
                  {task.proofType === "written"
                    ? "I'll ask you to paste your text when done"
                    : task.proofType === "photo"
                      ? "I'll ask for a photo of the finished result"
                      : "no proof needed — honor system"}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {}}
                  style={{ marginBottom: 8 }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 13,
                      color: theme.colors.text.muted,
                      marginBottom: 12,
                    }}
                  >
                    change this
                  </Text>
                </TouchableOpacity>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  {(
                    [
                      { key: "written", label: "paste text" },
                      { key: "photo", label: "take a photo" },
                      { key: "honor", label: "honor system" },
                    ] as const
                  ).map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      activeOpacity={0.7}
                      onPress={() => handleProofChange(opt.key)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 9999,
                        backgroundColor:
                          task.proofType === opt.key
                            ? theme.colors.accentSoft
                            : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.body,
                          fontSize: 13,
                          color:
                            task.proofType === opt.key
                              ? theme.colors.accent
                              : theme.colors.text.muted,
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ─── LAYER 3: BLOCKING BOTTOM SHEET ─── */}
      <BottomSheet
        visible={showBlockingSheet}
        onClose={() => setShowBlockingSheet(false)}
      >
        <Text
          style={{
            fontFamily: fonts.heading,
            fontSize: 24,
            color: theme.colors.text.primary,
            marginBottom: 24,
          }}
        >
          locked while you work
        </Text>

        {/* App pills grid */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 28,
          }}
        >
          {POPULAR_APPS.map((app) => {
            const selected = localBlockedApps.includes(app);
            return (
              <TouchableOpacity
                key={app}
                activeOpacity={0.7}
                onPress={() => toggleBlockedApp(app)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 9999,
                  backgroundColor: selected
                    ? theme.colors.accentSoft
                    : "transparent",
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    color: selected
                      ? theme.colors.accent
                      : theme.colors.text.muted,
                  }}
                >
                  {app}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Blocking level */}
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 13,
            color: theme.colors.text.muted,
            marginBottom: 12,
          }}
        >
          blocking level
        </Text>
        <View style={{ gap: 8, marginBottom: 28 }}>
          {BLOCKING_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.key}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.selectionAsync();
                setBlockingLevel(level.key);
              }}
              style={{ paddingVertical: 4 }}
            >
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 14,
                  color:
                    blockingLevel === level.key
                      ? theme.colors.text.primary
                      : theme.colors.text.muted,
                  textDecorationLine:
                    blockingLevel === level.key ? "underline" : "none",
                  textDecorationColor: theme.colors.accent,
                }}
              >
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Done button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={saveBlocking}
          style={{ alignItems: "center", paddingVertical: 12 }}
        >
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 16,
              color: theme.colors.accent,
            }}
          >
            done
          </Text>
        </TouchableOpacity>
      </BottomSheet>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Shared text styles for detail rows
// ---------------------------------------------------------------------------
const labelStyle = {
  fontFamily: fonts.body,
  fontSize: 14,
  color: theme.colors.text.secondary,
} as const;

const valueStyle = {
  fontFamily: fonts.body,
  fontSize: 14,
  color: theme.colors.text.primary,
} as const;
