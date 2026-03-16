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
import { theme } from "../theme";

export type RootStackParamList = {
  Tabs: undefined;
  TaskInput: undefined;
  Breakdown: undefined;
  ActiveSession: undefined;
  VerifyScreenshot: undefined;
  VerifyBeforeAfter: undefined;
  Friction: undefined;
  SessionComplete: undefined;
  TinyTask: undefined;
  StudyRecall: undefined;
  ProjectSetup: undefined;
  ProjectTracker: undefined;
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
