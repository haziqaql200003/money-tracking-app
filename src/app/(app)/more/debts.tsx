import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DebtDetailModal } from '@/components/debts/debt-detail-modal';
import { DebtFormModal } from '@/components/debts/debt-form-modal';
import { IouModal } from '@/components/debts/iou-modal';
import { ProgressBar } from '@/components/debts/debt-ui';
import { GlassSegmented } from '@/components/glass/glass-segmented';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useDebts } from '@/context/DebtsContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { formatDate } from '@/i18n/format';
import { formatMoney } from '@/utils/currency';
import { toDateKey } from '@/utils/dates';
import { iouDone, iouLeft, iouOverdue, iouPaid, iouTotals, type Iou } from '@/utils/ious';
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

type Tab = 'mine' | 'people';
type SectionId = 'installment' | 'loan' | 'credit' | 'done' | 'iouDone';

/** Newest purchase or start date first; ties by name. */
const byBought = (a: Debt, b: Debt) => b.startDate.localeCompare(a.startDate) || a.name.localeCompare(b.name);
/** People: the day the entry was made, newest first. */
const byIouNewest = (a: Iou, b: Iou) => b.createdAt.localeCompare(a.createdAt);

/**
 * Debts in two tabs (yours, and money with people) so neither list pushes the other off screen.
 * Each kind folds into its own section, newest bought first, with a small row per debt.
 */
export default function DebtsScreen() {
  const colors = useTheme();
  const { t } = useT();
  const { debts, ious, ready } = useDebts();
  const { accountBalance } = useTransactions();
  const { hideAmounts } = usePrivacy();
  const [tab, setTab] = useState<Tab>('mine');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [iouForm, setIouForm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [shut, setShut] = useState<Record<SectionId, boolean>>({ installment: false, loan: false, credit: false, done: true, iouDone: true });

  const today = toDateKey(new Date());
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const dateLabel = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return formatDate(new Date(y, m - 1, d));
  };
  const toggle = (id: SectionId) => setShut((prev) => ({ ...prev, [id]: !prev[id] }));

  const creditUsed: Record<string, number> = {};
  for (const d of debts) if (d.kind === 'credit') creditUsed[d.id] = creditStatus(d.creditLimit ?? 0, accountBalance(d.accountId)).used;
  const sum = overview(debts, creditUsed, today);

  const sorted = [...debts].sort(byBought);
  const instalments = sorted.filter((d) => d.kind === 'installment' && d.status === 'active');
  const loans = sorted.filter((d) => d.kind === 'loan' && d.status === 'active');
  const credits = sorted.filter((d) => d.kind === 'credit');
  const done = sorted.filter((d) => d.kind !== 'credit' && d.status === 'done');
  const opened = debts.find((d) => d.id === openId) ?? null;
  const editing = debts.find((d) => d.id === editingId) ?? null;
  const openIous = ious.filter((i) => !iouDone(i)).sort(byIouNewest);
  const doneIous = ious.filter((i) => iouDone(i)).sort(byIouNewest);
  const iouSum = iouTotals(ious);
  const editingIou = ious.find((i) => i.id === iouForm.id) ?? null;

  function addNew() {
    if (tab === 'mine') {
      setEditingId(null);
      setFormOpen(true);
    } else setIouForm({ open: true, id: null });
  }

  function startEdit(d: Debt) {
    setOpenId(null);
    // iOS cannot show a sheet while another is still closing.
    setTimeout(() => {
      setEditingId(d.id);
      setFormOpen(true);
    }, 400);
  }

  const owedOf = (list: Debt[]) => list.reduce((s2, d) => s2 + remainingPrincipal(d), 0);

  const debtRow = (d: Debt, i: number) => {
    const isCredit = d.kind === 'credit';
    const st = isCredit ? creditStatus(d.creditLimit ?? 0, accountBalance(d.accountId)) : null;
    const next = isCredit ? null : nextInstalment(d);
    const overdue = !!next && next.dueDate < today && d.status === 'active';
    const percent = st ? st.usedPercent : d.status === 'done' ? 100 : progressPercent(d);
    const barColor = st ? (st.usedPercent >= 90 ? colors.negative : st.usedPercent >= 70 ? WARN_COLOR : colors.accent) : colors.positive;
    const sub = st
      ? d.dueDay
        ? t('debt.credit.nextDue', { date: dateLabel(nextCreditDue(d.dueDay, today)) })
        : t('debt.credit.availableOf', { available: money(st.available), limit: money(st.limit) })
      : d.status === 'done'
        ? t('debt.detail.paid')
        : next
          ? t(overdue ? 'debt.detail.overdue' : 'debt.detail.nextDue', { date: dateLabel(next.dueDate), amount: money(instalmentAmount(next)) })
          : '';
    return (
      <Pressable
        key={d.id}
        onPress={() => setOpenId(d.id)}
        style={({ pressed }) => [styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
      >
        <View style={styles.rowTop}>
          <View style={styles.flex}>
            <ThemedText type="smallBold" numberOfLines={1}>{d.name}</ThemedText>
            <ThemedText type="small" style={{ color: overdue ? colors.negative : colors.textSecondary }} numberOfLines={1}>
              {[d.provider, sub].filter(Boolean).join(' · ')}
            </ThemedText>
          </View>
          <ThemedText type="smallBold" style={styles.amount}>
            {st ? money(st.used) : d.status === 'done' ? '' : money(remainingPrincipal(d))}
          </ThemedText>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </View>
        <View style={[styles.thinTrack, { backgroundColor: colors.backgroundSelected }]}>
          <View style={[styles.thinFill, { width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: barColor }]} />
        </View>
      </Pressable>
    );
  };

  const section = (id: SectionId, title: string, count: number, total: string | null, body: ReactNode) =>
    count === 0 ? null : (
      <View key={id} style={styles.sectionWrap}>
        <Pressable onPress={() => toggle(id)} style={styles.sectionHead} accessibilityRole="button" accessibilityState={{ expanded: !shut[id] }}>
          <ThemedText type="smallBold">{title}</ThemedText>
          <View style={[styles.countPill, { backgroundColor: colors.backgroundSelected }]}>
            <ThemedText type="small" style={{ fontWeight: '700' }}>{count}</ThemedText>
          </View>
          <View style={styles.flex} />
          {total ? <ThemedText type="small" style={{ color: colors.textSecondary }}>{total}</ThemedText> : null}
          <Ionicons name={shut[id] ? 'chevron-down' : 'chevron-up'} size={18} color={colors.textSecondary} />
        </Pressable>
        {!shut[id] ? <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>{body}</View> : null}
      </View>
    );

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ScreenHeader
            title={t('debt.title')}
            right={
              <Pressable
                onPress={addNew}
                hitSlop={8}
                style={[styles.add, { backgroundColor: colors.accent }]}
                accessibilityRole="button"
                accessibilityLabel={tab === 'mine' ? t('debt.add') : t('debt.iou.emptyAdd')}
              >
                <Ionicons name="add" size={22} color="#fff" />
              </Pressable>
            }
          />

          {!ready ? (
            <ScreenSkeleton variant="cards" />
          ) : (
            <>
              <View style={styles.tabs}>
                <GlassSegmented
                  options={[
                    { key: 'mine' as Tab, label: `${t('debt.tab.mine')} · ${debts.length}` },
                    { key: 'people' as Tab, label: `${t('debt.tab.people')} · ${openIous.length}` },
                  ]}
                  value={tab}
                  onChange={setTab}
                />
              </View>

              {tab === 'mine' ? (
                debts.length === 0 ? (
                  <View style={styles.empty}>
                    <Ionicons name="card-outline" size={44} color={colors.textSecondary} />
                    <ThemedText type="smallBold" style={styles.center}>{t('debt.empty.title')}</ThemedText>
                    <ThemedText type="small" style={[styles.center, { color: colors.textSecondary }]}>{t('debt.empty.body')}</ThemedText>
                    <Pressable style={[styles.emptyButton, { backgroundColor: colors.accent }]} onPress={addNew}>
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
                    <ThemedText type="small" style={[styles.sortNote, { color: colors.textSecondary }]}>{t('debt.newestFirst')}</ThemedText>
                    {section('installment', t('debt.section.installment'), instalments.length, money(owedOf(instalments)), instalments.map(debtRow))}
                    {section('loan', t('debt.section.loan'), loans.length, money(owedOf(loans)), loans.map(debtRow))}
                    {section('credit', t('debt.section.credit'), credits.length, null, credits.map(debtRow))}
                    {section('done', t('debt.section.done'), done.length, null, done.map(debtRow))}
                  </>
                )
              ) : (
                <>
                  <View style={[styles.summary, { backgroundColor: colors.backgroundElement }]}>
                    <View style={[styles.stats, { marginTop: 0 }]}>
                      <View style={styles.flex}>
                        <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.iou.youOwe')}</ThemedText>
                        <ThemedText style={[styles.mid, { color: iouSum.owe > 0 ? colors.negative : colors.text }]}>{money(iouSum.owe)}</ThemedText>
                      </View>
                      <View style={styles.flex}>
                        <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.iou.owedToYou')}</ThemedText>
                        <ThemedText style={[styles.mid, { color: iouSum.owed > 0 ? colors.positive : colors.text }]}>{money(iouSum.owed)}</ThemedText>
                      </View>
                    </View>
                  </View>
                  <Pressable onPress={addNew} style={[styles.addRow, { borderColor: colors.accent }]} accessibilityRole="button">
                    <Ionicons name="add" size={18} color={colors.accent} />
                    <ThemedText type="smallBold" style={{ color: colors.accent }}>{t('debt.iou.add')}</ThemedText>
                  </Pressable>
                  {ious.length === 0 ? <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.iou.empty')}</ThemedText> : null}
                  {openIous.map((i) => (
                    <IouCard key={i.id} iou={i} today={today} money={money} dateLabel={dateLabel} onPress={() => setIouForm({ open: true, id: i.id })} />
                  ))}
                  {section(
                    'iouDone',
                    t('debt.iou.sectionDone'),
                    doneIous.length,
                    null,
                    doneIous.map((i) => (
                      <IouCard key={i.id} iou={i} today={today} money={money} dateLabel={dateLabel} onPress={() => setIouForm({ open: true, id: i.id })} flat />
                    )),
                  )}
                  <ThemedText type="small" style={[styles.note, { color: colors.textSecondary }]}>{t('debt.iou.note')}</ThemedText>
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <DebtFormModal
        visible={formOpen}
        editing={editing}
        onClose={() => {
          setFormOpen(false);
          setEditingId(null);
        }}
      />
      <DebtDetailModal debt={opened} onClose={() => setOpenId(null)} onEdit={startEdit} />
      <IouModal visible={iouForm.open} editing={editingIou} onClose={() => setIouForm({ open: false, id: null })} />
    </ThemedView>
  );
}

function IouCard({ iou, today, money, dateLabel, onPress, flat }: { iou: Iou; today: string; money: (n: number) => string; dateLabel: (iso: string) => string; onPress: () => void; /** Inside a section card: no card of its own. */ flat?: boolean }) {
  const colors = useTheme();
  const { t } = useT();
  const done = iouDone(iou);
  const overdue = iouOverdue(iou, today);
  const mine = iou.direction === 'owe';
  return (
    <Pressable onPress={onPress} style={[styles.card, flat ? styles.flatCard : { backgroundColor: colors.backgroundElement }]} accessibilityRole="button">
      <View style={styles.cardTop}>
        <View style={styles.flex}>
          <ThemedText type="smallBold" numberOfLines={1}>{t(mine ? 'debt.iou.youOweLine' : 'debt.iou.theyOweLine', { person: iou.person })}</ThemedText>
          {iou.note ? <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>{iou.note}</ThemedText> : null}
        </View>
        <ThemedText type="smallBold" style={{ color: done ? colors.textSecondary : mine ? colors.negative : colors.positive }}>
          {done ? t('debt.iou.settled') : money(iouLeft(iou))}
        </ThemedText>
      </View>
      {!done ? (
        <>
          {iouPaid(iou) > 0 ? <ProgressBar percent={(iouPaid(iou) / iou.amount) * 100} color={colors.positive} /> : null}
          {iouPaid(iou) > 0 ? <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.iou.paidOf', { paid: money(iouPaid(iou)), total: money(iou.amount) })}</ThemedText> : null}
          <ThemedText type="small" style={{ color: overdue ? colors.negative : colors.textSecondary, fontWeight: overdue ? '600' : '400' }}>
            {iou.dueDate ? t(overdue ? 'debt.iou.overdueOn' : 'debt.iou.dueOn', { date: dateLabel(iou.dueDate) }) : t('debt.iou.noDue')}
          </ThemedText>
        </>
      ) : null}
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
  tabs: { marginBottom: Spacing.three },
  mid: { fontSize: FontSize.title, fontWeight: '800' },
  sortNote: { marginTop: Spacing.three, marginBottom: Spacing.one },
  sectionWrap: { marginTop: Spacing.two },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  countPill: { minWidth: 24, paddingHorizontal: 7, paddingVertical: 1, borderRadius: Radius.pill, alignItems: 'center' },
  listCard: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three },
  row: { paddingVertical: 12, gap: 8 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: { fontVariant: ['tabular-nums'] },
  thinTrack: { height: 4, borderRadius: Radius.pill, overflow: 'hidden' },
  thinFill: { height: 4, borderRadius: Radius.pill },
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: Radius.md, paddingVertical: 12, marginVertical: Spacing.three },
  flatCard: { paddingHorizontal: 0, marginBottom: 0 },
  note: { marginTop: Spacing.three },
  card: { padding: Spacing.three, borderRadius: Radius.lg, gap: 8, marginBottom: Spacing.two },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
