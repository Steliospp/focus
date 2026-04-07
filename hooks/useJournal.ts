import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {
  getEntries,
  saveEntry,
  deleteEntry as deleteStorageEntry,
  JournalEntry,
} from '@/services/storage';
import { updateStreak } from '@/hooks/useStreak';
import { transcribeAudio } from '@/services/transcription';
import { generateSummary } from '@/services/ai';

interface SaveNewEntryParams {
  audioPath: string;
  duration: number;
  moodTag?: string;
  note?: string;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const hasLoadedOnce = useRef(false);

  const refreshEntries = useCallback(async () => {
    try {
      // Only show loading shimmer on first load, not on tab re-focus
      if (!hasLoadedOnce.current) {
        setLoading(true);
      }
      const data = await getEntries();
      setEntries(data);
      hasLoadedOnce.current = true;
    } catch (error) {
      console.error('[useJournal] refreshEntries error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshEntries();
  }, [refreshEntries]);

  const saveNewEntry = useCallback(
    async (params: SaveNewEntryParams): Promise<JournalEntry> => {
      const { audioPath, duration, moodTag = '', note = '' } = params;
      const now = new Date();

      // Transcribe audio (skip if no audio file, e.g. Expo Go shim)
      let transcript = '';
      if (audioPath) {
        try {
          transcript = await transcribeAudio(audioPath);
        } catch (error) {
          console.error('[useJournal] transcription error:', error);
        }
      }

      // Generate AI summary (stub for now)
      let aiSummary = '';
      if (transcript) {
        try {
          aiSummary = await generateSummary(transcript);
        } catch (error) {
          console.error('[useJournal] AI summary error:', error);
        }
      }

      const entry: JournalEntry = {
        id: Crypto.randomUUID(),
        createdAt: now.toISOString(),
        duration,
        audioPath,
        transcript,
        moodTag,
        note,
        aiSummary,
        weekNumber: getWeekNumber(now),
      };

      await saveEntry(entry);
      await updateStreak();

      // Refresh the local list
      setEntries((prev) => [entry, ...prev]);

      return entry;
    },
    []
  );

  const deleteEntry = useCallback(async (id: string) => {
    // Remove from UI immediately
    setEntries((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      // Persist the filtered list directly so it survives tab switches
      AsyncStorage.setItem('lym_entries', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    // Also run the full storage delete (handles audio file cleanup)
    try {
      await deleteStorageEntry(id);
    } catch (error) {
      console.error('[useJournal] deleteEntry error:', error);
    }
  }, []);

  return {
    entries,
    loading,
    saveNewEntry,
    deleteEntry,
    refreshEntries,
  };
}
