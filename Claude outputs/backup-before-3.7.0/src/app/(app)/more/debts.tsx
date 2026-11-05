import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DebtDetailModal } from '@/components/debts/debt-detail-modal';
import { DebtFormModal } from '@/components/debts/debt-form-modal';
import { IouModal } from '@/components/debts/iou-modal';
import { IouDetail } from '@/components/debts/iou-detail';
import { IouSheet } from '@/components/debts/iou-sheet';
import { PeopleList } from '@/components/debts/people-list';
import { ProviderSheet } from '@/components/debts/provider-sheet';
import { BrandAvatar } from '@/components/ui/brand-avatar';
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
import { dayNumber, dueText } from '@/utils/bills';
import { toDateKey } from '@/utils/dates';
import { iouDone, type Iou } from '@/utils/ious';
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
import { endOfMonth, providerGroups, type ProviderGroup } from '@/utils/provider-groups';

const MASK = 'RM ••••'; // i18n-ignore
const WARN_COLOR = '#D97706';

type Tab = 'mine' | 'people';
type SectionId = 'done' | 'iouDone';

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
  // A person's quick pay pop-up, and their full page.
  const [iouPay, setIouPay] = useState<{ id: string } | null>(null);
  const [iouDetailId, setIouDetailId] = useState<string | null>(null);
  const [shut, setShut] = useState<Record<SectionId, boolean>>({ done: true, iouDone: true });
  const [providerKey, setProviderKey] = useState<string | null>(null);
  // Which company the list shows: 'all' (every provider card) or one provider's key.
  const [prov, setProv] = useState<string>('all');

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
  const done = sorted.filter((d) => d.kind !== 'credit' && d.status === 'done');
  // One card per company you owe (SPayLater, TikTok PayLater...), overdue ones first.
  const monthEnd = endOfMonth(today);
  const groups = providerGroups(debts, accountBalance, today, { until: monthEnd, undatedCredit: true });
  // The same total as the "Pay this month" buttons: instalments due (overdue included) and credit bills.
  const dueThisMonth = Math.round(groups.reduce((s2, g) => s2 + g.dueAmount, 0) * 100) / 100;
  const selGroup = prov === 'all' ? null : groups.find((g) => g.key === prov) ?? null;
  const opened = debts.find((d) => d.id === openId) ?? null;
  const editing = debts.find((d) => d.id === editingId) ?? null;
  const openIous = ious.filter((i) => !iouDone(i)).sort(byIouNewest);
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

  /** From the provider sheet to one debt: close the sheet first (iOS cannot show a sheet while another is closing). */
  function openDebtFromProvider(id: string) {
    setProviderKey(null);
    setTimeout(() => setOpenId(id), 400);
  }

  const providerCard = (g: ProviderGroup) => {
    const late = g.overdueCount > 0;
    const firstDue = g.due.find((it) => it.dueDate)?.dueDate ?? null;
    const days = firstDue ? dayNumber(firstDue) - dayNumber(today) : null;
    return (
      <Pressable
        key={g.key}
        onPress={() => setProviderKey(g.key)}
        style={({ pressed }) => [
          styles.provCard,
          { backgroundColor: colors.backgroundElement, borderColor: late ? colors.negative : 'transparent' },
          pressed && { opacity: 0.75 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${g.name}, ${money(g.owed)}${late ? `, ${t('debt.prov.overdueShort', { count: g.overdueCount })}` : ''}`}
      >
        <View style={styles.rowTop}>
          <BrandAvatar name={g.name} size={44} alert={late} alertColor={colors.negative} />
          <View style={styles.flex}>
            <ThemedText style={styles.provName} numberOfLines={1}>{g.name}</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
              {[t('debt.prov.items', { count: g.debts.length }), g.limit > 0 ? `${t('debt.pv.limitAvail')} ${money(g.available)}` : `${t('debt.pv.statOwed')} ${money(g.owed)}`].join(' · ')}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </View>
        {g.dueAmount > 0 ? (
          <View style={[styles.billStrip, { backgroundColor: late ? colors.negative + '14' : colors.backgroundSelected }]}>
            <View style={styles.flex}>
              <ThemedText type="small" style={{ color: late ? colors.negative : colors.textSecondary, fontWeight: late ? '700' : '500' }}>
                {late ? t('debt.pv.billOverdue') : t('debt.pv.billNow')}
              </ThemedText>
              <ThemedText type="small" style={{ color: late ? colors.negative : colors.textSecondary }} numberOfLines={1}>
                {firstDue ? t('debt.pv.dueOn', { date: dateLabel(firstDue) }) : t('debt.prov.noDueDay')}
              </ThemedText>
            </View>
            <View style={styles.billRight}>
              <ThemedText style={[styles.billAmount, { color: late ? colors.negative : colors.text }]} numberOfLines={1}>{money(g.dueAmount)}</ThemedText>
              {days !== null ? <ThemedText type="small" style={{ color: late ? colors.negative : colors.textSecondary, fontWeight: '700' }} numberOfLines={1}>{dueText(days)}</ThemedText> : null}
            </View>
          </View>
        ) : (
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {g.nextDue ? t('debt.prov.nextDue', { date: dateLabel(g.nextDue) }) : t('debt.prov.clear')}
          </ThemedText>
        )}
      </Pressable>
    );
  };

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
                    <View style={[styles.summary, { backgroundColor: colors.accent }]}>
                      <View style={styles.rowTop}>
                        <ThemedText type="small" style={[styles.flex, styles.onAccentDim]}>{t('debt.summary.totalOwed')}</ThemedText>
                        {sum.overdueCount > 0 ? (
                          <View style={styles.latePill}>
                            <ThemedText type="small" style={styles.latePillText}>{t('debt.prov.overdueShort', { count: sum.overdueCount })}</ThemedText>
                          </View>
                        ) : null}
                      </View>
                      <ThemedText style={[styles.big, styles.onAccent]} numberOfLines={1}>{money(sum.totalOwed)}</ThemedText>
                      <View style={styles.stats}>
                        <View style={[styles.statBox, styles.statOnAccent]}>
                          <ThemedText type="small" style={styles.onAccentDim}>{t('debt.summary.dueThisMonth')}</ThemedText>
                          <ThemedText type="smallBold" style={styles.onAccent}>{money(dueThisMonth)}</ThemedText>
                        </View>
                        <View style={[styles.statBox, styles.statOnAccent]}>
                          <ThemedText type="small" style={styles.onAccentDim}>{t('debt.summary.debtFree')}</ThemedText>
                          <ThemedText type="smallBold" style={styles.onAccent}>{sum.debtFreeDate ? dateLabel(sum.debtFreeDate) : t('debt.summary.none')}</ThemedText>
                        </View>
                      </View>
                    </View>

                    {/* One company at a time, or all of them */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
                      {[{ key: 'all', name: t('common.all'), late: false, group: null as ProviderGroup | null }, ...groups.map((g) => ({ key: g.key, name: g.name, late: g.overdueCount > 0, group: g as ProviderGroup | null }))].map((c) => {
                        const on = (selGroup ? selGroup.key : 'all') === c.key;
                        return (
                          <Pressable
                            key={c.key}
                            onPress={() => setProv(c.key)}
                            style={[styles.chip, { backgroundColor: on ? colors.accentSoft : colors.backgroundElement, borderColor: on ? colors.accent : colors.divider }]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: on }}
                            accessibilityLabel={c.late ? `${c.name}, ${t('debt.pv.billOverdue')}` : c.name}
                          >
                            {c.group ? (
                              <BrandAvatar name={c.name} size={26} />
                            ) : (
                              <View style={[styles.allDot, { backgroundColor: on ? colors.accent : colors.backgroundSelected }]}>
                                <Ionicons name="apps" size={13} color={on ? colors.onAccent : colors.textSecondary} />
                              </View>
                            )}
                            <ThemedText type="small" style={{ fontWeight: '700', color: on ? colors.accent : colors.text }} numberOfLines={1}>
                              {c.name}
                            </ThemedText>
                            {c.late ? <View style={[styles.lateDot, { backgroundColor: colors.negative }]} /> : null}
                          </Pressable>
                        );
                      })}
                    </ScrollView>

                    {selGroup ? (
                      <>
                        <View style={[styles.provDetail, { backgroundColor: colors.backgroundElement }]}>
                          <View style={styles.rowTop}>
                            <View style={styles.flex}>
                              <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.prov.owedAt', { name: selGroup.name })}</ThemedText>
                              <ThemedText style={styles.mid} numberOfLines={1}>{money(selGroup.owed)}</ThemedText>
                            </View>
                            <View style={styles.billRight}>
                              <ThemedText type="small" style={{ color: colors.textSecondary }}>{selGroup.limit > 0 ? t('debt.pv.limitAvail') : t('debt.prov.itemsLabel')}</ThemedText>
                              <ThemedText type="smallBold">{selGroup.limit > 0 ? money(selGroup.available) : String(selGroup.debts.filter((d) => d.status !== 'done').length)}</ThemedText>
                            </View>
                          </View>
                          {selGroup.limit > 0 ? (
                            <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
                              <View style={[styles.trackFill, { width: `${Math.min(100, Math.max(2, ((selGroup.limit - selGroup.available) / selGroup.limit) * 100))}%`, backgroundColor: colors.accent }]} />
                            </View>
                          ) : null}
                          {selGroup.dueAmount > 0 ? (() => {
                            const late = selGroup.overdueCount > 0;
                            const firstDue = selGroup.due.find((it) => it.dueDate)?.dueDate ?? null;
                            const days = firstDue ? dayNumber(firstDue) - dayNumber(today) : null;
                            return (
                              <View style={[styles.billStrip, { backgroundColor: late ? colors.negative + '14' : colors.backgroundSelected }]}>
                                <View style={styles.flex}>
                                  <ThemedText type="small" style={{ color: late ? colors.negative : colors.textSecondary, fontWeight: '700' }}>
                                    {late ? t('debt.pv.billOverdue') : t('debt.pv.billNow')}
                                  </ThemedText>
                                  <ThemedText type="small" style={{ color: late ? colors.negative : colors.textSecondary }} numberOfLines={1}>
                                    {firstDue ? t('debt.pv.dueOn', { date: dateLabel(firstDue) }) : t('debt.prov.noDueDay')}
                                  </ThemedText>
                                </View>
                                <View style={styles.billRight}>
                                  <ThemedText style={[styles.billAmount, { color: late ? colors.negative : colors.text }]}>{money(selGroup.dueAmount)}</ThemedText>
                                  {days !== null ? <ThemedText type="small" style={{ color: late ? colors.negative : colors.textSecondary, fontWeight: '700' }}>{dueText(days)}</ThemedText> : null}
                                </View>
                              </View>
                            );
                          })() : null}
                          <Pressable
                            onPress={() => setProviderKey(selGroup.key)}
                            style={({ pressed }) => [styles.payBtn, { backgroundColor: colors.accent }, pressed && { opacity: 0.85 }]}
                            accessibilityRole="button"
                          >
                            <ThemedText style={[styles.payBtnText, { color: colors.onAccent }]}>
                              {selGroup.dueAmount > 0 ? t('debt.prov.payAmount', { amount: money(selGroup.dueAmount) }) : t('debt.prov.allDebts', { name: selGroup.name })}
                            </ThemedText>
                          </Pressable>
                        </View>
                        <ThemedText type="small" style={[styles.secLabel, { color: colors.textSecondary }]}>
                          {t('debt.prov.items', { count: selGroup.debts.length }).toUpperCase()}
                        </ThemedText>
                        <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>{selGroup.debts.map(debtRow)}</View>
                      </>
                    ) : (
                      <>
                        <ThemedText type="small" style={[styles.sortNote, { color: colors.textSecondary }]}>{t('debt.prov.section')}</ThemedText>
                        {groups.map(providerCard)}
                      </>
                    )}
                    {selGroup ? null : section('done', t('debt.section.done'), done.length, null, done.map(debtRow))}
                  </>
                )
              ) : (
                <>
                  <PeopleList ious={ious} onOpen={(i) => setIouDetailId(i.id)} onPay={(i) => setIouPay({ id: i.id })} />
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
      <ProviderSheet groupKey={providerKey} until={monthEnd} onClose={() => setProviderKey(null)} onOpenDebt={openDebtFromProvider} />
      <DebtDetailModal debt={opened} onClose={() => setOpenId(null)} onEdit={startEdit} />
      <IouModal visible={iouForm.open} editing={editingIou} onClose={() => setIouForm({ open: false, id: null })} />
      <IouSheet iouId={iouPay?.id ?? null} mode="pay" onClose={() => setIouPay(null)} onOpenDetail={(id) => { setIouPay(null); setTimeout(() => setIouDetailId(id), 350); }} />
      <IouDetail iouId={iouDetailId} onClose={() => setIouDetailId(null)} />
    </ThemedView>
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
  summary: { padding: Spacing.three + 2, borderRadius: Radius.xl, gap: 4 },
  onAccent: { color: '#FFFFFF' },
  onAccentDim: { color: 'rgba(255,255,255,0.78)' },
  latePill: { backgroundColor: '#FBE4E1', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  latePillText: { color: '#8F1D17', fontWeight: '800' },
  statBox: { flex: 1, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  statOnAccent: { backgroundColor: 'rgba(255,255,255,0.13)' },
  chipScroll: { marginHorizontal: -Spacing.four, marginTop: Spacing.three },
  chips: { paddingHorizontal: Spacing.four, gap: Spacing.two },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 6, paddingRight: 14, minHeight: 40, borderRadius: Radius.pill, borderWidth: 1.5 },
  allDot: { width: 26, height: 26, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  lateDot: { width: 8, height: 8, borderRadius: Radius.pill },
  provDetail: { padding: Spacing.three, borderRadius: Radius.xl, gap: 12, marginTop: Spacing.three },
  track: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  trackFill: { height: 8, borderRadius: Radius.pill },
  payBtn: { borderRadius: Radius.pill, paddingVertical: 14, alignItems: 'center' },
  payBtnText: { fontWeight: '800' },
  secLabel: { fontWeight: '700', letterSpacing: 0.8, marginTop: Spacing.four, marginBottom: Spacing.two },
  big: { fontSize: FontSize.display, lineHeight: 40, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
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
  provCard: { padding: Spacing.three, borderRadius: Radius.xl, gap: 12, marginBottom: Spacing.two, borderWidth: 1.5 },
  provName: { fontSize: 17, fontWeight: '800' },
  billStrip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: 10, borderRadius: Radius.lg },
  billRight: { alignItems: 'flex-end', flexShrink: 0 },
  billAmount: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  card: { padding: Spacing.three, borderRadius: Radius.lg, gap: 8, marginBottom: Spacing.two },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
