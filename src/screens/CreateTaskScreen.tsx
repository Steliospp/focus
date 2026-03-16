import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../components/ui/GlassCard";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/RootNavigator";
import {
  setActiveTask,
  getBlockedAppPrefs,
  type ActiveTask,
  type ProofType,
  type BlockedAppPref,
} from "../services/storage";

const PROOF_OPTIONS: { value: ProofType; label: string }[] = [
  { value: "photo_before_after", label: "Photo before/after" },
  { value: "file_upload", label: "File upload (essays/work)" },
  { value: "honor_system", label: "Just my word (honor system)" },
  { value: "none", label: "None (just track time)" },
];

export function CreateTaskScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "CreateTask">>();
  const initialTitle = route.params?.initialTask ?? "";

  const [title, setTitle] = useState(initialTitle);
  const [proofType, setProofType] = useState<ProofType>("photo_before_after");
  const [appPrefs, setAppPrefs] = useState<BlockedAppPref[]>([]);
  const [milestones, setMilestones] = useState<string[]>([]);
  const [newMilestone, setNewMilestone] = useState("");
  const [loaded, setLoaded] = useState(false);

  React.useEffect(() => {
    getBlockedAppPrefs().then((prefs) => {
      setAppPrefs(prefs);
      setLoaded(true);
    });
  }, []);

  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!loaded || appPrefs.length === 0) return;
    setSelectedBlockIds(
      new Set(appPrefs.filter((a) => a.level === "always").map((a) => a.id))
    );
  }, [loaded, appPrefs.length]);

  const toggleAppBlock = (id: string) => {
    setSelectedBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const blockableApps = appPrefs.filter((a) => a.level !== "never");
  const blockedForTask = blockableApps.filter((a) => selectedBlockIds.has(a.id));

  const addMilestone = () => {
    const t = newMilestone.trim();
    if (t) {
      setMilestones((m) => [...m, t]);
      setNewMilestone("");
    }
  };

  const handleStart = async () => {
    const taskTitle = title.trim() || "Task";
    const now = new Date().toISOString();
    const active: ActiveTask = {
      id: now,
      title: taskTitle,
      proofType,
      blockedAppIds: blockedForTask.map((a) => a.id),
      blockedAppNames: blockedForTask.map((a) => a.name),
      startedAt: now,
      milestones: milestones.length > 0 ? milestones : undefined,
    };
    await setActiveTask(active);
    navigation.replace("TaskActive", undefined);
  };

  if (!loaded) return null;

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4 mt-2">
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>

        <Text className="text-text-primary text-2xl font-bold mb-2">What are you doing?</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Take out trash"
          placeholderTextColor={theme.colors.text.muted}
          className="bg-bg-elevated border border-white/10 rounded-card px-4 py-3 text-text-primary text-lg mb-6"
        />

        <Text className="text-text-primary text-base font-semibold mb-2">Proof required?</Text>
        <View className="gap-2 mb-6">
          {PROOF_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setProofType(opt.value)}
              className="flex-row items-center py-3"
            >
              <View
                className="w-5 h-5 rounded-full border-2 mr-3"
                style={{
                  borderColor: theme.colors.accent,
                  backgroundColor: proofType === opt.value ? theme.colors.accent : "transparent",
                }}
              />
              <Text className="text-text-primary">{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-text-primary text-base font-semibold mb-2">Block these apps</Text>
        <View className="gap-2 mb-6">
          {blockableApps.map((a) => (
            <TouchableOpacity
              key={a.id}
              onPress={() => toggleAppBlock(a.id)}
              className="flex-row items-center py-3"
            >
              <Ionicons
                name={selectedBlockIds.has(a.id) ? "checkbox" : "square-outline"}
                size={22}
                color={selectedBlockIds.has(a.id) ? theme.colors.accent : theme.colors.text.muted}
              />
              <Text className="text-text-primary ml-3">{a.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-text-primary text-base font-semibold mb-2">+ Add custom milestone</Text>
        <View className="flex-row gap-2 mb-2">
          <TextInput
            value={newMilestone}
            onChangeText={setNewMilestone}
            placeholder="e.g. Outline"
            placeholderTextColor={theme.colors.text.muted}
            className="flex-1 bg-bg-elevated border border-white/10 rounded-card px-4 py-3 text-text-primary"
          />
          <TouchableOpacity
            onPress={addMilestone}
            className="bg-accent/20 px-4 py-3 rounded-card justify-center"
          >
            <Text className="text-accent font-medium">Add</Text>
          </TouchableOpacity>
        </View>
        {milestones.length > 0 && (
          <View className="gap-1 mb-6">
            {milestones.map((m, i) => (
              <Text key={i} className="text-text-muted text-sm">
                {i + 1}. {m}
              </Text>
            ))}
          </View>
        )}

        <PrimaryButton title="START" onPress={handleStart} />
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
