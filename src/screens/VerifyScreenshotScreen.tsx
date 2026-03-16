import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../components/ui/GlassCard";
import { ProgressBar } from "../components/ui/ProgressBar";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { theme } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { SessionSummary } from "../navigation/types";
import {
  verifyScreenshot,
  generateRecallQuestion,
  type VerifyScreenshotResult,
} from "../services/ai";

type Props = NativeStackScreenProps<RootStackParamList, "VerifyScreenshot">;

export function VerifyScreenshotScreen({ route, navigation }: Props) {
  const { task, earlyEnd, minutesEarly = 0 } = route.params;
  const taskType = task.taskType ?? "screenshot";

  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [screenshotResult, setScreenshotResult] = useState<VerifyScreenshotResult | null>(null);
  const [confidenceDisplay, setConfidenceDisplay] = useState(0);

  const [recallQuestion, setRecallQuestion] = useState<string | null>(null);
  const [recallAnswer, setRecallAnswer] = useState("");
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);

  const pickImage = async (mediaTypes: "images" | "videos" = "images") => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [mediaTypes],
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPickedUri(result.assets[0].uri);
    }
  };

  useEffect(() => {
    if (taskType !== "screenshot" || !pickedUri) return;
    setIsChecking(true);
    verifyScreenshot(pickedUri, task)
      .then((res) => {
        setScreenshotResult(res);
        setIsChecking(false);
      })
      .catch(() => setIsChecking(false));
  }, [taskType, pickedUri, task]);

  useEffect(() => {
    if (!screenshotResult) return;
    setConfidenceDisplay(0);
    const start = Date.now();
    const duration = 600;
    const interval = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setConfidenceDisplay(Math.round(screenshotResult.confidenceScore * t));
      if (t >= 1) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [screenshotResult]);

  useEffect(() => {
    if (taskType !== "study" || !pickedUri) return;
    setIsLoadingQuestion(true);
    generateRecallQuestion(task.subject ?? null)
      .then((q) => {
        setRecallQuestion(q);
        setIsLoadingQuestion(false);
      })
      .catch(() => setIsLoadingQuestion(false));
  }, [taskType, pickedUri, task.subject]);

  const goSessionComplete = () => {
    const sessionSummary: SessionSummary = {
      taskTitle: task.taskTitle,
      durationMinutes: task.estimatedMinutes,
      completedAt: new Date().toISOString(),
      verified: taskType === "screenshot" && screenshotResult?.confidenceScore ? true : undefined,
      taskType,
      recallAnswer: taskType === "study" ? recallAnswer || null : null,
    };
    navigation.replace("SessionComplete", { sessionSummary });
  };

  const goSkipWithoutVerification = () => {
    const sessionSummary: SessionSummary = {
      taskTitle: task.taskTitle,
      durationMinutes: task.estimatedMinutes,
      completedAt: new Date().toISOString(),
      verified: false,
      taskType,
    };
    navigation.replace("SessionComplete", { sessionSummary });
  };

  const goFriction = () => {
    navigation.navigate("Friction", {
      task,
      earlyEnd: earlyEnd ?? false,
      minutesEarly,
    });
  };

  const showVerifiedButton =
    taskType === "screenshot" &&
    screenshotResult &&
    screenshotResult.matchesTask &&
    !screenshotResult.triggerFriction &&
    !earlyEnd;
  const showAlmostThere =
    taskType === "screenshot" &&
    screenshotResult &&
    (screenshotResult.triggerFriction || earlyEnd || !screenshotResult.matchesTask);

  if (taskType === "nonvisual") {
    return (
      <SafeAreaView className="flex-1 bg-bg-primary">
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4 mt-2">
            <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text className="text-text-primary text-2xl font-bold mb-6">
            Session complete — let's check in
          </Text>
          <PrimaryButton
            title="Answer 2 quick questions"
            onPress={goFriction}
          />
          <View className="h-10" />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (taskType === "study") {
    return (
      <SafeAreaView className="flex-1 bg-bg-primary">
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4 mt-2">
            <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text className="text-text-primary text-2xl font-bold mb-6">
            Pick screenshot of notes
          </Text>
          {!pickedUri ? (
            <TouchableOpacity
              onPress={() => pickImage()}
              className="w-full aspect-[4/3] bg-bg-elevated rounded-card items-center justify-center border border-white/8 mb-6"
            >
              <Ionicons name="images" size={36} color={theme.colors.text.muted} />
              <Text className="text-text-secondary text-sm mt-2">Pick screenshot</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Image
                source={{ uri: pickedUri }}
                className="w-full aspect-[4/3] rounded-card bg-bg-elevated mb-6"
                resizeMode="cover"
              />
              {isLoadingQuestion && (
                <GlassCard className="p-5 mb-6">
                  <Text className="text-text-secondary text-sm">Loading question...</Text>
                </GlassCard>
              )}
              {recallQuestion && !isLoadingQuestion && (
                <>
                  <GlassCard className="p-5 mb-4">
                    <Text className="text-text-muted text-xs uppercase tracking-wider mb-2">
                      Quick recall
                    </Text>
                    <Text className="text-text-primary text-sm mb-3">{recallQuestion}</Text>
                    <TextInput
                      value={recallAnswer}
                      onChangeText={setRecallAnswer}
                      placeholder="Type your answer..."
                      placeholderTextColor={theme.colors.text.muted}
                      className="text-text-primary text-sm border-l-2 border-accent pl-3 py-2"
                      multiline
                    />
                  </GlassCard>
                  <PrimaryButton title="Log session →" onPress={goSessionComplete} />
                </>
              )}
            </>
          )}
          <View className="h-10" />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4 mt-2">
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>

        <Text className="text-text-primary text-2xl font-bold mb-6">
          Screenshot your work
        </Text>

        {!pickedUri ? (
          <TouchableOpacity
            onPress={() => pickImage()}
            className="w-full aspect-[4/3] bg-bg-elevated rounded-card items-center justify-center border border-white/8 mb-6"
          >
            <Ionicons name="images" size={36} color={theme.colors.text.muted} />
            <Text className="text-text-secondary text-sm mt-2">Pick screenshot</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Image
              source={{ uri: pickedUri }}
              className="w-full aspect-[4/3] rounded-card bg-bg-elevated mb-6"
              resizeMode="cover"
            />
            {isChecking && (
              <GlassCard className="p-5 mb-6">
                <Text className="text-text-secondary text-sm">Checking your work...</Text>
              </GlassCard>
            )}
            {screenshotResult && !isChecking && (
              <>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-text-secondary text-sm">AI confidence</Text>
                  <Text className="text-semantic-green text-sm font-semibold">
                    {confidenceDisplay}%
                  </Text>
                </View>
                <ProgressBar fillPercent={confidenceDisplay} color="green" className="mb-6" />
              </>
            )}
          </>
        )}

        {showVerifiedButton && (
          <PrimaryButton
            title="Session verified ✓"
            variant="green"
            onPress={goSessionComplete}
          />
        )}
        {showAlmostThere && (
          <PrimaryButton title="Almost there..." onPress={goFriction} />
        )}
        {!isChecking && (
          <PrimaryButton
            title="Skip for now"
            onPress={goSkipWithoutVerification}
          />
        )}
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
