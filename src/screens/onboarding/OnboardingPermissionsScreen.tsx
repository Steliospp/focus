import React, { useState } from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import { SoftGradientBg } from "../../components/ui/SoftGradientBg";
import { GlassCard } from "../../components/ui/GlassCard";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { theme } from "../../theme";
import { textStyles } from "../../constants/fonts";

type Nav = NativeStackNavigationProp<any>;

export function OnboardingPermissionsScreen() {
  const navigation = useNavigation<Nav>();
  const [granted, setGranted] = useState(false);

  const handleAllow = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setGranted(status === "granted");
    navigation.navigate("OnboardingBlockList");
  };

  return (
    <SoftGradientBg>
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 24, justifyContent: "center" }}>
        <Text style={{ fontSize: 48, textAlign: "center", marginBottom: 16 }}>
          {"\u{1F514}"}
        </Text>
        <Text
          style={{
            ...textStyles.hero,
            fontSize: 32,
            color: theme.colors.text.primary,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Stay on track
        </Text>
        <Text
          style={{
            ...textStyles.aiComment,
            color: theme.colors.text.secondary,
            textAlign: "center",
            marginBottom: 32,
            paddingHorizontal: 16,
          }}
        >
          Notifications remind you about upcoming tasks, session timers, and when wait phases end.
        </Text>

        <GlassCard soft style={{ padding: 20, marginBottom: 32 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 24, marginRight: 12 }}>{"\u23F0"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: theme.colors.text.primary }}>
                Session reminders
              </Text>
              <Text style={{ fontSize: 13, color: theme.colors.text.secondary }}>
                Know when your focus session is about to end
              </Text>
            </View>
          </View>
        </GlassCard>

        <PrimaryButton title="Allow Notifications" onPress={handleAllow} />
      </SafeAreaView>
    </SoftGradientBg>
  );
}
