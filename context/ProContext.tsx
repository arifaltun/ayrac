import { createContext, useContext, useState, useEffect } from 'react';
import {
  View, Text, Modal, Pressable, StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { fonts } from '@/constants/tokens';
import { useTheme } from '@/context/ThemeContext';
import { ScalePressable } from '@/components/ScalePressable';

export type PaywallTrigger =
  | 'book_limit'
  | 'bitirdim_card'
  | 'wrapped'
  | 'history'
  | 'recommendations'
  | 'heatmap'
  | 'review'
  | 'export';

const TRIGGER_COPY: Record<PaywallTrigger, { title: string; subtitle: string }> = {
  book_limit: {
    title: 'Kitaplığın doldu',
    subtitle: 'Free planda beş kitap yan yana duruyor. Pro ile kitaplığın seninle birlikte büyür.',
  },
  bitirdim_card: {
    title: 'BİTİRDİM kartı Pro’da',
    subtitle: 'Bitirdiğin kitabı zarif bir kartla paylaşmak Pro’ya özel.',
  },
  wrapped: {
    title: 'Yıllık Wrapped Pro’da',
    subtitle: 'Yılın tamamının özetini görmek ve paylaşmak Pro’ya özel.',
  },
  history: {
    title: 'Daha eski geçmiş Pro’da',
    subtitle: 'Son üç aydan öncesine bakmak Pro’ya özel.',
  },
  recommendations: {
    title: 'Kitap önerileri Pro’da',
    subtitle: 'Okuduklarına göre seçilmiş kişisel öneriler Pro’ya özel.',
  },
  heatmap: {
    title: 'Okuma takvimi Pro’da',
    subtitle: 'Yıllık ısı haritası ve okuma serilerin Pro’ya özel.',
  },
  review: {
    title: 'Kitap notları Pro’da',
    subtitle: 'Okuduğun kitaplara not düşmek ve saklamak Pro’ya özel.',
  },
  export: {
    title: 'Dışa aktarma Pro’da',
    subtitle: 'Okuma günlüğünü PDF ve CSV olarak dışa aktarmak Pro’ya özel.',
  },
};

const PRO_FEATURES = [
  'Sınırsız kitap ekle',
  'BİTİRDİM paylaşım kartı',
  'Yıllık Wrapped & paylaşım',
  'Tüm okuma geçmişi',
  'Kişiye özel kitap önerileri',
  'PDF & CSV dışa aktarma',
  'Streak ısı haritası',
];

const STORAGE_KEY = '@ayrac_is_pro';

type ProContextValue = {
  isPro: boolean;
  showPaywall: (trigger: PaywallTrigger) => void;
  /** Yalnızca geliştirme: Free/Pro deneyimleri arasında geçiş. Production'da no-op. */
  toggleProForDev: () => void;
};

const ProContext = createContext<ProContextValue>({
  isPro: false,
  showPaywall: () => {},
  toggleProForDev: () => {},
});

export function ProProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTheme();
  const [isPro, setIsPro] = useState(false);
  const [visible, setVisible] = useState(false);
  const [trigger, setTrigger] = useState<PaywallTrigger>('book_limit');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'true') setIsPro(true);
    });
  }, []);

  const showPaywall = (tr: PaywallTrigger) => {
    setTrigger(tr);
    setVisible(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const upgrade = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    setIsPro(true);
    setVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const dismiss = () => {
    Haptics.selectionAsync();
    setVisible(false);
  };

  // __DEV__ dışında çağrılsa bile hiçbir şey yapmaz — UI zaten yalnızca DEV'de gösteriyor
  const toggleProForDev = () => {
    if (!__DEV__) return;
    setIsPro((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? 'true' : 'false').catch(() => {});
      console.log('[DevPro] isPro →', next);
      return next;
    });
  };

  const copy = TRIGGER_COPY[trigger];

  return (
    <ProContext.Provider value={{ isPro, showPaywall, toggleProForDev }}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={dismiss}
      >
        <View style={styles.backdrop}>
          <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={[styles.badge, { backgroundColor: t.fg }]}>
              <Ionicons name="star" size={14} color={t.bg} />
              <Text style={[styles.badgeText, { color: t.bg }]}>PRO</Text>
            </View>

            <Text style={[styles.title, { color: t.fg, fontFamily: fonts.serifMedium }]}>{copy.title}</Text>
            <Text style={[styles.subtitle, { color: t.muted }]}>{copy.subtitle}</Text>

            <View style={[styles.featureList, { borderColor: t.border }]}>
              {PRO_FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons name="checkmark" size={14} color={t.accent} />
                  <Text style={[styles.featureText, { color: t.fg }]}>{f}</Text>
                </View>
              ))}
            </View>

            <ScalePressable
              scale={0.97}
              style={[styles.upgradeBtn, { backgroundColor: t.fg }]}
              onPress={upgrade}
              accessibilityLabel="Pro'ya geç"
              accessibilityRole="button"
            >
              <Text style={[styles.upgradeBtnText, { color: t.bg, fontFamily: fonts.serifMedium }]}>
                Pro’ya Geç · ₺29,99/ay
              </Text>
            </ScalePressable>

            <Pressable onPress={dismiss} style={styles.dismissBtn} accessibilityRole="button">
              <Text style={[styles.dismissText, { color: t.muted }]}>Belki sonra</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ProContext.Provider>
  );
}

export const usePro = () => useContext(ProContext);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 44,
    gap: 12,
    borderTopWidth: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  featureList: {
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginVertical: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
  },
  upgradeBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  upgradeBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  dismissBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 14,
  },
});
