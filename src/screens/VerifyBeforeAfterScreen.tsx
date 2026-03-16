import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
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
  verifyTransformation,
  type VerifyTransformationResult,
} from "../services/ai";

type Props = NativeStackScreenProps<RootStackParamList, "VerifyBeforeAfter">;

export function VerifyBeforeAfterScreen({ route, navigation }: Props) {
  const { task, beforeUri: paramBeforeUri, earlyEnd, minutesEarly = 0 } = route.params;
  const [beforeUri, setBeforeUri] = useState<string | null>(paramBeforeUri ?? null);
  const [afterUri, setAfterUri] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<VerifyTransformationResult | null>(null);
  const [confidenceDisplay, setConfidenceDisplay] = useState(0);

  const takePhoto = async (setUri: (u: string) => void) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const pickerResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
    });
    if (!pickerResult.canceled && pickerResult.assets[0]?.uri) {
      setUri(pickerResult.assets[0].uri);
    }
  };

  const takeBeforePhoto = () => takePhoto(setBeforeUri);
  const takeAfterPhoto = () => takePhoto(setAfterUri);

  useEffect(() => {
    if (!afterUri || !beforeUri) return;
    setIsChecking(true);
    verifyTransformation(beforeUri, afterUri, task)
      .then((res) => {
        setResult(res);
        setIsChecking(false);
      })
      .catch(() => setIsChecking(false));
  }, [afterUri, beforeUri, task]);

  useEffect(() => {
    if (!result) return;
    setConfidenceDisplay(0);
    const start = Date.now();
    const duration = 600;
    const interval = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setConfidenceDisplay(Math.round(result.confidenceScore * t));
      if (t >= 1) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [result]);

  const goSessionComplete = () => {
    const sessionSummary: SessionSummary = {
      taskTitle: task.taskTitle,
      durationMinutes: task.estimatedMinutes,
      completedAt: new Date().toISOString(),
      verified: true,
      taskType: task.taskType,
      subtasksTotal: task.subtasks?.length,
      subtasksDone: task.subtasks?.length,
      beforeUri,
      afterUri,
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
    result &&
    result.verified &&
    !result.triggerFriction &&
    !earlyEnd;
  const showAlmostThere =
    result && (result.triggerFriction || earlyEnd);

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4 mt-2">
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>

        <Text className="text-text-primary text-2xl font-bold mb-6">
          Now show how it looks
        </Text>

        {/* Before: thumbnail or camera */}
        {beforeUri ? (
          <View className="mb-4">
            <Text className="text-text-muted text-xs uppercase tracking-wider mb-2">
              Before
            </Text>
            <Image
              source={{ uri: beforeUri }}
              className="w-full aspect-[4/3] rounded-card bg-bg-elevated"
              resizeMode="cover"
            />
          </View>
        ) : (
          <TouchableOpacity
            onPress={takeBeforePhoto}
            className="w-full aspect-[4/3] bg-bg-elevated rounded-card items-center justify-center border border-white/8 mb-4"
          >
            <View className="bg-accent/10 rounded-full w-16 h-16 items-center justify-center mb-2">
              <Ionicons name="camera" size={28} color={theme.colors.accent} />
            </View>
            <Text className="text-text-secondary text-sm">Tap to add BEFORE photo</Text>
          </TouchableOpacity>
        )}

        {/* After: camera button or image */}
        {!afterUri ? (
          <TouchableOpacity
            onPress={takeAfterPhoto}
            className="w-full aspect-[4/3] bg-bg-elevated rounded-card items-center justify-center border border-white/8 mb-6"
          >
            <View className="bg-accent/10 rounded-full w-20 h-20 items-center justify-center mb-2">
              <Ionicons name="camera" size={36} color={theme.colors.accent} />
            </View>
            <Text className="text-text-secondary text-sm">Tap to take AFTER photo</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text className="text-text-muted text-xs uppercase tracking-wider mb-2">
              After
            </Text>
            <View className="flex-row gap-3 mb-6">
              {beforeUri && (
                <View className="flex-1">
                  <Text className="text-text-muted text-xs mb-1">Before</Text>
                  <Image
                    source={{ uri: beforeUri }}
                    className="w-full aspect-square rounded-card bg-bg-elevated"
                    resizeMode="cover"
                  />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-text-muted text-xs mb-1">After</Text>
                <Image
                  source={{ uri: afterUri }}
                  className="w-full aspect-square rounded-card bg-bg-elevated"
                  resizeMode="cover"
                />
              </View>
            </View>
          </>
        )}

        {/* Checking your work */}
        {isChecking && (
          <GlassCard className="p-5 mb-6">
            <Text className="text-text-secondary text-sm">Checking your work...</Text>
          </GlassCard>
        )}

        {/* Confidence bar + results */}
        {result && !isChecking && (
          <>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-text-secondary text-sm">AI confidence</Text>
              <Text className="text-semantic-green text-sm font-semibold">
                {confidenceDisplay}%
              </Text>
            </View>
            <ProgressBar fillPercent={confidenceDisplay} color="green" className="mb-6" />

            <GlassCard className="p-5 mb-6">
              <View className="gap-3">
                {result.verifiedItems.map((item, i) => (
                  <View key={i} className="flex-row items-center gap-2">
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.semantic.green} />
                    <Text className="text-text-primary text-sm">{item}</Text>
                  </View>
                ))}
                {result.uncertainItems.map((item, i) => (
                  <View key={`u-${i}`} className="flex-row items-center gap-2">
                    <Ionicons name="help-circle" size={18} color={theme.colors.semantic.amber} />
                    <Text className="text-text-primary text-sm">{item}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>
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
          <PrimaryButton
            title="Almost there..."
            onPress={goFriction}
          />
        )}
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
