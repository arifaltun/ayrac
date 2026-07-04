import { Alert, Linking } from 'react-native';

// İzin kalıcı reddedildiğinde çıkmaz sokak bırakma: Ayarlar'a giden yol göster.
// Kamera, galeri ve bildirim akışlarında ortak.
export function permissionDeniedAlert(what: string) {
  Alert.alert(
    'İzin gerekiyor',
    `${what} için Ayarlar'dan ayraç'a izin vermen gerekiyor.`,
    [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Ayarları aç', onPress: () => Linking.openSettings() },
    ],
  );
}
