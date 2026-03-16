import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

const GRADIENT = ["#0f172a", "#1e293b", "#0f172a"];
const DURATIONS = [
  { value: 15, label: "15 min", subtitle: "Quick wins" },
  { value: 25, label: "25 min", subtitle: "Classic Pomodoro" },
  { value: 45, label: "45 min", subtitle: "Deep focus" },
  { value: 60, label: "60 min", subtitle: "Long sessions" },
];

interface OnboardingTimeScreenProps {
  onNext: (minutes: number) => void;
  onSkip: () => void;
}

export function OnboardingTimeScreen({ onNext, onSkip }: OnboardingTimeScreenProps) {
  const [selected, setSelected] = useState(25);

  return (
    <View style={styles.flex}>
      <LinearGradient colors={GRADIENT} style={styles.gradient}>
        <SafeAreaView style={styles.safe}>
          <TouchableOpacity onPress={onSkip} style={styles.skip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.question}>What's your default focus length?</Text>
            <Text style={styles.hint}>A regular session length helps build focus habits.</Text>
            <View style={styles.frostedWrap}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={styles.frostedOverlay} />
              <View style={styles.pickerInner}>
                {DURATIONS.map((d) => {
                  const isSelected = selected === d.value;
                  return (
                    <TouchableOpacity
                      key={d.value}
                      onPress={() => setSelected(d.value)}
                      activeOpacity={0.8}
                      style={[styles.row, isSelected && styles.rowSelected]}
                    >
                      <Text style={styles.rowLabel}>{d.label}</Text>
                      <Text style={styles.rowSub}>{d.subtitle}</Text>
                      {isSelected && <View style={styles.dot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <TouchableOpacity onPress={() => onNext(selected)} activeOpacity={0.9} style={styles.nextButton}>
              <Text style={styles.nextText}>Next</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  safe: { flex: 1 },
  skip: { position: "absolute", top: 56, right: 24, zIndex: 10 },
  skipText: { color: "rgba(255,255,255,0.7)", fontSize: 16 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 32 },
  question: { color: "#fff", fontSize: 26, fontWeight: "700", marginBottom: 8 },
  hint: { color: "rgba(255,255,255,0.7)", fontSize: 15, marginBottom: 24 },
  frostedWrap: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    minHeight: 220,
  },
  frostedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  pickerInner: { padding: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  rowSelected: { backgroundColor: "rgba(196,165,116,0.2)" },
  rowLabel: { color: "#fff", fontSize: 18, fontWeight: "600" },
  rowSub: { color: "rgba(255,255,255,0.6)", fontSize: 14 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#C4A574" },
  nextButton: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 32,
  },
  nextText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
