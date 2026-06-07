import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';

export function BottomNav() {
  const { t } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isLibrary = pathname.includes('library');
  const isWrapped = pathname.includes('wrapped');

  return (
    <View
      style={[
        styles.container,
        {
          borderTopColor: t.border,
          backgroundColor: t.bg,
          paddingBottom: insets.bottom + 8,
        },
      ]}
    >
      {/* Kitaplık */}
      <Pressable
        style={styles.tab}
        onPress={() => router.push('/library' as any)}
      >
        <Ionicons
          name="book-outline"
          size={22}
          color={isLibrary ? t.primary : t.muted}
        />
        <Text style={[styles.label, { color: isLibrary ? t.primary : t.muted }]}>
          Kitaplık
        </Text>
      </Pressable>

      {/* FAB — Kitap ekle */}
      <Pressable
        style={[styles.fab, { backgroundColor: t.primary }]}
        onPress={() => router.push('/add-book' as any)}
      >
        <Ionicons name="add" size={26} color="#000" />
      </Pressable>

      {/* Paylaş */}
      <Pressable
        style={styles.tab}
        onPress={() => router.push('/wrapped' as any)}
      >
        <Ionicons
          name="share-outline"
          size={22}
          color={isWrapped ? t.primary : t.muted}
        />
        <Text style={[styles.label, { color: isWrapped ? t.primary : t.muted }]}>
          Paylaş
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
