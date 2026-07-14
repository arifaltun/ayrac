import { View, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from '@/utils/haptics';
import { useTheme } from '@/context/ThemeContext';
import { ScalePressable } from '@/components/ScalePressable';

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
      <ScalePressable
        scale={0.92}
        style={styles.tab}
        // replace: sekmeler yığın biriktirmesin, Android geri tuşu geçmişi sarmasın
        onPress={() => { Haptics.selectionAsync(); router.replace('/library' as any); }}
        accessibilityLabel="Kitaplık"
        accessibilityRole="tab"
        accessibilityState={{ selected: isLibrary }}
      >
        <Ionicons name={isLibrary ? 'book' : 'book-outline'} size={22} color={isLibrary ? t.primary : t.muted} />
        <Text style={[styles.label, { color: isLibrary ? t.primary : t.muted }]}>Kitaplık</Text>
      </ScalePressable>

      <ScalePressable
        scale={0.93}
        style={[styles.fab, { backgroundColor: t.primary }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/add-book' as any); }}
        accessibilityLabel="Kitap ekle"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={26} color="#000" />
      </ScalePressable>

      <ScalePressable
        scale={0.92}
        style={styles.tab}
        onPress={() => { Haptics.selectionAsync(); router.replace('/wrapped' as any); }}
        accessibilityLabel="Okuma özeti"
        accessibilityRole="tab"
        accessibilityState={{ selected: isWrapped }}
      >
        <Ionicons name={isWrapped ? 'bar-chart' : 'bar-chart-outline'} size={22} color={isWrapped ? t.primary : t.muted} />
        <Text style={[styles.label, { color: isWrapped ? t.primary : t.muted }]}>Özet</Text>
      </ScalePressable>
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
