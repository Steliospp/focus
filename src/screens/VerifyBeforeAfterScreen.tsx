import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../components/ui/GlassCard";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/RootNavigator";

export function VerifyBeforeAfterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4 mt-2">
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>

        <Text className="text-text-primary text-2xl font-bold mb-6">Show your work</Text>

        {/* Before photo */}
        <TouchableOpacity className="w-full aspect-[4/3] bg-bg-elevated rounded-card items-center justify-center border border-white/8 mb-4">
          <View className="bg-accent/10 rounded-full w-16 h-16 items-center justify-center mb-2">
            <Ionicons name="camera" size={28} color={theme.colors.accent} />
          </View>
          <Text className="text-text-secondary text-sm">Tap to add BEFORE photo</Text>
        </TouchableOpacity>

        {/* After photo */}
        <TouchableOpacity className="w-full aspect-[4/3] bg-bg-elevated rounded-card items-center justify-center border border-white/8 mb-6">
          <View className="bg-semantic-green/10 rounded-full w-16 h-16 items-center justify-center mb-2">
            <Ionicons name="camera" size={28} color="#4ADE80" />
          </View>
          <Text className="text-text-secondary text-sm">Tap to add AFTER photo</Text>
        </TouchableOpacity>

        {/* Confidence card */}
        <GlassCard className="p-5 mb-6">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-semantic-green text-3xl font-bold">92%</Text>
              <Text className="text-text-muted text-sm mt-1">
                Clear improvement detected
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={40} color="#4ADE80" />
          </View>
        </GlassCard>

        <PrimaryButton
          title="Session verified ✓"
          variant="green"
          onPress={() => navigation.navigate("SessionComplete")}
        />
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
