import React, { Component } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { OnboardingNavigator } from "./src/navigation/OnboardingNavigator";
import { useOnboardingComplete } from "./src/hooks/useOnboardingComplete";
import { OnboardingProvider } from "./src/context/OnboardingContext";

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#0f172a" }}>
          <Text style={{ color: "#F87171", fontSize: 16, marginBottom: 8 }}>Something went wrong</Text>
          <Text style={{ color: "#94A3B8", fontSize: 12 }}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { complete, markComplete, resetOnboarding } = useOnboardingComplete();

  if (complete === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" }}>
        <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
      </View>
    );
  }

  if (!complete) {
    return (
      <ErrorBoundary>
        <StatusBar style="light" />
        <NavigationContainer>
          <OnboardingNavigator onComplete={markComplete} />
        </NavigationContainer>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <OnboardingProvider resetOnboarding={resetOnboarding}>
        <NavigationContainer>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </OnboardingProvider>
    </ErrorBoundary>
  );
}
