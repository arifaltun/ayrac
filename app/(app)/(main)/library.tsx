import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Image, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, DevSettings,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/context/ThemeContext';
import { useBooks, Book } from '@/context/BooksContext';
import { useGoal } from '@/context/GoalContext';
import { fonts, BOOK_COLORS } from '@/constants/tokens';
import { ScalePressable } from '@/components/ScalePressable';
import { BookCover } from '@/components/BookCover';
import { RatingText } from '@/components/RatingText';
import { ProFeatureGate } from '@/components/ProFeatureGate';
import { usePro } from '@/context/ProContext';
import {
  loadReminderSettings, saveReminderSettings, scheduleReminder,
  cancelReminder, requestNotificationPermission, computeStreak, ReminderSettings,
} from '@/utils/notifications';
import { normalizeAuthorName } from '@/utils/authorName';
import { loadActiveSession, clearActiveSession } from '@/utils/activeSession';

const MONTHS_TR = [
  'Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
  'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık',
];

// Bitirilen kitaplar dönem hesaplarında bitirme tarihiyle sayılır
const finishedDate = (b: Book) => b.finishedAt ?? b.createdAt;

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  if (h < 23) return 'İyi akşamlar';
  return 'İyi geceler';
}

function StatBox({ label, value, sub, highlight }: {
  label: string; value: string | number; sub?: string; highlight?: boolean;
}) {
  const { t } = useTheme();
  return (
    <View style={[styles.statBox, { backgroundColor: t.surface, borderColor: t.border }]}>
      <Text style={[styles.statLabel, { color: t.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: t.fg, fontFamily: fonts.serif }]}>{value}</Text>
      {sub && <Text style={[styles.statSub, { color: highlight ? t.primary : t.muted }]}>{sub}</Text>}
    </View>
  );
}

function BookRow({ book }: { book: Book }) {
  const { t } = useTheme();
  const router = useRouter();
  const isReading = book.status === 'reading';
  const isWant = book.status === 'want';

  const borderColor = isReading ? t.primary : isWant ? t.accent : t.border;
  const badgeBg = isWant ? `${t.accent}18` : t.primarySoft;
  const badgeColor = isReading ? t.primaryDeep : isWant ? t.accent : t.primary;
  const badgeLabel = isReading ? 'Devam' : isWant ? 'Okuyacağım' : 'Bitti';

  return (
    <ScalePressable
      scale={0.97}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/edit-book' as any, params: { id: book.id } }); }}
      style={[styles.bookRow, { backgroundColor: t.surface, borderColor }]}
    >
      <BookCover color={book.color} size={44} coverImage={book.coverImage} title={book.title} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.bookTitle, { color: t.fg }]} numberOfLines={1}>{book.title}</Text>
        <Text style={[styles.bookAuthor, { color: t.muted }]} numberOfLines={1}>{book.author}</Text>
        {isReading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <View style={[styles.dot, { backgroundColor: t.primary }]} />
            <Text style={[styles.readingText, { color: t.primary }]}>
              Şu an okunuyor · {book.pages > 0 ? `${book.pages} sayfa` : ''}
            </Text>
          </View>
        ) : isWant ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <Ionicons name="bookmark-outline" size={11} color={t.accent} />
            <Text style={[styles.readingText, { color: t.accent }]}>
              {book.pages > 0 ? `${book.pages} sayfa` : 'Okuma listesinde'}
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 3 }}>
            <RatingText value={book.rating} size={12} />
          </View>
        )}
      </View>
      <View style={[styles.badge, { backgroundColor: badgeBg }]}>
        <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
      </View>
    </ScalePressable>
  );
}

function SectionHeader({ label }: { label: string }) {
  const { t } = useTheme();
  return (
    <Text style={[styles.sectionHeader, { color: t.muted }]}>{label}</Text>
  );
}

function ReviewRow({ book }: { book: Book }) {
  const { t } = useTheme();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const preview = book.review!.length > 120 && !expanded
    ? book.review!.slice(0, 120).trimEnd() + '…'
    : book.review!;

  return (
    <Pressable
      style={[styles.reviewRow, { backgroundColor: t.surface, borderColor: t.border }]}
      onPress={() => book.review!.length > 120 && setExpanded((e) => !e)}
    >
      <View style={styles.reviewRowTop}>
        <BookCover color={book.color} size={36} coverImage={book.coverImage} title={book.title} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.bookTitle, { color: t.fg, fontSize: 13 }]} numberOfLines={1}>{book.title}</Text>
          {book.rating > 0 && <RatingText value={book.rating} size={12} />}
        </View>
        <Pressable
          onPress={() => router.push({ pathname: '/edit-book' as any, params: { id: book.id } })}
          style={[styles.reviewEditBtn, { backgroundColor: t.bgSoft }]}
        >
          <Ionicons name="create-outline" size={13} color={t.muted} />
        </Pressable>
      </View>
      <Text style={[styles.reviewText, { color: t.mutedStrong }]}>
        {preview}
      </Text>
      {book.review!.length > 120 && (
        <Text style={[styles.reviewToggle, { color: t.primary }]}>
          {expanded ? 'Daha az göster' : 'Devamını gör'}
        </Text>
      )}
    </Pressable>
  );
}

const MONTHS_SHORT = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

type Recommendation = {
  key: string;
  title: string;
  author: string;
  pages: number;
  coverId: number | null;
  genre: string;
};

function RecommendationCard({ rec, onAdd, added }: {
  rec: Recommendation;
  onAdd: (rec: Recommendation) => void;
  added: boolean;
}) {
  const { t } = useTheme();
  const coverUri = rec.coverId
    ? `https://covers.openlibrary.org/b/id/${rec.coverId}-M.jpg`
    : null;

  return (
    <View style={[recStyles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      {coverUri ? (
        <Image source={{ uri: coverUri }} style={recStyles.cover} resizeMode="cover" />
      ) : (
        <View style={[recStyles.cover, { backgroundColor: t.bgSoft, alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="book-outline" size={20} color={t.mutedStrong} />
        </View>
      )}
      <Text style={[recStyles.title, { color: t.fg }]} numberOfLines={2}>{rec.title}</Text>
      <Text style={[recStyles.author, { color: t.muted }]} numberOfLines={1}>{rec.author}</Text>
      <Pressable
        onPress={() => !added && onAdd(rec)}
        style={[recStyles.addBtn, { backgroundColor: added ? t.bgSoft : t.primary, borderColor: added ? t.border : t.primary }]}
      >
        <Ionicons name={added ? 'checkmark' : 'add'} size={14} color={added ? t.muted : '#000'} />
      </Pressable>
    </View>
  );
}

const recStyles = StyleSheet.create({
  card: { width: 110, borderRadius: 12, padding: 10, borderWidth: 1, gap: 5 },
  cover: { width: '100%', height: 80, borderRadius: 6, marginBottom: 4 },
  title: { fontSize: 12, fontWeight: '600', lineHeight: 16, letterSpacing: -0.1 },
  author: { fontSize: 10, lineHeight: 14 },
  addBtn: {
    marginTop: 4, height: 28, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
});

function GoalDetailCard({ view, year, monthIndex, finishedInPeriod, activeGoal }: {
  view: ViewMode;
  year: number;
  monthIndex: number;
  finishedInPeriod: Book[];
  activeGoal: number;
}) {
  const { t } = useTheme();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isCurrentPeriod = view === 'yearly'
    ? year === today.getFullYear()
    : year === today.getFullYear() && monthIndex === today.getMonth();

  // Build bar data
  const bars: { label: string; count: number; isCurrent: boolean }[] = view === 'monthly'
    ? (() => {
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        const starts = [1, 8, 15, 22, 29].filter((d) => d <= daysInMonth);
        return starts.map((startDay, i) => {
          const endDay = starts[i + 1] ? starts[i + 1] - 1 : daysInMonth;
          const count = finishedInPeriod.filter((b) => {
            const d = new Date(finishedDate(b)).getDate();
            return d >= startDay && d <= endDay;
          }).length;
          const isCurrent = isCurrentPeriod
            && today.getDate() >= startDay && today.getDate() <= endDay;
          return { label: `H${i + 1}`, count, isCurrent };
        });
      })()
    : MONTHS_SHORT.map((label, mi) => ({
        label,
        count: finishedInPeriod.filter((b) => new Date(finishedDate(b)).getMonth() === mi).length,
        isCurrent: isCurrentPeriod && today.getMonth() === mi,
      }));

  const maxCount = Math.max(...bars.map((b) => b.count), 1);
  const done = finishedInPeriod.length;
  const booksLeft = Math.max(activeGoal - done, 0);
  const goalMet = done >= activeGoal;

  // Projection
  let projectionText = '';
  let timeLeftText = '';

  if (goalMet) {
    projectionText = 'Hedefe ulaştın!';
  } else if (isCurrentPeriod && booksLeft > 0) {
    let daysLeft = 0;
    if (view === 'monthly') {
      daysLeft = new Date(year, monthIndex + 1, 0).getDate() - today.getDate();
    } else {
      daysLeft = Math.ceil(
        (new Date(year, 11, 31).getTime() - today.getTime()) / 86400000
      );
    }
    const weeksLeft = daysLeft / 7;
    if (weeksLeft > 0.5) {
      const perWeek = Math.ceil(booksLeft / weeksLeft);
      projectionText = `Hedefe ulaşmak için haftada ${perWeek} kitap`;
      timeLeftText = view === 'monthly'
        ? `${daysLeft} gün kaldı`
        : `${Math.ceil(daysLeft / 30)} ay kaldı`;
    }
  }

  const BAR_H = 52;

  return (
    <View style={[styles.goalDetailCard, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={styles.goalDetailHeader}>
        <Text style={[styles.goalDetailTitle, { color: t.muted }]}>HEDEF DETAYI</Text>
        {timeLeftText ? (
          <Text style={[styles.goalDetailTime, { color: t.muted }]}>{timeLeftText}</Text>
        ) : null}
      </View>

      {projectionText ? (
        <Text style={[
          styles.goalDetailProjection,
          { color: goalMet ? '#4ecb91' : t.primary, fontFamily: fonts.serifMedium },
        ]}>
          {projectionText}
        </Text>
      ) : null}

      {/* Bar chart */}
      <View style={[styles.barChartRow, view === 'yearly' && { gap: 3 }]}>
        {bars.map((bar, i) => (
          <View key={i} style={styles.barChartCol}>
            <View style={[styles.barChartTrack, { backgroundColor: t.bgSoft, height: BAR_H }]}>
              {bar.count > 0 && (
                <View style={[
                  styles.barChartFill,
                  {
                    backgroundColor: bar.isCurrent ? t.primary : t.primarySoft,
                    borderColor: bar.isCurrent ? t.primary : 'transparent',
                    height: `${Math.max((bar.count / maxCount) * 100, 14)}%`,
                  },
                ]} />
              )}
            </View>
            {bar.count > 0 && (
              <Text style={[styles.barCount, { color: bar.isCurrent ? t.primary : t.fg }]}>
                {bar.count}
              </Text>
            )}
            <Text style={[styles.barLabel, {
              color: bar.isCurrent ? t.primary : t.muted,
              fontSize: view === 'yearly' ? 8 : 10,
            }]}>
              {bar.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function EmptyState() {
  const { t } = useTheme();
  const router = useRouter();
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: t.surface, borderColor: t.border }]}>
        <Ionicons name="bookmark-outline" size={24} color={t.mutedStrong} />
      </View>
      <Text style={[styles.emptyTitle, { color: t.fg, fontFamily: fonts.serifMedium }]}>
        Henüz kitap yok
      </Text>
      <Text style={[styles.emptyDesc, { color: t.muted }]}>
        İlk kitabını ekle; ay sonunda kişisel özetin hazır olsun.
      </Text>
      <ScalePressable
        scale={0.96}
        style={[styles.emptyButton, { backgroundColor: t.primary }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/add-book' as any); }}
      >
        <Ionicons name="add" size={14} color="#000" />
        <Text style={[styles.emptyButtonText, { color: '#000' }]}>İlk kitabı ekle</Text>
      </ScalePressable>
    </View>
  );
}

type ViewMode = 'monthly' | 'yearly';

export default function LibraryScreen() {
  const { t, isDark, toggle } = useTheme();
  const { books, sessions, addBook, updateBook, addSession, resetAll } = useBooks();
  const { yearlyGoal, monthlyGoal, setYearlyGoal, setMonthlyGoal } = useGoal();
  const { isPro, showPaywall, toggleProForDev } = usePro();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [view, setView] = useState<ViewMode>('monthly');
  const [monthIndex, setMonthIndex] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recGenre, setRecGenre] = useState('');
  const [fetchingRecs, setFetchingRecs] = useState(false);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const fetchedRef = useRef(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [resetConfirmVisible, setResetConfirmVisible] = useState(false);
  const [reminderVisible, setReminderVisible] = useState(false);
  const [reminder, setReminder] = useState<ReminderSettings>({ enabled: false, hour: 20, minute: 0 });
  const [reminderHourInput, setReminderHourInput] = useState('20');
  const [reminderMinInput, setReminderMinInput] = useState('00');
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('@ayrac_user_name').then(setUserName);
  }, []);

  // Uygulama okuma modundayken öldürüldüyse yarım kalan oturumu kurtar.
  // Kitaplar yüklendikten sonra bir kez çalışır; okuma modu açıkken çalışmaz
  // çünkü iz ancak okuma modu açılınca yazılır, bu kontrol ondan öncedir.
  const sessionRecoveryRef = useRef(false);
  useEffect(() => {
    if (sessionRecoveryRef.current || books.length === 0) return;
    sessionRecoveryRef.current = true;
    loadActiveSession().then((active) => {
      if (!active) return;
      const book = books.find((b) => b.id === active.bookId);
      const duration = Math.floor((active.lastTick - active.startedAt) / 1000);
      // Kitap silinmiş ya da oturum 1 dk'dan kısaysa sessizce temizle
      if (!book || duration < 60) { clearActiveSession(); return; }
      const minutes = Math.max(1, Math.round(duration / 60));
      Alert.alert(
        'Yarım kalan okuma oturumu',
        `"${book.title}" için kaydedilmemiş ${minutes} dakikalık okuma bulundu. Süreye eklensin mi?`,
        [
          { text: 'Sil', style: 'destructive', onPress: () => { clearActiveSession(); } },
          {
            text: 'Kaydet',
            onPress: () => {
              addSession({ bookId: book.id, duration, date: active.lastTick });
              updateBook({ ...book, readingTime: (book.readingTime ?? 0) + duration });
              clearActiveSession();
            },
          },
        ],
      );
    });
  }, [books, addSession, updateBook]);

  const reading = books.filter((b) => b.status === 'reading');
  const want = books.filter((b) => b.status === 'want');
  const reviewed = books.filter((b) => b.status === 'finished' && b.review && b.review.length >= 50);

  const finishedInPeriod = books.filter((b) => {
    if (b.status !== 'finished') return false;
    const d = new Date(finishedDate(b));
    if (view === 'yearly') return d.getFullYear() === year;
    return d.getFullYear() === year && d.getMonth() === monthIndex;
  });
  const finished = books.filter((b) => b.status === 'finished');
  const pages = finishedInPeriod.reduce((s, b) => s + b.pages, 0);

  const activeGoal = view === 'yearly' ? yearlyGoal : monthlyGoal;
  const goalProgress = activeGoal != null
    ? `${finishedInPeriod.length}/${activeGoal}`
    : null;
  const goalPct = activeGoal && activeGoal > 0
    ? Math.min(finishedInPeriod.length / activeGoal, 1)
    : 0;

  const openGoalModal = () => {
    setGoalInput(activeGoal != null ? String(activeGoal) : '');
    setGoalModalVisible(true);
  };

  const saveGoal = () => {
    const n = parseInt(goalInput);
    const val = isNaN(n) || n <= 0 ? null : n;
    if (view === 'yearly') setYearlyGoal(val);
    else setMonthlyGoal(val);
    setGoalModalVisible(false);
  };

  const periodLabel = view === 'monthly' ? `${MONTHS_TR[monthIndex]} ${year}` : `${year}`;

  // Fetch personalised recommendations once we have enough data (Pro'ya özel)
  useEffect(() => {
    if (!isPro || fetchedRef.current || finished.length < 1) return;

    const genreCounts: Record<string, number> = {};
    finished.forEach((b) => { if (b.genre) genreCounts[b.genre] = (genreCounts[b.genre] ?? 0) + 1; });
    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!topGenre) return;

    fetchedRef.current = true;
    setRecGenre(topGenre);
    setFetchingRecs(true);

    const ownTitles = new Set(books.map((b) => b.title.toLowerCase()));

    fetch(
      `https://openlibrary.org/search.json?subject=${encodeURIComponent(topGenre)}&limit=25&fields=key,title,author_name,cover_i,number_of_pages_median`,
    )
      .then((r) => r.json())
      .then((json) => {
        const recs: Recommendation[] = (json.docs ?? [])
          .filter((d: any) => d.title && d.author_name?.[0] && !ownTitles.has(d.title.toLowerCase()))
          .slice(0, 10)
          .map((d: any) => ({
            key: d.key,
            title: d.title,
            author: normalizeAuthorName(d.author_name[0]),
            pages: d.number_of_pages_median ?? 0,
            coverId: d.cover_i ?? null,
            genre: topGenre,
          }));
        setRecommendations(recs);
      })
      .catch(() => {})
      .finally(() => setFetchingRecs(false));
  }, [finished.length, isPro]);

  // Load reminder settings on mount
  useEffect(() => {
    loadReminderSettings().then((s) => {
      setReminder(s);
      setReminderHourInput(String(s.hour).padStart(2, '0'));
      setReminderMinInput(String(s.minute).padStart(2, '0'));
    });
  }, []);

  const openReminderModal = () => {
    setReminderHourInput(String(reminder.hour).padStart(2, '0'));
    setReminderMinInput(String(reminder.minute).padStart(2, '0'));
    setReminderVisible(true);
  };

  const saveReminder = async (enabled: boolean) => {
    const hour = Math.min(23, Math.max(0, parseInt(reminderHourInput) || 20));
    const minute = Math.min(59, Math.max(0, parseInt(reminderMinInput) || 0));
    const settings: ReminderSettings = { enabled, hour, minute };

    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) { setReminderVisible(false); return; }
      const currentBook = reading[0]?.title ?? null;
      await scheduleReminder(settings, currentBook, computeStreak(sessions));
    } else {
      await cancelReminder();
    }

    await saveReminderSettings(settings);
    setReminder(settings);
    setReminderVisible(false);
  };

  const handleAddRecommendation = (rec: Recommendation) => {
    if (!isPro && books.length >= 5) { showPaywall('book_limit'); return; }
    const color = BOOK_COLORS[Math.floor(Math.random() * BOOK_COLORS.length)];
    const coverImage = rec.coverId
      ? `https://covers.openlibrary.org/b/id/${rec.coverId}-M.jpg`
      : undefined;
    addBook({ title: rec.title, author: rec.author, pages: rec.pages, genre: rec.genre, status: 'want', color, rating: 0, coverImage });
    setAddedKeys((prev) => new Set([...prev, rec.key]));
    fetchedRef.current = false; // allow re-fetch with updated ownTitles next time
  };

  const isOlderThan3Months = (mi: number, yr: number) => {
    const today = new Date();
    const cutoff = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    return new Date(yr, mi, 1) < cutoff;
  };

  const onPrev = () => {
    if (view === 'monthly') {
      const newM = monthIndex === 0 ? 11 : monthIndex - 1;
      const newY = monthIndex === 0 ? year - 1 : year;
      if (!isPro && isOlderThan3Months(newM, newY)) { showPaywall('history'); return; }
      monthIndex === 0 ? (setMonthIndex(11), setYear((y) => y - 1)) : setMonthIndex((m) => m - 1);
    } else {
      if (!isPro && year - 1 < new Date().getFullYear()) { showPaywall('history'); return; }
      setYear((y) => y - 1);
    }
  };
  const onNext = () => {
    if (view === 'monthly') {
      monthIndex === 11 ? (setMonthIndex(0), setYear((y) => y + 1)) : setMonthIndex((m) => m + 1);
    } else setYear((y) => y + 1);
  };

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      {/* Settings modal */}
      <Modal visible={settingsVisible} transparent animationType="slide" onRequestClose={() => setSettingsVisible(false)}>
        <Pressable style={styles.settingsBackdrop} onPress={() => setSettingsVisible(false)}>
          <Pressable style={[styles.settingsCard, { backgroundColor: t.surface }]} onPress={() => {}}>
            <View style={[styles.handle, { backgroundColor: t.border }]} />
            <Text style={[styles.settingsTitle, { color: t.fg, fontFamily: fonts.serifMedium }]}>Ayarlar</Text>

            {/* Pro status */}
            {isPro ? (
              <View style={[styles.settingsRow, { borderColor: t.border }]}>
                <View style={styles.settingsRowLeft}>
                  <Ionicons name="star" size={16} color={t.warning} />
                  <Text style={[styles.settingsRowLabel, { color: t.fg }]}>Pro plan</Text>
                </View>
                <View style={[styles.proBadge, { backgroundColor: t.primarySoft }]}>
                  <Text style={[styles.proBadgeText, { color: t.primary }]}>AKTİF</Text>
                </View>
              </View>
            ) : (
              <Pressable
                style={[styles.settingsRow, styles.upgradeRow, { borderColor: t.primary, backgroundColor: t.primarySoft }]}
                onPress={() => { setSettingsVisible(false); showPaywall('book_limit'); }}
              >
                <View style={styles.settingsRowLeft}>
                  <Ionicons name="star-outline" size={16} color={t.primary} />
                  <Text style={[styles.settingsRowLabel, { color: t.primary }]}>Pro’ya Geç · ₺29,99/ay</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={t.primary} />
              </Pressable>
            )}

            <View style={[styles.settingsDivider, { backgroundColor: t.border }]} />

            {/* Theme */}
            <Pressable
              style={[styles.settingsRow, { borderColor: t.border }]}
              onPress={() => { toggle(); Haptics.selectionAsync(); }}
            >
              <View style={styles.settingsRowLeft}>
                <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={16} color={t.muted} />
                <Text style={[styles.settingsRowLabel, { color: t.fg }]}>{isDark ? 'Karanlık tema' : 'Açık tema'}</Text>
              </View>
              <Text style={[styles.settingsRowMeta, { color: t.muted }]}>{isDark ? 'Açığa geç' : 'Karanlığa geç'}</Text>
            </Pressable>

            {/* Notifications */}
            <Pressable
              style={[styles.settingsRow, { borderColor: t.border }]}
              onPress={() => { setSettingsVisible(false); openReminderModal(); }}
            >
              <View style={styles.settingsRowLeft}>
                <Ionicons name={reminder.enabled ? 'notifications' : 'notifications-outline'} size={16} color={t.muted} />
                <Text style={[styles.settingsRowLabel, { color: t.fg }]}>Günlük hatırlatıcı</Text>
              </View>
              <Text style={[styles.settingsRowMeta, { color: reminder.enabled ? t.primary : t.muted }]}>
                {reminder.enabled ? `${String(reminder.hour).padStart(2,'0')}:${String(reminder.minute).padStart(2,'0')}` : 'Kapalı'}
              </Text>
            </Pressable>

            <View style={[styles.settingsDivider, { backgroundColor: t.border }]} />

            {/* Reset */}
            <Pressable
              style={[styles.settingsRow, { borderColor: t.border }]}
              onPress={() => { setSettingsVisible(false); setResetConfirmVisible(true); }}
            >
              <View style={styles.settingsRowLeft}>
                <Ionicons name="trash-outline" size={16} color={t.orange} />
                <Text style={[styles.settingsRowLabel, { color: t.orange }]}>Tüm verileri sil</Text>
              </View>
            </Pressable>

            {/* Yalnızca geliştirmede: Free/Pro deneyimleri arasında geçiş */}
            {__DEV__ && (
              <Pressable
                style={[styles.settingsRow, { borderColor: t.border }]}
                onPress={() => { Haptics.selectionAsync(); toggleProForDev(); }}
              >
                <View style={styles.settingsRowLeft}>
                  <Ionicons name={isPro ? 'star' : 'star-outline'} size={16} color={t.warning} />
                  <Text style={[styles.settingsRowLabel, { color: t.fg }]}>
                    Pro&apos;yu {isPro ? 'kapat' : 'aç'} (test)
                  </Text>
                </View>
                <Text style={[styles.settingsRowMeta, { color: isPro ? t.primary : t.muted }]}>
                  {isPro ? 'PRO' : 'FREE'} · DEV
                </Text>
              </Pressable>
            )}

            {/* Yalnızca geliştirmede: ilk kullanıcı deneyimini test etmek için tam sıfırlama */}
            {__DEV__ && (
              <Pressable
                style={[styles.settingsRow, { borderColor: t.border }]}
                onPress={async () => {
                  console.log('[DevReset] AsyncStorage temizleniyor, uygulama yeniden başlatılıyor');
                  await AsyncStorage.clear();
                  DevSettings.reload();
                }}
              >
                <View style={styles.settingsRowLeft}>
                  <Ionicons name="refresh-outline" size={16} color={t.orange} />
                  <Text style={[styles.settingsRowLabel, { color: t.orange }]}>Tüm verileri sıfırla (test)</Text>
                </View>
                <Text style={[styles.settingsRowMeta, { color: t.mutedStrong }]}>DEV</Text>
              </Pressable>
            )}

            <Text style={[styles.settingsVersion, { color: t.mutedStrong }]}>ayraç v1.0</Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Reset confirm modal */}
      <Modal visible={resetConfirmVisible} transparent animationType="fade" onRequestClose={() => setResetConfirmVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: t.surface }]}>
            <Text style={[styles.modalTitle, { color: t.fg, fontFamily: fonts.serifMedium }]}>Verileri sil</Text>
            <Text style={[styles.modalDesc, { color: t.muted }]}>Tüm kitaplar, okuma süreleri ve istatistikler kalıcı olarak silinecek. Bu işlem geri alınamaz.</Text>
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, { backgroundColor: t.bgSoft }]} onPress={() => setResetConfirmVisible(false)}>
                <Text style={[styles.modalBtnText, { color: t.muted }]}>İptal</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: t.orange, flex: 1 }]}
                onPress={async () => {
                  await resetAll();
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  setResetConfirmVisible(false);
                }}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Sil</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reminder modal */}
      <Modal visible={reminderVisible} transparent animationType="fade" onRequestClose={() => setReminderVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.modalBackdrop} onPress={() => setReminderVisible(false)}>
            <Pressable style={[styles.modalCard, { backgroundColor: t.surface }]} onPress={() => {}}>
              <Text style={[styles.modalTitle, { color: t.fg, fontFamily: fonts.serifMedium }]}>
                Günlük hatırlatıcı
              </Text>
              <Text style={[styles.modalDesc, { color: t.muted }]}>
                Her gün belirlediğin saatte şu an okuduğun kitabı ve okuma serini gösterir.
              </Text>
              <View style={styles.reminderTimeRow}>
                <TextInput
                  style={[styles.reminderTimeInput, { backgroundColor: t.bgSoft, borderColor: t.border, color: t.fg }]}
                  value={reminderHourInput}
                  onChangeText={(v) => setReminderHourInput(v.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="20"
                  placeholderTextColor={t.mutedStrong}
                />
                <Text style={[styles.reminderColon, { color: t.fg }]}>:</Text>
                <TextInput
                  style={[styles.reminderTimeInput, { backgroundColor: t.bgSoft, borderColor: t.border, color: t.fg }]}
                  value={reminderMinInput}
                  onChangeText={(v) => setReminderMinInput(v.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="00"
                  placeholderTextColor={t.mutedStrong}
                />
              </View>
              <View style={styles.modalButtons}>
                {reminder.enabled && (
                  <Pressable style={[styles.modalBtn, { backgroundColor: t.bgSoft }]} onPress={() => saveReminder(false)}>
                    <Text style={[styles.modalBtnText, { color: t.orange }]}>Kapat</Text>
                  </Pressable>
                )}
                <Pressable style={[styles.modalBtn, { backgroundColor: t.primary, flex: 1 }]} onPress={() => saveReminder(true)}>
                  <Text style={[styles.modalBtnText, { color: '#000' }]}>Ayarla</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Goal modal */}
      <Modal visible={goalModalVisible} transparent animationType="fade" onRequestClose={() => setGoalModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.modalBackdrop} onPress={() => setGoalModalVisible(false)}>
            <Pressable style={[styles.modalCard, { backgroundColor: t.surface }]} onPress={() => {}}>
              <Text style={[styles.modalTitle, { color: t.fg, fontFamily: fonts.serifMedium }]}>
                {view === 'yearly' ? 'Yıllık' : 'Aylık'} okuma hedefi
              </Text>
              <Text style={[styles.modalDesc, { color: t.muted }]}>
                {view === 'yearly' ? `${year}` : `${MONTHS_TR[monthIndex]} ${year}`} için kaç kitap okumak istiyorsun?
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: t.bgSoft, borderColor: t.border, color: t.fg }]}
                value={goalInput}
                onChangeText={setGoalInput}
                placeholder="12"
                placeholderTextColor={t.mutedStrong}
                keyboardType="number-pad"
                autoFocus
              />
              <View style={styles.modalButtons}>
                {activeGoal != null && (
                  <Pressable
                    style={[styles.modalBtn, { backgroundColor: t.bgSoft }]}
                    onPress={() => { if (view === 'yearly') setYearlyGoal(null); else setMonthlyGoal(null); setGoalModalVisible(false); }}
                  >
                    <Text style={[styles.modalBtnText, { color: t.orange }]}>Kaldır</Text>
                  </Pressable>
                )}
                <Pressable style={[styles.modalBtn, { backgroundColor: t.primary, flex: 1 }]} onPress={saveGoal}>
                  <Text style={[styles.modalBtnText, { color: '#000' }]}>Kaydet</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.logoRow}>
          <View style={[styles.logoMark, { backgroundColor: t.primary }]}>
            <Ionicons name="bookmark" size={14} color="#000" />
          </View>
          <Text style={[styles.logoText, { color: t.fg, fontFamily: fonts.serif }]}>ayraç</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: t.surface, borderColor: reminder.enabled ? t.primary : t.border }]}
            onPress={openReminderModal}
            accessibilityLabel={reminder.enabled ? 'Günlük hatırlatıcıyı düzenle' : 'Günlük hatırlatıcı kur'}
            accessibilityRole="button"
          >
            <Ionicons name={reminder.enabled ? 'notifications' : 'notifications-outline'} size={14} color={reminder.enabled ? t.primary : t.muted} />
          </Pressable>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: t.surface, borderColor: t.border }]}
            onPress={() => setSettingsVisible(true)}
            accessibilityLabel="Ayarlar"
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={14} color={t.muted} />
          </Pressable>
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
      </View>

      {/* Greeting */}
      <Text style={[styles.greeting, { color: t.muted, fontFamily: fonts.serifRegular }]}>
        {greeting()}{userName ? `, ${userName}` : ''}.
      </Text>

      {/* Free tier banner */}
      {!isPro && books.length >= 3 && (
        <Pressable
          style={[styles.freeBanner, { backgroundColor: t.surface, borderColor: t.border }]}
          onPress={() => showPaywall('book_limit')}
          accessibilityRole="button"
          accessibilityLabel="Pro'ya geç"
        >
          <Text style={[styles.freeBannerText, { color: t.muted }]}>
            <Text style={{ color: t.fg, fontWeight: '600' }}>{books.length}/5</Text> kitap · Sınırsız için Pro’ya geç
          </Text>
          <Ionicons name="chevron-forward" size={12} color={t.mutedStrong} />
        </Pressable>
      )}

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

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatBox label="KİTAP" value={finishedInPeriod.length} sub="bu dönem" highlight={finishedInPeriod.length > 0} />
        <StatBox label="SAYFA" value={pages > 0 ? pages.toLocaleString('tr-TR') : '0'} sub="bu dönem" />
        <Pressable
          onPress={openGoalModal}
          style={[styles.statBox, styles.goalBox, { backgroundColor: t.surface, borderColor: goalProgress ? t.primary : t.border }]}
        >
          <Text style={[styles.statLabel, { color: t.muted }]}>HEDEF</Text>
          {goalProgress ? (
            <>
              <Text style={[styles.statValue, { color: t.fg, fontFamily: fonts.serif }]}>{goalProgress}</Text>
              <View style={[styles.goalTrack, { backgroundColor: t.bgSoft }]}>
                <View style={[styles.goalFill, { backgroundColor: t.primary, width: `${Math.round(goalPct * 100)}%` }]} />
              </View>
            </>
          ) : (
            <>
              <Ionicons name="flag-outline" size={20} color={t.mutedStrong} style={{ marginTop: 6 }} />
              <Text style={[styles.goalSetText, { color: t.muted }]}>Hedef koy</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {activeGoal != null && (
          <GoalDetailCard
            view={view}
            year={year}
            monthIndex={monthIndex}
            finishedInPeriod={finishedInPeriod}
            activeGoal={activeGoal}
          />
        )}

        {books.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {reading.length > 0 && (
              <>
                <SectionHeader label="OKUNUYOR" />
                {reading.map((b) => <BookRow key={b.id} book={b} />)}
              </>
            )}

            {finished.length > 0 && (
              <>
                <SectionHeader label="BİTİRİLENLER" />
                {finished.map((b) => <BookRow key={b.id} book={b} />)}
              </>
            )}

            {want.length > 0 && (
              <>
                <SectionHeader label="OKUNACAKLAR" />
                {want.map((b) => <BookRow key={b.id} book={b} />)}
              </>
            )}

            {reviewed.length > 0 && (
              <>
                <SectionHeader label="NOTLARIM" />
                {isPro ? (
                  reviewed.map((b) => <ReviewRow key={b.id} book={b} />)
                ) : (
                  <ProFeatureGate
                    trigger="review"
                    title="Notların Pro’da"
                    description={`${reviewed.length} kitap notun saklı duruyor — Pro ile erişebilirsin.`}
                  />
                )}
              </>
            )}

            {!isPro && finished.length > 0 && (
              <>
                <SectionHeader label="SANA ÖZEL" />
                <ProFeatureGate
                  trigger="recommendations"
                  title="Kitap önerileri Pro’da"
                  description="Okuduğun türlere göre seçilmiş öneriler."
                />
              </>
            )}

            {isPro && (fetchingRecs || recommendations.length > 0) && (
              <>
                <SectionHeader label={`SANA ÖZEL${recGenre ? ` · ${recGenre}` : ''}`} />
                {fetchingRecs ? (
                  <View style={styles.recLoading}>
                    <ActivityIndicator size="small" color={t.mutedStrong} />
                    <Text style={[styles.recLoadingText, { color: t.muted }]}>Öneriler yükleniyor…</Text>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recScroll}>
                    {recommendations.map((rec) => (
                      <RecommendationCard
                        key={rec.key}
                        rec={rec}
                        onAdd={handleAddRecommendation}
                        added={addedKeys.has(rec.key) || books.some((b) => b.title.toLowerCase() === rec.title.toLowerCase())}
                      />
                    ))}
                  </ScrollView>
                )}
              </>
            )}

            <ScalePressable
              scale={0.97}
              style={[styles.addRow, { borderColor: t.borderStrong }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/add-book' as any); }}
            >
              <Ionicons name="add" size={14} color={t.muted} />
              <Text style={[styles.addRowText, { color: t.muted }]}>Kitap ekle</Text>
            </ScalePressable>
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
    paddingHorizontal: 20, paddingBottom: 12,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 26, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  viewToggle: { flexDirection: 'row', borderRadius: 999, padding: 2, borderWidth: 1 },
  viewBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  viewBtnText: { fontSize: 11, fontWeight: '500' },
  freeBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, marginBottom: 4, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
  },
  freeBannerText: { fontSize: 12 },
  greeting: { fontSize: 14, paddingHorizontal: 20, marginBottom: 6, letterSpacing: -0.1 },
  periodRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 4,
  },
  periodBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  periodLabel: { fontSize: 13, fontWeight: '600', letterSpacing: -0.2 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 8 },
  statBox: { flex: 1, borderRadius: 14, padding: 12, borderWidth: 1 },
  statLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' },
  statValue: { fontSize: 34, lineHeight: 38, marginTop: 4, letterSpacing: -0.5 },
  statSub: { fontSize: 11, marginTop: 3 },
  listContent: { paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
  sectionHeader: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 14, marginBottom: 4 },
  bookRow: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    borderRadius: 12, padding: 11, borderWidth: 1,
  },
  bookTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  bookAuthor: { fontSize: 13, marginTop: 1 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  readingText: { fontSize: 11 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  emptyTitle: { fontSize: 16, marginTop: 4 },
  emptyDesc: { fontSize: 11, textAlign: 'center', maxWidth: 200, lineHeight: 17 },
  emptyButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginTop: 8,
  },
  emptyButtonText: { fontSize: 11, fontWeight: '600' },
  addRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 9,
  },
  addRowText: { fontSize: 13, fontWeight: '500' },
  goalBox: { alignItems: 'center', justifyContent: 'center', minHeight: 80 },
  goalTrack: { width: '100%', height: 3, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  goalFill: { height: '100%', borderRadius: 2 },
  goalSetText: { fontSize: 10, marginTop: 2 },
  goalDetailCard: {
    borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 0,
  },
  goalDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  goalDetailTitle: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  goalDetailTime: { fontSize: 11 },
  goalDetailProjection: { fontSize: 15, letterSpacing: -0.2, marginBottom: 14 },
  barChartRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-end' },
  barChartCol: { flex: 1, alignItems: 'center', gap: 3 },
  barChartTrack: { width: '100%', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  barChartFill: { width: '100%', borderRadius: 4, borderWidth: 1 },
  barCount: { fontSize: 10, fontWeight: '700' },
  barLabel: { fontWeight: '600', letterSpacing: 0.3 },
  reviewRow: {
    borderRadius: 12, padding: 11, borderWidth: 1, gap: 8,
  },
  reviewRowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewEditBtn: {
    width: 36, height: 36, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  reviewText: { fontSize: 13, lineHeight: 19, letterSpacing: 0.1 },
  reviewToggle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  recScroll: { marginHorizontal: -4 },
  recLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  recLoadingText: { fontSize: 12 },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28,
  },
  modalCard: {
    width: '100%', borderRadius: 20, padding: 24, gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  modalDesc: { fontSize: 13, lineHeight: 18 },
  modalInput: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 24, fontWeight: '700', textAlign: 'center',
  },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtn: { paddingVertical: 13, borderRadius: 12, alignItems: 'center', paddingHorizontal: 20 },
  modalBtnText: { fontSize: 14, fontWeight: '700' },
  reminderTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  reminderTimeInput: {
    borderWidth: 1, borderRadius: 12, width: 72, paddingVertical: 12,
    fontSize: 28, fontWeight: '700', textAlign: 'center',
  },
  reminderColon: { fontSize: 28, fontWeight: '700' },
  settingsBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  settingsCard: {
    width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  settingsTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, marginBottom: 12 },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14,
  },
  settingsRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingsRowLabel: { fontSize: 15, fontWeight: '500' },
  settingsRowMeta: { fontSize: 13 },
  proBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  proBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  upgradeRow: { borderRadius: 12, paddingHorizontal: 12, borderWidth: 1 },
  settingsDivider: { height: 1, marginVertical: 4 },
  settingsVersion: { fontSize: 11, textAlign: 'center', marginTop: 20 },
});
