import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { Chip } from '@/components/ui/chip';
import { RELIEFS } from '@/constants/tax-relief';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

type Props = { value: string | undefined; onChange: (id: string | undefined) => void };

/** Optional "claim this under a tax relief" choice for an expense. Folded away until it is opened. */
export function TaxReliefPicker({ value, onChange }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const chosen = RELIEFS.find((r) => r.id === value);

  return (
    <View style={styles.wrap}>
      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>{t('tax.picker.label')}</ThemedText>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={[styles.row, { backgroundColor: colors.backgroundElement, borderColor: chosen ? colors.accent : colors.divider }]}
      >
        <Ionicons name={chosen ? chosen.icon : 'receipt-outline'} size={18} color={chosen ? colors.accent : colors.textSecondary} />
        <ThemedText type="small" style={[styles.flex, { color: chosen ? colors.text : colors.textSecondary }]} numberOfLines={1}>
          {chosen ? t(chosen.nameKey) : t('tax.picker.none')}
        </ThemedText>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
      </Pressable>
      {open ? (
        <View style={styles.chips}>
          <Chip size="sm" label={t('tax.picker.none')} active={!value} onPress={() => { onChange(undefined); setOpen(false); }} />
          {RELIEFS.map((r) => (
            <Chip key={r.id} size="sm" icon={r.icon} label={t(r.nameKey)} active={value === r.id} onPress={() => { onChange(r.id); setOpen(false); }} />
          ))}
        </View>
      ) : null}
      {chosen ? <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('tax.picker.hint')}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { marginTop: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.three, paddingVertical: 12, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
