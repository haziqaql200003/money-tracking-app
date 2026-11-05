import { Pressable, StyleSheet, View, type TextInputProps } from 'react-native';
import { TextInput } from '@/components/ui/text';

import { AmountInput } from '@/components/ui/amount-input';
import { ThemedText } from '@/components/ui/themed-text';
import { BrandAvatar } from '@/components/ui/brand-avatar';
import { findBrand } from '@/constants/brands';
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

/** DebtInput for ringgit: digits slide in from the right, like every other money field. */
export function DebtAmountInput({ value, onChangeText, placeholder, style }: { value: string; onChangeText: (v: string) => void; placeholder?: string; style?: TextInputProps['style'] }) {
  const colors = useTheme();
  return (
    <AmountInput
      value={value}
      onChange={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }, style]}
    />
  );
}

export function AccountPicker({ accounts, value, onChange }: { accounts: Account[]; value: string; onChange: (id: string) => void }) {
  return (
    <View style={styles.chips}>
      {accounts.map((a) => (
        <AccountChip key={a.id} account={a} active={a.id === value} onPress={() => onChange(a.id)} />
      ))}
    </View>
  );
}

/** An account to pick: its bank's or e-wallet's logo (or letter) when WaKira knows it, then its name. */
function AccountChip({ account, active, onPress }: { account: Account; active: boolean; onPress: () => void }) {
  const colors = useTheme();
  const label = accountName(account);
  const brandName = findBrand(account.provider) ? account.provider : findBrand(account.name) ? account.name : null;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.backgroundSelected : 'transparent' }]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {brandName ? <BrandAvatar name={brandName} size={20} /> : null}
      <ThemedText type="small" style={{ fontWeight: active ? '700' : '500', color: active ? colors.accent : colors.text }}>{label}</ThemedText>
    </Pressable>
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
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1 },
  track: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: Radius.pill },
});
