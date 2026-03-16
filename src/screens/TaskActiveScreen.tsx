import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { theme } from "../theme";
import { getActiveTask } from "../services/storage";

export function TaskActiveScreen() {
  const navigation = useNavigation();
  const [task, setTask] = React.useState<Awaited<ReturnType<typeof getActiveTask>>>(null);

  useFocusEffect(
    React.useCallback(() => {
      getActiveTask().then(setTask);
    }, [])
  );

  if (!task) return null;

  const startedTime = new Date(task.startedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <SafeAreaView className="flex-1 bg-bg-primary items-center justify-center px-6">
      <View className="items-center mb-10">
        <View
          className="w-28 h-28 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: theme.colors.semantic.lockRed + "20" }}
        >
          <Ionicons
            name="lock-closed"
            size={56}
            color={theme.colors.semantic.lockRed}
          />
        </View>
        <Text
          className="text-xl font-bold uppercase tracking-wider mb-2"
          style={{ color: theme.colors.semantic.lockRed }}
        >
          {task.blockedAppIds.length} app{task.blockedAppIds.length !== 1 ? "s" : ""} locked
        </Text>
        <Text className="text-text-muted text-center mb-1">Until you prove:</Text>
        <Text className="text-text-primary text-lg font-semibold text-center">
          "{task.title}"
        </Text>
        <Text className="text-text-muted text-sm mt-4">Started: {startedTime}</Text>
      </View>

      <PrimaryButton
        title="I'M DONE - PROVE IT"
        onPress={() => navigation.navigate("ProofGate")}
      />
    </SafeAreaView>
  );
}
