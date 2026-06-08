import { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions,
  ActivityIndicator, Image, ScrollView, Animated,
} from 'react-native';
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

type Format = 'story' | 'feed' | 'review';
type CardStyle = 'dark' | 'light' | 'minimal';

const PALETTE = [
  '#7c3aed', '#1d9e75', '#d85a30', '#3b82f6',
  '#ec4899', '#f5a623', '#06b6d4', '#8b5a3c',
  '#ef4444', '#10b981', '#a855f7', '#6366f1',
];

function Stars({ value, size = 14, dark = true }: { value: number; size?: number; dark?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= value ? 'star' : 'star-outline'}
          size={size}
          color={i <= value ? '#f5a124' : dark ? 'rgba(245,240,232,0.25)' : 'rgba(0,0,0,0.2)'}
        />
      ))}
    </View>
  );
}

function ReviewCard({ title, rating, accentColor }: {
  title: string; rating: number; accentColor: string; review: string;
}) {
  return (
    <View style={[styles.card, { height: STORY_H, backgroundColor: '#0a0a0a', justifyContent: 'space-between' }]}>
      <View style={[styles.cardAccent, { backgroundColor: accentColor, opacity: 0.15 }]} />
      <View style={styles.cardTop}>
        <View style={styles.appBadge}>
          <Ionicons name="bookmark" size={10} color="#000" />
          <Text style={styles.appBadgeText}>ayraç</Text>
        </View>
      </View>
      <View style={styles.reviewCardCenter}>
        <Text style={[styles.reviewCardLabel, { color: accentColor }]}>DÜŞÜNCELERİM</Text>
        <Text style={styles.reviewCardTitle} numberOfLines={2}>{title}</Text>
        {rating > 0 && <View style={{ marginBottom: 24 }}><Stars value={rating} size={15} /></View>}
      </View>
      <View style={styles.cardBottom}>
        <Text style={styles.cardBottomText}>ayraç · okuma takip</Text>
      </View>
    </View>
  );
}

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
  if (format === 'review' && review) {
    return <ReviewCard title={title} rating={rating} accentColor={accentColor} review={review} />;
  }

  const cardH = format === 'story' ? STORY_H : FEED_H;
  const isLight = cardStyle === 'light';
  const isMinimal = cardStyle === 'minimal';
  const bg = isLight ? '#F5F0E8' : '#0a0a0a';
  const fg = isLight ? '#151b28' : '#F5F0E8';
  const fgMuted = isLight ? 'rgba(21,27,40,0.45)' : 'rgba(245,240,232,0.5)';
  const fgFaint = isLight ? 'rgba(21,27,40,0.15)' : 'rgba(245,240,232,0.2)';
  const badgeBg = isLight ? '#151b28' : '#F5F0E8';
  const badgeFg = isLight ? '#F5F0E8' : '#000';
  const badgeIcon = isLight ? '#F5F0E8' : '#000';

  if (isMinimal) {
    return (
      <View style={[styles.card, { height: cardH, backgroundColor: bg, justifyContent: 'space-between' }]}>
        <View style={[styles.cardAccent, { backgroundColor: accentColor, opacity: isLight ? 0.08 : 0.1 }]} />
        <View style={[styles.cardTop, { justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={[styles.cardFinished, { color: accentColor, fontSize: 9 }]}>BİTİRDİM</Text>
          <View style={[styles.appBadge, { backgroundColor: badgeBg }]}>
            <Ionicons name="bookmark" size={10} color={badgeIcon} />
            <Text style={[styles.appBadgeText, { color: badgeFg }]}>ayraç</Text>
          </View>
        </View>
        <View style={styles.minimalCenter}>
          <Text style={[styles.minimalTitle, { color: fg }]} numberOfLines={4}>{title}</Text>
          <Text style={[styles.minimalAuthor, { color: fgMuted }]} numberOfLines={1}>{author}</Text>
          {rating > 0 && (
            <View style={{ marginTop: 14 }}>
              <Stars value={rating} size={format === 'feed' ? 14 : 18} dark={!isLight} />
            </View>
          )}
        </View>
        <View style={styles.cardBottom}>
          <Text style={[styles.cardBottomText, { color: fgFaint }]}>ayraç · okuma takip</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { height: cardH, backgroundColor: bg }]}>
      <View style={[styles.cardAccent, { backgroundColor: accentColor, opacity: isLight ? 0.08 : 0.12 }]} />
      <View style={styles.cardTop}>
        <View style={[styles.appBadge, { backgroundColor: badgeBg }]}>
          <Ionicons name="bookmark" size={10} color={badgeIcon} />
          <Text style={[styles.appBadgeText, { color: badgeFg }]}>ayraç</Text>
        </View>
      </View>
      <View style={[styles.cardCenter, format === 'feed' && { paddingVertical: 20 }]}>
        {coverImage ? (
          <Image
            source={{ uri: coverImage }}
            style={[styles.cardCover, format === 'story' && { width: 110, height: 160 }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[
            styles.cardCoverPlaceholder,
            { backgroundColor: accentColor },
            format === 'story' && { width: 110, height: 160 },
          ]}>
            <View style={styles.cardCoverSpine} />
            <Text style={styles.cardCoverLetter}>{title[0]?.toUpperCase() ?? 'K'}</Text>
          </View>
        )}
        <View style={styles.cardText}>
          <Text style={[styles.cardFinished, { color: accentColor }]}>BİTİRDİM</Text>
          <Text style={[styles.cardTitle, { color: fg }]} numberOfLines={format === 'feed' ? 2 : 3}>
            {title}
          </Text>
          <Text style={[styles.cardAuthor, { color: fgMuted }]} numberOfLines={1}>{author}</Text>
          {rating > 0 && (
            <View style={{ marginTop: 10 }}>
              <Stars value={rating} size={format === 'feed' ? 13 : 16} dark={!isLight} />
            </View>
          )}
        </View>
      </View>
      <View style={styles.cardBottom}>
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

  const animVal = useRef(new Animated.Value(1)).current;

  const animateChange = (cb: () => void) => {
    Animated.sequence([
      Animated.timing(animVal, { toValue: 0.93, duration: 100, useNativeDriver: true }),
      Animated.timing(animVal, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    cb();
  };

  // Entrance animation
  useEffect(() => {
    animVal.setValue(0.88);
    Animated.spring(animVal, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }).start();
  }, []);

  if (!book) { router.back(); return null; }

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

  const formats = ['story', 'feed', ...(book.review ? ['review'] : [])] as Format[];
  const formatLabel = (f: Format) => f === 'story' ? 'Story' : f === 'feed' ? 'Feed' : 'Düşünce';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
        </Pressable>
        <Text style={styles.headerTitle}>Paylaş</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Format toggle */}
      <View style={styles.formatToggle}>
        {formats.map((f) => (
          <Pressable
            key={f}
            onPress={() => animateChange(() => setFormat(f))}
            style={[styles.formatBtn, format === f && styles.formatBtnActive]}
          >
            <Text style={[styles.formatBtnText, format === f && styles.formatBtnTextActive]}>
              {formatLabel(f)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Card preview */}
      <View style={styles.previewContainer}>
        <Animated.View style={{ transform: [{ scale: animVal }] }}>
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
      {format !== 'review' && (
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
      )}

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
          onPress={handleShare}
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
          onPress={handleSaveToGallery}
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
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
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
  // Card styles
  card: { width: CARD_W, borderRadius: 16, overflow: 'hidden', justifyContent: 'space-between', padding: 24 },
  cardAccent: { ...StyleSheet.absoluteFillObject as any, borderRadius: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'flex-end' },
  appBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F5F0E8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  appBadgeText: { color: '#000', fontSize: 10, fontWeight: '700', fontFamily: fonts.serifMedium },
  cardCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 20, paddingVertical: 28 },
  cardCover: { width: 80, height: 116, borderRadius: 6 },
  cardCoverPlaceholder: { width: 80, height: 116, borderRadius: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cardCoverSpine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: 'rgba(0,0,0,0.25)' },
  cardCoverLetter: { color: 'rgba(255,255,255,0.85)', fontSize: 32, fontWeight: '700' },
  cardText: { flex: 1, gap: 4 },
  cardFinished: { fontSize: 11, fontWeight: '800', letterSpacing: 2.5, marginBottom: 4 },
  cardTitle: { fontSize: 22, fontFamily: fonts.serif, lineHeight: 28, letterSpacing: -0.3 },
  cardAuthor: { fontSize: 13, marginTop: 2 },
  cardBottom: { alignItems: 'flex-end' },
  cardBottomText: { fontSize: 10, letterSpacing: 1 },
  // Minimal style
  minimalCenter: { flex: 1, justifyContent: 'center', paddingVertical: 20 },
  minimalTitle: { fontSize: 30, fontFamily: fonts.serif, lineHeight: 36, letterSpacing: -0.5 },
  minimalAuthor: { fontSize: 14, marginTop: 8 },
  // Review card
  reviewCardCenter: { flex: 1, justifyContent: 'center', paddingHorizontal: 4, paddingVertical: 16 },
  reviewCardLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 2.5, marginBottom: 10 },
  reviewCardTitle: { color: '#F5F0E8', fontSize: 24, fontFamily: fonts.serif, lineHeight: 30, letterSpacing: -0.3, marginBottom: 14 },
  reviewOpenQuote: { color: 'rgba(245,240,232,0.18)', fontSize: 72, fontFamily: fonts.serif, lineHeight: 56, marginBottom: 4 },
  reviewCardText: { color: 'rgba(245,240,232,0.85)', fontSize: 15, lineHeight: 24, fontStyle: 'italic', letterSpacing: 0.1 },
  reviewCloseQuote: { color: 'rgba(245,240,232,0.18)', fontSize: 72, fontFamily: fonts.serif, lineHeight: 56, textAlign: 'right', marginTop: 4 },
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
