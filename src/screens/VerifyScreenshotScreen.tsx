import React from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../components/ui/GlassCard";
import { ProgressBar } from "../components/ui/ProgressBar";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/RootNavigator";

export function VerifyScreenshotScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4 mt-2">
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>

        <Text className="text-text-primary text-2xl font-bold mb-6">Show your work</Text>

        {/* Before/After */}
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity className="flex-1 aspect-square bg-bg-elevated rounded-card items-center justify-center border border-white/8">
            <Ionicons name="camera" size={32} color={theme.colors.text.muted} />
            <Text className="text-text-muted text-xs mt-2">Before</Text>
          </TouchableOpacity>
          <View className="justify-center">
            <Ionicons name="arrow-forward" size={20} color={theme.colors.text.muted} />
          </View>
          <TouchableOpacity className="flex-1 aspect-square bg-bg-elevated rounded-card items-center justify-center border border-white/8">
            <Ionicons name="camera" size={32} color={theme.colors.text.muted} />
            <Text className="text-text-muted text-xs mt-2">After</Text>
          </TouchableOpacity>
        </View>

        {/* Confidence */}
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-text-secondary text-sm">AI confidence</Text>
          <Text className="text-semantic-green text-sm font-semibold">87%</Text>
        </View>
        <ProgressBar fillPercent={87} color="green" className="mb-6" />

        {/* Scan results */}
        <GlassCard className="p-5 mb-4">
          <View className="gap-3">
            <View className="flex-row items-center gap-2">
              <Ionicons name="checkmark-circle" size={18} color="#4ADE80" />
              <Text className="text-text-primary text-sm">Document open and edited</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Ionicons name="checkmark-circle" size={18} color="#4ADE80" />
              <Text className="text-text-primary text-sm">Multiple tabs with sources</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Ionicons name="help-circle" size={18} color="#FBBF24" />
              <Text className="text-text-primary text-sm">Word count change unclear</Text>
            </View>
          </View>
        </GlassCard>

        {/* Recall */}
        <GlassCard className="p-5 mb-6">
          <Text className="text-text-muted text-xs uppercase tracking-wider mb-2">
            Quick recall
          </Text>
          <Text className="text-text-primary text-sm mb-3">
            What was the main argument in your third source?
          </Text>
          <TextInput
            placeholder="Type your answer..."
            placeholderTextColor={theme.colors.text.muted}
            className="text-text-primary text-sm border-l-2 border-accent pl-3 py-2"
            multiline
          />
        </GlassCard>

        <PrimaryButton
          title="Looks good — log it ✓"
          variant="green"
          onPress={() => navigation.navigate("SessionComplete")}
        />
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
