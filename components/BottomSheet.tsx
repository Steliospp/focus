import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';
import AudioWaveform from './AudioWaveform';
import MoodPicker from './MoodPicker';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 480;

interface BottomSheetProps {
  visible: boolean;
  onSave: (moodTag: string, note: string) => void;
  onDiscard: () => void;
  audioLevels: number[];
  duration: number;
  audioUri: string;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function BottomSheet({
  visible,
  onSave,
  onDiscard,
  audioLevels,
  duration,
  audioUri,
}: BottomSheetProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [moodTag, setMoodTag] = useState('');
  const [note, setNote] = useState('');
  const [showTitleError, setShowTitleError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const soundRef = useRef<any>(null);

  // Clean up sound on unmount or hide
  useEffect(() => {
    if (!visible && soundRef.current) {
      soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 20,
          stiffness: 150,
          mass: 1,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: SCREEN_HEIGHT,
          damping: 20,
          stiffness: 150,
          mass: 1,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      // Reset state
      setMoodTag('');
      setNote('');
      setShowTitleError(false);
      setIsPlaying(false);
      setPlaybackProgress(0);
    }
  }, [visible]);

  const handleSave = () => {
    if (!note.trim()) {
      setShowTitleError(true);
      return;
    }
    onSave(moodTag, note);
  };

  const togglePlayback = async () => {
    if (!audioUri) return;

    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        return;
      }

      if (soundRef.current) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        return;
      }

      const { Audio } = await import('expo-av');
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
        (status: any) => {
          if (status.isLoaded) {
            setPlaybackProgress(
              status.positionMillis / (status.durationMillis || 1),
            );
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPlaybackProgress(0);
              soundRef.current?.setPositionAsync(0);
            }
          }
        },
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch (error) {
      console.warn('[BottomSheet] Playback not available:', error);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDiscard} />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY }] }]}
      >
        {/* Drag handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Waveform + playback */}
        <View style={styles.waveformSection}>
          <AudioWaveform
            levels={audioLevels}
            isPlaying={isPlaying}
            progress={playbackProgress}
          />
          <View style={styles.playbackRow}>
            <Pressable
              onPress={togglePlayback}
              style={[styles.playButton, !audioUri && styles.playButtonDisabled]}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={20}
                color={Colors.surface}
              />
            </Pressable>
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
            {!audioUri && (
              <Text style={styles.noAudioHint}>dev build needed for playback</Text>
            )}
          </View>
        </View>

        {/* Mood picker */}
        <View style={styles.section}>
          <MoodPicker selected={moodTag} onSelect={setMoodTag} />
        </View>

        {/* Note input */}
        <View style={styles.section}>
          <TextInput
            style={[styles.noteInput, showTitleError && styles.noteInputError]}
            placeholder="Add a title..."
            placeholderTextColor={showTitleError ? '#FF3B30' : Colors.textMuted}
            value={note}
            onChangeText={(text) => {
              setNote(text);
              if (showTitleError && text.trim()) setShowTitleError(false);
            }}
            maxLength={200}
          />
        </View>

        {/* Save button */}
        <Pressable onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save Log</Text>
        </Pressable>

        {/* Discard */}
        <Pressable onPress={onDiscard} style={styles.discardButton}>
          <Text style={styles.discardText}>Discard</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
  },
  waveformSection: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationText: {
    fontFamily: Fonts.sansRegular,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  playButtonDisabled: {
    opacity: 0.4,
  },
  noAudioHint: {
    fontFamily: Fonts.sansRegular,
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  section: {
    marginTop: Spacing.lg,
  },
  noteInput: {
    fontFamily: Fonts.sansRegular,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.surface,
  },
  noteInputError: {
    borderColor: '#FF3B30',
    borderWidth: 1.5,
  },
  saveButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radii.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  saveButtonText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 17,
    color: '#FFFFFF',
  },
  discardButton: {
    marginTop: Spacing.sm,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  discardText: {
    fontFamily: Fonts.sansRegular,
    fontSize: 14,
    color: Colors.textMuted,
  },
});
