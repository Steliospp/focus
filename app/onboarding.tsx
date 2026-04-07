import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';
import { setOnboarded } from '@/services/storage';
import { usePermissions } from '@/hooks/usePermissions';
import { NotificationService } from '@/services/notifications';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Pulsing circles animation for screen 1
function PulsingCircles() {
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const scale3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const createPulse = (animValue: Animated.Value, toValue: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 1.0,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );

    createPulse(scale1, 1.3).start();

    const timer2 = setTimeout(() => {
      createPulse(scale2, 1.25).start();
    }, 200);

    const timer3 = setTimeout(() => {
      createPulse(scale3, 1.2).start();
    }, 400);

    return () => {
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <View style={styles.pulseContainer}>
      <Animated.View style={[styles.pulseCircle, styles.pulseOuter, { transform: [{ scale: scale1 }] }]} />
      <Animated.View style={[styles.pulseCircle, styles.pulseMiddle, { transform: [{ scale: scale2 }] }]} />
      <Animated.View style={[styles.pulseCircle, styles.pulseInner, { transform: [{ scale: scale3 }] }]}>
        <Ionicons name="mic" size={32} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const { requestMicPermission } = usePermissions();

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentPage(page);
  };

  const goToPage = (page: number) => {
    scrollRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: true });
  };

  const completeOnboarding = async () => {
    await setOnboarded();
    router.replace('/(tabs)');
  };

  const handleMicPermission = async () => {
    await requestMicPermission();
    goToPage(3);
  };

  const handleNotificationPermission = async () => {
    await NotificationService.requestPermissions();
    await completeOnboarding();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Screen 1 */}
        <View style={styles.page}>
          <View style={styles.pageContent}>
            <PulsingCircles />
            <Text style={styles.heading}>Say it out loud.</Text>
            <Text style={styles.body}>
              Sometimes the best way to understand what you're feeling is to
              hear yourself say it. Log Your Mind is your private voice journal
              -- just press, speak, and let go.
            </Text>
          </View>
          <View style={styles.pageFooter}>
            <Pressable style={styles.primaryButton} onPress={() => goToPage(1)}>
              <Text style={styles.primaryButtonText}>Get started</Text>
            </Pressable>
          </View>
        </View>

        {/* Screen 2 */}
        <View style={styles.page}>
          <View style={styles.pageContent}>
            <View style={styles.lockIconContainer}>
              <Ionicons name="lock-closed" size={64} color={Colors.primary} />
            </View>
            <Text style={styles.heading}>Your thoughts, encrypted.</Text>
            <Text style={styles.body}>
              Everything stays on your device. Your recordings, your transcripts,
              your moods -- it's all yours. We never see it, never upload it, and
              never sell it.
            </Text>
          </View>
          <View style={styles.pageFooter}>
            <Pressable style={styles.primaryButton} onPress={() => goToPage(2)}>
              <Text style={styles.primaryButtonText}>Sounds good</Text>
            </Pressable>
          </View>
        </View>

        {/* Screen 3 — Microphone */}
        <View style={styles.page}>
          <View style={styles.pageContent}>
            <View style={styles.micIconContainer}>
              <Ionicons name="mic-outline" size={64} color={Colors.primary} />
            </View>
            <Text style={styles.heading}>One last thing.</Text>
            <Text style={styles.body}>
              To record your journal entries, we need access to your microphone.
              You can change this anytime in your device settings.
            </Text>
          </View>
          <View style={styles.pageFooter}>
            <Pressable style={styles.primaryButton} onPress={handleMicPermission}>
              <Text style={styles.primaryButtonText}>Allow microphone</Text>
            </Pressable>
            <Pressable style={styles.skipButton} onPress={() => goToPage(3)}>
              <Text style={styles.skipButtonText}>maybe later</Text>
            </Pressable>
          </View>
        </View>

        {/* Screen 4 — Notifications */}
        <View style={styles.page}>
          <View style={styles.pageContent}>
            <View style={styles.micIconContainer}>
              <Ionicons name="notifications-outline" size={64} color={Colors.primary} />
            </View>
            <Text style={styles.heading}>Stay on track.</Text>
            <Text style={styles.body}>
              A gentle daily nudge to help you build your journaling habit.
              We'll never spam you — just one quiet reminder a day.
            </Text>
          </View>
          <View style={styles.pageFooter}>
            <Pressable style={styles.primaryButton} onPress={handleNotificationPermission}>
              <Text style={styles.primaryButtonText}>Enable notifications</Text>
            </Pressable>
            <Pressable style={styles.skipButton} onPress={completeOnboarding}>
              <Text style={styles.skipButtonText}>maybe later</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Page indicator dots */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              currentPage === i ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'space-between',
  },
  pageContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  pageFooter: {
    alignItems: 'center',
    paddingBottom: Spacing.xxl + 40,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  heading: {
    fontFamily: Fonts.serifItalic,
    fontSize: 34,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    fontFamily: Fonts.sansRegular,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 17,
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: Spacing.sm,
  },
  skipButtonText: {
    fontFamily: Fonts.sansRegular,
    fontSize: 15,
    color: Colors.textMuted,
  },
  // Pulsing circles
  pulseContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  pulseCircle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  pulseOuter: {
    width: 160,
    height: 160,
    backgroundColor: Colors.primaryLightest,
  },
  pulseMiddle: {
    width: 120,
    height: 120,
    backgroundColor: Colors.primaryLight,
  },
  pulseInner: {
    width: 80,
    height: 80,
    backgroundColor: Colors.primary,
  },
  // Lock icon
  lockIconContainer: {
    marginBottom: Spacing.md,
  },
  // Mic icon
  micIconContainer: {
    marginBottom: Spacing.md,
  },
  // Dots
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  dotInactive: {
    backgroundColor: Colors.textMuted,
  },
});
