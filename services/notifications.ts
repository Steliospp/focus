import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NUDGE_COPY = [
  { title: 'Log Your Mind', body: "What's on your mind today?" },
  { title: 'Log Your Mind', body: 'Take 30 seconds for yourself.' },
  { title: 'Log Your Mind', body: 'Your journal is listening.' },
  { title: 'Log Your Mind', body: 'What happened today worth remembering?' },
  { title: 'Log Your Mind', body: "Say it out loud. You'll feel better." },
  { title: 'Log Your Mind', body: 'What are you carrying with you right now?' },
  { title: 'Log Your Mind', body: 'Check in with yourself.' },
];

const KEYS = {
  dailyNudgeId: 'daily_nudge_id',
  eveningReminderId: 'evening_reminder_id',
  streakReminderId: 'streak_reminder_id',
  nudgeTime: 'nudge_time',
  bannerDismissed: 'notification_banner_dismissed',
};

// Configure how notifications display when app is foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getNudgeCopy(): { title: string; body: string } {
  const dayOfWeek = new Date().getDay();
  return NUDGE_COPY[dayOfWeek % NUDGE_COPY.length];
}

export const NotificationService = {
  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  },

  async scheduleDailyNudge(hour: number, minute: number): Promise<void> {
    // Cancel existing
    const existingId = await AsyncStorage.getItem(KEYS.dailyNudgeId);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
    }

    const { title, body } = getNudgeCopy();

    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    await AsyncStorage.setItem(KEYS.dailyNudgeId, id);
    await AsyncStorage.setItem(KEYS.nudgeTime, JSON.stringify({ hour, minute }));
  },

  async cancelDailyNudge(): Promise<void> {
    const id = await AsyncStorage.getItem(KEYS.dailyNudgeId);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      await AsyncStorage.removeItem(KEYS.dailyNudgeId);
    }
  },

  async scheduleEveningReminder(): Promise<void> {
    // Cancel existing
    await this.cancelEveningReminder();

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Still with you',
        body: "You haven't logged today. Even 30 seconds counts.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
      },
    });

    await AsyncStorage.setItem(KEYS.eveningReminderId, id);
  },

  async cancelEveningReminder(): Promise<void> {
    const id = await AsyncStorage.getItem(KEYS.eveningReminderId);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      await AsyncStorage.removeItem(KEYS.eveningReminderId);
    }
  },

  async scheduleStreakReminder(currentStreak: number): Promise<void> {
    // Only fire if streak >= 3
    if (currentStreak < 3) return;

    // Cancel existing
    const existingId = await AsyncStorage.getItem(KEYS.streakReminderId);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "\uD83D\uDD25 Don't break your streak",
        body: `${currentStreak} days strong. Keep it going.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 0,
      },
    });

    await AsyncStorage.setItem(KEYS.streakReminderId, id);
  },

  async cancelStreakReminder(): Promise<void> {
    const id = await AsyncStorage.getItem(KEYS.streakReminderId);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      await AsyncStorage.removeItem(KEYS.streakReminderId);
    }
  },

  async rescheduleAll(): Promise<void> {
    const status = await this.getPermissionStatus();
    if (status !== 'granted') return;

    // Get saved settings
    const { getSettings } = await import('@/services/storage');
    const settings = await getSettings();

    // Daily nudge
    if (settings.dailyNudge) {
      const savedTime = await AsyncStorage.getItem(KEYS.nudgeTime);
      const { hour, minute } = savedTime
        ? JSON.parse(savedTime)
        : { hour: 10, minute: 0 };
      await this.scheduleDailyNudge(hour, minute);
    }

    // Evening reminder
    if (settings.reminderIfNoLog) {
      await this.scheduleEveningReminder();
    }

    // Streak reminder
    const { getStreak } = await import('@/services/storage');
    const streak = await getStreak();
    if (streak.currentStreak >= 3) {
      await this.scheduleStreakReminder(streak.currentStreak);
    }
  },

  async onLogSaved(currentStreak: number): Promise<void> {
    // Cancel evening reminder for today (it'll re-fire tomorrow via daily trigger)
    // Reschedule streak reminder with updated count
    if (currentStreak >= 3) {
      await this.scheduleStreakReminder(currentStreak);
    } else {
      await this.cancelStreakReminder();
    }
  },

  async isBannerDismissed(): Promise<boolean> {
    const val = await AsyncStorage.getItem(KEYS.bannerDismissed);
    return val === 'true';
  },

  async dismissBanner(): Promise<void> {
    await AsyncStorage.setItem(KEYS.bannerDismissed, 'true');
  },

  async getNudgeTime(): Promise<{ hour: number; minute: number }> {
    const saved = await AsyncStorage.getItem(KEYS.nudgeTime);
    return saved ? JSON.parse(saved) : { hour: 10, minute: 0 };
  },
};
