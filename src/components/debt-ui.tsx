import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import type { Account } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { accountName } from '@/i18n/data';

/** Small building blocks shared by the debt form and the debt detail sheet. */

export function FieldLabel({ text, hint }: { text: string; hint?: string }) {
  const colors = useTheme();
  return (
    <View style={styles.labelBlock}>
      <ThemedText type="small" style={{ color: colors.textSecondary }}>
        {text}
      </ThemedText>
      {hint ? (
        <ThemedText type="small" style={{ color: colors.textSecondary, opacity: 0.8 }}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function DebtInput(props: TextInputProps) {
  const colors = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.textSecondary}
      {...props}
      style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }, props.style]}
    />
  );
}

export function AccountPicker({ accounts, value, onChange }: { accounts: Account[]; value: string; onChange: (id: string) => void }) {
  return (
    <View style={styles.chips}>
      {accounts.map((a) => (
        <Chip key={a.id} label={accountName(a)} active={a.id === value} onPress={() => onChange(a.id)} />
      ))}
    </View>
  );
}

export function ProgressBar({ percent, color }: { percent: number; color: string }) {
  const colors = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
      <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: color }]} />
    </View>
  );
}

export const toNumber = (s: string) => {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

const styles = StyleSheet.create({
  labelBlock: { marginTop: Spacing.three, marginBottom: Spacing.one },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: 14, fontSize: FontSize.body },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  track: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: Radius.pill },
});
