import { useRef } from 'react';
import { Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from '@/utils/haptics';
import { useTheme } from '@/context/ThemeContext';
import { fonts } from '@/constants/tokens';

// 10 üzerinden, 0.5 adımlı puan girişi. Klavye açılmaz;
// her adımda hafif haptik tik, üstte canlı serif rakam.
export function RatingSlider({ value, onChange }: {
  value: number;
  onChange: (v: number) => void;
}) {
  const { t } = useTheme();
  const lastRef = useRef(value);

  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text style={{ fontFamily: fonts.serif, fontSize: 36, lineHeight: 42, color: t.fg, letterSpacing: -0.5 }}>
          {value > 0 ? value.toFixed(1) : '—'}
        </Text>
        <Text style={{ fontSize: 14, color: t.muted }}>/ 10</Text>
      </View>
      <Slider
        minimumValue={0}
        maximumValue={10}
        step={0.5}
        value={value}
        onValueChange={(v) => {
          if (v !== lastRef.current) {
            lastRef.current = v;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(v);
          }
        }}
        minimumTrackTintColor={t.primary}
        maximumTrackTintColor={t.borderStrong}
        thumbTintColor={t.primary}
        accessibilityLabel="Puan, 10 üzerinden"
        style={{ height: 36 }}
      />
    </View>
  );
}
