import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export const DONE_BAR_ID = 'ayrac-keyboard-done';

// iOS sayı klavyesinde dönüş tuşu yok — klavyenin üstüne "Tamam" çubuğu ekler.
// Android'de sayı klavyesinin kendi onay tuşu var; orada render edilmez.
export function KeyboardDoneBar() {
  const { t } = useTheme();
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={DONE_BAR_ID}>
      <View style={[styles.bar, { backgroundColor: t.surface2, borderTopColor: t.border }]}>
        <Pressable
          onPress={Keyboard.dismiss}
          style={styles.btn}
          accessibilityLabel="Klavyeyi kapat"
          accessibilityRole="button"
        >
          <Text style={[styles.btnText, { color: t.fg }]}>Tamam</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

// Sayısal TextInput'lara vermek için ortak prop
export const doneBarProps = Platform.OS === 'ios' ? { inputAccessoryViewID: DONE_BAR_ID } : {};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  btnText: { fontSize: 15, fontWeight: '600' },
});
