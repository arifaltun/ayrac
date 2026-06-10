import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

// Temaya duyarlı yıldız puanı — her iki temada da okunur.
export function Stars({ value, size = 11, gap = 2 }: { value: number; size?: number; gap?: number }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= value ? 'star' : 'star-outline'}
          size={size}
          color={i <= value ? t.warning : t.borderStrong}
        />
      ))}
    </View>
  );
}
