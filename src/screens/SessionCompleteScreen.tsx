import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { GlassCard } from "../components/ui/GlassCard";
import { StatBox } from "../components/ui/StatBox";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import type { RootStackParamList } from "../navigation/RootNavigator";

export function SessionCompleteScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ alignItems: "center" }}
      >
        {/* Green glow check */}
        <View className="mt-12 mb-6 items-center">
          <View className="w-24 h-24 rounded-full bg-semantic-green/10 items-center justify-center">
            <View className="w-16 h-16 rounded-full bg-semantic-green/20 items-center justify-center">
              <Text className="text-semantic-green text-3xl">✓</Text>
            </View>
          </View>
        </View>

        <Text className="text-text-primary text-2xl font-bold mb-1">Session logged</Text>
        <Text className="text-text-muted text-sm mb-8">
          Research report · 25 min
        </Text>

        {/* Stats row */}
        <View className="flex-row gap-3 mb-6 w-full">
          <StatBox value="25m" label="Focused" color="accent" />
          <StatBox value="4/4" label="Subtasks" color="green" />
          <StatBox value="7" label="Streak" color="amber" />
        </View>

        {/* Before/After strip */}
        <View className="flex-row gap-3 mb-4 w-full">
          <View className="flex-1 h-20 bg-bg-elevated rounded-card border border-white/8 items-center justify-center">
            <Text className="text-text-muted text-xs">Before</Text>
          </View>
          <View className="flex-1 h-20 bg-bg-elevated rounded-card border border-white/8 items-center justify-center">
            <Text className="text-text-muted text-xs">After</Text>
          </View>
        </View>

        {/* Recall saved */}
        <GlassCard className="p-5 mb-8 w-full">
          <Text className="text-text-muted text-xs uppercase tracking-wider mb-2">
            Recall saved
          </Text>
          <Text className="text-text-primary text-sm italic">
            "The main argument in the third source was about sustainable
            energy policy frameworks..."
          </Text>
        </GlassCard>

        {/* Buttons */}
        <View className="w-full gap-3 mb-10">
          <PrimaryButton
            title="Done for now"
            variant="outline"
            onPress={() => navigation.navigate("Tabs")}
          />
          <PrimaryButton
            title="Next session →"
            onPress={() => navigation.navigate("TaskInput")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
