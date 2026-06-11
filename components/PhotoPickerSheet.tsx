import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { fonts } from '@/constants/tokens';
import { CoverCropper } from '@/components/CoverCropper';

// Kapak fotoğrafı seçme alt sayfası — kitap ekleme ve düzenlemede ortak.
// Seçilen/çekilen fotoğraf 2:3 kırpma adımından geçer; karta tam kapak gider.
export function PhotoPickerSheet({ visible, onClose, onPicked, canRemove, onRemove }: {
  visible: boolean;
  onClose: () => void;
  onPicked: (uri: string) => void;
  canRemove?: boolean;
  onRemove?: () => void;
}) {
  const { t } = useTheme();
  const [rawUri, setRawUri] = useState<string | null>(null);

  const pickFromGallery = async () => {
    onClose();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!result.canceled) setRawUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    onClose();
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!result.canceled) setRawUri(result.assets[0].uri);
  };

  return (
    <>
    <CoverCropper
      uri={rawUri}
      onDone={(cropped) => { setRawUri(null); onPicked(cropped); }}
      onCancel={() => setRawUri(null)}
    />
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: t.surface }]}>
          <Text style={[styles.title, { color: t.fg, fontFamily: fonts.serifMedium }]}>
            Kapak fotoğrafı
          </Text>
          <Pressable style={[styles.option, { borderColor: t.border }]} onPress={takePhoto}>
            <Ionicons name="camera-outline" size={20} color={t.fg} />
            <Text style={[styles.optionText, { color: t.fg }]}>Fotoğraf çek</Text>
          </Pressable>
          <Pressable style={[styles.option, { borderColor: t.border }]} onPress={pickFromGallery}>
            <Ionicons name="image-outline" size={20} color={t.fg} />
            <Text style={[styles.optionText, { color: t.fg }]}>Galeriden seç</Text>
          </Pressable>
          {canRemove && (
            <Pressable style={styles.remove} onPress={() => { onRemove?.(); onClose(); }}>
              <Text style={[styles.removeText, { color: t.orange }]}>Fotoğrafı kaldır</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
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
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  optionText: { fontSize: 15, fontWeight: '500' },
  remove: { alignItems: 'center', paddingVertical: 12, minHeight: 44, justifyContent: 'center' },
  removeText: { fontSize: 13, fontWeight: '600' },
});
