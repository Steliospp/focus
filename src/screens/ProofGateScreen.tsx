import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  BackHandler,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

import { MascotOrb } from "../components/ui/MascotOrb";
import { BottomSheet } from "../components/ui/BottomSheet";
import { useAppStore } from "../store/useAppStore";
import type { PhotoPrompt, CapturedPhoto } from "../store/useAppStore";
import { gradePhotoProof, gradeWrittenProof } from "../services/ai";
import { theme } from "../theme";

type Nav = NativeStackNavigationProp<any>;

type ProofState = "capture" | "review" | "grading" | "pass" | "fail";

async function uriToBase64(uri: string): Promise<string> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1] ?? dataUrl;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Base64 conversion failed:", err);
    return "";
  }
}

export function ProofGateScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<
    RouteProp<{
      params: {
        taskId: string;
        capturedPhotos?: Record<string, string>;
      };
    }>
  >();
  const taskId = route.params.taskId;
  const incomingPhotos = route.params.capturedPhotos ?? {};

  const task = useAppStore((s) => s.tasks.find((t) => t.id === taskId));
  const updateTask = useAppStore((s) => s.updateTask);
  const streakDays = useAppStore((s) => s.streakDays);
  const emergencyUnlocksRemaining = useAppStore((s) => s.emergencyUnlocksRemaining);
  const weeklyAbandonCount = useAppStore((s) => s.weeklyAbandonCount);
  const abandonTask = useAppStore((s) => s.abandonTask);
  const emergencyUnlockTask = useAppStore((s) => s.emergencyUnlockTask);
  const incrementFailedProofAttempts = useAppStore((s) => s.incrementFailedProofAttempts);

  // --- State ---
  const [proofState, setProofState] = useState<ProofState>("capture");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUris, setPhotoUris] = useState<Record<string, string>>(incomingPhotos);
  const [writtenSummary, setWrittenSummary] = useState("");
  const [gradeResult, setGradeResult] = useState<{
    score: number;
    passed: boolean;
    comment: string;
    strengths: string[];
    improvements: string[];
    unlocksApps: boolean;
  } | null>(null);
  const [showAbandonSheet, setShowAbandonSheet] = useState(false);
  const [showEmergencySheet, setShowEmergencySheet] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState("");
  const [backWarning, setBackWarning] = useState(false);

  const failedAttempts = task?.failedProofAttempts ?? 0;

  // Allow navigation when intentionally exiting
  const allowExit = useRef(false);

  // --- Animations ---
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const warningOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsing animation for grading state
  useEffect(() => {
    if (proofState === "grading") {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [proofState]);

  const triggerShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();

    setBackWarning(true);
    Animated.sequence([
      Animated.timing(warningOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(warningOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setBackWarning(false));
  };

  // --- Navigation Lock ---
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (allowExit.current) return;
      e.preventDefault();
      triggerShake();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      triggerShake();
      return true;
    });
    return () => handler.remove();
  }, []);

  // --- Effective proof type ---
  const effectiveProofType = (() => {
    if (task?.isMultiStep && task.subtasks?.length) {
      const hasPhoto = task.subtasks.some((s) => s.proofType === "photo");
      if (hasPhoto) return "photo";
      const hasWritten = task.subtasks.some((s) => s.proofType === "written");
      if (hasWritten) return "written";
    }
    return task?.proofType ?? "written";
  })();

  // Honor system: auto-navigate to Reflect
  useEffect(() => {
    if (effectiveProofType === "honor") {
      allowExit.current = true;
      navigation.replace("Reflect", { taskId });
    }
  }, [effectiveProofType]);

  // --- Photo prompts ---
  const allPrompts = task?.aiAnalysis?.photoPrompts ?? [];
  const requiredPrompts = allPrompts.filter((p) => p.requiresPhoto);
  const allPhotoCaptured = requiredPrompts.every((p) => !!photoUris[p.id]);

  // Before photo from captured photos (start timing)
  const beforePrompt = allPrompts.find((p) => p.photoTiming === "start" && photoUris[p.id]);
  const beforePhotoUri = beforePrompt ? photoUris[beforePrompt.id] : null;

  const isDoer = task?.archetype === "doer";
  const isProducer = task?.archetype === "producer";

  // Get the main capture prompt text
  const getCapturePromptText = (): string => {
    // Doer tasks: simple, friendly prompt
    if (isDoer) {
      return "Show me you did it \u{1F4AA}";
    }

    const suggestions = task?.aiAnalysis?.proofSuggestions ?? [];
    const endPrompts = allPrompts.filter((p) => p.photoTiming === "end" && p.requiresPhoto);

    if (endPrompts.length > 0) {
      return endPrompts[0].photoPrompt;
    }
    if (suggestions.length > 0) {
      const afterSuggestion = suggestions[suggestions.length - 1];
      return afterSuggestion;
    }
    return "Show me what you've done \u{1F4F8}";
  };

  // Get grading criteria hint
  const getGradingHint = (): string | null => {
    const endPrompts = allPrompts.filter((p) => p.photoTiming === "end" && p.requiresPhoto);
    if (endPrompts.length > 0) {
      return endPrompts[0].whatAILooksFor;
    }
    const criteria = task?.aiAnalysis?.gradingCriteria ?? [];
    if (criteria.length > 0) {
      return criteria[0];
    }
    return null;
  };

  // --- Image picker ---
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);

      // Also store in photoUris for the grading logic
      const endPrompts = allPrompts.filter((p) => p.photoTiming === "end" && p.requiresPhoto);
      if (endPrompts.length > 0) {
        setPhotoUris((prev) => ({ ...prev, [endPrompts[0].id]: uri }));
      } else {
        setPhotoUris((prev) => ({ ...prev, "legacy-proof": uri }));
      }

      setProofState("review");
    }
  };

  // --- Grading handlers ---
  const handleGradeResult = (grade: {
    score: number;
    passed: boolean;
    comment: string;
    strengths: string[];
    improvements: string[];
    unlocksApps: boolean;
  }) => {
    setGradeResult(grade);
    if (grade.score >= 60) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const isMultiStep = task?.isMultiStep && task.subtasks && task.subtasks.length > 0;
      const currentIdx = task?.currentSubtaskIndex ?? 0;
      const hasMoreSteps = isMultiStep && currentIdx < task!.subtasks!.length - 1;

      if (hasMoreSteps) {
        allowExit.current = true;
        updateTask(taskId, { aiGrade: grade, exitPath: "proof" });

        // Mark current subtask completed, advance index
        const updatedSubtasks = [...task!.subtasks!];
        updatedSubtasks[currentIdx] = { ...updatedSubtasks[currentIdx], status: "completed" as const };

        // Check if next step needs to wait or go directly
        const currentSub = updatedSubtasks[currentIdx];
        const hasWait = (currentSub as any).waitMinutesAfter > 0;
        const nextIdx = currentIdx + 1;
        updatedSubtasks[nextIdx] = { ...updatedSubtasks[nextIdx], status: hasWait ? ("pending" as const) : ("active" as const) };

        updateTask(taskId, {
          subtasks: updatedSubtasks,
          currentSubtaskIndex: hasWait ? currentIdx : nextIdx,
        });

        navigation.replace("ActiveTask", { taskId, autoAdvanceFromProof: true });
      } else {
        setProofState("pass");
      }
    } else {
      incrementFailedProofAttempts(taskId);
      updateTask(taskId, { aiGrade: grade });
      setProofState("fail");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const handlePhotoSubmit = async () => {
    if (!task) return;
    setProofState("grading");
    try {
      const photosWithPrompts: Array<{ prompt: PhotoPrompt; imageBase64: string }> = [];
      const capturedPhotoRecords: CapturedPhoto[] = [];

      for (const prompt of requiredPrompts) {
        const uri = photoUris[prompt.id];
        if (!uri) continue;
        const base64 = await uriToBase64(uri);
        if (base64) {
          photosWithPrompts.push({ prompt, imageBase64: base64 });
          capturedPhotoRecords.push({
            promptId: prompt.id,
            imageBase64: base64,
            capturedAt: new Date().toISOString(),
          });
        }
      }

      // Legacy fallback
      if (allPrompts.length === 0 && photoUris["legacy-proof"]) {
        const base64 = await uriToBase64(photoUris["legacy-proof"]);
        capturedPhotoRecords.push({
          promptId: "legacy-proof",
          imageBase64: base64,
          capturedAt: new Date().toISOString(),
        });
      }

      const grade = await gradePhotoProof(task, photosWithPrompts);

      updateTask(taskId, {
        proofSubmission: {
          type: "photo",
          capturedPhotos: capturedPhotoRecords,
          submittedAt: new Date().toISOString(),
        },
      });

      handleGradeResult(grade);
    } catch (err) {
      console.error("Photo proof submission failed:", err);
      setProofState("review");
    }
  };

  const handleWrittenSubmit = async () => {
    if (!task) return;
    setProofState("grading");
    try {
      const grade = await gradeWrittenProof(task, writtenSummary);

      updateTask(taskId, {
        proofSubmission: {
          type: "written",
          writtenSummary,
          submittedAt: new Date().toISOString(),
        },
      });

      handleGradeResult(grade);
    } catch (err) {
      console.error("Written proof submission failed:", err);
      setProofState("capture");
    }
  };

  const handleRetake = () => {
    setProofState("capture");
    setPhotoUri(null);
    setGradeResult(null);
    // Clear end-timing photos so user can retake them
    setPhotoUris((prev) => {
      const next = { ...prev };
      for (const p of allPrompts) {
        if (p.photoTiming === "end") delete next[p.id];
      }
      delete next["legacy-proof"];
      return next;
    });
    setWrittenSummary("");
  };

  const handlePassDone = () => {
    allowExit.current = true;
    if (gradeResult) {
      updateTask(taskId, { aiGrade: gradeResult, exitPath: "proof" });
    }
    navigation.replace("Reflect", { taskId });
  };

  // --- Abandon ---
  const handleAbandon = () => {
    allowExit.current = true;
    abandonTask(taskId, "User abandoned from proof gate");
    setShowAbandonSheet(false);
    navigation.replace("Cooldown");
  };

  // --- Emergency unlock ---
  const handleEmergencyUnlock = () => {
    allowExit.current = true;
    emergencyUnlockTask(taskId, emergencyReason);
    setShowEmergencySheet(false);
    navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
  };

  if (!task) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1C1917", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#A8A29E", fontFamily: "DMSans-Regular", fontSize: 16 }}>
          Task not found
        </Text>
      </View>
    );
  }

  const gradingHint = getGradingHint();

  // ==========================================
  // RENDER: Photo proof flow
  // ==========================================
  const renderPhotoProof = () => {
    switch (proofState) {
      case "capture":
        return (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
            {/* Before photo reference */}
            {beforePhotoUri && (
              <View style={{ position: "absolute", top: 20, left: 20 }}>
                <Image
                  source={{ uri: beforePhotoUri }}
                  style={{ width: 56, height: 56, borderRadius: 12 }}
                  resizeMode="cover"
                />
                <Text style={{ fontFamily: "DMSans-Regular", fontSize: 10, color: "#A8A29E", marginTop: 4, textAlign: "center" }}>
                  before
                </Text>
              </View>
            )}

            <Text
              style={{
                fontFamily: "CormorantGaramond-Italic",
                fontSize: 28,
                color: "#1C1917",
                textAlign: "center",
                lineHeight: 36,
              }}
            >
              {getCapturePromptText()}
            </Text>

            {/* Camera button */}
            <TouchableOpacity
              onPress={handlePickImage}
              activeOpacity={0.7}
              style={{
                marginTop: 24,
                width: 80,
                height: 80,
                borderRadius: 40,
                borderWidth: 2,
                borderColor: "#D97706",
                backgroundColor: "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="camera" size={32} color="#D97706" />
            </TouchableOpacity>

            {/* Grading criteria hint */}
            {gradingHint && (
              <Text
                style={{
                  fontFamily: "DMSans-Regular",
                  fontSize: 13,
                  color: "#A8A29E",
                  textAlign: "center",
                  marginTop: 16,
                  maxWidth: 260,
                }}
              >
                looking for: {gradingHint}
              </Text>
            )}
          </View>
        );

      case "review":
        return (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
            {photoUri && (
              <Image
                source={{ uri: photoUri }}
                style={{ width: 200, height: 200, borderRadius: 16 }}
                resizeMode="cover"
              />
            )}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 20,
                gap: 32,
              }}
            >
              <TouchableOpacity onPress={handleRetake} activeOpacity={0.7} style={{ paddingVertical: 8 }}>
                <Text style={{ fontFamily: "DMSans-Regular", fontSize: 16, color: "#A8A29E" }}>
                  retake
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handlePhotoSubmit} activeOpacity={0.7} style={{ paddingVertical: 8 }}>
                <Text style={{ fontFamily: "DMSans-Medium", fontSize: 16, color: "#D97706" }}>
                  {"looks good \u2192"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case "grading":
        return renderGradingState();

      case "pass":
        return renderPassState();

      case "fail":
        return renderFailState();

      default:
        return null;
    }
  };

  // ==========================================
  // RENDER: Written proof flow
  // ==========================================
  const renderWrittenProof = () => {
    switch (proofState) {
      case "capture":
        return (
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 32 }}>
            <Text
              style={{
                fontFamily: "CormorantGaramond-Italic",
                fontSize: 28,
                color: "#1C1917",
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              {isProducer ? "Paste what you wrote" : "Tell me what you did"}
            </Text>

            <TextInput
              multiline
              placeholder="describe what you accomplished..."
              placeholderTextColor="#A8A29E"
              value={writtenSummary}
              onChangeText={setWrittenSummary}
              style={{
                fontFamily: "DMSans-Regular",
                fontSize: 17,
                color: "#1C1917",
                minHeight: 150,
                textAlignVertical: "top",
                lineHeight: 26,
              }}
            />

            {writtenSummary.length > 20 && (
              <TouchableOpacity
                onPress={handleWrittenSubmit}
                activeOpacity={0.7}
                style={{ alignSelf: "center", paddingVertical: 12, marginTop: 16 }}
              >
                <Text style={{ fontFamily: "DMSans-Medium", fontSize: 16, color: "#D97706" }}>
                  {"grade my work \u2192"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case "grading":
        return renderGradingState();

      case "pass":
        return renderPassState();

      case "fail":
        return renderFailState();

      default:
        return null;
    }
  };

  // ==========================================
  // RENDER: Shared states (grading, pass, fail)
  // ==========================================
  const renderGradingState = () => (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <MascotOrb mood="default" size={60} />
      </Animated.View>
      <Text
        style={{
          fontFamily: "DMSans-Regular",
          fontSize: 16,
          color: "#78716C",
          marginTop: 20,
        }}
      >
        checking your work...
      </Text>
    </View>
  );

  const renderPassState = () => (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
      <MascotOrb mood="happy" size={60} />

      <Text
        style={{
          fontFamily: "CormorantGaramond-Italic",
          fontSize: 28,
          color: "#1C1917",
          marginTop: 20,
        }}
      >
        {"looks great \u2713"}
      </Text>

      {/* Score */}
      {gradeResult && (
        <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 16 }}>
          <Text style={{ fontFamily: "DMSans-Regular", fontSize: 48, color: "#1C1917" }}>
            {gradeResult.score}
          </Text>
          <Text style={{ fontFamily: "DMSans-Regular", fontSize: 18, color: "#A8A29E", marginLeft: 4 }}>
            / 100
          </Text>
        </View>
      )}

      {/* AI comment */}
      {gradeResult?.comment && (
        <Text
          style={{
            fontFamily: "DMSans-Regular",
            fontSize: 15,
            color: "#78716C",
            textAlign: "center",
            marginTop: 12,
            maxWidth: 280,
          }}
        >
          {gradeResult.comment}
        </Text>
      )}

      <TouchableOpacity
        onPress={handlePassDone}
        activeOpacity={0.7}
        style={{ paddingVertical: 12, marginTop: 32 }}
      >
        <Text style={{ fontFamily: "DMSans-Medium", fontSize: 16, color: "#D97706" }}>
          {"done \u2192"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFailState = () => {
    // Doer tasks: after 1 failed attempt, just pass with low score
    const doerAutoPass = isDoer && failedAttempts >= 1;

    if (doerAutoPass) {
      // Auto-pass doer tasks after one retry — they tried, that's enough
      const autoGrade = {
        score: 65,
        passed: true,
        comment: "We'll take your word for it. Good job getting it done.",
        strengths: ["Task was attempted"],
        improvements: [],
        unlocksApps: true,
      };
      // Trigger pass flow
      setTimeout(() => handleGradeResult(autoGrade), 0);
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
          <MascotOrb mood="default" size={60} />
          <Text style={{ fontFamily: "DMSans-Regular", fontSize: 16, color: "#78716C", marginTop: 20 }}>
            accepting your proof...
          </Text>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
        <MascotOrb mood="warning" size={60} />

        <Text
          style={{
            fontFamily: "DMSans-Regular",
            fontSize: 16,
            color: "#78716C",
            textAlign: "center",
            maxWidth: 280,
            marginTop: 20,
            lineHeight: 24,
          }}
        >
          {isDoer
            ? "Can you show the result a bit more clearly?"
            : gradeResult?.comment || gradeResult?.improvements?.[0] || "That doesn't quite look right. Can you try again?"}
        </Text>

        <TouchableOpacity
          onPress={handleRetake}
          activeOpacity={0.7}
          style={{ paddingVertical: 12, marginTop: 24 }}
        >
          <Text style={{ fontFamily: "DMSans-Medium", fontSize: 16, color: "#D97706" }}>
            {"try again \u2192"}
          </Text>
        </TouchableOpacity>

        {/* Abandon option after 3 failures (producer tasks) */}
        {!isDoer && failedAttempts >= 3 && (
          <TouchableOpacity
            onPress={() => setShowAbandonSheet(true)}
            activeOpacity={0.6}
            style={{ paddingVertical: 8, marginTop: 8 }}
          >
            <Text style={{ fontFamily: "DMSans-Regular", fontSize: 14, color: "#EF4444" }}>
              Abandon task
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#1C1917" }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: "#FAF8F4",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            transform: [{ translateX: shakeAnim }],
            overflow: "hidden",
          }}
        >
          {/* Drag indicator */}
          <View style={{ alignItems: "center", marginTop: 12 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#E7E5E4",
              }}
            />
          </View>

          {/* Back-attempt warning toast */}
          {backWarning && (
            <Animated.View
              style={{
                opacity: warningOpacity,
                alignSelf: "center",
                backgroundColor: "rgba(28,25,23,0.08)",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 8,
                marginTop: 8,
              }}
            >
              <Text style={{ color: "#78716C", fontFamily: "DMSans-Regular", fontSize: 13, textAlign: "center" }}>
                Submit proof to continue
              </Text>
            </Animated.View>
          )}

          {/* Main content */}
          {effectiveProofType === "photo" ? renderPhotoProof() : renderWrittenProof()}

          {/* Bottom exit paths */}
          {(proofState === "capture" || proofState === "review") && (
            <View style={{ alignItems: "center", paddingBottom: 24 }}>
              <TouchableOpacity
                onPress={() => setShowAbandonSheet(true)}
                activeOpacity={0.6}
                style={{ paddingVertical: 8 }}
              >
                <Text style={{ fontFamily: "DMSans-Regular", fontSize: 13, color: "#A8A29E" }}>
                  I give up
                </Text>
              </TouchableOpacity>

              {emergencyUnlocksRemaining > 0 && (
                <TouchableOpacity
                  onPress={() => setShowEmergencySheet(true)}
                  activeOpacity={0.6}
                  style={{ paddingVertical: 8, marginTop: 4 }}
                >
                  <Text
                    style={{
                      fontFamily: "DMSans-Regular",
                      fontSize: 12,
                      color: "#A8A29E",
                      opacity: 0.6,
                    }}
                  >
                    Emergency unlock ({emergencyUnlocksRemaining} remaining this week)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Animated.View>

        {/* ========== ABANDON BOTTOM SHEET ========== */}
        <BottomSheet
          visible={showAbandonSheet}
          onClose={() => setShowAbandonSheet(false)}
        >
          <Text
            style={{
              fontFamily: "CormorantGaramond-Italic",
              fontSize: 22,
              color: theme.colors.text.primary,
              marginBottom: 16,
            }}
          >
            Are you sure?
          </Text>

          <Text
            style={{
              fontFamily: "DMSans-Regular",
              fontSize: 14,
              color: theme.colors.text.secondary,
              marginBottom: 6,
            }}
          >
            Abandoning will:
          </Text>

          {[
            `Break your streak (currently ${streakDays} days)`,
            "Mark this task as failed",
            "Keep apps locked for 10 more minutes as a cooldown",
            "Be logged in your stats permanently",
          ].map((item, i) => (
            <Text
              key={i}
              style={{
                fontFamily: "DMSans-Regular",
                fontSize: 14,
                color: theme.colors.text.primary,
                lineHeight: 22,
                marginLeft: 8,
              }}
            >
              {"\u2022"} {item}
            </Text>
          ))}

          {weeklyAbandonCount >= 2 && (
            <View
              style={{
                padding: 12,
                marginTop: 12,
                backgroundColor: "rgba(245,158,11,0.08)",
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: "DMSans-Regular",
                  fontSize: 13,
                  color: "#F59E0B",
                  lineHeight: 18,
                }}
              >
                You've abandoned {weeklyAbandonCount} tasks this week. Want to
                try shorter sessions instead?
              </Text>
            </View>
          )}

          <View style={{ marginTop: 20, gap: 10 }}>
            <TouchableOpacity
              onPress={handleAbandon}
              activeOpacity={0.8}
              style={{
                backgroundColor: "#EF4444",
                borderRadius: 9999,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#FAF8F4", fontFamily: "DMSans-Medium", fontSize: 16 }}>
                Yes, abandon
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowAbandonSheet(false)}
              activeOpacity={0.8}
              style={{
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "DMSans-Medium",
                  color: "#D97706",
                  fontSize: 16,
                }}
              >
                Keep trying
              </Text>
            </TouchableOpacity>
          </View>
        </BottomSheet>

        {/* ========== EMERGENCY UNLOCK BOTTOM SHEET ========== */}
        <BottomSheet
          visible={showEmergencySheet}
          onClose={() => setShowEmergencySheet(false)}
        >
          <Text
            style={{
              fontFamily: "CormorantGaramond-Italic",
              fontSize: 22,
              color: theme.colors.text.primary,
              marginBottom: 16,
            }}
          >
            Emergency unlock
          </Text>

          <Text
            style={{
              fontFamily: "DMSans-Regular",
              fontSize: 14,
              color: theme.colors.text.secondary,
              lineHeight: 20,
              marginBottom: 12,
            }}
          >
            This uses 1 of your {emergencyUnlocksRemaining} weekly emergency
            passes. Apps will unlock but:
          </Text>

          {[
            "Task marked as unverified",
            "Streak continues but shows \u26A1 not \u2713 for today",
            "No AI score recorded",
            "Emergency unlock logged in stats",
          ].map((item, i) => (
            <Text
              key={i}
              style={{
                fontFamily: "DMSans-Regular",
                fontSize: 14,
                color: theme.colors.text.primary,
                lineHeight: 22,
                marginLeft: 8,
              }}
            >
              {"\u2022"} {item}
            </Text>
          ))}

          <Text
            style={{
              fontFamily: "DMSans-Regular",
              fontSize: 13,
              color: theme.colors.text.secondary,
              marginTop: 16,
              marginBottom: 6,
            }}
          >
            Why do you need emergency access?
          </Text>
          <View
            style={{
              backgroundColor: "rgba(28,25,23,0.04)",
              borderRadius: 12,
              padding: 12,
              marginBottom: 4,
            }}
          >
            <TextInput
              placeholder="Type your reason..."
              placeholderTextColor={theme.colors.text.muted}
              value={emergencyReason}
              onChangeText={setEmergencyReason}
              multiline
              style={{
                minHeight: 60,
                color: theme.colors.text.primary,
                fontFamily: "DMSans-Regular",
                fontSize: 14,
                textAlignVertical: "top",
                lineHeight: 20,
              }}
            />
          </View>
          <Text
            style={{
              fontFamily: "DMSans-Regular",
              fontSize: 12,
              color: theme.colors.text.muted,
              marginBottom: 16,
            }}
          >
            {emergencyReason.trim().length}/10 characters minimum
          </Text>

          <View style={{ gap: 10 }}>
            <TouchableOpacity
              onPress={handleEmergencyUnlock}
              disabled={emergencyReason.trim().length < 10}
              activeOpacity={0.8}
              style={{
                backgroundColor:
                  emergencyReason.trim().length < 10
                    ? "rgba(0,0,0,0.1)"
                    : "#F59E0B",
                borderRadius: 9999,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "DMSans-Medium",
                  color:
                    emergencyReason.trim().length < 10
                      ? theme.colors.text.muted
                      : "#FAF8F4",
                  fontSize: 16,
                }}
              >
                Use emergency pass
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowEmergencySheet(false);
                setEmergencyReason("");
              }}
              activeOpacity={0.8}
              style={{
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "DMSans-Regular",
                  color: theme.colors.text.secondary,
                  fontSize: 15,
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </BottomSheet>
      </SafeAreaView>
    </View>
  );
}
