import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SoftGradientBg } from "../../components/ui/SoftGradientBg";
import { GlassCard } from "../../components/ui/GlassCard";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { theme } from "../../theme";
import { textStyles } from "../../constants/fonts";

type Nav = NativeStackNavigationProp<any>;

const STEPS = [
  { emoji: "\u{1F4DD}", title: "Add a task", desc: "Tell us what you need to do" },
  { emoji: "\u{1F512}", title: "Apps get locked", desc: "Distractions are blocked during focus" },
  { emoji: "\u{1F4F8}", title: "Submit proof", desc: "Photo or written proof of your work" },
  { emoji: "\u{1F916}", title: "AI grades it", desc: "Unlock apps when you pass" },
];

export function OnboardingHowItWorksScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SoftGradientBg>
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 24, justifyContent: "center" }}>
        <Text
          style={{
            ...textStyles.hero,
            fontSize: 32,
            color: theme.colors.text.primary,
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          How Focus Works
        </Text>

        {STEPS.map((step, i) => (
          <GlassCard key={i} soft style={{ padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 28, marginRight: 14 }}>{step.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: theme.colors.text.primary }}>
                  {step.title}
                </Text>
                <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: 2 }}>
                  {step.desc}
                </Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.text.muted }}>
                {i + 1}
              </Text>
            </View>
          </GlassCard>
        ))}

        <PrimaryButton
          title="Next"
          onPress={() => navigation.navigate("OnboardingName")}
          style={{ marginTop: 20 }}
        />
      </SafeAreaView>
    </SoftGradientBg>
  );
}
