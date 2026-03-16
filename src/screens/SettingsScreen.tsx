import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard } from "../components/ui/GlassCard";
import { SectionLabel } from "../components/ui/SectionLabel";
import { SoftGradientBg } from "../components/ui/SoftGradientBg";
import { useResetOnboarding } from "../context/OnboardingContext";

interface SettingRowProps {
  label: string;
  value: string;
}

function SettingRow({ label, value }: SettingRowProps) {
  return (
    <GlassCard soft className="p-4 flex-row items-center justify-between">
      <Text className="text-text-primary text-sm">{label}</Text>
      <Text className="text-accent text-sm">{value}</Text>
    </GlassCard>
  );
}

const SECTIONS = [
  {
    label: "Session defaults",
    rows: [
      { label: "Default duration", value: "25 min" },
      { label: "Break length", value: "5 min" },
      { label: "Auto-start breaks", value: "On" },
    ],
  },
  {
    label: "Verification",
    rows: [
      { label: "Require proof", value: "Always" },
      { label: "AI confidence threshold", value: "80%" },
      { label: "Friction questions", value: "On early end" },
    ],
  },
  {
    label: "Notifications",
    rows: [
      { label: "Session reminders", value: "On" },
      { label: "Streak alerts", value: "On" },
    ],
  },
  {
    label: "Sound",
    rows: [
      { label: "Default sound", value: "Rain" },
      { label: "Volume", value: "70%" },
    ],
  },
  {
    label: "Account",
    rows: [
      { label: "Name", value: "Stelios" },
      { label: "Export data", value: "→" },
    ],
  },
  {
    label: "Debug",
    rows: [{ label: "Show onboarding again", value: "→" }],
  },
];

export function SettingsScreen() {
  const resetOnboarding = useResetOnboarding();

  return (
    <SoftGradientBg>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          <Text className="text-text-primary text-3xl font-bold tracking-tight mt-1 mb-6">Settings</Text>

        {SECTIONS.map((section) => (
          <View key={section.label} className="mb-6">
            <SectionLabel label={section.label} className="mb-3" />
            <View className="gap-2">
              {section.rows.map((row) =>
                row.label === "Show onboarding again" ? (
                  <TouchableOpacity key={row.label} onPress={() => resetOnboarding()}>
                    <GlassCard soft className="p-4 flex-row items-center justify-between">
                      <Text className="text-text-primary text-sm">{row.label}</Text>
                      <Text className="text-accent text-sm">{row.value}</Text>
                    </GlassCard>
                  </TouchableOpacity>
                ) : (
                  <SettingRow key={row.label} {...row} />
                )
              )}
            </View>
          </View>
        ))}
          <View className="h-10" />
        </ScrollView>
      </SafeAreaView>
    </SoftGradientBg>
  );
}
