import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const GRADIENT = ["#0f172a", "#134e4a", "#1e293b", "#0f172a"];

interface OnboardingMindfulScreenProps {
  onNext: () => void;
}

export function OnboardingMindfulScreen({ onNext }: OnboardingMindfulScreenProps) {
  return (
    <View style={styles.flex}>
      <LinearGradient colors={GRADIENT} style={styles.gradient}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <Text style={styles.line1}>One task at a time.</Text>
            <Text style={styles.line2}>Focus on what matters.</Text>
          </View>
          <TouchableOpacity onPress={onNext} activeOpacity={0.9} style={styles.nextButton}>
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  safe: { flex: 1, justifyContent: "space-between", paddingHorizontal: 32, paddingBottom: 48 },
  center: { flex: 1, justifyContent: "center", paddingLeft: 8 },
  line1: { color: "#fff", fontSize: 28, fontWeight: "600", marginBottom: 12 },
  line2: { color: "rgba(255,255,255,0.9)", fontSize: 22 },
  nextButton: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
  },
  nextText: { color: "#0f172a", fontSize: 18, fontWeight: "600" },
});
