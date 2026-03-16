import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const GRADIENT = ["#0f172a", "#134e4a", "#1e293b", "#0f172a"];

interface OnboardingCustomizingScreenProps {
  onComplete: () => void;
}

export function OnboardingCustomizingScreen({ onComplete }: OnboardingCustomizingScreenProps) {
  useEffect(() => {
    const t = setTimeout(onComplete, 2200);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <View style={styles.flex}>
      <LinearGradient colors={GRADIENT} style={styles.gradient}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
          <Text style={styles.text}>Customizing...</Text>
          <Text style={styles.sub}>Setting up your focus space</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  text: { color: "rgba(255,255,255,0.95)", fontSize: 20, fontWeight: "500", marginTop: 24 },
  sub: { color: "rgba(255,255,255,0.6)", fontSize: 15, marginTop: 8 },
});
