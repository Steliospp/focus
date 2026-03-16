import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BottomTabNavigator } from "./BottomTabNavigator";
import { TaskInputScreen } from "../screens/TaskInputScreen";
import { BreakdownScreen } from "../screens/BreakdownScreen";
import { ActiveSessionScreen } from "../screens/ActiveSessionScreen";
import { VerifyScreenshotScreen } from "../screens/VerifyScreenshotScreen";
import { VerifyBeforeAfterScreen } from "../screens/VerifyBeforeAfterScreen";
import { FrictionScreen } from "../screens/FrictionScreen";
import { SessionCompleteScreen } from "../screens/SessionCompleteScreen";
import { TinyTaskScreen } from "../screens/TinyTaskScreen";
import { StudyRecallScreen } from "../screens/StudyRecallScreen";
import { ProjectSetupScreen } from "../screens/ProjectSetupScreen";
import { ProjectTrackerScreen } from "../screens/ProjectTrackerScreen";
import { WeeklyInsightsScreen } from "../screens/WeeklyInsightsScreen";
import { CreateTaskScreen } from "../screens/CreateTaskScreen";
import { TaskActiveScreen } from "../screens/TaskActiveScreen";
import { ProofGateScreen } from "../screens/ProofGateScreen";
import { UnlockedScreen } from "../screens/UnlockedScreen";
import { theme } from "../theme";
import type { TaskData, SessionSummary, ProjectData } from "./types";

export type RootStackParamList = {
  Tabs: undefined;
  CreateTask: { initialTask?: string } | undefined;
  TaskActive: undefined;
  ProofGate: undefined;
  Unlocked: { taskTitle: string; durationMinutes: number; blockedAppNames: string[]; streak: number };
  TaskInput: { initialTask?: string } | undefined;
  Breakdown: { task: TaskData };
  ActiveSession: { task: TaskData; durationMinutes: number; beforePhotoUri?: string; sound?: string };
  VerifyScreenshot: { task: TaskData; sessionSummary?: Partial<SessionSummary>; earlyEnd?: boolean; minutesEarly?: number };
  VerifyBeforeAfter: { task: TaskData; beforeUri?: string; afterUri?: string; sessionSummary?: Partial<SessionSummary>; earlyEnd?: boolean; minutesEarly?: number };
  Friction: { task: TaskData; earlyEnd: boolean; minutesEarly: number };
  SessionComplete: { sessionSummary: SessionSummary };
  TinyTask: { task: TaskData };
  StudyRecall: { task: TaskData; subject?: string | null };
  ProjectSetup: undefined;
  ProjectTracker: { project: ProjectData };
  WeeklyInsights: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg.gradient.top },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Tabs" component={BottomTabNavigator} />
      <Stack.Screen name="CreateTask" component={CreateTaskScreen} />
      <Stack.Screen name="TaskActive" component={TaskActiveScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="ProofGate" component={ProofGateScreen} />
      <Stack.Screen name="Unlocked" component={UnlockedScreen} />
      <Stack.Screen name="TaskInput" component={TaskInputScreen} />
      <Stack.Screen name="Breakdown" component={BreakdownScreen} />
      <Stack.Screen
        name="ActiveSession"
        component={ActiveSessionScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="VerifyScreenshot" component={VerifyScreenshotScreen} />
      <Stack.Screen name="VerifyBeforeAfter" component={VerifyBeforeAfterScreen} />
      <Stack.Screen name="Friction" component={FrictionScreen} />
      <Stack.Screen name="SessionComplete" component={SessionCompleteScreen} />
      <Stack.Screen
        name="TinyTask"
        component={TinyTaskScreen}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen
        name="StudyRecall"
        component={StudyRecallScreen}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen name="ProjectSetup" component={ProjectSetupScreen} />
      <Stack.Screen name="ProjectTracker" component={ProjectTrackerScreen} />
      <Stack.Screen name="WeeklyInsights" component={WeeklyInsightsScreen} />
    </Stack.Navigator>
  );
}
