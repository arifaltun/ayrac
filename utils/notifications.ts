import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMINDER_KEY = '@ayrac_reminder';

export type ReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
};

const DEFAULT_SETTINGS: ReminderSettings = { enabled: false, hour: 20, minute: 0 };

// Zamanlanmış yerel bildirim web'de desteklenmiyor — hatırlatıcı arayüzü
// bu bayrağa bakarak kendini "mobil uygulamada" notuyla gizler
export const remindersSupported = Platform.OS !== 'web';

if (remindersSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function loadReminderSettings(): Promise<ReminderSettings> {
  const raw = await AsyncStorage.getItem(REMINDER_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(settings));
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!remindersSupported) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

const ANDROID_CHANNEL_ID = 'daily-reminder';

// Android 8+ kanal olmadan zamanlanmış bildirim hiç görünmeyebilir
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Günlük hatırlatıcı',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: undefined,
  });
}

export async function scheduleReminder(settings: ReminderSettings): Promise<void> {
  if (!remindersSupported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.enabled) return;
  await ensureAndroidChannel();

  // İçerik zamanlama anında donduğu için kitap adı/seri gibi bayatlayan
  // bilgiler kullanılmaz — nötr metin her gün doğru kalır
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'ayraç · okuma zamanı',
      body: 'Bugün okumak için birkaç dakika ayır.',
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: settings.hour,
      minute: settings.minute,
      channelId: ANDROID_CHANNEL_ID,
    },
  });
}

export async function cancelReminder(): Promise<void> {
  if (!remindersSupported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
