import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const ONBOARDING_STORAGE_KEY = "@focus_onboarding_complete";

export function useOnboardingComplete() {
  const [complete, setComplete] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const value = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (!cancelled) setComplete(value === "true");
      } catch {
        if (!cancelled) setComplete(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const markComplete = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      setComplete(true);
    } catch {}
  }, []);

  const resetOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
      setComplete(false);
    } catch {}
  }, []);

  return { complete, markComplete, resetOnboarding };
}
