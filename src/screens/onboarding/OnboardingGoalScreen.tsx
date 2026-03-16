import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const GRADIENT = ["#0f172a", "#1e293b", "#0f172a"];
const GOALS = [
  { id: "work", icon: "briefcase-outline" as const, title: "Work", subtitle: "Tasks and projects." },
  { id: "personal", icon: "person-outline" as const, title: "Personal", subtitle: "Errands and life admin." },
  { id: "study", icon: "school-outline" as const, title: "Study", subtitle: "Learning and deep focus." },
  { id: "projects", icon: "folder-open-outline" as const, title: "Projects", subtitle: "Bigger goals, many steps." },
];

interface OnboardingGoalScreenProps {
  onNext: (goalId: string | null) => void;
}

export function OnboardingGoalScreen({ onNext }: OnboardingGoalScreenProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <View style={styles.flex}>
      <LinearGradient colors={GRADIENT} style={styles.gradient}>
        <SafeAreaView style={styles.safe}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.question}>What is your current primary focus?</Text>
            <View style={styles.grid}>
              {GOALS.map((g) => {
                const isSelected = selected === g.id;
                return (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => setSelected(g.id)}
                    activeOpacity={0.85}
                    style={[styles.card, isSelected && styles.cardSelected]}
                  >
                    <Ionicons
                      name={g.icon}
                      size={32}
                      color={isSelected ? "#C4A574" : "rgba(255,255,255,0.85)"}
                    />
                    <Text style={styles.cardTitle}>{g.title}</Text>
                    <Text style={styles.cardSubtitle}>{g.subtitle}</Text>
                  </TouchableOpacity>
                );
              })}
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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 32 },
  question: { color: "#fff", fontSize: 26, fontWeight: "700", marginTop: 32, marginBottom: 24 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  card: {
    width: "47%",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 20,
    minHeight: 140,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardSelected: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "#C4A574",
  },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  cardSubtitle: { color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 4 },
  nextButton: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 32,
  },
  nextText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
