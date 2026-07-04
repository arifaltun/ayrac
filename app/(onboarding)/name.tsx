import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { fonts } from '@/constants/tokens';
import { ScalePressable } from '@/components/ScalePressable';

export default function NameScreen() {
  const { t } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');

  const enter = async (withName: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const trimmed = name.trim();
    if (withName && trimmed) {
      await AsyncStorage.setItem('@ayrac_user_name', trimmed);
    }
    await AsyncStorage.setItem('@ayrac_has_entered', 'true');
    router.replace('/(app)/(main)/library' as any);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.inner, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.logoRow}>
          <View style={[styles.logoMark, { backgroundColor: t.fg }]}>
            <Ionicons name="bookmark" size={16} color={t.bg} />
          </View>
          <Text style={[styles.logoText, { color: t.fg, fontFamily: fonts.serif }]}>ayraç</Text>
        </View>

        <View style={styles.center}>
          <Text style={[styles.title, { color: t.fg, fontFamily: fonts.serif }]}>
            Sana nasıl seslenelim?
          </Text>
          <Text style={[styles.subtitle, { color: t.muted }]}>
            Sadece selamlamak için — kitapların telefonunda kalır, hesap gerekmez.
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: t.surface, borderColor: t.border, color: t.fg }]}
            value={name}
            onChangeText={setName}
            placeholder="Adın"
            placeholderTextColor={t.mutedStrong}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => enter(true)}
          />
        </View>

        <View style={styles.footer}>
          {/* İsim boşken "Başla" ile "İsimsiz devam et" aynı işi yapardı — tek yol kalsın diye pasif */}
          <ScalePressable
            scale={0.97}
            style={[styles.submit, { backgroundColor: t.fg, opacity: name.trim() ? 1 : 0.35 }]}
            onPress={() => enter(true)}
            disabled={!name.trim()}
            accessibilityLabel="Başla"
            accessibilityRole="button"
            accessibilityState={{ disabled: !name.trim() }}
          >
            <Text style={[styles.submitText, { color: t.bg, fontFamily: fonts.serifMedium }]}>Başla</Text>
          </ScalePressable>

          <Pressable
            style={styles.skipLink}
            onPress={() => enter(false)}
            accessibilityRole="button"
            accessibilityLabel="İsimsiz devam et"
          >
            <Text style={[styles.skipText, { color: t.mutedStrong }]}>İsimsiz devam et</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 28 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 28, letterSpacing: -0.5 },
  center: { flex: 1, justifyContent: 'center', gap: 0 },
  title: { fontSize: 32, letterSpacing: -0.5, lineHeight: 40, marginBottom: 10 },
  subtitle: { fontSize: 14, lineHeight: 21, marginBottom: 28 },
  input: {
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 17,
  },
  footer: { gap: 4 },
  submit: { paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  submitText: { fontSize: 16, fontWeight: '700' },
  skipLink: { alignItems: 'center', paddingVertical: 14, minHeight: 44, justifyContent: 'center' },
  skipText: { fontSize: 13 },
});
