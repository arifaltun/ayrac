import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { usePro, PaywallTrigger } from '@/context/ProContext';
import { fonts } from '@/constants/tokens';
import { MONETIZATION_ENABLED } from '@/constants/features';

// Pro'ya özel bölümler için tek tip kilit.
// children verilirse içerik soluk bir önizleme olarak altta durur (blur hissi),
// verilmezse kendi başına kilitli bir kart çizer. Dokunınca paywall açılır.
export function ProFeatureGate({ trigger, title, description, children }: {
  trigger: PaywallTrigger;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  const { t } = useTheme();
  const { isPro, showPaywall } = usePro();

  // Monetizasyon kapalıyken kapı hiç çizilmez — içerik doğrudan gösterilir
  if (!MONETIZATION_ENABLED || isPro) return <>{children}</>;

  const lockChip = (
    <View style={[styles.chip, { backgroundColor: t.surface, borderColor: t.borderStrong }]}>
      <Ionicons name="lock-closed" size={12} color={t.fg} />
      <Text style={[styles.chipText, { color: t.fg }]}>Pro’ya özel</Text>
    </View>
  );

  if (children) {
    return (
      <Pressable
        onPress={() => showPaywall(trigger)}
        accessibilityRole="button"
        accessibilityLabel={`${title} — Pro'ya özel`}
      >
        <View pointerEvents="none" style={styles.preview}>{children}</View>
        <View style={styles.overlay}>
          {lockChip}
          <Text style={[styles.overlayTitle, { color: t.fg, fontFamily: fonts.serifMedium }]}>
            {title}
          </Text>
          {description ? (
            <Text style={[styles.overlayDesc, { color: t.muted }]}>{description}</Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => showPaywall(trigger)}
      accessibilityRole="button"
      accessibilityLabel={`${title} — Pro'ya özel`}
      style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}
    >
      {lockChip}
      <Text style={[styles.cardTitle, { color: t.fg, fontFamily: fonts.serifMedium }]}>{title}</Text>
      {description ? (
        <Text style={[styles.cardDesc, { color: t.muted }]}>{description}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  preview: { opacity: 0.22 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 24,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  overlayTitle: { fontSize: 15, letterSpacing: -0.2, textAlign: 'center', marginTop: 2 },
  overlayDesc: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  cardTitle: { fontSize: 15, letterSpacing: -0.2, textAlign: 'center', marginTop: 2 },
  cardDesc: { fontSize: 12, lineHeight: 17, textAlign: 'center', maxWidth: 260 },
});
