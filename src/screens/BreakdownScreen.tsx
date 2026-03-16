import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../components/ui/GlassCard";
import { TagBadge } from "../components/ui/TagBadge";
import { SectionLabel } from "../components/ui/SectionLabel";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { theme } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Breakdown">;

const DURATIONS = [15, 25, 45];

export function BreakdownScreen({ route, navigation }: Props) {
  const { task } = route.params;
  const [selectedDuration, setSelectedDuration] = useState(task.suggestedDuration ?? 25);
  const [beforePhotoUri, setBeforePhotoUri] = useState<string | null>(null);

  const takeBeforePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera access is needed to take a before photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setBeforePhotoUri(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4 mt-2">
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>

        {/* Header */}
        <View className="flex-row items-center gap-3 mb-1">
          <Text className="text-text-primary text-2xl font-bold">{task.taskTitle}</Text>
        </View>
        <View className="flex-row items-center gap-2 mb-6">
          <TagBadge label={task.taskType === "transformation" ? "Transformation" : "Study mode"} variant="accent" />
          <Text className="text-text-muted text-sm">~{task.estimatedMinutes} min total</Text>
        </View>

        {/* Subtasks */}
        <SectionLabel label="Subtasks" className="mb-3" />
        <View className="gap-3 mb-6">
          {(task.subtasks ?? []).map((st, idx) => (
            <GlassCard key={idx} className="p-4">
              <View className="flex-row items-center">
                <Text className="text-accent text-sm font-bold mr-3 w-6">
                  {(idx + 1).toString().padStart(2, "0")}
                </Text>
                <Text className="text-text-primary text-sm flex-1">{st.text}</Text>
                <Text className="text-text-muted text-xs">{st.minutes}m</Text>
              </View>
            </GlassCard>
          ))}
        </View>

        {/* Duration pills */}
        <View className="flex-row gap-3 mb-6">
          {DURATIONS.map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => setSelectedDuration(d)}
              className={`flex-1 py-3 rounded-pill items-center ${
                d === selectedDuration
                  ? "bg-accent"
                  : "bg-bg-elevated border border-white/8"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  d === selectedDuration ? "text-bg-primary" : "text-text-secondary"
                }`}
              >
                {d}m
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Take before photo */}
        {task.requiresBeforePhoto && (
          <GlassCard className="p-4 mb-4">
            <Text className="text-text-primary text-sm font-medium mb-3">Take before photo</Text>
            <TouchableOpacity
              onPress={takeBeforePhoto}
              className="flex-row items-center justify-center py-4 border border-dashed border-white/20 rounded-lg"
            >
              <Ionicons
                name="camera"
                size={28}
                color={beforePhotoUri ? theme.colors.accent : theme.colors.text.muted}
              />
              {beforePhotoUri && (
                <Text className="text-accent text-sm ml-2">Photo taken</Text>
              )}
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* Sound card */}
        <GlassCard className="p-4 flex-row items-center mb-8">
          <Ionicons name="rainy" size={24} color={theme.colors.accent} />
          <View className="ml-3 flex-1">
            <Text className="text-text-primary text-sm font-medium">Rain sounds</Text>
            <Text className="text-text-muted text-xs">headphones</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
        </GlassCard>

        <PrimaryButton
          title="Start session →"
          onPress={() =>
            task.isTiny
              ? navigation.navigate("TinyTask", { task })
              : navigation.navigate("ActiveSession", {
                  task,
                  durationMinutes: selectedDuration,
                  beforePhotoUri: beforePhotoUri ?? undefined,
                  sound: undefined,
                })
          }
        />
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
