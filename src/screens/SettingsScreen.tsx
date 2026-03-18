import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../components/ui/GlassCard";
import { SectionLabel } from "../components/ui/SectionLabel";
import { SoftGradientBg } from "../components/ui/SoftGradientBg";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import {
  useAppStore,
  type ProofStrictness,
  type Subject,
} from "../store/useAppStore";
import { theme } from "../theme";

type Nav = NativeStackNavigationProp<any>;

const COMMON_APPS = [
  "Instagram",
  "TikTok",
  "X/Twitter",
  "Snapchat",
  "YouTube",
  "Reddit",
  "Discord",
];

const STRICTNESS_OPTIONS: {
  key: ProofStrictness;
  title: string;
  subtitle: string;
}[] = [
  {
    key: "strict",
    title: "Strict",
    subtitle: "Must pass AI verification",
  },
  {
    key: "normal",
    title: "Normal",
    subtitle: "Can override AI decision",
  },
  {
    key: "relaxed",
    title: "Relaxed",
    subtitle: "Honor system by default",
  },
];

function Toggle({
  value,
  onToggle,
}: {
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onToggle}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
      }}
    >
      {value ? (
        <LinearGradient
          colors={[theme.colors.accent, theme.colors.accentLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            width: 44,
            height: 26,
            borderRadius: 13,
            justifyContent: "center",
            alignItems: "flex-end",
            paddingHorizontal: 2,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: "#FFFFFF",
            }}
          />
        </LinearGradient>
      ) : (
        <View
          style={{
            width: 44,
            height: 26,
            borderRadius: 13,
            backgroundColor: "rgba(0,0,0,0.15)",
            justifyContent: "center",
            alignItems: "flex-start",
            paddingHorizontal: 2,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: "#FFFFFF",
            }}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const {
    userName,
    setUserName,
    blockedApps,
    setBlockedApps,
    proofStrictness,
    setProofStrictness,
    emergencyUnlocksRemaining,
    clearAllData,
    subjects,
    addSubject,
    removeSubject,
    setIsOnboarded,
    blockMode,
    setBlockMode,
    customApps,
    setCustomApps,
    blockedWebsites,
    setBlockedWebsites,
  } = useAppStore();

  const [nameInput, setNameInput] = useState(userName);
  const [sessionReminders, setSessionReminders] = useState(true);
  const [dailySummary, setDailySummary] = useState(true);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newCustomApp, setNewCustomApp] = useState("");
  const [showAddCustomApp, setShowAddCustomApp] = useState(false);
  const [newWebsite, setNewWebsite] = useState("");
  const [showAddWebsite, setShowAddWebsite] = useState(false);

  const SUBJECT_COLORS = ["#ef4444", "#f59e0b", "#84cc16", "#D97706", "#F59E0B", "#FCD34D", "#06b6d4", "#84cc16"];

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    const color = SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length];
    addSubject({
      id: Date.now().toString(),
      name: newSubjectName.trim(),
      color,
    });
    setNewSubjectName("");
    setShowAddSubject(false);
  };

  const handleRemoveSubject = (id: string, name: string) => {
    Alert.alert("Remove Subject", `Remove "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeSubject(id) },
    ]);
  };

  const toggleApp = (app: string) => {
    if (blockedApps.includes(app)) {
      setBlockedApps(blockedApps.filter((a) => a !== app));
    } else {
      setBlockedApps([...blockedApps, app]);
    }
  };

  const handleNameBlur = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== userName) {
      setUserName(trimmed);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will delete all tasks, stats, and streaks. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Everything",
          style: "destructive",
          onPress: () => {
            clearAllData();
            navigation.navigate("Home");
          },
        },
      ]
    );
  };

  const unlockProgress = emergencyUnlocksRemaining / 3;

  return (
    <SoftGradientBg>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text
            style={{
              fontFamily: "System",
              fontSize: 28,
              fontWeight: "300",
              color: theme.colors.text.primary,
              marginTop: 8,
              marginBottom: 24,
            }}
          >
            Settings
          </Text>

          {/* Profile */}
          <SectionLabel label="PROFILE" className="mb-3" />
          <GlassCard soft className="mb-6" style={{ padding: 16 }}>
            <Text
              className="text-xs mb-2"
              style={{ color: theme.colors.text.secondary }}
            >
              Name
            </Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              onBlur={handleNameBlur}
              style={{
                color: theme.colors.text.primary,
                fontSize: 16,
                fontWeight: "500",
                padding: 0,
                backgroundColor: "transparent",
              }}
            />
          </GlassCard>

          {/* Subjects / Classes */}
          <SectionLabel label="SUBJECTS / CLASSES" className="mb-3" />
          <View className="mb-6">
            {subjects.map((sub) => (
              <GlassCard key={sub.id} soft className="mb-2" style={{ padding: 14 }}>
                <View className="flex-row items-center justify-between">
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 7,
                        backgroundColor: sub.color,
                        marginRight: 10,
                      }}
                    />
                    <Text className="text-[15px]" style={{ color: theme.colors.text.primary }}>
                      {sub.name}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveSubject(sub.id, sub.name)}>
                    <Text style={{ color: theme.colors.semantic.red, fontSize: 13 }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))}

            {showAddSubject ? (
              <GlassCard soft style={{ padding: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TextInput
                    value={newSubjectName}
                    onChangeText={setNewSubjectName}
                    placeholder="Subject name..."
                    placeholderTextColor={theme.colors.text.muted}
                    autoFocus
                    style={{
                      flex: 1,
                      color: theme.colors.text.primary,
                      fontSize: 15,
                      padding: 0,
                    }}
                    onSubmitEditing={handleAddSubject}
                  />
                  <TouchableOpacity onPress={handleAddSubject}>
                    <Text style={{ color: theme.colors.accent, fontWeight: "600" }}>Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setShowAddSubject(false); setNewSubjectName(""); }}>
                    <Text style={{ color: theme.colors.text.muted }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ) : (
              <TouchableOpacity
                onPress={() => setShowAddSubject(true)}
                style={{
                  paddingVertical: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: theme.colors.text.muted,
                  borderRadius: theme.radius.md,
                  borderStyle: "dashed",
                }}
              >
                <Text style={{ color: theme.colors.text.secondary, fontSize: 14 }}>+ Add Subject</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Default Blocked Apps */}
          <SectionLabel label="DEFAULT BLOCKED APPS" className="mb-3" />
          <View className="mb-6">
            {COMMON_APPS.map((app) => (
              <GlassCard
                key={app}
                soft
                className="mb-2"
                style={{ padding: 14 }}
              >
                <View className="flex-row items-center justify-between">
                  <Text
                    className="text-[15px]"
                    style={{ color: theme.colors.text.primary }}
                  >
                    {app}
                  </Text>
                  <Toggle
                    value={blockedApps.includes(app)}
                    onToggle={() => toggleApp(app)}
                  />
                </View>
              </GlassCard>
            ))}
          </View>

          {/* Block Mode */}
          <SectionLabel label="BLOCK MODE" className="mb-3" />
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
            {(["blocklist", "allowlist"] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => setBlockMode(mode)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: blockMode === mode ? theme.colors.accent : "rgba(0,0,0,0.08)",
                  backgroundColor: blockMode === mode ? theme.colors.accent + "15" : "rgba(255,255,255,0.6)",
                  alignItems: "center",
                }}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: blockMode === mode ? "700" : "500",
                  color: blockMode === mode ? theme.colors.accent : theme.colors.text.secondary,
                }}>
                  {mode === "blocklist" ? "Block List" : "Allow List"}
                </Text>
                <Text style={{ fontSize: 11, color: theme.colors.text.muted, marginTop: 2 }}>
                  {mode === "blocklist" ? "Block selected apps" : "Only allow selected apps"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Apps */}
          <SectionLabel label="CUSTOM APPS" className="mb-3" />
          <View className="mb-6">
            {customApps.map((app, i) => (
              <GlassCard key={app + i} soft className="mb-2" style={{ padding: 14 }}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-[15px]" style={{ color: theme.colors.text.primary }}>{app}</Text>
                  <TouchableOpacity onPress={() => setCustomApps(customApps.filter((a) => a !== app))}>
                    <Text style={{ color: theme.colors.semantic.red, fontSize: 13 }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))}
            {showAddCustomApp ? (
              <GlassCard soft style={{ padding: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TextInput
                    value={newCustomApp}
                    onChangeText={setNewCustomApp}
                    placeholder="App name..."
                    placeholderTextColor={theme.colors.text.muted}
                    autoFocus
                    style={{ flex: 1, color: theme.colors.text.primary, fontSize: 15, padding: 0 }}
                    onSubmitEditing={() => {
                      if (newCustomApp.trim()) {
                        setCustomApps([...customApps, newCustomApp.trim()]);
                        setNewCustomApp("");
                        setShowAddCustomApp(false);
                      }
                    }}
                  />
                  <TouchableOpacity onPress={() => {
                    if (newCustomApp.trim()) {
                      setCustomApps([...customApps, newCustomApp.trim()]);
                      setNewCustomApp("");
                      setShowAddCustomApp(false);
                    }
                  }}>
                    <Text style={{ color: theme.colors.accent, fontWeight: "600" }}>Add</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ) : (
              <TouchableOpacity
                onPress={() => setShowAddCustomApp(true)}
                style={{
                  paddingVertical: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: theme.colors.text.muted,
                  borderRadius: theme.radius.md,
                  borderStyle: "dashed",
                }}
              >
                <Text style={{ color: theme.colors.text.secondary, fontSize: 14 }}>+ Add Custom App</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Blocked Websites */}
          <SectionLabel label="BLOCKED WEBSITES" className="mb-3" />
          <View className="mb-6">
            {blockedWebsites.map((site, i) => (
              <GlassCard key={site + i} soft className="mb-2" style={{ padding: 14 }}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-[15px]" style={{ color: theme.colors.text.primary }}>{site}</Text>
                  <TouchableOpacity onPress={() => setBlockedWebsites(blockedWebsites.filter((s) => s !== site))}>
                    <Text style={{ color: theme.colors.semantic.red, fontSize: 13 }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))}
            {showAddWebsite ? (
              <GlassCard soft style={{ padding: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TextInput
                    value={newWebsite}
                    onChangeText={setNewWebsite}
                    placeholder="e.g. twitter.com"
                    placeholderTextColor={theme.colors.text.muted}
                    autoFocus
                    autoCapitalize="none"
                    style={{ flex: 1, color: theme.colors.text.primary, fontSize: 15, padding: 0 }}
                    onSubmitEditing={() => {
                      if (newWebsite.trim()) {
                        setBlockedWebsites([...blockedWebsites, newWebsite.trim()]);
                        setNewWebsite("");
                        setShowAddWebsite(false);
                      }
                    }}
                  />
                  <TouchableOpacity onPress={() => {
                    if (newWebsite.trim()) {
                      setBlockedWebsites([...blockedWebsites, newWebsite.trim()]);
                      setNewWebsite("");
                      setShowAddWebsite(false);
                    }
                  }}>
                    <Text style={{ color: theme.colors.accent, fontWeight: "600" }}>Add</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ) : (
              <TouchableOpacity
                onPress={() => setShowAddWebsite(true)}
                style={{
                  paddingVertical: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: theme.colors.text.muted,
                  borderRadius: theme.radius.md,
                  borderStyle: "dashed",
                }}
              >
                <Text style={{ color: theme.colors.text.secondary, fontSize: 14 }}>+ Add Website</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Proof Strictness */}
          <SectionLabel label="PROOF STRICTNESS" className="mb-3" />
          <View className="mb-6">
            {STRICTNESS_OPTIONS.map((opt) => {
              const selected = proofStrictness === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  activeOpacity={0.85}
                  onPress={() => setProofStrictness(opt.key)}
                >
                  <GlassCard
                    soft
                    className="mb-2"
                    style={{
                      padding: 16,
                      borderColor: selected
                        ? theme.colors.accent
                        : "transparent",
                      borderWidth: 2,
                    }}
                  >
                    <Text
                      className="text-[15px] font-semibold"
                      style={{ color: theme.colors.text.primary }}
                    >
                      {opt.title}
                    </Text>
                    <Text
                      className="text-[13px] mt-1"
                      style={{ color: theme.colors.text.secondary }}
                    >
                      {opt.subtitle}
                    </Text>
                  </GlassCard>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Emergency Unlocks */}
          <SectionLabel label="EMERGENCY UNLOCKS" className="mb-3" />
          <GlassCard soft className="mb-6" style={{ padding: 16 }}>
            <Text
              className="text-[15px] font-semibold mb-3"
              style={{ color: theme.colors.text.primary }}
            >
              {emergencyUnlocksRemaining}/3 remaining
            </Text>
            <View
              style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: "rgba(0,0,0,0.08)",
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={[theme.colors.accent, theme.colors.accentLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  height: 6,
                  borderRadius: 3,
                  width: `${unlockProgress * 100}%` as any,
                }}
              />
            </View>
          </GlassCard>

          {/* Notifications */}
          <SectionLabel label="NOTIFICATIONS" className="mb-3" />
          <GlassCard soft className="mb-2" style={{ padding: 14 }}>
            <View className="flex-row items-center justify-between">
              <Text
                className="text-[15px]"
                style={{ color: theme.colors.text.primary }}
              >
                Session reminders
              </Text>
              <Toggle
                value={sessionReminders}
                onToggle={() => setSessionReminders(!sessionReminders)}
              />
            </View>
          </GlassCard>
          <GlassCard soft className="mb-6" style={{ padding: 14 }}>
            <View className="flex-row items-center justify-between">
              <Text
                className="text-[15px]"
                style={{ color: theme.colors.text.primary }}
              >
                Daily summary
              </Text>
              <Toggle
                value={dailySummary}
                onToggle={() => setDailySummary(!dailySummary)}
              />
            </View>
          </GlassCard>

          {/* Danger Zone */}
          <SectionLabel label="DANGER ZONE" className="mb-3" />
          <PrimaryButton
            title="Reset Onboarding"
            variant="outline"
            onPress={() => {
              Alert.alert("Reset Onboarding", "This will show the onboarding flow again.", [
                { text: "Cancel", style: "cancel" },
                { text: "Reset", onPress: () => setIsOnboarded(false) },
              ]);
            }}
            style={{ marginBottom: 12 }}
          />
          <PrimaryButton
            title="Clear All Data"
            variant="danger"
            onPress={handleClearData}
          />

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </SoftGradientBg>
  );
}
