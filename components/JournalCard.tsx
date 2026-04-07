import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';

interface JournalCardProps {
  entry: {
    id: string;
    createdAt: string;
    duration: number;
    moodTag: string;
    note: string;
    aiSummary: string;
    transcript: string;
    audioPath: string;
  };
  index: number;
  expanded?: boolean;
  onPress: () => void;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const animatedIds = new Set<string>();

export default function JournalCard({ entry, index, expanded, onPress }: JournalCardProps) {
  const alreadySeen = animatedIds.has(entry.id);
  const opacity = useRef(new Animated.Value(alreadySeen ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(alreadySeen ? 0 : 30)).current;

  useEffect(() => {
    if (alreadySeen) return;
    animatedIds.add(entry.id);
    const delay = index * 50;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const title = entry.note || entry.aiSummary || 'Voice log';

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable onPress={onPress} style={[styles.card, expanded && styles.cardExpanded]}>
        {/* Top row: date + duration pill */}
        <View style={styles.topRow}>
          <Text style={styles.dateText}>{formatDate(entry.createdAt)}</Text>
          <View style={styles.durationPill}>
            <Text style={styles.durationText}>{formatDuration(entry.duration)}</Text>
          </View>
        </View>

        {/* Title + mood */}
        <Text style={styles.titleText} numberOfLines={2}>
          {entry.moodTag ? `${entry.moodTag} ` : ''}{title}
        </Text>

        {/* Hint */}
        <Text style={styles.hintText}>tap to read</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    ...Shadows.card,
  },
  cardExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  dateText: {
    fontFamily: Fonts.sansRegular,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  durationPill: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
  },
  durationText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: '#FFFFFF',
  },
  titleText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: Spacing.xs,
  },
  hintText: {
    fontFamily: Fonts.sansRegular,
    fontSize: 12,
    color: Colors.textMuted,
  },
});
