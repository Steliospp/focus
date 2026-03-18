import React from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { GlassCard } from "./GlassCard";
import { theme } from "../../theme";
import { useAppStore, type Task, type TaskCategory, type TaskStatus, type Priority } from "../../store/useAppStore";

interface TaskCardProps {
  task: Task;
  onPress: () => void;
  /** Show AI score instead of "Done" badge for completed tasks */
  scoreBadge?: boolean;
  /** Parent context for session tasks (children of a parent assignment) */
  parentContext?: {
    parentName: string;
    sessionIndex: number;
    totalSessions: number;
    completedSessions: number;
  };
}

const categoryEmoji: Record<TaskCategory, string> = {
  study: "\u{1F4DA}",
  writing: "\u270D\uFE0F",
  coding: "\u{1F4BB}",
  practice: "\u{1F3AF}",
  chores: "\u{1F9F9}",
  fitness: "\u{1F4AA}",
  creative: "\u{1F3A8}",
  work: "\u{1F4BC}",
  errands: "\u{1F6D2}",
  other: "\u26A1",
};

const priorityColors: Record<Priority, string> = {
  low: "#94a3b8",
  medium: "#F59E0B",
  high: "#D97706",
  urgent: "#ef4444",
};

const statusConfig: Record<
  TaskStatus,
  { label: string; bg: string; text: string }
> = {
  todo: { label: "Start", bg: theme.colors.status.todo, text: "#FFFFFF" },
  active: { label: "Active", bg: theme.colors.status.active, text: "#FFFFFF" },
  late: { label: "Late", bg: theme.colors.status.late, text: "#FFFFFF" },
  completed: {
    label: "Done",
    bg: theme.colors.status.completed,
    text: "#FFFFFF",
  },
  failed: { label: "Missed", bg: theme.colors.status.failed, text: "#FFFFFF" },
  backlog: { label: "Someday", bg: "#A8A29E", text: "#FFFFFF" },
};

export function TaskCard({ task, onPress, scoreBadge, parentContext }: TaskCardProps) {
  const subjects = useAppStore((s) => s.subjects);
  const subject = task.subjectId ? subjects.find((s) => s.id === task.subjectId) : null;
  const status = statusConfig[task.status];
  const emoji = categoryEmoji[task.category] ?? "\u26A1";

  const showScore = scoreBadge && task.status === "completed" && task.aiGrade;
  const badgeBg = showScore ? theme.colors.accent : status.bg;
  const badgeLabel = showScore ? `${task.aiGrade!.score} pts` : status.label;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <GlassCard soft className="mb-3" style={{ padding: 16, borderLeftWidth: subject ? 4 : 0, borderLeftColor: subject?.color }}>
        <View className="flex-row items-center">
          {/* Category emoji + priority dot */}
          <View style={{ position: "relative" }}>
            <Text style={{ fontSize: 28, marginRight: 12 }}>{emoji}</Text>
            {task.priority && task.priority !== "low" && (
              <View
                style={{
                  position: "absolute",
                  top: -2,
                  right: 8,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: priorityColors[task.priority],
                  borderWidth: 1.5,
                  borderColor: "#FFFFFF",
                }}
              />
            )}
          </View>

          {/* Task info */}
          <View className="flex-1">
            <Text
              className="font-semibold text-[15px]"
              style={{ color: theme.colors.text.primary }}
              numberOfLines={1}
            >
              {task.name}
            </Text>
            <Text
              className="text-[13px] mt-0.5"
              style={{ color: theme.colors.text.secondary }}
            >
              {task.estimatedMinutes} min{" "}
              {"\u00B7"} {task.proofType}
            </Text>
            {parentContext && (
              <>
                <Text
                  className="text-[11px] mt-1"
                  style={{ color: theme.colors.text.secondary }}
                  numberOfLines={1}
                >
                  Session {parentContext.sessionIndex + 1} of{" "}
                  {parentContext.totalSessions} — {parentContext.parentName}
                </Text>
                <View
                  style={{
                    height: 3,
                    borderRadius: 1.5,
                    backgroundColor: "rgba(0,0,0,0.08)",
                    marginTop: 4,
                  }}
                >
                  <View
                    style={{
                      height: 3,
                      borderRadius: 1.5,
                      backgroundColor: theme.colors.accent,
                      width: `${(parentContext.completedSessions / parentContext.totalSessions) * 100}%`,
                    }}
                  />
                </View>
              </>
            )}
          </View>

          {/* Status / score badge */}
          <View
            style={{
              backgroundColor: badgeBg,
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: "#FFFFFF" }}
            >
              {badgeLabel}
            </Text>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}
