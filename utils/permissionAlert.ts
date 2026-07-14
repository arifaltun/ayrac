import { Linking, Platform } from 'react-native';
import { Alert } from '@/utils/alert';

// İzin kalıcı reddedildiğinde çıkmaz sokak bırakma: Ayarlar'a giden yol göster.
// Kamera, galeri ve bildirim akışlarında ortak.
// Web'de uygulama ayarları sayfası yok — izin tarayıcıdan yönetilir.
export function permissionDeniedAlert(what: string) {
  if (Platform.OS === 'web') {
    Alert.alert(
      'İzin gerekiyor',
      `${what} için tarayıcı ayarlarından izin vermen gerekiyor.`,
    );
    return;
  }
  Alert.alert(
    'İzin gerekiyor',
    `${what} için Ayarlar'dan ayraç'a izin vermen gerekiyor.`,
    [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Ayarları aç', onPress: () => Linking.openSettings() },
    ],
  );
}
