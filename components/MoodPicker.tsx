import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

interface MoodPickerProps {
  selected: string;
  onSelect: (emoji: string) => void;
}

const MOODS = ['\ud83d\ude14', '\ud83d\ude30', '\ud83d\ude10', '\ud83d\ude42', '\u2728'];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function MoodButton({
  emoji,
  isSelected,
  onPress,
}: {
  emoji: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1.0,
        damping: 8,
        stiffness: 200,
        mass: 1,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[
        styles.moodButton,
        isSelected ? styles.moodButtonSelected : styles.moodButtonUnselected,
        { transform: [{ scale }] },
      ]}
    >
      <Text style={styles.moodEmoji}>{emoji}</Text>
    </AnimatedPressable>
  );
}

export default function MoodPicker({ selected, onSelect }: MoodPickerProps) {
  return (
    <View style={styles.container}>
      {MOODS.map((emoji) => (
        <MoodButton
          key={emoji}
          emoji={emoji}
          isSelected={selected === emoji}
          onPress={() => onSelect(emoji)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  moodButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodButtonSelected: {
    backgroundColor: Colors.primary,
  },
  moodButtonUnselected: {
    backgroundColor: Colors.primaryLightest,
  },
  moodEmoji: {
    fontSize: 24,
  },
});
