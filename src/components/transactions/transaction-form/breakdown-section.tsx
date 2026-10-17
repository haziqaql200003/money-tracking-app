import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Switch, TextInput, View } from 'react-native';

import { GlassSegmented } from '@/components/glass/glass-segmented';
import { AmountInput } from '@/components/ui/amount-input';
import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { formatMoney } from '@/utils/currency';

import { CHARGES, cleanPercent } from './helpers';
import { styles } from './styles';
import type { Breakdown } from './use-breakdown';

type Props = {
  breakdown: Breakdown;
  /** The amount typed so far; turning the breakdown on seeds its first line with it. */
  amount: string;
};

/** Split a transaction into line items, with extras like service charge, tax, tip, delivery and discount. */
export function BreakdownSection({ breakdown, amount }: Props) {
  const { t } = useT();
  const colors = useTheme();
  const {
    breakdownOn, items, charges, itemsTotal, bill, grandTotal,
    addItem, updateItem, removeItem, addCharge, updateCharge, removeCharge, setChargeMode,
  } = breakdown;
  const toggleBreakdown = (next: boolean) => breakdown.toggle(next, amount);

  return (
    <View style={[styles.breakdownCard, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.breakdownHeader}>
        <View style={styles.flex}>
          <ThemedText type="smallBold">{t('tx.add.breakdown')}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t('tx.add.breakdownHint')}
          </ThemedText>
        </View>
        <Switch value={breakdownOn} onValueChange={toggleBreakdown} trackColor={{ true: colors.accent }} />
      </View>

      {breakdownOn ? (
        <View style={styles.breakdownBody}>
          {items.map((it, idx) => (
            <View key={it.id} style={[styles.itemRow, { backgroundColor: colors.background, borderColor: colors.divider }]}>
              <TextInput
                style={[styles.itemField, styles.itemLabel, { color: colors.text }]}
                placeholder={t('tx.add.itemN', { n: idx + 1 })}
                placeholderTextColor={colors.textSecondary}
                value={it.label}
                onChangeText={(v) => updateItem(it.id, { label: v })}
              />
              <View style={[styles.itemSplit, { backgroundColor: colors.divider }]} />
              <ThemedText style={[styles.itemUnit, { color: colors.textSecondary }]}>
                {/* i18n-ignore: currency */}
                RM
              </ThemedText>
              <AmountInput
                style={[styles.itemField, styles.itemAmount, { color: colors.text }]}
                placeholderTextColor={colors.textSecondary}
                value={it.amountText}
                onChange={(v) => updateItem(it.id, { amountText: v })}
                textAlign="right"
              />
              <Pressable onPress={() => removeItem(it.id)} hitSlop={8} accessibilityLabel={t('tx.add.removeItemA11y')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          ))}

          <Pressable onPress={() => addItem()} style={[styles.addItemRow, { borderColor: colors.divider }]}>
            <Ionicons name="add" size={18} color={colors.accent} />
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
              {t('tx.add.addItem')}
            </ThemedText>
          </Pressable>

          {/* Extras: apart from the items, one of each, % or amount */}
          <View style={[styles.chargesDivider, { borderTopColor: colors.divider }]}>
            <ThemedText type="small" style={{ color: colors.textSecondary, fontWeight: '600' }}>
              {t('tx.add.charges')}
            </ThemedText>
          </View>

          {bill.results.map((r) => {
            const def = CHARGES.find((c) => c.kind === r.kind)!;
            const draft = charges.find((c) => c.kind === r.kind)!;
            const isPercent = draft.mode === 'percent' && def.percent;
            return (
              <View key={r.kind} style={[styles.chargeCard, { backgroundColor: colors.background, borderColor: colors.divider }]}>
                <View style={styles.chargeHead}>
                  <ThemedText type="smallBold" style={styles.flex} numberOfLines={1}>
                    {t(def.labelKey)}
                  </ThemedText>
                  <ThemedText type="smallBold" style={{ color: r.amount < 0 ? colors.positive : colors.text }}>
                    {formatMoney(r.amount)}
                  </ThemedText>
                  <Pressable onPress={() => removeCharge(r.kind)} hitSlop={8} accessibilityLabel={t('tx.add.removeChargeA11y')}>
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>
                <View style={styles.chargeBody}>
                  {def.percent ? (
                    <View style={styles.chargeMode}>
                      <GlassSegmented
                        height={34}
                        trackColor={colors.backgroundElement}
                        options={[
                          { key: 'percent', label: '%' }, // i18n-ignore: symbol
                          { key: 'amount', label: 'RM' }, // i18n-ignore: currency
                        ]}
                        value={draft.mode}
                        onChange={(m) => setChargeMode(r.kind, m)}
                      />
                    </View>
                  ) : (
                    <View style={styles.flex} />
                  )}
                  <View style={[styles.chargeValueWrap, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
                    {isPercent ? (
                      <TextInput
                        style={[styles.itemAmountInput, { color: colors.text }]}
                        placeholder="0"
                        placeholderTextColor={colors.textSecondary}
                        value={draft.value}
                        onChangeText={(v) => updateCharge(r.kind, { value: cleanPercent(v) })}
                        keyboardType="decimal-pad"
                        textAlign="right"
                        accessibilityLabel={t(def.labelKey)}
                      />
                    ) : (
                      <AmountInput
                        style={[styles.itemAmountInput, { color: colors.text }]}
                        placeholderTextColor={colors.textSecondary}
                        value={draft.value}
                        onChange={(v) => updateCharge(r.kind, { value: v })}
                        textAlign="right"
                        accessibilityLabel={t(def.labelKey)}
                      />
                    )}
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      {isPercent ? '%' : 'RM' /* i18n-ignore: unit */}
                    </ThemedText>
                  </View>
                </View>
                {isPercent && r.percent ? (
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    {t('tx.add.chargeBase', { pct: r.percent, base: formatMoney(r.base) })}
                  </ThemedText>
                ) : null}
              </View>
            );
          })}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
            {CHARGES.map((c) => {
              const added = charges.some((x) => x.kind === c.kind);
              return (
                <Pressable
                  key={c.kind}
                  disabled={added}
                  onPress={() => addCharge(c.kind)}
                  style={[styles.quickChip, { backgroundColor: colors.background, borderColor: colors.divider, opacity: added ? 0.45 : 1 }]}
                  accessibilityState={{ disabled: added }}
                >
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    {added ? '✓ ' : '+ '}
                    {t(c.labelKey)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={[styles.itemsTotalRow, { borderTopColor: colors.divider }]}>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {charges.length > 0 ? t('tx.add.subtotal') : t('tx.add.itemsTotal')}
            </ThemedText>
            <ThemedText type="smallBold">{formatMoney(itemsTotal)}</ThemedText>
          </View>
          {charges.length > 0 ? (
            <View style={styles.itemsTotalRow}>
              <ThemedText type="smallBold">{t('tx.add.total')}</ThemedText>
              <ThemedText type="smallBold">{formatMoney(grandTotal)}</ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
