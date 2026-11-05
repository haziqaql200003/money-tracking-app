import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { HomeUpcoming, useUpcomingItems } from '@/components/home/home-upcoming';
import { ThemedText } from '@/components/ui/themed-text';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { spentByCategory } from '@/utils/budget';
import { formatMoney } from '@/utils/currency';
import { cycleOf, daysToPayday, shiftCycle } from '@/utils/cycle';
import { toDateKey } from '@/utils/dates';
import { formatPct, pctChange } from '@/utils/insights';
import { isAdjustmentEntry, isLinkedEntry, looksLikeSavings } from '@/utils/saved';

const MASK = 'RM ••••'; // i18n-ignore

/** A bar that grows to its width when it first shows (and again when the value changes). */
function GrowBar({ pct, color, track }: { pct: number; color: string; track: string }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, { toValue: Math.max(0, Math.min(1, pct)), duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct, v]);
  const width = v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={[styles.track, { backgroundColor: track }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color, width }]} />
    </View>
  );
}

/**
 * Home A5 (3.7.0): how much can be spent today without touching the bills due before payday.
 * (Money you can use + what was already spent today - bills before payday) / days to payday.
 * Savings accounts are left out, like on the first card. Tapping it opens the cash-flow calendar.
 */
export function SafeToSpend() {
  const { t } = useT();
  const colors = useTheme();
  const dark = useColorScheme() === 'dark';
  const router = useRouter();
  const { hideAmounts } = usePrivacy();
  const { selectableAccounts, accountBalance, transactions } = useTransactions();

  const today = toDateKey(new Date());
  const days = daysToPayday(today);
  const daysLeft = Math.max(1, days);
  const items = useUpcomingItems(Math.max(0, days));

  const { perDay, spentToday, bills } = (() => {
    const spendable = selectableAccounts.filter((a) => !looksLikeSavings(a));
    const ids = new Set(spendable.map((a) => a.id));
    const balance = spendable.reduce((s, a) => s + accountBalance(a.id), 0);
    const spent = transactions
      .filter((x) => x.type === 'debit' && x.date === today && ids.has(x.accountId) && !isLinkedEntry(x) && !isAdjustmentEntry(x))
      .reduce((s, x) => s + x.amount, 0);
    // Bills on payday itself are paid from the new salary, so only the ones before it are set aside.
    const due = items.filter((i) => i.type === 'debit' && i.daysUntil < daysLeft).reduce((s, i) => s + i.amount, 0);
    return { perDay: (balance + spent - due) / daysLeft, spentToday: spent, bills: due };
  })();

  const short = perDay <= 0;
  const left = perDay - spentToday;
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(Math.round(n * 100) / 100));
  const big = hideAmounts ? 'RM •••' /* i18n-ignore */ : `RM ${Math.max(0, Math.floor(perDay)).toLocaleString('en-MY')}`; // i18n-ignore

  // Light mode: a dark ink card with a gold thread. Dark mode (and premium themes): the theme's own surface and accent.
  const bg = dark ? colors.backgroundSelected : colors.text;
  const ink = dark ? colors.text : colors.background;
  const hi = dark ? colors.accent : colors.gold;

  return (
    <Pressable
      onPress={() => router.push('/more/cashflow')}
      style={({ pressed }) => [styles.hero, { backgroundColor: bg, borderColor: dark ? colors.border : bg }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${t('home.safe.title')}, ${big}`}
    >
      <View pointerEvents="none" style={[styles.ring, styles.ringBig, { borderColor: hi }]} />
      <View pointerEvents="none" style={[styles.ring, styles.ringSmall, { borderColor: hi }]} />
      <ThemedText style={[styles.overline, { color: hi }]}>{t('home.safe.title').toUpperCase()}</ThemedText>
      <ThemedText style={[styles.big, { color: short ? colors.negative : ink }]} numberOfLines={1}>
        {big}
      </ThemedText>
      <ThemedText style={[styles.sub, { color: ink }]} numberOfLines={2}>
        {short ? t('home.safe.short') : days === 0 ? t('home.safe.subPayday', { bills: money(bills) }) : t('home.safe.sub', { days, bills: money(bills) })}
      </ThemedText>
      {!short ? (
        <>
          <GrowBar pct={perDay > 0 ? spentToday / perDay : 0} color={left < 0 ? colors.negative : hi} track={dark ? colors.divider : 'rgba(255,255,255,0.18)'} />
          <View style={styles.split}>
            <ThemedText style={[styles.splitText, { color: ink }]}>{t('home.safe.used', { amount: money(spentToday) })}</ThemedText>
            <ThemedText style={[styles.splitText, { color: left < 0 ? colors.negative : ink }]}>
              {left < 0 ? t('home.safe.over', { amount: money(-left) }) : t('home.safe.left', { amount: money(left) })}
            </ThemedText>
          </View>
        </>
      ) : null}
    </Pressable>
  );
}

const CYCLES = 6;

/** This month's spending for the account in view, with the last six months as a small line. */
function SpendTile({ accountId }: { accountId?: string }) {
  const { t } = useT();
  const colors = useTheme();
  const router = useRouter();
  const { hideAmounts } = usePrivacy();
  const { transactions } = useTransactions();

  const values = useMemo(() => {
    const now = cycleOf(toDateKey(new Date()));
    const keys = Array.from({ length: CYCLES }, (_, i) => shiftCycle(now, i - (CYCLES - 1)));
    const sums = new Map(keys.map((k) => [k, 0]));
    for (const x of transactions) {
      if (x.type !== 'debit' || isLinkedEntry(x) || (accountId && x.accountId !== accountId)) continue;
      const k = cycleOf(x.date);
      if (sums.has(k)) sums.set(k, (sums.get(k) ?? 0) + x.amount);
    }
    return keys.map((k) => sums.get(k) ?? 0);
  }, [transactions, accountId]);

  const now = values[values.length - 1];
  const change = pctChange(now, values[values.length - 2]);
  const max = Math.max(1, ...values);
  const W = 120;
  const H = 36;
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * W).toFixed(1)} ${(H - 3 - (v / max) * (H - 6)).toFixed(1)}`).join(' ');

  return (
    <Pressable
      onPress={() => router.push('/analyse')}
      style={({ pressed }) => [styles.tile, { backgroundColor: colors.backgroundElement, borderColor: colors.border }, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <ThemedText type="smallBold" numberOfLines={1}>{t('home.spend.title')}</ThemedText>
      <ThemedText style={styles.tileValue} numberOfLines={1}>
        {hideAmounts ? MASK : formatMoney(now)}
      </ThemedText>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Path d={`${line} L${W} ${H} L0 ${H} Z`} fill={colors.accentSoft} />
        <Path d={line} fill="none" stroke={colors.accent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <ThemedText style={[styles.tileSub, { color: change === null ? colors.textSecondary : change > 0 ? colors.negative : colors.positive }]} numberOfLines={2}>
        {change === null ? t('home.spend.noCompare') : `${change > 0 ? '▲' : '▼'} ${t('home.spend.vsLast', { pct: formatPct(change) })}`}
      </ThemedText>
    </Pressable>
  );
}

/** All budgets together this month as one ring. */
function BudgetTile() {
  const { t } = useT();
  const colors = useTheme();
  const router = useRouter();
  const { hideAmounts } = usePrivacy();
  const { budgetEntries } = useTransactions();
  const { expenseCategories } = useCategories();

  const { limit, spent } = useMemo(() => {
    const monthKey = cycleOf(toDateKey(new Date()));
    const byCat = spentByCategory(budgetEntries, monthKey);
    const budgeted = expenseCategories.filter((c) => c.monthlyLimit > 0);
    return {
      limit: budgeted.reduce((s, c) => s + c.monthlyLimit, 0),
      spent: budgeted.reduce((s, c) => s + (byCat.get(c.id) ?? 0), 0),
    };
  }, [budgetEntries, expenseCategories]);

  const pct = limit > 0 ? spent / limit : 0;
  const R = 20;
  const C = 2 * Math.PI * R;
  const ringColor = pct >= 1 ? colors.negative : pct >= 0.8 ? colors.warning : colors.positive;

  return (
    <Pressable
      onPress={() => router.push('/more/budgets')}
      style={({ pressed }) => [styles.tile, styles.budgetTile, { backgroundColor: colors.backgroundElement, borderColor: colors.border }, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={styles.budgetHead}>
        <Svg width={44} height={44} viewBox="0 0 52 52">
          <Circle cx={26} cy={26} r={R} fill="none" stroke={colors.backgroundSelected} strokeWidth={7} />
          {limit > 0 ? (
            <Circle
              cx={26}
              cy={26}
              r={R}
              fill="none"
              stroke={ringColor}
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={`${(C * Math.min(1, pct)).toFixed(1)} ${C.toFixed(1)}`}
              transform="rotate(-90 26 26)"
            />
          ) : null}
        </Svg>
        <View style={styles.flex}>
          <ThemedText type="smallBold" numberOfLines={1}>{t('home.budget.title')}</ThemedText>
          {limit > 0 ? <ThemedText style={[styles.tileValueSmall, { color: ringColor }]}>{`${Math.round(pct * 100)}%`}</ThemedText> : null}
        </View>
      </View>
      <ThemedText style={[styles.tileSub, { color: limit === 0 ? colors.accent : pct >= 1 ? colors.negative : colors.textSecondary }]} numberOfLines={2}>
        {limit === 0
          ? t('home.budget.none')
          : pct >= 1
            ? t('home.budget.over')
            : t('home.budget.left', { amount: hideAmounts ? MASK : formatMoney(Math.round(limit - spent)) })}
      </ThemedText>
    </Pressable>
  );
}

/** Coming up on the left, this month's spending and the budget ring on the right. */
export function HomeBento({ accountId }: { accountId?: string }) {
  return (
    <View style={styles.bento}>
      <View style={styles.col}>
        <HomeUpcoming variant="tile" />
      </View>
      <View style={[styles.col, styles.colGap]}>
        <SpendTile accountId={accountId} />
        <BudgetTile />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.85 },
  hero: { borderRadius: Radius.xl, borderWidth: 1, padding: 18, overflow: 'hidden' },
  ring: { position: 'absolute', borderWidth: 1, borderRadius: 999, opacity: 0.35 },
  ringBig: { width: 160, height: 160, right: -46, top: -56 },
  ringSmall: { width: 96, height: 96, right: -12, top: -24 },
  overline: { fontSize: FontSize.micro, fontWeight: '800', letterSpacing: 0.8 },
  big: { fontSize: 44, lineHeight: 52, fontWeight: '800', letterSpacing: -1, marginTop: 2, ...tabularNums },
  sub: { fontSize: FontSize.caption, fontWeight: '600', opacity: 0.8 },
  track: { height: 7, borderRadius: Radius.pill, overflow: 'hidden', marginTop: 12 },
  fill: { height: '100%', borderRadius: Radius.pill },
  split: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  splitText: { fontSize: FontSize.caption, fontWeight: '700', opacity: 0.9, ...tabularNums },
  bento: { flexDirection: 'row', gap: Spacing.three - 4 },
  col: { flex: 1, minWidth: 0 },
  colGap: { gap: Spacing.three - 4 },
  tile: { borderRadius: Radius.lg, borderWidth: 1, padding: 14, gap: 2 },
  budgetTile: { flex: 1, gap: 6, justifyContent: 'center' },
  budgetHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tileValue: { fontSize: FontSize.heading, lineHeight: 24, fontWeight: '800', marginTop: 2, ...tabularNums },
  tileSub: { fontSize: FontSize.micro, fontWeight: '700' },
  tileValueSmall: { fontSize: FontSize.label, fontWeight: '800', ...tabularNums },
});
