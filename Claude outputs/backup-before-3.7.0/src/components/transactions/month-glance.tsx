import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/ui/category-icon';
import { ThemedText } from '@/components/ui/themed-text';
import type { IconName } from '@/constants/categories';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { categoryName } from '@/i18n/data';
import { formatCompact, formatMoney } from '@/utils/currency';
import { formatPct } from '@/utils/insights';
import { p1 } from '@/utils/percent';

const MASK = 'RM ••••';
const FALLBACK = '#8E8E93';
const ACCOUNT_COLORS = ['#5B6BD6', '#8E5BD6', '#E3B83A', '#2E9E8F', '#D6527A', '#E8833A'];
const TOP_CATEGORIES = 5;

/* ------------------------------- Account strip ------------------------------ */

export type StripItem = { id: string | null; label: string; icon: IconName; balance: number };

/** Round account buttons with their balance underneath. "All" first; the selected one gets a ring. */
export function AccountStrip({ items, selectedId, onSelect, hidden }: { items: StripItem[]; selectedId: string | null; onSelect: (id: string | null) => void; hidden: boolean }) {
  const colors = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stripScroll} contentContainerStyle={styles.strip} keyboardShouldPersistTaps="handled">
      {items.map((it) => {
        const on = selectedId === it.id;
        return (
          <Pressable
            key={it.id ?? 'all'}
            onPress={() => onSelect(it.id)}
            style={styles.stripItem}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${it.label}, ${hidden ? '' : formatMoney(it.balance)}`}
          >
            <View style={[styles.ring, { borderColor: on ? colors.accent : 'transparent' }]}>
              <View style={[styles.circle, { backgroundColor: on ? colors.accent : colors.accentSoft }]}>
                <Ionicons name={it.icon} size={21} color={on ? '#fff' : colors.accent} />
              </View>
            </View>
            <ThemedText type="small" numberOfLines={1} style={{ fontWeight: on ? '800' : '600', fontSize: FontSize.caption }}>
              {it.label}
            </ThemedText>
            <ThemedText type="small" numberOfLines={1} style={{ color: colors.textSecondary, fontSize: FontSize.micro, ...tabularNums }}>
              {hidden ? '••••' : formatCompact(it.balance)}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* ---------------------------- Money in / money out --------------------------- */

/** Income and spending as two tiles, with how much of the income has been used. */
export function InOutCard({ income, spending, hidden }: { income: number; spending: number; hidden: boolean }) {
  const { t } = useT();
  const colors = useTheme();
  const pct = income > 0 ? Math.round((spending / income) * 100) : null;
  const over = pct !== null && spending > income;
  const left = Math.abs(income - spending);
  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.tiles}>
        <View style={[styles.tile, { backgroundColor: `${colors.positive}1F` }]}>
          <ThemedText type="small" style={{ color: colors.positive, fontWeight: '700' }}>{t('common.income')}</ThemedText>
          <ThemedText style={[styles.tileValue, { color: colors.positive }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {hidden ? MASK : `+${formatMoney(income)}`}
          </ThemedText>
        </View>
        <View style={[styles.tile, { backgroundColor: `${colors.negative}1F` }]}>
          <ThemedText type="small" style={{ color: colors.negative, fontWeight: '700' }}>{t('home.summary.spending')}</ThemedText>
          <ThemedText style={[styles.tileValue, { color: colors.negative }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {hidden ? MASK : `-${formatMoney(spending)}`}
          </ThemedText>
        </View>
      </View>
      {pct !== null ? (
        <View style={styles.usedRow}>
          <View style={[styles.track, { backgroundColor: colors.background }]}>
            <View style={[styles.fill, { width: `${Math.min(100, Math.max(pct, spending > 0 ? 2 : 0))}%`, backgroundColor: over ? colors.negative : colors.accent }]} />
          </View>
          <ThemedText type="small" style={styles.usedText} numberOfLines={1}>
            <ThemedText type="smallBold">{hidden ? '••' : `${pct}%`}</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {` ${over ? t('tx.list.usedOver', { amount: hidden ? MASK : formatMoney(left) }) : t('tx.list.usedLeft', { amount: hidden ? MASK : formatMoney(left) })}`}
            </ThemedText>
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

/* --------------------------------- Type tabs -------------------------------- */

export type TabItem<K extends string> = { key: K; label: string; count: number };

/** Underlined tabs with a count, like All / Out / In / Transfers. */
export function TypeTabs<K extends string>({ items, value, onChange }: { items: TabItem<K>[]; value: K; onChange: (k: K) => void }) {
  const colors = useTheme();
  return (
    <View style={[styles.tabs, { borderBottomColor: colors.divider }]}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={[styles.tab, { borderBottomColor: on ? colors.accent : 'transparent' }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <ThemedText type="small" numberOfLines={1} style={{ fontWeight: on ? '800' : '600', color: on ? colors.text : colors.textSecondary }}>
              {it.label}
              <ThemedText type="small" style={{ color: colors.textSecondary, fontWeight: '600' }}>{` ${it.count}`}</ThemedText>
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ----------------------------- Ringkasan (summary) ---------------------------- */

export type Slice = { categoryId: string; value: number; percent: number };
export type AccountShare = { id: string; label: string; value: number; percent: number };

type SummaryProps = {
  income: number;
  spending: number;
  deltaPercent: number | null;
  prevLabel: string;
  slices: Slice[];
  accountShares: AccountShare[];
  selectedCategory: string | null;
  onPickCategory: (id: string) => void;
  onPickAccount: (id: string) => void;
  hidden: boolean;
};

/**
 * The month in numbers: how much of the income has been used, where the spending went (tap a category to see
 * those records), and which account it came out of.
 */
export function SummaryView({ income, spending, deltaPercent, prevLabel, slices, accountShares, selectedCategory, onPickCategory, onPickAccount, hidden }: SummaryProps) {
  const { t } = useT();
  const colors = useTheme();
  const { getCategory } = useCategories();
  const [showAll, setShowAll] = useState(false);
  const pct = income > 0 ? Math.round((spending / income) * 100) : null;
  const over = pct !== null && spending > income;
  const up = deltaPercent !== null && deltaPercent > 0;
  const shown = showAll ? slices : slices.slice(0, TOP_CATEGORIES);

  return (
    <View style={styles.summaryWrap}>
      {pct !== null ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <View style={styles.rowBetween}>
            <ThemedText type="smallBold">{t('tx.list.usedThisMonth')}</ThemedText>
            {deltaPercent !== null ? (
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {t('tx.list.vsPrev', { label: prevLabel })}{' '}
                <ThemedText type="small" style={{ color: up ? colors.negative : colors.positive, fontWeight: '700' }}>
                  {up ? '▲' : deltaPercent < 0 ? '▼' : '•'} {formatPct(deltaPercent)}
                </ThemedText>
              </ThemedText>
            ) : null}
          </View>
          <ThemedText style={[styles.bigPct, { color: over ? colors.negative : colors.text }]}>{hidden ? '••%' : `${pct}%`}</ThemedText>
          <View style={[styles.trackBig, { backgroundColor: colors.background }]}>
            <View style={[styles.fill, { width: `${Math.min(100, Math.max(pct, spending > 0 ? 2 : 0))}%`, backgroundColor: over ? colors.negative : colors.accent }]} />
          </View>
          <View style={styles.rowBetween}>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {t('tx.list.usedLegend', { amount: hidden ? MASK : formatMoney(spending) })}
            </ThemedText>
            <ThemedText type="small" style={{ color: over ? colors.negative : colors.positive, fontWeight: '700' }}>
              {over ? t('tx.list.overLegend', { amount: hidden ? MASK : formatMoney(spending - income) }) : t('tx.list.unusedLegend', { amount: hidden ? MASK : formatMoney(income - spending) })}
            </ThemedText>
          </View>
        </View>
      ) : null}

      {slices.length > 0 ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <View style={styles.rowBetween}>
            <ThemedText type="smallBold">{t('home.summary.whereItWent')}</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('tx.list.tapToFilter')}</ThemedText>
          </View>
          {shown.map((s) => {
            const cat = getCategory(s.categoryId);
            const color = cat?.color ?? FALLBACK;
            const on = selectedCategory === s.categoryId;
            return (
              <Pressable
                key={s.categoryId}
                onPress={() => onPickCategory(s.categoryId)}
                style={styles.catRow}
                accessibilityRole="button"
                accessibilityLabel={t('home.summary.filterBy', { name: cat ? categoryName(cat) : s.categoryId })}
              >
                <CategoryIcon icon={cat?.icon ?? 'help-circle'} color={color} size={34} />
                <View style={styles.flex}>
                  <View style={styles.rowBetween}>
                    <ThemedText type="small" numberOfLines={1} style={{ fontWeight: on ? '800' : '600', flex: 1 }}>
                      {cat ? categoryName(cat) : s.categoryId}
                    </ThemedText>
                    <View style={styles.amountCol}>
                      <ThemedText type="small" numberOfLines={1} style={{ fontWeight: '700', ...tabularNums }}>
                        {hidden ? MASK : formatMoney(s.value)}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: colors.textSecondary, fontSize: FontSize.micro, ...tabularNums }}>{`${p1(s.percent)}%`}</ThemedText>
                    </View>
                  </View>
                  <View style={[styles.track, { backgroundColor: colors.background }]}>
                    <View style={[styles.fill, { width: `${Math.max(s.percent, 2)}%`, backgroundColor: color }]} />
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </Pressable>
            );
          })}
          {slices.length > TOP_CATEGORIES ? (
            <Pressable onPress={() => setShowAll((v) => !v)} hitSlop={8} accessibilityRole="button" accessibilityState={{ expanded: showAll }}>
              <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700', textAlign: 'center' }}>
                {showAll ? t('plan.analyse.showLess') : t('plan.analyse.showAll', { count: slices.length })}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {accountShares.length > 1 ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="smallBold">{t('tx.list.byAccount')}</ThemedText>
          <View style={styles.stack}>
            {accountShares.map((a, i) => (
              <View key={a.id} style={{ flex: a.value, marginLeft: i > 0 ? 2 : 0, backgroundColor: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] }} />
            ))}
          </View>
          <View style={styles.legend}>
            {accountShares.map((a, i) => (
              <Pressable key={a.id} onPress={() => onPickAccount(a.id)} style={styles.legendItem} accessibilityRole="button" accessibilityLabel={a.label}>
                <View style={[styles.dot, { backgroundColor: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] }]} />
                <ThemedText type="small" numberOfLines={1} style={{ fontWeight: '600' }}>{a.label}</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary, ...tabularNums }}>{hidden ? '••••' : formatCompact(a.value)}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {slices.length === 0 && pct === null ? (
        <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.four }}>
          {t('tx.list.summaryEmpty')}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stripScroll: { marginHorizontal: -Spacing.four, flexGrow: 0, marginBottom: Spacing.three },
  strip: { paddingHorizontal: Spacing.four, gap: Spacing.three },
  stripItem: { width: 66, alignItems: 'center', gap: 2 },
  ring: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  circle: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.two, marginBottom: Spacing.three },
  tiles: { flexDirection: 'row', gap: Spacing.two },
  tile: { flex: 1, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  tileValue: { fontSize: FontSize.heading, fontWeight: '800', ...tabularNums },
  usedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: 4 },
  usedText: { flexShrink: 0 },
  track: { flex: 1, height: 8, borderRadius: Radius.xs, overflow: 'hidden', marginTop: 2 },
  trackBig: { height: 12, borderRadius: Radius.xs, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.xs },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: Spacing.one },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 3, marginBottom: -StyleSheet.hairlineWidth },
  summaryWrap: { paddingTop: Spacing.one },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  bigPct: { fontSize: FontSize.display, fontWeight: '800', lineHeight: 40, ...tabularNums },
  amountCol: { alignItems: 'flex-end', flexShrink: 0 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 4 },
  stack: { flexDirection: 'row', height: 10, borderRadius: Radius.xs, overflow: 'hidden' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.three, rowGap: Spacing.one },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
