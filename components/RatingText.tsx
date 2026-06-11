import { Text } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { fonts } from '@/constants/tokens';

// Puan gösterimi: "7.5 / 10", serif dizgiyle. Puan yoksa hiçbir şey çizmez.
export function RatingText({ value, size = 12 }: { value: number; size?: number }) {
  const { t } = useTheme();
  if (value <= 0) return null;
  return (
    <Text style={{ fontFamily: fonts.serifMedium, fontSize: size, color: t.fg, letterSpacing: -0.2 }}>
      {value.toFixed(1)}
      <Text style={{ fontSize: Math.round(size * 0.82), color: t.muted }}> / 10</Text>
    </Text>
  );
}
