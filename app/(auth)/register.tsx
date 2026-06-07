import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { fonts } from '@/constants/tokens';

export default function RegisterScreen() {
  const { t } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const inputStyle = [styles.input, { backgroundColor: t.surface, borderColor: t.border, color: t.fg }];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.inner, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={[styles.logoMark, { backgroundColor: '#000' }]}>
            <Ionicons name="bookmark" size={16} color="#fff" />
          </View>
          <Text style={[styles.logoText, { color: t.fg, fontFamily: fonts.serif }]}>ayraç</Text>
        </View>

        <Text style={[styles.title, { color: t.fg, fontFamily: fonts.serif }]}>
          Hesap oluştur
        </Text>
        <Text style={[styles.subtitle, { color: t.muted }]}>
          Okuma yolculuğunu kayıt altına al.
        </Text>

        <View style={styles.fields}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: t.muted }]}>AD SOYAD</Text>
            <TextInput
              style={inputStyle}
              value={name}
              onChangeText={setName}
              placeholder="Adın"
              placeholderTextColor={t.mutedStrong}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: t.muted }]}>E-POSTA</Text>
            <TextInput
              style={inputStyle}
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@mail.com"
              placeholderTextColor={t.mutedStrong}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: t.muted }]}>ŞİFRE</Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                style={inputStyle}
                value={password}
                onChangeText={setPassword}
                placeholder="En az 8 karakter"
                placeholderTextColor={t.mutedStrong}
                secureTextEntry={!showPass}
              />
              <Pressable
                style={styles.eyeBtn}
                onPress={() => setShowPass((s) => !s)}
              >
                <Ionicons
                  name={showPass ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color={t.muted}
                />
              </Pressable>
            </View>
          </View>
        </View>

        <Pressable
          style={[styles.submit, { backgroundColor: t.fg }]}
          onPress={() => router.replace('/library' as any)}
        >
          <Text style={[styles.submitText, { color: t.bg }]}>Başla</Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: t.border }]} />
          <Text style={[styles.dividerText, { color: t.muted }]}>veya</Text>
          <View style={[styles.dividerLine, { backgroundColor: t.border }]} />
        </View>

        <Pressable
          style={styles.loginLink}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={[styles.loginLinkText, { color: t.muted }]}>
            Zaten hesabın var mı?{' '}
            <Text style={{ color: t.primary, fontWeight: '600' }}>Giriş yap</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { paddingHorizontal: 28 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 36 },
  logoMark: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 28, letterSpacing: -0.5 },
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 32 },
  fields: { gap: 12, marginBottom: 24 },
  field: { gap: 4 },
  label: { fontSize: 9, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' },
  input: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 14,
  },
  eyeBtn: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  submit: {
    paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginBottom: 20,
  },
  submitText: { fontSize: 15, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12 },
  loginLink: { alignItems: 'center' },
  loginLinkText: { fontSize: 13 },
});
