import type { Book, ReadingSession } from '@/context/BooksContext';

// Okur Kimliği — aylık, veriden türeyen tek unvan.
// Saf fonksiyon: AsyncStorage/context bilmez, yalnızca verilen veriden hesaplar
// (scripts/verify-reader-identity.ts örnek verilerle konsolda doğrular).
//
// Birden fazla kimlik hak edilirse listedeki sıraya göre en üstteki kazanır
// (üstler daha nadir). Ay içinde hiç veri yoksa null döner — UI satırı hiç
// göstermez. Veri var ama hiçbir eşik tutmuyorsa DEFAULT_IDENTITY döner.

export const DEFAULT_IDENTITY = 'Okur';

const NIGHT_RATIO = 0.6; // Gece Okuru: seans sürelerinin ≥%60'ı 22:00–05:00
const DAWN_RATIO = 0.4; // Şafak Okuru: ≥%40'ı 05:00–09:00
const MARATHON_SECONDS = 120 * 60; // Maratoncu: tek seansta ≥120 dk
const STREAK_DAYS = 7; // İstikrarlı: ≥7 gün üst üste
const TASTER_MIN_DAYS = 12; // Çeşnici: ≥12 farklı günde seans…
const TASTER_MAX_AVG_SECONDS = 25 * 60; // …ama ortalama seans <25 dk
const BRICK_PAGES = 500; // Tuğla Deviren: ≥500 sayfalık kitap bitirme
const CLASSIC_YEAR = 1970; // Klasik Avcısı: ilk baskısı 1970 öncesi
const CLASSIC_RATIO = 0.5;
const EXPLORER_GENRES = 3; // Gezgin Okur: ≥3 farklı türde bitirme
const ANNOTATOR_RATIO = 0.7; // Not Düşen: bitirilenlerin ≥%70'inde not/alıntı
const HARSH_MAX_AVG = 5.0; // Zor Beğenen: ≥2 bitirme, ortalama ≤5.0
const GENEROUS_MIN_AVG = 9.0; // Cömert Puancı: ≥3 bitirme, ortalama ≥9.0

function inMonth(ts: number, month: number, year: number): boolean {
  const d = new Date(ts);
  return d.getFullYear() === year && d.getMonth() === month;
}

// Kimlikler, nadirlik sırasıyla — ilk tutan kazanır
export function computeReaderIdentity(
  books: Book[],
  sessions: ReadingSession[],
  month: number, // 0–11
  year: number,
): string | null {
  const monthSessions = sessions.filter((s) => inMonth(s.date, month, year));
  // Wrapped ile aynı kural: bitirilenler bitirme tarihiyle döneme girer
  const finished = books.filter(
    (b) => b.status === 'finished' && inMonth(b.finishedAt ?? b.createdAt, month, year),
  );

  // Boş durum: ay içinde ne seans ne bitirme varsa kimlik yok
  if (monthSessions.length === 0 && finished.length === 0) return null;

  const totalDuration = monthSessions.reduce((sum, s) => sum + s.duration, 0);
  const durationWhere = (pred: (hour: number) => boolean) =>
    monthSessions.reduce((sum, s) => (pred(new Date(s.date).getHours()) ? sum + s.duration : sum), 0);

  // Gece Okuru — 22:00–05:00
  if (totalDuration > 0 && durationWhere((h) => h >= 22 || h < 5) / totalDuration >= NIGHT_RATIO) {
    return 'Gece Okuru';
  }

  // Şafak Okuru — 05:00–09:00
  if (totalDuration > 0 && durationWhere((h) => h >= 5 && h < 9) / totalDuration >= DAWN_RATIO) {
    return 'Şafak Okuru';
  }

  // Maratoncu — tek seansta ≥120 dk
  if (monthSessions.some((s) => s.duration >= MARATHON_SECONDS)) return 'Maratoncu';

  // İstikrarlı — ay içinde ≥7 gün üst üste okuma
  const readDays = new Set(monthSessions.map((s) => new Date(s.date).getDate()));
  let run = 0;
  let bestRun = 0;
  for (let day = 1; day <= 31; day++) {
    run = readDays.has(day) ? run + 1 : 0;
    bestRun = Math.max(bestRun, run);
  }
  if (bestRun >= STREAK_DAYS) return 'İstikrarlı';

  // Çeşnici — çok günde, kısa kısa
  if (
    readDays.size >= TASTER_MIN_DAYS &&
    monthSessions.length > 0 &&
    totalDuration / monthSessions.length < TASTER_MAX_AVG_SECONDS
  ) {
    return 'Çeşnici';
  }

  // Tuğla Deviren — ≥500 sayfalık kitap bitirme
  if (finished.some((b) => b.pages >= BRICK_PAGES)) return 'Tuğla Deviren';

  // Klasik Avcısı — bitirilenlerin ≥%50'si 1970 öncesi ilk baskı.
  // Basım yılı verisi hiç yoksa bu kimlik atlanır.
  const withYear = finished.filter((b) => b.firstPublishYear != null);
  if (withYear.length > 0) {
    const classics = finished.filter((b) => b.firstPublishYear != null && b.firstPublishYear < CLASSIC_YEAR);
    if (classics.length / finished.length >= CLASSIC_RATIO) return 'Klasik Avcısı';
  }

  // Gezgin Okur — ≥3 farklı türde bitirme
  const genres = new Set(finished.map((b) => b.genre).filter(Boolean));
  if (genres.size >= EXPLORER_GENRES) return 'Gezgin Okur';

  // Sadık Okur — aynı yazardan üst üste ≥2 bitirme (bitirme sırasına göre)
  const byFinishDate = [...finished].sort(
    (a, b) => (a.finishedAt ?? a.createdAt) - (b.finishedAt ?? b.createdAt),
  );
  for (let i = 1; i < byFinishDate.length; i++) {
    if (byFinishDate[i].author && byFinishDate[i].author === byFinishDate[i - 1].author) {
      return 'Sadık Okur';
    }
  }

  // Not Düşen — bitirilenlerin ≥%70'ine not veya alıntı yazılmış
  if (finished.length > 0) {
    const annotated = finished.filter((b) => b.review?.trim() || b.quote?.trim());
    if (annotated.length / finished.length >= ANNOTATOR_RATIO) return 'Not Düşen';
  }

  // Puan ortalaması puanlanmış kitaplardan hesaplanır — puansız (0) kitap
  // ortalamayı yapay biçimde aşağı çekmesin
  const rated = finished.filter((b) => b.rating > 0);
  const avgRating = rated.length > 0 ? rated.reduce((s, b) => s + b.rating, 0) / rated.length : null;

  // Zor Beğenen — ≥2 bitirme ve ortalama ≤5.0
  if (finished.length >= 2 && rated.length >= 2 && avgRating != null && avgRating <= HARSH_MAX_AVG) {
    return 'Zor Beğenen';
  }

  // Cömert Puancı — ≥3 bitirme ve ortalama ≥9.0
  if (finished.length >= 3 && rated.length >= 3 && avgRating != null && avgRating >= GENEROUS_MIN_AVG) {
    return 'Cömert Puancı';
  }

  return DEFAULT_IDENTITY;
}
