import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fonts } from '@/constants/tokens';
import { pickQuote, Quote } from '@/utils/quotes';

const CREAM = '#F5F0E8';

const easeOut = Easing.out(Easing.cubic);

export default function SplashScreen() {
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const targetRef = useRef<'/(onboarding)' | '/(app)/(main)/library'>('/(onboarding)');
  const targetReadyRef = useRef(false);
  const navigatedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const continueToApp = () => {
    // Storage okuması bitmeden dokunulursa dönen kullanıcı onboarding'e düşerdi
    if (navigatedRef.current || !targetReadyRef.current) return;
    navigatedRef.current = true;
    router.replace(targetRef.current as any);
  };

  const logoOpacity = useSharedValue(0);
  const logoY = useSharedValue(8);
  const quoteOpacity = useSharedValue(0);
  const quoteY = useSharedValue(12);

  const logoAnim = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }],
  }));
  const quoteAnim = useAnimatedStyle(() => ({
    opacity: quoteOpacity.value,
    transform: [{ translateY: quoteY.value }],
  }));

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 500, easing: easeOut });
    logoY.value = withTiming(0, { duration: 500, easing: easeOut });

    AsyncStorage.getItem('@ayrac_has_entered')
      .then((v) => {
        if (v === 'true') targetRef.current = '/(app)/(main)/library';
      })
      .finally(() => { targetReadyRef.current = true; });

    pickQuote().then((q) => {
      setQuote(q);
      quoteOpacity.value = withDelay(150, withTiming(1, { duration: 700, easing: easeOut }));
      quoteY.value = withDelay(150, withTiming(0, { duration: 700, easing: easeOut }));

      // Bekleme süresi alıntının okuma süresine göre: kelime × 300ms + 1.5s taban (2.5s–6s)
      const words = q.text.trim().split(/\s+/).length;
      const duration = Math.min(6000, Math.max(2500, 1500 + words * 300));
      timerRef.current = setTimeout(continueToApp, duration);
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const attribution = quote
    ? quote.author
      ? `— ${quote.author}${quote.source ? `, ${quote.source}` : ''}`
      : '— ayraç'
    : '';

  return (
    <Pressable
      style={styles.container}
      onPress={continueToApp}
      accessibilityRole="button"
      accessibilityLabel="Devam et"
      accessibilityHint="Alıntıyı geçip uygulamayı açar"
    >
      <Animated.View style={[styles.logoRow, logoAnim]}>
        <View style={styles.logoMark}>
          <Ionicons name="bookmark" size={14} color="#000" />
        </View>
        <Text style={styles.logoText}>ayraç</Text>
      </Animated.View>

      {quote && (
        <Animated.View style={[styles.quoteContainer, quoteAnim]}>
          <Text style={styles.quoteText}>“{quote.text}”</Text>
          <Text style={styles.authorText}>{attribution}</Text>
          <Text style={styles.skipHint}>dokun ve geç</Text>
        </Animated.View>
      )}
    </Pressable>
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
  skipHint: {
    color: 'rgba(245,240,232,0.35)',
    fontSize: 12,
    letterSpacing: 0.4,
    marginTop: 8,
  },
});
