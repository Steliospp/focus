import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@focus_onboarding_complete";

export function useOnboardingComplete() {
  const [complete, setComplete] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const value = await AsyncStorage.getItem(KEY);
        if (!cancelled) setComplete(value === "true");
      } catch {
        if (!cancelled) setComplete(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const markComplete = useCallback(async () => {
    try {
      await AsyncStorage.setItem(KEY, "true");
      setComplete(true);
    } catch {}
  }, []);

  return { complete, markComplete };
}
