import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

interface AudioWaveformProps {
  levels: number[];
  isPlaying: boolean;
  progress: number;
}

const BAR_COUNT = 30;
const BAR_WIDTH = 3;
const BAR_GAP = 2;
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 40;

export default function AudioWaveform({
  levels,
  isPlaying,
  progress,
}: AudioWaveformProps) {
  // Normalize levels array to BAR_COUNT bars
  const bars: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    const index = Math.floor((i / BAR_COUNT) * levels.length);
    bars.push(levels[index] ?? 0);
  }

  const progressIndex = Math.floor(progress * BAR_COUNT);

  return (
    <View style={styles.container}>
      {bars.map((level, i) => {
        const height = MIN_HEIGHT + level * (MAX_HEIGHT - MIN_HEIGHT);
        const isPast = i <= progressIndex && isPlaying;
        return (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height,
                backgroundColor: isPast
                  ? Colors.primary
                  : Colors.primaryLightest,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: MAX_HEIGHT,
    gap: BAR_GAP,
    paddingHorizontal: Spacing.sm,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: 2,
  },
});
