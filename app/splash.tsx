import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { fonts } from '@/constants/tokens';

const CREAM = '#F5F0E8';

const QUOTES = [
  {
    text: 'Bir kitap bitirmek, güzel bir yolculuğun sonuna gelmek gibidir.',
    author: 'Virginia Woolf',
  },
  {
    text: 'Okumak, başka bir hayat yaşamanın en kolay yoludur.',
    author: 'Orhan Pamuk',
  },
  {
    text: 'Bütün okuduklarım benim bir parçam oldu.',
    author: 'Fyodor Dostoyevski',
  },
  {
    text: 'Kitaplar, zaman ötesi yolculuğun biletleridir.',
    author: 'Franz Kafka',
  },
  {
    text: 'Bir roman okurken iki kere yaşarsın: biri kâğıtta, biri içinde.',
    author: 'Gabriel García Márquez',
  },
  {
    text: 'Hayal gücü bilgiden daha önemlidir.',
    author: 'Albert Einstein',
  },
  {
    text: 'Sanatın görevi, gerçeği değil, gerçeğin havasını vermektir.',
    author: 'Ahmet Hamdi Tanpınar',
  },
  {
    text: 'En büyük servet, kitap dolu bir kütüphanedir.',
    author: 'Sabahattin Ali',
  },
  {
    text: 'Okumak, dünyayı olduğundan daha büyük görmektir.',
    author: 'Albert Camus',
  },
  {
    text: 'Güzel kitap; hem gözleri hem de ruhu besler.',
    author: 'Nazım Hikmet Ran',
  },
];

function randomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

export default function SplashScreen() {
  const router = useRouter();
  const quote = useRef(randomQuote()).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      router.replace('/(onboarding)');
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <View style={styles.logoMark}>
          <Ionicons name="bookmark" size={14} color="#000" />
        </View>
        <Text style={styles.logoText}>ayraç</Text>
      </View>

      <Animated.View style={[styles.quoteContainer, { opacity }]}>
        <Text style={styles.quoteText}>"{quote.text}"</Text>
        <Text style={styles.authorText}>— {quote.author}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 36,
    justifyContent: 'center',
  },
  logoRow: {
    position: 'absolute',
    top: 60,
    left: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: CREAM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: CREAM,
    fontSize: 22,
    fontFamily: fonts.serif,
    letterSpacing: -0.3,
  },
  quoteContainer: {
    gap: 16,
  },
  quoteText: {
    color: CREAM,
    fontSize: 24,
    fontFamily: fonts.serifRegular,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  authorText: {
    color: 'rgba(245,240,232,0.5)',
    fontSize: 14,
    fontFamily: fonts.serifRegular,
    letterSpacing: 0.2,
  },
});
