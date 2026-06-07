import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width: W } = Dimensions.get('window');
const CREAM = '#F5F0E8';
const ACCENT = '#3A7BD5';

type Book = { color: string; height: number; rotate: string; mb: number };
type Slide = { label: string; title: string; description: string; books: Book[] };

const SLIDES: Slide[] = [
  {
    label: '01 · KÜTÜPHANE',
    title: 'Okuduğun her kitap bir yerde dursun.',
    description:
      'Bitirdiklerin ve okuduklarınla birlikte sade bir kitaplık. Ne okuduğunu hiç unutma.',
    books: [
      { color: '#BFA882', height: 148, rotate: '-4deg', mb: 0 },
      { color: '#3B5C39', height: 188, rotate: '2deg', mb: 24 },
      { color: '#8B3A3A', height: 168, rotate: '-2deg', mb: 10 },
      { color: '#7A8B6E', height: 162, rotate: '5deg', mb: 16 },
    ],
  },
  {
    label: '02 · AY SONU',
    title: 'Ayın sonunda hazır bir özet.',
    description:
      'Kaç kitap, kaç sayfa, ortalama puanın — paylaşılabilir kartlarla özetlenmiş hâli.',
    books: [
      { color: '#4A5FC0', height: 155, rotate: '-3deg', mb: 5 },
      { color: '#2A8A7A', height: 183, rotate: '1deg', mb: 20 },
      { color: '#CC6A35', height: 163, rotate: '-2deg', mb: 0 },
      { color: '#8D6E63', height: 168, rotate: '4deg', mb: 14 },
    ],
  },
  {
    label: '03 · PAYLAŞ',
    title: 'Instagram\'a hazır gelsin.',
    description:
      'Ay sonu kartlarını doğrudan story\'e gönder — editöryel, temiz, emoji\'siz.',
    books: [
      { color: '#7B5EA7', height: 158, rotate: '-5deg', mb: 14 },
      { color: '#3A7B5E', height: 188, rotate: '2deg', mb: 0 },
      { color: '#C4882A', height: 168, rotate: '-1deg', mb: 20 },
      { color: '#5E7B9A', height: 163, rotate: '3deg', mb: 8 },
    ],
  },
];

function SlideItem({ slide, height }: { slide: Slide; height: number }) {
  return (
    <View style={{ width: W, height }}>
      <View style={styles.booksArea}>
        <View style={styles.booksRow}>
          {slide.books.map((book, i) => (
            <View
              key={i}
              style={{
                width: 88,
                height: book.height,
                borderRadius: 6,
                backgroundColor: book.color,
                marginLeft: i === 0 ? 36 : 10,
                marginBottom: book.mb,
                transform: [{ rotate: book.rotate }],
              }}
            />
          ))}
        </View>
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
  const [index, setIndex] = useState(0);
  const [listHeight, setListHeight] = useState(0);
  const listRef = useRef<FlatList>(null);

  const goToAuth = () => router.replace('/(auth)/register');

  const handleContinue = () => {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    } else {
      goToAuth();
    }
  };

  const bottomBarHeight = 80 + insets.bottom;

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <Pressable
        style={[styles.skipBtn, { top: insets.top + 12 }]}
        onPress={goToAuth}
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
              <SlideItem slide={item} height={listHeight} />
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

        <Pressable style={styles.continueBtn} onPress={handleContinue}>
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
    padding: 8,
  },
  skipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  booksArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  booksRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
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
    fontSize: 36,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: 'bold',
    lineHeight: 44,
    marginBottom: 16,
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
    backgroundColor: ACCENT,
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
