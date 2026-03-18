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
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync, EncodingType } from "expo-file-system/legacy";
import * as mammoth from "mammoth";
import { GlassCard } from "../components/ui/GlassCard";
import { SectionLabel } from "../components/ui/SectionLabel";
import { SoftGradientBg } from "../components/ui/SoftGradientBg";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import {
  useAppStore,
  type Task,
  type ParsedSyllabusTask,
} from "../store/useAppStore";
import { parseSyllabus, parseSyllabusFromFile } from "../services/ai";
import { theme } from "../theme";

type Nav = NativeStackNavigationProp<any>;

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

const CATEGORY_EMOJI: Record<string, string> = {
  study: "📚",
  writing: "✍️",
  coding: "💻",
  chores: "🧹",
  fitness: "💪",
  work: "💼",
  creative: "🎨",
  errands: "🛒",
  practice: "🎯",
  other: "⚡",
};

function formatDueDate(iso: string): string {
  try {
    const d = new Date(iso);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function SyllabusScreen() {
  const navigation = useNavigation<Nav>();
  const { addTask, blockedApps } = useAppStore();

  const [syllabusText, setSyllabusText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsedTasks, setParsedTasks] = useState<ParsedSyllabusTask[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set()
  );
  const [hasParsed, setHasParsed] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleParseResults = (tasks: ParsedSyllabusTask[]) => {
    if (tasks.length === 0) {
      Alert.alert(
        "No tasks found",
        "Could not extract any tasks. Try pasting more detailed text or uploading a different file."
      );
    } else {
      setParsedTasks(tasks);
      setSelectedIndices(new Set(tasks.map((_, i) => i)));
    }
    setHasParsed(true);
  };

  const handleParse = async () => {
    if (!syllabusText.trim()) {
      Alert.alert("Empty syllabus", "Please paste your syllabus text first.");
      return;
    }

    setLoading(true);
    try {
      const tasks = await parseSyllabus(syllabusText.trim());
      handleParseResults(tasks);
    } catch (err) {
      Alert.alert("Error", "Failed to parse syllabus. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "text/plain",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "image/png",
          "image/jpeg",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      setUploadedFileName(file.name);
      setLoading(true);

      const isPdf = file.mimeType === "application/pdf";
      const isImage = file.mimeType?.startsWith("image/");
      const isDoc =
        file.mimeType === "application/msword" ||
        file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.name?.endsWith(".docx") ||
        file.name?.endsWith(".doc");
      const isTextFile = file.mimeType === "text/plain" || file.name?.endsWith(".txt");

      if (isDoc) {
        // Extract text from .docx using mammoth
        const base64 = await readAsStringAsync(file.uri, {
          encoding: EncodingType.Base64,
        });
        const arrayBuffer = base64ToArrayBuffer(base64);
        const result = await mammoth.extractRawText({ arrayBuffer });
        const content = result.value?.trim();
        if (!content) {
          Alert.alert("Empty file", "Could not extract text from this file.");
        } else {
          setSyllabusText(content);
          const tasks = await parseSyllabus(content);
          handleParseResults(tasks);
        }
        setLoading(false);
        return;
      }

      if (isPdf || isImage) {
        // Read as base64 and send to AI for parsing
        const base64 = await readAsStringAsync(file.uri, {
          encoding: EncodingType.Base64,
        });
        const mimeType = file.mimeType || (isPdf ? "application/pdf" : "image/jpeg");
        const tasks = await parseSyllabusFromFile(base64, mimeType);
        handleParseResults(tasks);
      } else if (isTextFile) {
        // Text-based file — read as string
        const content = await readAsStringAsync(file.uri);
        if (!content.trim()) {
          Alert.alert("Empty file", "The file appears to be empty.");
        } else {
          setSyllabusText(content);
          const tasks = await parseSyllabus(content.trim());
          handleParseResults(tasks);
        }
      } else {
        // Unknown file type — try reading as base64 and sending to AI
        const base64 = await readAsStringAsync(file.uri, {
          encoding: EncodingType.Base64,
        });
        const mimeType = file.mimeType || "application/octet-stream";
        const tasks = await parseSyllabusFromFile(base64, mimeType);
        handleParseResults(tasks);
      }
    } catch (err) {
      console.warn("File pick error:", err);
      Alert.alert("Error", "Failed to read file. Please try again or paste the text instead.");
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleAddSelected = () => {
    const selected = parsedTasks.filter((_, i) => selectedIndices.has(i));
    if (selected.length === 0) {
      Alert.alert("No tasks selected", "Please select at least one task to add.");
      return;
    }

    for (const parsed of selected) {
      const newTask: Task = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        name: parsed.name,
        description: parsed.description,
        category: parsed.category,
        estimatedMinutes: parsed.estimatedMinutes,
        deadline: parsed.dueDate,
        blockedApps: [...blockedApps],
        proofType: parsed.proofType,
        status: "todo",
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        aiAnalysis: null,
        proofSubmission: null,
        aiGrade: null,
        reflectionAnswers: {},
      };
      addTask(newTask);
    }

    Alert.alert(
      "Tasks Added",
      `${selected.length} task${selected.length > 1 ? "s" : ""} imported from syllabus.`,
      [{ text: "OK", onPress: () => navigation.goBack() }]
    );
  };

  const selectedCount = selectedIndices.size;

  return (
    <SoftGradientBg>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity
            className="flex-row items-center mt-2 mb-4"
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={theme.colors.text.primary}
            />
            <Text
              className="text-base ml-1"
              style={{ color: theme.colors.text.primary }}
            >
              Back
            </Text>
          </TouchableOpacity>

          {/* Title */}
          <Text
            style={{
              fontFamily: "System",
              fontSize: 28,
              fontWeight: "300",
              color: theme.colors.text.primary,
              marginBottom: 8,
            }}
          >
            Import Syllabus
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: theme.colors.text.secondary,
              marginBottom: 20,
              lineHeight: 21,
            }}
          >
            Upload a file or paste your syllabus text and AI will extract all
            assignments, exams, and deadlines into tasks.
          </Text>

          {/* Input area */}
          {!hasParsed || parsedTasks.length === 0 ? (
            <>
              {/* Upload file button */}
              <TouchableOpacity
                onPress={handlePickFile}
                activeOpacity={0.7}
                disabled={loading}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 40,
                  marginBottom: 16,
                  borderWidth: 2,
                  borderColor: theme.colors.accentSoft,
                  borderStyle: "dashed",
                  borderRadius: 20,
                  backgroundColor: "rgba(217,119,6,0.04)",
                }}
              >
                <Ionicons
                  name="cloud-upload-outline"
                  size={24}
                  color={theme.colors.accent}
                />
                <View style={{ marginLeft: 12 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: theme.colors.accent,
                    }}
                  >
                    {uploadedFileName ?? "Upload Syllabus File"}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.colors.text.muted,
                      marginTop: 2,
                    }}
                  >
                    PDF, DOC, TXT, or photo of syllabus
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Divider */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: "rgba(0,0,0,0.08)",
                  }}
                />
                <Text
                  style={{
                    paddingHorizontal: 16,
                    fontSize: 13,
                    color: theme.colors.text.muted,
                    fontWeight: "500",
                  }}
                >
                  or paste text
                </Text>
                <View
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: "rgba(0,0,0,0.08)",
                  }}
                />
              </View>

              {/* Text input */}
              <GlassCard soft className="mb-4">
                <TextInput
                  value={syllabusText}
                  onChangeText={setSyllabusText}
                  placeholder="Paste your syllabus text here..."
                  placeholderTextColor="rgba(0,0,0,0.3)"
                  multiline
                  style={{
                    padding: 16,
                    color: theme.colors.text.primary,
                    fontSize: 15,
                    backgroundColor: "transparent",
                    minHeight: 160,
                    textAlignVertical: "top",
                  }}
                />
              </GlassCard>

              <PrimaryButton
                title="Parse Syllabus"
                loadingText="Parsing syllabus..."
                loading={loading}
                onPress={handleParse}
                className="mb-4"
              />
            </>
          ) : (
            <>
              {/* Parsed tasks list */}
              <SectionLabel
                label={`EXTRACTED TASKS (${parsedTasks.length})`}
                className="mb-3"
              />

              {parsedTasks.map((task, index) => {
                const isSelected = selectedIndices.has(index);
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.8}
                    onPress={() => toggleTask(index)}
                  >
                    <GlassCard
                      soft
                      className="mb-3"
                      style={{
                        padding: 16,
                        borderWidth: 2,
                        borderColor: isSelected
                          ? theme.colors.accent
                          : "transparent",
                        opacity: isSelected ? 1 : 0.55,
                      }}
                    >
                      {/* Top row: checkbox + name */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <Ionicons
                          name={
                            isSelected
                              ? "checkbox"
                              : "square-outline"
                          }
                          size={22}
                          color={
                            isSelected
                              ? theme.colors.accent
                              : theme.colors.text.muted
                          }
                          style={{ marginRight: 10 }}
                        />
                        <Text
                          style={{
                            flex: 1,
                            fontSize: 15,
                            fontWeight: "600",
                            color: theme.colors.text.primary,
                          }}
                          numberOfLines={2}
                        >
                          {CATEGORY_EMOJI[task.category] ?? "⚡"}{" "}
                          {task.name}
                        </Text>
                      </View>

                      {/* Description */}
                      {task.description ? (
                        <Text
                          style={{
                            fontSize: 13,
                            color: theme.colors.text.secondary,
                            marginBottom: 8,
                            marginLeft: 32,
                            lineHeight: 18,
                          }}
                          numberOfLines={2}
                        >
                          {task.description}
                        </Text>
                      ) : null}

                      {/* Meta row: due date, duration, proof type */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginLeft: 32,
                          gap: 12,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                          }}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={14}
                            color={theme.colors.text.muted}
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              color: theme.colors.text.muted,
                              marginLeft: 4,
                            }}
                          >
                            {formatDueDate(task.dueDate)}
                          </Text>
                        </View>

                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                          }}
                        >
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color={theme.colors.text.muted}
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              color: theme.colors.text.muted,
                              marginLeft: 4,
                            }}
                          >
                            {formatDuration(task.estimatedMinutes)}
                          </Text>
                        </View>

                        <View
                          style={{
                            backgroundColor: theme.colors.accentSoft,
                            borderRadius: 10,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "500",
                              color: theme.colors.accent,
                            }}
                          >
                            {task.proofType}
                          </Text>
                        </View>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                );
              })}

              {/* Add selected button */}
              <PrimaryButton
                title={`Add ${selectedCount} Selected Task${selectedCount !== 1 ? "s" : ""}`}
                onPress={handleAddSelected}
                disabled={selectedCount === 0}
                className="mb-3"
              />

              {/* Re-parse button */}
              <TouchableOpacity
                onPress={() => {
                  setHasParsed(false);
                  setParsedTasks([]);
                  setSelectedIndices(new Set());
                }}
                activeOpacity={0.7}
                style={{
                  alignItems: "center",
                  paddingVertical: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: theme.colors.text.secondary,
                    fontWeight: "500",
                  }}
                >
                  Edit syllabus text
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </SoftGradientBg>
  );
}
