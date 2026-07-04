import { useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { fonts } from '@/constants/tokens';
import { CoverCropper } from '@/components/CoverCropper';
import { permissionDeniedAlert } from '@/utils/permissionAlert';

type PickerAction = 'camera' | 'gallery';

// Kapak fotoğrafı seçme alt sayfası — kitap ekleme ve düzenlemede ortak.
//
// İki bilinen tuzağa karşı sağlamlaştırıldı:
// 1. iOS'ta RN Modal kapanmadan picker sunulamaz → eylem pendingRef'e yazılır,
//    Modal'ın onDismiss'i (iOS) veya kısa fallback timeout'u kapanış SONRASI çalıştırır.
// 2. Yeni mimaride (Fabric) Modal içinde iç içe Pressable dokunma kaybedebiliyor →
//    butonlar artık backdrop Pressable'ının çocuğu DEĞİL, kardeşi.
export function PhotoPickerSheet({ visible, onClose, onPicked, canRemove, onRemove }: {
  visible: boolean;
  onClose: () => void;
  onPicked: (uri: string) => void;
  canRemove?: boolean;
  onRemove?: () => void;
}) {
  const { t } = useTheme();
  const [rawUri, setRawUri] = useState<string | null>(null);
  const pendingRef = useRef<PickerAction | null>(null);

  const launch = async (action: PickerAction) => {
    console.log('[PhotoPicker] 4/6 launch başlıyor:', action);
    try {
      if (action === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        console.log('[PhotoPicker] 5/6 kamera izni:', perm.status, '· canAskAgain:', perm.canAskAgain);
        if (perm.status !== 'granted') {
          permissionDeniedAlert('Kapak fotoğrafı çekmek');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
        console.log('[PhotoPicker] 6/6 kamera sonucu:', result.canceled ? 'iptal edildi' : result.assets?.[0]?.uri);
        if (!result.canceled && result.assets?.[0]?.uri) setRawUri(result.assets[0].uri);
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log('[PhotoPicker] 5/6 galeri izni:', perm.status, '· canAskAgain:', perm.canAskAgain);
        if (perm.status !== 'granted') {
          permissionDeniedAlert('Galeriden kapak seçmek');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
        console.log('[PhotoPicker] 6/6 galeri sonucu:', result.canceled ? 'iptal edildi' : result.assets?.[0]?.uri);
        if (!result.canceled && result.assets?.[0]?.uri) setRawUri(result.assets[0].uri);
      }
    } catch (e) {
      console.log('[PhotoPicker] HATA — launch istisna fırlattı:', e);
      Alert.alert('Bir sorun oluştu', 'Fotoğraf seçici açılamadı. Tekrar dener misin?');
    }
  };

  // Modal kapanışı tamamlanınca bekleyen eylemi çalıştır (çift çağrıya karşı ref sıfırlanır)
  const runPending = (source: string) => {
    const action = pendingRef.current;
    console.log(`[PhotoPicker] 3/6 modal kapandı (${source}), bekleyen eylem:`, action ?? 'yok');
    if (!action) return;
    pendingRef.current = null;
    launch(action);
  };

  const select = (action: PickerAction) => {
    console.log('[PhotoPicker] 2/6 buton basıldı:', action);
    pendingRef.current = action;
    onClose();
    // iOS: onDismiss asıl tetik; timeout yalnızca sigorta (runPending ref'i sıfırladığı
    // için ikinci çağrı no-op olur). Android: onDismiss güvenilir değil, timeout esas.
    setTimeout(() => runPending('timeout'), Platform.OS === 'ios' ? 700 : 300);
  };

  return (
    <>
      <CoverCropper
        uri={rawUri}
        onDone={(cropped) => {
          console.log('[PhotoPicker] kırpma tamamlandı:', cropped);
          setRawUri(null);
          onPicked(cropped);
        }}
        onCancel={() => {
          console.log('[PhotoPicker] kırpma iptal edildi');
          setRawUri(null);
        }}
      />
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        onShow={() => console.log('[PhotoPicker] 1/6 sheet açıldı')}
        onDismiss={Platform.OS === 'ios' ? () => runPending('onDismiss') : undefined}
      >
        <View style={styles.backdrop}>
          {/* Kapatma alanı — butonların EBEVEYNİ değil, kardeşi */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => { console.log('[PhotoPicker] backdrop ile kapatıldı'); onClose(); }}
            accessibilityLabel="Kapat"
          />
          <View style={[styles.sheet, { backgroundColor: t.surface }]}>
            <Text style={[styles.title, { color: t.fg, fontFamily: fonts.serifMedium }]}>
              Kapak fotoğrafı
            </Text>
            <Pressable
              style={({ pressed }) => [styles.option, { borderColor: t.border, opacity: pressed ? 0.6 : 1 }]}
              onPressIn={() => console.log('[PhotoPicker] onPressIn: kamera')}
              onPress={() => select('camera')}
              accessibilityRole="button"
              accessibilityLabel="Fotoğraf çek"
            >
              <Ionicons name="camera-outline" size={20} color={t.fg} />
              <Text style={[styles.optionText, { color: t.fg }]}>Fotoğraf çek</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.option, { borderColor: t.border, opacity: pressed ? 0.6 : 1 }]}
              onPressIn={() => console.log('[PhotoPicker] onPressIn: galeri')}
              onPress={() => select('gallery')}
              accessibilityRole="button"
              accessibilityLabel="Galeriden seç"
            >
              <Ionicons name="image-outline" size={20} color={t.fg} />
              <Text style={[styles.optionText, { color: t.fg }]}>Galeriden seç</Text>
            </Pressable>
            {canRemove && (
              <Pressable
                style={styles.remove}
                onPress={() => { console.log('[PhotoPicker] fotoğraf kaldırıldı'); onRemove?.(); onClose(); }}
                accessibilityRole="button"
              >
                <Text style={[styles.removeText, { color: t.orange }]}>Fotoğrafı kaldır</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, gap: 10,
  },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1, minHeight: 50,
  },
  optionText: { fontSize: 15, fontWeight: '500' },
  remove: { alignItems: 'center', paddingVertical: 12, minHeight: 44, justifyContent: 'center' },
  removeText: { fontSize: 13, fontWeight: '600' },
});
