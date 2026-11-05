import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { TaxClaimSheet } from '@/components/tools/tax-claim-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { GROUP_CAPS, MARGINAL_RATES, RELIEFS, TAX_YEAR_NOTE } from '@/constants/tax-relief';
import { Radius, Spacing, Type } from '@/constants/theme';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTools } from '@/context/ToolsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { Alert } from '@/services/dialog';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { shareText } from '@/services/share-file';
import { formatMoney } from '@/utils/currency';
import { claimsOfYear, effectiveClaims, estimateSaving, summarizeTax, type TaxClaim } from '@/utils/tax-relief';

const MASK = 'RM ••••';

export default function TaxScreen() {
  const colors = useTheme();
  const { t } = useT();
  const { hideAmounts } = usePrivacy();
  const { claims, taxRate, setTaxRate } = useTools();
  const { transactions } = useTransactions();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [sheet, setSheet] = useState<{ claim: TaxClaim | null; reliefId: string | null } | null>(null);
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const muted = { color: colors.textSecondary };

  const allClaims = useMemo(() => effectiveClaims(claims, transactions), [claims, transactions]);
  const summary = useMemo(() => summarizeTax(allClaims, year), [allClaims, year]);
  const saving = estimateSaving(summary, taxRate);
  const yearClaims = useMemo(() => claimsOfYear(allClaims, year).sort((a, b) => (a.date < b.date ? 1 : -1)), [allClaims, year]);
  const nameOf = (id: string) => {
    const d = RELIEFS.find((r) => r.id === id);
    return d ? t(d.nameKey) : id;
  };

  function share() {
    const lines = summary.rows
      .filter((r) => r.used > 0)
      .map((r) => t('tax.share.line', { name: t(r.def.nameKey), used: formatMoney(r.used), counted: formatMoney(r.def.rebate ? r.used : r.counted) }));
    const text = [t('tax.share.head', { year }), ...lines, t('tax.share.total', { amount: formatMoney(summary.reliefTotal) }), t('tax.share.saving', { amount: formatMoney(saving) })].join('\n');
    void shareText(text);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <ScreenHeader title={t('tax.title')} right={<Pressable onPress={share} hitSlop={10} accessibilityLabel={t('tax.share')}><Ionicons name="share-outline" size={22} color={colors.accent} /></Pressable>} />

          <View style={styles.chips}>
            {[thisYear, thisYear - 1, thisYear - 2].map((y) => (
              <Chip key={y} size="sm" label={String(y)} active={y === year} onPress={() => setYear(y)} />
            ))}
          </View>

          <Card style={styles.gap}>
            <ThemedText type="small" style={muted}>{t('tax.year', { year })}</ThemedText>
            <View style={styles.two}>
              <View style={styles.flex}>
                <ThemedText type="small" style={muted}>{t('tax.summary.relief')}</ThemedText>
                <ThemedText style={Type.title}>{money(summary.reliefTotal)}</ThemedText>
              </View>
              <View style={styles.flex}>
                <ThemedText type="small" style={muted}>{t('tax.summary.saving')}</ThemedText>
                <ThemedText style={[Type.title, { color: colors.positive }]}>{money(saving)}</ThemedText>
              </View>
            </View>
            {summary.rebateTotal > 0 ? <ThemedText type="small" style={muted}>{t('tax.summary.rebate', { amount: money(summary.rebateTotal) })}</ThemedText> : null}
            <ThemedText type="smallBold">{t('tax.summary.rate')}</ThemedText>
            <View style={styles.chips}>
              <Chip size="sm" label={t('tax.summary.noRate')} active={taxRate === null} onPress={() => setTaxRate(null)} />
              {MARGINAL_RATES.filter((r) => r > 0).map((r) => (
                <Chip key={r} size="sm" label={t('tax.summary.rateChip', { rate: r })} active={taxRate === r} onPress={() => setTaxRate(r)} />
              ))}
            </View>
            <ThemedText type="small" style={muted}>{t('tax.summary.rateHint')}</ThemedText>
          </Card>

          <Card style={[styles.gap, styles.mt]}>
            <ThemedText type="smallBold">{t('tax.auto.title')}</ThemedText>
            <ThemedText type="small" style={muted}>{t('tax.auto.body')}</ThemedText>
          </Card>

          <ThemedText style={[Type.heading, styles.h]}>{t('tax.list.title')}</ThemedText>
          <View style={{ gap: Spacing.two }}>
            {summary.rows.map((r) => {
              const cap = r.def.cap;
              const pct = cap ? Math.min(1, r.counted / cap) : r.used > 0 ? 1 : 0;
              const full = r.remaining === 0;
              return (
                <Card key={r.def.id} onPress={() => setSheet({ claim: null, reliefId: r.def.id })} style={styles.gap}>
                  <View style={styles.head}>
                    <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
                      <Ionicons name={r.def.icon} size={18} color={colors.accent} />
                    </View>
                    <View style={styles.flex}>
                      <ThemedText type="smallBold">{t(r.def.nameKey)}</ThemedText>
                      <ThemedText type="small" style={muted}>
                        {money(r.used)} {cap ? t('tax.row.of', { cap: formatMoney(cap) }) : t('tax.row.noCap')}
                        {r.def.rebate ? ` · ${t('tax.row.rebate')}` : ''}
                      </ThemedText>
                    </View>
                    <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
                  </View>
                  {cap ? (
                    <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
                      <View style={[styles.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: full ? colors.warning : colors.accent }]} />
                    </View>
                  ) : null}
                  <ThemedText type="small" style={muted}>{t(r.def.hintKey)}</ThemedText>
                  {cap ? (
                    <ThemedText type="small" style={{ color: r.over > 0 || full ? colors.warning : colors.positive }}>
                      {r.over > 0 ? t('tax.row.over', { amount: formatMoney(r.over) }) : full ? t('tax.row.full') : t('tax.row.left', { amount: formatMoney(r.remaining ?? 0) })}
                    </ThemedText>
                  ) : null}
                  {r.def.group ? <ThemedText type="small" style={muted}>{t(r.def.group === 'medical' ? 'tax.group.medical' : 'tax.group.eduSelf', { cap: formatMoney(GROUP_CAPS[r.def.group]) })}</ThemedText> : null}
                </Card>
              );
            })}
          </View>

          <ThemedText style={[Type.heading, styles.h]}>{t('tax.claims.title')}</ThemedText>
          {yearClaims.length === 0 ? (
            <ThemedText type="small" style={muted}>{t('tax.claims.empty', { year })}</ThemedText>
          ) : (
            <Card padding={0}>
              {yearClaims.map((c, i) => (
                <Pressable key={c.id} onPress={() => (c.fromRecord ? Alert.alert(t('tax.claims.fromRecord.title'), t('tax.claims.fromRecord.body')) : setSheet({ claim: c, reliefId: c.reliefId }))} style={[styles.claim, i > 0 && { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}>
                  {c.fromRecord ? <Ionicons name="link-outline" size={16} color={colors.textSecondary} /> : null}
                  <View style={styles.flex}>
                    <ThemedText type="smallBold" numberOfLines={1}>{nameOf(c.reliefId)}</ThemedText>
                    <ThemedText type="small" style={muted} numberOfLines={1}>{c.date}{c.note ? ` · ${c.note}` : ''}</ThemedText>
                  </View>
                  <ThemedText type="smallBold">{money(c.amount)}</ThemedText>
                </Pressable>
              ))}
            </Card>
          )}
          <Button label={t('tax.add')} icon="add" onPress={() => setSheet({ claim: null, reliefId: null })} style={styles.mt} />
          <ThemedText type="small" style={[muted, styles.mt]}>{t('tax.note', { year: TAX_YEAR_NOTE })}</ThemedText>
        </ScrollView>
      </SafeAreaView>
      <TaxClaimSheet visible={!!sheet} claim={sheet?.claim ?? null} reliefId={sheet?.reliefId ?? null} year={year} onClose={() => setSheet(null)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.two },
  gap: { gap: Spacing.two },
  mt: { marginTop: Spacing.three },
  h: { marginTop: Spacing.four, marginBottom: Spacing.two },
  two: { flexDirection: 'row', gap: Spacing.three },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  claim: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.three },
});
