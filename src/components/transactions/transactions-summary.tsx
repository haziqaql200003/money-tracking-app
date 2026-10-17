import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { CategoryIcon } from '@/components/ui/category-icon';
import { Donut } from '@/components/charts/donut';
import { useCategories } from '@/context/CategoriesContext';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCompact, formatMoney } from '@/utils/currency';
import { formatPct } from '@/utils/insights';
import { useT } from '@/i18n';
import { categoryName } from '@/i18n/data';
import { p1, r1 } from '@/utils/percent';

const MASK = 'RM ••••';
const FALLBACK_COLOR = '#8E8E93';

/* ---------------------------------- Summary --------------------------------- */

type SummaryProps = {
  income: number;
  spending: number;
  /** % change in spending vs the previous month. null = nothing to compare. */
  deltaPercent: number | null;
  prevLabel: string;
  hidden: boolean;
  onToggleHidden: () => void;
};

export function SummaryCard({ income, spending, deltaPercent, prevLabel, hidden, onToggleHidden }: SummaryProps) {
  const { t } = useT();
  const colors = useTheme();
  const net = income - spending;

  const netText = hidden
    ? MASK
    : net === 0
      ? formatMoney(0)
      : formatMoney(net, { signed: true, type: net < 0 ? 'debit' : 'credit' });
  const netColor = net < 0 ? colors.negative : net > 0 ? colors.positive : colors.text;

  const up = deltaPercent !== null && deltaPercent > 0;
  const rate = income > 0 && net >= 0 ? r1((net / income) * 100) : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.netTop}>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          {t('home.summary.netThisMonth')}
        </ThemedText>
        <Pressable
          onPress={onToggleHidden}
          hitSlop={12}
          style={[styles.eye, { backgroundColor: colors.background }]}
          accessibilityRole="button"
          accessibilityLabel={hidden ? t('home.summary.showAmounts') : t('home.summary.hideAmounts')}
        >
          <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.text} />
        </Pressable>
      </View>

      <ThemedText style={[styles.netAmount, { color: netColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {netText}
      </ThemedText>

      <View style={styles.metaRow}>
        {deltaPercent !== null ? (
          <View style={[styles.pill, { backgroundColor: colors.background }]}>
            <ThemedText type="small" style={{ color: up ? colors.negative : colors.positive, fontWeight: '700' }}>
              {up ? '▲' : deltaPercent < 0 ? '▼' : '•'} {formatPct(deltaPercent)}
            </ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {t('home.summary.spendingVs', { label: prevLabel })}
            </ThemedText>
          </View>
        ) : null}
        {income > 0 ? (
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {rate !== null ? t('home.summary.saved', { rate: p1(rate) }) : t('home.summary.overspent')}
          </ThemedText>
        ) : null}
      </View>

      <View style={[styles.tiles, { borderTopColor: colors.divider }]}>
        <View style={styles.tile}>
          <View style={[styles.tileIcon, { backgroundColor: `${colors.positive}26` }]}>
            <Ionicons name="arrow-down" size={16} color={colors.positive} />
          </View>
          <View style={styles.flex}>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {t('common.income')}
            </ThemedText>
            <ThemedText style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {hidden ? MASK : formatMoney(income)}
            </ThemedText>
          </View>
        </View>
        <View style={styles.tile}>
          <View style={[styles.tileIcon, { backgroundColor: `${colors.negative}26` }]}>
            <Ionicons name="arrow-up" size={16} color={colors.negative} />
          </View>
          <View style={styles.flex}>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {t('home.summary.spending')}
            </ThemedText>
            <ThemedText style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {hidden ? MASK : formatMoney(spending)}
            </ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}

/* --------------------------------- Breakdown -------------------------------- */

type Slice = { categoryId: string; value: number; percent: number };

type BreakdownProps = {
  slices: Slice[];
  total: number;
  selectedId: string | null;
  onSelect: (categoryId: string) => void;
  hidden: boolean;
};

export function CategoryBreakdown({ slices, total, selectedId, onSelect, hidden }: BreakdownProps) {
  const { t } = useT();
  const colors = useTheme();
  // Closed by default: the colour bar already shows the split; open it to see and filter by each category.
  const [expanded, setExpanded] = useState(false);
  const { getCategory } = useCategories();

  if (slices.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <Pressable style={styles.breakdownHeader} onPress={() => setExpanded((v) => !v)} hitSlop={8}>
        <View>
          <ThemedText type="smallBold">{t('home.summary.whereItWent')}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t('home.summary.spentTotal', { amount: hidden ? MASK : formatMoney(total) })}
          </ThemedText>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </Pressable>

      <View style={styles.stack}>
        {slices.map((s, i) => {
          const cat = getCategory(s.categoryId);
          return (
            <View
              key={s.categoryId}
              style={{
                flex: s.value,
                marginLeft: i > 0 ? 2 : 0,
                backgroundColor: cat?.color ?? FALLBACK_COLOR,
                opacity: selectedId && selectedId !== s.categoryId ? 0.3 : 1,
              }}
            />
          );
        })}
      </View>

      {expanded
        ? slices.map((s) => {
            const cat = getCategory(s.categoryId);
            const color = cat?.color ?? FALLBACK_COLOR;
            const selected = selectedId === s.categoryId;
            const dimmed = !!selectedId && !selected;
            const over = !!cat && cat.monthlyLimit > 0 && s.value > cat.monthlyLimit;

            return (
              <Pressable
                key={s.categoryId}
                onPress={() => onSelect(s.categoryId)}
                style={[styles.catRow, dimmed && { opacity: 0.45 }]}
                accessibilityRole="button"
                accessibilityLabel={t('home.summary.filterBy', { name: cat ? categoryName(cat) : s.categoryId })}
              >
                <CategoryIcon icon={cat?.icon ?? 'help-circle'} color={color} size={34} />
                <View style={styles.flex}>
                  <View style={styles.catTop}>
                    <ThemedText type="small" style={{ fontWeight: selected ? '700' : '500' }} numberOfLines={1}>
                      {cat ? categoryName(cat) : s.categoryId}
                    </ThemedText>
                    <ThemedText type="small" style={{ fontWeight: '600' }}>
                      {hidden ? MASK : formatMoney(s.value)}
                      <ThemedText type="small" style={{ color: colors.textSecondary }}>
                        {`  ${p1(s.percent)}%`}
                      </ThemedText>
                    </ThemedText>
                  </View>
                  <View style={[styles.track, { backgroundColor: colors.background }]}>
                    <View style={[styles.fill, { backgroundColor: color, width: `${Math.max(s.percent, 2)}%` }]} />
                  </View>
                  {over ? (
                    <ThemedText type="small" style={[styles.overText, { color: colors.negative }]}>
                      {t('home.summary.overBudget')}
                    </ThemedText>
                  ) : null}
                </View>
                {selected ? <Ionicons name="checkmark-circle" size={18} color={color} /> : null}
              </Pressable>
            );
          })
        : null}

      {expanded ? (
        <ThemedText type="small" style={[styles.tip, { color: colors.textSecondary }]}>
          {t('home.summary.tip')}
        </ThemedText>
      ) : null}
    </View>
  );
}

/* ------------------------------ Month, in one card ----------------------------- */

const TOP_CHIPS = 4;

type MonthProps = SummaryProps & BreakdownProps;

/**
 * The month at a glance: a donut of where the spending went next to the net, income and spending,
 * then the biggest categories as chips. Tap a chip to filter the list; "All" opens every category.
 */
export function MonthSummary({ income, spending, deltaPercent, prevLabel, hidden, onToggleHidden, slices, selectedId, onSelect }: MonthProps) {
  const { t } = useT();
  const colors = useTheme();
  const { getCategory } = useCategories();
  const [showAll, setShowAll] = useState(false);
  const net = income - spending;
  const netText = hidden ? MASK : net === 0 ? formatMoney(0) : formatMoney(net, { signed: true, type: net < 0 ? 'debit' : 'credit' });
  const netColor = net < 0 ? colors.negative : net > 0 ? colors.positive : colors.text;
  const up = deltaPercent !== null && deltaPercent > 0;
  const colorOf = (id: string) => getCategory(id)?.color ?? FALLBACK_COLOR;
  const parts = slices.map((s) => ({ id: s.categoryId, value: s.value, color: colorOf(s.categoryId) }));
  const chips = showAll ? slices : slices.slice(0, TOP_CHIPS);

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.netTop}>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          {t('home.summary.netThisMonth')}
        </ThemedText>
        <Pressable
          onPress={onToggleHidden}
          hitSlop={12}
          style={[styles.eye, { backgroundColor: colors.background }]}
          accessibilityRole="button"
          accessibilityLabel={hidden ? t('home.summary.showAmounts') : t('home.summary.hideAmounts')}
        >
          <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.monthRow}>
        <Donut parts={parts.length > 0 ? parts : [{ id: 'none', value: 1, color: colors.backgroundSelected }]} size={108} stroke={15} selectedId={selectedId}>
          <ThemedText type="small" style={{ color: colors.textSecondary, fontSize: FontSize.micro }}>
            {t('home.summary.spending')}
          </ThemedText>
          <ThemedText type="smallBold" numberOfLines={1}>
            {hidden ? '••••' : formatCompact(spending)}
          </ThemedText>
        </Donut>
        <View style={[styles.flex, { gap: 6 }]}>
          <ThemedText style={[styles.monthNet, { color: netColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {netText}
          </ThemedText>
          <View style={styles.monthTiles}>
            {[
              { key: 'in', label: t('common.income'), value: income, color: colors.positive },
              { key: 'out', label: t('home.summary.spending'), value: spending, color: colors.negative },
            ].map((x) => (
              <View key={x.key} style={styles.flex}>
                <View style={styles.monthLine}>
                  <View style={[styles.dotSmall, { backgroundColor: x.color }]} />
                  <ThemedText type="small" style={{ color: colors.textSecondary, fontSize: FontSize.caption }} numberOfLines={1}>
                    {x.label}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.monthTileValue}>
                  {hidden ? MASK : formatMoney(x.value)}
                </ThemedText>
              </View>
            ))}
          </View>
          {deltaPercent !== null ? (
            <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={2}>
              <ThemedText type="small" style={{ color: up ? colors.negative : colors.positive, fontWeight: '700' }}>
                {up ? '▲' : deltaPercent < 0 ? '▼' : '•'} {formatPct(deltaPercent)}{' '}
              </ThemedText>
              {t('home.summary.spendingVs', { label: prevLabel })}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {slices.length > 0 ? (
        <View style={[styles.monthCats, { borderTopColor: colors.divider }]}>
          <View style={styles.breakdownHeader}>
            <ThemedText type="smallBold">{t('home.summary.whereItWent')}</ThemedText>
            {slices.length > TOP_CHIPS ? (
              <Pressable onPress={() => setShowAll((v) => !v)} hitSlop={8} accessibilityRole="button" accessibilityState={{ expanded: showAll }}>
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
                  {showAll ? t('plan.analyse.showLess') : t('plan.analyse.showAll', { count: slices.length })}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.chipWrap}>
            {chips.map((s) => {
              const cat = getCategory(s.categoryId);
              const active = selectedId === s.categoryId;
              return (
                <Pressable
                  key={s.categoryId}
                  onPress={() => onSelect(s.categoryId)}
                  style={[styles.catChip, { borderColor: active ? colorOf(s.categoryId) : colors.divider, backgroundColor: active ? colors.backgroundSelected : 'transparent' }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t('home.summary.filterBy', { name: cat ? categoryName(cat) : s.categoryId })}
                >
                  <View style={[styles.dotSmall, { backgroundColor: colorOf(s.categoryId) }]} />
                  <ThemedText type="small" numberOfLines={1} style={{ fontWeight: active ? '700' : '500', flexShrink: 1 }}>
                    {cat ? categoryName(cat) : s.categoryId}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    {hidden ? `${p1(s.percent)}%` : `${formatCompact(s.value)} · ${p1(s.percent)}%`}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <ThemedText type="small" style={[styles.tip, { color: colors.textSecondary }]}>
            {t('home.summary.tip')}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.two },
  monthNet: { fontSize: FontSize.title, lineHeight: 28, fontWeight: '800' },
  monthLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthTiles: { flexDirection: 'row', gap: 10 },
  monthTileValue: { alignSelf: 'stretch' },
  dotSmall: { width: 8, height: 8, borderRadius: Radius.pill },
  monthCats: { marginTop: Spacing.three, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth, gap: Spacing.two },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 7, maxWidth: '100%' },
  flex: { flex: 1 },
  card: { borderRadius: Radius.lg, padding: 18, marginBottom: Spacing.three },

  netTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eye: { width: 28, height: 28, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  netAmount: { fontSize: FontSize.largeTitle, lineHeight: 38, fontWeight: '800', marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: Spacing.two },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
  },
  tiles: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tileIcon: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  tileValue: { fontSize: FontSize.body, fontWeight: '700' },

  breakdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  catIcon: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  catEmoji: { fontSize: FontSize.body },
  catTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  track: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: 6, borderRadius: Radius.pill },
  overText: { fontSize: FontSize.micro, lineHeight: 14, fontWeight: '600', marginTop: 3 },
  tip: { textAlign: 'center', marginTop: Spacing.two, fontSize: FontSize.caption, lineHeight: 16, opacity: 0.7 },
});