import React, { useState, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore, type Task } from "../store/useAppStore";
import { MascotOrb } from "../components/ui/MascotOrb";
import { fonts } from "../constants/fonts";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/RootNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.85;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const TODAY_MAX = 5;

export function DailyDealScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { tasks, moveTaskToHorizon, setDailyDealCompleted, contexts } = useAppStore();

  const soonTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.horizon === "soon" &&
          t.status !== "completed" &&
          t.status !== "failed"
      ),
    [tasks]
  );

  const [cardIndex, setCardIndex] = useState(0);
  const [todayPicks, setTodayPicks] = useState<Task[]>([]);
  const [phase, setPhase] = useState<"swiping" | "done">("swiping");

  const translateX = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const currentTask = soonTasks[cardIndex];
  const todayFull = todayPicks.length >= TODAY_MAX;

  const todayCount = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.horizon === "today" &&
          t.status !== "completed" &&
          t.status !== "failed"
      ).length + todayPicks.length,
    [tasks, todayPicks]
  );

  const animateCard = useCallback(
    (direction: "left" | "right", callback: () => void) => {
      const toValue = direction === "right" ? SCREEN_WIDTH * 1.2 : -SCREEN_WIDTH * 1.2;
      Animated.parallel([
        Animated.timing(translateX, {
          toValue,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        translateX.setValue(0);
        cardOpacity.setValue(1);
        rotateAnim.setValue(0);
        callback();
      });
    },
    [translateX, cardOpacity, rotateAnim]
  );

  const handleSwipeRight = useCallback(() => {
    if (!currentTask || todayFull) return;
    animateCard("right", () => {
      moveTaskToHorizon(currentTask.id, "today");
      setTodayPicks((prev) => [...prev, currentTask]);
      const nextIndex = cardIndex + 1;
      if (nextIndex >= soonTasks.length || todayPicks.length + 1 >= TODAY_MAX) {
        setPhase("done");
      } else {
        setCardIndex(nextIndex);
      }
    });
  }, [currentTask, cardIndex, soonTasks.length, todayPicks.length, todayFull]);

  const handleSwipeLeft = useCallback(() => {
    if (!currentTask) return;
    animateCard("left", () => {
      const nextIndex = cardIndex + 1;
      if (nextIndex >= soonTasks.length) {
        setPhase("done");
      } else {
        setCardIndex(nextIndex);
      }
    });
  }, [currentTask, cardIndex, soonTasks.length]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 15 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        translateX.setValue(gs.dx);
        rotateAnim.setValue(gs.dx / SCREEN_WIDTH);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > SWIPE_THRESHOLD) {
          handleSwipeRight();
        } else if (gs.dx < -SWIPE_THRESHOLD) {
          handleSwipeLeft();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start();
          Animated.spring(rotateAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  const handleFinish = () => {
    const today = new Date().toISOString().split("T")[0];
    setDailyDealCompleted(today);
    navigation.goBack();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-12deg", "0deg", "12deg"],
  });

  // No soon tasks — skip right to done
  if (soonTasks.length === 0 && phase === "swiping") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <MascotOrb mood="happy" size={80} />
          <Text style={styles.emotionalText}>nothing coming up soon</Text>
          <Text style={styles.subtitleText}>add tasks and they'll show up here</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={handleFinish}>
            <Text style={styles.doneBtnText}>got it</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Done phase — show today's curated list
  if (phase === "done") {
    const todayTasks = tasks.filter(
      (t) =>
        t.horizon === "today" &&
        t.status !== "completed" &&
        t.status !== "failed"
    );

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <MascotOrb mood="happy" size={80} />
          <Text style={styles.doneTitle}>you're set for today.</Text>

          <View style={styles.todayList}>
            {todayTasks.map((task) => {
              const ctx = contexts.find((c) => c.id === task.contextId);
              return (
                <View key={task.id} style={styles.todayRow}>
                  <View
                    style={[
                      styles.todayDot,
                      { backgroundColor: ctx?.color ?? "#78716C" },
                    ]}
                  />
                  <Text style={styles.todayTaskName} numberOfLines={1}>
                    {task.name}
                  </Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={handleFinish}>
            <Text style={styles.doneBtnText}>let's go</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Swiping phase
  const ctx = contexts.find((c) => c.id === currentTask?.contextId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.swipeHeader}>
        <MascotOrb mood="default" size={60} />
        <Text style={styles.emotionalText}>what are you doing today?</Text>
        <Text style={styles.subtitleText}>
          swipe right → today · left → not today
        </Text>
        <Text style={styles.progressText}>
          {todayCount}/{TODAY_MAX} today
        </Text>
      </View>

      {/* Card */}
      <View style={styles.cardContainer}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ translateX }, { rotate }],
              opacity: cardOpacity,
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Swipe indicators */}
          <Animated.Text
            style={[
              styles.swipeLabel,
              styles.swipeLabelRight,
              {
                opacity: translateX.interpolate({
                  inputRange: [0, SWIPE_THRESHOLD],
                  outputRange: [0, 1],
                  extrapolate: "clamp",
                }),
              },
            ]}
          >
            TODAY
          </Animated.Text>
          <Animated.Text
            style={[
              styles.swipeLabel,
              styles.swipeLabelLeft,
              {
                opacity: translateX.interpolate({
                  inputRange: [-SWIPE_THRESHOLD, 0],
                  outputRange: [1, 0],
                  extrapolate: "clamp",
                }),
              },
            ]}
          >
            NOT TODAY
          </Animated.Text>

          {/* Card content */}
          <View style={styles.cardContent}>
            {ctx && (
              <View style={styles.cardContext}>
                <View style={[styles.cardContextDot, { backgroundColor: ctx.color }]} />
                <Text style={styles.cardContextName}>{ctx.name}</Text>
              </View>
            )}

            <Text style={styles.cardTaskName}>{currentTask?.name}</Text>

            {currentTask?.deadline && (
              <Text style={styles.cardDeadline}>
                due{" "}
                {new Date(currentTask.deadline).toLocaleDateString([], {
                  weekday: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            )}

            {currentTask?.listSubtasks && currentTask.listSubtasks.length > 0 && (
              <Text style={styles.cardSubtasks}>
                {currentTask.listSubtasks.length} subtasks
              </Text>
            )}
          </View>

          <Text style={styles.cardCounter}>
            {cardIndex + 1} / {soonTasks.length}
          </Text>
        </Animated.View>
      </View>

      {/* Manual buttons for accessibility */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSwipeLeft}>
          <Text style={styles.skipBtnText}>not today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.todayBtn, todayFull && styles.todayBtnDisabled]}
          onPress={handleSwipeRight}
          disabled={todayFull}
        >
          <Text style={styles.todayBtnText}>
            {todayFull ? "today is full" : "doing today →"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Skip all */}
      <TouchableOpacity style={styles.skipAll} onPress={() => setPhase("done")}>
        <Text style={styles.skipAllText}>skip for now</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg.primary,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  swipeHeader: {
    alignItems: "center",
    paddingTop: 24,
    gap: 8,
  },
  emotionalText: {
    fontFamily: fonts.heading,
    fontSize: 34,
    color: theme.colors.text.primary,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 16,
  },
  subtitleText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: theme.colors.text.muted,
    textAlign: "center",
  },
  progressText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.accent,
    marginTop: 4,
  },
  cardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    minHeight: 240,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  swipeLabel: {
    position: "absolute",
    top: 20,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    letterSpacing: 2,
  },
  swipeLabelRight: {
    right: 20,
    color: theme.colors.semantic.green,
  },
  swipeLabelLeft: {
    left: 20,
    color: theme.colors.text.muted,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
    gap: 12,
  },
  cardContext: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardContextDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardContextName: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: theme.colors.text.muted,
  },
  cardTaskName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 22,
    color: theme.colors.text.primary,
    lineHeight: 28,
  },
  cardDeadline: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  cardSubtasks: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: theme.colors.text.muted,
  },
  cardCounter: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: theme.colors.text.muted,
    textAlign: "center",
    marginTop: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
  },
  skipBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: theme.colors.text.secondary,
  },
  todayBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
  },
  todayBtnDisabled: {
    backgroundColor: theme.colors.text.muted,
    opacity: 0.5,
  },
  todayBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: "#fff",
  },
  skipAll: {
    alignItems: "center",
    paddingVertical: 16,
    paddingBottom: 24,
  },
  skipAllText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: theme.colors.text.muted,
  },
  doneTitle: {
    fontFamily: fonts.heading,
    fontSize: 34,
    color: theme.colors.text.primary,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 20,
    marginBottom: 32,
  },
  todayList: {
    width: "100%",
    gap: 12,
    marginBottom: 40,
  },
  todayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  todayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  todayTaskName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 17,
    color: theme.colors.text.primary,
    flex: 1,
  },
  doneBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
  },
  doneBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: "#fff",
  },
});
