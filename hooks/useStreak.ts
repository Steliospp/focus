import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_KEY = 'streak_data';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string; // YYYY-MM-DD
  loggedDates: string[]; // ["2026-04-01", "2026-04-02", ...]
}

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastLogDate: '',
  loggedDates: [],
};

function getLocalDateStr(date?: Date): string {
  const d = date ?? new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateStr(d);
}

async function loadStreak(): Promise<StreakData> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    if (!raw) return { ...DEFAULT_STREAK };
    return { ...DEFAULT_STREAK, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STREAK };
  }
}

async function saveStreak(data: StreakData): Promise<void> {
  await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

export async function updateStreak(): Promise<StreakData> {
  const streak = await loadStreak();
  const today = getLocalDateStr();
  const yesterday = getYesterday();

  // 1. Already logged today — do nothing
  if (streak.lastLogDate === today) {
    return streak;
  }

  // 2. Consecutive day — increment
  if (streak.lastLogDate === yesterday) {
    streak.currentStreak += 1;
  }
  // 3. First ever log or gap > 1 day — reset to 1
  else {
    streak.currentStreak = 1;
  }

  // 4. Add today to loggedDates (deduplicated)
  if (!streak.loggedDates.includes(today)) {
    streak.loggedDates.push(today);
  }

  // 5. Update longest streak
  if (streak.currentStreak > streak.longestStreak) {
    streak.longestStreak = streak.currentStreak;
  }

  // 6. Set lastLogDate
  streak.lastLogDate = today;

  // 7. Persist
  await saveStreak(streak);
  return streak;
}

export interface StreakIntegrity {
  streakActive: boolean;
  missedYesterday: boolean;
}

export async function checkStreakIntegrity(): Promise<StreakIntegrity> {
  const streak = await loadStreak();
  const today = getLocalDateStr();
  const yesterday = getYesterday();

  // No streak data yet
  if (!streak.lastLogDate) {
    return { streakActive: false, missedYesterday: false };
  }

  // Logged today — streak is active
  if (streak.lastLogDate === today) {
    return { streakActive: true, missedYesterday: false };
  }

  // Logged yesterday — streak still active (they haven't missed yet)
  if (streak.lastLogDate === yesterday) {
    return { streakActive: true, missedYesterday: false };
  }

  // More than 1 day gap and haven't logged today — streak broken
  return { streakActive: false, missedYesterday: true };
}

export function useStreak() {
  const [streak, setStreak] = useState<StreakData>({ ...DEFAULT_STREAK });
  const [integrity, setIntegrity] = useState<StreakIntegrity>({
    streakActive: false,
    missedYesterday: false,
  });

  const today = getLocalDateStr();
  const hasLoggedToday = streak.lastLogDate === today;

  const refreshStreak = useCallback(async () => {
    try {
      const data = await loadStreak();
      setStreak(data);
      const check = await checkStreakIntegrity();
      setIntegrity(check);
    } catch (error) {
      console.error('[useStreak] refreshStreak error:', error);
    }
  }, []);

  useEffect(() => {
    refreshStreak();
  }, [refreshStreak]);

  const getLoggedDatesSet = useCallback((): Set<string> => {
    return new Set(streak.loggedDates);
  }, [streak.loggedDates]);

  // Dev tools: simulate streak states
  const devSetStreak = useCallback(async (overrides: Partial<StreakData>) => {
    const current = await loadStreak();
    const updated = { ...current, ...overrides };
    await saveStreak(updated);
    setStreak(updated);
    const check = await checkStreakIntegrity();
    setIntegrity(check);
  }, []);

  const devResetStreak = useCallback(async () => {
    await AsyncStorage.removeItem(STREAK_KEY);
    setStreak({ ...DEFAULT_STREAK });
    setIntegrity({ streakActive: false, missedYesterday: false });
  }, []);

  return {
    streak,
    hasLoggedToday,
    streakActive: integrity.streakActive,
    missedYesterday: integrity.missedYesterday,
    refreshStreak,
    getLoggedDatesSet,
    devSetStreak,
    devResetStreak,
  };
}
