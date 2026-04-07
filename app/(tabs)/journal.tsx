import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Dimensions,
  Animated,
  Easing,
  Alert,
  ScrollView,
  Modal,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radii, Shadows } from '@/constants/theme';
import { useJournal } from '@/hooks/useJournal';
import { JournalEntry } from '@/services/storage';
import JournalCard from '@/components/JournalCard';
import ShimmerCard from '@/components/ShimmerCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MOOD_COLORS: Record<string, string> = {
  '\uD83D\uDE14': '#7B9EBF',
  '\uD83D\uDE30': '#C9A84C',
  '\uD83D\uDE10': '#AAAAAA',
  '\uD83D\uDE42': '#8CC084',
  '\u2728': Colors.primary,
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Pulsing record button for the empty state
function PulsingMiniButton() {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View style={[styles.miniButton, { transform: [{ scale }] }]}>
      <Ionicons name="mic" size={28} color="#FFFFFF" />
    </Animated.View>
  );
}

// Expanded card with transcript + playback
function ExpandedContent({ entry }: { entry: JournalEntry }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [copied, setCopied] = useState(false);
  const soundRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const togglePlayback = async () => {
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
        { uri: entry.audioPath },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setPlaybackPosition(
              status.positionMillis / (status.durationMillis || 1),
            );
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPlaybackPosition(0);
              soundRef.current?.setPositionAsync(0);
            }
          }
        },
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const textContent = [entry.note, entry.transcript].filter(Boolean).join('\n\n');

  const handleCopy = async () => {
    if (textContent) {
      try {
        const { setStringAsync } = require('expo-clipboard');
        await setStringAsync(textContent);
      } catch {
        // no-op if clipboard unavailable
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <View style={styles.expandedContent}>
      {/* Playback bar — only show if audio file exists */}
      {entry.audioPath ? (
        <View style={styles.playbackRow}>
          <Pressable onPress={togglePlayback} style={styles.playButton}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={16}
              color="#FFFFFF"
            />
          </Pressable>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.round(playbackPosition * 100)}%` },
                ]}
              />
            </View>
          </View>
          <Text style={styles.playbackDuration}>
            {formatDuration(entry.duration)}
          </Text>
        </View>
      ) : null}

      {/* Note */}
      {entry.note ? (
        <Text style={styles.transcriptText}>{entry.note}</Text>
      ) : null}

      {/* Transcript */}
      {entry.transcript ? (
        <>
          <Text style={styles.transcriptLabel}>Transcript</Text>
          <Text style={styles.transcriptText}>{entry.transcript}</Text>
        </>
      ) : !entry.note ? (
        <Text style={styles.noTranscript}>Transcript will appear here with a dev build.</Text>
      ) : null}

      {/* Copy button */}
      {textContent ? (
        <Pressable onPress={handleCopy} style={styles.copyButton} disabled={copied}>
          <Ionicons
            name={copied ? 'checkmark-circle' : 'copy-outline'}
            size={14}
            color={copied ? Colors.success : Colors.primary}
          />
          <Text style={[styles.copyText, copied && { color: Colors.success }]}>
            {copied ? 'Copied' : 'Copy to clipboard'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Generate array of 7 dates with today in the middle
function getDayStrip(): Date[] {
  const today = new Date();
  const days: Date[] = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Swipeable row: swipe left to progressively reveal a red delete strip
function SwipeableRow({
  children,
  onDelete,
  isOpen,
  onSwipeOpen,
  onSwipeClose,
  onSwipeStart,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  isOpen: boolean;
  onSwipeOpen: () => void;
  onSwipeClose: () => void;
  onSwipeStart?: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const offsetRef = useRef(0);
  const DELETE_WIDTH = 80;

  // Keep callbacks in refs so PanResponder always calls the latest
  const onDeleteRef = useRef(onDelete);
  const onSwipeOpenRef = useRef(onSwipeOpen);
  const onSwipeCloseRef = useRef(onSwipeClose);
  const onSwipeStartRef = useRef(onSwipeStart);
  useEffect(() => { onDeleteRef.current = onDelete; }, [onDelete]);
  useEffect(() => { onSwipeOpenRef.current = onSwipeOpen; }, [onSwipeOpen]);
  useEffect(() => { onSwipeCloseRef.current = onSwipeClose; }, [onSwipeClose]);
  useEffect(() => { onSwipeStartRef.current = onSwipeStart; }, [onSwipeStart]);
  const setHasInteractedRef = useRef(() => {});

  useEffect(() => {
    const id = translateX.addListener(({ value }) => {
      offsetRef.current = value;
    });
    return () => translateX.removeListener(id);
  }, []);

  // Close this row when another row opens
  useEffect(() => {
    if (!isOpen && offsetRef.current !== 0) {
      Animated.timing(translateX, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [isOpen]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy * 1.5),
      onPanResponderGrant: () => {
        onSwipeStartRef.current?.();
        setHasInteractedRef.current();
        translateX.setOffset(offsetRef.current);
        translateX.setValue(0);
      },
      onPanResponderMove: Animated.event(
        [null, { dx: translateX }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: () => {
        translateX.flattenOffset();
        const finalValue = offsetRef.current;
        if (finalValue < -DELETE_WIDTH / 2) {
          onSwipeOpenRef.current();
          Animated.timing(translateX, {
            toValue: -DELETE_WIDTH,
            duration: 200,
            useNativeDriver: false,
          }).start();
        } else {
          onSwipeCloseRef.current();
          Animated.timing(translateX, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }).start();
        }
      },
    }),
  ).current;

  // Clamp card translation
  const clampedTranslate = translateX.interpolate({
    inputRange: [-DELETE_WIDTH, 0],
    outputRange: [-DELETE_WIDTH, 0],
    extrapolate: 'clamp',
  });

  // Delete button progressively slides in and fades in as you drag
  const deleteTranslateX = translateX.interpolate({
    inputRange: [-DELETE_WIDTH, 0],
    outputRange: [0, DELETE_WIDTH],
    extrapolate: 'clamp',
  });

  const deleteOpacity = translateX.interpolate({
    inputRange: [-DELETE_WIDTH, -10, 0],
    outputRange: [1, 0.3, 0],
    extrapolate: 'clamp',
  });

  const handleDelete = () => {
    Alert.alert(
      'Delete log?',
      'Are you sure? This will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            onSwipeCloseRef.current();
            Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: false }).start();
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete();
          },
        },
      ],
    );
  };

  // Track if user has ever swiped this row (prevents flash on initial load)
  const [hasInteracted, setHasInteracted] = useState(false);
  setHasInteractedRef.current = () => setHasInteracted(true);

  return (
    <View style={{ marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: Radii.md, backgroundColor: Colors.background }}>
      {/* Delete button — progressive reveal, hidden until first interaction */}
      {hasInteracted && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: DELETE_WIDTH,
            backgroundColor: Colors.danger,
            borderRadius: Radii.md,
            justifyContent: 'center',
            alignItems: 'center',
            transform: [{ translateX: deleteTranslateX }],
            opacity: deleteOpacity,
          }}
        >
          <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
        </Animated.View>
      )}

      {/* Tap target for delete — only when fully open */}
      {isOpen && (
        <TouchableOpacity
          activeOpacity={0.5}
          onPress={handleDelete}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: DELETE_WIDTH,
            borderRadius: Radii.md,
          }}
        />
      )}

      {/* Card content that slides left */}
      <Animated.View
        style={{ transform: [{ translateX: clampedTranslate }] }}
        {...(isOpen ? {} : panResponder.panHandlers)}
      >
        {isOpen ? (
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              onSwipeCloseRef.current();
              Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: false }).start();
            }}
          >
            {children}
          </TouchableOpacity>
        ) : (
          children
        )}
      </Animated.View>
    </View>
  );
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Simple calendar picker modal
function CalendarPicker({
  visible,
  selectedDate,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}) {
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());

  useEffect(() => {
    if (visible) {
      setViewMonth(selectedDate.getMonth());
      setViewYear(selectedDate.getFullYear());
    }
  }, [visible, selectedDate]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const today = new Date();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.calendarOverlay} onPress={onClose}>
        <View style={styles.calendarContainer} onStartShouldSetResponder={() => true}>
          {/* Month nav */}
          <View style={styles.calendarNav}>
            <Pressable onPress={prevMonth} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
            </Pressable>
            <Text style={styles.calendarMonthLabel}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <Pressable onPress={nextMonth} hitSlop={12}>
              <Ionicons name="chevron-forward" size={22} color={Colors.textPrimary} />
            </Pressable>
          </View>

          {/* Day-of-week headers */}
          <View style={styles.calendarWeekRow}>
            {DAY_NAMES.map((d) => (
              <Text key={d} style={styles.calendarWeekDay}>{d}</Text>
            ))}
          </View>

          {/* Day grid */}
          <View style={styles.calendarGrid}>
            {cells.map((day, i) => {
              if (day === null) {
                return <View key={`empty-${i}`} style={styles.calendarCell} />;
              }
              const cellDate = new Date(viewYear, viewMonth, day);
              const isSelected = isSameDay(cellDate, selectedDate);
              const isToday = isSameDay(cellDate, today);
              const isFuture = cellDate > today;

              return (
                <Pressable
                  key={day}
                  style={[
                    styles.calendarCell,
                    isSelected && styles.calendarCellSelected,
                  ]}
                  onPress={() => {
                    if (!isFuture) {
                      onSelect(cellDate);
                      onClose();
                    }
                  }}
                  disabled={isFuture}
                >
                  <Text
                    style={[
                      styles.calendarCellText,
                      isSelected && styles.calendarCellTextSelected,
                      isToday && !isSelected && styles.calendarCellTextToday,
                      isFuture && { opacity: 0.3 },
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

export default function JournalScreen() {
  const { entries, loading, refreshEntries, deleteEntry } = useJournal();
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [swipedOpenId, setSwipedOpenId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Refresh entries and reset swipe state every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      setSwipedOpenId(null);
      refreshEntries();
    }, [refreshEntries]),
  );

  const handleCardPress = useCallback((id: string) => {
    if (swipedOpenId) {
      setSwipedOpenId(null);
      return;
    }
    setExpandedId((prev) => (prev === id ? null : id));
  }, [swipedOpenId]);

  // Day strip: last 7 days ending at today
  const dayStrip = useMemo(() => getDayStrip(), []);
  const today = useMemo(() => new Date(), []);

  // Filter entries by selected date
  const filteredEntries = useMemo(() => {
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    return entries.filter((e) => {
      const entryDate = e.createdAt ? e.createdAt.split('T')[0] : '';
      return entryDate === dateStr;
    });
  }, [entries, selectedDate]);

  const renderItem = useCallback(
    ({ item, index }: { item: JournalEntry; index: number }) => (
      <SwipeableRow
        onDelete={() => deleteEntry(item.id)}
        isOpen={swipedOpenId === item.id}
        onSwipeOpen={() => setSwipedOpenId(item.id)}
        onSwipeClose={() => setSwipedOpenId(null)}
        onSwipeStart={() => setExpandedId(null)}
      >
        <View>
          <JournalCard
            entry={item}
            index={index}
            expanded={expandedId === item.id}
            onPress={() => handleCardPress(item.id)}
          />
          {expandedId === item.id && <ExpandedContent entry={item} />}
        </View>
      </SwipeableRow>
    ),
    [expandedId, handleCardPress, deleteEntry, swipedOpenId],
  );

  const keyExtractor = useCallback((item: JournalEntry) => item.id, []);

  // Empty state
  if (!loading && entries.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <PulsingMiniButton />
          <Text style={styles.emptyTitle}>Your first log is waiting.</Text>
          <Pressable
            style={styles.ctaButton}
            onPress={() => router.navigate('/(tabs)')}
          >
            <Text style={styles.ctaButtonText}>Record now</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Your Logs</Text>
          <Pressable
            onPress={() => { setSwipedOpenId(null); setCalendarOpen(true); }}
            hitSlop={12}
            style={styles.calendarButton}
          >
            <Ionicons name="calendar-outline" size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {/* Day strip */}
        <View style={styles.dayStripRow}>
          {dayStrip.map((date, i) => {
            const isActive = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, today);
            return (
              <Pressable
                key={i}
                onPress={() => setSelectedDate(new Date(date))}
                style={[
                  styles.dayCircle,
                  isActive && styles.dayCircleActive,
                ]}
              >
                <Text
                  style={[
                    styles.dayCircleText,
                    isActive && styles.dayCircleTextActive,
                    !isActive && isToday && styles.dayCircleTextToday,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Calendar picker modal */}
      <CalendarPicker
        visible={calendarOpen}
        selectedDate={selectedDate}
        onSelect={(d) => setSelectedDate(d)}
        onClose={() => setCalendarOpen(false)}
      />

      {/* List */}
      {loading ? (
        <View style={styles.shimmerList}>
          <ShimmerCard />
          <ShimmerCard />
          <ShimmerCard />
        </View>
      ) : filteredEntries.length === 0 ? (
        <View style={styles.noEntriesContainer}>
          <Text style={styles.noEntriesText}>No logs for this day</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEntries}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refreshEntries}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.serifItalic,
    fontSize: 32,
    color: Colors.textPrimary,
  },
  calendarButton: {
    padding: Spacing.xs,
  },
  dayStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: Colors.primary,
  },
  dayCircleText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  dayCircleTextActive: {
    color: '#FFFFFF',
  },
  dayCircleTextToday: {
    color: Colors.primary,
  },
  // Calendar modal
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
    paddingTop: 120,
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    width: SCREEN_WIDTH - 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  calendarMonthLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  calendarWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.sansRegular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: `${100 / 7}%` as any,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  calendarCellSelected: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    width: 40,
  },
  calendarCellText: {
    fontFamily: Fonts.sansRegular,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  calendarCellTextSelected: {
    color: '#FFFFFF',
    fontFamily: Fonts.sansMedium,
  },
  calendarCellTextToday: {
    color: Colors.primary,
    fontFamily: Fonts.sansMedium,
  },
  noEntriesContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  noEntriesText: {
    fontFamily: Fonts.sansRegular,
    fontSize: 15,
    color: Colors.textMuted,
  },
  listContent: {
    paddingBottom: 100,
    paddingTop: Spacing.sm,
  },
  shimmerList: {
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  // Expanded content
  expandedContent: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: Radii.md,
    borderBottomRightRadius: Radii.md,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: Spacing.md,
    paddingTop: Spacing.sm,
    marginTop: -Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: Colors.primaryLightest,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  playbackDuration: {
    fontFamily: Fonts.sansRegular,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  transcriptText: {
    fontFamily: Fonts.sansRegular,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  transcriptLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noTranscript: {
    fontFamily: Fonts.sansLight,
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  copyText: {
    fontFamily: Fonts.sansRegular,
    fontSize: 13,
    color: Colors.primary,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
    gap: Spacing.lg,
  },
  miniButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: Fonts.serifItalic,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  ctaButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  ctaButtonText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
