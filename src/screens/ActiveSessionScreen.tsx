import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { GlassCard } from "../components/ui/GlassCard";
import { TagBadge } from "../components/ui/TagBadge";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/RootNavigator";

export function ActiveSessionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const secs = (secondsLeft % 60).toString().padStart(2, "0");
  const progress = 1 - secondsLeft / (25 * 60);

  const size = 220;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <View className="flex-1 px-5">
        {/* Top bar */}
        <View className="flex-row items-center justify-between mt-2 mb-8">
          <Text className="text-text-secondary text-sm">Block 1 of 1</Text>
          <TagBadge label="Study" variant="accent" />
        </View>

        {/* Timer ring */}
        <View className="items-center mb-8">
          <View style={{ width: size, height: size }} className="items-center justify-center">
            <Svg width={size} height={size} className="absolute">
              {/* Background ring */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Progress ring */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={theme.colors.accent}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </Svg>
            <Text className="text-text-primary text-5xl font-light">
              {mins}:{secs}
            </Text>
            <Text className="text-text-muted text-sm mt-1">remaining</Text>
          </View>
        </View>

        {/* Current subtask */}
        <GlassCard className="p-5 mb-6">
          <Text className="text-text-muted text-xs uppercase tracking-wider mb-2">
            Current subtask
          </Text>
          <Text className="text-text-primary text-base font-medium mb-3">
            Gather sources and references
          </Text>
          <View className="flex-row gap-2">
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                className={`flex-1 h-1.5 rounded-full ${
                  i === 0 ? "bg-accent" : "bg-white/10"
                }`}
              />
            ))}
          </View>
        </GlassCard>

        {/* Sound row */}
        <GlassCard className="p-4 flex-row items-center mb-auto">
          <Ionicons name="rainy" size={20} color={theme.colors.accent} />
          <Text className="text-text-secondary text-sm ml-3 flex-1">Rain sounds</Text>
          <View className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
            <View className="w-3/4 h-full bg-accent/50 rounded-full" />
          </View>
        </GlassCard>

        {/* End early */}
        <TouchableOpacity
          onPress={() => navigation.navigate("VerifyScreenshot")}
          className="items-center py-6"
        >
          <Text className="text-text-muted text-sm underline">End early</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
