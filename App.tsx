import React, { Component, useEffect } from "react";
import { View, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import {
  CormorantGaramond_400Regular_Italic,
  CormorantGaramond_600SemiBold_Italic,
} from "@expo-google-fonts/cormorant-garamond";
import {
  InstrumentSerif_400Regular_Italic,
} from "@expo-google-fonts/instrument-serif";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_300Light,
} from "@expo-google-fonts/dm-sans";

SplashScreen.preventAutoHideAsync();

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
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            backgroundColor: "#FAF8F4",
          }}
        >
          <Text style={{ color: "#dc3c3c", fontSize: 16, marginBottom: 8 }}>
            Something went wrong
          </Text>
          <Text style={{ color: "rgba(0,0,0,0.45)", fontSize: 12 }}>
            {this.state.error.message}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [fontsLoaded] = useFonts({
    "CormorantGaramond-Italic": CormorantGaramond_400Regular_Italic,
    "CormorantGaramond-SemiBoldItalic": CormorantGaramond_600SemiBold_Italic,
    "InstrumentSerif-Italic": InstrumentSerif_400Regular_Italic,
    "DMSans-Regular": DMSans_400Regular,
    "DMSans-Medium": DMSans_500Medium,
    "DMSans-Light": DMSans_300Light,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <NavigationContainer>
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
    </ErrorBoundary>
  );
}
