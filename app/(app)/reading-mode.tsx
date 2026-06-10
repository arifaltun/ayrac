import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, Linking, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBooks, Book } from '@/context/BooksContext';
import { fonts } from '@/constants/tokens';
import { ScalePressable } from '@/components/ScalePressable';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTotalTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} sa ${m} dk`;
  if (m > 0) return `${m} dk`;
  return `${seconds} sn`;
}

export default function ReadingModeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { books, updateBook, addSession } = useBooks();

  const book = books.find((b) => b.id === id);

  const startTimeRef = useRef<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [silentPromptVisible, setSilentPromptVisible] = useState(true);
  const [finishConfirmVisible, setFinishConfirmVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!book) router.back();
  }, [book, router]);

  const openSilentSettings = () => {
    setSilentPromptVisible(false);
    if (Platform.OS === 'ios') {
      Linking.openURL('App-Prefs:SOUNDS');
    } else {
      Linking.openSettings();
    }
  };

  const handleFinish = () => {
    if (!book) { router.back(); return; }
    const sessionSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    if (sessionSeconds > 0) {
      addSession({ bookId: book.id, duration: sessionSeconds, date: Date.now() });
    }
    const updated: Book = {
      ...book,
      readingTime: (book.readingTime ?? 0) + sessionSeconds,
    };
    updateBook(updated);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  if (!book) return null;

  const totalAfter = (book.readingTime ?? 0) + elapsed;

  return (
    <View style={styles.container}>
      {/* Silent mode prompt */}
      <Modal
        visible={silentPromptVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSilentPromptVisible(false)}
      >
        <View style={styles.promptBackdrop}>
          <View style={styles.promptCard}>
            <Ionicons name="volume-mute-outline" size={28} color="#fff" />
            <Text style={styles.promptTitle}>Telefonunu da sessiz yapmak ister misin?</Text>
            <Text style={styles.promptDesc}>Okuma sırasında bildirimler seni rahatsız etmesin.</Text>
            <View style={styles.promptButtons}>
              <ScalePressable scale={0.96} style={styles.promptBtnOutline} onPress={() => { Haptics.selectionAsync(); setSilentPromptVisible(false); }}>
                <Text style={styles.promptBtnOutlineText}>Hayır</Text>
              </ScalePressable>
              <ScalePressable scale={0.96} style={styles.promptBtnFill} onPress={openSilentSettings}>
                <Text style={styles.promptBtnFillText}>Ayarlara git</Text>
              </ScalePressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Finish confirm */}
      <Modal
        visible={finishConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFinishConfirmVisible(false)}
      >
        <View style={styles.promptBackdrop}>
          <View style={styles.promptCard}>
            <Ionicons name="checkmark-circle-outline" size={28} color="#fff" />
            <Text style={styles.promptTitle}>Okumayı bitir</Text>
            <Text style={styles.promptDesc}>
              Bu oturum: {formatTotalTime(elapsed)}{'\n'}
              Toplam: {formatTotalTime(totalAfter)}
            </Text>
            <View style={styles.promptButtons}>
              <ScalePressable scale={0.96} style={styles.promptBtnOutline} onPress={() => { Haptics.selectionAsync(); setFinishConfirmVisible(false); }}>
                <Text style={styles.promptBtnOutlineText}>Devam et</Text>
              </ScalePressable>
              <ScalePressable scale={0.97} style={styles.promptBtnFill} onPress={handleFinish}>
                <Text style={styles.promptBtnFillText}>Kaydet</Text>
              </ScalePressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFinishConfirmVisible(true); }}
          style={styles.closeBtn}
          accessibilityLabel="Okumayı bitir"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-down" size={22} color="rgba(255,255,255,0.5)" />
        </Pressable>
        <Text style={styles.headerLabel}>OKUMA MODU</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Book info */}
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.bookAuthor}>{book.author}</Text>
      </View>

      {/* Timer */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
        <Text style={styles.timerLabel}>bu oturum</Text>
        {(book.readingTime ?? 0) > 0 && (
          <Text style={styles.totalTime}>
            Toplam: {formatTotalTime(totalAfter)}
          </Text>
        )}
      </View>

      {/* Finish button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Text style={styles.footerHint}>Telefonu bırak, kitabını oku.</Text>
        <ScalePressable
          scale={0.96}
          style={styles.finishBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setFinishConfirmVisible(true); }}
          accessibilityLabel="Okuma oturumunu bitir"
          accessibilityRole="button"
        >
          <Text style={styles.finishBtnText}>Bitti</Text>
        </ScalePressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  headerLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  bookInfo: {
    paddingHorizontal: 36,
    alignItems: 'center',
    gap: 6,
  },
  bookTitle: {
    color: '#F5F0E8',
    fontSize: 26,
    fontFamily: fonts.serif,
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  bookAuthor: {
    color: 'rgba(245,240,232,0.45)',
    fontSize: 15,
    textAlign: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    gap: 8,
  },
  timerText: {
    color: '#F5F0E8',
    fontSize: 80,
    fontFamily: fonts.serifRegular,
    letterSpacing: -2,
    lineHeight: 88,
  },
  timerLabel: {
    color: 'rgba(245,240,232,0.3)',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  totalTime: {
    color: 'rgba(245,240,232,0.35)',
    fontSize: 13,
    marginTop: 4,
  },
  footer: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 36,
  },
  footerHint: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 13,
    textAlign: 'center',
  },
  finishBtn: {
    backgroundColor: '#F5F0E8',
    paddingVertical: 16,
    paddingHorizontal: 64,
    borderRadius: 40,
  },
  finishBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.serifMedium,
  },
  promptBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  promptCard: {
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  promptTitle: {
    color: '#F5F0E8',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: fonts.serifMedium,
    lineHeight: 24,
  },
  promptDesc: {
    color: 'rgba(245,240,232,0.5)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  promptButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    width: '100%',
  },
  promptBtnOutline: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  promptBtnOutlineText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  promptBtnFill: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F5F0E8',
  },
  promptBtnFillText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
});
