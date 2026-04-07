import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

// ── Types ──────────────────────────────────────────────────────────────────

export interface JournalEntry {
  id: string;
  createdAt: string; // ISO timestamp
  duration: number; // seconds
  audioPath: string;
  transcript: string;
  moodTag: string; // emoji
  note: string;
  aiSummary: string;
  weekNumber: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string; // YYYY-MM-DD
  loggedDates: string[]; // ["2026-04-01", "2026-04-02", ...]
}

export interface SettingsData {
  encryption: boolean;
  localOnly: boolean;
  biometricLock: boolean;
  dailyNudge: boolean;
  nudgeTime: string; // HH:MM
  reminderIfNoLog: boolean;
  plan: 'free' | 'pro' | 'context';
  hasOnboarded: boolean;
}

// ── Keys ───────────────────────────────────────────────────────────────────

const KEYS = {
  entries: 'lym_entries',
  streak: 'lym_streak',
  settings: 'lym_settings',
  onboarded: 'lym_onboarded',
} as const;

// ── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastLogDate: '',
  loggedDates: [],
};

const DEFAULT_SETTINGS: SettingsData = {
  encryption: true,
  localOnly: true,
  biometricLock: false,
  dailyNudge: true,
  nudgeTime: '09:00',
  reminderIfNoLog: true,
  plan: 'free',
  hasOnboarded: false,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(1)} ${units[i]}`;
}

// ── Audio directory ────────────────────────────────────────────────────────

export function getAudioDirectory(): string {
  return (FileSystem.documentDirectory ?? '') + 'audio/';
}

export async function ensureAudioDirectory(): Promise<void> {
  const dir = getAudioDirectory();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

// ── Entries ────────────────────────────────────────────────────────────────

export async function getEntries(): Promise<JournalEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.entries);
    if (!raw) return [];
    const entries: JournalEntry[] = JSON.parse(raw);
    return entries.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function saveEntry(entry: JournalEntry): Promise<void> {
  const entries = await getEntries();
  entries.push(entry);
  await AsyncStorage.setItem(KEYS.entries, JSON.stringify(entries));
}

export async function deleteEntry(id: string): Promise<void> {
  const entries = await getEntries();
  const target = entries.find((e) => e.id === id);

  if (target) {
    // Delete audio file if it exists
    try {
      const info = await FileSystem.getInfoAsync(target.audioPath);
      if (info.exists) {
        await FileSystem.deleteAsync(target.audioPath, { idempotent: true });
      }
    } catch {
      // Audio file may already be gone; that's fine
    }
  }

  const remaining = entries.filter((e) => e.id !== id);
  await AsyncStorage.setItem(KEYS.entries, JSON.stringify(remaining));
}

// ── Streak ─────────────────────────────────────────────────────────────────
// Streak logic has moved to hooks/useStreak.ts
// These types and defaults are kept for reference by other modules.

// ── Settings ───────────────────────────────────────────────────────────────

export async function getSettings(): Promise<SettingsData> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.settings);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Partial<SettingsData>): Promise<void> {
  const current = await getSettings();
  const merged = { ...current, ...settings };
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify(merged));
}

// ── Onboarding ─────────────────────────────────────────────────────────────

export async function hasOnboarded(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(KEYS.onboarded);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setOnboarded(): Promise<void> {
  await AsyncStorage.setItem(KEYS.onboarded, 'true');
}

// ── Danger zone ────────────────────────────────────────────────────────────

export async function deleteAllData(): Promise<void> {
  // Remove all lym_ keys
  const allKeys = await AsyncStorage.getAllKeys();
  const lymKeys = allKeys.filter((k) => k.startsWith('lym_'));
  if (lymKeys.length > 0) {
    await AsyncStorage.multiRemove(lymKeys);
  }

  // Delete audio directory
  try {
    const dir = getAudioDirectory();
    const info = await FileSystem.getInfoAsync(dir);
    if (info.exists) {
      await FileSystem.deleteAsync(dir, { idempotent: true });
    }
  } catch {
    // Best-effort
  }
}

export async function getStorageUsed(): Promise<string> {
  try {
    const dir = getAudioDirectory();
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) return '0 B';

    const files = await FileSystem.readDirectoryAsync(dir);
    let totalBytes = 0;

    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(dir + file);
      if (fileInfo.exists && fileInfo.size != null) {
        totalBytes += fileInfo.size;
      }
    }

    return formatBytes(totalBytes);
  } catch {
    return '0 B';
  }
}
