import { Alert as RNAlert, AlertButton, Platform } from 'react-native';

// react-native-web'de Alert.alert sessiz bir no-op — onay diyalogları web'de
// hiç görünmez ve "vazgeç ve kapat" gibi akışlar kilitlenir. Web'de
// window.confirm/alert'e düşen ortak giriş noktası.
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]): void {
    if (Platform.OS !== 'web') {
      RNAlert.alert(title, message, buttons);
      return;
    }
    const text = message ? `${title}\n\n${message}` : title;
    if (!buttons || buttons.length <= 1) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }
    // İkiden fazla seçenek confirm'e sığmaz: iptal-dışı ilk buton "Tamam" olur
    const confirm = buttons.find((b) => b.style !== 'cancel');
    const cancel = buttons.find((b) => b.style === 'cancel');
    if (window.confirm(text)) confirm?.onPress?.();
    else cancel?.onPress?.();
  },
};
