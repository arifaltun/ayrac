import { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions,
  ActivityIndicator, Image, ScrollView,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { useBooks } from '@/context/BooksContext';
import { fonts } from '@/constants/tokens';

const { width: W } = Dimensions.get('window');
const CARD_W = W - 48;
const STORY_H = CARD_W * (16 / 9);
const FEED_H = CARD_W;

type Format = 'story' | 'feed';
type CardStyle = 'dark' | 'light' | 'minimal';

const PALETTE = [
  '#7c3aed', '#1d9e75', '#d85a30', '#3b82f6',
  '#ec4899', '#f5a623', '#06b6d4', '#8b5a3c',
  '#ef4444', '#10b981', '#a855f7', '#6366f1',
];

// Kart içi yıldızlar — kart capture edildiği için tema değil, kart varyantına göre sabit renk
function Stars({ value, size = 14, dark = true }: { value: number; size?: number; dark?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= value ? 'star' : 'star-outline'}
          size={size}
          color={i <= value ? '#f5a124' : dark ? 'rgba(245,240,232,0.3)' : 'rgba(29,24,18,0.25)'}
        />
      ))}
    </View>
  );
}

// Kapak yoksa zarif placeholder: vurgu renginde blok, sırt çizgisi, serif baş harf
function CoverArt({ title, accentColor, coverImage, w, h }: {
  title: string; accentColor: string; coverImage?: string; w: number; h: number;
}) {
  if (coverImage) {
    return <Image source={{ uri: coverImage }} style={{ width: w, height: h, borderRadius: 6 }} resizeMode="cover" />;
  }
  return (
    <View style={{
      width: w, height: h, borderRadius: 6, backgroundColor: accentColor,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: Math.max(4, w * 0.06), backgroundColor: 'rgba(0,0,0,0.25)' }} />
      <Text style={{ fontFamily: fonts.serif, fontSize: h * 0.3, color: 'rgba(255,255,255,0.9)' }}>
        {title.trim()[0]?.toUpperCase() ?? 'K'}
      </Text>
    </View>
  );
}

// BİTİRDİM kartı: kapak + başlık + yazar + yıldız + düşünce (varsa) + ayraç logosu.
// Üç varyant da (Klasik/Açık/Minimal) aynı öğeleri taşır; minimal kapaksız, tipografik.
function ShareCard({ format, title, author, rating, accentColor, coverImage, review, cardStyle }: {
  format: Format;
  title: string;
  author: string;
  rating: number;
  accentColor: string;
  coverImage?: string;
  review?: string;
  cardStyle: CardStyle;
}) {
  const isStory = format === 'story';
  const cardH = isStory ? STORY_H : FEED_H;
  const isLight = cardStyle === 'light';
  const isMinimal = cardStyle === 'minimal';

  // Sıcak, edebi zemin: düz siyah yerine kahve tonlu koyu; açıkta krem
  const bg = isLight ? '#F5F0E8' : '#0d0b09';
  const fg = isLight ? '#1d1812' : '#F5F0E8';
  const fgMuted = isLight ? 'rgba(29,24,18,0.55)' : 'rgba(245,240,232,0.55)';
  const fgSoft = isLight ? 'rgba(29,24,18,0.78)' : 'rgba(245,240,232,0.8)';
  const fgFaint = isLight ? 'rgba(29,24,18,0.35)' : 'rgba(245,240,232,0.35)';
  const frame = isLight ? 'rgba(29,24,18,0.16)' : 'rgba(245,240,232,0.18)';
  const glyph = isLight ? 'rgba(29,24,18,0.06)' : 'rgba(245,240,232,0.07)';

  const titleSize = isMinimal ? (isStory ? 34 : 24) : isStory ? 28 : 20;

  const header = (
    <View style={styles.cardHeaderRow}>
      <View style={{ gap: 6 }}>
        <Text style={[styles.cardFinished, { color: accentColor }]}>BİTİRDİM</Text>
        <View style={{ width: 28, height: 2, backgroundColor: accentColor, opacity: 0.85 }} />
      </View>
      <View style={[styles.appBadge, { backgroundColor: fg }]}>
        <Ionicons name="bookmark" size={10} color={bg} />
        <Text style={[styles.appBadgeText, { color: bg }]}>ayraç</Text>
      </View>
    </View>
  );

  const titleBlock = (
    <>
      <Text
        style={[styles.cardTitle, { color: fg, fontSize: titleSize, lineHeight: titleSize * 1.18 }]}
        numberOfLines={isStory ? 3 : 2}
      >
        {title}
      </Text>
      <Text style={[styles.cardAuthor, { color: fgMuted }]} numberOfLines={1}>{author}</Text>
      {rating > 0 && (
        <View style={{ marginTop: isStory ? 12 : 8 }}>
          <Stars value={rating} size={isStory ? 16 : 13} dark={!isLight} />
        </View>
      )}
    </>
  );

  const reviewBlock = review ? (
    <Text
      style={[
        styles.cardReview,
        {
          color: fgSoft,
          fontSize: isStory ? 15 : 12,
          lineHeight: isStory ? 24 : 18,
          marginTop: isStory ? 20 : 12,
        },
      ]}
      numberOfLines={isStory ? 6 : 2}
    >
      “{review}”
    </Text>
  ) : null;

  return (
    <View style={[styles.card, { height: cardH, backgroundColor: bg }]}>
      <View style={[styles.cardAccent, { backgroundColor: accentColor, opacity: isLight ? 0.06 : 0.09 }]} />
      {/* Doku: dev, soluk serif tırnak işareti */}
      <Text style={[styles.bgGlyph, { color: glyph, fontSize: isStory ? 230 : 150, lineHeight: isStory ? 230 : 150 }]}>
        ”
      </Text>
      {/* Editöryel çerçeve */}
      <View pointerEvents="none" style={[styles.cardFrame, { borderColor: frame }]} />

      <View style={[styles.cardInner, { padding: isStory ? 32 : 26 }]}>
        {header}

        {isStory ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            {!isMinimal && (
              <View style={{ marginBottom: 22 }}>
                <CoverArt title={title} accentColor={accentColor} coverImage={coverImage} w={116} h={166} />
              </View>
            )}
            {titleBlock}
            {reviewBlock}
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', gap: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              {!isMinimal && (
                <CoverArt title={title} accentColor={accentColor} coverImage={coverImage} w={76} h={108} />
              )}
              <View style={{ flex: 1 }}>{titleBlock}</View>
            </View>
            {reviewBlock}
          </View>
        )}

        <Text style={[styles.cardBottomText, { color: fgFaint }]}>ayraç · okuma takip</Text>
      </View>
    </View>
  );
}

export default function ShareBookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { books } = useBooks();

  const book = books.find((b) => b.id === id);
  const [format, setFormat] = useState<Format>('story');
  const [cardStyle, setCardStyle] = useState<CardStyle>('dark');
  const [accentColor, setAccentColor] = useState(book?.color ?? PALETTE[0]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  const sv = useSharedValue(0.88);
  const cardAnim = useAnimatedStyle(() => ({ transform: [{ scale: sv.value }] }));

  const animateChange = (cb: () => void) => {
    sv.value = withSequence(
      withSpring(0.93, { damping: 12, stiffness: 500 }),
      withSpring(1, { damping: 10, stiffness: 280 }),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cb();
  };

  // Entrance animation
  useEffect(() => {
    sv.value = withSpring(1, { damping: 14, stiffness: 140 });
  }, []);

  useEffect(() => {
    if (!book) router.back();
  }, [book, router]);

  if (!book) return null;

  const capture = async () => {
    if (!viewShotRef.current?.capture) return null;
    return await viewShotRef.current.capture();
  };

  const handleShare = async () => {
    setLoading(true);
    try {
      const uri = await capture();
      if (!uri) return;
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToGallery = async () => {
    setLoading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return;
      const uri = await capture();
      if (!uri) return;
      await MediaLibrary.saveToLibraryAsync(uri);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Kapat"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={18} color="rgba(245,240,232,0.7)" />
        </Pressable>
        <Text style={styles.headerTitle}>Paylaş</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Format toggle */}
      <View style={styles.formatToggle}>
        {(['story', 'feed'] as Format[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => animateChange(() => setFormat(f))}
            style={[styles.formatBtn, format === f && styles.formatBtnActive]}
          >
            <Text style={[styles.formatBtnText, format === f && styles.formatBtnTextActive]}>
              {f === 'story' ? 'Story' : 'Feed'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Card preview */}
      <View style={styles.previewContainer}>
        <Animated.View style={cardAnim}>
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1 }}
            style={{ borderRadius: 16, overflow: 'hidden' }}
          >
            <ShareCard
              format={format}
              title={book.title}
              author={book.author}
              rating={book.rating}
              accentColor={accentColor}
              coverImage={book.coverImage}
              review={book.review}
              cardStyle={cardStyle}
            />
          </ViewShot>
        </Animated.View>
      </View>

      {/* Customization panel */}
      <View style={styles.customPanel}>
        {/* Style toggle */}
        <View style={styles.styleRow}>
          {(['dark', 'light', 'minimal'] as CardStyle[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => animateChange(() => setCardStyle(s))}
              style={[styles.styleBtn, cardStyle === s && styles.styleBtnActive]}
            >
              <Text style={[styles.styleBtnText, cardStyle === s && styles.styleBtnTextActive]}>
                {s === 'dark' ? 'Klasik' : s === 'light' ? 'Açık' : 'Minimal'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Color palette */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paletteScroll}>
          {PALETTE.map((c) => (
            <Pressable
              key={c}
              onPress={() => animateChange(() => setAccentColor(c))}
              style={[styles.paletteSwatch, { backgroundColor: c }, accentColor === c && styles.paletteSwatchActive]}
            >
              {accentColor === c && (
                <Ionicons name="checkmark" size={12} color="#fff" />
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {saved && (
          <View style={styles.savedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#4ecb91" />
            <Text style={styles.savedText}>Galeriye kaydedildi</Text>
          </View>
        )}
        <Pressable
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleShare(); }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <Ionicons name="share-outline" size={16} color="#000" />
              <Text style={styles.actionBtnPrimaryText}>Paylaş</Text>
            </>
          )}
        </Pressable>
        <Pressable
          style={[styles.actionBtn, styles.actionBtnSecondary]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleSaveToGallery(); }}
          disabled={loading}
        >
          <Ionicons name="download-outline" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={styles.actionBtnSecondaryText}>Galeriye kaydet</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: 24 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#F5F0E8', fontSize: 16, fontWeight: '600', fontFamily: fonts.serifMedium },
  formatToggle: {
    flexDirection: 'row', backgroundColor: '#111', borderRadius: 10, padding: 3, marginBottom: 16,
  },
  formatBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  formatBtnActive: { backgroundColor: '#222' },
  formatBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
  formatBtnTextActive: { color: '#F5F0E8' },
  previewContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Customization panel
  customPanel: { gap: 10, marginTop: 14 },
  styleRow: { flexDirection: 'row', gap: 8 },
  styleBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    backgroundColor: '#111', borderWidth: 1, borderColor: '#1a1a1a',
  },
  styleBtnActive: { borderColor: '#F5F0E8' },
  styleBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
  styleBtnTextActive: { color: '#F5F0E8' },
  paletteScroll: { flexGrow: 0 },
  paletteSwatch: {
    width: 30, height: 30, borderRadius: 15, marginRight: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  paletteSwatchActive: { borderWidth: 2, borderColor: '#fff' },
  // Card
  card: { width: CARD_W, borderRadius: 16, overflow: 'hidden' },
  cardAccent: { ...StyleSheet.absoluteFillObject as object },
  cardFrame: {
    position: 'absolute', left: 12, right: 12, top: 12, bottom: 12,
    borderWidth: 1, borderRadius: 10,
  },
  bgGlyph: {
    position: 'absolute', top: -14, right: 18,
    fontFamily: fonts.serif,
  },
  cardInner: { flex: 1, justifyContent: 'space-between' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardFinished: { fontSize: 11, fontWeight: '800', letterSpacing: 3 },
  appBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  appBadgeText: { fontSize: 10, fontWeight: '700', fontFamily: fonts.serifMedium },
  cardTitle: { fontFamily: fonts.serif, letterSpacing: -0.4 },
  cardAuthor: { fontSize: 13, marginTop: 6, letterSpacing: 0.2 },
  cardReview: { fontFamily: fonts.serifRegular, letterSpacing: 0.1 },
  cardBottomText: { fontSize: 10, letterSpacing: 1, textAlign: 'right' },
  // Actions
  actions: { gap: 8, marginTop: 8 },
  savedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  savedText: { color: '#4ecb91', fontSize: 13, fontWeight: '600' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  actionBtnPrimary: { backgroundColor: '#F5F0E8' },
  actionBtnPrimaryText: { color: '#000', fontSize: 15, fontWeight: '700' },
  actionBtnSecondary: { backgroundColor: '#111' },
  actionBtnSecondaryText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },
});
