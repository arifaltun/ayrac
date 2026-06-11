import AsyncStorage from '@react-native-async-storage/async-storage';
import quotesData from '@/data/quotes.json';

export type Quote = {
  text: string;
  author: string | null;
  source: string | null;
};

const RECENT_KEY = '@ayrac_recent_quotes';
const RECENT_LIMIT = 20;

// Son gösterilen alıntıları atlayarak rastgele seçer.
// Havuz küçükse kaçınma listesi havuzdan küçük tutulur — mantık bozulmaz.
export async function pickQuote(): Promise<Quote> {
  const pool = quotesData as Quote[];

  let recent: number[] = [];
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    if (raw) recent = JSON.parse(raw);
  } catch {}

  const avoidCount = Math.min(RECENT_LIMIT, Math.max(0, pool.length - 1));
  const avoid = new Set(recent.slice(-avoidCount));

  let candidates = pool.map((_, i) => i).filter((i) => !avoid.has(i));
  if (candidates.length === 0) candidates = pool.map((_, i) => i);

  const idx = candidates[Math.floor(Math.random() * candidates.length)];

  const nextRecent = [...recent.filter((i) => i !== idx), idx].slice(-RECENT_LIMIT);
  AsyncStorage.setItem(RECENT_KEY, JSON.stringify(nextRecent)).catch(() => {});

  return pool[idx];
}
