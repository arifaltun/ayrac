import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { fonts } from '@/constants/tokens';
import { BookCover } from '@/components/BookCover';

const CREAM = '#F5F0E8';
const ACCENT = 'rgba(245,240,232,0.55)';
const ACCENT_STRONG = CREAM;

// Mock'lar gerçek veriye bağlanmaz; sabit örnek içerikle render edilir.
const SAMPLE_BOOKS = [
  { title: 'Tutunamayanlar', author: 'Oğuz Atay', color: '#8b5a3c', badge: 'Bitti', rating: '9.5' },
  { title: 'Kürk Mantolu Madonna', author: 'Sabahattin Ali', color: '#1d9e75', badge: 'Devam', rating: null },
  { title: 'İnce Memed', author: 'Yaşar Kemal', color: '#d85a30', badge: 'Okuyacağım', rating: null },
];

/* 01 · Kütüphane: gerçek bileşen stilleriyle mini liste */
function LibraryMock() {
  const { width } = useWindowDimensions();
  return (
    <View style={[mock.frame, { width: Math.min(width - 72, 330), transform: [{ rotate: '-2deg' }] }]}>
      {SAMPLE_BOOKS.map((b) => (
        <View key={b.title} style={mock.bookRow}>
          <BookCover color={b.color} size={38} title={b.title} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={mock.bookTitle} numberOfLines={1}>{b.title}</Text>
            <Text style={mock.bookAuthor} numberOfLines={1}>{b.author}</Text>
            {b.rating && <Text style={mock.bookRating}>{b.rating} <Text style={mock.bookRatingSub}>/ 10</Text></Text>}
          </View>
          <View style={mock.badge}>
            <Text style={mock.badgeText}>{b.badge}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/* 02 · Ay sonu: özet ekranından kesit — hero + istatistikler */
function WrappedMock() {
  const { width } = useWindowDimensions();
  return (
    <View style={[mock.frame, { width: Math.min(width - 72, 330), transform: [{ rotate: '1.5deg' }], gap: 10 }]}>
      <View style={mock.hero}>
        <Text style={mock.heroKicker}>MAYIS · WRAPPED</Text>
        <Text style={mock.heroTitle}>4 kitap, 1.286 sayfa</Text>
        <Text style={mock.heroSub}>En çok okunan tür: Roman</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {([['4', 'KİTAP'], ['1.286', 'SAYFA'], ['8.4', 'ORT. PUAN']] as [string, string][]).map(([v, l]) => (
          <View key={l} style={mock.statBox}>
            <Text style={mock.statValue}>{v}</Text>
            <Text style={mock.statLabel}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* 03 · Paylaş: editöryel paylaşım kartının küçültülmüş önizlemesi */
function ShareMock() {
  const { width } = useWindowDimensions();
  return (
    <View style={[mock.shareCard, { width: Math.min(width - 96, 300), transform: [{ rotate: '-1.5deg' }] }]}>
      <View style={mock.shareMastRow}>
        <Text style={mock.shareMast}>AYRAÇ · OKUMA GÜNLÜĞÜ</Text>
      </View>
      <View style={mock.shareRule} />
      <View style={mock.shareRuleThin} />
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: 18 }}>
        <View style={{ flex: 1 }}>
          <Text style={mock.shareKicker}>BİTİRDİM</Text>
          <View style={mock.shareKickerRule} />
          <Text style={mock.shareTitle} numberOfLines={2}>Tutunamayanlar</Text>
          <Text style={mock.shareAuthor}>Oğuz Atay</Text>
          <Text style={mock.shareRating}>9.5 <Text style={mock.shareRatingSub}>/ 10</Text></Text>
        </View>
        <View style={{ transform: [{ rotate: '2.5deg' }] }}>
          <BookCover color="#8b5a3c" size={92} title="Tutunamayanlar" radius={7} />
        </View>
      </View>
      <Text style={mock.shareFooter}>ayraç · okuma günlüğü</Text>
    </View>
  );
}

type Slide = { label: string; title: string; description: string; visual: 'library' | 'wrapped' | 'share' };

const SLIDES: Slide[] = [
  {
    label: '01 · KÜTÜPHANE',
    title: 'Okuduğun her kitap bir yerde dursun.',
    description:
      'Bitirdiklerin ve okuduklarınla birlikte sade bir kitaplık. Ne okuduğunu hiç unutma.',
    visual: 'library',
  },
  {
    label: '02 · AY SONU',
    title: 'Ayın sonunda hazır bir özet.',
    description:
      'Kaç kitap, kaç sayfa, ortalama puanın — paylaşılabilir kartlarla özetlenmiş hâli.',
    visual: 'wrapped',
  },
  {
    label: '03 · PAYLAŞ',
    title: 'Instagram’a hazır gelsin.',
    description:
      'Bitirdiğin kitabı editöryel, temiz bir kartla doğrudan story’e gönder.',
    visual: 'share',
  },
];

function SlideItem({ slide, height, width }: { slide: Slide; height: number; width: number }) {
  return (
    <View style={{ width, height }}>
      <View style={styles.visualArea}>
        {slide.visual === 'library' && <LibraryMock />}
        {slide.visual === 'wrapped' && <WrappedMock />}
        {slide.visual === 'share' && <ShareMock />}
      </View>

      <View style={styles.textArea}>
        <Text style={styles.label}>{slide.label}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>
    </View>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // iPad'de boyut/yön değişiminde sayfalama bozulmasın diye canlı genişlik
  const { width: W } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [listHeight, setListHeight] = useState(0);
  const listRef = useRef<FlatList>(null);

  const goToName = () => router.replace('/(onboarding)/name' as any);

  const handleContinue = () => {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    } else {
      goToName();
    }
  };

  const bottomBarHeight = 80 + insets.bottom;

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <Pressable
        style={[styles.skipBtn, { top: insets.top + 12 }]}
        onPress={goToName}
        accessibilityRole="button"
        accessibilityLabel="Tanıtımı geç"
      >
        <Text style={styles.skipText}>Geç</Text>
      </Pressable>

      {/* Slides */}
      <View
        style={{ flex: 1 }}
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
      >
        {listHeight > 0 && (
          <FlatList
            ref={listRef}
            data={SLIDES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => {
              setIndex(Math.round(e.nativeEvent.contentOffset.x / W));
            }}
            getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
            renderItem={({ item }) => (
              <SlideItem slide={item} height={listHeight} width={W} />
            )}
            keyExtractor={(_, i) => i.toString()}
          />
        )}
      </View>

      {/* Bottom bar */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + 16, height: bottomBarHeight },
        ]}
      >
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>

        <Pressable
          style={styles.continueBtn}
          onPress={handleContinue}
          accessibilityRole="button"
          accessibilityLabel={index === SLIDES.length - 1 ? 'Başla' : 'Devam'}
        >
          <Text style={styles.continueTxt}>
            {index === SLIDES.length - 1 ? 'Başla' : 'Devam'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#000" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  skipBtn: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
    paddingHorizontal: 8,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  visualArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 28,
    paddingHorizontal: 28,
  },
  textArea: {
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 20,
  },
  label: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2.5,
    marginBottom: 14,
  },
  title: {
    color: '#fff',
    fontSize: 34,
    fontFamily: fonts.serifMedium,
    lineHeight: 42,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  description: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 15,
    lineHeight: 23,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 16,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 28,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT_STRONG,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CREAM,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 32,
    gap: 6,
  },
  continueTxt: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Mock stilleri: uygulamanın koyu tema görünümünün sabitlenmiş kopyası.
// Dokunulamaz, statik; hafif eğimle "vitrin" hissi.
const mock = StyleSheet.create({
  frame: {
    gap: 8,
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: '#0e0e0e',
    borderColor: '#1c1c1c',
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
  },
  bookTitle: { color: CREAM, fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  bookAuthor: { color: 'rgba(245,240,232,0.45)', fontSize: 12, marginTop: 1 },
  bookRating: { color: CREAM, fontSize: 11, fontFamily: fonts.serifMedium, marginTop: 3 },
  bookRatingSub: { color: 'rgba(245,240,232,0.45)', fontSize: 9 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: 'rgba(245,240,232,0.07)',
  },
  badgeText: { color: CREAM, fontSize: 10, fontWeight: '600' },
  hero: {
    backgroundColor: CREAM,
    borderRadius: 14,
    padding: 16,
    gap: 3,
  },
  heroKicker: { color: 'rgba(0,0,0,0.55)', fontSize: 8, letterSpacing: 2, fontWeight: '700' },
  heroTitle: { color: '#000', fontSize: 21, fontFamily: fonts.serif, letterSpacing: -0.5, marginTop: 3 },
  heroSub: { color: 'rgba(0,0,0,0.6)', fontSize: 11, marginTop: 2 },
  statBox: {
    flex: 1,
    backgroundColor: '#0e0e0e',
    borderColor: '#1c1c1c',
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    alignItems: 'center',
    gap: 3,
  },
  statValue: { color: CREAM, fontSize: 18, fontFamily: fonts.serif, letterSpacing: -0.4 },
  statLabel: { color: 'rgba(245,240,232,0.4)', fontSize: 8, fontWeight: '700', letterSpacing: 1.2 },
  shareCard: {
    backgroundColor: '#F4EEE2',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  shareMastRow: { flexDirection: 'row', justifyContent: 'space-between' },
  shareMast: { color: '#221b12', fontSize: 7, letterSpacing: 1.6, fontWeight: '700' },
  shareRule: { height: 2, backgroundColor: '#221b12', marginTop: 6 },
  shareRuleThin: { height: 1, backgroundColor: '#221b12', marginTop: 2, opacity: 0.5 },
  shareKicker: { color: '#8b5a3c', fontSize: 9, fontWeight: '800', letterSpacing: 2.5 },
  shareKickerRule: { width: 20, height: 2, backgroundColor: '#8b5a3c', marginTop: 4, marginBottom: 8 },
  shareTitle: { color: '#221b12', fontSize: 21, fontFamily: fonts.serif, lineHeight: 25, letterSpacing: -0.4 },
  shareAuthor: { color: 'rgba(34,27,18,0.55)', fontSize: 11, fontFamily: fonts.serifRegular, marginTop: 5 },
  shareRating: { color: '#221b12', fontSize: 13, fontFamily: fonts.serif, marginTop: 7 },
  shareRatingSub: { color: 'rgba(34,27,18,0.5)', fontSize: 9 },
  shareFooter: {
    color: 'rgba(34,27,18,0.35)', fontSize: 7, letterSpacing: 1.2,
    textAlign: 'right', marginTop: 16, fontWeight: '600',
  },
});
