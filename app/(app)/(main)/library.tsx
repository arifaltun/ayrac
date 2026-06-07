import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Image,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useBooks, Book } from '@/context/BooksContext';
import { useGoal } from '@/context/GoalContext';
import { fonts } from '@/constants/tokens';

const MONTHS_TR = [
  'Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
  'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık',
];

function BookCover({ color, size = 44, coverImage }: { color: string; size?: number; coverImage?: string }) {
  if (coverImage) {
    return (
      <Image
        source={{ uri: coverImage }}
        style={{ width: size * 0.68, height: size, borderRadius: 3 }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={{ width: size * 0.68, height: size, borderRadius: 3, backgroundColor: color, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: 'rgba(0,0,0,0.2)' }} />
    </View>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1,2,3,4,5].map((i) => (
        <Ionicons key={i} name="star" size={11} color={i <= value ? '#f5a124' : '#333'} />
      ))}
    </View>
  );
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
    <Pressable
      onPress={() => router.push({ pathname: '/edit-book' as any, params: { id: book.id } })}
      style={[styles.bookRow, { backgroundColor: t.surface, borderColor }]}
    >
      <BookCover color={book.color} size={44} coverImage={book.coverImage} />
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
            <Stars value={book.rating} />
          </View>
        )}
      </View>
      <View style={[styles.badge, { backgroundColor: badgeBg }]}>
        <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
      </View>
    </Pressable>
  );
}

function SectionHeader({ label }: { label: string }) {
  const { t } = useTheme();
  return (
    <Text style={[styles.sectionHeader, { color: t.muted }]}>{label}</Text>
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
      <Pressable
        style={[styles.emptyButton, { backgroundColor: t.primary }]}
        onPress={() => router.push('/add-book' as any)}
      >
        <Ionicons name="add" size={14} color="#000" />
        <Text style={[styles.emptyButtonText, { color: '#000' }]}>İlk kitabı ekle</Text>
      </Pressable>
    </View>
  );
}

type ViewMode = 'monthly' | 'yearly';

export default function LibraryScreen() {
  const { t, isDark, toggle } = useTheme();
  const { books } = useBooks();
  const { yearlyGoal, monthlyGoal, setYearlyGoal, setMonthlyGoal } = useGoal();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [view, setView] = useState<ViewMode>('monthly');
  const [monthIndex, setMonthIndex] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  const reading = books.filter((b) => b.status === 'reading');
  const want = books.filter((b) => b.status === 'want');

  const finishedInPeriod = books.filter((b) => {
    if (b.status !== 'finished') return false;
    const d = new Date(b.createdAt);
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

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
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
            style={[styles.iconBtn, { backgroundColor: t.surface, borderColor: t.border }]}
            onPress={toggle}
          >
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={14} color={t.muted} />
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
              <Text style={[styles.goalSetText, { color: t.muted }]}>Koy</Text>
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

            <Pressable
              style={[styles.addRow, { borderColor: t.borderStrong }]}
              onPress={() => router.push('/add-book' as any)}
            >
              <Ionicons name="add" size={14} color={t.muted} />
              <Text style={[styles.addRowText, { color: t.muted }]}>Kitap ekle</Text>
            </Pressable>
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
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  viewToggle: { flexDirection: 'row', borderRadius: 999, padding: 2, borderWidth: 1 },
  viewBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  viewBtnText: { fontSize: 11, fontWeight: '500' },
  periodRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingBottom: 4,
  },
  periodBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  periodLabel: { fontSize: 13, fontWeight: '600', letterSpacing: -0.2 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 10 },
  statBox: { flex: 1, borderRadius: 14, padding: 12, borderWidth: 1 },
  statLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' },
  statValue: { fontSize: 34, lineHeight: 38, marginTop: 4, letterSpacing: -0.5 },
  statSub: { fontSize: 11, marginTop: 3 },
  listContent: { paddingHorizontal: 20, paddingBottom: 16, gap: 7 },
  sectionHeader: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 6, marginBottom: 2 },
  bookRow: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    borderRadius: 12, padding: 9, borderWidth: 1,
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
});
