import { Platform } from 'react-native';
import * as ExpoHaptics from 'expo-haptics';

// expo-haptics web'de UnavailabilityError ile reddediyor — çağrılar await
// edilmediği için bu, konsolu kirleten yakalanmamış promise hatasına dönüşüyor.
// Bu sarmalayıcı web'de sessizce hiçbir şey yapmaz; API yüzeyi birebir aynıdır.
export const ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType;

const isWeb = Platform.OS === 'web';

export async function selectionAsync(): Promise<void> {
  if (isWeb) return;
  try { await ExpoHaptics.selectionAsync(); } catch {}
}

export async function impactAsync(style?: ExpoHaptics.ImpactFeedbackStyle): Promise<void> {
  if (isWeb) return;
  try { await ExpoHaptics.impactAsync(style); } catch {}
}

export async function notificationAsync(type?: ExpoHaptics.NotificationFeedbackType): Promise<void> {
  if (isWeb) return;
  try { await ExpoHaptics.notificationAsync(type); } catch {}
}
