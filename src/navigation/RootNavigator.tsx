import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BottomTabNavigator } from "./BottomTabNavigator";
import { OnboardingNavigator } from "./OnboardingNavigator";
import { AddTaskScreen } from "../screens/AddTaskScreen";
import { ActiveTaskScreen } from "../screens/ActiveTaskScreen";
import { ProofGateScreen } from "../screens/ProofGateScreen";
import { ReflectScreen } from "../screens/ReflectScreen";
import { BlockedScreen } from "../screens/BlockedScreen";
import { CooldownScreen } from "../screens/CooldownScreen";
import { SyllabusScreen } from "../screens/SyllabusScreen";
import { JournalWriteScreen } from "../screens/JournalWriteScreen";
import { TaskDetailScreen } from "../screens/TaskDetailScreen";
import { WaitPhaseScreen } from "../screens/WaitPhaseScreen";
import { DailyDealScreen } from "../screens/DailyDealScreen";
import { PasteListScreen } from "../screens/PasteListScreen";
import { OverflowScreen } from "../screens/OverflowScreen";
import { ListSettingsScreen } from "../screens/ListSettingsScreen";
import { useAppStore } from "../store/useAppStore";

export type RootStackParamList = {
  Onboarding: undefined;
  Tabs: undefined;
  AddTask: { taskId?: string; prefilledDate?: string; prefilledName?: string } | undefined;
  ActiveTask: { taskId: string; autoAdvanceFromProof?: boolean };
  ProofGate: { taskId: string; capturedPhotos?: Record<string, string> };
  Cooldown: undefined;
  Reflect: { taskId: string };
  Blocked: undefined;
  Syllabus: undefined;
  JournalEntry: { entryId: string };
  TaskDetail: { taskId: string; quickStart?: boolean };
  WaitPhase: { taskId: string };
  DailyDeal: undefined;
  PasteList: undefined;
  Overflow: undefined;
  ListSettings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isOnboarded = useAppStore((s) => s.isOnboarded);
  const hasAnyTasks = useAppStore((s) => s.tasks.length > 0);
  const cooldownEndsAt = useAppStore((s) => s.cooldownEndsAt);
  const isCoolingDown =
    !!cooldownEndsAt && new Date(cooldownEndsAt).getTime() > Date.now();

  // Existing users who have tasks are considered onboarded even if the flag
  // wasn't set (flag was added after they started using the app).
  const showOnboarding = !isOnboarded && !hasAnyTasks;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FAF8F4" },
        animation: "fade",
      }}
      initialRouteName={isCoolingDown ? "Cooldown" : showOnboarding ? "Onboarding" : "Tabs"}
    >
      <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      <Stack.Screen name="Tabs" component={BottomTabNavigator} />
      <Stack.Screen name="AddTask" component={AddTaskScreen} />
      <Stack.Screen
        name="ActiveTask"
        component={ActiveTaskScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="ProofGate"
        component={ProofGateScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="Reflect" component={ReflectScreen} />
      <Stack.Screen name="Blocked" component={BlockedScreen} />
      <Stack.Screen
        name="Cooldown"
        component={CooldownScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="Syllabus" component={SyllabusScreen} />
      <Stack.Screen name="JournalEntry" component={JournalWriteScreen} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
      <Stack.Screen name="WaitPhase" component={WaitPhaseScreen} />
      <Stack.Screen name="DailyDeal" component={DailyDealScreen} />
      <Stack.Screen name="PasteList" component={PasteListScreen} />
      <Stack.Screen name="Overflow" component={OverflowScreen} />
      <Stack.Screen name="ListSettings" component={ListSettingsScreen} />
    </Stack.Navigator>
  );
}
