import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import type { Severity } from '@/utils/insight-engine';

export const SEVERITY_ICON: Record<Severity, keyof typeof Ionicons.glyphMap> = {
  critical: 'warning',
  attention: 'alert-circle-outline',
  opportunity: 'bulb-outline',
  positive: 'checkmark-circle-outline',
};

type Colors = ReturnType<typeof useTheme>;

/** The one colour for each severity, in both themes: critical red, attention amber, opportunity indigo, positive green. */
export function severityTone(colors: Colors, s: Severity): string {
  return s === 'critical' ? colors.negative : s === 'attention' ? colors.warning : s === 'opportunity' ? colors.accent : colors.positive;
}

/** A '#RRGGBB' colour at `alpha` (0-1), for soft chip backgrounds. Falls back to the theme's soft accent. */
export function soft(colors: Colors, hex: string, alpha = 0.14): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return colors.accentSoft;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

/**
 * The severity chip used everywhere in Faham: same colour, icon and word for a severity on every screen,
 * so colour is never the only signal.
 */
export function StatusChip({ severity, label }: { severity: Severity; label?: string }) {
  const colors = useTheme();
  const { t } = useT();
  const c = severityTone(colors, severity);
  return (
    <View style={[styles.chip, { backgroundColor: soft(colors, c) }]}>
      <Ionicons name={SEVERITY_ICON[severity]} size={13} color={c} />
      <ThemedText type="small" style={[styles.text, { color: c }]} numberOfLines={1}>
        {label ?? t(`fc.sev.${severity}` as TKey)}
      </ThemedText>
    </View>
  );
}

/** A small "+6%" / "−12%" chip for a change in spending: up is red, down is green, under 1% is grey. */
export function ChangeChip({ pct, invert }: { pct: number | null; invert?: boolean }) {
  const colors = useTheme();
  if (pct === null || !Number.isFinite(pct)) return null;
  const r = Math.round(pct);
  const up = r > 0;
  const flat = r === 0;
  // For spending, up is bad. `invert` flips that for money in or money kept.
  const bad = invert ? !up : up;
  const c = flat ? colors.textSecondary : bad ? colors.negative : colors.positive;
  return (
    <View style={[styles.change, { backgroundColor: flat ? colors.backgroundSelected : soft(colors, c) }]}>
      <ThemedText type="small" style={[styles.changeText, { color: c }]}>{`${up ? '+' : flat ? '' : '−'}${Math.abs(r)}%`}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  text: { fontSize: 11.5, lineHeight: 16, fontWeight: '800' },
  change: { borderRadius: Radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  changeText: { fontSize: 11, lineHeight: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
