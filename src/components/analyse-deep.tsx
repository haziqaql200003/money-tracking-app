import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/category-icon';
import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { cycleInfo } from '@/utils/cycle';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { accountName, categoryName as categoryLabel, subcategoryName } from '@/i18n/data';
import { weekdayShort } from '@/i18n/format';
import { upcomingBills, billsTotal } from '@/utils/bills';
import { formatCompact, formatMoney } from '@/utils/currency';
import { dayLabel, monthLabel } from '@/utils/dates';
import {
  balanceTrend,
  budgetHistory,
  categoryByMonth,
  fixedVsEveryday,
  incomeStats,
  monthCalendar,
  monthOutlook,
  monthRhythm,
  records,
  spendingByAccount,
  topSubcategories,
  unusualExpenses,
} from '@/utils/deep-insights';
import { currentWindow, monthKeysEnding } from '@/utils/insights';

const MASK = 'RM ••••';

type Props = { months: number; todayKey: string };

/** The "Deep dive" tab of Faham: forecast, calendar, income, records, budgets, unusual spending and more. */
export function AnalyseDeep({ months, todayKey }: Props) {
  const colors = useTheme();
  const { t, tp } = useT();
  const { transactions, accounts, transfers, recurringRules } = useTransactions();
  const { expenseCategories, getCategory, totalBudget } = useCategories();
  const { hideAmounts } = usePrivacy();

  const keys = useMemo(() => monthKeysEnding(todayKey, months), [todayKey, months]);
  const [calendarKey, setCalendarKey] = useState<string | null>(null);
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [pickedCategory, setPickedCategory] = useState<string | null>(null);

  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const compact = (n: number) => (hideAmounts ? '••' : formatCompact(n));
  const catName = (id: string) => {
    const c = getCategory(id);
    return c ? categoryLabel(c) : t('cat.other');
  };

  const d = useMemo(() => {
    const w = currentWindow(todayKey, months);
    const daysLeft = cycleInfo(todayKey).daysAfterToday;
    const bills = billsTotal(upcomingBills(recurringRules, todayKey, daysLeft));
    const hiddenIds = new Set(accounts.filter((a) => a.hidden).map((a) => a.id));
    const startingTotal = accounts.reduce((s, a) => (a.hidden ? s : s + a.initialBalance), 0);
    const spendByCat = new Map<string, number>();
    for (const tx of transactions) if (tx.type === 'debit' && tx.date >= w.from && tx.date <= w.to) spendByCat.set(tx.categoryId, (spendByCat.get(tx.categoryId) ?? 0) + tx.amount);
    return {
      w,
      outlook: monthOutlook(transactions, todayKey, bills, totalBudget),
      split: fixedVsEveryday(transactions, w),
      income: incomeStats(transactions, w, keys),
      subs: topSubcategories(transactions, w, 8),
      rec: records(transactions, w, keys, todayKey),
      byAccount: spendingByAccount(transactions, w),
      budgets: budgetHistory(transactions, expenseCategories.map((c) => ({ categoryId: c.id, limit: c.monthlyLimit })), w, keys, todayKey),
      unusual: unusualExpenses(transactions, w, 3),
      rhythm: monthRhythm(transactions, w),
      balance: balanceTrend(transactions, startingTotal, keys, todayKey, { hiddenIds, transfers }),
      topCats: [...spendByCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id),
    };
  }, [transactions, accounts, transfers, recurringRules, expenseCategories, totalBudget, todayKey, months, keys]);

  const activeCalendarKey = calendarKey && keys.includes(calendarKey) ? calendarKey : keys[keys.length - 1];
  const calendar = useMemo(() => monthCalendar(transactions, activeCalendarKey), [transactions, activeCalendarKey]);
  const calIndex = keys.indexOf(activeCalendarKey);
  const picked = calendar.days.find((x) => x.date === pickedDay) ?? null;

  const chosenCategory = pickedCategory && d.topCats.includes(pickedCategory) ? pickedCategory : d.topCats[0];
  const categorySeries = useMemo(() => (chosenCategory ? categoryByMonth(transactions, chosenCategory, keys) : []), [transactions, chosenCategory, keys]);

  const hasAnything = d.rec.expenseCount > 0 || d.income.total > 0;
  if (!hasAnything) {
    return (
      <View style={[styles.card, styles.center, { backgroundColor: colors.backgroundElement }]}>
        <Ionicons name="telescope-outline" size={32} color={colors.textSecondary} />
        <ThemedText style={styles.cardTitle}>{t('plan.deep.emptyTitle')}</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
          {t('plan.deep.emptyBody')}
        </ThemedText>
      </View>
    );
  }

  const muted = { color: colors.textSecondary };

  const outlook = d.outlook;
  const outlookVisible = outlook.spentSoFar > 0 || outlook.billsAhead > 0;
  const vsLast = outlook.lastMonthTotal > 0 ? outlook.projected - outlook.lastMonthTotal : null;
  const budgetGap = outlook.budget > 0 ? outlook.projected - outlook.budget : null;
  const barMax = Math.max(outlook.projected, outlook.budget, 1);
  const intensity = (total: number) => {
    if (total <= 0 || calendar.max <= 0) return 0;
    const r = total / calendar.max;
    return r > 0.75 ? 4 : r > 0.5 ? 3 : r > 0.25 ? 2 : 1;
  };
  const heat = [colors.backgroundSelected, `${colors.accent}40`, `${colors.accent}73`, `${colors.accent}B3`, colors.accent];

  const cells: (number | null)[] = [...Array(calendar.startOffset).fill(null), ...calendar.days.map((x) => x.day)];
  while (cells.length % 7 !== 0) cells.push(null);
  const calRows = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  const maxCat = Math.max(1, ...categorySeries.map((x) => x.total));
  const catAvg = categorySeries.length ? categorySeries.reduce((s, x) => s + x.total, 0) / categorySeries.length : 0;
  const balMax = Math.max(1, ...d.balance.map((b) => Math.abs(b.balance)));
  const balFirst = d.balance[0]?.balance ?? 0;
  const balLast = d.balance[d.balance.length - 1]?.balance ?? 0;
  const heaviestPart = d.rhythm.parts.reduce((best, p, i) => (p.total > d.rhythm.parts[best].total ? i : best), 0);
  const partLabels = [t('plan.deep.rhythm.early'), t('plan.deep.rhythm.mid'), t('plan.deep.rhythm.late')];

  const section = (title: string) => (
    <ThemedText type="smallBold" style={styles.sectionTitle}>
      {title}
    </ThemedText>
  );
  const card = [styles.card, { backgroundColor: colors.backgroundElement }];
  const list = [styles.listCard, { backgroundColor: colors.backgroundElement }];
  const hair = { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider };

  return (
    <>
      {/* 1. Month-end outlook */}
      {outlookVisible ? (
        <>
          {section(t('plan.deep.outlook.title'))}
          <View style={card}>
            <ThemedText type="small" style={muted}>
              {t('plan.deep.outlook.label', { month: monthLabel(outlook.monthKey, 'long') })}
            </ThemedText>
            <ThemedText style={styles.big} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {money(outlook.projected)}
            </ThemedText>
            <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
              <View style={[styles.fill, { width: `${Math.min(100, (outlook.spentSoFar / barMax) * 100)}%`, backgroundColor: colors.accent }]} />
            </View>
            <View style={styles.line}>
              <ThemedText type="small" style={muted}>{t('plan.deep.outlook.spent')}</ThemedText>
              <ThemedText type="small">{money(outlook.spentSoFar)}</ThemedText>
            </View>
            <View style={styles.line}>
              <ThemedText type="small" style={muted}>{t('plan.deep.outlook.bills')}</ThemedText>
              <ThemedText type="small">{money(outlook.billsAhead)}</ThemedText>
            </View>
            <View style={styles.line}>
              <ThemedText type="small" style={muted}>{tp('plan.deep.outlook.everyday', outlook.daysLeft, { amount: money(outlook.dailyEveryday) })}</ThemedText>
              <ThemedText type="small">{money(outlook.dailyEveryday * outlook.daysLeft)}</ThemedText>
            </View>
            {vsLast !== null ? (
              <ThemedText type="small" style={[styles.gap, { color: vsLast > 0 ? colors.negative : colors.positive, fontWeight: '700' }]}>
                {vsLast > 0
                  ? t('plan.deep.outlook.moreThanLast', { amount: money(vsLast), last: money(outlook.lastMonthTotal) })
                  : t('plan.deep.outlook.lessThanLast', { amount: money(-vsLast), last: money(outlook.lastMonthTotal) })}
              </ThemedText>
            ) : null}
            {budgetGap !== null ? (
              <ThemedText type="small" style={{ color: budgetGap > 0 ? colors.negative : colors.positive, fontWeight: '700' }}>
                {budgetGap > 0
                  ? t('plan.deep.outlook.overBudget', { amount: money(budgetGap) })
                  : t('plan.deep.outlook.underBudget', { amount: money(-budgetGap) })}
              </ThemedText>
            ) : null}
            <ThemedText type="small" style={[styles.gap, muted]}>
              {outlook.reliable ? t('plan.deep.outlook.how') : t('plan.deep.outlook.early')}
            </ThemedText>
          </View>
        </>
      ) : null}

      {/* 2. Calendar */}
      {section(t('plan.deep.calendar.title'))}
      <View style={card}>
        <View style={styles.monthRow}>
          <Pressable
            disabled={calIndex <= 0}
            onPress={() => {
              setCalendarKey(keys[calIndex - 1]);
              setPickedDay(null);
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('plan.deep.calendar.prev')}
            style={{ opacity: calIndex <= 0 ? 0.3 : 1 }}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <ThemedText style={styles.monthTitle}>{monthLabel(activeCalendarKey, 'long')}</ThemedText>
          <Pressable
            disabled={calIndex >= keys.length - 1}
            onPress={() => {
              setCalendarKey(keys[calIndex + 1]);
              setPickedDay(null);
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('plan.deep.calendar.next')}
            style={{ opacity: calIndex >= keys.length - 1 ? 0.3 : 1 }}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.calRow}>
          {Array.from({ length: 7 }, (_, i) => (
            <ThemedText key={i} type="small" style={[styles.calHead, muted]}>
              {weekdayShort(i).slice(0, 2)}
            </ThemedText>
          ))}
        </View>
        {calRows.map((row, ri) => (
          <View key={ri} style={styles.calRow}>
            {row.map((day, ci) => {
              if (day === null) return <View key={ci} style={styles.calCell} />;
              const info = calendar.days[day - 1];
              const level = intensity(info.total);
              const isToday = info.date === todayKey;
              const selected = info.date === pickedDay;
              return (
                <Pressable
                  key={ci}
                  onPress={() => setPickedDay(selected ? null : info.date)}
                  accessibilityRole="button"
                  accessibilityLabel={`${dayLabel(info.date)}: ${money(info.total)}`}
                  style={[
                    styles.calCell,
                    styles.calDay,
                    { backgroundColor: heat[level] },
                    (isToday || selected) && { borderWidth: 2, borderColor: selected ? colors.text : colors.accent },
                  ]}
                >
                  <ThemedText type="small" style={{ fontSize: 12, color: level >= 3 ? colors.onAccent : colors.text }}>
                    {day}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        ))}
        <View style={styles.legend}>
          <ThemedText type="small" style={muted}>{t('plan.deep.calendar.less')}</ThemedText>
          {heat.map((c, i) => (
            <View key={i} style={[styles.legendDot, { backgroundColor: c }]} />
          ))}
          <ThemedText type="small" style={muted}>{t('plan.deep.calendar.more')}</ThemedText>
        </View>
        <ThemedText type="small" style={[styles.gap, muted]}>
          {picked
            ? picked.count > 0 || picked.income > 0
              ? `${dayLabel(picked.date)}: ${money(picked.total)} · ${tp('plan.deep.calendar.expenses', picked.count)}${picked.income > 0 ? ` · +${money(picked.income)}` : ''}`
              : `${dayLabel(picked.date)}: ${t('plan.deep.calendar.nothing')}`
            : t('plan.deep.calendar.total', { amount: money(calendar.total) })}
        </ThemedText>
      </View>

      {/* 3. Fixed vs everyday */}
      {d.split.fixed + d.split.everyday > 0 ? (
        <>
          {section(t('plan.deep.fixed.title'))}
          <View style={card}>
            <View style={[styles.split, { backgroundColor: colors.backgroundSelected }]}>
              {d.split.fixed > 0 ? <View style={{ flex: d.split.fixed, backgroundColor: colors.accent }} /> : null}
              {d.split.everyday > 0 ? <View style={{ flex: d.split.everyday, backgroundColor: colors.gold }} /> : null}
            </View>
            <View style={styles.line}>
              <View style={styles.key}>
                <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
                <ThemedText type="small">{t('plan.deep.fixed.fixed')}</ThemedText>
              </View>
              <ThemedText type="small" style={{ fontWeight: '700' }}>{money(d.split.fixed)}</ThemedText>
            </View>
            <View style={styles.line}>
              <View style={styles.key}>
                <View style={[styles.legendDot, { backgroundColor: colors.gold }]} />
                <ThemedText type="small">{t('plan.deep.fixed.everyday')}</ThemedText>
              </View>
              <ThemedText type="small" style={{ fontWeight: '700' }}>{money(d.split.everyday)}</ThemedText>
            </View>
            <ThemedText type="small" style={[styles.gap, muted]}>
              {d.split.fixed > 0 ? t('plan.deep.fixed.note', { share: d.split.fixedShare }) : t('plan.deep.fixed.none')}
            </ThemedText>
          </View>
        </>
      ) : null}

      {/* 4. Income */}
      {d.income.total > 0 ? (
        <>
          {section(t('plan.deep.income.title'))}
          <View style={list}>
            {d.income.sources.map((s, i) => {
              const c = getCategory(s.categoryId);
              return (
                <View key={s.categoryId} style={[styles.row, i > 0 && hair]}>
                  <CategoryIcon icon={c?.icon ?? 'help-circle'} color={c?.color ?? '#8E8E93'} size={36} />
                  <View style={styles.flex}>
                    <ThemedText numberOfLines={1}>{catName(s.categoryId)}</ThemedText>
                    <ThemedText type="small" style={muted}>{t('plan.deep.income.share', { share: s.share })}</ThemedText>
                  </View>
                  <ThemedText style={{ fontWeight: '700', color: colors.positive }}>{money(s.total)}</ThemedText>
                </View>
              );
            })}
          </View>
          <View style={card}>
            <View style={styles.line}>
              <ThemedText type="small" style={muted}>{t('plan.deep.income.avg')}</ThemedText>
              <ThemedText type="small" style={{ fontWeight: '700' }}>{money(d.income.avgMonthly)}</ThemedText>
            </View>
            <View style={styles.line}>
              <ThemedText type="small" style={muted}>{t('plan.deep.income.months')}</ThemedText>
              <ThemedText type="small" style={{ fontWeight: '700' }}>
                {t('plan.deep.income.monthsValue', { n: d.income.monthsWithIncome, of: d.income.monthsCounted })}
              </ThemedText>
            </View>
            {d.income.best ? (
              <View style={styles.line}>
                <ThemedText type="small" style={muted}>{t('plan.deep.income.best')}</ThemedText>
                <ThemedText type="small" style={{ fontWeight: '700' }}>
                  {monthLabel(d.income.best.key, 'short')} · {money(d.income.best.total)}
                </ThemedText>
              </View>
            ) : null}
            {d.income.steadiness ? (
              <ThemedText type="small" style={[styles.gap, { color: d.income.steadiness === 'steady' ? colors.positive : d.income.steadiness === 'some' ? colors.text : colors.warning }]}>
                {d.income.steadiness === 'steady' ? t('plan.deep.income.steady') : d.income.steadiness === 'some' ? t('plan.deep.income.some') : t('plan.deep.income.irregular')}
              </ThemedText>
            ) : null}
          </View>
        </>
      ) : null}

      {/* 5. Top subcategories */}
      {d.subs.length > 0 ? (
        <>
          {section(t('plan.deep.subs.title'))}
          <View style={list}>
            {d.subs.map((s, i) => {
              const c = getCategory(s.categoryId);
              return (
                <View key={`${s.categoryId}|${s.name}`} style={[styles.row, i > 0 && hair]}>
                  <CategoryIcon icon={c?.icon ?? 'help-circle'} color={c?.color ?? '#8E8E93'} size={36} />
                  <View style={styles.flex}>
                    <ThemedText numberOfLines={1}>{subcategoryName(s.name)}</ThemedText>
                    <ThemedText type="small" style={muted} numberOfLines={1}>
                      {catName(s.categoryId)} · {tp('plan.analyse.times', s.count)}
                    </ThemedText>
                  </View>
                  <View style={styles.right}>
                    <ThemedText style={{ fontWeight: '700' }}>{money(s.total)}</ThemedText>
                    <ThemedText type="small" style={muted}>{s.share}%</ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      {/* 6. Records */}
      {d.rec.expenseCount > 0 ? (
        <>
          {section(t('plan.deep.records.title'))}
          <View style={styles.tiles}>
            {[
              { label: t('plan.deep.records.avgMonth'), value: money(d.rec.avgMonthlySpending) },
              { label: t('plan.deep.records.avgDay'), value: money(d.rec.avgDailySpending) },
              { label: t('plan.deep.records.highest'), value: d.rec.highestMonth ? money(d.rec.highestMonth.total) : '—', sub: d.rec.highestMonth ? monthLabel(d.rec.highestMonth.key, 'short') : '' },
              { label: t('plan.deep.records.lowest'), value: d.rec.lowestMonth ? money(d.rec.lowestMonth.total) : '—', sub: d.rec.lowestMonth ? monthLabel(d.rec.lowestMonth.key, 'short') : '' },
              { label: t('plan.deep.records.avgExpense'), value: money(d.rec.avgExpense), sub: tp('plan.deep.records.expenseCount', d.rec.expenseCount) },
              { label: t('plan.deep.records.noSpend'), value: String(d.rec.noSpendDays), sub: t('plan.deep.records.noSpendOf', { n: d.rec.daysCounted }) },
            ].map((tile) => (
              <View key={tile.label} style={[styles.tile, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="small" style={muted} numberOfLines={1}>{tile.label}</ThemedText>
                <ThemedText style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{tile.value}</ThemedText>
                {tile.sub ? <ThemedText type="small" style={muted} numberOfLines={1}>{tile.sub}</ThemedText> : null}
              </View>
            ))}
          </View>
          {d.rec.longestNoSpendStreak >= 2 ? (
            <ThemedText type="small" style={[styles.foot, muted]}>
              {tp('plan.deep.records.streak', d.rec.longestNoSpendStreak)}
              {d.rec.currentNoSpendStreak >= 2 ? ` ${tp('plan.deep.records.streakNow', d.rec.currentNoSpendStreak)}` : ''}
            </ThemedText>
          ) : null}
        </>
      ) : null}

      {/* 7. Category over time */}
      {d.topCats.length > 0 && chosenCategory ? (
        <>
          {section(t('plan.deep.category.title'))}
          <View style={card}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {d.topCats.map((id) => (
                <Chip key={id} label={catName(id)} active={id === chosenCategory} onPress={() => setPickedCategory(id)} />
              ))}
            </ScrollView>
            <View style={styles.bars}>
              {categorySeries.map((p) => (
                <View key={p.key} style={styles.barCol}>
                  <ThemedText type="small" style={styles.barValue} numberOfLines={1}>
                    {p.total > 0 ? compact(p.total) : ''}
                  </ThemedText>
                  <View style={styles.barSlot}>
                    <View style={{ width: '70%', maxWidth: 26, height: Math.max(p.total > 0 ? 4 : 0, (p.total / maxCat) * 90), borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: getCategory(chosenCategory)?.color ?? colors.accent }} />
                  </View>
                  <ThemedText type="small" style={styles.barLabel}>{monthLabel(p.key, 'short')}</ThemedText>
                </View>
              ))}
            </View>
            <ThemedText type="small" style={muted}>{t('plan.deep.category.avg', { amount: money(catAvg) })}</ThemedText>
          </View>
        </>
      ) : null}

      {/* 8. Budget history */}
      {d.budgets.length > 0 ? (
        <>
          {section(t('plan.deep.budgets.title'))}
          <View style={list}>
            {d.budgets.map((b, i) => {
              const c = getCategory(b.categoryId);
              const bad = b.monthsOver / b.monthsCounted >= 0.5;
              return (
                <View key={b.categoryId} style={[styles.row, i > 0 && hair]}>
                  <CategoryIcon icon={c?.icon ?? 'help-circle'} color={c?.color ?? '#8E8E93'} size={36} />
                  <View style={styles.flex}>
                    <ThemedText numberOfLines={1}>{catName(b.categoryId)}</ThemedText>
                    <ThemedText type="small" style={{ color: b.monthsOver === 0 ? colors.positive : bad ? colors.negative : colors.warning }}>
                      {b.monthsOver === 0
                        ? t('plan.deep.budgets.never', { n: b.monthsCounted })
                        : t('plan.deep.budgets.over', { n: b.monthsOver, of: b.monthsCounted })}
                    </ThemedText>
                  </View>
                  <View style={styles.right}>
                    <ThemedText style={{ fontWeight: '700' }}>{b.avgUse}%</ThemedText>
                    <ThemedText type="small" style={muted}>{t('plan.deep.budgets.used')}</ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      {/* 9. Unusual */}
      {d.unusual.length > 0 ? (
        <>
          {section(t('plan.deep.unusual.title'))}
          <View style={list}>
            {d.unusual.map((u, i) => {
              const c = getCategory(u.transaction.categoryId);
              return (
                <View key={u.transaction.id} style={[styles.row, i > 0 && hair]}>
                  <CategoryIcon icon={c?.icon ?? 'help-circle'} color={c?.color ?? '#8E8E93'} size={36} />
                  <View style={styles.flex}>
                    <ThemedText numberOfLines={1}>{u.transaction.title || catName(u.transaction.categoryId)}</ThemedText>
                    <ThemedText type="small" style={muted} numberOfLines={2}>
                      {dayLabel(u.transaction.date)} · {t('plan.deep.unusual.note', { times: u.times, typical: money(u.typical), category: catName(u.transaction.categoryId) })}
                    </ThemedText>
                  </View>
                  <ThemedText style={{ fontWeight: '700', color: colors.negative }}>{money(u.transaction.amount)}</ThemedText>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      {/* 10. Rhythm */}
      {d.rhythm.parts.some((p) => p.total > 0) ? (
        <>
          {section(t('plan.deep.rhythm.title'))}
          <View style={card}>
            {d.rhythm.parts.map((p, i) => (
              <View key={i} style={styles.rhythmRow}>
                <ThemedText type="small" style={[styles.rhythmLabel, muted]}>{partLabels[i]}</ThemedText>
                <View style={[styles.track, styles.flex, { backgroundColor: colors.backgroundSelected }]}>
                  <View style={[styles.fill, { width: `${Math.max(p.share, p.total > 0 ? 2 : 0)}%`, backgroundColor: i === heaviestPart ? colors.accent : colors.textSecondary }]} />
                </View>
                <ThemedText type="small" style={styles.rhythmValue}>{p.share}%</ThemedText>
              </View>
            ))}
            <ThemedText type="small" style={[styles.gap, muted]}>
              {t('plan.deep.rhythm.note', { part: partLabels[heaviestPart], share: d.rhythm.parts[heaviestPart].share })}
            </ThemedText>
          </View>
        </>
      ) : null}

      {/* 11. By account */}
      {d.byAccount.length > 1 ? (
        <>
          {section(t('plan.deep.accounts.title'))}
          <View style={list}>
            {d.byAccount.map((a, i) => {
              const acc = accounts.find((x) => x.id === a.accountId);
              return (
                <View key={a.accountId} style={[styles.row, i > 0 && hair]}>
                  <View style={styles.flex}>
                    <View style={styles.line}>
                      <ThemedText numberOfLines={1} style={styles.flex}>{acc ? accountName(acc) : '?'}</ThemedText>
                      <ThemedText style={{ fontWeight: '700' }}>{money(a.total)}</ThemedText>
                    </View>
                    <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
                      <View style={[styles.fill, { width: `${Math.max(a.share, 2)}%`, backgroundColor: colors.accent }]} />
                    </View>
                    <ThemedText type="small" style={muted}>{t('plan.analyse.shareOfSpending', { share: a.share })}</ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      {/* 12. Balance trend */}
      {d.balance.length > 1 ? (
        <>
          {section(t('plan.deep.balance.title'))}
          <View style={card}>
            <View style={styles.bars}>
              {d.balance.map((p) => (
                <View key={p.key} style={styles.barCol}>
                  <ThemedText type="small" style={styles.barValue} numberOfLines={1}>{compact(p.balance)}</ThemedText>
                  <View style={styles.barSlot}>
                    <View style={{ width: '70%', maxWidth: 26, height: Math.max(3, (Math.abs(p.balance) / balMax) * 90), borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: p.balance < 0 ? colors.negative : colors.positive }} />
                  </View>
                  <ThemedText type="small" style={styles.barLabel}>{monthLabel(p.key, 'short')}</ThemedText>
                </View>
              ))}
            </View>
            <ThemedText type="small" style={{ color: balLast >= balFirst ? colors.positive : colors.negative, fontWeight: '700' }}>
              {balLast >= balFirst
                ? t('plan.deep.balance.up', { amount: money(balLast - balFirst), months })
                : t('plan.deep.balance.down', { amount: money(balFirst - balLast), months })}
            </ThemedText>
            <ThemedText type="small" style={muted}>{t('plan.deep.balance.note')}</ThemedText>
          </View>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', gap: Spacing.two },
  card: { borderRadius: 20, padding: 20, marginBottom: Spacing.three, gap: 6 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  big: { fontSize: 34, lineHeight: 42, fontWeight: '700' },
  sectionTitle: { fontSize: 16, marginBottom: Spacing.two, marginTop: Spacing.two },
  listCard: { borderRadius: 20, paddingHorizontal: Spacing.three, marginBottom: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  right: { alignItems: 'flex-end' },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  key: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gap: { marginTop: Spacing.two },
  foot: { marginBottom: Spacing.three },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', marginVertical: 6 },
  fill: { height: 8, borderRadius: 4 },
  split: { height: 14, borderRadius: 7, overflow: 'hidden', flexDirection: 'row', marginBottom: Spacing.two },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.two },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.two },
  monthTitle: { fontWeight: '700' },
  calRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  calHead: { flex: 1, textAlign: 'center', fontSize: 11 },
  calCell: { flex: 1, aspectRatio: 1 },
  calDay: { borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.two },
  tile: { width: '48.5%', borderRadius: 16, padding: 14, gap: 2 },
  tileValue: { fontSize: 19, fontWeight: '700' },

  chipRow: { gap: 8, paddingVertical: 4, paddingRight: 8 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', marginTop: Spacing.two, marginBottom: Spacing.two },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barSlot: { height: 90, justifyContent: 'flex-end', alignItems: 'center', width: '100%' },
  barValue: { fontSize: 10, height: 14 },
  barLabel: { fontSize: 10 },

  rhythmRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rhythmLabel: { width: 84 },
  rhythmValue: { width: 40, textAlign: 'right' },
});
