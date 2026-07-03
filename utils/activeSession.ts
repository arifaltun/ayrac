import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_SESSION_KEY = '@ayrac_active_session';

// Okuma modundaki oturumun kalıcı izi: uygulama arka planda öldürülürse
// bir sonraki açılışta kütüphane ekranı bu kayıttan kurtarma önerir.
// lastTick her ~15 sn'de güncellenir; kurtarılan süre lastTick - startedAt olur
// (öldürülme anından sonrası sayılmaz).
export type ActiveSession = {
  bookId: string;
  startedAt: number;
  lastTick: number;
};

export async function saveActiveSession(session: ActiveSession): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  } catch {}
}

export async function loadActiveSession(): Promise<ActiveSession | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.bookId !== 'string' || typeof parsed?.startedAt !== 'number') return null;
    return { ...parsed, lastTick: typeof parsed.lastTick === 'number' ? parsed.lastTick : parsed.startedAt };
  } catch {
    return null;
  }
}

export async function clearActiveSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {}
}
