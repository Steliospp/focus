import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
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

const GOALS = [
  { key: "study", emoji: "\u{1F4DA}", label: "Study better & get better grades" },
  { key: "focus", emoji: "\u{1F3AF}", label: "Stop getting distracted by my phone" },
  { key: "habits", emoji: "\u{1F504}", label: "Build consistent daily habits" },
  { key: "deadlines", emoji: "\u23F0", label: "Meet deadlines & stop procrastinating" },
  { key: "balance", emoji: "\u2696\uFE0F", label: "Better work-life balance" },
];

export function OnboardingGoalScreen() {
  const navigation = useNavigation<Nav>();
  const setOnboardingGoal = useAppStore((s) => s.setOnboardingGoal);
  const [selected, setSelected] = useState<string | null>(null);

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
          What's your main goal?
        </Text>

        {GOALS.map((g) => (
          <TouchableOpacity key={g.key} activeOpacity={0.85} onPress={() => setSelected(g.key)}>
            <GlassCard
              soft
              style={{
                padding: 16,
                marginBottom: 10,
                borderWidth: 2,
                borderColor: selected === g.key ? theme.colors.accent : "transparent",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 24, marginRight: 12 }}>{g.emoji}</Text>
                <Text style={{ fontSize: 15, color: theme.colors.text.primary, flex: 1 }}>
                  {g.label}
                </Text>
              </View>
            </GlassCard>
          </TouchableOpacity>
        ))}

        <PrimaryButton
          title="Next"
          onPress={() => {
            if (selected) setOnboardingGoal(selected);
            navigation.navigate("OnboardingSubjects");
          }}
          disabled={!selected}
          style={{ marginTop: 20 }}
        />
      </SafeAreaView>
    </SoftGradientBg>
  );
}
