import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { GlassCard } from "../components/ui/GlassCard";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import type { RootStackParamList } from "../navigation/RootNavigator";

export function TinyTaskScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <View className="flex-1 px-5 justify-center items-center">
        <Text className="text-text-primary text-2xl font-bold mb-6">Quick task</Text>

        {/* Task card with amber left bar */}
        <GlassCard
          className="p-5 mb-8 w-full"
          style={{ borderLeftWidth: 3, borderLeftColor: "#FBBF24" }}
        >
          <Text className="text-text-primary text-base font-medium">Clean desk</Text>
          <Text className="text-text-muted text-sm mt-1">~5 minutes</Text>
        </GlassCard>

        {/* Emoji with glow */}
        <View className="items-center mb-8">
          <View className="w-28 h-28 rounded-full bg-accent/10 items-center justify-center">
            <Text className="text-6xl">🧹</Text>
          </View>
        </View>

        <Text className="text-text-primary text-xl font-bold mb-1">Just do it.</Text>
        <Text className="text-text-muted text-sm mb-10">Come back when done.</Text>

        <Text className="text-text-secondary text-base font-medium mb-4">
          Did you do it?
        </Text>

        <View className="flex-row gap-3 w-full">
          <PrimaryButton
            title="Yes ✓"
            variant="green"
            className="flex-1"
            onPress={() => navigation.navigate("SessionComplete")}
          />
          <PrimaryButton
            title="Not yet"
            variant="outline"
            className="flex-1"
            onPress={() => navigation.goBack()}
            style={{ borderColor: "#F87171" }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
