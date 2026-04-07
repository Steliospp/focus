import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Colors,
  Fonts,
  RecordButton as RecordButtonSizes,
  Spacing,
} from '@/constants/theme';

interface RecordButtonProps {
  isRecording: boolean;
  duration: number;
  meterLevel: number;
  onPress: () => void;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function RecordButton({
  isRecording,
  duration,
  meterLevel,
  onPress,
}: RecordButtonProps) {
  const outerScale = useRef(new Animated.Value(1)).current;
  const middleScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    outerScale.stopAnimation();
    middleScale.stopAnimation();

    if (isRecording) {
      // Pulse when recording
      const outerPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(outerScale, {
            toValue: 1.08,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(outerScale, {
            toValue: 1.0,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );

      const middlePulse = Animated.loop(
        Animated.sequence([
          Animated.timing(middleScale, {
            toValue: 1.05,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(middleScale, {
            toValue: 1.0,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );

      outerPulse.start();
      middlePulse.start();

      return () => {
        outerPulse.stop();
        middlePulse.stop();
      };
    } else {
      // Reset to static when idle
      Animated.timing(outerScale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      Animated.timing(middleScale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isRecording]);

  const progress = Math.min(duration / 30, 1);

  return (
    <View style={styles.container}>
      <Pressable onPress={onPress} style={styles.pressable}>
        <Animated.View
          style={[styles.outerRing, { transform: [{ scale: outerScale }] }]}
        >
          <Animated.View
            style={[styles.middleRing, { transform: [{ scale: middleScale }] }]}
          >
            <View style={styles.centerCircle}>
              {isRecording ? (
                <View style={styles.pillContainer}>
                  {/* Fill background */}
                  <View
                    style={[
                      styles.pillFill,
                      { width: `${Math.round(progress * 100)}%` },
                    ]}
                  />
                  <Text style={styles.pillText}>{formatDuration(duration)}</Text>
                </View>
              ) : (
                <Text style={styles.idleText}>tap to{'\n'}speak</Text>
              )}
            </View>
          </Animated.View>
        </Animated.View>
      </Pressable>
      {isRecording && duration >= 30 && (
        <Text style={styles.hintText}>tap to finish</Text>
      )}
    </View>
  );
}

const PILL_WIDTH = 100;
const PILL_HEIGHT = 36;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
    width: RecordButtonSizes.outerRingSize + 20,
    height: RecordButtonSizes.outerRingSize + 20,
  },
  outerRing: {
    width: RecordButtonSizes.outerRingSize,
    height: RecordButtonSizes.outerRingSize,
    borderRadius: RecordButtonSizes.outerRingSize / 2,
    backgroundColor: Colors.primaryLightest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middleRing: {
    width: RecordButtonSizes.middleRingSize,
    height: RecordButtonSizes.middleRingSize,
    borderRadius: RecordButtonSizes.middleRingSize / 2,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCircle: {
    width: RecordButtonSizes.centerSize,
    height: RecordButtonSizes.centerSize,
    borderRadius: RecordButtonSizes.centerSize / 2,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillContainer: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: PILL_HEIGHT / 2,
  },
  pillText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 16,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  idleText: {
    fontFamily: Fonts.sansRegular,
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  hintText: {
    marginTop: Spacing.md,
    fontFamily: Fonts.sansRegular,
    fontSize: 15,
    color: Colors.textMuted,
  },
});
