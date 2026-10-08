import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DebtDetailModal } from '@/components/debt-detail-modal';
import { DebtFormModal } from '@/components/debt-form-modal';
import { ProgressBar } from '@/components/debt-ui';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useDebts } from '@/context/DebtsContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { formatDate } from '@/i18n/format';
import { formatMoney } from '@/utils/currency';
import { toDateKey } from '@/utils/dates';
import {
  creditStatus,
  instalmentAmount,
  nextCreditDue,
  nextInstalment,
  overview,
  progressPercent,
  remainingPrincipal,
  type Debt,
} from '@/utils/debts';

const MASK = 'RM ••••'; // i18n-ignore
const WARN_COLOR = '#D97706';

export default function DebtsScreen() {
  const colors = useTheme();
  const { t } = useT();
  const { debts, ready } = useDebts();
  const { accountBalance } = useTransactions();
  const { hideAmounts } = usePrivacy();
  const [formOpen, setFormOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const today = toDateKey(new Date());
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const dateLabel = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return formatDate(new Date(y, m - 1, d));
  };

  const creditUsed: Record<string, number> = {};
  for (const d of debts) if (d.kind === 'credit') creditUsed[d.id] = creditStatus(d.creditLimit ?? 0, accountBalance(d.accountId)).used;
  const sum = overview(debts, creditUsed, today);

  const credits = debts.filter((d) => d.kind === 'credit');
  const active = debts.filter((d) => d.kind !== 'credit' && d.status === 'active');
  const done = debts.filter((d) => d.kind !== 'credit' && d.status === 'done');
  const opened = debts.find((d) => d.id === openId) ?? null;

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ScreenHeader
            title={t('debt.title')}
            right={
              <Pressable
                onPress={() => setFormOpen(true)}
                hitSlop={8}
                style={[styles.add, { backgroundColor: colors.accent }]}
                accessibilityRole="button"
                accessibilityLabel={t('debt.add')}
              >
                <Ionicons name="add" size={22} color="#fff" />
              </Pressable>
            }
          />

          {!ready ? (
            <ScreenSkeleton variant="cards" />
          ) : debts.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="card-outline" size={44} color={colors.textSecondary} />
              <ThemedText type="smallBold" style={styles.center}>{t('debt.empty.title')}</ThemedText>
              <ThemedText type="small" style={[styles.center, { color: colors.textSecondary }]}>{t('debt.empty.body')}</ThemedText>
              <Pressable style={[styles.emptyButton, { backgroundColor: colors.accent }]} onPress={() => setFormOpen(true)}>
                <ThemedText style={styles.emptyButtonText}>{t('debt.add')}</ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={[styles.summary, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.summary.totalOwed')}</ThemedText>
                <ThemedText style={styles.big}>{money(sum.totalOwed)}</ThemedText>
                <View style={styles.stats}>
                  <View style={styles.flex}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.summary.dueThisMonth')}</ThemedText>
                    <ThemedText type="smallBold">{money(sum.dueThisMonth)}</ThemedText>
                  </View>
                  <View style={styles.flex}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.summary.debtFree')}</ThemedText>
                    <ThemedText type="smallBold">{sum.debtFreeDate ? dateLabel(sum.debtFreeDate) : t('debt.summary.none')}</ThemedText>
                  </View>
                </View>
                {sum.overdueCount > 0 ? (
                  <ThemedText type="small" style={{ color: colors.negative, fontWeight: '600' }}>
                    {t('debt.summary.overdue', { count: sum.overdueCount })}
                  </ThemedText>
                ) : null}
              </View>

              {credits.length > 0 ? <ThemedText type="smallBold" style={styles.section}>{t('debt.section.credit')}</ThemedText> : null}
              {credits.map((d) => {
                const st = creditStatus(d.creditLimit ?? 0, accountBalance(d.accountId));
                const barColor = st.usedPercent >= 90 ? colors.negative : st.usedPercent >= 70 ? WARN_COLOR : colors.accent;
                return (
                  <DebtCard key={d.id} debt={d} onPress={() => setOpenId(d.id)}>
                    <ProgressBar percent={st.usedPercent} color={barColor} />
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      {t('debt.credit.availableOf', { available: money(st.available), limit: money(st.limit) })}
                    </ThemedText>
                    {d.dueDay ? (
                      <ThemedText type="small" style={{ color: colors.textSecondary }}>
                        {t('debt.credit.nextDue', { date: dateLabel(nextCreditDue(d.dueDay, today)) })}
                      </ThemedText>
                    ) : null}
                  </DebtCard>
                );
              })}

              {active.length > 0 ? <ThemedText type="smallBold" style={styles.section}>{t('debt.section.active')}</ThemedText> : null}
              {active.map((d) => {
                const next = nextInstalment(d);
                const overdue = !!next && next.dueDate < today;
                return (
                  <DebtCard key={d.id} debt={d} onPress={() => setOpenId(d.id)} trailing={money(remainingPrincipal(d))}>
                    <ProgressBar percent={progressPercent(d)} color={colors.positive} />
                    {next ? (
                      <ThemedText type="small" style={{ color: overdue ? colors.negative : colors.textSecondary }}>
                        {t(overdue ? 'debt.detail.overdue' : 'debt.detail.nextDue', { date: dateLabel(next.dueDate), amount: money(instalmentAmount(next)) })}
                      </ThemedText>
                    ) : null}
                  </DebtCard>
                );
              })}

              {done.length > 0 ? <ThemedText type="smallBold" style={styles.section}>{t('debt.section.done')}</ThemedText> : null}
              {done.map((d) => (
                <DebtCard key={d.id} debt={d} onPress={() => setOpenId(d.id)} trailing={t('debt.detail.paid')} />
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <DebtFormModal visible={formOpen} onClose={() => setFormOpen(false)} />
      <DebtDetailModal debt={opened} onClose={() => setOpenId(null)} />
    </ThemedView>
  );
}

function DebtCard({ debt, onPress, trailing, children }: { debt: Debt; onPress: () => void; trailing?: string; children?: ReactNode }) {
  const colors = useTheme();
  const { t } = useT();
  const kindLabel = t(debt.kind === 'loan' ? 'debt.kind.loan' : debt.kind === 'credit' ? 'debt.kind.credit' : 'debt.kind.installment');
  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: colors.backgroundElement }]} accessibilityRole="button">
      <View style={styles.cardTop}>
        <View style={styles.flex}>
          <ThemedText type="smallBold" numberOfLines={1}>{debt.name}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
            {[debt.provider, kindLabel].filter(Boolean).join(' · ')}
          </ThemedText>
        </View>
        {trailing ? <ThemedText type="smallBold">{trailing}</ThemedText> : null}
      </View>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.four, paddingBottom: 120 },
  add: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.six },
  center: { textAlign: 'center' },
  emptyButton: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: Radius.md, marginTop: Spacing.three },
  emptyButtonText: { color: '#fff', fontWeight: '700' },
  summary: { padding: Spacing.three, borderRadius: Radius.lg, gap: 6 },
  big: { fontSize: FontSize.display, lineHeight: 40, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.two },
  section: { marginTop: Spacing.four, marginBottom: Spacing.two },
  card: { padding: Spacing.three, borderRadius: Radius.lg, gap: 8, marginBottom: Spacing.two },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
