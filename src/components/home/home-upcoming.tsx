import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProviderSheet } from '@/components/debts/provider-sheet';
import { IouDetail } from '@/components/debts/iou-detail';
import { IouSheet } from '@/components/debts/iou-sheet';
import { BrandAvatar } from '@/components/ui/brand-avatar';
import { CategoryIcon } from '@/components/ui/category-icon';
import type { IconName } from '@/constants/categories';
import { ThemedText } from '@/components/ui/themed-text';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { useDebts } from '@/context/DebtsContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { addDays } from '@/utils/cycle';
import { dayNumber, dueText, upcomingOccurrences } from '@/utils/bills';
import { formatMoney } from '@/utils/currency';
import { toDateKey } from '@/utils/dates';
import { providerGroups } from '@/utils/provider-groups';
import { iouDone, iouLeft } from '@/utils/ious';

const HORIZON_DAYS = 14;
const MASK = 'RM ••••';

export type UpcomingItem = Item;

type Item = {
  id: string;
  title: string;
  date: string;
  daysUntil: number;
  amount: number;
  varies: boolean;
  type: 'debit' | 'credit';
  icon: IconName;
  color: string;
  href: Href;
  /** Set for money with people: tapping opens their pop-up instead of leaving Home. */
  iouId?: string;
  /** Set for debts: everything due with one company (SPayLater...) is one item; tapping opens its sheet. */
  provider?: { key: string; count: number };
};

/**
 * Everything due in the next `horizonDays` days (overdue included), soonest first: recurring bills and expected income,
 * debts grouped by company, and money owed to or by people. Shared by the "Coming up" panel and the
 * "Safe to spend today" figure (3.7.0).
 */
export function useUpcomingItems(horizonDays: number = HORIZON_DAYS): Item[] {
  const colors = useTheme();
  const { recurringRules, accountBalance } = useTransactions();
  const { debts, ious } = useDebts();
  const { getCategory } = useCategories();
  const today = toDateKey(new Date());
  const until = addDays(today, horizonDays);
  const HORIZON = horizonDays;

  return [
    ...upcomingOccurrences(recurringRules, today, HORIZON).map((o) => {
      const c = getCategory(o.categoryId);
      return {
        id: o.id,
        title: o.title,
        date: o.date,
        daysUntil: o.daysUntil,
        amount: o.amount,
        varies: o.varies,
        type: o.type,
        icon: c?.icon ?? ('repeat' as IconName),
        color: c?.color ?? colors.accent,
        href: '/more/recurring' as Href,
      };
    }),
    // Debts: one item per company, with everything due with it in the next two weeks (overdue included).
    ...providerGroups(debts, accountBalance, today, { until, undatedCredit: false })
      .filter((g) => g.due.length > 0)
      .map((g) => {
        const date = g.due[0].dueDate ?? today;
        return {
          id: `prov_${g.key}`,
          title: g.name,
          date,
          daysUntil: dayNumber(date) - dayNumber(today),
          amount: g.dueAmount,
          varies: false,
          type: 'debit' as const,
          icon: 'card' as IconName,
          color: colors.warning,
          href: '/more/debts' as Href,
          provider: { key: g.key, count: g.due.length },
        };
      }),
    ...ious
      .filter((i) => !iouDone(i) && !!i.dueDate && i.dueDate <= until)
      .map((i) => ({
        id: `iou_${i.id}`,
        title: i.person,
        date: i.dueDate as string,
        daysUntil: dayNumber(i.dueDate as string) - dayNumber(today),
        amount: iouLeft(i),
        varies: false,
        type: i.direction === 'owed' ? ('credit' as const) : ('debit' as const),
        icon: 'people' as IconName,
        color: colors.warning,
        href: '/more/debts' as Href,
        iouId: i.id,
      })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.title.localeCompare(b.title)));
}

/**
 * "Coming up" on Home: recurring bills, expected income and loan or instalment payments due in the next two weeks.
 * 'row' is the full panel, 'list' the desktop column, 'tile' the small bento tile of Home A5 (3.7.0).
 */
export function HomeUpcoming({ variant = 'row' }: { variant?: 'row' | 'list' | 'tile' } = {}) {
  const colors = useTheme();
  const { t } = useT();
  const router = useRouter();
  const [iouId, setIouId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [providerKey, setProviderKey] = useState<string | null>(null);
  const { hideAmounts } = usePrivacy();
  const items = useUpcomingItems();
  const until = addDays(toDateKey(new Date()), HORIZON_DAYS);

  if (items.length === 0 && variant === 'row') return null;

  const amountText = (i: Item) => {
    if (hideAmounts) return MASK;
    if (i.varies && i.amount === 0) return t('plan.rancang.varies');
    const sign = i.type === 'credit' ? '+' : '';
    return `${i.varies ? '~' : ''}${sign}${formatMoney(i.amount)}`;
  };

  const open = (i: Item) => (i.provider ? setProviderKey(i.provider.key) : i.iouId ? setIouId(i.iouId) : router.push(i.href));
  // Overdue is red, due within three days is amber.
  const dueColor = (i: Item) => (i.daysUntil < 0 ? colors.negative : i.daysUntil <= 3 ? colors.warning : colors.textSecondary);
  const icon = (i: Item, size: number) =>
    i.provider ? <BrandAvatar name={i.title} size={size} alert={i.daysUntil < 0} alertColor={colors.negative} /> : <CategoryIcon icon={i.icon} color={i.color} size={size} />;
  const whenText = (i: Item) => (i.provider && i.provider.count > 1 ? `${dueText(i.daysUntil)} · ${t('debt.prov.homeCount', { count: i.provider.count })}` : dueText(i.daysUntil));

  const sheet = (
    <>
    <ProviderSheet
      groupKey={providerKey}
      until={until}
      onClose={() => setProviderKey(null)}
      onOpenDebt={() => {
        setProviderKey(null);
        router.push('/more/debts');
      }}
    />
    <IouSheet
      iouId={iouId}
      onClose={() => setIouId(null)}
      onOpenDetail={(id) => {
        setIouId(null);
        // Let the pop-up finish closing before the page opens (two modals at once can fail to appear on iOS).
        setTimeout(() => setDetailId(id), 350);
      }}
    />
    <IouDetail iouId={detailId} onClose={() => setDetailId(null)} />
    </>
  );

  if (variant === 'list') {
    // Desktop web: a column card with one line per item.
    return (
      <>
      <View style={[styles.listCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        <View style={styles.head}>
          <ThemedText type="smallBold" style={styles.title}>
            {t('home.upcoming.title')}
          </ThemedText>
          <Pressable onPress={() => router.push('/more/rancang')} hitSlop={8} accessibilityRole="button">
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
              {t('plan.rancang.manage')}
            </ThemedText>
          </Pressable>
        </View>
        {items.length === 0 ? (
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t('home.upcoming.none')}
          </ThemedText>
        ) : null}
        {items.slice(0, 7).map((i, n) => {
          return (
            <Pressable
              key={i.id}
              onPress={() => open(i)}
              style={({ pressed }) => [styles.listRow, n > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={`${i.title}, ${whenText(i)}, ${amountText(i)}`}
            >
              {icon(i, 32)}
              <View style={styles.listBody}>
                <ThemedText style={styles.name} numberOfLines={1}>
                  {i.title}
                </ThemedText>
                <ThemedText type="small" style={{ color: dueColor(i), fontWeight: i.daysUntil <= 3 ? '700' : '500' }} numberOfLines={1}>
                  {whenText(i)}
                </ThemedText>
              </View>
              <ThemedText style={[styles.amount, { color: i.type === 'credit' ? colors.positive : i.daysUntil < 0 ? colors.negative : colors.text }]} numberOfLines={1}>
                {amountText(i)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      {sheet}
      </>
    );
  }

  if (variant === 'tile') {
    const TILE_ROWS = 3;
    const due = items.filter((i) => i.type === 'debit').reduce((sum, i) => sum + i.amount, 0);
    const late = items.filter((i) => i.daysUntil < 0).length;
    return (
      <>
        <View style={[styles.tile, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
          <View style={styles.tileHead}>
            <ThemedText type="smallBold" style={styles.flexShrink} numberOfLines={1}>
              {t('home.upcoming.title')}
            </ThemedText>
            {late > 0 ? (
              <View style={[styles.lateBadge, { backgroundColor: colors.negative }]}>
                <ThemedText style={styles.lateBadgeText}>{t('home.upcoming.lateShort')}</ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
            {t('home.upcoming.toPayShort')}
          </ThemedText>
          <ThemedText style={[styles.tileTotal, { color: late > 0 ? colors.negative : colors.text }]} numberOfLines={1}>
            {hideAmounts ? MASK : formatMoney(Math.round(due * 100) / 100)}
          </ThemedText>
          {items.length === 0 ? (
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {t('home.upcoming.none')}
            </ThemedText>
          ) : null}
          {items.slice(0, TILE_ROWS).map((i) => {
            const isLate = i.daysUntil < 0;
            return (
              <Pressable
                key={i.id}
                onPress={() => open(i)}
                style={({ pressed }) => [styles.tileRow, { backgroundColor: isLate ? colors.negative + '18' : colors.background }, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={`${i.title}, ${whenText(i)}, ${amountText(i)}`}
              >
                <View style={[styles.tileBar, { backgroundColor: isLate ? colors.negative : i.type === 'credit' ? colors.positive : i.daysUntil <= 3 ? colors.warning : colors.divider }]} />
                <View style={styles.listBody}>
                  <ThemedText style={styles.tileName} numberOfLines={1}>{i.title}</ThemedText>
                  <ThemedText style={[styles.tileWhen, { color: dueColor(i) }]} numberOfLines={1}>{dueText(i.daysUntil)}</ThemedText>
                </View>
                <ThemedText style={[styles.tileAmount, { color: i.type === 'credit' ? colors.positive : isLate ? colors.negative : colors.text }]} numberOfLines={1}>
                  {amountText(i)}
                </ThemedText>
              </Pressable>
            );
          })}
          <Pressable onPress={() => router.push('/more/rancang')} hitSlop={8} style={styles.tileMore} accessibilityRole="button">
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
              {items.length > TILE_ROWS ? `${t('home.upcoming.seeAll')} · ${t('home.upcoming.more', { n: items.length - TILE_ROWS })}` : t('plan.rancang.manage')}
            </ThemedText>
          </Pressable>
        </View>
        {sheet}
      </>
    );
  }

  const SHOWN_ROWS = 4;
  const toPay = items.filter((i) => i.type === 'debit').reduce((sum, i) => sum + i.amount, 0);
  const lateCount = items.filter((i) => i.daysUntil < 0).length;
  return (
    <>
    <View style={styles.wrap}>
      <View style={styles.head}>
        <ThemedText type="smallBold" style={styles.title}>
          {t('home.upcoming.title')}
        </ThemedText>
        <Pressable onPress={() => router.push('/more/rancang')} hitSlop={8} accessibilityRole="button">
          <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
            {t('plan.rancang.manage')}
          </ThemedText>
        </Pressable>
      </View>
      <View style={[styles.panel, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.panelTop}>
          <View style={styles.listBody}>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('home.upcoming.toPay')}</ThemedText>
            <ThemedText style={[styles.total, { color: lateCount > 0 ? colors.negative : colors.text }]} numberOfLines={1}>
              {hideAmounts ? MASK : formatMoney(Math.round(toPay * 100) / 100)}
            </ThemedText>
          </View>
          {lateCount > 0 ? (
            <View style={[styles.latePill, { backgroundColor: colors.negative }]}>
              <Ionicons name="alert-circle" size={14} color="#FFFFFF" />
              <ThemedText type="small" style={styles.latePillText}>{t('home.upcoming.late', { count: lateCount })}</ThemedText>
            </View>
          ) : null}
        </View>
        {items.slice(0, SHOWN_ROWS).map((i) => {
          const late = i.daysUntil < 0;
          return (
            <Pressable
              key={i.id}
              onPress={() => open(i)}
              style={({ pressed }) => [styles.rowItem, late && { backgroundColor: colors.negative + '12' }, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={`${i.title}, ${whenText(i)}, ${amountText(i)}`}
            >
              {icon(i, 40)}
              <View style={styles.listBody}>
                <ThemedText style={styles.name} numberOfLines={1}>{i.title}</ThemedText>
                <ThemedText type="small" style={{ color: dueColor(i), fontWeight: i.daysUntil <= 3 ? '700' : '500' }} numberOfLines={1}>
                  {dueText(i.daysUntil)}
                </ThemedText>
                {i.provider && i.provider.count > 1 ? (
                  <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>{t('debt.prov.homeCount', { count: i.provider.count })}</ThemedText>
                ) : null}
              </View>
              <ThemedText style={[styles.amount, { color: i.type === 'credit' ? colors.positive : late ? colors.negative : colors.text }]} numberOfLines={1}>
                {amountText(i)}
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </Pressable>
          );
        })}
        {items.length > SHOWN_ROWS ? (
          <Pressable onPress={() => router.push('/more/rancang')} style={styles.seeAll} accessibilityRole="button">
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
              {t('home.upcoming.seeAll')} · {t('home.upcoming.more', { n: items.length - SHOWN_ROWS })}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
    {sheet}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.four },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: Spacing.two },
  title: { fontSize: FontSize.body },
  panel: { borderRadius: Radius.xl, padding: Spacing.three, gap: 4 },
  panelTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingBottom: Spacing.two },
  total: { fontSize: FontSize.title, lineHeight: 28, fontWeight: '800', ...tabularNums },
  latePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
  latePillText: { color: '#FFFFFF', fontWeight: '700' },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8, marginHorizontal: -8, borderRadius: Radius.md },
  seeAll: { alignItems: 'center', paddingTop: Spacing.two },
  name: { fontSize: FontSize.label, fontWeight: '700' },
  amount: { fontSize: FontSize.body, fontWeight: '800', ...tabularNums },
  listCard: { flex: 1, borderRadius: Radius.lg, borderWidth: 1, padding: 20, gap: 4 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  listBody: { flex: 1, minWidth: 0 },
  flexShrink: { flexShrink: 1 },
  tile: { flex: 1, borderRadius: Radius.lg, borderWidth: 1, padding: 14, gap: 6 },
  tileHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  lateBadge: { borderRadius: Radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  lateBadgeText: { color: '#FFFFFF', fontSize: FontSize.micro - 1, fontWeight: '800', letterSpacing: 0.4 },
  tileTotal: { fontSize: FontSize.title, lineHeight: 28, fontWeight: '800', ...tabularNums },
  tileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 7, borderRadius: Radius.md },
  tileBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  tileName: { fontSize: FontSize.caption, fontWeight: '800' },
  tileWhen: { fontSize: FontSize.micro, fontWeight: '700' },
  tileAmount: { fontSize: FontSize.caption, fontWeight: '800', ...tabularNums },
  tileMore: { marginTop: 'auto', paddingTop: 4 },
});
