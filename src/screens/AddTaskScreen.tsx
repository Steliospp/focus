import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
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
  type DecompositionResult,
  type AIAnalysis,
} from "../store/useAppStore";
import type { PlannedSession } from "../store/useAppStore";
import { analyzeTask, decomposeTask, generateSessionPlan } from "../services/ai";
import { useDeadlineScheduling } from "../hooks/useDeadlineScheduling";
import { MascotOrb } from "../components/ui/MascotOrb";

type Nav = NativeStackNavigationProp<any>;

const COMMON_APPS = ["Instagram", "TikTok", "Snapchat", "YouTube", "Reddit", "Discord"];

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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface EditableSubtask {
  id: string;
  name: string;
  estimatedMinutes: number;
  proofType: ProofType;
  waitMinutesAfter: number;
  waitReason: string;
}

export function AddTaskScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<{ params: { taskId?: string } }, "params">>();
  const editTaskId = route.params?.taskId;

  const { tasks, addTask, updateTask, blockedApps: storeBlockedApps, unavailableDays: storeUnavailableDays, blockedDates } = useAppStore();
  const { getExistingLoadByDate } = useDeadlineScheduling();

  const existingTask = editTaskId ? tasks.find((t) => t.id === editTaskId) : null;

  // --- Flow state ---
  const [step, setStep] = useState(1);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // --- Task fields ---
  const [name, setName] = useState(existingTask?.name ?? "");
  const [deadline, setDeadline] = useState<string | null>(null);
  const [duration, setDuration] = useState(existingTask?.estimatedMinutes ?? 45);
  const [selectedApps, setSelectedApps] = useState<string[]>(
    existingTask?.blockedApps ?? [...storeBlockedApps]
  );

  // --- Calendar state for date picker ---
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // --- AI analysis state ---
  const [loading, setLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(existingTask?.aiAnalysis ?? null);
  const [decomposition, setDecomposition] = useState<DecompositionResult | null>(null);
  const [editableSubtasks, setEditableSubtasks] = useState<EditableSubtask[]>([]);
  const [editingDurationIndex, setEditingDurationIndex] = useState<number | null>(null);

  // --- Animation ---
  const goToStep = (nextStep: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(nextStep);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  // --- Helpers ---
  const toggleApp = (app: string) => {
    setSelectedApps((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]
    );
  };

  const buildTaskData = (): Partial<Task> => ({
    name: name.trim(),
    description: "",
    category: "other" as TaskCategory,
    estimatedMinutes: duration,
    proofType: "photo" as ProofType,
    blockedApps: selectedApps,
  });

  // --- Step 5: AI Analysis ---
  const runAiAnalysis = async () => {
    setLoading(true);
    try {
      const taskData = buildTaskData();

      // If deadline was set, generate session plan
      if (deadline) {
        const [analysis, sessions] = await Promise.all([
          analyzeTask(taskData),
          generateSessionPlan(
            taskData,
            deadline,
            storeUnavailableDays,
            blockedDates,
            getExistingLoadByDate(),
          ),
        ]);
        setAiAnalysis(analysis);

        // Also try decomposition
        const decomp = await decomposeTask(taskData);
        setDecomposition(decomp);
        if (decomp.isMultiStep && decomp.subtasks.length > 0) {
          setEditableSubtasks(
            decomp.subtasks.map((s, i) => ({
              id: Date.now().toString() + "-" + i,
              name: s.name,
              estimatedMinutes: s.estimatedMinutes,
              proofType: s.proofType,
              waitMinutesAfter: s.waitMinutesAfter,
              waitReason: s.waitReason,
            }))
          );
        }
      } else {
        // No deadline: run analyzeTask and decomposeTask in parallel
        const [analysis, decomp] = await Promise.all([
          analyzeTask(taskData),
          decomposeTask(taskData),
        ]);
        setAiAnalysis(analysis);
        setDecomposition(decomp);
        if (decomp.isMultiStep && decomp.subtasks.length > 0) {
          setEditableSubtasks(
            decomp.subtasks.map((s, i) => ({
              id: Date.now().toString() + "-" + i,
              name: s.name,
              estimatedMinutes: s.estimatedMinutes,
              proofType: s.proofType,
              waitMinutesAfter: s.waitMinutesAfter,
              waitReason: s.waitReason,
            }))
          );
        }
      }
    } catch (err) {
      Alert.alert("Error", "Something went wrong analyzing your task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 5) {
      runAiAnalysis();
    }
  }, [step]);

  // --- Create single task ---
  const createSingleTask = async () => {
    const taskData = buildTaskData();
    const analysis = aiAnalysis;

    if (editTaskId && existingTask) {
      updateTask(editTaskId, {
        ...taskData,
        aiAnalysis: analysis,
        proofType: analysis?.recommendedProofType ?? "photo",
        category: (analysis?.taskType as TaskCategory) ?? "other",
      });
      navigation.navigate("ActiveTask", { taskId: editTaskId });
    } else {
      const newId = Date.now().toString();
      const newTask: Task = {
        id: newId,
        name: taskData.name!,
        description: "",
        category: (analysis?.taskType as TaskCategory) ?? "other",
        estimatedMinutes: duration,
        deadline,
        blockedApps: selectedApps,
        proofType: analysis?.recommendedProofType ?? "photo",
        status: "todo",
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        aiAnalysis: analysis,
        proofSubmission: null,
        aiGrade: null,
        reflectionAnswers: {},
      };
      addTask(newTask);
      navigation.navigate("ActiveTask", { taskId: newId });
    }
  };

  // --- Create multi-step task ---
  const handleStartMultiStep = async () => {
    if (editableSubtasks.length === 0) {
      Alert.alert("No steps", "Add at least one step to continue.");
      return;
    }

    try {
      const taskData = buildTaskData();

      const subtasks: Subtask[] = editableSubtasks.map((es) => ({
        id: es.id,
        name: es.name.trim(),
        estimatedMinutes: es.estimatedMinutes,
        proofType: es.proofType,
        waitMinutesAfter: es.waitMinutesAfter,
        waitReason: es.waitReason,
        status: "pending",
        aiGrade: null,
        proofSubmission: null,
      }));

      const totalActiveMinutes = subtasks.reduce((sum, s) => sum + s.estimatedMinutes, 0);

      const subtaskNames = subtasks.map((s) => s.name);
      const analysis = await analyzeTask(taskData, subtaskNames);

      // Map stepIndex in photoPrompts to actual subtask IDs
      if (analysis.photoPrompts) {
        analysis.photoPrompts = analysis.photoPrompts.map((pp) => {
          if (pp.stepIndex !== undefined && pp.stepIndex < subtasks.length) {
            return { ...pp, stepId: subtasks[pp.stepIndex].id };
          }
          return pp;
        });
      }

      const newId = Date.now().toString();
      const newTask: Task = {
        id: newId,
        name: taskData.name!,
        description: "",
        category: (analysis?.taskType as TaskCategory) ?? "other",
        estimatedMinutes: totalActiveMinutes,
        deadline,
        blockedApps: selectedApps,
        proofType: analysis?.recommendedProofType ?? "photo",
        status: "todo",
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        aiAnalysis: analysis,
        proofSubmission: null,
        aiGrade: null,
        reflectionAnswers: {},
        isMultiStep: true,
        subtasks,
        currentSubtaskIndex: 0,
      };

      addTask(newTask);
      navigation.navigate("ActiveTask", { taskId: newId });
    } catch (err) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  // --- Handle "let's go" ---
  const handleLetsGo = () => {
    if (decomposition?.isMultiStep && editableSubtasks.length > 0) {
      handleStartMultiStep();
    } else {
      createSingleTask();
    }
  };

  // --- Proof type description ---
  const getProofDescription = (proofType?: ProofType): string => {
    switch (proofType) {
      case "photo": return "one photo when you're done";
      case "written": return "a written summary of what you did";
      case "honor": return "no proof needed, just your reflection";
      default: return "one photo when you're done";
    }
  };

  // --- Update editable subtask duration ---
  const updateSubtaskDuration = (index: number, val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setEditableSubtasks((prev) =>
        prev.map((s, i) => (i === index ? { ...s, estimatedMinutes: num } : s))
      );
    }
  };

  // ========== RENDER STEPS ==========

  const renderStep1 = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 32 }}>
        <Text
          style={{
            fontFamily: "CormorantGaramond-Italic",
            fontSize: 32,
            color: "#1C1917",
            marginBottom: 24,
          }}
        >
          What do you need to do?
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="write your essay, study chapter 5..."
          placeholderTextColor="#A8A29E"
          autoFocus
          style={{
            fontFamily: "DMSans-Regular",
            fontSize: 18,
            color: "#1C1917",
            fontStyle: name ? "normal" : "italic",
            paddingVertical: 8,
          }}
          multiline
        />
      </View>
      {name.trim().length >= 3 && (
        <View style={{ paddingHorizontal: 32, paddingBottom: 32 }}>
          <TouchableOpacity
            onPress={() => goToStep(2)}
            activeOpacity={0.7}
            style={{
              backgroundColor: "#D97706",
              borderRadius: 9999,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ fontFamily: "DMSans-Medium", fontSize: 17, color: "#FAF8F4" }}>
              Next
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );

  const renderStep2 = () => {
    const today = new Date();
    const todayKey = toDateKey(today);

    // End of week (Sunday)
    const endOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    endOfWeek.setDate(today.getDate() + daysUntilSunday);
    const endOfWeekKey = toDateKey(endOfWeek);

    const handleSelectToday = () => {
      setDeadline(todayKey);
      goToStep(3);
    };

    const handleSelectThisWeek = () => {
      setDeadline(endOfWeekKey);
      goToStep(3);
    };

    const handlePickDate = (dateKey: string) => {
      setSelectedDate(dateKey);
      setDeadline(dateKey);
      // Auto-advance after picking
      setTimeout(() => goToStep(3), 300);
    };

    // Calendar grid
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfWeek(year, month);

    const calendarCells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) calendarCells.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 60 }}>
        <Text
          style={{
            fontFamily: "CormorantGaramond-Italic",
            fontSize: 32,
            color: "#1C1917",
            marginBottom: 36,
          }}
        >
          When does this need to be done?
        </Text>

        <TouchableOpacity onPress={handleSelectToday} activeOpacity={0.7} style={{ paddingVertical: 20 }}>
          <Text style={{ fontFamily: "DMSans-Medium", fontSize: 18, color: "#1C1917" }}>today</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSelectThisWeek} activeOpacity={0.7} style={{ paddingVertical: 20 }}>
          <Text style={{ fontFamily: "DMSans-Medium", fontSize: 18, color: "#1C1917" }}>this week</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowDatePicker(!showDatePicker)}
          activeOpacity={0.7}
          style={{ paddingVertical: 20 }}
        >
          <Text style={{ fontFamily: "DMSans-Medium", fontSize: 18, color: "#1C1917" }}>pick a date</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <View style={{ marginTop: 8 }}>
            {/* Month navigation */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => setCalendarMonth(new Date(year, month - 1, 1))}
                activeOpacity={0.7}
              >
                <Text style={{ fontFamily: "DMSans-Medium", fontSize: 18, color: "#78716C" }}>{"<"}</Text>
              </TouchableOpacity>
              <Text style={{ fontFamily: "DMSans-Medium", fontSize: 16, color: "#1C1917" }}>
                {MONTH_NAMES[month]} {year}
              </Text>
              <TouchableOpacity
                onPress={() => setCalendarMonth(new Date(year, month + 1, 1))}
                activeOpacity={0.7}
              >
                <Text style={{ fontFamily: "DMSans-Medium", fontSize: 18, color: "#78716C" }}>{">"}</Text>
              </TouchableOpacity>
            </View>

            {/* Weekday headers */}
            <View style={{ flexDirection: "row" }}>
              {WEEKDAY_LABELS.map((label, i) => (
                <View key={i} style={{ flex: 1, alignItems: "center", paddingBottom: 8 }}>
                  <Text style={{ fontFamily: "DMSans-Regular", fontSize: 13, color: "#A8A29E" }}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Day grid */}
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {calendarCells.map((day, i) => {
                if (day === null) {
                  return <View key={`empty-${i}`} style={{ width: "14.28%" }} />;
                }
                const dateKey = toDateKey(new Date(year, month, day));
                const isSelected = selectedDate === dateKey;
                const isPast = dateKey < todayKey;
                return (
                  <TouchableOpacity
                    key={dateKey}
                    disabled={isPast}
                    onPress={() => handlePickDate(dateKey)}
                    activeOpacity={0.7}
                    style={{
                      width: "14.28%",
                      alignItems: "center",
                      paddingVertical: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "DMSans-Regular",
                        fontSize: 16,
                        color: isPast ? "#E7E5E4" : isSelected ? "#D97706" : "#1C1917",
                      }}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={() => {
            setDeadline(null);
            goToStep(3);
          }}
          activeOpacity={0.7}
          style={{ paddingTop: 32, paddingBottom: 24 }}
        >
          <Text style={{ fontFamily: "DMSans-Regular", fontSize: 14, color: "#A8A29E" }}>
            {"or skip if there's no deadline \u2192"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderStep3 = () => (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
      <Text
        style={{
          fontFamily: "CormorantGaramond-Italic",
          fontSize: 32,
          color: "#1C1917",
          marginBottom: 48,
          textAlign: "center",
        }}
      >
        How long will this take?
      </Text>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
        {/* Minus button */}
        <TouchableOpacity
          onPress={() => setDuration((d) => Math.max(15, d - 15))}
          activeOpacity={0.7}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontFamily: "DMSans-Light", fontSize: 32, color: "#78716C" }}>{"\u2212"}</Text>
        </TouchableOpacity>

        {/* Duration display */}
        <View style={{ alignItems: "center", marginHorizontal: 32 }}>
          <Text style={{ fontFamily: "CormorantGaramond-Italic", fontSize: 72, color: "#1C1917" }}>{duration}</Text>
          <Text style={{ fontFamily: "DMSans-Regular", fontSize: 16, color: "#78716C" }}>minutes</Text>
        </View>

        {/* Plus button */}
        <TouchableOpacity
          onPress={() => setDuration((d) => Math.min(180, d + 15))}
          activeOpacity={0.7}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontFamily: "DMSans-Light", fontSize: 32, color: "#78716C" }}>+</Text>
        </TouchableOpacity>
      </View>

      <Text
        style={{
          fontFamily: "DMSans-Regular",
          fontSize: 14,
          color: "#A8A29E",
          marginTop: 32,
          textAlign: "center",
        }}
      >
        AI will adjust this based on your history
      </Text>

      <View style={{ position: "absolute", bottom: 32, left: 32, right: 32 }}>
        <TouchableOpacity
          onPress={() => goToStep(4)}
          activeOpacity={0.7}
          style={{
            backgroundColor: "#D97706",
            borderRadius: 9999,
            paddingVertical: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ fontFamily: "DMSans-Medium", fontSize: 17, color: "#FAF8F4" }}>
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={{ flex: 1, paddingHorizontal: 32, paddingTop: 60 }}>
      <Text
        style={{
          fontFamily: "CormorantGaramond-Italic",
          fontSize: 32,
          color: "#1C1917",
          marginBottom: 12,
        }}
      >
        Block any apps while you work?
      </Text>
      <Text
        style={{
          fontFamily: "DMSans-Regular",
          fontSize: 15,
          color: "#78716C",
          marginBottom: 28,
        }}
      >
        These will lock until you submit proof
      </Text>

      {COMMON_APPS.map((app) => {
        const isSelected = selectedApps.includes(app);
        return (
          <TouchableOpacity
            key={app}
            onPress={() => toggleApp(app)}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 14,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: isSelected ? "#D97706" : "transparent",
                borderWidth: isSelected ? 0 : 1.5,
                borderColor: "#E7E5E4",
              }}
            />
            <Text
              style={{
                fontFamily: "DMSans-Regular",
                fontSize: 17,
                color: "#1C1917",
                marginLeft: 14,
              }}
            >
              {app}
            </Text>
          </TouchableOpacity>
        );
      })}

      <View style={{ position: "absolute", bottom: 32, left: 32, right: 32, alignItems: "center" }}>
        <TouchableOpacity
          onPress={() => {
            setSelectedApps([]);
            goToStep(5);
          }}
          activeOpacity={0.7}
          style={{ marginBottom: 16 }}
        >
          <Text style={{ fontFamily: "DMSans-Regular", fontSize: 14, color: "#A8A29E" }}>
            skip
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => goToStep(5)}
          activeOpacity={0.7}
          style={{
            backgroundColor: "#D97706",
            borderRadius: 9999,
            paddingVertical: 16,
            alignItems: "center",
            width: "100%",
          }}
        >
          <Text style={{ fontFamily: "DMSans-Medium", fontSize: 17, color: "#FAF8F4" }}>
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep5 = () => {
    const isMultiStep = decomposition?.isMultiStep && editableSubtasks.length > 0;

    if (loading) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
          <Text
            style={{
              fontFamily: "CormorantGaramond-Italic",
              fontSize: 24,
              color: "#1C1917",
              marginBottom: 40,
              textAlign: "center",
            }}
          >
            {name}
          </Text>
          <MascotOrb mood="default" size={60} />
          <Text
            style={{
              fontFamily: "DMSans-Regular",
              fontSize: 16,
              color: "#78716C",
              marginTop: 24,
            }}
          >
            thinking about your task...
          </Text>
        </View>
      );
    }

    if (!aiAnalysis) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
          <Text style={{ fontFamily: "DMSans-Regular", fontSize: 16, color: "#78716C" }}>
            Something went wrong. Tap to retry.
          </Text>
          <TouchableOpacity onPress={runAiAnalysis} activeOpacity={0.7} style={{ marginTop: 16 }}>
            <Text style={{ fontFamily: "DMSans-Medium", fontSize: 16, color: "#D97706" }}>retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isMultiStep) {
      // Multi-step view
      return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 60, paddingBottom: 80 }}>
          <Text
            style={{
              fontFamily: "CormorantGaramond-Italic",
              fontSize: 24,
              color: "#1C1917",
              marginBottom: 8,
            }}
          >
            {name}
          </Text>
          <Text
            style={{
              fontFamily: "CormorantGaramond-Italic",
              fontSize: 22,
              color: "#1C1917",
              marginBottom: 24,
            }}
          >
            this has a few steps
          </Text>

          {editableSubtasks.map((subtask, index) => (
            <View key={subtask.id} style={{ marginBottom: 16 }}>
              <Text style={{ fontFamily: "DMSans-Regular", fontSize: 16, color: "#1C1917", lineHeight: 28 }}>
                {index + 1}. {subtask.name} {"\u2014"}{" "}
                {editingDurationIndex === index ? (
                  <Text> </Text>
                ) : (
                  <Text
                    onPress={() => setEditingDurationIndex(index)}
                    style={{ color: "#1C1917" }}
                  >
                    {subtask.estimatedMinutes} min
                  </Text>
                )}
                {" \u2014 "}{subtask.proofType} when done
              </Text>
              {editingDurationIndex === index && (
                <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 24, marginTop: 4 }}>
                  <TextInput
                    value={subtask.estimatedMinutes.toString()}
                    onChangeText={(val) => updateSubtaskDuration(index, val)}
                    onBlur={() => setEditingDurationIndex(null)}
                    keyboardType="number-pad"
                    autoFocus
                    style={{
                      fontFamily: "DMSans-Regular",
                      fontSize: 16,
                      color: "#1C1917",
                      borderBottomWidth: 1,
                      borderBottomColor: "#D97706",
                      width: 48,
                      textAlign: "center",
                      paddingVertical: 2,
                    }}
                  />
                  <Text style={{ fontFamily: "DMSans-Regular", fontSize: 14, color: "#78716C", marginLeft: 4 }}>min</Text>
                </View>
              )}
              {subtask.waitMinutesAfter > 0 && (
                <Text
                  style={{
                    fontFamily: "DMSans-Regular",
                    fontStyle: "italic",
                    fontSize: 14,
                    color: "#A8A29E",
                    marginLeft: 24,
                    marginTop: 2,
                  }}
                >
                  {subtask.waitMinutesAfter} min free time ({subtask.waitReason})
                </Text>
              )}
            </View>
          ))}

          <View style={{ marginTop: 24, alignItems: "flex-start" }}>
            <TouchableOpacity onPress={handleLetsGo} activeOpacity={0.7}>
              <Text style={{ fontFamily: "DMSans-Medium", fontSize: 18, color: "#D97706" }}>
                {"let's go \u2192"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => goToStep(1)} activeOpacity={0.7} style={{ marginTop: 16 }}>
              <Text style={{ fontFamily: "DMSans-Regular", fontSize: 14, color: "#A8A29E" }}>
                edit details
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    // Single task view
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 60, paddingBottom: 80 }}>
        <Text
          style={{
            fontFamily: "CormorantGaramond-Italic",
            fontSize: 24,
            color: "#1C1917",
            marginBottom: 24,
          }}
        >
          {name}
        </Text>

        <Text
          style={{
            fontFamily: "CormorantGaramond-Italic",
            fontSize: 22,
            color: "#1C1917",
            marginBottom: 20,
          }}
        >
          Here's how I'll grade this
        </Text>

        {aiAnalysis.gradingCriteria.map((criterion, i) => (
          <Text
            key={i}
            style={{
              fontFamily: "DMSans-Regular",
              fontSize: 16,
              color: "#1C1917",
              lineHeight: 28,
            }}
          >
            {"\u00B7"} {criterion}
          </Text>
        ))}

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: "#E7E5E4", marginVertical: 20 }} />

        <Text
          style={{
            fontFamily: "DMSans-Regular",
            fontSize: 15,
            color: "#78716C",
          }}
        >
          proof needed: {getProofDescription(aiAnalysis.recommendedProofType)}
        </Text>

        <View style={{ marginTop: 32, alignItems: "flex-start" }}>
          <TouchableOpacity onPress={handleLetsGo} activeOpacity={0.7}>
            <Text style={{ fontFamily: "DMSans-Medium", fontSize: 18, color: "#D97706" }}>
              {"let's go \u2192"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => goToStep(1)} activeOpacity={0.7} style={{ marginTop: 16 }}>
            <Text style={{ fontFamily: "DMSans-Regular", fontSize: 14, color: "#A8A29E" }}>
              edit details
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // ========== MAIN RENDER ==========
  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return renderStep1();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAF8F4" }}>
      {/* Close button */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
        style={{ position: "absolute", top: 56, left: 24, zIndex: 10 }}
      >
        <Text style={{ fontFamily: "DMSans-Regular", fontSize: 24, color: "#A8A29E" }}>{"\u2715"}</Text>
      </TouchableOpacity>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {renderCurrentStep()}
      </Animated.View>
    </SafeAreaView>
  );
}
