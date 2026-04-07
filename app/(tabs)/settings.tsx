import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Alert,
  Animated,
  Platform,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Fonts, Spacing, Radii, Shadows } from '@/constants/theme';
import {
  getSettings,
  saveSettings,
  deleteAllData,
  getStorageUsed,
  SettingsData,
} from '@/services/storage';
import { useStreak } from '@/hooks/useStreak';
import { NotificationService } from '@/services/notifications';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: IoniconsName;
}

function ToggleRow({ label, value, onValueChange, icon }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        {icon && (
          <Ionicons name={icon} size={20} color={Colors.textSecondary} />
        )}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.border, true: Colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

interface TappableRowProps {
  label: string;
  icon?: IoniconsName;
  onPress: () => void;
  rightText?: string;
  danger?: boolean;
}

function TappableRow({ label, icon, onPress, rightText, danger }: TappableRowProps) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={danger ? Colors.danger : Colors.textSecondary}
          />
        )}
        <Text style={[styles.rowLabel, danger && { color: Colors.danger }]}>
          {label}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {rightText && <Text style={styles.rowRightText}>{rightText}</Text>}
        <Ionicons
          name="chevron-forward"
          size={18}
          color={danger ? Colors.danger : Colors.textMuted}
        />
      </View>
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// Toast component
function Toast({ message, visible }: { message: string; visible: boolean }) {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: 100, duration: 300, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toast, { transform: [{ translateY }], opacity }]}>
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, '0')} ${period}`;
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  context: 'Context',
};

export default function SettingsScreen() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [storageUsed, setStorageUsed] = useState('--');
  const [nudgeHour, setNudgeHour] = useState(10);
  const [nudgeMinute, setNudgeMinute] = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const { streak, devSetStreak, devResetStreak } = useStreak();

  useEffect(() => {
    loadSettings();
    loadNudgeTime();
  }, []);

  const loadSettings = async () => {
    const s = await getSettings();
    setSettings(s);
    const used = await getStorageUsed();
    setStorageUsed(used);
  };

  const loadNudgeTime = async () => {
    const time = await NotificationService.getNudgeTime();
    setNudgeHour(time.hour);
    setNudgeMinute(time.minute);
  };

  const showToastMessage = (msg: string) => {
    setToastMessage(msg);
    setShowToast(false);
    // Reset to trigger useEffect
    setTimeout(() => setShowToast(true), 50);
  };

  const updateSetting = useCallback(
    async (key: keyof SettingsData, value: boolean | string) => {
      if (!settings) return;
      const updated = { ...settings, [key]: value };
      setSettings(updated);
      await saveSettings({ [key]: value });
    },
    [settings],
  );

  const handleDailyNudgeToggle = async (enabled: boolean) => {
    await updateSetting('dailyNudge', enabled);
    if (enabled) {
      const granted = await NotificationService.requestPermissions();
      if (!granted) {
        Alert.alert(
          'Notifications Disabled',
          'Enable notifications in Settings to receive your daily nudge.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        await updateSetting('dailyNudge', false);
        return;
      }
      await NotificationService.scheduleDailyNudge(nudgeHour, nudgeMinute);
      showToastMessage(`Nudge set for ${formatTime(nudgeHour, nudgeMinute)}`);
    } else {
      await NotificationService.cancelDailyNudge();
    }
  };

  const handleReminderToggle = async (enabled: boolean) => {
    await updateSetting('reminderIfNoLog', enabled);
    if (enabled) {
      const granted = await NotificationService.requestPermissions();
      if (!granted) {
        Alert.alert(
          'Notifications Disabled',
          'Enable notifications in Settings to receive reminders.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        await updateSetting('reminderIfNoLog', false);
        return;
      }
      await NotificationService.scheduleEveningReminder();
      if (streak.currentStreak >= 3) {
        await NotificationService.scheduleStreakReminder(streak.currentStreak);
      }
    } else {
      await NotificationService.cancelEveningReminder();
      await NotificationService.cancelStreakReminder();
    }
  };

  const handleTimeChange = async (_: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      const hour = selectedDate.getHours();
      const minute = selectedDate.getMinutes();
      setNudgeHour(hour);
      setNudgeMinute(minute);

      if (settings?.dailyNudge) {
        await NotificationService.scheduleDailyNudge(hour, minute);
      }
      await updateSetting('nudgeTime', formatTime(hour, minute));
      showToastMessage(`Nudge set for ${formatTime(hour, minute)}`);
    }
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your journal entries, audio recordings, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            await deleteAllData();
            await loadSettings();
            Alert.alert('Done', 'All data has been deleted.');
          },
        },
      ],
    );
  };

  const handleExportData = () => {
    Alert.alert('Export', 'Data export coming soon.');
  };

  const handleUpgrade = () => {
    Alert.alert('Upgrade', 'In-app purchases coming soon.');
  };

  if (!settings) return null;

  const initials = 'YA';
  const pickerDate = new Date();
  pickerDate.setHours(nudgeHour, nudgeMinute, 0, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileTitle}>Your Account</Text>
        </View>

        {/* Privacy & Security */}
        <SectionHeader title="Privacy & Security" />
        <View style={styles.sectionCard}>
          <ToggleRow
            label="End-to-end encryption"
            value={settings.encryption}
            onValueChange={(v) => updateSetting('encryption', v)}
            icon="shield-checkmark-outline"
          />
          <View style={styles.separator} />
          <ToggleRow
            label="Local-only storage"
            value={settings.localOnly}
            onValueChange={(v) => updateSetting('localOnly', v)}
            icon="phone-portrait-outline"
          />
          <View style={styles.separator} />
          <ToggleRow
            label="Biometric lock"
            value={settings.biometricLock}
            onValueChange={(v) => updateSetting('biometricLock', v)}
            icon="finger-print-outline"
          />
        </View>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <View style={styles.sectionCard}>
          <ToggleRow
            label="Daily nudge"
            value={settings.dailyNudge}
            onValueChange={handleDailyNudgeToggle}
            icon="notifications-outline"
          />
          <View style={styles.separator} />
          <TappableRow
            label="Nudge time"
            icon="time-outline"
            rightText={formatTime(nudgeHour, nudgeMinute)}
            onPress={() => setShowTimePicker(true)}
          />
          <View style={styles.separator} />
          <ToggleRow
            label="Remind if no log"
            value={settings.reminderIfNoLog}
            onValueChange={handleReminderToggle}
            icon="alarm-outline"
          />
        </View>

        {/* Your Data */}
        <SectionHeader title="Your Data" />
        <View style={styles.sectionCard}>
          <TappableRow
            label="Storage used"
            icon="folder-outline"
            rightText={storageUsed}
            onPress={() => {}}
          />
          <View style={styles.separator} />
          <TappableRow
            label="Export data"
            icon="download-outline"
            onPress={handleExportData}
          />
          <View style={styles.separator} />
          <TappableRow
            label="Delete all data"
            icon="trash-outline"
            onPress={handleDeleteAllData}
            danger
          />
        </View>

        {/* Plan */}
        <SectionHeader title="Plan" />
        <View style={styles.sectionCard}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="diamond-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.rowLabel}>Current plan</Text>
            </View>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>
                {PLAN_LABELS[settings.plan] || settings.plan}
              </Text>
            </View>
          </View>
          {settings.plan === 'free' && (
            <>
              <View style={styles.separator} />
              <TappableRow
                label="Upgrade to Pro"
                icon="arrow-up-circle-outline"
                onPress={handleUpgrade}
              />
            </>
          )}
        </View>

        {/* MCP/Context Section */}
        {settings.plan === 'context' && (
          <>
            <SectionHeader title="Context" />
            <View style={styles.sectionCard}>
              <TappableRow
                label="Connected apps"
                icon="link-outline"
                onPress={() => Alert.alert('Context', 'MCP configuration coming soon.')}
              />
              <View style={styles.separator} />
              <TappableRow
                label="Context sources"
                icon="layers-outline"
                onPress={() => Alert.alert('Context', 'Source configuration coming soon.')}
              />
            </View>
          </>
        )}

        {/* Dev Tools */}
        {__DEV__ && (
          <>
            <SectionHeader title="Dev Tools" />
            <View style={styles.sectionCard}>
              <TappableRow
                label="Simulate: logged yesterday"
                icon="calendar-outline"
                onPress={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  const dateStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
                  devSetStreak({
                    currentStreak: 3,
                    lastLogDate: dateStr,
                    loggedDates: [dateStr],
                  });
                  Alert.alert('Dev', `Streak set: 3 days, last log ${dateStr}`);
                }}
              />
              <View style={styles.separator} />
              <TappableRow
                label="Simulate: missed 2 days"
                icon="alert-circle-outline"
                onPress={() => {
                  const twoDaysAgo = new Date();
                  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                  const dateStr = `${twoDaysAgo.getFullYear()}-${String(twoDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twoDaysAgo.getDate()).padStart(2, '0')}`;
                  devSetStreak({
                    currentStreak: 5,
                    lastLogDate: dateStr,
                    loggedDates: [dateStr],
                  });
                  Alert.alert('Dev', `Streak set: 5 days, last log ${dateStr} (2 days ago)`);
                }}
              />
              <View style={styles.separator} />
              <TappableRow
                label="Simulate: streak of 10"
                icon="flame-outline"
                onPress={() => {
                  const today = new Date();
                  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                  const dates: string[] = [];
                  for (let i = 9; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                  }
                  devSetStreak({
                    currentStreak: 10,
                    longestStreak: 10,
                    lastLogDate: todayStr,
                    loggedDates: dates,
                  });
                  Alert.alert('Dev', 'Streak set to 10 days (logged today)');
                }}
              />
              <View style={styles.separator} />
              <TappableRow
                label="Reset streak data"
                icon="refresh-outline"
                onPress={() => {
                  Alert.alert('Reset Streak', 'Delete all streak data?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset',
                      style: 'destructive',
                      onPress: async () => {
                        await devResetStreak();
                        Alert.alert('Dev', 'Streak data reset.');
                      },
                    },
                  ]);
                }}
                danger
              />
            </View>
            <View style={styles.devStreakInfo}>
              <Text style={styles.appInfoText}>
                Current: {streak.currentStreak} | Longest: {streak.longestStreak} | Last: {streak.lastLogDate || 'never'}
              </Text>
            </View>
          </>
        )}

        {/* App info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Log Your Mind v1.0.0</Text>
          <Text style={styles.appInfoText}>Made with care.</Text>
        </View>
      </ScrollView>

      {/* Time Picker Modal (iOS) */}
      {Platform.OS === 'ios' && (
        <Modal visible={showTimePicker} transparent animationType="slide">
          <View style={styles.timePickerOverlay}>
            <View style={styles.timePickerContainer}>
              <View style={styles.timePickerHeader}>
                <Pressable onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.timePickerCancel}>Cancel</Text>
                </Pressable>
                <Text style={styles.timePickerTitle}>Nudge Time</Text>
                <Pressable onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.timePickerDone}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                textColor={Colors.textPrimary}
                style={styles.timePicker}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Time Picker (Android) */}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          value={pickerDate}
          mode="time"
          onChange={handleTimeChange}
        />
      )}

      {/* Toast */}
      <Toast message={toastMessage} visible={showToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 24,
    color: '#FFFFFF',
  },
  profileTitle: {
    fontFamily: Fonts.serifItalic,
    fontSize: 24,
    color: Colors.textPrimary,
  },
  sectionHeader: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionCard: {
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    ...Shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    minHeight: 52,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    flex: 1,
  },
  rowLabel: {
    fontFamily: Fonts.sansRegular,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rowRightText: {
    fontFamily: Fonts.sansRegular,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: Spacing.md + 20 + Spacing.sm + 2,
  },
  planBadge: {
    backgroundColor: Colors.primaryLightest,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs,
  },
  planBadgeText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.primary,
  },
  devStreakInfo: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  appInfoText: {
    fontFamily: Fonts.sansLight,
    fontSize: 13,
    color: Colors.textMuted,
  },
  // Time picker
  timePickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  timePickerContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
    paddingBottom: 34,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  timePickerTitle: {
    fontFamily: Fonts.sansMedium,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  timePickerCancel: {
    fontFamily: Fonts.sansRegular,
    fontSize: 16,
    color: Colors.textMuted,
  },
  timePickerDone: {
    fontFamily: Fonts.sansMedium,
    fontSize: 16,
    color: Colors.primary,
  },
  timePicker: {
    height: 200,
  },
  // Toast
  toast: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.textPrimary,
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  toastText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
