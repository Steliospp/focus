import React, { useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { TagBadge } from "../components/ui/TagBadge";
import { SectionLabel } from "../components/ui/SectionLabel";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/RootNavigator";

const QUICK_TASKS = ["Take out trash", "Do laundry", "Research report", "Clean desk"];

export function TaskInputScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [task, setTask] = useState("");

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Back */}
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4 mt-2">
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
            value={task}
            onChangeText={setTask}
            placeholder="What are you working on?"
            placeholderTextColor={theme.colors.text.muted}
            className="text-text-primary text-lg py-2"
            multiline
            autoFocus
          />
        </View>

        {/* Classifying */}
        {task.length > 0 && (
          <View className="flex-row items-center gap-2 mb-6">
            <Ionicons name="sparkles" size={16} color={theme.colors.accent} />
            <Text className="text-text-secondary text-sm">Classifying...</Text>
          </View>
        )}

        {/* Quick tasks */}
        <SectionLabel label="Quick tasks" className="mb-3" />
        <View className="flex-row flex-wrap gap-2 mb-8">
          {QUICK_TASKS.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTask(t)}
              className="bg-bg-elevated px-4 py-2 rounded-pill border border-white/8"
            >
              <Text className="text-text-secondary text-sm">{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <PrimaryButton
          title="Analyse task →"
          onPress={() => navigation.navigate("Breakdown")}
        />
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
