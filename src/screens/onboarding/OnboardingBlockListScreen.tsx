import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { SoftGradientBg } from "../../components/ui/SoftGradientBg";
import { GlassCard } from "../../components/ui/GlassCard";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { useAppStore } from "../../store/useAppStore";
import { theme } from "../../theme";
import { textStyles } from "../../constants/fonts";

type Nav = NativeStackNavigationProp<any>;

const APPS = [
  { name: "Instagram", emoji: "\u{1F4F7}" },
  { name: "TikTok", emoji: "\u{1F3B5}" },
  { name: "X/Twitter", emoji: "\u{1F426}" },
  { name: "Snapchat", emoji: "\u{1F47B}" },
  { name: "YouTube", emoji: "\u{1F4FA}" },
  { name: "Reddit", emoji: "\u{1F4AC}" },
  { name: "Discord", emoji: "\u{1F3AE}" },
  { name: "Netflix", emoji: "\u{1F3AC}" },
  { name: "Twitch", emoji: "\u{1F4E1}" },
  { name: "Facebook", emoji: "\u{1F465}" },
  { name: "Pinterest", emoji: "\u{1F4CC}" },
  { name: "WhatsApp", emoji: "\u{1F4E9}" },
];

export function OnboardingBlockListScreen() {
  const navigation = useNavigation<Nav>();
  const setBlockedApps = useAppStore((s) => s.setBlockedApps);
  const [selected, setSelected] = useState<string[]>([
    "Instagram", "TikTok", "YouTube", "Snapchat", "Reddit", "Discord",
  ]);

  const toggle = (app: string) => {
    setSelected((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]
    );
  };

  const handleNext = () => {
    setBlockedApps(selected);
    navigation.navigate("OnboardingFirstTask");
  };

  return (
    <SoftGradientBg>
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 24 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingTop: 40, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              ...textStyles.hero,
              fontSize: 32,
              color: theme.colors.text.primary,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Which apps distract you?
          </Text>
          <Text
            style={{
              ...textStyles.aiComment,
              color: theme.colors.text.secondary,
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            These will be blocked during focus sessions
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
            {APPS.map((app) => {
              const sel = selected.includes(app.name);
              return (
                <TouchableOpacity
                  key={app.name}
                  onPress={() => toggle(app.name)}
                  activeOpacity={0.8}
                  style={{
                    width: "30%",
                    aspectRatio: 1,
                    borderRadius: 16,
                    backgroundColor: sel ? theme.colors.accent + "15" : "rgba(0,0,0,0.04)",
                    borderWidth: 2,
                    borderColor: sel ? theme.colors.accent : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 28, marginBottom: 4 }}>{app.emoji}</Text>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: sel ? "700" : "500",
                      color: sel ? theme.colors.accent : theme.colors.text.secondary,
                    }}
                    numberOfLines={1}
                  >
                    {app.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <PrimaryButton
            title={`Block ${selected.length} apps`}
            onPress={handleNext}
          />
        </ScrollView>
      </SafeAreaView>
    </SoftGradientBg>
  );
}
