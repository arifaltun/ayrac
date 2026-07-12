import { memo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/context/ThemeContext';
import { useBooks, Book, ReadingSession } from '@/context/BooksContext';
import { usePro } from '@/context/ProContext';
import { fonts } from '@/constants/tokens';
import { BookCover } from '@/components/BookCover';
import { RatingText } from '@/components/RatingText';
import { ProFeatureGate } from '@/components/ProFeatureGate';
import { computeReaderIdentity } from '@/utils/readerIdentity';

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];
const MONTHS_TR_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

type ViewMode = 'monthly' | 'yearly';

function inPeriod(ts: number, view: ViewMode, month: number, year: number): boolean {
  const d = new Date(ts);
  if (view === 'yearly') return d.getFullYear() === year;
  return d.getFullYear() === year && d.getMonth() === month;
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

// 364 hücre + tarih hesabı her ekran render'ında yeniden kurulmasın diye memo'lu;
// sessions/isDark/t referansları değişmedikçe hiç çalışmaz
const ReadingHeatmap = memo(function ReadingHeatmap({ sessions, isDark, t }: {
  sessions: ReadingSession[]; isDark: boolean; t: any;
}) {
  const gridScrollRef = useRef<ScrollView>(null);
  const HEAT = isDark
    ? ['#1a1a1a', '#0d2e1e', '#165c3d', '#2a9b6a', '#4ecb91']
    : ['#ede9e5', '#d4f0e5', '#9ed9c0', '#4db895', '#1ca070'];

  const dayMap: Record<string, number> = {};
  sessions.forEach((s) => {
    const d = new Date(s.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dayMap[key] = (dayMap[key] ?? 0) + s.duration;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Current reading streak (consecutive days ending today or yesterday)
  const streak = (() => {
    let count = 0;
    const d = new Date(today);
    while (true) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if ((dayMap[k] ?? 0) > 0) {
        count++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return count;
  })();

  // Active days this year
  const thisYear = today.getFullYear();
  const activeDaysThisYear = Object.entries(dayMap).filter(([k, v]) => parseInt(k.slice(0, 4)) === thisYear && v > 0).length;

  // Build 52 weeks, aligned to Monday of the earliest week
  const todayDow = (today.getDay() + 6) % 7; // 0=Mon…6=Sun
  const gridStart = new Date(today);
  gridStart.setDate(gridStart.getDate() - todayDow - 51 * 7);

  const weeks: { key: string; future: boolean }[][] = [];
  const cur = new Date(gridStart);
  for (let w = 0; w < 52; w++) {
    const week: { key: string; future: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(cur);
      const k = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      week.push({ key: k, future: day > today });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  // Month label at first week of each month
  const monthLabels: { label: string; wi: number }[] = [];
  weeks.forEach((week, wi) => {
    const firstDayDate = new Date(gridStart);
    firstDayDate.setDate(firstDayDate.getDate() + wi * 7);
    if (firstDayDate.getDate() <= 7) {
      monthLabels.push({ label: MONTHS_TR_SHORT[firstDayDate.getMonth()], wi });
    }
  });

  const CELL = 11;
  const GAP = 2;
  const STEP = CELL + GAP;

  const getLevel = (secs: number): number => {
    if (secs === 0) return 0;
    const m = secs / 60;
    if (m < 10) return 1;
    if (m < 30) return 2;
    if (m < 60) return 3;
    return 4;
  };

  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <Text style={[styles.cardLabel, { color: t.muted }]}>OKUMA TAKVİMİ</Text>

      <View style={styles.heatHeaderRow}>
        {streak > 0 ? (
          <Text style={[styles.analyticHeadline, { color: t.fg, fontFamily: fonts.serifMedium }]}>
            {streak} günlük{' '}
            <Text style={{ color: isDark ? '#4ecb91' : '#1ca070' }}>seri</Text>
          </Text>
        ) : (
          <Text style={[styles.analyticHeadline, { color: t.fg, fontFamily: fonts.serifMedium }]}>
            Bu yıl{' '}
            <Text style={{ color: isDark ? '#4ecb91' : '#1ca070' }}>{activeDaysThisYear} gün</Text>
            {' '}okuma yaptın
          </Text>
        )}
        {streak > 0 && activeDaysThisYear > 0 && (
          <Text style={[styles.heatSubNote, { color: t.muted }]}>
            Bu yıl {activeDaysThisYear} gün
          </Text>
        )}
      </View>

      <ScrollView
        ref={gridScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 10 }}
        // Kullanıcının görmek istediği uç bugün — grid açılışta en sağda başlar
        onContentSizeChange={() => gridScrollRef.current?.scrollToEnd({ animated: false })}
      >
        <View>
          {/* Month labels */}
          <View style={{ height: 14, position: 'relative', width: 52 * STEP }}>
            {monthLabels.map(({ label, wi }, i) => (
              <Text
                key={i}
                style={{
                  position: 'absolute',
                  left: wi * STEP,
                  fontSize: 9,
                  fontWeight: '600',
                  color: t.muted,
                  letterSpacing: 0.3,
                }}
              >
                {label}
              </Text>
            ))}
          </View>

          {/* Grid */}
          <View style={{ flexDirection: 'row', gap: GAP }}>
            {weeks.map((week, wi) => (
              <View key={wi} style={{ gap: GAP }}>
                {week.map(({ key, future }, di) => {
                  const secs = future ? 0 : (dayMap[key] ?? 0);
                  const level = getLevel(secs);
                  const isToday = key === todayKey;
                  return (
                    <View
                      key={di}
                      style={{
                        width: CELL,
                        height: CELL,
                        borderRadius: 2,
                        backgroundColor: future ? 'transparent' : HEAT[level],
                        borderWidth: isToday ? 1 : 0,
                        borderColor: isDark ? '#F5F0E8' : '#151b28',
                      }}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.heatLegend}>
        <Text style={[styles.heatLegendTxt, { color: t.muted }]}>Az</Text>
        {HEAT.map((color, i) => (
          <View key={i} style={[styles.heatLegendCell, { backgroundColor: color }]} />
        ))}
        <Text style={[styles.heatLegendTxt, { color: t.muted }]}>Çok</Text>
      </View>
    </View>
  );
});

// Free'nin kilitli önizlemesi gerçek grid'i render etmesin — statik, hesapsız kopya
function HeatmapPlaceholder({ t }: { t: any }) {
  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <Text style={[styles.cardLabel, { color: t.muted }]}>OKUMA TAKVİMİ</Text>
      <View style={{ flexDirection: 'row', gap: 2, marginTop: 10 }}>
        {Array.from({ length: 26 }).map((_, wi) => (
          <View key={wi} style={{ gap: 2 }}>
            {Array.from({ length: 7 }).map((_, di) => (
              <View key={di} style={{ width: 11, height: 11, borderRadius: 2, backgroundColor: t.bgSoft }} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function csvEscape(s: string): string {
  return `"${String(s).replace(/"/g, '""')}"`;
}

function buildPdfHtml(
  books: Book[],
  periodLabel: string,
  pages: number,
  avg: string,
  totalSecs: number,
): string {
  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0 && m > 0) return `${h} sa ${m} dk`;
    if (h > 0) return `${h} saat`;
    return m > 0 ? `${m} dk` : '—';
  };

  const rows = books.map((b, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${b.title}</strong></td>
      <td>${b.author}</td>
      <td>${b.genre || '—'}</td>
      <td>${b.pages || '—'}</td>
      <td>${b.rating > 0 ? b.rating.toFixed(1) + ' / 10' : '—'}</td>
      <td>${b.readingTime ? formatTime(b.readingTime) : '—'}</td>
      <td>${b.review ? b.review.slice(0, 80) + (b.review.length > 80 ? '…' : '') : '—'}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: Georgia, serif; color: #151b28; padding: 32px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 28px; margin: 0 0 4px; letter-spacing: -1px; }
  .sub { color: #656d81; font-size: 13px; margin-bottom: 24px; }
  .stats { display: flex; gap: 20px; margin-bottom: 28px; }
  .stat { background: #f9f7f5; border-radius: 10px; padding: 14px 18px; min-width: 80px; }
  .stat-val { font-size: 26px; font-weight: 700; color: #151b28; }
  .stat-lbl { font-size: 10px; color: #656d81; letter-spacing: 1px; text-transform: uppercase; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase;
       color: #656d81; border-bottom: 2px solid #e5e0dc; padding: 8px 6px; }
  td { padding: 10px 6px; border-bottom: 1px solid #f0eeec; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .footer { margin-top: 32px; font-size: 11px; color: #9ba1b0; border-top: 1px solid #e5e0dc; padding-top: 12px; }
  .badge { display: inline-block; background: #151b28; color: #F5F0E8; padding: 3px 8px;
           border-radius: 20px; font-size: 11px; font-weight: 700; margin-bottom: 8px; }
</style>
</head>
<body>
  <div class="badge">ayraç</div>
  <h1>${periodLabel} · Wrapped</h1>
  <p class="sub">${books.length} kitap · Dışa aktarıldı: ${new Date().toLocaleDateString('tr-TR')}</p>

  <div class="stats">
    <div class="stat"><div class="stat-val">${books.length}</div><div class="stat-lbl">Kitap</div></div>
    <div class="stat"><div class="stat-val">${pages.toLocaleString('tr-TR')}</div><div class="stat-lbl">Sayfa</div></div>
    <div class="stat"><div class="stat-val">${avg}</div><div class="stat-lbl">Ort. Puan</div></div>
    ${totalSecs > 0 ? `<div class="stat"><div class="stat-val">${formatTime(totalSecs)}</div><div class="stat-lbl">Okuma</div></div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th><th>Başlık</th><th>Yazar</th><th>Tür</th>
        <th>Sayfa</th><th>Puan</th><th>Süre</th><th>Not</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">ayraç · okuma takip uygulaması</div>
</body>
</html>`;
}

function EmptyWrapped({ t }: { t: any }) {
  const router = useRouter();
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
      <Pressable
        style={[styles.emptyButton, { backgroundColor: t.primary }]}
        onPress={() => router.push('/add-book' as any)}
        accessibilityLabel="Kitap ekle"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={14} color="#000" />
        <Text style={styles.emptyButtonText}>Kitap ekle</Text>
      </Pressable>
    </View>
  );
}

function isOlderThan3Months(monthIndex: number, year: number): boolean {
  const today = new Date();
  const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
  const period = new Date(year, monthIndex, 1);
  return period < threeMonthsAgo;
}

export default function WrappedScreen() {
  const { t, isDark } = useTheme();
  const { books, sessions } = useBooks();
  const { isPro, showPaywall } = usePro();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [view, setView] = useState<ViewMode>('monthly');
  const [monthIndex, setMonthIndex] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  const onPrev = () => {
    if (view === 'monthly') {
      const newMonth = monthIndex === 0 ? 11 : monthIndex - 1;
      const newYear = monthIndex === 0 ? year - 1 : year;
      if (!isPro && isOlderThan3Months(newMonth, newYear)) { showPaywall('history'); return; }
      setMonthIndex(newMonth);
      setYear(newYear);
    } else {
      // Aylıkla aynı kural: 3 aylık serbest pencere hangi yıla taşıyorsa orası açık
      if (!isPro && isOlderThan3Months(11, year - 1)) { showPaywall('history'); return; }
      setYear((y) => y - 1);
    }
  };
  const onNext = () => {
    if (view === 'monthly') {
      if (monthIndex === 11) {
        setMonthIndex(0);
        setYear((y) => y + 1);
      } else {
        setMonthIndex((m) => m + 1);
      }
    } else setYear((y) => y + 1);
  };

  // Bitirilenler bitirme tarihiyle, devam edenler eklenme tarihiyle döneme girer
  const finished = books.filter(
    (b) => b.status === 'finished' && inPeriod(b.finishedAt ?? b.createdAt, view, monthIndex, year),
  );
  const reading = books.filter(
    (b) => b.status === 'reading' && inPeriod(b.createdAt, view, monthIndex, year),
  );
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

  // Okur Kimliği ay bazlı tanımlı — yıllık görünümde gösterilmez.
  // Ay değişince o ayın verisinden yeniden hesaplanır; veri yoksa null (satır gizli)
  const readerIdentity = view === 'monthly'
    ? computeReaderIdentity(books, sessions, monthIndex, year)
    : null;

  const handleExportCSV = async () => {
    if (!isPro) { showPaywall('export'); return; }
    if (finished.length === 0) return;
    setExporting('csv');
    try {
      const header = ['Sıra', 'Başlık', 'Yazar', 'Sayfa', 'Tür', 'Puan', 'Okuma Süresi (dk)', 'Not', 'Tarih'];
      const dataRows = finished.map((b, i) => [
        String(i + 1),
        csvEscape(b.title),
        csvEscape(b.author),
        String(b.pages || ''),
        csvEscape(b.genre || ''),
        String(b.rating || ''),
        String(b.readingTime ? Math.round(b.readingTime / 60) : ''),
        csvEscape(b.review || ''),
        new Date(b.finishedAt ?? b.createdAt).toLocaleDateString('tr-TR'),
      ]);
      const csv = [header, ...dataRows].map((r) => r.join(',')).join('\n');
      const slug = periodLabel.toLowerCase().replace(/\s+/g, '-');
      const path = FileSystem.cacheDirectory + `ayrac-${slug}.csv`;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
    } catch {
      Alert.alert('Dışa aktarılamadı', 'CSV dosyası oluşturulurken bir sorun oldu. Tekrar dener misin?');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    if (!isPro) { showPaywall('export'); return; }
    if (finished.length === 0) return;
    setExporting('pdf');
    try {
      const html = buildPdfHtml(finished, periodLabel, pages, avg, totalReadingSeconds);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    } catch {
      Alert.alert('Dışa aktarılamadı', 'PDF oluşturulurken bir sorun oldu. Tekrar dener misin?');
    } finally {
      setExporting(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: t.border }]}>
        <View style={styles.logoRow}>
          <View style={[styles.logoMark, { backgroundColor: t.primary }]}>
            <Ionicons name="bookmark" size={14} color="#000" />
          </View>
          <Text style={[styles.logoText, { color: t.fg, fontFamily: fonts.serif }]}>özet</Text>
        </View>
        <View style={[styles.viewToggle, { backgroundColor: t.surface, borderColor: t.border }]}>
          {(['monthly', 'yearly'] as ViewMode[]).map((v) => (
            <Pressable
              key={v}
              onPress={() => {
                // "Yıllık Wrapped & paylaşım" Pro özelliği — Free aylıkta kalır
                if (v === 'yearly' && !isPro) { showPaywall('wrapped'); return; }
                setView(v);
              }}
              style={[styles.viewBtn, view === v && { backgroundColor: t.bgSoft }]}
              hitSlop={{ top: 10, bottom: 10 }}
              accessibilityRole="button"
              accessibilityLabel={v === 'monthly' ? 'Aylık görünüm' : 'Yıllık görünüm'}
              accessibilityState={{ selected: view === v }}
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
        <Pressable onPress={onPrev} style={styles.periodBtn} accessibilityLabel="Önceki dönem" accessibilityRole="button">
          <Ionicons name="chevron-back" size={16} color={t.muted} />
        </Pressable>
        <Text style={[styles.periodLabel, { color: t.fg }]}>{periodLabel}</Text>
        <Pressable onPress={onNext} style={styles.periodBtn} accessibilityLabel="Sonraki dönem" accessibilityRole="button">
          <Ionicons name="chevron-forward" size={16} color={t.muted} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {finished.length === 0 ? (
          <>
            <EmptyWrapped t={t} />
            {sessions.length > 0 && (
              <ProFeatureGate
                trigger="heatmap"
                title="Okuma takvimi Pro’da"
                description="Yıllık ısı haritası ve okuma serilerin."
              >
                {isPro ? <ReadingHeatmap sessions={sessions} isDark={isDark} t={t} /> : <HeatmapPlaceholder t={t} />}
              </ProFeatureGate>
            )}
          </>
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
              {readerIdentity && (
                <Text style={[styles.heroIdentity, { color: 'rgba(0,0,0,0.6)', fontFamily: fonts.serifRegular }]}>
                  Bu ayın kimliği:{' '}
                  <Text style={{ fontFamily: fonts.serifMedium, color: '#000' }}>{readerIdentity}</Text>
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
                    onPress={() => {
                      // BİTİRDİM kartı Pro'ya özel — edit-book'taki kapıyla aynı tetik
                      if (!isPro) { showPaywall('bitirdim_card'); return; }
                      router.push({ pathname: '/share-book' as any, params: { id: b.id } });
                    }}
                  >
                    <BookCover color={b.color} coverImage={b.coverImage} title={b.title} size={34} radius={2} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.bookTitle, { color: t.fg }]} numberOfLines={1}>{b.title}</Text>
                      <Text style={[styles.bookMeta, { color: t.muted }]} numberOfLines={1}>
                        {b.author}{b.genre ? ` · ${b.genre}` : ''}
                      </Text>
                      <View style={{ marginTop: 3 }}>
                        <RatingText value={b.rating} size={11} />
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
                        {count} kitap
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
                      <BookCover color={b.color} coverImage={b.coverImage} title={b.title} size={34} radius={2} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.bookTitle, { color: t.fg }]} numberOfLines={1}>{b.title}</Text>
                        <Text style={[styles.bookMeta, { color: t.muted }]}>{b.author} · devam ediyor</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Okuma takvimi — sadece veri varsa; boş grid gürültüden ibaret */}
            {sessions.length > 0 && (
              <ProFeatureGate
                trigger="heatmap"
                title="Okuma takvimi Pro’da"
                description="Yıllık ısı haritası ve okuma serilerin."
              >
                {isPro ? <ReadingHeatmap sessions={sessions} isDark={isDark} t={t} /> : <HeatmapPlaceholder t={t} />}
              </ProFeatureGate>
            )}

            {/* Export */}
            <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Text style={[styles.cardLabel, { color: t.muted }]}>AKTAR</Text>
              <Text style={[styles.exportDesc, { color: t.muted }]}>
                {periodLabel} · {finished.length} kitap
              </Text>
              <View style={styles.exportBtns}>
                <Pressable
                  style={[styles.exportBtn, { backgroundColor: t.bgSoft, borderColor: t.border }]}
                  onPress={handleExportCSV}
                  disabled={exporting !== null}
                >
                  {exporting === 'csv' ? (
                    <ActivityIndicator size="small" color={t.muted} />
                  ) : (
                    <Ionicons name="document-text-outline" size={16} color={t.fg} />
                  )}
                  <Text style={[styles.exportBtnText, { color: t.fg }]}>CSV</Text>
                </Pressable>
                <Pressable
                  style={[styles.exportBtn, { backgroundColor: t.bgSoft, borderColor: t.border }]}
                  onPress={handleExportPDF}
                  disabled={exporting !== null}
                >
                  {exporting === 'pdf' ? (
                    <ActivityIndicator size="small" color={t.muted} />
                  ) : (
                    <Ionicons name="document-outline" size={16} color={t.fg} />
                  )}
                  <Text style={[styles.exportBtnText, { color: t.fg }]}>PDF</Text>
                </Pressable>
              </View>
            </View>
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
    paddingHorizontal: 20, paddingVertical: 2,
  },
  periodBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  periodLabel: { fontSize: 13, fontWeight: '600', letterSpacing: -0.2 },
  scroll: { padding: 20, gap: 12, paddingBottom: 32 },
  hero: { borderRadius: 16, padding: 18, gap: 4 },
  heroSub: { fontSize: 9, letterSpacing: 2, fontWeight: '700' },
  heroTitle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5, lineHeight: 30, marginTop: 4 },
  heroReadingTime: { fontSize: 15, fontWeight: '700', marginTop: 6 },
  heroDesc: { fontSize: 12, marginTop: 2 },
  heroIdentity: { fontSize: 13, letterSpacing: -0.1, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  card: { borderRadius: 16, padding: 14, borderWidth: 1 },
  cardLabel: { fontSize: 9, letterSpacing: 1.5, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12 },
  bookItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  heatHeaderRow: { marginBottom: 2 },
  heatSubNote: { fontSize: 12, marginTop: 2 },
  heatLegend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, justifyContent: 'flex-end' },
  heatLegendTxt: { fontSize: 10, fontWeight: '500' },
  heatLegendCell: { width: 11, height: 11, borderRadius: 2 },
  exportDesc: { fontSize: 12, marginBottom: 12 },
  exportBtns: { flexDirection: 'row', gap: 10 },
  exportBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1,
  },
  exportBtnText: { fontSize: 14, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  emptyTitle: { fontSize: 16, marginTop: 4 },
  emptyDesc: { fontSize: 12, textAlign: 'center', maxWidth: 220, lineHeight: 18, color: '#888' },
  emptyButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginTop: 8, minHeight: 44,
  },
  emptyButtonText: { fontSize: 12, fontWeight: '600', color: '#000' },
});
