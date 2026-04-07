import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Colors, Radii, Shadows, Spacing } from '@/constants/theme';

const SHIMMER_DURATION = 1200;

function ShimmerBar({ width, height = 12 }: { width: number | string; height?: number }) {
  const shimmerOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerOpacity, {
          toValue: 1,
          duration: SHIMMER_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerOpacity, {
          toValue: 0.3,
          duration: SHIMMER_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          width: width as number,
          height,
          opacity: shimmerOpacity,
        },
      ]}
    />
  );
}

export default function ShimmerCard() {
  return (
    <View style={styles.card}>
      {/* Title bar */}
      <ShimmerBar width={180} height={14} />
      {/* Body bar */}
      <ShimmerBar width={260} height={12} />
      {/* Short bar */}
      <ShimmerBar width={120} height={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  bar: {
    backgroundColor: Colors.primaryLightest,
    borderRadius: Radii.sm,
  },
});
