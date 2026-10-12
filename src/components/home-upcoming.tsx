import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/category-icon';
import type { IconName } from '@/constants/categories';
import { ThemedText } from '@/components/themed-text';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { useDebts } from '@/context/DebtsContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { addDays, dayNumber, dueText, upcomingOccurrences } from '@/utils/bills';
import { formatMoney } from '@/utils/currency';
import { toDateKey } from '@/utils/dates';
import { upcomingInstalments } from '@/utils/debts';

const HORIZON_DAYS = 14;
const SHOWN = 6;
const MASK = 'RM ••••';

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
};

/**
 * "Coming up" on Home: recurring bills, expected income and loan or instalment payments due in the next two weeks,
 * soonest first, as small cards in a row. Hidden when nothing is due.
 */
export function HomeUpcoming() {
  const colors = useTheme();
  const { t } = useT();
  const router = useRouter();
  const { recurringRules } = useTransactions();
  const { debts } = useDebts();
  const { getCategory } = useCategories();
  const { hideAmounts } = usePrivacy();

  const today = toDateKey(new Date());
  const until = addDays(today, HORIZON_DAYS);

  const items: Item[] = [
    ...upcomingOccurrences(recurringRules, today, HORIZON_DAYS).map((o) => {
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
    ...upcomingInstalments(debts, today, until)
      .filter(({ instalment }) => instalment.dueDate >= today)
      .map(({ debt, instalment }) => ({
        id: `debt_${debt.id}_${instalment.n}`,
        title: debt.name,
        date: instalment.dueDate,
        daysUntil: dayNumber(instalment.dueDate) - dayNumber(today),
        amount: Math.round((instalment.principal + instalment.interest) * 100) / 100,
        varies: false,
        type: 'debit' as const,
        icon: 'card' as IconName,
        color: colors.warning,
        href: '/more/debts' as Href,
      })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.title.localeCompare(b.title)));

  if (items.length === 0) return null;

  const amountText = (i: Item) => {
    if (hideAmounts) return MASK;
    if (i.varies && i.amount === 0) return t('plan.rancang.varies');
    const sign = i.type === 'credit' ? '+' : '';
    return `${i.varies ? '~' : ''}${sign}${formatMoney(i.amount)}`;
  };

  return (
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
        {items.slice(0, SHOWN).map((i) => {
          const soon = i.daysUntil <= 3;
          return (
            <Pressable
              key={i.id}
              onPress={() => router.push(i.href)}
              style={({ pressed }) => [styles.card, { backgroundColor: colors.backgroundElement }, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={`${i.title}, ${dueText(i.daysUntil)}, ${amountText(i)}`}
            >
              <View style={styles.cardTop}>
                <CategoryIcon icon={i.icon} color={i.color} size={30} />
                <ThemedText type="small" style={[styles.due, { color: soon ? colors.warning : colors.textSecondary }]} numberOfLines={1}>
                  {dueText(i.daysUntil)}
                </ThemedText>
              </View>
              <ThemedText style={styles.name} numberOfLines={1}>
                {i.title}
              </ThemedText>
              <ThemedText style={[styles.amount, { color: i.type === 'credit' ? colors.positive : colors.text }]} numberOfLines={1}>
                {amountText(i)}
              </ThemedText>
            </Pressable>
          );
        })}
        {items.length > SHOWN ? (
          <Pressable
            onPress={() => router.push('/more/rancang')}
            style={[styles.card, styles.moreCard, { backgroundColor: colors.backgroundSelected }]}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-forward" size={18} color={colors.accent} />
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
              {t('home.upcoming.more', { n: items.length - SHOWN })}
            </ThemedText>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.four },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: Spacing.two },
  title: { fontSize: FontSize.body },
  scroll: { marginHorizontal: -Spacing.four, flexGrow: 0 },
  row: { paddingHorizontal: Spacing.four, gap: 10 },
  card: { width: 150, borderRadius: Radius.lg, padding: 14, gap: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  due: { flex: 1, fontWeight: '700', fontSize: FontSize.caption },
  name: { fontSize: FontSize.label, fontWeight: '600' },
  amount: { fontSize: FontSize.body, fontWeight: '800', ...tabularNums },
  moreCard: { width: 110, alignItems: 'center', justifyContent: 'center', gap: 6 },
});
