import { createContext, useContext, useState, useEffect } from 'react';
import {
  View, Text, Modal, Pressable, StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { fonts } from '@/constants/tokens';
import { ScalePressable } from '@/components/ScalePressable';

export type PaywallTrigger = 'book_limit' | 'bitirdim_card' | 'wrapped' | 'history';

const TRIGGER_COPY: Record<PaywallTrigger, { title: string; subtitle: string }> = {
  book_limit: {
    title: 'Kitaplığın dolu',
    subtitle: 'Free planda en fazla 5 kitap ekleyebilirsin. Pro ile sınırsız kitap ekle.',
  },
  bitirdim_card: {
    title: 'BİTİRDİM kartı Pro\'ya özel',
    subtitle: 'Bitirdiğin kitabı dünyayla paylaşmak için Pro\'ya geçmen gerekiyor.',
  },
  wrapped: {
    title: 'Wrapped Pro\'ya özel',
    subtitle: 'Yıllık okuma özetini görmek ve paylaşmak için Pro\'ya geçmen gerekiyor.',
  },
  history: {
    title: '3 aydan eski geçmiş',
    subtitle: 'Daha eski okuma geçmişini görmek için Pro\'ya geçmen gerekiyor.',
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
};

const ProContext = createContext<ProContextValue>({
  isPro: false,
  showPaywall: () => {},
});

export function ProProvider({ children }: { children: React.ReactNode }) {
  const [isPro, setIsPro] = useState(false);
  const [visible, setVisible] = useState(false);
  const [trigger, setTrigger] = useState<PaywallTrigger>('book_limit');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'true') setIsPro(true);
    });
  }, []);

  const showPaywall = (t: PaywallTrigger) => {
    setTrigger(t);
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

  const copy = TRIGGER_COPY[trigger];

  return (
    <ProContext.Provider value={{ isPro, showPaywall }}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={dismiss}
      >
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <View style={styles.badge}>
              <Ionicons name="star" size={14} color="#000" />
              <Text style={styles.badgeText}>PRO</Text>
            </View>

            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>

            <View style={styles.featureList}>
              {PRO_FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons name="checkmark" size={14} color="#4ecb91" />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            <ScalePressable
              scale={0.97}
              style={styles.upgradeBtn}
              onPress={upgrade}
              accessibilityLabel="Pro'ya geç"
              accessibilityRole="button"
            >
              <Text style={styles.upgradeBtnText}>Pro'ya Geç · ₺29,99/ay</Text>
            </ScalePressable>

            <Pressable onPress={dismiss} style={styles.dismissBtn} accessibilityRole="button">
              <Text style={styles.dismissText}>Belki Sonra</Text>
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
    backgroundColor: '#0e0e0e',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 44,
    gap: 12,
    borderTopWidth: 1,
    borderColor: '#222',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F5F0E8',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.serifMedium,
    color: '#F5F0E8',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(245,240,232,0.55)',
    lineHeight: 20,
    marginBottom: 4,
  },
  featureList: {
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1c1c1c',
    marginVertical: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(245,240,232,0.8)',
  },
  upgradeBtn: {
    backgroundColor: '#F5F0E8',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  upgradeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    fontFamily: fonts.serifMedium,
  },
  dismissBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dismissText: {
    fontSize: 14,
    color: 'rgba(245,240,232,0.35)',
  },
});
