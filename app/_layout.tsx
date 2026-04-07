import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import {
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold_Italic,
} from '@expo-google-fonts/playfair-display';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_300Light,
} from '@expo-google-fonts/dm-sans';
import { hasOnboarded } from '@/services/storage';
import { checkStreakIntegrity } from '@/hooks/useStreak';

SplashScreen.preventAutoHideAsync();
SystemUI.setBackgroundColorAsync('#F5F0E8');

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'PlayfairDisplay-Italic': PlayfairDisplay_400Regular_Italic,
    'PlayfairDisplay-BoldItalic': PlayfairDisplay_700Bold_Italic,
    'DMSans-Regular': DMSans_400Regular,
    'DMSans-Medium': DMSans_500Medium,
    'DMSans-Light': DMSans_300Light,
  });

  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    hasOnboarded().then((value) => setOnboarded(value));
    // Check streak integrity on app launch (resets broken streaks)
    checkStreakIntegrity();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (onboarded === null || !fontsLoaded) return;

    if (!onboarded) {
      router.replace('/onboarding');
    }
  }, [onboarded, fontsLoaded]);

  if (!fontsLoaded || onboarded === null) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F5F0E8' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="onboarding"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
    </Stack>
  );
}
