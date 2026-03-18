import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { OnboardingWelcomeScreen } from "../screens/onboarding/OnboardingWelcomeScreen";
import { OnboardingHowItWorksScreen } from "../screens/onboarding/OnboardingHowItWorksScreen";
import { OnboardingNameScreen } from "../screens/onboarding/OnboardingNameScreen";
import { OnboardingGoalScreen } from "../screens/onboarding/OnboardingGoalScreen";
import { OnboardingSubjectsScreen } from "../screens/onboarding/OnboardingSubjectsScreen";
import { OnboardingPermissionsScreen } from "../screens/onboarding/OnboardingPermissionsScreen";
import { OnboardingBlockListScreen } from "../screens/onboarding/OnboardingBlockListScreen";
import { OnboardingFirstTaskScreen } from "../screens/onboarding/OnboardingFirstTaskScreen";

const Stack = createNativeStackNavigator();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
      <Stack.Screen name="OnboardingHowItWorks" component={OnboardingHowItWorksScreen} />
      <Stack.Screen name="OnboardingName" component={OnboardingNameScreen} />
      <Stack.Screen name="OnboardingGoal" component={OnboardingGoalScreen} />
      <Stack.Screen name="OnboardingSubjects" component={OnboardingSubjectsScreen} />
      <Stack.Screen name="OnboardingPermissions" component={OnboardingPermissionsScreen} />
      <Stack.Screen name="OnboardingBlockList" component={OnboardingBlockListScreen} />
      <Stack.Screen name="OnboardingFirstTask" component={OnboardingFirstTaskScreen} />
    </Stack.Navigator>
  );
}
