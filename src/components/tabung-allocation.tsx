import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { usePlan } from '@/context/PlanContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { accountName } from '@/i18n/data';
import { formatMoney } from '@/utils/currency';
import { allocationOf } from '@/utils/goals';

const MASK = 'RM ••••';

/** For each savings account that goals point at: how much of its balance is already earmarked, and what is free. */
export function TabungAllocation() {
  const colors = useTheme();
  const { t } = useT();
  const { accounts, accountBalance } = useTransactions();
  const { goals, goalEntries } = usePlan();
  const { hideAmounts } = usePrivacy();
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));

  const rows = accounts
    .filter((a) => !a.hidden && goals.some((g) => g.accountId === a.id))
    .map((a) => ({ account: a, ...allocationOf(a.id, accountBalance(a.id), goals, goalEntries) }));
  if (rows.length === 0) return null;

  return (
    <View>
      {rows.map(({ account, balance, parts, free }) => (
        <View key={account.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <View style={styles.head}>
            <ThemedText type="smallBold" style={styles.flex} numberOfLines={1}>{accountName(account)}</ThemedText>
            <ThemedText type="smallBold">{money(balance)}</ThemedText>
          </View>
          <View style={[styles.bar, { backgroundColor: colors.backgroundSelected }]}>
            {parts.map((p) => (
              <View key={p.id} style={{ width: `${balance > 0 ? Math.min(100, (p.amount / balance) * 100) : 0}%`, backgroundColor: p.color }} />
            ))}
          </View>
          {parts.map((p) => (
            <View key={p.id} style={styles.line}>
              <View style={[styles.dot, { backgroundColor: p.color }]} />
              <ThemedText type="small" style={styles.flex} numberOfLines={1}>{p.name}</ThemedText>
              <ThemedText type="small">{money(p.amount)}</ThemedText>
            </View>
          ))}
          <View style={styles.line}>
            <View style={[styles.dot, { backgroundColor: colors.backgroundSelected }]} />
            <ThemedText type="small" style={[styles.flex, { color: colors.textSecondary }]}>{t('plan.alloc.free')}</ThemedText>
            <ThemedText type="small" style={{ fontWeight: '700', color: free < 0 ? colors.negative : colors.text }}>{money(free)}</ThemedText>
          </View>
          {free < 0 ? <ThemedText type="small" style={{ color: colors.negative }}>{t('plan.alloc.over', { amount: money(-free) })}</ThemedText> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: 20, padding: 16, marginBottom: Spacing.three, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { height: 10, borderRadius: 5, flexDirection: 'row', overflow: 'hidden' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
