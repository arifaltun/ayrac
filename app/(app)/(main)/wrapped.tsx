import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useBooks, Book, ReadingSession } from '@/context/BooksContext';
import { fonts } from '@/constants/tokens';

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

type ViewMode = 'monthly' | 'yearly';

function BookCover({ color, coverImage }: { color: string; coverImage?: string }) {
  if (coverImage) {
    return <Image source={{ uri: coverImage }} style={styles.coverImg} resizeMode="cover" />;
  }
  return (
    <View style={[styles.coverBlock, { backgroundColor: color }]}>
      <View style={styles.coverSpine} />
    </View>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={i <= value ? 'star' : 'star-outline'} size={9} color={i <= value ? '#f5a124' : '#555'} />
      ))}
    </View>
  );
}

function filterByPeriod(books: Book[], view: ViewMode, month: number, year: number): Book[] {
  return books.filter((b) => {
    const d = new Date(b.createdAt);
    if (view === 'yearly') return d.getFullYear() === year;
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

function filterSessionsByPeriod(sessions: ReadingSession[], view: ViewMode, month: number, year: number): ReadingSession[] {
  return sessions.filter((s) => {
    const d = new Date(s.date);
    if (view === 'yearly') return d.getFullYear() === year;
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

function formatReadingTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h} sa ${m} dk`;
  if (h > 0) return `${h} saat`;
  if (m > 0) return `${m} dakika`;
  return `${seconds} sn`;
}

function EmptyWrapped({ t }: { t: any }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: t.surface, borderColor: t.border }]}>
        <Ionicons name="bar-chart-outline" size={24} color={t.mutedStrong} />
      </View>
      <Text style={[styles.emptyTitle, { color: t.fg, fontFamily: fonts.serifMedium }]}>
        Bu dönemde kitap yok
      </Text>
      <Text style={[styles.emptyDesc, { color: t.muted }]}>
        Başka bir dönem seç ya da kitap ekle.
      </Text>
    </View>
  );
}

export default function WrappedScreen() {
  const { t } = useTheme();
  const { books, sessions } = useBooks();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [view, setView] = useState<ViewMode>('monthly');
  const [monthIndex, setMonthIndex] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  const onPrev = () => {
    if (view === 'monthly') {
      monthIndex === 0 ? (setMonthIndex(11), setYear((y) => y - 1)) : setMonthIndex((m) => m - 1);
    } else setYear((y) => y - 1);
  };
  const onNext = () => {
    if (view === 'monthly') {
      monthIndex === 11 ? (setMonthIndex(0), setYear((y) => y + 1)) : setMonthIndex((m) => m + 1);
    } else setYear((y) => y + 1);
  };

  const periodBooks = filterByPeriod(books, view, monthIndex, year);
  const finished = periodBooks.filter((b) => b.status === 'finished');
  const reading = periodBooks.filter((b) => b.status === 'reading');
  const pages = finished.reduce((s, b) => s + b.pages, 0);
  const rated = finished.filter((b) => b.rating > 0);
  const avg = rated.length
    ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1)
    : '—';

  const periodSessions = filterSessionsByPeriod(sessions, view, monthIndex, year);
  const totalReadingSeconds = periodSessions.reduce((s, sess) => s + sess.duration, 0);

  const genreStats = (() => {
    const counts: Record<string, number> = {};
    finished.forEach((b) => { if (b.genre) counts[b.genre] = (counts[b.genre] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  })();
  const topGenre = genreStats[0]?.[0] ?? null;

  const authorStats = (() => {
    const counts: Record<string, number> = {};
    finished.forEach((b) => { if (b.author) counts[b.author] = (counts[b.author] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  })();
  const topAuthor = authorStats[0]?.[0] ?? null;
  const topAuthorCount = authorStats[0]?.[1] ?? 0;

  const periodLabel = view === 'monthly' ? `${MONTHS_TR[monthIndex]} ${year}` : `${year}`;

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: t.border }]}>
        <View style={styles.logoRow}>
          <View style={[styles.logoMark, { backgroundColor: t.primary }]}>
            <Ionicons name="bookmark" size={14} color="#000" />
          </View>
          <Text style={[styles.logoText, { color: t.fg, fontFamily: fonts.serif }]}>wrapped</Text>
        </View>
        <View style={[styles.viewToggle, { backgroundColor: t.surface, borderColor: t.border }]}>
          {(['monthly', 'yearly'] as ViewMode[]).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              style={[styles.viewBtn, view === v && { backgroundColor: t.bgSoft }]}
            >
              <Text style={[styles.viewBtnText, { color: view === v ? t.fg : t.muted }]}>
                {v === 'monthly' ? 'Aylık' : 'Yıllık'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Period nav */}
      <View style={styles.periodRow}>
        <Pressable onPress={onPrev} style={styles.periodBtn}>
          <Ionicons name="chevron-back" size={16} color={t.muted} />
        </Pressable>
        <Text style={[styles.periodLabel, { color: t.fg }]}>{periodLabel}</Text>
        <Pressable onPress={onNext} style={styles.periodBtn}>
          <Ionicons name="chevron-forward" size={16} color={t.muted} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {finished.length === 0 ? (
          <EmptyWrapped t={t} />
        ) : (
          <>
            {/* Hero */}
            <View style={[styles.hero, { backgroundColor: t.primary }]}>
              <Text style={[styles.heroSub, { color: 'rgba(0,0,0,0.55)' }]}>
                {periodLabel.toUpperCase()} · WRAPPED
              </Text>
              <Text style={[styles.heroTitle, { color: '#000', fontFamily: fonts.serif }]}>
                {finished.length} kitap, {pages > 0 ? pages.toLocaleString('tr-TR') : '0'} sayfa
              </Text>
              {totalReadingSeconds > 0 && (
                <Text style={[styles.heroReadingTime, { color: 'rgba(0,0,0,0.7)' }]}>
                  {formatReadingTime(totalReadingSeconds)} okudun
                </Text>
              )}
              {topGenre && (
                <Text style={[styles.heroDesc, { color: 'rgba(0,0,0,0.6)' }]}>
                  En çok okunan tür: {topGenre}
                </Text>
              )}
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              {([
                [finished.length, 'KİTAP'],
                [pages > 0 ? pages.toLocaleString('tr-TR') : '0', 'SAYFA'],
                [avg, 'ORT. PUAN'],
                ...(totalReadingSeconds > 0
                  ? [[formatReadingTime(totalReadingSeconds), 'OKUMA']]
                  : []) as [string, string][],
              ] as [string | number, string][]).map(([v, l], i) => (
                <View key={i} style={[styles.statBox, { backgroundColor: t.surface, borderColor: t.border }]}>
                  <Text style={[styles.statValue, { color: t.fg, fontFamily: fonts.serif }]}>{v}</Text>
                  <Text style={[styles.statLabel, { color: t.muted }]}>{l}</Text>
                </View>
              ))}
            </View>

            {/* Finished books */}
            <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Text style={[styles.cardLabel, { color: t.muted }]}>OKUNAN KİTAPLAR</Text>
              <View style={{ gap: 12 }}>
                {finished.map((b) => (
                  <Pressable
                    key={b.id}
                    style={styles.bookItem}
                    onPress={() => router.push({ pathname: '/share-book' as any, params: { id: b.id } })}
                  >
                    <BookCover color={b.color} coverImage={b.coverImage} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.bookTitle, { color: t.fg }]} numberOfLines={1}>{b.title}</Text>
                      <Text style={[styles.bookMeta, { color: t.muted }]} numberOfLines={1}>
                        {b.author}{b.genre ? ` · ${b.genre}` : ''}
                      </Text>
                      <View style={{ marginTop: 3 }}>
                        <Stars value={b.rating} />
                      </View>
                    </View>
                    <Ionicons name="share-outline" size={14} color={t.mutedStrong} />
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Genre analytics */}
            {genreStats.length > 0 && (
              <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
                <Text style={[styles.cardLabel, { color: t.muted }]}>TÜR ANALİZİ</Text>
                {topGenre && (
                  <Text style={[styles.analyticHeadline, { color: t.fg, fontFamily: fonts.serifMedium }]}>
                    En çok <Text style={{ color: t.primary }}>{topGenre}</Text> okudun
                  </Text>
                )}
                <View style={{ gap: 8, marginTop: 10 }}>
                  {genreStats.map(([genre, count]) => {
                    const pct = Math.round((count / finished.length) * 100);
                    return (
                      <View key={genre}>
                        <View style={styles.barLabelRow}>
                          <Text style={[styles.barLabel, { color: t.fg }]}>{genre}</Text>
                          <Text style={[styles.barCount, { color: t.muted }]}>{count} kitap</Text>
                        </View>
                        <View style={[styles.barTrack, { backgroundColor: t.bgSoft }]}>
                          <View style={[styles.barFill, { backgroundColor: t.primary, width: `${pct}%` }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Author analytics */}
            {authorStats.length > 0 && (
              <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
                <Text style={[styles.cardLabel, { color: t.muted }]}>YAZAR ANALİZİ</Text>
                {topAuthor && topAuthorCount > 1 && (
                  <Text style={[styles.analyticHeadline, { color: t.fg, fontFamily: fonts.serifMedium }]}>
                    Favori yazarın{' '}
                    <Text style={{ color: t.primary }}>{topAuthor}</Text>
                  </Text>
                )}
                <View style={{ gap: 10, marginTop: topAuthorCount > 1 ? 10 : 0 }}>
                  {authorStats.map(([author, count]) => (
                    <View key={author} style={styles.authorRow}>
                      <View style={[styles.authorDot, { backgroundColor: t.primary }]} />
                      <Text style={[styles.authorName, { color: t.fg }]} numberOfLines={1}>{author}</Text>
                      <Text style={[styles.authorCount, { color: t.muted }]}>
                        {count} {count === 1 ? 'kitap' : 'kitap'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* In progress */}
            {reading.length > 0 && (
              <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
                <Text style={[styles.cardLabel, { color: t.muted }]}>DEVAM EDİYOR</Text>
                <View style={{ gap: 12 }}>
                  {reading.map((b) => (
                    <View key={b.id} style={[styles.bookItem, { opacity: 0.5 }]}>
                      <BookCover color={b.color} coverImage={b.coverImage} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.bookTitle, { color: t.fg }]} numberOfLines={1}>{b.title}</Text>
                        <Text style={[styles.bookMeta, { color: t.muted }]}>{b.author} · devam ediyor</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 26, letterSpacing: -0.5 },
  viewToggle: { flexDirection: 'row', borderRadius: 999, padding: 2, borderWidth: 1 },
  viewBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  viewBtnText: { fontSize: 11, fontWeight: '500' },
  periodRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingVertical: 10,
  },
  periodBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  periodLabel: { fontSize: 13, fontWeight: '600', letterSpacing: -0.2 },
  scroll: { padding: 20, gap: 12, paddingBottom: 32 },
  hero: { borderRadius: 16, padding: 18, gap: 4 },
  heroSub: { fontSize: 9, letterSpacing: 2, fontWeight: '700' },
  heroTitle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5, lineHeight: 30, marginTop: 4 },
  heroReadingTime: { fontSize: 15, fontWeight: '700', marginTop: 6 },
  heroDesc: { fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, letterSpacing: -0.5 },
  statLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 1.2 },
  card: { borderRadius: 16, padding: 14, borderWidth: 1 },
  cardLabel: { fontSize: 9, letterSpacing: 1.5, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12 },
  bookItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  coverBlock: { width: 24, height: 34, borderRadius: 2, overflow: 'hidden' },
  coverSpine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(0,0,0,0.2)' },
  coverImg: { width: 24, height: 34, borderRadius: 2 },
  bookTitle: { fontSize: 13, fontWeight: '600' },
  bookMeta: { fontSize: 11, marginTop: 1 },
  analyticHeadline: { fontSize: 15, letterSpacing: -0.2, lineHeight: 22 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { fontSize: 13, fontWeight: '500' },
  barCount: { fontSize: 12 },
  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorDot: { width: 6, height: 6, borderRadius: 3 },
  authorName: { flex: 1, fontSize: 13, fontWeight: '500' },
  authorCount: { fontSize: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  emptyTitle: { fontSize: 16, marginTop: 4 },
  emptyDesc: { fontSize: 12, textAlign: 'center', maxWidth: 220, lineHeight: 18, color: '#888' },
});
