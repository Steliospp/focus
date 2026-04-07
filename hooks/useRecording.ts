import { useState, useRef, useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { ensureAudioDirectory, getAudioDirectory } from '@/services/storage';

interface RecordingResult {
  uri: string;
  duration: number;
}

export function useRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [meterLevel, setMeterLevel] = useState(0);

  const recordingRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const hit30sRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const { Audio } = await import('expo-av');

      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Microphone permission not granted');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      await ensureAudioDirectory();

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: 2,
          audioEncoder: 3,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: 'aac',
          audioQuality: 127,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      } as any);

      recording.setOnRecordingStatusUpdate((status: any) => {
        if (status.isRecording && status.metering != null) {
          const db = status.metering;
          const normalised = Math.max(0, Math.min(1, (db + 60) / 60));
          setMeterLevel(normalised);
        }
      });

      recording.setProgressUpdateInterval(50);
      await recording.startAsync();
      recordingRef.current = recording;
      hit30sRef.current = false;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      startTimeRef.current = Date.now();
      setDuration(0);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);

        if (elapsed >= 30 && !hit30sRef.current) {
          hit30sRef.current = true;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }, 1000);
    } catch (error) {
      console.error('[useRecording] startRecording error:', error);
      throw error;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<RecordingResult> => {
    try {
      const { Audio } = await import('expo-av');
      const FileSystem = await import('expo-file-system/legacy');

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const recording = recordingRef.current;
      if (!recording) {
        throw new Error('No active recording');
      }

      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);

      let destPath = '';
      if (uri) {
        const audioDir = getAudioDirectory();
        const fileName = `log_${Date.now()}.m4a`;
        destPath = audioDir + fileName;
        await FileSystem.moveAsync({ from: uri, to: destPath });
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      recordingRef.current = null;
      setIsRecording(false);
      setDuration(0);
      setMeterLevel(0);

      return { uri: destPath, duration: finalDuration };
    } catch (error) {
      console.error('[useRecording] stopRecording error:', error);
      setIsRecording(false);
      setDuration(0);
      setMeterLevel(0);
      recordingRef.current = null;
      throw error;
    }
  }, []);

  return {
    isRecording,
    duration,
    meterLevel,
    startRecording,
    stopRecording,
  };
}
