import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const GRADIENT = ["#0f172a", "#1e293b", "#134e4a", "#0f172a"];

interface OnboardingWelcomeScreenProps {
  onNext: () => void;
  onLogIn: () => void;
}

export function OnboardingWelcomeScreen({ onNext, onLogIn }: OnboardingWelcomeScreenProps) {
  return (
    <View style={styles.flex}>
      <LinearGradient colors={GRADIENT} style={styles.gradient}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <Text style={styles.title}>Focus</Text>
            <Text style={styles.tagline}>
              A mindful app for tasks, focus, and getting things done.
            </Text>
          </View>
          <View style={styles.buttons}>
            <TouchableOpacity onPress={onNext} activeOpacity={0.9} style={styles.nextButton}>
              <Text style={styles.nextText}>Next</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onLogIn} activeOpacity={0.8} style={styles.logInTouch}>
              <Text style={styles.logInText}>Log in</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  safe: { flex: 1, justifyContent: "space-between", paddingHorizontal: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 48 },
  title: { color: "#fff", fontSize: 48, fontWeight: "700", letterSpacing: -0.5 },
  tagline: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 18,
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 24,
    lineHeight: 26,
  },
  buttons: { paddingBottom: 48, gap: 16 },
  nextButton: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
  },
  nextText: { color: "#0f172a", fontSize: 18, fontWeight: "600" },
  logInTouch: { paddingVertical: 12, alignItems: "center" },
  logInText: { color: "rgba(255,255,255,0.9)", fontSize: 16 },
});
