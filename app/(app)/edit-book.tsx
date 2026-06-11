import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, Keyboard,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useBooks, Book } from '@/context/BooksContext';
import { usePro } from '@/context/ProContext';
import { fonts, BOOK_COLORS } from '@/constants/tokens';
import { ScalePressable } from '@/components/ScalePressable';
import { BookCover } from '@/components/BookCover';
import { PhotoPickerSheet } from '@/components/PhotoPickerSheet';
import { ProFeatureGate } from '@/components/ProFeatureGate';
import { KeyboardDoneBar, doneBarProps } from '@/components/KeyboardDoneBar';

function AnimatedStar({ active, onPress, size = 28, activeColor, inactiveColor }: {
  active: boolean; onPress: () => void; size?: number; activeColor: string; inactiveColor: string;
}) {
  const sv = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: sv.value }] }));

  const handlePress = () => {
    sv.value = withSequence(
      withSpring(1.45, { damping: 6, stiffness: 500 }),
      withSpring(1, { damping: 10, stiffness: 300 }),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable onPress={handlePress} hitSlop={6}>
      <Animated.View style={anim}>
        <Ionicons name={active ? 'star' : 'star-outline'} size={size} color={active ? activeColor : inactiveColor} />
      </Animated.View>
    </Pressable>
  );
}

type Status = 'reading' | 'finished' | 'want';

export default function EditBookScreen() {
  const { t } = useTheme();
  const { books, updateBook, deleteBook } = useBooks();
  const { isPro, showPaywall } = usePro();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const book = books.find((b) => b.id === id);

  const [title, setTitle] = useState(book?.title ?? '');
  const [author, setAuthor] = useState(book?.author ?? '');
  const [pages, setPages] = useState(book?.pages ? String(book.pages) : '');
  const [genre, setGenre] = useState(book?.genre ?? '');
  const [status, setStatus] = useState<Status>((book?.status as Status) ?? 'reading');
  const [rating, setRating] = useState(book?.rating ?? 0);
  const [color, setColor] = useState(book?.color ?? BOOK_COLORS[0]);
  const [coverImage, setCoverImage] = useState<string | undefined>(book?.coverImage);
  const [review, setReview] = useState(book?.review ?? '');
  const [quote, setQuote] = useState(book?.quote ?? '');
  const [pickerVisible, setPickerVisible] = useState(false);
  const closingRef = useRef(false);

  // Kitap bulunamazsa (silinmiş vs.) ekranı kapat — render sırasında değil
  useEffect(() => {
    if (!book && !closingRef.current) {
      closingRef.current = true;
      router.back();
    }
  }, [book, router]);

  if (!book) return null;

  const handleSave = () => {
    const updated: Book = {
      ...book,
      title: title.trim(),
      author: author.trim(),
      pages: parseInt(pages) || 0,
      genre: genre.trim(),
      status,
      rating: status === 'finished' ? rating : 0,
      color,
      coverImage,
      review:
        status === 'finished'
          ? review.trim().length === 0
            ? undefined
            : review.trim().length >= 50
            ? review.trim()
            : book.review
          : book.review,
      quote: quote.trim() ? quote.trim().slice(0, 200) : undefined,
    };
    updateBook(updated);
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(
      'Kitabı sil',
      `"${book.title}" kitaplığından kalıcı olarak silinecek.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            closingRef.current = true;
            deleteBook(book.id);
            router.back();
          },
        },
      ],
    );
  };

  const inputStyle = [styles.input, { backgroundColor: t.bgSoft, borderColor: t.border, color: t.fg }];

  return (
    <View style={{ flex: 1 }}>
      <KeyboardDoneBar />
      {/* Photo picker modal */}
      <PhotoPickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onPicked={setCoverImage}
        canRemove={!!coverImage}
        onRemove={() => setCoverImage(undefined)}
      />

      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: t.surface, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: t.border }]} />

        <View style={styles.titleRow}>
          <Text style={[styles.sheetTitle, { color: t.fg, fontFamily: fonts.serifMedium }]}>
            Kitabı düzenle
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.closeBtn, { backgroundColor: t.bgSoft }]}
            accessibilityLabel="Kapat"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={14} color={t.muted} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Boş alana dokununca klavye kapanır */}
          <Pressable onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.coverRow}>
            <Pressable onPress={() => setPickerVisible(true)} style={{ position: 'relative' }}>
              <BookCover title={title} color={color} coverImage={coverImage} size={76} radius={4} />
              <View style={[styles.coverEditBadge, { backgroundColor: t.surface }]}>
                <Ionicons name="camera" size={11} color={t.fg} />
              </View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: t.muted }]}>KAPAK RENGİ</Text>
              <View style={styles.colorGrid}>
                {BOOK_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => { Haptics.selectionAsync(); setColor(c); }}
                    hitSlop={10}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: color === c }}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: c },
                      color === c && { borderWidth: 2, borderColor: t.fg },
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: t.muted }]}>KİTAP ADI</Text>
            <TextInput style={inputStyle} value={title} onChangeText={setTitle} placeholderTextColor={t.mutedStrong} />
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: t.muted }]}>YAZAR</Text>
            <TextInput style={inputStyle} value={author} onChangeText={setAuthor} placeholderTextColor={t.mutedStrong} />
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: t.muted }]}>SAYFA</Text>
              <TextInput style={inputStyle} value={pages} onChangeText={setPages} keyboardType="number-pad" placeholderTextColor={t.mutedStrong} {...doneBarProps} />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: t.muted }]}>TÜR</Text>
              <TextInput style={inputStyle} value={genre} onChangeText={setGenre} placeholderTextColor={t.mutedStrong} />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: t.muted }]}>DURUM</Text>
            <View style={styles.statusRow}>
              {([['reading', 'Okunuyor'], ['finished', 'Bitti'], ['want', 'Okuyacağım']] as [Status, string][]).map(([k, lbl]) => (
                <Pressable
                  key={k}
                  onPress={() => { Haptics.selectionAsync(); setStatus(k); }}
                  style={[
                    styles.statusBtn,
                    { borderColor: status === k ? t.primary : t.border, backgroundColor: status === k ? t.primarySoft : t.bgSoft },
                  ]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: status === k ? t.primary : t.muted }}>{lbl}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {status === 'finished' && (
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: t.muted }]}>PUANIN</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <AnimatedStar
                    key={i}
                    active={i <= rating}
                    onPress={() => setRating(i === rating ? 0 : i)}
                    activeColor={t.warning}
                    inactiveColor={t.border}
                  />
                ))}
              </View>
            </View>
          )}

          {status === 'finished' && (
            <View style={styles.field}>
              <View style={styles.reviewLabelRow}>
                <Text style={[styles.fieldLabel, { color: t.muted }]}>KİTAPTAN BİR CÜMLE</Text>
                <Text style={[styles.charCount, { color: quote.length > 185 ? t.orange : t.muted }]}>
                  {quote.length}/200
                </Text>
              </View>
              <TextInput
                style={[inputStyle, styles.quoteInput]}
                value={quote}
                onChangeText={(v) => setQuote(v.slice(0, 200))}
                placeholder="Sana dokunan bir cümleyi buraya yaz…"
                placeholderTextColor={t.mutedStrong}
                multiline
                textAlignVertical="top"
              />
            </View>
          )}

          {status === 'finished' && !isPro && (
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: t.muted }]}>DÜŞÜNCELERİN</Text>
              <ProFeatureGate
                trigger="review"
                title="Düşünce yazmak Pro’da"
                description="Kitaba dair notunu yaz, paylaşım kartına ekle."
              />
            </View>
          )}

          {status === 'finished' && isPro && (
            <View style={styles.field}>
              <View style={styles.reviewLabelRow}>
                <Text style={[styles.fieldLabel, { color: t.muted }]}>DÜŞÜNCELERİN</Text>
                <Text style={[
                  styles.charCount,
                  {
                    color: review.length > 260
                      ? t.orange
                      : review.length > 0 && review.length < 50
                      ? t.warning
                      : t.muted,
                  },
                ]}>
                  {review.length}/280
                </Text>
              </View>
              <TextInput
                style={[inputStyle, styles.reviewInput]}
                value={review}
                onChangeText={(v) => setReview(v.slice(0, 280))}
                placeholder="Bu kitap hakkında düşüncelerini yaz..."
                placeholderTextColor={t.mutedStrong}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              {review.length > 0 && review.length < 50 && (
                <Text style={[styles.reviewHint, { color: t.orange }]}>
                  En az 50 karakter gerekiyor ({50 - review.length} kaldı)
                </Text>
              )}
              {review.length >= 50 && (
                <Text style={[styles.reviewHint, { color: t.accent }]}>
                  Düşünceni paylaşım kartına ekleyebilirsin
                </Text>
              )}
            </View>
          )}

          {status === 'reading' && (
            <Pressable
              style={[styles.readingModeBtn, { backgroundColor: '#000', borderColor: '#333' }]}
              onPress={() => { handleSave(); router.push({ pathname: '/reading-mode' as any, params: { id: book.id } }); }}
            >
              <Ionicons name="time-outline" size={15} color="#F5F0E8" />
              <Text style={[styles.readingModeTxt, { color: '#F5F0E8' }]}>Okuma modunu başlat</Text>
            </Pressable>
          )}

          <ScalePressable
            scale={0.97}
            style={[styles.submit, { backgroundColor: t.primary }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleSave(); }}
            accessibilityLabel="Değişiklikleri kaydet"
            accessibilityRole="button"
          >
            <Text style={styles.submitText}>Değişiklikleri kaydet</Text>
          </ScalePressable>

          {status === 'finished' && (
            <ScalePressable
              scale={0.97}
              style={[styles.shareBtn, { borderColor: t.border }]}
              onPress={() => {
                if (!isPro) { showPaywall('bitirdim_card'); return; }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: '/share-book' as any, params: { id: book.id } });
              }}
            >
              <Ionicons name="share-outline" size={14} color={t.muted} />
              <Text style={[styles.shareTxt, { color: t.muted }]}>BİTİRDİM kartını paylaş</Text>
            </ScalePressable>
          )}

          <ScalePressable
            scale={0.97}
            style={[styles.deleteBtn, { borderColor: t.border }]}
            onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); handleDelete(); }}
            accessibilityLabel="Kitabı sil"
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={14} color={t.orange} />
            <Text style={[styles.deleteTxt, { color: t.orange }]}>Kitabı sil</Text>
          </ScalePressable>
          </Pressable>
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', inset: 0 } as any,
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, top: 90,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 12,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  coverRow: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 14 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  colorSwatch: { width: 22, height: 22, borderRadius: 11 },
  coverEditBadge: {
    position: 'absolute', bottom: 3, right: 3,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, elevation: 2,
  },
  field: { marginBottom: 12 },
  fieldRow: { flexDirection: 'row', gap: 8 },
  fieldLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  starsRow: { flexDirection: 'row', gap: 4 },
  reviewLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  charCount: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  reviewInput: { minHeight: 90, paddingTop: 10, fontSize: 13, lineHeight: 20 },
  quoteInput: { minHeight: 60, paddingTop: 10, fontSize: 13, lineHeight: 20 },
  reviewHint: { fontSize: 11, marginTop: 4, fontWeight: '500' },
  readingModeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 13, borderRadius: 12, borderWidth: 1, marginTop: 8,
  },
  readingModeTxt: { fontSize: 13, fontWeight: '600' },
  submit: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  submitText: { color: '#000', fontSize: 14, fontWeight: '700' },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8,
  },
  shareTxt: { fontSize: 13, fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8,
  },
  deleteTxt: { fontSize: 13, fontWeight: '600' },
});
