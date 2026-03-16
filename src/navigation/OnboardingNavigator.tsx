import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OnboardingWelcomeScreen } from "../screens/onboarding/OnboardingWelcomeScreen";
import { OnboardingGoalScreen } from "../screens/onboarding/OnboardingGoalScreen";
import { OnboardingTimeScreen } from "../screens/onboarding/OnboardingTimeScreen";
import { OnboardingMindfulScreen } from "../screens/onboarding/OnboardingMindfulScreen";
import { OnboardingCustomizingScreen } from "../screens/onboarding/OnboardingCustomizingScreen";

export type OnboardingStackParamList = {
  Welcome: undefined;
  Goal: undefined;
  Time: undefined;
  Mindful: undefined;
  Customizing: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

interface OnboardingNavigatorProps {
  onComplete: () => void;
}

export function OnboardingNavigator({ onComplete }: OnboardingNavigatorProps) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: { backgroundColor: "#0f172a" },
      }}
    >
      <Stack.Screen name="Welcome">
        {({ navigation }) => (
          <OnboardingWelcomeScreen
            onNext={() => navigation.navigate("Goal")}
            onLogIn={onComplete}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Goal">
        {({ navigation }) => (
          <OnboardingGoalScreen onNext={() => navigation.navigate("Time")} />
        )}
      </Stack.Screen>
      <Stack.Screen name="Time">
        {({ navigation }) => (
          <OnboardingTimeScreen
            onNext={() => navigation.navigate("Mindful")}
            onSkip={() => navigation.navigate("Mindful")}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Mindful">
        {({ navigation }) => (
          <OnboardingMindfulScreen onNext={() => navigation.navigate("Customizing")} />
        )}
      </Stack.Screen>
      <Stack.Screen name="Customizing" options={{ gestureEnabled: false }}>
        {() => <OnboardingCustomizingScreen onComplete={onComplete} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
