import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TagBadge } from "../components/ui/TagBadge";
import { SectionLabel } from "../components/ui/SectionLabel";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { theme } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { TaskData } from "../navigation/types";
import { classifyTask } from "../services/ai";

type Props = NativeStackScreenProps<RootStackParamList, "TaskInput">;

const QUICK_TASKS = ["Take out trash", "Do laundry", "Research report", "Clean desk"];

export function TaskInputScreen({ route, navigation }: Props) {
  const initial = route.params?.initialTask ?? "";
  const [task, setTask] = useState(initial);
  const [isClassifying, setIsClassifying] = useState(false);
  const [dotCount, setDotCount] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isClassifying) return;
    const id = setInterval(() => setDotCount((c) => (c + 1) % 3), 400);
    return () => clearInterval(id);
  }, [isClassifying]);

  const handleSubmit = async () => {
    const taskText = task.trim() || "Task";
    setIsClassifying(true);
    try {
      const result = await classifyTask(taskText);
      const builtTask: TaskData = {
        taskTitle: taskText,
        taskType: result.taskType,
        estimatedMinutes: result.estimatedMinutes,
        isTiny: result.isTiny,
        isProject: result.isProject,
        subtasks: result.subtasks ?? [],
        suggestedDuration: result.suggestedDuration,
        requiresBeforePhoto: result.requiresBeforePhoto,
        subject: result.subject,
      };
      if (result.isTiny) {
        navigation.replace("TinyTask", { task: builtTask });
      } else {
        navigation.replace("Breakdown", { task: builtTask });
      }
    } finally {
      setIsClassifying(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Back */}
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4 mt-2" disabled={isClassifying}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>

        {/* Header */}
        <View className="flex-row items-center gap-3 mb-6">
          <Text className="text-text-primary text-2xl font-bold">New session</Text>
          <TagBadge label="AI ready" variant="green" />
        </View>

        {/* Input */}
        <View className="border-l-2 border-accent pl-4 mb-4">
          <TextInput
            ref={inputRef}
            value={task}
            onChangeText={setTask}
            placeholder="What are you working on?"
            placeholderTextColor={theme.colors.text.muted}
            className="text-text-primary text-lg py-2"
            multiline
            autoFocus
            editable={!isClassifying}
          />
        </View>

        {/* Classifying */}
        {isClassifying && (
          <View className="flex-row items-center gap-2 mb-6">
            <Ionicons name="sparkles" size={16} color={theme.colors.accent} />
            <Text className="text-text-secondary text-sm">
              Classifying{".".repeat(dotCount + 1)}
            </Text>
          </View>
        )}

        {/* Quick tasks */}
        <SectionLabel label="Quick tasks" className="mb-3" />
        <View className="flex-row flex-wrap gap-2 mb-8">
          {QUICK_TASKS.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTask(t)}
              disabled={isClassifying}
              className="bg-bg-elevated px-4 py-2 rounded-pill border border-white/8"
            >
              <Text className="text-text-secondary text-sm">{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <PrimaryButton
          title="Analyse task →"
          onPress={handleSubmit}
          disabled={isClassifying}
        />
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
