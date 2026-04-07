import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

import { MascotOrb } from "../components/ui/MascotOrb";
import { ParticleBurst } from "../components/ui/ParticleBurst";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import {
  useAppStore,
  type HonestyReport,
  type ConfidenceLevel,
  type DelayReason,
} from "../store/useAppStore";
import { evaluateAppeal } from "../services/ai";
import { theme } from "../theme";
import { fonts, textStyles } from "../constants/fonts";

type Nav = NativeStackNavigationProp<any>;

// Determine which reflection flow to show
type ReflectionMode =
  | "proof_failed" // score < 60
  | "proof_borderline" // score 60-74
  | "early_passed" // finished early + score 75+
  | "ontime_passed" // finished on time + score 75+
  | "late_passed" // finished late + score 75+
  | "honor"; // honor system, no grading

function getReflectionMode(
  score: number | null,
  finishedEarly: boolean,
  finishedLate: boolean,
  isHonor: boolean
): ReflectionMode {
  if (isHonor) return "honor";
  if (score === null) return "honor";
  if (score < 60) return "proof_failed";
  if (score < 75) return "proof_borderline";
  if (finishedEarly) return "early_passed";
  if (finishedLate) return "late_passed";
  return "ontime_passed";
}

function RadioOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: selected ? theme.colors.accent : theme.colors.text.muted,
          marginRight: 12,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {selected && (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: theme.colors.accent,
            }}
          />
        )}
      </View>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 16,
          color: theme.colors.text.primary,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function ReflectScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<{ params: { taskId: string } }>>();
  const taskId = route.params.taskId;

  const task = useAppStore((s) => s.tasks.find((t) => t.id === taskId));
  const updateTask = useAppStore((s) => s.updateTask);
  const setCurrentTask = useAppStore((s) => s.setCurrentTask);
  const addFocusMinutes = useAppStore((s) => s.addFocusMinutes);
  const adjustStreak = useAppStore((s) => s.adjustStreak);
  const blockedApps = useAppStore((s) => s.blockedApps);

  const grade = task?.aiGrade ?? null;
  const score = grade?.score ?? null;
  const finishedEarly = task?.finishedEarly ?? false;
  const finishedLate = task?.status === "late";
  const isHonor = task?.proofType === "honor";
  const isDoer = task?.archetype === "doer";
  const isHandler = task?.archetype === "handler";

  const mode = getReflectionMode(score, finishedEarly, finishedLate, isHonor);

  // Handler tasks: skip reflection entirely, just mark complete
  useEffect(() => {
    if (isHandler) {
      updateTask(taskId, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });
      addFocusMinutes(task?.estimatedMinutes ?? 0);
      setCurrentTask(null);
      navigation.navigate("Tabs");
    }
  }, [isHandler]);

  // State for different flows
  const [honestyAnswer, setHonestyAnswer] = useState<HonestyReport | null>(null);
  const [confidenceAnswer, setConfidenceAnswer] = useState<ConfidenceLevel | null>(null);
  const [delayAnswer, setDelayAnswer] = useState<DelayReason | null>(null);
  const [knowledgeLog, setKnowledgeLog] = useState("");
  const [appealText, setAppealText] = useState("");
  const [appealLoading, setAppealLoading] = useState(false);
  const [appealResult, setAppealResult] = useState<"upgraded" | "denied" | null>(null);
  const [showHonestyFeedback, setShowHonestyFeedback] = useState(false);

  // Animated score counting up
  const [displayScore, setDisplayScore] = useState(0);
  const [scoreAnimDone, setScoreAnimDone] = useState(false);
  const continueOpacity = useRef(new Animated.Value(0)).current;
  const isPassed = score !== null && score >= 75;

  useEffect(() => {
    if (score !== null && score > 0) {
      const duration = 1500;
      const start = Date.now();
      const animate = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        setDisplayScore(Math.round(progress * score));
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setScoreAnimDone(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // Fade in continue button after 1.5s
          Animated.timing(continueOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
        }
      };
      requestAnimationFrame(animate);
    }
  }, [score]);

  // Check if honesty answers are negative
  const isNegativeHonesty =
    honestyAnswer === "rushed" || honestyAnswer === "skipped";
  const isLowConfidence = confidenceAnswer === "low";
  const shouldReduceStreak = isNegativeHonesty && isLowConfidence;

  const handleComplete = () => {
    let finalScore = score ?? 0;

    // Adjust score based on honesty
    if (isNegativeHonesty) {
      finalScore = Math.max(0, finalScore - (honestyAnswer === "skipped" ? 20 : 10));
    }

    const updates: Record<string, unknown> = {
      status: "completed",
      completedAt: new Date().toISOString(),
      finalScore,
      honestySelfReport: honestyAnswer,
      confidenceLevel: confidenceAnswer,
      delayReason: delayAnswer,
      knowledgeLog: knowledgeLog || null,
      streakAdjusted: shouldReduceStreak,
    };

    updateTask(taskId, updates);

    if (shouldReduceStreak) {
      adjustStreak(-1);
    }

    addFocusMinutes(task?.estimatedMinutes ?? 0);
    setCurrentTask(null);
    navigation.navigate("Tabs");
  };

  const handleAppealSubmit = async () => {
    if (!task || !grade || appealText.trim().length < 10) return;
    setAppealLoading(true);
    try {
      const newGrade = await evaluateAppeal(task, grade, appealText);
      updateTask(taskId, {
        aiGrade: newGrade,
        appealText,
        finalScore: newGrade.score,
      });
      if (newGrade.score >= 75) {
        setAppealResult("upgraded");
      } else {
        setAppealResult("denied");
      }
    } catch {
      setAppealResult("denied");
    } finally {
      setAppealLoading(false);
    }
  };

  const retakeCount = task?.proofRetakeCount ?? 0;
  const maxRetakes = 3;

  const handleRetakeProof = () => {
    if (retakeCount >= maxRetakes) {
      updateTask(taskId, { status: "failed" });
      setCurrentTask(null);
      navigation.navigate("Tabs");
      return;
    }
    updateTask(taskId, { proofRetakeCount: retakeCount + 1 });
    navigation.navigate("ProofGate", { taskId });
  };

  // Build unlocked apps string
  const unlockedAppsStr = blockedApps.slice(0, 5).join(" \u00B7 ");

  // Step tracking for reflection questions
  const [reflectionStep, setReflectionStep] = useState(0);

  if (!task) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg.primary, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: theme.colors.text.secondary, fontFamily: fonts.body }}>
          Task not found
        </Text>
      </View>
    );
  }

  // Already completed -- show read-only summary
  if (task.status === "completed") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg.primary }}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 40,
              paddingBottom: 40,
              alignItems: "center",
            }}
            showsVerticalScrollIndicator={false}
          >
            <ParticleBurst active={true} />
            <MascotOrb mood="celebration" size={80} />

            {grade && (
              <>
                <Text
                  style={{
                    fontFamily: fonts.bodyLight,
                    fontSize: 64,
                    color: theme.colors.text.primary,
                    textAlign: "center",
                    marginTop: 24,
                  }}
                >
                  {task.finalScore ?? grade.score}
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 18,
                    color: theme.colors.text.muted,
                    textAlign: "center",
                    marginTop: -4,
                  }}
                >
                  / 100
                </Text>

                <Text
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 24,
                    color: theme.colors.text.primary,
                    textAlign: "center",
                    marginTop: 20,
                    lineHeight: 32,
                    paddingHorizontal: 16,
                  }}
                >
                  {grade.comment}
                </Text>
              </>
            )}

            {task.knowledgeLog && (
              <>
                <View style={{ width: "100%", height: 1, backgroundColor: theme.colors.divider, marginVertical: 24 }} />
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 14,
                    color: theme.colors.text.secondary,
                    marginBottom: 8,
                  }}
                >
                  What you learned
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    color: theme.colors.text.primary,
                    fontSize: 14,
                    lineHeight: 20,
                    textAlign: "center",
                  }}
                >
                  {task.knowledgeLog}
                </Text>
              </>
            )}

            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginTop: 32 }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 16,
                  color: theme.colors.accent,
                }}
              >
                back
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // --- PROOF FAILED (score < 60) ---
  if (mode === "proof_failed") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg.primary }}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 40,
              paddingBottom: 40,
            }}
          >
            {/* Red indicator */}
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: theme.colors.semantic.red + "15",
                alignSelf: "center",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 28 }}>{"\u2717"}</Text>
            </View>

            <Text
              style={{
                fontFamily: fonts.heading,
                fontSize: 28,
                color: theme.colors.semantic.red,
                textAlign: "center",
              }}
            >
              Proof not accepted
            </Text>

            <Text
              style={{
                fontFamily: fonts.body,
                color: theme.colors.text.secondary,
                fontSize: 14,
                textAlign: "center",
                marginTop: 8,
                marginBottom: 24,
              }}
            >
              Your apps stay locked until proof passes
            </Text>

            {/* AI feedback */}
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 15,
                color: theme.colors.text.primary,
                lineHeight: 22,
              }}
            >
              {grade?.comment ?? "Your proof didn't meet the requirements."}
            </Text>

            {grade && grade.improvements.length > 0 && (
              <View style={{ marginTop: 16 }}>
                {grade.improvements.map((imp, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: "row",
                      marginBottom: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.semantic.red,
                        marginRight: 8,
                        fontSize: 14,
                      }}
                    >
                      {"\u2192"}
                    </Text>
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        color: theme.colors.text.primary,
                        fontSize: 14,
                        flex: 1,
                        lineHeight: 20,
                      }}
                    >
                      {imp}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ width: "100%", height: 1, backgroundColor: theme.colors.divider, marginVertical: 24 }} />

            <View style={{ gap: 12 }}>
              <PrimaryButton
                title={retakeCount >= maxRetakes ? "Max retakes -- mark failed" : `Retake proof (${maxRetakes - retakeCount} left)`}
                onPress={handleRetakeProof}
              />
              <TouchableOpacity
                onPress={() => {
                  updateTask(taskId, {
                    aiGrade: { ...grade!, score: 60, passed: true },
                  });
                }}
                style={{
                  padding: 16,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    color: theme.colors.text.secondary,
                    fontSize: 15,
                  }}
                >
                  Appeal with explanation
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // --- PROOF BORDERLINE (score 60-74) ---
  if (mode === "proof_borderline") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg.primary }}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 40,
              paddingBottom: 40,
            }}
          >
            {/* Amber indicator */}
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: theme.colors.semantic.amber + "15",
                alignSelf: "center",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 28 }}>{"\u26A0"}</Text>
            </View>

            <Text
              style={{
                fontFamily: fonts.heading,
                fontSize: 28,
                color: theme.colors.semantic.amber,
                textAlign: "center",
              }}
            >
              Accepted with low confidence
            </Text>

            <Text
              style={{
                fontFamily: fonts.body,
                color: theme.colors.text.secondary,
                fontSize: 14,
                textAlign: "center",
                marginTop: 4,
                marginBottom: 8,
              }}
            >
              Score: {displayScore}/100
            </Text>

            {/* AI comment */}
            <Text
              style={{
                fontFamily: fonts.heading,
                fontSize: 20,
                color: theme.colors.text.secondary,
                textAlign: "center",
                marginBottom: 24,
                lineHeight: 28,
              }}
            >
              {grade?.comment}
            </Text>

            {appealResult === null && (
              <>
                <Text
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 20,
                    color: theme.colors.text.primary,
                    marginBottom: 12,
                    lineHeight: 28,
                  }}
                >
                  AI wasn't fully convinced. In your own words, describe exactly
                  what you completed:
                </Text>

                <TextInput
                  multiline
                  placeholder="Be specific about what you did..."
                  placeholderTextColor={theme.colors.text.muted}
                  value={appealText}
                  onChangeText={setAppealText}
                  style={{
                    minHeight: 120,
                    color: theme.colors.text.primary,
                    fontFamily: fonts.body,
                    fontSize: 15,
                    textAlignVertical: "top",
                    lineHeight: 22,
                    backgroundColor: "rgba(0,0,0,0.03)",
                    borderRadius: theme.radius.md,
                    padding: 16,
                    marginBottom: 16,
                  }}
                />

                <PrimaryButton
                  title="Submit for re-evaluation"
                  onPress={handleAppealSubmit}
                  loading={appealLoading}
                  loadingText="Re-evaluating..."
                  disabled={appealText.trim().length < 10}
                />

                <TouchableOpacity
                  onPress={handleRetakeProof}
                  style={{ padding: 16, alignItems: "center", marginTop: 8 }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      color: theme.colors.text.secondary,
                      fontSize: 14,
                    }}
                  >
                    Or retake proof instead
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {appealResult === "upgraded" && (
              <View style={{ marginTop: 8 }}>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 16,
                    color: theme.colors.semantic.green,
                    textAlign: "center",
                    marginBottom: 8,
                  }}
                >
                  Score upgraded to {task.aiGrade?.score}/100
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.heading,
                    color: theme.colors.text.secondary,
                    fontSize: 14,
                    textAlign: "center",
                    lineHeight: 20,
                    marginBottom: 24,
                  }}
                >
                  {task.aiGrade?.comment}
                </Text>
                <PrimaryButton
                  title="Unlock apps"
                  onPress={handleComplete}
                />
              </View>
            )}

            {appealResult === "denied" && (
              <View style={{ marginTop: 8 }}>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    color: theme.colors.text.primary,
                    textAlign: "center",
                    lineHeight: 20,
                    marginBottom: 24,
                  }}
                >
                  Your explanation didn't change the assessment. Please retake
                  your proof with clearer evidence.
                </Text>
                <PrimaryButton
                  title="Retake proof"
                  onPress={handleRetakeProof}
                />
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // --- PASSED FLOWS (75+) ---
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg.primary }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Particle burst + mascot for passed scores */}
          {isPassed && (
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <ParticleBurst active={true} />
              <MascotOrb mood="celebration" size={80} />
            </View>
          )}

          {/* Score header - big number centered */}
          {score !== null && (
            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <Text
                style={{
                  fontFamily: fonts.bodyLight,
                  fontSize: 64,
                  color: theme.colors.text.primary,
                  textAlign: "center",
                }}
              >
                {displayScore}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 18,
                  color: theme.colors.text.muted,
                  textAlign: "center",
                  marginTop: -8,
                }}
              >
                / 100
              </Text>

              {/* AI comment */}
              <Text
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 24,
                  color: theme.colors.text.primary,
                  marginTop: 20,
                  textAlign: "center",
                  lineHeight: 32,
                  paddingHorizontal: 16,
                }}
              >
                {grade?.comment}
              </Text>

              {/* Divider */}
              <View style={{ width: "100%", height: 1, backgroundColor: theme.colors.divider, marginVertical: 20 }} />

              {/* Apps unlocked */}
              {isPassed && (
                <>
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 16,
                      color: theme.colors.text.secondary,
                    }}
                  >
                    Apps unlocked
                  </Text>
                  {blockedApps.length > 0 && (
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 14,
                        color: theme.colors.text.muted,
                        textAlign: "center",
                        marginTop: 4,
                      }}
                    >
                      {unlockedAppsStr}
                    </Text>
                  )}
                </>
              )}

              {/* Continue button fades in */}
              {scoreAnimDone && reflectionStep === 0 && mode !== "honor" && (
                <Animated.View style={{ opacity: continueOpacity, marginTop: 24 }}>
                  <TouchableOpacity
                    onPress={() => {
                      // Doer tasks: skip reflection, go straight to done
                      if (isDoer) {
                        handleComplete();
                      } else {
                        setReflectionStep(1);
                      }
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodyMedium,
                        fontSize: 16,
                        color: theme.colors.accent,
                        textAlign: "center",
                      }}
                    >
                      {isDoer ? "done \u2192" : "continue \u2192"}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>
          )}

          {/* --- FINISHED EARLY + PASSED --- */}
          {mode === "early_passed" && reflectionStep >= 1 && (
            <>
              {!showHonestyFeedback ? (
                <>
                  {/* Q1: Honesty */}
                  <Text
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: 22,
                      color: theme.colors.text.primary,
                      marginBottom: 16,
                      lineHeight: 30,
                    }}
                  >
                    You finished {task.minutesDelta ?? 0} min early. Be honest
                    {"\u2009"}{"\u2014"}{"\u2009"}did you complete everything fully or
                    did you rush?
                  </Text>

                  <View style={{ gap: 16, marginBottom: 28 }}>
                    {(
                      [
                        ["full", "Yes, fully done"],
                        ["rushed", "I rushed through some parts"],
                        ["skipped", "I skipped parts of it"],
                      ] as [HonestyReport, string][]
                    ).map(([value, label]) => (
                      <RadioOption
                        key={value}
                        label={label}
                        selected={honestyAnswer === value}
                        onPress={() => setHonestyAnswer(value)}
                      />
                    ))}
                  </View>

                  {/* Q2: Confidence */}
                  {honestyAnswer !== null && (
                    <>
                      <Text
                        style={{
                          fontFamily: fonts.heading,
                          fontSize: 22,
                          color: theme.colors.text.primary,
                          marginBottom: 16,
                          lineHeight: 30,
                        }}
                      >
                        Right now, how confident do you feel about this?
                      </Text>

                      <View style={{ gap: 16, marginBottom: 24 }}>
                        {(
                          [
                            ["high", "Very confident"],
                            ["medium", "Mostly got it"],
                            ["low", "Not really"],
                          ] as [ConfidenceLevel, string][]
                        ).map(([value, label]) => (
                          <RadioOption
                            key={value}
                            label={label}
                            selected={confidenceAnswer === value}
                            onPress={() => {
                              setConfidenceAnswer(value);
                              const willBeNegative =
                                (honestyAnswer === "rushed" ||
                                  honestyAnswer === "skipped") ||
                                value === "low";
                              if (willBeNegative) {
                                setTimeout(
                                  () => setShowHonestyFeedback(true),
                                  400
                                );
                              }
                            }}
                          />
                        ))}
                      </View>
                    </>
                  )}

                  {/* Submit if both answered and positive */}
                  {honestyAnswer !== null &&
                    confidenceAnswer !== null &&
                    !isNegativeHonesty &&
                    !isLowConfidence && (
                      <TouchableOpacity onPress={handleComplete}>
                        <Text
                          style={{
                            fontFamily: fonts.bodyMedium,
                            fontSize: 16,
                            color: theme.colors.accent,
                            textAlign: "center",
                            marginTop: 8,
                          }}
                        >
                          {"submit & unlock apps \u2192"}
                        </Text>
                      </TouchableOpacity>
                    )}
                </>
              ) : (
                /* Honesty feedback screen */
                <View>
                  <Text
                    style={{
                      fontFamily: fonts.bodyLight,
                      fontSize: 17,
                      color: theme.colors.text.primary,
                      lineHeight: 26,
                      marginBottom: 12,
                    }}
                  >
                    We appreciate your honesty. Your score has been adjusted.
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 14,
                      color: theme.colors.text.secondary,
                      lineHeight: 20,
                    }}
                  >
                    Consider spending 10 more minutes on the parts you{" "}
                    {honestyAnswer === "skipped" ? "skipped" : "rushed"}.
                  </Text>
                  {shouldReduceStreak && (
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 14,
                        color: theme.colors.semantic.amber,
                        marginTop: 12,
                        lineHeight: 20,
                      }}
                    >
                      Your streak will be reduced by 1 day. Accountability
                      matters more than streaks.
                    </Text>
                  )}

                  <TouchableOpacity onPress={handleComplete} style={{ marginTop: 24 }}>
                    <Text
                      style={{
                        fontFamily: fonts.bodyMedium,
                        fontSize: 16,
                        color: theme.colors.accent,
                        textAlign: "center",
                      }}
                    >
                      {"finish & unlock apps \u2192"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* --- FINISHED ON TIME + PASSED --- */}
          {mode === "ontime_passed" && reflectionStep >= 1 && (
            <>
              <Text
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 22,
                  color: theme.colors.text.primary,
                  marginBottom: 12,
                  lineHeight: 30,
                }}
              >
                What's one thing you learned or accomplished?
              </Text>

              <TextInput
                multiline
                placeholder="Write at least one sentence..."
                placeholderTextColor={theme.colors.text.muted}
                value={knowledgeLog}
                onChangeText={setKnowledgeLog}
                style={{
                  minHeight: 100,
                  color: theme.colors.text.primary,
                  fontFamily: fonts.body,
                  fontSize: 15,
                  textAlignVertical: "top",
                  lineHeight: 22,
                  backgroundColor: "rgba(0,0,0,0.03)",
                  borderRadius: theme.radius.md,
                  padding: 16,
                  marginBottom: 24,
                }}
              />

              <TouchableOpacity
                onPress={handleComplete}
                disabled={knowledgeLog.trim().length < 10}
                style={{ opacity: knowledgeLog.trim().length < 10 ? 0.4 : 1 }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 16,
                    color: theme.colors.accent,
                    textAlign: "center",
                  }}
                >
                  {"submit & unlock apps \u2192"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* --- FINISHED LATE + PASSED --- */}
          {mode === "late_passed" && reflectionStep >= 1 && (
            <>
              <Text
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 22,
                  color: theme.colors.text.primary,
                  marginBottom: 16,
                  lineHeight: 30,
                }}
              >
                What caused the delay?
              </Text>

              <Text
                style={{
                  fontFamily: fonts.body,
                  color: theme.colors.text.secondary,
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                No judgment {"\u2014"} this helps us estimate better next time
              </Text>

              <View style={{ gap: 16, marginBottom: 24 }}>
                {(
                  [
                    ["underestimated", "Underestimated how long it takes"],
                    ["distracted", "Got distracted"],
                    ["harder_than_expected", "Task was harder than expected"],
                    ["personal_interruption", "Personal interruption"],
                  ] as [DelayReason, string][]
                ).map(([value, label]) => (
                  <RadioOption
                    key={value}
                    label={label}
                    selected={delayAnswer === value}
                    onPress={() => setDelayAnswer(value)}
                  />
                ))}
              </View>

              {delayAnswer !== null && (
                <TouchableOpacity onPress={handleComplete}>
                  <Text
                    style={{
                      fontFamily: fonts.bodyMedium,
                      fontSize: 16,
                      color: theme.colors.accent,
                      textAlign: "center",
                    }}
                  >
                    {"submit & unlock apps \u2192"}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* --- HONOR SYSTEM --- */}
          {mode === "honor" && (
            <>
              <View style={{ alignItems: "center", marginBottom: 24 }}>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    color: theme.colors.text.secondary,
                    fontSize: 15,
                  }}
                >
                  Honor system {"\u2014"} no AI grading
                </Text>
              </View>

              <Text
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 22,
                  color: theme.colors.text.primary,
                  marginBottom: 12,
                  lineHeight: 30,
                }}
              >
                What's one thing you learned or accomplished?
              </Text>

              <TextInput
                multiline
                placeholder="Write at least one sentence..."
                placeholderTextColor={theme.colors.text.muted}
                value={knowledgeLog}
                onChangeText={setKnowledgeLog}
                style={{
                  minHeight: 100,
                  color: theme.colors.text.primary,
                  fontFamily: fonts.body,
                  fontSize: 15,
                  textAlignVertical: "top",
                  lineHeight: 22,
                  backgroundColor: "rgba(0,0,0,0.03)",
                  borderRadius: theme.radius.md,
                  padding: 16,
                  marginBottom: 24,
                }}
              />

              <TouchableOpacity
                onPress={handleComplete}
                disabled={knowledgeLog.trim().length < 10}
                style={{ opacity: knowledgeLog.trim().length < 10 ? 0.4 : 1 }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 16,
                    color: theme.colors.accent,
                    textAlign: "center",
                  }}
                >
                  {"submit & unlock apps \u2192"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
