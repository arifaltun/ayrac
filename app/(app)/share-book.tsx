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
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';
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
type CardVariant = 'editorial' | 'card' | 'poster';

const PALETTE = [
  '#7c3aed', '#1d9e75', '#d85a30', '#3b82f6',
  '#ec4899', '#f5a623', '#06b6d4', '#8b5a3c',
  '#ef4444', '#10b981', '#a855f7', '#6366f1',
];

type CardProps = {
  format: Format;
  title: string;
  author: string;
  rating: number;
  accentColor: string;
  coverImage?: string;
  review?: string;
  dateLabel: string;
};

/* ---------- ortak parçalar ---------- */

// Kart içi yıldızlar — capture edildiği için tema değil kart zeminine göre sabit
function Stars({ value, size = 14, dark = false }: { value: number; size?: number; dark?: boolean }) {
  if (value <= 0) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= value ? 'star' : 'star-outline'}
          size={size}
          color={i <= value ? '#d9952c' : dark ? 'rgba(245,240,232,0.3)' : 'rgba(34,27,18,0.25)'}
        />
      ))}
    </View>
  );
}

// İnce grain dokusu: dümdüz dijital zemini kıran nokta deseni (SVG pattern, ucuz)
function Grain({ color, opacity, id }: { color: string; opacity: number; id: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id={id} width="7" height="7" patternUnits="userSpaceOnUse">
          <Circle cx="1" cy="1.5" r="0.6" fill={color} />
          <Circle cx="4.5" cy="4" r="0.45" fill={color} />
          <Circle cx="2.5" cy="6" r="0.5" fill={color} />
          <Circle cx="6" cy="1" r="0.4" fill={color} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} opacity={opacity} />
    </Svg>
  );
}

// Kitap objesi: 2:3 oran, yumuşak köşe, dağınık gölge, cilt çizgisi
function CoverArt({ title, accentColor, coverImage, w, lightShadow }: {
  title: string; accentColor: string; coverImage?: string; w: number; lightShadow?: boolean;
}) {
  const h = w * 1.5;
  const radius = Math.max(8, Math.round(w * 0.09));
  const spineW = Math.max(4, Math.round(w * 0.06));
  return (
    <View style={{
      width: w, height: h, borderRadius: radius,
      backgroundColor: coverImage ? '#1a1712' : accentColor,
      shadowColor: '#000',
      shadowOpacity: lightShadow ? 0.25 : 0.45,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 9 },
      elevation: 9,
    }}>
      <View style={{ flex: 1, borderRadius: radius, overflow: 'hidden' }}>
        {coverImage ? (
          <Image source={{ uri: coverImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.serif, fontSize: h * 0.28, color: 'rgba(255,255,255,0.9)' }}>
              {title.trim()[0]?.toUpperCase() ?? 'K'}
            </Text>
          </View>
        )}
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: spineW, backgroundColor: 'rgba(0,0,0,0.22)' }} />
        <View style={{ position: 'absolute', left: spineW, top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.18)' }} />
      </View>
    </View>
  );
}

function AyracBadge({ fg, bg }: { fg: string; bg: string }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: fg, paddingHorizontal: 8, paddingVertical: 4,
      borderRadius: 20, alignSelf: 'flex-start',
    }}>
      <Ionicons name="bookmark" size={10} color={bg} />
      <Text style={{ color: bg, fontSize: 10, fontWeight: '700', fontFamily: fonts.serifMedium }}>ayraç</Text>
    </View>
  );
}

// Vintage mühür: çift çerçeve, hafif dönük, tarihli
function Stamp({ color, date }: { color: string; date: string }) {
  return (
    <View style={{
      transform: [{ rotate: '-7deg' }],
      borderWidth: 2, borderColor: color, borderRadius: 8, padding: 3, opacity: 0.92,
    }}>
      <View style={{
        borderWidth: 1, borderColor: color, borderRadius: 5,
        paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center',
      }}>
        <Text style={{ color, fontSize: 13, fontWeight: '800', letterSpacing: 3 }}>BİTİRDİM</Text>
        <Text style={{ color, fontSize: 8, letterSpacing: 1.5, marginTop: 2, fontWeight: '600' }}>{date}</Text>
      </View>
    </View>
  );
}

// Ayraç kurdelesi (poster): üst kenardan sarkan bookmark motifi
function Ribbon({ color, left = 26 }: { color: string; left?: number }) {
  return (
    <Svg width={34} height={70} viewBox="0 0 34 70" style={{ position: 'absolute', top: 0, left }}>
      <Path d="M0 0 H34 V70 L17 54 L0 70 Z" fill={color} />
    </Svg>
  );
}

/* ---------- Varyant 1 · DERGİ — editöryel sayfa düzeni ---------- */

function EditorialCard({ format, title, author, rating, accentColor, coverImage, review, dateLabel }: CardProps) {
  const isStory = format === 'story';
  const ink = '#221b12';
  const sub = 'rgba(34,27,18,0.55)';
  const faint = 'rgba(34,27,18,0.35)';

  return (
    <View style={[s.card, { height: isStory ? STORY_H : FEED_H, backgroundColor: '#F4EEE2' }]}>
      <Grain id="g-edit" color={ink} opacity={0.045} />
      <View style={{ flex: 1, padding: isStory ? 28 : 22 }}>
        {/* Masthead */}
        <View style={s.editMastRow}>
          <Text style={[s.editMastText, { color: ink }]}>AYRAÇ · OKUMA GÜNLÜĞÜ</Text>
          <Text style={[s.editMastText, { color: sub }]}>{dateLabel.toUpperCase()}</Text>
        </View>
        <View style={{ height: 2, backgroundColor: ink, marginTop: 8 }} />
        <View style={{ height: 1, backgroundColor: ink, marginTop: 2, opacity: 0.5 }} />

        {/* Başlık + eğik kapak: asimetrik kompozisyon */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={[s.kicker, { color: accentColor }]}>BİTİRDİM</Text>
              <View style={{ width: 26, height: 2, backgroundColor: accentColor, marginTop: 5, marginBottom: 12 }} />
              <Text
                style={{ fontFamily: fonts.serif, color: ink, fontSize: isStory ? 30 : 20, lineHeight: isStory ? 36 : 25, letterSpacing: -0.5 }}
                numberOfLines={isStory ? 4 : 2}
              >
                {title}
              </Text>
              <Text style={{ fontFamily: fonts.serifRegular, color: sub, fontSize: isStory ? 14 : 12, marginTop: 8 }} numberOfLines={1}>
                {author}
              </Text>
              <View style={{ marginTop: 10 }}>
                <Stars value={rating} size={isStory ? 15 : 12} />
              </View>
            </View>
            <View style={{ transform: [{ rotate: '2.5deg' }] }}>
              <CoverArt title={title} accentColor={accentColor} coverImage={coverImage} w={isStory ? 100 : 70} lightShadow />
            </View>
          </View>

          {review ? (
            <View style={{ marginTop: isStory ? 26 : 14 }}>
              <Text style={{ fontFamily: fonts.serif, color: accentColor, fontSize: 46, lineHeight: 46, marginBottom: -18 }}>“</Text>
              <Text
                style={{ fontFamily: fonts.serifRegular, color: ink, fontSize: isStory ? 15 : 12, lineHeight: isStory ? 25 : 18, letterSpacing: 0.1 }}
                numberOfLines={isStory ? 5 : 2}
              >
                {review}”
              </Text>
              <Text style={{ color: sub, fontSize: 9, letterSpacing: 1.5, marginTop: 8, fontWeight: '600' }}>— OKUR NOTU</Text>
            </View>
          ) : null}
        </View>

        {/* Footer */}
        <View>
          <View style={{ height: 1, backgroundColor: ink, opacity: 0.35, marginBottom: 10 }} />
          <View style={s.editMastRow}>
            <AyracBadge fg={ink} bg="#F4EEE2" />
            <Text style={{ color: faint, fontSize: 9, letterSpacing: 2, fontWeight: '600' }}>SAYFA · SON</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ---------- Varyant 2 · KART — vintage kütüphane kartı ---------- */

function LibraryCardField({ label, ink, sub, children }: {
  label: string; ink: string; sub: string; children: React.ReactNode;
}) {
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(42,32,20,0.3)', paddingBottom: 6 }}>
      <Text style={{ color: sub, fontSize: 8, letterSpacing: 2, fontWeight: '700', marginBottom: 4 }}>{label}</Text>
      {children}
    </View>
  );
}

function LibraryCard({ format, title, author, rating, accentColor, coverImage, review, dateLabel }: CardProps) {
  const isStory = format === 'story';
  const ink = '#2a2014';
  const sub = 'rgba(42,32,20,0.5)';

  return (
    <View style={[s.card, { height: isStory ? STORY_H : FEED_H, backgroundColor: '#EFE5CF' }]}>
      <Grain id="g-card" color={ink} opacity={0.05} />
      <View style={{ flex: 1, padding: isStory ? 28 : 22 }}>
        {/* Kart başlığı */}
        <Text style={{ color: ink, fontSize: 10, letterSpacing: 4, fontWeight: '700', textAlign: 'center' }}>
          KÜTÜPHANE KARTI
        </Text>
        <View style={{ height: 2, backgroundColor: accentColor, marginTop: 8, opacity: 0.75 }} />
        <View style={{ height: 1, backgroundColor: accentColor, marginTop: 2, opacity: 0.45 }} />

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            {/* Alanlar */}
            <View style={{ flex: 1, gap: isStory ? 14 : 9 }}>
              <LibraryCardField label="ESER" ink={ink} sub={sub}>
                <Text
                  style={{ fontFamily: fonts.serif, color: ink, fontSize: isStory ? 21 : 15, lineHeight: isStory ? 26 : 19, letterSpacing: -0.3 }}
                  numberOfLines={2}
                >
                  {title}
                </Text>
              </LibraryCardField>
              <LibraryCardField label="YAZAR" ink={ink} sub={sub}>
                <Text style={{ fontFamily: fonts.serifRegular, color: ink, fontSize: isStory ? 14 : 12 }} numberOfLines={1}>
                  {author}
                </Text>
              </LibraryCardField>
              <LibraryCardField label="DEĞERLENDİRME" ink={ink} sub={sub}>
                {rating > 0 ? <Stars value={rating} size={isStory ? 14 : 12} /> : (
                  <Text style={{ color: sub, fontSize: 12 }}>—</Text>
                )}
              </LibraryCardField>
              <LibraryCardField label="BİTİRME TARİHİ" ink={ink} sub={sub}>
                <Text style={{ color: ink, fontSize: isStory ? 13 : 11, fontWeight: '600', letterSpacing: 0.5 }}>{dateLabel}</Text>
              </LibraryCardField>
            </View>

            {/* Yapıştırılmış fotoğraf hissi: beyaz paspartu + hafif dönüş */}
            <View style={{ transform: [{ rotate: '-3.5deg' }], alignSelf: 'flex-start' }}>
              <View style={{
                padding: 5, backgroundColor: '#FCF9F2', borderRadius: 4,
                shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10,
                shadowOffset: { width: 0, height: 6 }, elevation: 6,
              }}>
                <CoverArt title={title} accentColor={accentColor} coverImage={coverImage} w={isStory ? 76 : 54} lightShadow />
              </View>
            </View>
          </View>

          {review ? (
            <View style={{
              marginTop: isStory ? 22 : 12, paddingLeft: 12,
              borderLeftWidth: 2, borderLeftColor: accentColor,
            }}>
              <Text style={{ color: sub, fontSize: 8, letterSpacing: 2, fontWeight: '700', marginBottom: 5 }}>OKUR NOTU</Text>
              <Text
                style={{ fontFamily: fonts.serifRegular, color: ink, fontSize: isStory ? 14 : 11, lineHeight: isStory ? 23 : 16 }}
                numberOfLines={isStory ? 5 : 2}
              >
                “{review}”
              </Text>
            </View>
          ) : null}
        </View>

        {/* Alt: logo + mühür */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <AyracBadge fg={ink} bg="#EFE5CF" />
          <Stamp color={accentColor} date={dateLabel} />
        </View>
      </View>
    </View>
  );
}

/* ---------- Varyant 3 · AFİŞ — cesur tipografik poster ---------- */

function PosterCard({ format, title, author, rating, accentColor, coverImage, review, dateLabel }: CardProps) {
  const isStory = format === 'story';
  const cream = '#F5F0E8';
  const creamSub = 'rgba(245,240,232,0.6)';
  const creamFaint = 'rgba(245,240,232,0.35)';

  return (
    <View style={[s.card, { height: isStory ? STORY_H : FEED_H, backgroundColor: '#131009' }]}>
      {/* Dev drop-cap: başlığın ilk harfi zemin dokusu olarak */}
      <Text
        style={{
          position: 'absolute', top: isStory ? 30 : 4, right: -14,
          fontFamily: fonts.serif, fontSize: isStory ? 250 : 160,
          lineHeight: isStory ? 250 : 160, color: accentColor, opacity: 0.16,
        }}
      >
        {title.trim()[0]?.toUpperCase() ?? 'K'}
      </Text>
      <Grain id="g-poster" color={cream} opacity={0.05} />
      <Ribbon color={accentColor} left={isStory ? 30 : 24} />

      <View style={{ flex: 1, padding: isStory ? 28 : 22, justifyContent: 'flex-end' }}>
        {/* Üst sağ: logo */}
        <View style={{ position: 'absolute', top: isStory ? 26 : 20, right: isStory ? 28 : 22 }}>
          <AyracBadge fg={cream} bg="#131009" />
        </View>

        <Text style={[s.kicker, { color: accentColor }]}>BİTİRDİM</Text>
        <Text
          style={{
            fontFamily: fonts.serif, color: cream,
            fontSize: isStory ? 38 : 24, lineHeight: isStory ? 44 : 29,
            letterSpacing: -0.8, marginTop: 10,
          }}
          numberOfLines={isStory ? 3 : 2}
        >
          {title}
        </Text>
        <Text style={{ color: creamSub, fontSize: isStory ? 12 : 10, letterSpacing: 2.5, fontWeight: '600', marginTop: 10 }} numberOfLines={1}>
          {author.toUpperCase()}
        </Text>
        <View style={{ marginTop: 12 }}>
          <Stars value={rating} size={isStory ? 16 : 13} dark />
        </View>

        {review ? (
          <Text
            style={{
              fontFamily: fonts.serifRegular, color: 'rgba(245,240,232,0.85)',
              fontSize: isStory ? 15 : 12, lineHeight: isStory ? 25 : 18,
              marginTop: isStory ? 18 : 10, letterSpacing: 0.1,
            }}
            numberOfLines={isStory ? 4 : 2}
          >
            “{review}”
          </Text>
        ) : null}

        {/* Alt sıra: kitap objesi + künye */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
          marginTop: isStory ? 26 : 14,
        }}>
          <CoverArt title={title} accentColor={accentColor} coverImage={coverImage} w={isStory ? 72 : 50} />
          <View style={{ alignItems: 'flex-end', gap: 3 }}>
            <Text style={{ color: creamFaint, fontSize: 9, letterSpacing: 1.5 }}>ayraç · okuma takip</Text>
            <Text style={{ color: creamFaint, fontSize: 9, letterSpacing: 1.5 }}>{dateLabel}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function ShareCard(props: CardProps & { variant: CardVariant }) {
  const { variant, ...rest } = props;
  if (variant === 'card') return <LibraryCard {...rest} />;
  if (variant === 'poster') return <PosterCard {...rest} />;
  return <EditorialCard {...rest} />;
}

/* ---------- ekran ---------- */

export default function ShareBookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { books } = useBooks();

  const book = books.find((b) => b.id === id);
  const [format, setFormat] = useState<Format>('story');
  const [variant, setVariant] = useState<CardVariant>('editorial');
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

  useEffect(() => {
    sv.value = withSpring(1, { damping: 14, stiffness: 140 });
  }, []);

  useEffect(() => {
    if (!book) router.back();
  }, [book, router]);

  if (!book) return null;

  const dateLabel = new Date(book.finishedAt ?? book.createdAt).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

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
    <View style={[s.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={s.backBtn}
          accessibilityLabel="Kapat"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={18} color="rgba(245,240,232,0.7)" />
        </Pressable>
        <Text style={s.headerTitle}>Paylaş</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Format toggle */}
      <View style={s.formatToggle}>
        {(['story', 'feed'] as Format[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => animateChange(() => setFormat(f))}
            style={[s.formatBtn, format === f && s.formatBtnActive]}
          >
            <Text style={[s.formatBtnText, format === f && s.formatBtnTextActive]}>
              {f === 'story' ? 'Story' : 'Feed'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Card preview */}
      <View style={s.previewContainer}>
        <Animated.View style={cardAnim}>
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1 }}
            style={{ borderRadius: 16, overflow: 'hidden' }}
          >
            <ShareCard
              variant={variant}
              format={format}
              title={book.title}
              author={book.author}
              rating={book.rating}
              accentColor={accentColor}
              coverImage={book.coverImage}
              review={book.review}
              dateLabel={dateLabel}
            />
          </ViewShot>
        </Animated.View>
      </View>

      {/* Customization */}
      <View style={s.customPanel}>
        <View style={s.styleRow}>
          {([['editorial', 'Dergi'], ['card', 'Kart'], ['poster', 'Afiş']] as [CardVariant, string][]).map(([v, lbl]) => (
            <Pressable
              key={v}
              onPress={() => animateChange(() => setVariant(v))}
              style={[s.styleBtn, variant === v && s.styleBtnActive]}
            >
              <Text style={[s.styleBtnText, variant === v && s.styleBtnTextActive]}>{lbl}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.paletteScroll}>
          {PALETTE.map((c) => (
            <Pressable
              key={c}
              onPress={() => animateChange(() => setAccentColor(c))}
              style={[s.paletteSwatch, { backgroundColor: c }, accentColor === c && s.paletteSwatchActive]}
            >
              {accentColor === c && <Ionicons name="checkmark" size={12} color="#fff" />}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Actions */}
      <View style={s.actions}>
        {saved && (
          <View style={s.savedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#4ecb91" />
            <Text style={s.savedText}>Galeriye kaydedildi</Text>
          </View>
        )}
        <Pressable
          style={[s.actionBtn, s.actionBtnPrimary]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleShare(); }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <Ionicons name="share-outline" size={16} color="#000" />
              <Text style={s.actionBtnPrimaryText}>Paylaş</Text>
            </>
          )}
        </Pressable>
        <Pressable
          style={[s.actionBtn, s.actionBtnSecondary]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleSaveToGallery(); }}
          disabled={loading}
        >
          <Ionicons name="download-outline" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={s.actionBtnSecondaryText}>Galeriye kaydet</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
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
  // Card shell
  card: { width: CARD_W, borderRadius: 16, overflow: 'hidden' },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 3.5 },
  editMastRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editMastText: { fontSize: 8, letterSpacing: 1.8, fontWeight: '700' },
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
