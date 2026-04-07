import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "../store/useAppStore";
import { MascotOrb } from "../components/ui/MascotOrb";
import { fonts } from "../constants/fonts";
import { theme } from "../theme";

const TODAY_MAX = 5;

export function OverflowScreen() {
  const navigation = useNavigation();
  const { tasks, contexts, moveTaskToHorizon } = useAppStore();

  const todayTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.horizon === "today" &&
          t.status !== "completed" &&
          t.status !== "failed"
      ),
    [tasks]
  );

  const isOverflow = todayTasks.length > TODAY_MAX;

  const handleMoveTomorrow = (taskId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    moveTaskToHorizon(taskId, "soon");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MascotOrb mood="warning" size={60} />
        <Text style={styles.title}>that's a lot for one day.</Text>
        <Text style={styles.subtitle}>
          which of these can wait until tomorrow?
        </Text>
        <Text style={styles.count}>
          {todayTasks.length} tasks · aim for {TODAY_MAX} or fewer
        </Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {todayTasks.map((task) => {
          const ctx = contexts.find((c) => c.id === task.contextId);
          return (
            <TouchableOpacity
              key={task.id}
              style={styles.taskRow}
              onPress={() => handleMoveTomorrow(task.id)}
              activeOpacity={0.7}
            >
              <View style={styles.taskRowLeft}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: ctx?.color ?? "#78716C" },
                  ]}
                />
                <Text style={styles.taskName} numberOfLines={1}>
                  {task.name}
                </Text>
              </View>
              <Text style={styles.moveText}>tap to move →</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.doneBtn,
            !isOverflow && styles.doneBtnGreen,
          ]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.doneBtnText}>
            {isOverflow
              ? `keep all ${todayTasks.length} — I've got this`
              : "looks good"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg.primary,
  },
  header: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: theme.colors.text.primary,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 16,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: theme.colors.text.secondary,
    textAlign: "center",
    marginTop: 8,
  },
  count: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.semantic.amber,
    marginTop: 8,
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  taskRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 17,
    color: theme.colors.text.primary,
    flex: 1,
  },
  moveText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: theme.colors.text.muted,
    marginLeft: 8,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  doneBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.semantic.amber,
    alignItems: "center",
  },
  doneBtnGreen: {
    backgroundColor: theme.colors.semantic.green,
  },
  doneBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: "#fff",
  },
});
