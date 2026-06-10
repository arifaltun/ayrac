import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMINDER_KEY = '@ayrac_reminder';

export type ReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
};

const DEFAULT_SETTINGS: ReminderSettings = { enabled: false, hour: 20, minute: 0 };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function loadReminderSettings(): Promise<ReminderSettings> {
  const raw = await AsyncStorage.getItem(REMINDER_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(settings));
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleReminder(
  settings: ReminderSettings,
  currentBook: string | null,
  streak: number,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.enabled) return;

  const body = currentBook
    ? `Şu an okuyorsun: ${currentBook}`
    : streak > 0
    ? 'Bugün okumayı unutma!'
    : 'Okuma listene bir kitap ekle ve okumaya başla.';

  const title = streak > 0 ? `${streak} günlük seri 🔥` : 'ayraç · okuma zamanı';

  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: false },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: settings.hour,
      minute: settings.minute,
    },
  });
}

export async function cancelReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Bugünden geriye kesintisiz okuma yapılan gün sayısı
export function computeStreak(sessions: { date: number }[]): number {
  const days = new Set(
    sessions.map((s) => {
      const d = new Date(s.date);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }),
  );
  let count = 0;
  const d = new Date();
  while (days.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}
