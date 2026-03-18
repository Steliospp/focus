import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SoftGradientBg } from "../../components/ui/SoftGradientBg";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { useAppStore } from "../../store/useAppStore";
import { theme } from "../../theme";
import { textStyles } from "../../constants/fonts";

type Nav = NativeStackNavigationProp<any>;

export function OnboardingFirstTaskScreen() {
  const navigation = useNavigation<Nav>();
  const setIsOnboarded = useAppStore((s) => s.setIsOnboarded);

  const handleCreateTask = () => {
    setIsOnboarded(true);
    // Navigate to AddTask from the main app
    navigation.reset({
      index: 0,
      routes: [{ name: "AddTask" }],
    });
  };

  const handleSkip = () => {
    setIsOnboarded(true);
    navigation.reset({
      index: 0,
      routes: [{ name: "Tabs" }],
    });
  };

  return (
    <SoftGradientBg>
      <SafeAreaView style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 48, textAlign: "center", marginBottom: 16 }}>
          {"\u{1F680}"}
        </Text>
        <Text
          style={{
            ...textStyles.hero,
            fontSize: 36,
            color: theme.colors.text.primary,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          You're all set!
        </Text>
        <Text
          style={{
            ...textStyles.aiComment,
            color: theme.colors.text.secondary,
            textAlign: "center",
            marginBottom: 40,
            paddingHorizontal: 16,
          }}
        >
          Create your first task and start building focus habits today.
        </Text>

        <PrimaryButton title="Create First Task" onPress={handleCreateTask} />

        <PrimaryButton
          title="Explore the app first"
          variant="outline"
          onPress={handleSkip}
          style={{ marginTop: 12 }}
        />
      </SafeAreaView>
    </SoftGradientBg>
  );
}
