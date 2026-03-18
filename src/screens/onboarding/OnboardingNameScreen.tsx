import React, { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SoftGradientBg } from "../../components/ui/SoftGradientBg";
import { GlassCard } from "../../components/ui/GlassCard";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { useAppStore } from "../../store/useAppStore";
import { theme } from "../../theme";
import { textStyles } from "../../constants/fonts";

type Nav = NativeStackNavigationProp<any>;

export function OnboardingNameScreen() {
  const navigation = useNavigation<Nav>();
  const setUserName = useAppStore((s) => s.setUserName);
  const [name, setName] = useState("");

  const handleNext = () => {
    if (name.trim()) {
      setUserName(name.trim());
    }
    navigation.navigate("OnboardingGoal");
  };

  return (
    <SoftGradientBg>
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 24, justifyContent: "center" }}>
        <Text
          style={{
            ...textStyles.hero,
            fontSize: 32,
            color: theme.colors.text.primary,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          What's your name?
        </Text>
        <Text
          style={{
            ...textStyles.aiComment,
            color: theme.colors.text.secondary,
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          We'll use this to personalize your experience
        </Text>

        <GlassCard soft style={{ padding: 16, marginBottom: 32 }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={theme.colors.text.muted}
            autoFocus
            style={{
              color: theme.colors.text.primary,
              fontSize: 18,
              textAlign: "center",
              padding: 8,
            }}
            onSubmitEditing={handleNext}
          />
        </GlassCard>

        <PrimaryButton
          title="Next"
          onPress={handleNext}
          disabled={!name.trim()}
        />
      </SafeAreaView>
    </SoftGradientBg>
  );
}
