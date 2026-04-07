import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { SoftGradientBg } from "../components/ui/SoftGradientBg";
import { useAppStore, Task } from "../store/useAppStore";
import { theme } from "../theme";
import { fonts } from "../constants/fonts";

type Nav = NativeStackNavigationProp<any>;

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_FULL = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];


function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTaskDateKey(task: Task): string | null {
  const raw =
    task.scheduledDate ??
    (task.deadline ? task.deadline.split("T")[0] : null) ??
    task.createdAt?.split("T")[0];
  if (!raw) return null;
  try {
    const d = new Date(raw + (raw.includes("T") ? "" : "T12:00:00"));
    if (isNaN(d.getTime())) return null;
    return toDateKey(d);
  } catch {
    return null;
  }
}

/** Determine the effective display status, treating overdue todos as missed (red). */
function getEffectiveStatus(task: Task, todayKey: string): string {
  if (task.status === "todo") {
    const dateKey = getTaskDateKey(task);
    if (dateKey && dateKey < todayKey) return "missed";
  }
  return task.status;
}

const DOT_STATUS_COLORS: Record<string, string> = {
  completed: theme.colors.status.completed,
  todo: theme.colors.status.todo,
  missed: theme.colors.status.late,
  late: theme.colors.status.late,
  failed: theme.colors.status.late,
  active: theme.colors.status.active,
};

const STATUS_TEXT_COLORS: Record<string, { label: string; color: string }> = {
  todo: { label: "start", color: "#78716C" },
  active: { label: "active", color: "#F59E0B" },
  late: { label: "late", color: "#EF4444" },
  missed: { label: "late", color: "#EF4444" },
  completed: { label: "done", color: "#84CC16" },
  failed: { label: "missed", color: "#EF4444" },
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDateLabel(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return "tasks for today";
  const d = new Date(dateKey + "T12:00:00");
  const dayName = WEEKDAY_FULL[d.getDay()];
  const month = MONTH_NAMES[d.getMonth()];
  const day = d.getDate();
  return `tasks for ${dayName}, ${month} ${day}`;
}

type CalendarView = "month" | "week" | "agenda";

function TaskRow({ task, todayKey, onPress }: { task: Task; todayKey: string; onPress: () => void }) {
  const effStatus = getEffectiveStatus(task, todayKey);
  const dotColor = DOT_STATUS_COLORS[effStatus] ?? theme.colors.text.muted;
  const statusInfo = STATUS_TEXT_COLORS[effStatus] ?? STATUS_TEXT_COLORS.todo;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: dotColor,
          marginRight: 12,
        }}
      />
      <Text
        style={{
          flex: 1,
          fontFamily: "DMSans-Medium",
          fontSize: 16,
          color: theme.colors.text.primary,
        }}
        numberOfLines={1}
      >
        {task.name}
      </Text>
      <Text
        style={{
          fontFamily: "DMSans-Regular",
          fontSize: 14,
          color: statusInfo.color,
        }}
      >
        {statusInfo.label}
      </Text>
    </TouchableOpacity>
  );
}

function formatDayLabel(dateKey: string): string {
  const d = new Date(dateKey + "T12:00:00");
  const dayName = WEEKDAY_FULL[d.getDay()];
  const month = MONTH_NAMES[d.getMonth()];
  const day = d.getDate();
  return `${dayName}, ${month} ${day}`;
}

function DayDetailSection({
  dateKey,
  todayKey,
  dayTasks,
  backlogTasks,
  onTaskPress,
  onAddTask,
}: {
  dateKey: string;
  todayKey: string;
  dayTasks: Task[];
  backlogTasks: Task[];
  onTaskPress: (task: Task) => void;
  onAddTask: (dateKey: string) => void;
}) {
  const randomBacklog = backlogTasks.slice(0, 3);

  return (
    <View>
      {/* Date label */}
      <Text
        style={{
          fontFamily: fonts.heading,
          fontSize: 24,
          fontStyle: "italic",
          color: "#1C1917",
          marginBottom: 8,
        }}
      >
        {formatDayLabel(dateKey)}
      </Text>

      {/* Add something for this day */}
      <TouchableOpacity
        onPress={() => onAddTask(dateKey)}
        activeOpacity={0.7}
        style={{ paddingVertical: 12 }}
      >
        <Text style={{ fontFamily: fonts.body, fontSize: 16, color: "#78716C" }}>
          + add something for this day {"\u2192"}
        </Text>
      </TouchableOpacity>

      {/* Tasks or empty state */}
      {dayTasks.length === 0 ? (
        <Text
          style={{
            fontFamily: fonts.heading,
            fontSize: 22,
            fontStyle: "italic",
            color: "#A8A29E",
            paddingVertical: 16,
          }}
        >
          nothing scheduled
        </Text>
      ) : (
        dayTasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            todayKey={todayKey}
            onPress={() => onTaskPress(task)}
          />
        ))
      )}

      {/* Backlog suggestions */}
      {randomBacklog.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: "#A8A29E", marginBottom: 8 }}>
            from your someday list
          </Text>
          {randomBacklog.map((task) => (
            <View
              key={task.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 6,
                paddingLeft: 8,
              }}
            >
              <Text style={{ fontSize: 14, color: "#A8A29E", marginRight: 10 }}>{"\u00B7"}</Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 14,
                  color: "#A8A29E",
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {task.name}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const tasks = useAppStore((s) => s.tasks);

  const today = new Date();
  const todayKey = toDateKey(today);

  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [weekOffset, setWeekOffset] = useState(0);

  // Build a map: dateKey -> Task[]
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const task of tasks) {
      const key = getTaskDateKey(task);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(task);
    }
    return map;
  }, [tasks]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const selectedTasks = tasksByDate[selectedDateKey] ?? [];
  const backlogTasks = tasks.filter((t) => t.status === "backlog");

  const handleAddForDate = (dateKey: string) => {
    navigation.navigate("AddTask", { prefilledDate: dateKey });
  };

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleTaskPress = (task: Task) => {
    if (task.status === "active") {
      navigation.navigate("ActiveTask", { taskId: task.id });
    } else if (task.status === "completed") {
      navigation.navigate("Reflect", { taskId: task.id });
    } else if (
      (task.status === "todo" || task.status === "late") &&
      !task.aiAnalysis
    ) {
      navigation.navigate("AddTask", { taskId: task.id });
    } else {
      navigation.navigate("TaskDetail", { taskId: task.id });
    }
  };

  // Build grid cells: leading blanks + day numbers
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <SoftGradientBg>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
        >
          {/* View toggle — text-only with amber underline */}
          <View
            style={{
              flexDirection: "row",
              marginTop: 8,
              marginBottom: 12,
              gap: 24,
              justifyContent: "center",
            }}
          >
            {(["month", "week", "agenda"] as CalendarView[]).map((v) => (
              <TouchableOpacity
                key={v}
                onPress={() => setCalendarView(v)}
                style={{
                  paddingVertical: 8,
                  borderBottomWidth: calendarView === v ? 2 : 0,
                  borderBottomColor: "#D97706",
                }}
              >
                <Text
                  style={{
                    fontFamily: calendarView === v ? "DMSans-Medium" : "DMSans-Regular",
                    fontSize: 14,
                    color: calendarView === v ? theme.colors.text.primary : theme.colors.text.muted,
                  }}
                >
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Month view */}
          {calendarView === "month" && <>
          {/* Month/year header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 8,
              marginBottom: 16,
            }}
          >
            <TouchableOpacity
              onPress={goToPrevMonth}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={theme.colors.text.primary}
              />
            </TouchableOpacity>

            <Text
              style={{
                fontFamily: "DMSans-Medium",
                fontSize: 18,
                color: theme.colors.text.primary,
              }}
            >
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>

            <TouchableOpacity
              onPress={goToNextMonth}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name="chevron-forward"
                size={24}
                color={theme.colors.text.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Calendar grid — no card wrapper */}
          <View style={{ marginBottom: 20 }}>
            {/* Weekday headers */}
            <View style={{ flexDirection: "row" }}>
              {WEEKDAY_LABELS.map((label) => (
                <View
                  key={label}
                  style={{ flex: 1, alignItems: "center", paddingBottom: 8 }}
                >
                  <Text
                    style={{
                      fontFamily: "DMSans-Regular",
                      fontSize: 12,
                      color: theme.colors.text.muted,
                    }}
                  >
                    {label.toLowerCase()}
                  </Text>
                </View>
              ))}
            </View>

            {/* Day cells - render rows of 7 */}
            {Array.from(
              { length: Math.ceil(cells.length / 7) },
              (_, rowIdx) => (
                <View key={rowIdx} style={{ flexDirection: "row" }}>
                  {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
                    if (day === null) {
                      return (
                        <View
                          key={`blank-${colIdx}`}
                          style={{ flex: 1, height: 52 }}
                        />
                      );
                    }

                    const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const isToday = dateKey === todayKey;
                    const isSelected = dateKey === selectedDateKey;
                    const dayTasks = tasksByDate[dateKey] ?? [];

                    // Build per-task dot colors (up to 3, then overflow)
                    const allDotColors: string[] = dayTasks.map((t) => {
                      const eff = getEffectiveStatus(t, todayKey);
                      return DOT_STATUS_COLORS[eff] ?? theme.colors.text.muted;
                    });
                    const overflowCount = allDotColors.length > 3 ? allDotColors.length - 2 : 0;
                    const dotColors = overflowCount > 0 ? allDotColors.slice(0, 2) : allDotColors.slice(0, 3);

                    return (
                      <TouchableOpacity
                        key={`day-${day}`}
                        style={{
                          flex: 1,
                          height: 52,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        activeOpacity={0.6}
                        onPress={() => setSelectedDateKey(dateKey)}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: isSelected
                              ? "#D97706"
                              : "transparent",
                            borderWidth: isToday && !isSelected ? 2 : 0,
                            borderColor: "#D97706",
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: isToday || isSelected ? "DMSans-Medium" : "DMSans-Regular",
                              fontSize: 15,
                              color: isSelected
                                ? "#FFFFFF"
                                : theme.colors.text.primary,
                            }}
                          >
                            {day}
                          </Text>
                        </View>

                        {/* Task dots */}
                        {dotColors.length > 0 && (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 3,
                              marginTop: 2,
                              position: "absolute",
                              bottom: 2,
                            }}
                          >
                            {dotColors.map((c, i) => (
                              <View
                                key={i}
                                style={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: 2.5,
                                  backgroundColor: c,
                                }}
                              />
                            ))}
                            {overflowCount > 0 && (
                              <Text
                                style={{
                                  fontFamily: "DMSans-Medium",
                                  fontSize: 8,
                                  color: theme.colors.text.secondary,
                                  lineHeight: 10,
                                }}
                              >
                                +{overflowCount}
                              </Text>
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  {/* Fill remaining cells in the last row */}
                  {rowIdx === Math.ceil(cells.length / 7) - 1 &&
                    cells.length % 7 !== 0 &&
                    Array.from(
                      { length: 7 - (cells.length % 7) },
                      (_, i) => (
                        <View key={`pad-${i}`} style={{ flex: 1, height: 52 }} />
                      )
                    )}
                </View>
              )
            )}
          </View>

          {/* Thin divider between calendar and task list */}
          <View style={{ height: 1, backgroundColor: "#E7E5E4", marginBottom: 16 }} />

          {/* Day detail with add task */}
          <DayDetailSection
            dateKey={selectedDateKey}
            todayKey={todayKey}
            dayTasks={selectedTasks}
            backlogTasks={backlogTasks}
            onTaskPress={handleTaskPress}
            onAddTask={handleAddForDate}
          />

          </>}

          {/* Week View */}
          {calendarView === "week" && (() => {
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() + weekOffset * 7);
            const weekDays = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() + i);
              return d;
            });

            return (
              <View>
                {/* Week nav */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <TouchableOpacity onPress={() => setWeekOffset((w) => w - 1)}>
                    <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
                  </TouchableOpacity>
                  <Text style={{ fontFamily: "DMSans-Medium", fontSize: 18, color: theme.colors.text.primary }}>
                    {MONTH_NAMES[weekDays[0].getMonth()]} {weekDays[0].getDate()} – {weekDays[6].getDate()}
                  </Text>
                  <TouchableOpacity onPress={() => setWeekOffset((w) => w + 1)}>
                    <Ionicons name="chevron-forward" size={24} color={theme.colors.text.primary} />
                  </TouchableOpacity>
                </View>

                {/* 7-day grid */}
                <View style={{ flexDirection: "row", gap: 4, marginBottom: 20 }}>
                  {weekDays.map((d) => {
                    const dk = toDateKey(d);
                    const isDayToday = dk === todayKey;
                    const isSel = dk === selectedDateKey;
                    const dayTasks = tasksByDate[dk] ?? [];
                    return (
                      <TouchableOpacity
                        key={dk}
                        onPress={() => setSelectedDateKey(dk)}
                        style={{
                          flex: 1,
                          alignItems: "center",
                          paddingVertical: 10,
                          borderRadius: 12,
                          backgroundColor: isSel ? "#D97706" : "transparent",
                          borderWidth: isDayToday && !isSel ? 1.5 : 0,
                          borderColor: "#D97706",
                        }}
                      >
                        <Text style={{ fontFamily: "DMSans-Regular", fontSize: 11, color: isSel ? "#FFF" : theme.colors.text.muted }}>
                          {WEEKDAY_LABELS[d.getDay()].toLowerCase()}
                        </Text>
                        <Text style={{ fontFamily: "DMSans-Medium", fontSize: 18, color: isSel ? "#FFF" : theme.colors.text.primary, marginTop: 2 }}>
                          {d.getDate()}
                        </Text>
                        {dayTasks.length > 0 && (
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isSel ? "#FFF" : "#D97706", marginTop: 4 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: "#E7E5E4", marginBottom: 16 }} />

                {/* Day detail with add task */}
                <DayDetailSection
                  dateKey={selectedDateKey}
                  todayKey={todayKey}
                  dayTasks={tasksByDate[selectedDateKey] ?? []}
                  backlogTasks={backlogTasks}
                  onTaskPress={handleTaskPress}
                  onAddTask={handleAddForDate}
                />
              </View>
            );
          })()}

          {/* Agenda View */}
          {calendarView === "agenda" && (() => {
            // Show next 14 days
            const agendaDays: { dateKey: string; tasks: Task[] }[] = [];
            for (let i = 0; i < 14; i++) {
              const d = new Date(today);
              d.setDate(d.getDate() + i);
              const dk = toDateKey(d);
              const dayTasks = tasksByDate[dk] ?? [];
              if (dayTasks.length > 0) {
                agendaDays.push({ dateKey: dk, tasks: dayTasks });
              }
            }

            return (
              <View>
                <Text style={{ fontFamily: "DMSans-Medium", fontSize: 18, color: theme.colors.text.primary, marginBottom: 16 }}>
                  upcoming
                </Text>
                {agendaDays.length === 0 ? (
                  <Text style={{ fontFamily: "DMSans-Regular", fontSize: 14, color: theme.colors.text.muted, paddingVertical: 16 }}>No tasks in the next 2 weeks.</Text>
                ) : (
                  agendaDays.map(({ dateKey, tasks: dayTasks }) => (
                    <View key={dateKey} style={{ marginBottom: 20 }}>
                      <Text style={{ fontFamily: "DMSans-Regular", fontSize: 14, color: "#78716C", marginBottom: 8 }}>
                        {formatDateLabel(dateKey, todayKey)}
                      </Text>
                      {dayTasks.map((task) => (
                        <TaskRow key={task.id} task={task} todayKey={todayKey} onPress={() => handleTaskPress(task)} />
                      ))}
                    </View>
                  ))
                )}
              </View>
            );
          })()}

          {/* Bottom spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </SoftGradientBg>
  );
}
