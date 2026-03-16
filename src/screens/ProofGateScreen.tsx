import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { theme } from "../theme";
import {
  getActiveTask,
  setActiveTask,
  saveSession,
  calculateStreak,
  type ProofType,
} from "../services/storage";

function takePhoto(setUri: (u: string) => void) {
  ImagePicker.requestCameraPermissionsAsync().then(({ status }) => {
    if (status !== "granted") return;
    ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
    }).then((result) => {
      if (!result.canceled && result.assets[0]?.uri) setUri(result.assets[0].uri);
    });
  });
}

export function ProofGateScreen() {
  const navigation = useNavigation();
  const [activeTask, setActiveTaskState] = useState<Awaited<ReturnType<typeof getActiveTask>>>(null);
  const [beforeUri, setBeforeUri] = useState<string | null>(null);
  const [afterUri, setAfterUri] = useState<string | null>(null);
  const [honorChecked, setHonorChecked] = useState(false);

  useEffect(() => {
    getActiveTask().then(setActiveTaskState);
  }, []);

  if (!activeTask) return null;

  const proofType: ProofType = activeTask.proofType;
  const needsPhotos = proofType === "photo_before_after";
  const canSubmit =
    proofType === "none" ||
    (proofType === "honor_system" && honorChecked) ||
    (proofType === "file_upload") ||
    (needsPhotos && !!beforeUri && !!afterUri);

  const handleSubmit = async () => {
    const completedAt = new Date().toISOString();
    const started = new Date(activeTask.startedAt).getTime();
    const durationMinutes = Math.round((Date.now() - started) / 60000) || 1;

    await saveSession({
      id: activeTask.id,
      taskTitle: activeTask.title,
      startedAt: activeTask.startedAt,
      completedAt,
      durationMinutes,
      verified: canSubmit,
      beforeUri: beforeUri ?? undefined,
      afterUri: afterUri ?? undefined,
    });
    await setActiveTask(null);

    const streak = await calculateStreak();
    navigation.replace("Unlocked", {
      taskTitle: activeTask.title,
      durationMinutes,
      blockedAppNames: activeTask.blockedAppNames ?? activeTask.blockedAppIds,
      streak,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <Text className="text-text-primary text-xl font-bold mt-2 mb-1">
          Prove you did:
        </Text>
        <Text className="text-text-secondary text-lg mb-6">"{activeTask.title}"</Text>

        {proofType === "photo_before_after" && (
          <>
            <Text className="text-text-muted text-sm mb-2">Required: Before/after photos</Text>
            <View className="mb-4">
              <Text className="text-text-muted text-xs uppercase mb-2">BEFORE</Text>
              <TouchableOpacity
                onPress={() => takePhoto(setBeforeUri)}
                className="w-full aspect-[4/3] bg-bg-elevated rounded-card border border-white/10 items-center justify-center"
              >
                {beforeUri ? (
                  <Image
                    source={{ uri: beforeUri }}
                    className="w-full h-full rounded-card"
                    resizeMode="cover"
                  />
                ) : (
                  <>
                    <Ionicons name="camera" size={40} color={theme.colors.text.muted} />
                    <Text className="text-text-muted text-sm mt-2">Tap to add photo</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <View className="mb-6">
              <Text className="text-text-muted text-xs uppercase mb-2">AFTER</Text>
              <TouchableOpacity
                onPress={() => takePhoto(setAfterUri)}
                className="w-full aspect-[4/3] bg-bg-elevated rounded-card border border-white/10 items-center justify-center"
              >
                {afterUri ? (
                  <Image
                    source={{ uri: afterUri }}
                    className="w-full h-full rounded-card"
                    resizeMode="cover"
                  />
                ) : (
                  <>
                    <Ionicons name="camera" size={40} color={theme.colors.text.muted} />
                    <Text className="text-text-muted text-sm mt-2">Tap to add photo</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {proofType === "honor_system" && (
          <TouchableOpacity
            onPress={() => setHonorChecked((c) => !c)}
            className="flex-row items-center mb-6"
          >
            <View
              className="w-6 h-6 rounded border-2 mr-3 items-center justify-center"
              style={{
                borderColor: theme.colors.accent,
                backgroundColor: honorChecked ? theme.colors.accent : "transparent",
              }}
            >
              {honorChecked && <Ionicons name="checkmark" size={16} color="#0D1117" />}
            </View>
            <Text className="text-text-primary">I did it</Text>
          </TouchableOpacity>
        )}

        {proofType === "none" && (
          <Text className="text-text-muted mb-6">No proof required. Tap below to complete.</Text>
        )}

        {proofType === "file_upload" && (
          <Text className="text-text-muted mb-6">File upload: tap below to complete (proof stored as honor).</Text>
        )}

        <PrimaryButton
          title="SUBMIT & UNLOCK APPS"
          onPress={handleSubmit}
          disabled={!canSubmit}
        />
        {needsPhotos && !(beforeUri && afterUri) && (
          <Text className="text-text-muted text-center text-sm mt-3">
            Upload both photos to unlock
          </Text>
        )}
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
