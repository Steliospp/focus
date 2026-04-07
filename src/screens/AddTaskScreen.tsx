import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Keyboard,
  PanResponder,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import {
  useAppStore,
  type TaskCategory,
  type ProofType,
  type Task,
  type Subtask,
  type AIAnalysis,
  type ClassificationResult,
} from "../store/useAppStore";
import { classifyTask, analyzeTask } from "../services/ai";
import { MascotOrb } from "../components/ui/MascotOrb";
import { theme } from "../theme";
import { fonts } from "../constants/fonts";

type Nav = NativeStackNavigationProp<any>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COMMON_APPS = ["Instagram", "TikTok", "Snapchat", "YouTube", "Reddit"];

const DEADLINE_OPTIONS = [
  { key: "today", label: "today", muted: false },
  { key: "this_week", label: "this week", muted: false },
  { key: "pick_date", label: "pick a date", muted: false },
  { key: "someday", label: "someday \u2014 no rush", muted: true },
] as const;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}
function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function AddTaskScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<{ params: { taskId?: string; prefilledDate?: string; prefilledName?: string } }, "params">>();
  const editTaskId = route.params?.taskId;
  const prefilledDate = route.params?.prefilledDate;
  const prefilledName = route.params?.prefilledName;

  const { tasks, addTask, updateTask, blockedApps: storeBlockedApps } = useAppStore();
  const existingTask = editTaskId ? tasks.find((t) => t.id === editTaskId) : null;

  // --- Flow state ---
  const hasPrefilledName = !!(prefilledName && prefilledName.trim().length >= 3);
  const [step, setStep] = useState(hasPrefilledName ? 2 : 1);
  const [isSomeday, setIsSomeday] = useState(false);

  // --- Task fields ---
  const [name, setName] = useState(existingTask?.name ?? prefilledName ?? "");
  const [deadline, setDeadline] = useState<string | null>(prefilledDate ?? null);
  const [duration, setDuration] = useState(existingTask?.estimatedMinutes ?? 45);
  const [selectedApps, setSelectedApps] = useState<string[]>(
    existingTask?.blockedApps ?? [...storeBlockedApps].filter(a => COMMON_APPS.includes(a))
  );

  // --- Calendar state ---
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDeadlineKey, setSelectedDeadlineKey] = useState<string | null>(null);

  // --- AI state (runs in background after Q1) ---
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(existingTask?.aiAnalysis ?? null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const classificationRan = useRef(false);

  // --- Animations ---
  const slideAnim = useRef(new Animated.Value(0)).current;
  const durationAnim = useRef(new Animated.Value(0)).current;
  const aiFadeAnim = useRef(new Animated.Value(0)).current;
  const optionAnims = useRef(DEADLINE_OPTIONS.map(() => new Animated.Value(0))).current;
  const nextFadeAnim = useRef(new Animated.Value(0)).current;

  // --- Long press for duration ---
  const longPressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Progress dots ---
  // someday skips Q3, so 4 dots; otherwise 5
  const totalDots = isSomeday ? 4 : 5;
  const getDotIndex = (): number => {
    if (isSomeday) {
      if (step <= 2) return step - 1;
      return step - 2; // 4→2, 5→3
    }
    return step - 1;
  };

  // --- Swipe back gesture ---
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dx > 20 && Math.abs(gs.dy) < 40,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 80) goBack();
      },
    })
  ).current;

  // --- Slide transition (spring, like turning a page) ---
  const animateSlide = useCallback((direction: "forward" | "back", cb: () => void) => {
    const exitTo = direction === "forward" ? -SCREEN_WIDTH : SCREEN_WIDTH;
    const enterFrom = direction === "forward" ? SCREEN_WIDTH : -SCREEN_WIDTH;
    Animated.timing(slideAnim, {
      toValue: exitTo,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      cb();
      slideAnim.setValue(enterFrom);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    });
  }, [slideAnim]);

  const goToStep = useCallback((next: number) => {
    animateSlide(next > step ? "forward" : "back", () => setStep(next));
  }, [step, animateSlide]);

  const goBack = useCallback(() => {
    if (step <= 1) { navigation.goBack(); return; }
    const prev = (isSomeday && step === 4) ? 2 : step - 1;
    goToStep(prev);
  }, [step, isSomeday, goToStep, navigation]);

  // --- Keyboard management ---
  useEffect(() => {
    if (step !== 1) Keyboard.dismiss();
  }, [step]);

  // --- "next →" fade in for Q1 ---
  useEffect(() => {
    Animated.timing(nextFadeAnim, {
      toValue: name.trim().length >= 3 ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [name]);

  // --- Stagger Q2 options ---
  useEffect(() => {
    if (step === 2) {
      optionAnims.forEach(a => a.setValue(0));
      optionAnims.forEach((anim, i) => {
        setTimeout(() => {
          Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        }, i * 50);
      });
    }
  }, [step]);

  // --- Auto-skip Q2 when date is pre-filled ---
  useEffect(() => {
    if (step === 2 && prefilledDate) {
      setDeadline(prefilledDate);
      goToStep(3);
    }
  }, [step, prefilledDate]);

  // --- Run AI classification in background after Q1 ---
  const runClassification = useCallback(async () => {
    if (classificationRan.current) return;
    classificationRan.current = true;
    setAiLoading(true);
    try {
      const result = await classifyTask(name.trim());
      setClassification(result);
      // Use AI suggestions as defaults
      setDuration(result.estimatedMinutes);
      if (result.blockingLevel <= 1) setSelectedApps([]);
    } catch (err) {
      console.warn("Classification failed:", err);
    } finally {
      setAiLoading(false);
    }
  }, [name]);

  // Kick off classification when leaving Q1
  useEffect(() => {
    if (step >= 2 && !classificationRan.current && name.trim().length >= 3) {
      runClassification();
    }
  }, [step, runClassification]);

  // If prefilled name, start classification immediately
  useEffect(() => {
    if (hasPrefilledName) runClassification();
  }, []);

  // --- Run full AI analysis when entering Q5 ---
  const runFullAnalysis = useCallback(async () => {
    setAiReady(false);
    aiFadeAnim.setValue(0);

    // Wait for classification if still running
    if (!classification && aiLoading) {
      // Will re-trigger when classification completes
      return;
    }

    try {
      const taskData: Partial<Task> = {
        name: name.trim(),
        description: "",
        category: "other" as TaskCategory,
        estimatedMinutes: duration,
        proofType: "photo" as ProofType,
        blockedApps: selectedApps,
        ...(prefilledDate ? { scheduledDate: prefilledDate } : {}),
      };

      const subtaskNames = classification?.isMultiStep && classification.steps
        ? classification.steps.filter(s => s.type === "active").map(s => s.name)
        : undefined;

      const analysis = await analyzeTask(taskData, subtaskNames);
      setAiAnalysis(analysis);
    } catch (err) {
      console.warn("Analysis failed:", err);
    } finally {
      setTimeout(() => {
        setAiReady(true);
        Animated.timing(aiFadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }, 800);
    }
  }, [classification, aiLoading, name, duration, selectedApps, prefilledDate, aiFadeAnim]);

  useEffect(() => {
    if (step === 5) runFullAnalysis();
  }, [step]);

  // Re-run when classification arrives if we're already on Q5
  useEffect(() => {
    if (step === 5 && classification && !aiReady) runFullAnalysis();
  }, [classification]);

  // --- Helpers ---
  const toggleApp = (app: string) => {
    setSelectedApps(prev =>
      prev.includes(app) ? prev.filter(a => a !== app) : [...prev, app]
    );
  };

  const adjustDuration = (delta: number) => {
    setDuration(d => {
      const next = Math.max(15, Math.min(180, d + delta));
      durationAnim.setValue(delta > 0 ? 12 : -12);
      Animated.spring(durationAnim, { toValue: 0, tension: 200, friction: 15, useNativeDriver: true }).start();
      return next;
    });
  };

  const startLongPress = (delta: number) => {
    longPressInterval.current = setInterval(() => adjustDuration(delta > 0 ? 5 : -5), 120);
  };
  const stopLongPress = () => {
    if (longPressInterval.current) { clearInterval(longPressInterval.current); longPressInterval.current = null; }
  };

  // --- Create backlog task ---
  const createBacklogTask = () => {
    const newId = Date.now().toString();
    addTask({
      id: newId, name: name.trim(), description: "",
      category: "other" as TaskCategory, estimatedMinutes: 0,
      deadline: null, blockedApps: [], proofType: "honor" as ProofType,
      status: "backlog", createdAt: new Date().toISOString(),
      startedAt: null, completedAt: null,
      aiAnalysis: null, proofSubmission: null, aiGrade: null,
      reflectionAnswers: {},
    });
    navigation.goBack();
  };

  // --- "let's go" handler ---
  const handleLetsGo = async () => {
    const archetype = classification?.archetype ?? "doer";
    const proofType: ProofType = classification
      ? (!classification.proofRequired ? "honor" : archetype === "producer" ? "written" : "photo")
      : "photo";

    // Multi-step task
    if (classification?.isMultiStep && classification.steps) {
      const allSteps = classification.steps;
      const subtasks: Subtask[] = [];
      let activeIndex = 0;
      for (let i = 0; i < allSteps.length; i++) {
        const s = allSteps[i];
        if (s.type === "active") {
          const nextStep = allSteps[i + 1];
          subtasks.push({
            id: Date.now().toString() + "-" + activeIndex,
            name: s.name,
            estimatedMinutes: s.estimatedMinutes,
            proofType: "photo",
            waitMinutesAfter: nextStep?.type === "wait" ? nextStep.estimatedMinutes : 0,
            waitReason: nextStep?.type === "wait" ? (nextStep.waitReason ?? "") : "",
            status: "pending", aiGrade: null, proofSubmission: null,
          });
          activeIndex++;
        }
      }
      const totalActive = subtasks.reduce((sum, s) => sum + s.estimatedMinutes, 0);

      if (aiAnalysis?.photoPrompts) {
        aiAnalysis.photoPrompts = aiAnalysis.photoPrompts.map(pp => {
          if (pp.stepIndex !== undefined && pp.stepIndex < subtasks.length) {
            return { ...pp, stepId: subtasks[pp.stepIndex].id };
          }
          return pp;
        });
      }

      const newId = Date.now().toString();
      addTask({
        id: newId, name: name.trim(), description: "",
        category: "other" as TaskCategory, estimatedMinutes: totalActive,
        deadline, blockedApps: selectedApps, proofType,
        status: "todo", archetype, blockingLevel: classification.blockingLevel,
        createdAt: new Date().toISOString(), startedAt: null, completedAt: null,
        aiAnalysis, proofSubmission: null, aiGrade: null, reflectionAnswers: {},
        isMultiStep: true, subtasks, currentSubtaskIndex: 0,
        ...(prefilledDate ? { scheduledDate: prefilledDate } : {}),
      });
      navigation.navigate("ActiveTask", { taskId: newId });
      return;
    }

    // Single task
    if (editTaskId && existingTask) {
      updateTask(editTaskId, {
        name: name.trim(), estimatedMinutes: duration,
        blockedApps: selectedApps, aiAnalysis, proofType, archetype,
        blockingLevel: classification?.blockingLevel,
        ...(classification?.outputType ? { outputType: classification.outputType } : {}),
      });
      navigation.navigate("ActiveTask", { taskId: editTaskId });
    } else {
      const newId = Date.now().toString();
      addTask({
        id: newId, name: name.trim(), description: "",
        category: "other" as TaskCategory, estimatedMinutes: duration,
        deadline, blockedApps: selectedApps, proofType,
        status: "todo", archetype,
        blockingLevel: classification?.blockingLevel,
        ...(classification?.outputType ? { outputType: classification.outputType } : {}),
        createdAt: new Date().toISOString(), startedAt: null, completedAt: null,
        aiAnalysis, proofSubmission: null, aiGrade: null, reflectionAnswers: {},
        ...(prefilledDate ? { scheduledDate: prefilledDate } : {}),
      });
      navigation.navigate("ActiveTask", { taskId: newId });
    }
  };

  // ================================================================
  //  PROGRESS DOTS
  // ================================================================
  const renderDots = () => (
    <View style={{ flexDirection: "row", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
      {Array.from({ length: totalDots }).map((_, i) => {
        const active = i === getDotIndex();
        const past = i < getDotIndex();
        return (
          <View
            key={i}
            style={{
              width: active ? 8 : 6,
              height: active ? 8 : 6,
              borderRadius: 4,
              backgroundColor: active ? theme.colors.accent : past ? theme.colors.text.muted : theme.colors.border,
              marginHorizontal: 4,
            }}
          />
        );
      })}
    </View>
  );

  // ================================================================
  //  Q1 — "what do you need to do?"
  // ================================================================
  const renderQ1 = () => (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <View style={{ flex: 1, justifyContent: "flex-start", paddingHorizontal: 32, paddingTop: 80 }}>
        <Text style={{ fontFamily: fonts.heading, fontSize: 32, color: theme.colors.text.primary, marginBottom: 32 }}>
          what do you need to do?
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="type anything..."
          placeholderTextColor={theme.colors.text.muted}
          autoFocus
          onSubmitEditing={() => { if (name.trim().length >= 3) goToStep(2); }}
          returnKeyType="next"
          blurOnSubmit={false}
          style={{
            fontFamily: fonts.body, fontSize: 20,
            color: theme.colors.text.primary, paddingVertical: 8, borderWidth: 0,
          }}
          selectionColor={theme.colors.accent}
          multiline
        />
      </View>
      <Animated.View style={{ position: "absolute", bottom: 40, right: 32, opacity: nextFadeAnim }}>
        <TouchableOpacity
          onPress={() => { if (name.trim().length >= 3) goToStep(2); }}
          activeOpacity={0.7}
        >
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: theme.colors.accent }}>
            next {"\u2192"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );

  // ================================================================
  //  Q2 — "when does it need to happen?"
  // ================================================================
  const formatDateLabel = (dateKey: string): string => {
    const d = new Date(dateKey + "T12:00:00");
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  };

  // --- Schedule task for a specific date (no AI, no session) ---
  const scheduleTaskForDate = (dateKey: string) => {
    const newId = Date.now().toString();
    addTask({
      id: newId, name: name.trim(), description: "",
      category: "other" as TaskCategory, estimatedMinutes: 0,
      deadline: null, blockedApps: [], proofType: "honor" as ProofType,
      status: "todo", scheduledDate: dateKey,
      createdAt: new Date().toISOString(),
      startedAt: null, completedAt: null,
      aiAnalysis: null, proofSubmission: null, aiGrade: null,
      reflectionAnswers: {},
    });
    // Show confirmation screen (step 6)
    setSelectedDate(dateKey);
    goToStep(6);
  };

  const renderQ2 = () => {
    const today = new Date();
    const todayKey = toDateKey(today);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (today.getDay() === 0 ? 7 : 7 - today.getDay()));
    const endOfWeekKey = toDateKey(endOfWeek);

    const handleOption = (key: string) => {
      setSelectedDeadlineKey(key);
      if (key === "today") {
        setDeadline(todayKey);
        setIsSomeday(false);
        setTimeout(() => goToStep(3), 300);
      } else if (key === "this_week") {
        setDeadline(endOfWeekKey);
        setIsSomeday(false);
        setTimeout(() => goToStep(3), 300);
      } else if (key === "pick_date") {
        setShowDatePicker(true);
      } else if (key === "someday") {
        setIsSomeday(true);
        setTimeout(() => createBacklogTask(), 300);
      }
    };

    const handlePickDate = (dateKey: string) => {
      setSelectedDate(dateKey);
      // Scheduling = save for later. NOT starting a session.
      scheduleTaskForDate(dateKey);
    };

    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfWeek(year, month);
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    // --- Date picker sub-view ---
    if (showDatePicker) {
      return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 60 }} keyboardShouldPersistTaps="handled">
          {hasPrefilledName && (
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: theme.colors.text.muted, marginBottom: 12 }}>
              {name.trim()}
            </Text>
          )}
          <Text style={{ fontFamily: fonts.heading, fontSize: 28, color: theme.colors.text.primary, marginBottom: 28 }}>
            pick a date
          </Text>

          {/* Month nav */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <TouchableOpacity onPress={() => setCalendarMonth(new Date(year, month - 1, 1))} activeOpacity={0.7} style={{ padding: 8 }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 20, color: theme.colors.text.secondary }}>{"\u2039"}</Text>
            </TouchableOpacity>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: theme.colors.text.primary }}>
              {MONTH_NAMES[month]} {year}
            </Text>
            <TouchableOpacity onPress={() => setCalendarMonth(new Date(year, month + 1, 1))} activeOpacity={0.7} style={{ padding: 8 }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 20, color: theme.colors.text.secondary }}>{"\u203A"}</Text>
            </TouchableOpacity>
          </View>

          {/* Weekday headers */}
          <View style={{ flexDirection: "row", marginBottom: 4 }}>
            {WEEKDAY_LABELS.map((label, idx) => (
              <View key={idx} style={{ flex: 1, alignItems: "center", paddingBottom: 8 }}>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: theme.colors.text.muted }}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Days grid */}
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {cells.map((day, idx) => {
              if (day === null) return <View key={`e-${idx}`} style={{ width: "14.28%", height: 44 }} />;
              const dateKey = toDateKey(new Date(year, month, day));
              const isToday = dateKey === todayKey;
              const isSel = selectedDate === dateKey;
              const isPast = dateKey < todayKey;
              return (
                <TouchableOpacity
                  key={dateKey} disabled={isPast}
                  onPress={() => handlePickDate(dateKey)} activeOpacity={0.7}
                  style={{ width: "14.28%", height: 44, alignItems: "center", justifyContent: "center" }}
                >
                  <View style={{
                    width: 36, height: 36, borderRadius: 18,
                    alignItems: "center", justifyContent: "center",
                    backgroundColor: isSel ? theme.colors.accent : "transparent",
                  }}>
                    <Text style={{
                      fontFamily: fonts.body, fontSize: 15,
                      color: isPast ? theme.colors.text.muted : isSel ? "#FAF8F4" : theme.colors.text.primary,
                    }}>
                      {day}
                    </Text>
                    {isToday && !isSel && (
                      <View style={{
                        width: 4, height: 4, borderRadius: 2,
                        backgroundColor: theme.colors.accent,
                        position: "absolute", bottom: 2,
                      }} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Back link */}
          <TouchableOpacity
            onPress={() => { setShowDatePicker(false); setSelectedDate(null); }}
            activeOpacity={0.7}
            style={{ marginTop: 24 }}
          >
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: theme.colors.text.muted }}>
              {"\u2190"} back
            </Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    // --- Main Q2 options ---
    return (
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 60 }}>
        {hasPrefilledName && (
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: theme.colors.text.muted, marginBottom: 12 }}>
            {name.trim()}
          </Text>
        )}
        <Text style={{ fontFamily: fonts.heading, fontSize: 38, color: theme.colors.text.primary, marginBottom: 48 }}>
          when does it need{"\n"}to happen?
        </Text>

        {DEADLINE_OPTIONS.map((opt, i) => (
          <Animated.View key={opt.key} style={{ opacity: optionAnims[i] }}>
            <TouchableOpacity
              onPress={() => handleOption(opt.key)}
              activeOpacity={0.6}
              style={{
                height: 72,
                justifyContent: "center",
                paddingLeft: 24,
                borderBottomWidth: 1,
                borderBottomColor: "#E7E5E4",
              }}
            >
              <Text style={{
                fontFamily: fonts.heading,
                fontSize: 28,
                color: opt.muted ? "#78716C" : "#1C1917",
              }}>
                {opt.label}
              </Text>
              {selectedDeadlineKey === opt.key && (
                <View style={{
                  height: 2,
                  backgroundColor: theme.colors.accent,
                  marginTop: 4,
                  width: 120,
                }} />
              )}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    );
  };

  // ================================================================
  //  Q3 — "roughly how long?"
  // ================================================================
  const renderQ3 = () => (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
        <Text style={{ fontFamily: fonts.heading, fontSize: 32, color: theme.colors.text.primary, marginBottom: 60, textAlign: "center" }}>
          roughly how long?
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
          {/* Left half — minus */}
          <TouchableOpacity
            onPress={() => adjustDuration(-15)}
            onLongPress={() => startLongPress(-5)}
            onPressOut={stopLongPress}
            delayLongPress={400}
            activeOpacity={0.7}
            style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 }}
          >
            <Text style={{ fontFamily: fonts.bodyLight, fontSize: 40, color: theme.colors.text.secondary }}>{"\u2212"}</Text>
          </TouchableOpacity>

          {/* Center number */}
          <View style={{ alignItems: "center" }}>
            <Animated.Text style={{
              fontFamily: fonts.heading, fontSize: 80, color: theme.colors.text.primary,
              transform: [{ translateY: durationAnim }],
            }}>
              {duration}
            </Animated.Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 16, color: theme.colors.text.secondary, marginTop: -8 }}>
              minutes
            </Text>
          </View>

          {/* Right half — plus */}
          <TouchableOpacity
            onPress={() => adjustDuration(15)}
            onLongPress={() => startLongPress(5)}
            onPressOut={stopLongPress}
            delayLongPress={400}
            activeOpacity={0.7}
            style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 }}
          >
            <Text style={{ fontFamily: fonts.bodyLight, fontSize: 40, color: theme.colors.text.secondary }}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: theme.colors.text.muted, marginTop: 40, textAlign: "center" }}>
          AI suggested this based on your task
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => goToStep(4)}
        activeOpacity={0.7}
        style={{ position: "absolute", bottom: 40, right: 32 }}
      >
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: theme.colors.accent }}>
          next {"\u2192"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ================================================================
  //  Q4 — "block anything while you work?"
  // ================================================================
  const renderQ4 = () => (
    <View style={{ flex: 1, paddingHorizontal: 32, paddingTop: 80 }}>
      <Text style={{ fontFamily: fonts.heading, fontSize: 32, color: theme.colors.text.primary, marginBottom: 40 }}>
        block anything while you work?
      </Text>

      {COMMON_APPS.map(app => {
        const isSelected = selectedApps.includes(app);
        return (
          <TouchableOpacity
            key={app} onPress={() => toggleApp(app)} activeOpacity={0.7}
            style={{ flexDirection: "row", alignItems: "center", paddingVertical: 16 }}
          >
            <View style={{
              width: 10, height: 10, borderRadius: 5,
              backgroundColor: isSelected ? theme.colors.accent : theme.colors.text.muted,
              marginRight: 16,
            }} />
            <Text style={{ fontFamily: fonts.body, fontSize: 18, color: theme.colors.text.primary }}>
              {app}
            </Text>
          </TouchableOpacity>
        );
      })}

      <View style={{ position: "absolute", bottom: 40, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <TouchableOpacity onPress={() => { setSelectedApps([]); goToStep(5); }} activeOpacity={0.7}>
          <Text style={{ fontFamily: fonts.body, fontSize: 16, color: theme.colors.text.muted }}>
            skip {"\u2192"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => goToStep(5)} activeOpacity={0.7}>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: theme.colors.accent }}>
            done {"\u2192"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ================================================================
  //  Q5 — THE AI MOMENT
  // ================================================================
  const renderQ5 = () => {
    const isMultiStep = classification?.isMultiStep && classification.steps && classification.steps.length > 0;

    // --- Loading: orb pulsing ---
    if (!aiReady) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
          <MascotOrb mood="default" size={60} />
          <Text style={{ fontFamily: fonts.body, fontSize: 16, color: theme.colors.text.secondary, marginTop: 28 }}>
            got it. let me think about this...
          </Text>
        </View>
      );
    }

    // --- Error ---
    if (!aiAnalysis && !classification) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 16, color: theme.colors.text.secondary }}>
            something went wrong
          </Text>
          <TouchableOpacity onPress={runFullAnalysis} activeOpacity={0.7} style={{ marginTop: 16 }}>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: theme.colors.accent }}>retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // --- Multi-step result ---
    if (isMultiStep) {
      const activeSteps = classification!.steps!.filter(s => s.type === "active");
      const totalActive = activeSteps.reduce((sum, s) => sum + s.estimatedMinutes, 0);
      const totalWait = classification!.steps!.filter(s => s.type === "wait").reduce((sum, s) => sum + s.estimatedMinutes, 0);

      return (
        <Animated.View style={{ flex: 1, opacity: aiFadeAnim }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 80, paddingBottom: 120 }}>
            <Text style={{ fontFamily: fonts.heading, fontSize: 24, color: theme.colors.text.primary, marginBottom: 28 }}>
              this has a few steps.
            </Text>

            {(() => {
              let num = 0;
              return classification!.steps!.map((s, i) => {
                if (s.type === "wait") {
                  return (
                    <Text key={`w-${i}`} style={{
                      fontFamily: fonts.body, fontSize: 14, color: theme.colors.accent,
                      marginLeft: 20, marginBottom: 14, fontStyle: "italic",
                    }}>
                      {"\u21B3"} {s.estimatedMinutes} min free ({s.waitReason})
                    </Text>
                  );
                }
                num++;
                return (
                  <View key={`s-${i}`} style={{ marginBottom: 4 }}>
                    <Text style={{ fontFamily: fonts.body, fontSize: 16, color: theme.colors.text.primary, lineHeight: 26 }}>
                      {num}. {s.name.toLowerCase()} {"\u2014"} {s.estimatedMinutes} min {"\uD83D\uDD12"}
                    </Text>
                  </View>
                );
              });
            })()}

            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: theme.colors.text.muted, marginTop: 20 }}>
              total active: {totalActive} min {"\u00B7"} free time: {totalWait} min
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: theme.colors.text.muted, marginTop: 24 }}>
              looks right?
            </Text>
          </ScrollView>

          <View style={{ position: "absolute", bottom: 40, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <TouchableOpacity onPress={() => goToStep(1)} activeOpacity={0.7}>
              <Text style={{ fontFamily: fonts.body, fontSize: 16, color: theme.colors.text.muted }}>edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLetsGo} activeOpacity={0.7}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: theme.colors.accent }}>
                let's go {"\u2192"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      );
    }

    // --- Producer task ---
    if (classification?.archetype === "producer" && classification.needsGuidelines) {
      return (
        <Animated.View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32, opacity: aiFadeAnim }}>
          <Text style={{ fontFamily: fonts.heading, fontSize: 24, color: theme.colors.text.primary, marginBottom: 24, textAlign: "center" }}>
            want to add your assignment details?
          </Text>

          <TouchableOpacity activeOpacity={0.7} style={{ paddingVertical: 16 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 18, color: theme.colors.text.primary, textAlign: "center" }}>
              {"\uD83D\uDCF8"} photograph assignment sheet
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLetsGo} activeOpacity={0.7} style={{ paddingVertical: 16 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 16, color: theme.colors.text.muted }}>
              skip {"\u2192"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLetsGo} activeOpacity={0.7} style={{ position: "absolute", bottom: 40, right: 32 }}>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: theme.colors.accent }}>
              let's go {"\u2192"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    // --- Simple task result ---
    const proofDesc = classification?.archetype === "producer"
      ? classification.outputType === "essay" ? "paste your work" : classification.outputType === "code" ? "screenshot your code" : "submit your work"
      : aiAnalysis?.recommendedProofType === "written" ? "written summary"
        : aiAnalysis?.recommendedProofType === "honor" ? "honor system"
          : "photo when done";
    const appsBlocked = selectedApps.length > 0
      ? selectedApps.join(", ") + " blocked"
      : "no apps blocked";

    return (
      <Animated.View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32, opacity: aiFadeAnim }}>
        <Text style={{ fontFamily: fonts.heading, fontSize: 24, color: theme.colors.text.primary, marginBottom: 20, textAlign: "center" }}>
          you're all set.
        </Text>

        <Text style={{ fontFamily: fonts.body, fontSize: 15, color: theme.colors.text.secondary, textAlign: "center", lineHeight: 24 }}>
          {duration} min {"\u00B7"} {proofDesc} {"\u00B7"} {appsBlocked}
        </Text>

        <TouchableOpacity onPress={handleLetsGo} activeOpacity={0.7} style={{ position: "absolute", bottom: 40, right: 32 }}>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: theme.colors.accent }}>
            let's go {"\u2192"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ================================================================
  //  Q6 — SCHEDULING CONFIRMATION (after "pick a date")
  // ================================================================
  const renderScheduleConfirmation = () => {
    const dateLabel = selectedDate ? formatDateLabel(selectedDate) : "";

    // Auto-return to dashboard after 1.5s
    useEffect(() => {
      const timer = setTimeout(() => {
        navigation.goBack();
      }, 1500);
      return () => clearTimeout(timer);
    }, []);

    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
        <Text style={{
          fontFamily: fonts.heading,
          fontSize: 32,
          color: theme.colors.text.primary,
          textAlign: "center",
          marginBottom: 16,
        }}>
          scheduled for {dateLabel.split(",")[0]}.
        </Text>
        <Text style={{
          fontFamily: fonts.body,
          fontSize: 16,
          color: theme.colors.text.secondary,
          textAlign: "center",
        }}>
          we'll remind you that morning
        </Text>
      </View>
    );
  };

  // ================================================================
  //  MAIN RENDER
  // ================================================================
  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderQ1();
      case 2: return renderQ2();
      case 3: return renderQ3();
      case 4: return renderQ4();
      case 5: return renderQ5();
      case 6: return renderScheduleConfirmation();
      default: return renderQ1();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.primary }} {...panResponder.panHandlers}>
      {/* Close */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
        style={{ position: "absolute", top: 56, left: 24, zIndex: 10 }}
      >
        <Text style={{ fontFamily: fonts.body, fontSize: 24, color: theme.colors.text.muted }}>{"\u2715"}</Text>
      </TouchableOpacity>

      {/* Dots */}
      {renderDots()}

      {/* Slide container */}
      <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
        {renderCurrentStep()}
      </Animated.View>
    </SafeAreaView>
  );
}
