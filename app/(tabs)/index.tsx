import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// FileSystem is lazy-loaded to avoid native module issues
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { getDailyPrompt } from '@/constants/prompts';
import { useRecording } from '@/hooks/useRecording';
import { useStreak } from '@/hooks/useStreak';
import { useJournal } from '@/hooks/useJournal';
import { usePermissions } from '@/hooks/usePermissions';
import RecordButton from '@/components/RecordButton';
import BottomSheet from '@/components/BottomSheet';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(date: Date): string {
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { isRecording, duration, meterLevel, startRecording, stopRecording } = useRecording();
  const { streak, hasLoggedToday, refreshStreak } = useStreak();
  const { saveNewEntry } = useJournal();
  const { hasMicPermission, requestMicPermission } = usePermissions();

  const [showSheet, setShowSheet] = useState(false);
  const [lastRecordingUri, setLastRecordingUri] = useState('');
  const [lastRecordingDuration, setLastRecordingDuration] = useState(0);

  const audioLevelsRef = useRef<number[]>([]);
  const meterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Collect meter levels while recording
  useEffect(() => {
    if (isRecording) {
      audioLevelsRef.current = [];
      meterIntervalRef.current = setInterval(() => {
        audioLevelsRef.current.push(meterLevel);
      }, 100);
    } else {
      if (meterIntervalRef.current) {
        clearInterval(meterIntervalRef.current);
        meterIntervalRef.current = null;
      }
    }
    return () => {
      if (meterIntervalRef.current) {
        clearInterval(meterIntervalRef.current);
      }
    };
  }, [isRecording, meterLevel]);

  const MIN_FIRST_LOG_SECONDS = 30;

  const handleRecordPress = useCallback(async () => {
    if (isRecording) {
      // Enforce 30s minimum for first daily log
      if (!hasLoggedToday && duration < MIN_FIRST_LOG_SECONDS) {
        Alert.alert(
          'Keep going!',
          `Your first log of the day needs at least 30 seconds for self-reflection. ${MIN_FIRST_LOG_SECONDS - duration}s to go.`,
        );
        return;
      }
      try {
        const result = await stopRecording();
        setLastRecordingUri(result.uri);
        setLastRecordingDuration(result.duration);
        setShowSheet(true);
      } catch (error) {
        console.error('Error stopping recording:', error);
        Alert.alert('Error', 'Failed to stop recording. Please try again.');
      }
    } else {
      // Check permission first
      if (hasMicPermission === false) {
        const granted = await requestMicPermission();
        if (!granted) {
          Alert.alert(
            'Microphone Access',
            'Log Your Mind needs microphone access to record your journal entries. Please enable it in Settings.',
          );
          return;
        }
      }
      try {
        await startRecording();
      } catch (error) {
        console.error('Error starting recording:', error);
        Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
      }
    }
  }, [isRecording, duration, hasLoggedToday, hasMicPermission, startRecording, stopRecording, requestMicPermission]);

  const handleSave = useCallback(
    async (moodTag: string, note: string) => {
      setShowSheet(false);
      try {
        const newEntry = await saveNewEntry({
          audioPath: lastRecordingUri,
          duration: lastRecordingDuration,
          moodTag,
          note,
        });
        await refreshStreak();
        // Navigate to journal tab with the new entry expanded
        router.navigate({
          pathname: '/(tabs)/journal',
          params: { expandEntryId: newEntry.id },
        });
      } catch (error) {
        console.error('Error saving entry:', error);
        Alert.alert('Error', 'Failed to save your log. Please try again.');
      }
    },
    [lastRecordingUri, lastRecordingDuration, saveNewEntry, refreshStreak, router],
  );

  const handleDiscard = useCallback(async () => {
    setShowSheet(false);
    if (lastRecordingUri) {
      try {
        const FileSystem = await import('expo-file-system/legacy');
        const info = await FileSystem.getInfoAsync(lastRecordingUri);
        if (info.exists) {
          await FileSystem.deleteAsync(lastRecordingUri, { idempotent: true });
        }
      } catch (error) {
        console.error('Error deleting audio file:', error);
      }
    }
    setLastRecordingUri('');
    setLastRecordingDuration(0);
  }, [lastRecordingUri]);

  const today = new Date();
  const prompt = getDailyPrompt();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Top: Date + Prompt */}
        <View style={styles.header}>
          <Text style={styles.dateText}>{formatDate(today)}</Text>
          <Text style={styles.promptText}>{prompt}</Text>
          {!hasLoggedToday && (
            <Text style={styles.hintText}>
              30 seconds of self-reflection to start your day
            </Text>
          )}
        </View>

        {/* Center: Record Button */}
        <View style={styles.centerArea}>
          <RecordButton
            isRecording={isRecording}
            duration={duration}
            meterLevel={meterLevel}
            onPress={handleRecordPress}
          />
        </View>

        {/* Bottom: Streak + nudge status */}
        <View style={styles.footer}>
          {streak.currentStreak > 0 ? (
            <Text style={styles.streakText}>
              {'\uD83D\uDD25'} {streak.currentStreak} day streak
            </Text>
          ) : (
            <Text style={styles.streakText}>Start your streak today</Text>
          )}
          {hasLoggedToday ? (
            <Text style={[styles.nudgeText, { color: Colors.success }]}>✓ today's log saved</Text>
          ) : (
            <Text style={[styles.nudgeText, { color: Colors.primary }]}>1 log remaining today</Text>
          )}
        </View>
      </View>

      {/* Bottom Sheet */}
      <BottomSheet
        visible={showSheet}
        onSave={handleSave}
        onDiscard={handleDiscard}
        audioLevels={audioLevelsRef.current}
        duration={lastRecordingDuration}
        audioUri={lastRecordingUri}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 90,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  dateText: {
    fontFamily: Fonts.sansRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  promptText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 28,
    color: Colors.textPrimary,
    lineHeight: 38,
  },
  hintText: {
    fontFamily: Fonts.sansRegular,
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  centerArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  streakText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  nudgeText: {
    fontFamily: Fonts.sansRegular,
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
