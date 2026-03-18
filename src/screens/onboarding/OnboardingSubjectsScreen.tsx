import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
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

const COLORS = ["#ef4444", "#f59e0b", "#84cc16", "#D97706", "#F59E0B", "#FCD34D", "#06b6d4", "#84cc16"];

export function OnboardingSubjectsScreen() {
  const navigation = useNavigation<Nav>();
  const addSubject = useAppStore((s) => s.addSubject);
  const subjects = useAppStore((s) => s.subjects);
  const [input, setInput] = useState("");

  const handleAdd = () => {
    if (!input.trim()) return;
    const color = COLORS[subjects.length % COLORS.length];
    addSubject({
      id: Date.now().toString(),
      name: input.trim(),
      color,
    });
    setInput("");
  };

  return (
    <SoftGradientBg>
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 24 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
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
            Add your subjects
          </Text>
          <Text
            style={{
              ...textStyles.aiComment,
              color: theme.colors.text.secondary,
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            Optional — you can add more later in Settings
          </Text>

          {/* Added subjects */}
          {subjects.map((sub) => (
            <GlassCard key={sub.id} soft style={{ padding: 14, marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: sub.color,
                    marginRight: 10,
                  }}
                />
                <Text style={{ fontSize: 15, color: theme.colors.text.primary, flex: 1 }}>
                  {sub.name}
                </Text>
              </View>
            </GlassCard>
          ))}

          {/* Input */}
          <GlassCard soft style={{ padding: 14, marginBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="e.g. Math, Biology, History..."
                placeholderTextColor={theme.colors.text.muted}
                style={{
                  flex: 1,
                  color: theme.colors.text.primary,
                  fontSize: 15,
                  padding: 0,
                }}
                onSubmitEditing={handleAdd}
              />
              <TouchableOpacity onPress={handleAdd}>
                <Text style={{ color: theme.colors.accent, fontWeight: "600", marginLeft: 8 }}>
                  Add
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          <PrimaryButton
            title="Next"
            onPress={() => navigation.navigate("OnboardingPermissions")}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate("OnboardingPermissions")}
            style={{ padding: 16, alignItems: "center" }}
          >
            <Text style={{ color: theme.colors.text.secondary, fontSize: 14 }}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </SoftGradientBg>
  );
}
