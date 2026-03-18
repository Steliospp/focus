import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { MascotOrb } from "../components/ui/MascotOrb";
import { SoftGradientBg } from "../components/ui/SoftGradientBg";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { useAppStore } from "../store/useAppStore";
import { textStyles } from "../constants/fonts";
import { theme } from "../theme";

type Nav = NativeStackNavigationProp<any>;

export function CooldownScreen() {
  const navigation = useNavigation<Nav>();
  const cooldownEndsAt = useAppStore((s) => s.cooldownEndsAt);
  const clearCooldown = useAppStore((s) => s.clearCooldown);
  const setCurrentTask = useAppStore((s) => s.setCurrentTask);

  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (!cooldownEndsAt) return 0;
    return Math.max(0, Math.ceil((new Date(cooldownEndsAt).getTime() - Date.now()) / 1000));
  });

  const timerDone = secondsLeft <= 0;

  // Countdown — runs even if user navigates away since cooldownEndsAt is in the store
  useEffect(() => {
    if (!cooldownEndsAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(cooldownEndsAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        clearCooldown();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownEndsAt]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timerDisplay = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const handleDone = () => {
    clearCooldown();
    setCurrentTask(null);
    navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
  };

  const handleGoHome = () => {
    navigation.navigate("Tabs");
  };

  return (
    <SoftGradientBg>
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        <MascotOrb mood="warning" size={80} />

        <Text
          style={{
            ...textStyles.hero,
            fontSize: 28,
            fontStyle: "italic",
            color: theme.colors.text.primary,
            textAlign: "center",
            marginTop: 16,
            marginBottom: 24,
          }}
        >
          Take a breath.
        </Text>

        {!timerDone ? (
          <>
            <Text
              style={{
                fontSize: 14,
                color: theme.colors.text.muted,
                textAlign: "center",
                marginBottom: 12,
                fontFamily: textStyles.body.fontFamily,
              }}
            >
              Your apps will unlock in
            </Text>

            <Text
              style={{
                fontSize: 56,
                fontWeight: "200",
                color: theme.colors.accent,
                textAlign: "center",
                fontVariant: ["tabular-nums"],
                marginBottom: 32,
              }}
            >
              {timerDisplay}
            </Text>

            <Text
              style={{
                ...textStyles.aiComment,
                color: theme.colors.text.muted,
                textAlign: "center",
                maxWidth: 280,
              }}
            >
              Use this time to think about what got in the way.{"\n"}
              You can do it differently next time.
            </Text>

            {/* User can freely leave */}
            <TouchableOpacity
              onPress={handleGoHome}
              activeOpacity={0.7}
              style={{ marginTop: 40, paddingVertical: 12 }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "500",
                  color: theme.colors.accent,
                  fontFamily: textStyles.body.fontFamily,
                }}
              >
                Go to dashboard {"\u2192"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text
              style={{
                ...textStyles.emotionalMoment,
                color: theme.colors.semantic.green,
                textAlign: "center",
                marginBottom: 32,
              }}
            >
              Apps unlocked
            </Text>

            <PrimaryButton title="Back to dashboard" onPress={handleDone} />
          </>
        )}
      </SafeAreaView>
    </SoftGradientBg>
  );
}
