import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/RootNavigator";

export function UnlockedScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "Unlocked">>();
  const { taskTitle, durationMinutes, blockedAppNames = [], streak } = route.params;

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <View className="items-center mt-8 mb-6">
          <View className="w-24 h-24 rounded-full bg-semantic-green/20 items-center justify-center mb-4">
            <Ionicons name="checkmark-circle" size={56} color={theme.colors.semantic.green} />
          </View>
          <Text className="text-semantic-green text-xl font-bold mb-2">Task complete!</Text>
          <Text className="text-text-primary text-lg font-semibold">{taskTitle}</Text>
          <Text className="text-text-muted text-sm mt-1">{durationMinutes} min</Text>
        </View>

        <Text className="text-text-muted text-sm mb-2">Apps unlocked:</Text>
        <View className="gap-2 mb-6">
          {(blockedAppNames as string[]).map((name) => (
            <View key={name} className="flex-row items-center">
              <Ionicons name="lock-open" size={18} color={theme.colors.semantic.green} />
              <Text className="text-text-primary ml-2">{name}</Text>
            </View>
          ))}
          {blockedAppNames.length === 0 && (
            <Text className="text-text-muted text-sm">—</Text>
          )}
        </View>

        <View className="bg-bg-elevated rounded-card p-4 mb-8">
          <Text className="text-text-primary font-semibold">
            Streak: {streak} day{streak !== 1 ? "s" : ""} 🔥
          </Text>
        </View>

        <PrimaryButton
          title="NEXT TASK"
          onPress={() => navigation.replace("CreateTask", undefined)}
        />
        <View className="h-3" />
        <PrimaryButton
          title="DONE FOR NOW"
          variant="outline"
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: "Tabs" }],
            })
          }
        />
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
