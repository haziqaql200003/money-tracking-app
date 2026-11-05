import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountPicker, FieldLabel } from '@/components/debts/debt-ui';
import { GlassSegmented } from '@/components/glass/glass-segmented';
import { BrandAvatar } from '@/components/ui/brand-avatar';
import { DateField } from '@/components/ui/date-field';
import { DragSheet } from '@/components/ui/drag-sheet';
import { SlideToConfirm } from '@/components/ui/slide-to-confirm';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { isLightColor } from '@/constants/card-styles';
import { Radius, Spacing, tabularNums } from '@/constants/theme';
import { useDebts, type BatchItem } from '@/context/DebtsContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTransactions, type Account } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { formatDate } from '@/i18n/format';
import { dayNumber, dueText } from '@/utils/bills';
import { formatMoney } from '@/utils/currency';
import { toDateKey, monthLabel } from '@/utils/dates';
import { creditStatus, isBnpl, remainingPrincipal, round2, totalToRepay, type Debt } from '@/utils/debts';
import { groupKeyOf, lastPaymentDate, monthBills, paidHistory, paidMonths, providerGroups, type PayItem, type ProviderGroup } from '@/utils/provider-groups';

const MASK = 'RM ••••'; // i18n-ignore
const FAR = '9999-12-31';

type Props = {
  /** The group to show (from `providerGroups`), or null when closed. */
  groupKey: string | null;
  /** The pay panel covers what is due up to this date (overdue always included). */
  until: string;
  onClose: () => void;
  /** Open one debt's own details. */
  onOpenDebt?: (debtId: string) => void;
};

type Tab = 'upcoming' | 'paid' | 'purchases';

/** The order things are listed in, like Shopee: BNPL first, then instalment plans, then loans and credit lines. */
type Sec = 'bnpl' | 'installment' | 'loan' | 'credit';
const SEC_ORDER: Sec[] = ['bnpl', 'installment', 'loan', 'credit'];
const secOf = (d: Debt | undefined): Sec => (!d ? 'installment' : d.kind === 'credit' ? 'credit' : d.kind === 'loan' ? 'loan' : isBnpl(d) ? 'bnpl' : 'installment');
const secKey = (s: Sec) => (s === 'bnpl' ? 'debt.pv.secBnpl' : s === 'installment' ? 'debt.pv.secInst' : s === 'loan' ? 'debt.kind.loan' : 'debt.kind.credit');

/** Splits a list into BNPL / instalment / loan / credit groups, in that order, keeping each group's own order. */
function bySection<T>(list: T[], of: (x: T) => Sec): { sec: Sec; items: T[] }[] {
  return SEC_ORDER.map((sec) => ({ sec, items: list.filter((x) => of(x) === sec) })).filter((g) => g.items.length > 0);
}

function SecHead({ text }: { text: string }) {
  const colors = useTheme();
  return <ThemedText type="small" style={[styles.secHead, { color: colors.textSecondary }]}>{text}</ThemedText>;
}

/**
 * One company (SPayLater, TikTok PayLater...) as its own page, laid out like the company's own app:
 * the current bill and its due date up top with one button to pay it, then Upcoming bills month by month,
 * what was already paid, and the purchases behind it all. Each payment writes the same records as paying
 * it alone from the debt's own screen.
 */
export function ProviderSheet({ groupKey, until, onClose, onOpenDebt }: Props) {
  const { debts } = useDebts();
  const { accountBalance } = useTransactions();
  const today = toDateKey(new Date());
  const groups = groupKey ? providerGroups(debts, accountBalance, today, { until: FAR, undatedCredit: true }) : [];
  const full = groups.find((g) => g.key === groupKey) ?? null;
  const group = groupKey
    ? providerGroups(debts, accountBalance, today, { until, undatedCredit: true }).find((g) => g.key === groupKey) ?? null
    : null;
  return (
    <Modal visible={!!groupKey} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <ThemedView style={styles.flex}>
        {group && full ? <ProviderBody key={group.key} group={group} full={full} until={until} onClose={onClose} onOpenDebt={onOpenDebt} /> : groupKey ? <Gone onClose={onClose} /> : null}
      </ThemedView>
    </Modal>
  );
}

function ProviderBody({ group, full, until, onClose, onOpenDebt }: { group: ProviderGroup; full: ProviderGroup; until: string; onClose: () => void; onOpenDebt?: (id: string) => void }) {
  const colors = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { debts, payMany } = useDebts();
  const { selectableAccounts, accountBalance } = useTransactions();
  const { hideAmounts } = usePrivacy();
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const today = toDateKey(new Date());
  const dateLabel = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return formatDate(new Date(y, m - 1, d));
  };

  const [tab, setTab] = useState<Tab>('upcoming');
  const [paying, setPaying] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [openPaid, setOpenPaid] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Every debt with this company, finished ones too (the group itself only holds what is still running).
  const mine = debts.filter((d) => groupKeyOf(d) === group.key);
  const months = monthBills(full.due);
  const paid = paidHistory(mine);
  const paidByMonth = paidMonths(paid);
  const purchases = [...mine].sort((a, b) => b.startDate.localeCompare(a.startDate) || a.name.localeCompare(b.name));
  const lastDate = lastPaymentDate(mine);
  const byId = new Map(mine.map((d) => [d.id, d]));

  // The headline bill: what is due now (overdue included), else the next one coming.
  const hasDue = group.due.length > 0;
  const late = group.overdueCount > 0;
  const firstDue = group.due.find((it) => it.dueDate)?.dueDate ?? null;
  const headAmount = hasDue ? group.dueAmount : months[0]?.total ?? 0;
  const headDate = hasDue ? firstDue : months[0]?.dueDate ?? null;
  const headDays = headDate ? dayNumber(headDate) - dayNumber(today) : null;
  const headLabel = late ? t('debt.pv.billOverdue') : hasDue ? t('debt.pv.billNow') : t('debt.pv.billNext');

  const base = late ? colors.negative : group.brand?.color ?? colors.accent;
  const ink = isLightColor(base) ? '#1A1A1A' : '#FFFFFF';
  const soft = ink === '#FFFFFF' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)';

  if (done) return <Gone onClose={onClose} />;

  return (
    <View style={styles.flex}>
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.five }}
    >
      <View style={[styles.hero, { backgroundColor: base, paddingTop: insets.top + Spacing.three }]}>
        <View pointerEvents="none" style={[styles.decoA, { backgroundColor: ink }]} />
        <View pointerEvents="none" style={[styles.decoB, { backgroundColor: ink }]} />
        <View style={styles.heroTop}>
          <BrandAvatar name={group.name} size={38} style={{ borderWidth: 2, borderColor: ink }} />
          <ThemedText style={[styles.heroName, { color: ink }]} numberOfLines={1}>{group.name}</ThemedText>
          <Pressable onPress={onClose} hitSlop={10} style={[styles.closeBtn, { backgroundColor: soft }]} accessibilityRole="button" accessibilityLabel={t('common.close')}>
            <Ionicons name="close" size={20} color={ink} />
          </Pressable>
        </View>

        <ThemedText type="small" style={[styles.heroLabel, { color: ink }]}>{headLabel}</ThemedText>
        <ThemedText style={[styles.heroAmount, tabularNums, { color: ink }]} numberOfLines={1} adjustsFontSizeToFit>{money(headAmount)}</ThemedText>

        {headDate ? (
          <View style={styles.heroDue}>
            <ThemedText type="small" style={{ color: ink, opacity: 0.85 }}>{t('debt.pv.dueOn', { date: dateLabel(headDate) })}</ThemedText>
            {headDays !== null && (hasDue || headDays <= 7) ? (
              <View style={[styles.chip, { backgroundColor: soft }]}>
                <Ionicons name={late ? 'alert-circle' : 'time-outline'} size={14} color={ink} />
                <ThemedText type="small" style={{ color: ink, fontWeight: '700' }}>{dueText(headDays)}</ThemedText>
              </View>
            ) : null}
          </View>
        ) : null}

        {group.limit > 0 ? (
          <View style={styles.limitBox}>
            <View style={styles.limitRow}>
              <ThemedText type="small" style={{ color: ink, opacity: 0.85 }}>{t('debt.pv.limitAvail')}</ThemedText>
              <ThemedText type="smallBold" style={[tabularNums, { color: ink }]}>
                {money(group.available)} <ThemedText type="small" style={{ color: ink, opacity: 0.75 }}>{t('debt.pv.limitOf', { amount: money(group.limit) })}</ThemedText>
              </ThemedText>
            </View>
            <View style={[styles.limitTrack, { backgroundColor: soft }]}>
              <View style={[styles.limitFill, { backgroundColor: ink, width: `${Math.min(100, Math.max(0, (group.available / group.limit) * 100))}%` }]} />
            </View>
          </View>
        ) : null}

        {hasDue ? (
          <Pressable
            onPress={() => setPaying(true)}
            style={({ pressed }) => [styles.heroBtn, { backgroundColor: ink === '#FFFFFF' ? '#FFFFFF' : '#1A1A1A' }, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Ionicons name="flash" size={18} color={ink === '#FFFFFF' ? base : '#FFFFFF'} />
            <ThemedText style={[styles.heroBtnText, { color: ink === '#FFFFFF' ? base : '#FFFFFF' }]}>{t('debt.pv.payBill')}</ThemedText>
          </Pressable>
        ) : (
          <ThemedText type="small" style={{ color: ink, opacity: 0.85, marginTop: Spacing.three }}>{t('debt.pv.nothingDue')}</ThemedText>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.stats}>
          <View style={[styles.stat, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.pv.statOwed')}</ThemedText>
            <ThemedText type="smallBold" style={tabularNums}>{money(group.owed)}</ThemedText>
          </View>
          <View style={[styles.stat, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.pv.statEnd')}</ThemedText>
            <ThemedText type="smallBold">{lastDate ? dateLabel(lastDate) : '–'}</ThemedText>
          </View>
        </View>

        <View style={styles.tabs}>
          <GlassSegmented
            options={[
              { key: 'upcoming' as Tab, label: t('debt.pv.tab.upcoming') },
              { key: 'paid' as Tab, label: t('debt.pv.tab.paid') },
              { key: 'purchases' as Tab, label: t('debt.pv.tab.purchases') },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>

        {tab === 'upcoming' ? (
          months.length === 0 ? (
            <ThemedText type="small" style={[styles.empty, { color: colors.textSecondary }]}>{t('debt.pv.noUpcoming')}</ThemedText>
          ) : (
            months.map((m, i) => {
              const thisMonth = m.month <= today.slice(0, 7);
              const showHead = i === 0 || (thisMonth !== (months[i - 1].month <= today.slice(0, 7)));
              const expanded = open === m.month;
              return (
                <View key={m.month}>
                  {showHead ? <FieldLabel text={thisMonth ? t('debt.pv.thisMonth') : t('debt.pv.tab.upcoming')} /> : null}
                  <Pressable
                    onPress={() => setOpen(expanded ? null : m.month)}
                    style={({ pressed }) => [
                      styles.monthCard,
                      { backgroundColor: colors.backgroundElement, borderColor: m.overdue ? colors.negative : 'transparent' },
                      pressed && { opacity: 0.8 },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                  >
                    <View style={styles.monthTop}>
                      <View style={styles.flex}>
                        <ThemedText style={styles.monthName}>{m.month === 'none' ? t('debt.pv.noDate') : monthLabel(m.month, 'long')}</ThemedText>
                        <View style={styles.tagRow}>
                          <Tag text={m.overdue ? t('debt.pv.late') : t('debt.pv.unpaid')} color={m.overdue ? colors.negative : colors.warning} filled={m.overdue} />
                          {m.dueDate ? <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.pv.dueOn', { date: dateLabel(m.dueDate) })}</ThemedText> : null}
                        </View>
                      </View>
                      <ThemedText style={[styles.monthAmount, tabularNums, m.overdue && { color: colors.negative }]}>{money(m.total)}</ThemedText>
                      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
                    </View>
                    {expanded ? (
                      <View style={[styles.items, { borderTopColor: colors.divider }]}>
                        {bySection(m.items, (it) => secOf(byId.get(it.debtId))).map((sx) => (
                          <View key={sx.sec}>
                            <SecHead text={t(secKey(sx.sec))} />
                            {sx.items.map((it) => (
                          <Pressable
                            key={it.key}
                            onPress={onOpenDebt ? () => onOpenDebt(it.debtId) : undefined}
                            disabled={!onOpenDebt}
                            style={styles.itemLine}
                            accessibilityRole="button"
                          >
                            <View style={styles.flex}>
                              <ThemedText type="smallBold" numberOfLines={1}>
                                {it.kind === 'instalment' ? t('debt.due.instalmentTitle', { name: it.name, n: it.n ?? 0 }) : it.name}
                              </ThemedText>
                              {it.kind === 'credit' ? <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.prov.creditBill', { when: it.dueDate ? dateLabel(it.dueDate) : t('debt.prov.noDueDay') })}</ThemedText> : null}
                            </View>
                            <ThemedText type="small" style={[tabularNums, { fontWeight: '700' }, it.overdue && { color: colors.negative }]}>{money(it.amount)}</ThemedText>
                          </Pressable>
                            ))}
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </Pressable>
                </View>
              );
            })
          )
        ) : null}

        {tab === 'paid' ? (
          paidByMonth.length === 0 ? (
            <ThemedText type="small" style={[styles.empty, { color: colors.textSecondary }]}>{t('debt.pv.noPaid')}</ThemedText>
          ) : (
            paidByMonth.map((m, i) => {
              const expanded = openPaid === m.month;
              const year = m.month.slice(0, 4);
              return (
                <View key={m.month}>
                  {i === 0 || paidByMonth[i - 1].month.slice(0, 4) !== year ? <FieldLabel text={year} /> : null}
                  <Pressable
                    onPress={() => setOpenPaid(expanded ? null : m.month)}
                    style={({ pressed }) => [styles.monthCard, { backgroundColor: colors.backgroundElement, borderColor: 'transparent' }, pressed && { opacity: 0.8 }]}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                  >
                    <View style={styles.monthTop}>
                      <View style={styles.flex}>
                        <ThemedText style={styles.monthName}>{monthLabel(m.month, 'long')}</ThemedText>
                        <View style={styles.tagRow}>
                          <Tag text={t('debt.pv.tab.paid')} color={colors.positive} />
                          <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.pv.dueOn', { date: dateLabel(m.dueDate) })}</ThemedText>
                        </View>
                      </View>
                      <ThemedText style={[styles.monthAmount, tabularNums]}>{money(m.total)}</ThemedText>
                      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
                    </View>
                    {expanded ? (
                      <View style={[styles.items, { borderTopColor: colors.divider }]}>
                        {bySection(m.items, (it) => secOf(byId.get(it.debtId))).map((sx) => (
                          <View key={sx.sec}>
                            <SecHead text={t(secKey(sx.sec))} />
                            {sx.items.map((it) => (
                              <Pressable
                                key={it.key}
                                onPress={onOpenDebt ? () => onOpenDebt(it.debtId) : undefined}
                                disabled={!onOpenDebt}
                                style={styles.itemLine}
                                accessibilityRole="button"
                              >
                                <Ionicons name="checkmark-circle" size={18} color={colors.positive} />
                                <View style={styles.flex}>
                                  <ThemedText type="smallBold" numberOfLines={1}>{t('debt.due.instalmentTitle', { name: it.name, n: it.n })}</ThemedText>
                                  <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.pv.paidOn', { date: dateLabel(it.date) })}</ThemedText>
                                </View>
                                <ThemedText type="small" style={[tabularNums, { fontWeight: '700' }]}>{money(it.amount)}</ThemedText>
                              </Pressable>
                            ))}
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </Pressable>
                </View>
              );
            })
          )
        ) : null}

        {tab === 'purchases'
          ? bySection(purchases, (d) => secOf(d)).map((sx) => (
              <View key={sx.sec}>
                <SecHead text={t(secKey(sx.sec))} />
                <View style={[styles.list, { backgroundColor: colors.backgroundElement }]}>
                  {sx.items.map((d, i) => (
                    <PurchaseRow key={d.id} debt={d} first={i === 0} money={money} dateLabel={dateLabel} used={d.kind === 'credit' ? creditStatus(d.creditLimit ?? 0, accountBalance(d.accountId)).used : null} onPress={onOpenDebt ? () => onOpenDebt(d.id) : undefined} />
                  ))}
                </View>
              </View>
            ))
          : null}
      </View>
    </ScrollView>
    {paying && hasDue ? (
      <PaySheet
        group={group}
        until={until}
        money={money}
        dateLabel={dateLabel}
        byId={byId}
        options={selectableAccounts.filter((a) => !new Set(group.debts.map((d) => d.accountId)).has(a.id))}
        onClose={() => setPaying(false)}
        onPay={(items, fromAccountId, date) => {
          payMany(items, { date, fromAccountId });
          setDone(true);
          setTimeout(onClose, 700);
        }}
      />
    ) : null}
    </View>
  );
}

function PurchaseRow({ debt, first, money, dateLabel, used, onPress }: { debt: Debt; first: boolean; money: (n: number) => string; dateLabel: (iso: string) => string; used: number | null; onPress?: () => void }) {
  const colors = useTheme();
  const { t } = useT();
  const finished = debt.status === 'done';
  const amount = used !== null ? used : finished ? totalToRepay(debt) : remainingPrincipal(debt);
  const kind = t(debt.kind === 'loan' ? 'debt.kind.loan' : debt.kind === 'credit' ? 'debt.kind.credit' : isBnpl(debt) ? 'debt.kind.bnpl' : 'debt.kind.installment');
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.listRow, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
    >
      <View style={[styles.bag, { backgroundColor: colors.backgroundSelected }]}>
        <Ionicons name={debt.kind === 'credit' ? 'card-outline' : 'bag-handle-outline'} size={18} color={colors.textSecondary} />
      </View>
      <View style={styles.flex}>
        <ThemedText type="smallBold" numberOfLines={1}>{debt.name}</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
          {[kind, debt.kind === 'credit' || isBnpl(debt) ? '' : t('debt.pv.months', { count: debt.months }), t('debt.pv.boughtOn', { date: dateLabel(debt.startDate) })].filter(Boolean).join(' · ')}
        </ThemedText>
      </View>
      {finished ? <Ionicons name="checkmark-circle" size={20} color={colors.positive} /> : <ThemedText type="smallBold" style={tabularNums}>{money(amount)}</ThemedText>}
    </Pressable>
  );
}

/** A small outlined label like "Unpaid" (filled when it is a warning). */
function Tag({ text, color, filled }: { text: string; color: string; filled?: boolean }) {
  return (
    <View style={[styles.tag, { borderColor: color, backgroundColor: filled ? color : 'transparent' }]}>
      <ThemedText type="small" style={{ color: filled ? '#FFFFFF' : color, fontWeight: '700', fontSize: 11, lineHeight: 14 }}>{text}</ThemedText>
    </View>
  );
}

/**
 * The pay pop-up: a small sheet over the page. The list of what is being paid folds away (a one-line summary you can open),
 * so the account, the date and the slide are all in view without scrolling.
 */
function PaySheet({ group, until, money, dateLabel, byId, options, onClose, onPay }: {
  group: ProviderGroup;
  until: string;
  money: (n: number) => string;
  dateLabel: (iso: string) => string;
  byId: Map<string, Debt>;
  options: Account[];
  onClose: () => void;
  onPay: (items: BatchItem[], fromAccountId: string, date: string) => void;
}) {
  const colors = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const today = toDateKey(new Date());

  // The account most of these debts are normally paid from.
  const usual = (() => {
    const count = new Map<string, number>();
    for (const it of group.due) count.set(it.payFromAccountId, (count.get(it.payFromAccountId) ?? 0) + 1);
    const best = [...count.entries()].sort((a, b) => b[1] - a[1]).find(([id]) => options.some((o) => o.id === id));
    return best?.[0] ?? options[0]?.id ?? '';
  })();

  const [picked, setPicked] = useState<Set<string>>(() => new Set(group.due.map((it) => it.key)));
  // Late charges are only an estimate from a template, so they start unticked.
  const [fees, setFees] = useState<Set<string>>(() => new Set());
  const [fromId, setFromId] = useState(usual);
  const [date, setDate] = useState(today);
  const [listOpen, setListOpen] = useState(false);

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };
  const chosen = group.due.filter((it) => picked.has(it.key));
  const feeTotal = round2(chosen.reduce((s, it) => s + (fees.has(it.key) ? it.lateFee : 0), 0));
  const total = round2(chosen.reduce((s, it) => s + it.amount, 0) + feeTotal);
  const valid = chosen.length > 0 && fromId !== '';

  function pay() {
    if (!valid) return;
    const items: BatchItem[] = chosen.map((it) =>
      it.kind === 'credit'
        ? { kind: 'credit', debtId: it.debtId, amount: it.amount }
        : {
            kind: 'instalment', debtId: it.debtId, n: it.n as number, amount: it.amount,
            lateFee: fees.has(it.key) && it.lateFee > 0 ? { amount: it.lateFee, title: t('debt.prov.lateFeeTitle', { name: group.name }) } : undefined,
          },
    );
    onPay(items, fromId, date);
  }

  const itemDue = (it: PayItem) => (it.dueDate ? dueText(dayNumber(it.dueDate) - dayNumber(today)) : t('debt.prov.noDueDay'));

  return (
    <View style={styles.sheetOverlay}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
      <DragSheet visible onClose={onClose} style={[styles.sheetBox, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
        <View style={[styles.handle, { backgroundColor: colors.divider }]} />
        <View style={styles.sheetHead}>
          <View style={styles.flex}>
            <ThemedText style={styles.sheetTitle}>{t('debt.pv.payTitle')}</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.prov.dueUntil', { date: dateLabel(until) })}</ThemedText>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={[styles.sheetClose, { backgroundColor: colors.backgroundSelected }]} accessibilityRole="button" accessibilityLabel={t('common.close')}>
            <Ionicons name="close" size={18} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {group.overdueCount > 0 ? (
            <View style={[styles.alert, { backgroundColor: colors.negative + '1A', borderColor: colors.negative, marginTop: 0 }]}>
              <Ionicons name="alert-circle" size={18} color={colors.negative} />
              <View style={styles.flex}>
                <ThemedText type="smallBold" style={{ color: colors.negative }}>
                  {t('debt.prov.overdue', { count: group.overdueCount, amount: money(group.overdueAmount) })}
                </ThemedText>
                <ThemedText type="small" style={{ color: colors.negative }}>
                  {group.lateFeeTotal > 0 ? t('debt.prov.lateFeeEstimate', { amount: money(group.lateFeeTotal), name: group.name }) : t('debt.prov.payNow')}
                </ThemedText>
              </View>
            </View>
          ) : null}

          {/* One line while folded; opens into the ticked list, BNPL first and then instalments. */}
          <View style={[styles.fold, { backgroundColor: colors.backgroundElement }]}>
            <Pressable onPress={() => setListOpen((o) => !o)} style={styles.foldHead} accessibilityRole="button" accessibilityState={{ expanded: listOpen }}>
              <View style={styles.flex}>
                <ThemedText type="smallBold">{t('debt.pv.payingCount', { count: chosen.length, all: group.due.length })}</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>{listOpen ? t('debt.pv.payingHide') : t('debt.pv.payingShow')}</ThemedText>
              </View>
              <ThemedText style={[styles.foldTotal, tabularNums]}>{money(total)}</ThemedText>
              <Ionicons name={listOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
            </Pressable>
            {listOpen ? (
              <View style={[styles.foldBody, { borderTopColor: colors.divider }]}>
                {bySection(group.due, (it) => secOf(byId.get(it.debtId))).map((sx) => (
                  <View key={sx.sec}>
                    <SecHead text={t(secKey(sx.sec))} />
                    {sx.items.map((it) => {
                      const on = picked.has(it.key);
                      return (
                        <View key={it.key}>
                          <Pressable
                            onPress={() => setPicked((p) => toggle(p, it.key))}
                            style={styles.itemRow}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: on }}
                            accessibilityLabel={`${it.name}, ${itemDue(it)}, ${money(it.amount)}`}
                          >
                            <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? colors.accent : colors.textSecondary} />
                            <View style={styles.flex}>
                              <ThemedText type="smallBold" numberOfLines={1}>
                                {it.kind === 'instalment' ? t('debt.due.instalmentTitle', { name: it.name, n: it.n ?? 0 }) : it.name}
                              </ThemedText>
                              <ThemedText type="small" style={{ color: it.overdue ? colors.negative : colors.textSecondary, fontWeight: it.overdue ? '700' : '400' }}>
                                {it.kind === 'credit' ? t('debt.prov.creditBill', { when: itemDue(it) }) : itemDue(it)}
                              </ThemedText>
                            </View>
                            <ThemedText type="smallBold" style={[tabularNums, it.overdue && { color: colors.negative }]}>{money(it.amount)}</ThemedText>
                          </Pressable>
                          {it.lateFee > 0 && on ? (
                            <Pressable
                              onPress={() => setFees((f) => toggle(f, it.key))}
                              style={[styles.itemRow, styles.feeRow]}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: fees.has(it.key) }}
                            >
                              <Ionicons name={fees.has(it.key) ? 'checkbox' : 'square-outline'} size={20} color={fees.has(it.key) ? colors.negative : colors.textSecondary} />
                              <View style={styles.flex}>
                                <ThemedText type="small" style={{ fontWeight: '600' }}>{t('debt.prov.addLateFee')}</ThemedText>
                                <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.prov.lateFeeTemplate')}</ThemedText>
                              </View>
                              <ThemedText type="small" style={[tabularNums, { color: colors.negative, fontWeight: '700' }]}>{money(it.lateFee)}</ThemedText>
                            </Pressable>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <FieldLabel text={t('debt.pay.from')} />
          {options.length > 0 ? (
            <AccountPicker accounts={options} value={fromId} onChange={setFromId} />
          ) : (
            <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.due.noAccount')}</ThemedText>
          )}
          <FieldLabel text={t('debt.pay.date')} />
          <DateField value={date} onChange={setDate} />
          <View style={styles.slide}>
            <SlideToConfirm label={t('debt.prov.slidePay', { amount: money(total) })} disabled={!valid} onConfirm={pay} />
          </View>
        </ScrollView>
      </DragSheet>
    </View>
  );
}

function Gone({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  return (
    <Pressable onPress={onClose} style={styles.gone} accessibilityRole="button">
      <Ionicons name="checkmark-circle" size={56} color="#2E9E5B" />
      <ThemedText style={{ fontWeight: '700' }}>{t('debt.due.done')}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  hero: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl, overflow: 'hidden', gap: 2 },
  decoA: { position: 'absolute', right: -50, top: -40, width: 190, height: 190, borderRadius: 95, opacity: 0.07 },
  decoB: { position: 'absolute', right: 40, bottom: -70, width: 140, height: 140, borderRadius: 70, opacity: 0.06 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.three },
  heroName: { flex: 1, fontSize: 20, fontWeight: '800' },
  closeBtn: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  heroLabel: { opacity: 0.85, fontWeight: '600' },
  heroAmount: { fontSize: 42, lineHeight: 50, fontWeight: '800', letterSpacing: -1 },
  heroDue: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two, marginTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  limitBox: { marginTop: Spacing.three, gap: 6 },
  limitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  limitTrack: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' },
  limitFill: { height: 6, borderRadius: Radius.pill },
  heroBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: Radius.pill, marginTop: Spacing.three },
  heroBtnText: { fontSize: 16, fontWeight: '800' },
  body: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  stats: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, padding: Spacing.three, borderRadius: Radius.lg, gap: 2 },
  tabs: { marginVertical: Spacing.three },
  empty: { textAlign: 'center', paddingVertical: Spacing.five },
  monthCard: { padding: Spacing.three, borderRadius: Radius.lg, borderWidth: 1.5, marginBottom: Spacing.two },
  monthTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  monthName: { fontSize: 17, fontWeight: '800' },
  monthAmount: { fontSize: 17, fontWeight: '800' },
  tagRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tag: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 1 },
  items: { marginTop: Spacing.three, paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  itemLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 8 },
  list: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  bag: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  secHead: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: Spacing.three, marginBottom: Spacing.one },
  sheetOverlay: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetBox: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '88%' },
  handle: { width: 36, height: 4, borderRadius: Radius.xs, alignSelf: 'center', marginBottom: Spacing.three },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.three },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  sheetClose: { width: 32, height: 32, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  fold: { borderRadius: Radius.lg, marginTop: Spacing.two },
  foldHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three },
  foldTotal: { fontSize: 17, fontWeight: '800' },
  foldBody: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  alert: { flexDirection: 'row', gap: 8, padding: Spacing.three, borderRadius: Radius.md, borderWidth: 1, marginTop: Spacing.two },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  feeRow: { paddingTop: 0, paddingLeft: 32 },
  slide: { marginTop: Spacing.three },
  gone: { flex: 1, padding: Spacing.five, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
});
