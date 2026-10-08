import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountPicker, DebtInput, FieldLabel, ProgressBar, toNumber } from '@/components/debt-ui';
import { DateField } from '@/components/date-field';
import { SheetHeader } from '@/components/sheet-header';
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
  progressPercent,
  remainingPrincipal,
  totalInterest,
  type Debt,
} from '@/utils/debts';

const WARN_COLOR = '#D97706';

type Props = { debt: Debt | null; onClose: () => void };

export function DebtDetailModal({ debt, onClose }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!debt} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <ThemedView style={[styles.box, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />
          <SheetHeader
            title={debt?.name ?? ''}
            left={
              <Pressable onPress={onClose} hitSlop={12}>
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                  {t('common.close')}
                </ThemedText>
              </Pressable>
            }
          />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {debt ? <DebtDetail key={debt.id} debtId={debt.id} onClose={onClose} /> : null}
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type Panel = { type: 'pay'; n: number } | { type: 'settle' } | { type: 'repay' } | { type: 'edit' } | null;

function DebtDetail({ debtId, onClose }: { debtId: string; onClose: () => void }) {
  const colors = useTheme();
  const { t } = useT();
  const { hideAmounts } = usePrivacy();
  const { debts, undoPayment, deleteDebt } = useDebts();
  const { accountBalance } = useTransactions();
  const [panel, setPanel] = useState<Panel>(null);

  const debt = debts.find((d) => d.id === debtId);
  const money = (n: number) => (hideAmounts ? 'RM ••••' : formatMoney(n)); // i18n-ignore
  const today = toDateKey(new Date());
  const dateLabel = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return formatDate(new Date(y, m - 1, d));
  };
  if (!debt) return null;

  function confirmDelete() {
    if (!debt) return;
    Alert.alert(t('debt.delete.title'), t(debt.kind === 'credit' ? 'debt.delete.bodyCredit' : 'debt.delete.body', { name: debt.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteDebt(debt.id);
          onClose();
        },
      },
    ]);
  }

  function confirmUndo(n: number) {
    Alert.alert(t('debt.undo.title'), t('debt.undo.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('debt.undo.confirm'), style: 'destructive', onPress: () => undoPayment(debtId, n) },
    ]);
  }

  /* ---------- credit line ---------- */
  if (debt.kind === 'credit') {
    const status = creditStatus(debt.creditLimit ?? 0, accountBalance(debt.accountId));
    const barColor = status.usedPercent >= 90 ? colors.negative : status.usedPercent >= 70 ? WARN_COLOR : colors.accent;
    return (
      <View>
        {debt.provider ? <ThemedText type="small" style={{ color: colors.textSecondary }}>{debt.provider}</ThemedText> : null}
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.credit.available')}</ThemedText>
          <ThemedText style={styles.big}>{money(status.available)}</ThemedText>
          <ProgressBar percent={status.usedPercent} color={barColor} />
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t('debt.credit.usedOf', { used: money(status.used), limit: money(status.limit), percent: status.usedPercent })}
          </ThemedText>
          {debt.dueDay ? (
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {t('debt.credit.nextDue', { date: dateLabel(nextCreditDue(debt.dueDay, today)) })}
            </ThemedText>
          ) : null}
        </View>
        <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: Spacing.three }}>{t('debt.credit.howTo')}</ThemedText>

        {panel?.type === 'repay' ? (
          <PayPanel key="repay" debt={debt} mode="repay" defaultAmount={status.used} onDone={() => setPanel(null)} />
        ) : panel?.type === 'edit' ? (
          <EditPanel key="edit" debt={debt} onDone={() => setPanel(null)} />
        ) : (
          <View style={styles.actions}>
            <ActionButton label={t('debt.credit.repay')} primary onPress={() => setPanel({ type: 'repay' })} disabled={status.used <= 0} />
            <ActionButton label={t('common.edit')} onPress={() => setPanel({ type: 'edit' })} />
          </View>
        )}
        <Pressable style={styles.textButton} onPress={confirmDelete}>
          <ThemedText style={{ color: colors.negative, fontWeight: '600' }}>{t('debt.delete.action')}</ThemedText>
        </Pressable>
      </View>
    );
  }

  /* ---------- instalment / loan ---------- */
  const remaining = remainingPrincipal(debt);
  const next = nextInstalment(debt);
  const paidCount = debt.schedule.filter((s) => s.paid).length;
  const settled = !!debt.settled;

  return (
    <View>
      <ThemedText type="small" style={{ color: colors.textSecondary }}>
        {[debt.provider, t(debt.kind === 'loan' ? 'debt.kind.loan' : 'debt.kind.installment')].filter(Boolean).join(' · ')}
      </ThemedText>
      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.detail.stillOwed')}</ThemedText>
        <ThemedText style={styles.big}>{money(debt.status === 'done' ? 0 : remaining)}</ThemedText>
        <ProgressBar percent={debt.status === 'done' ? 100 : progressPercent(debt)} color={colors.positive} />
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          {settled
            ? t('debt.detail.settledOn', { date: dateLabel(debt.settled!.date), amount: money(debt.settled!.amount) })
            : t('debt.detail.progress', { paid: paidCount, total: debt.schedule.length })}
        </ThemedText>
        {debt.status === 'active' && next ? (
          <ThemedText type="small" style={{ color: next.dueDate < today ? colors.negative : colors.textSecondary }}>
            {t(next.dueDate < today ? 'debt.detail.overdue' : 'debt.detail.nextDue', { date: dateLabel(next.dueDate), amount: money(instalmentAmount(next)) })}
          </ThemedText>
        ) : null}
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          {t(debt.kind === 'loan' ? 'debt.detail.totalInterest' : 'debt.detail.totalFees', { amount: money(totalInterest(debt)) })}
        </ThemedText>
      </View>

      {panel?.type === 'pay' ? (
        <PayPanel key={`pay${panel.n}`} debt={debt} mode="pay" n={panel.n} onDone={() => setPanel(null)} />
      ) : panel?.type === 'settle' ? (
        <SettlePanel key="settle" debt={debt} onDone={() => setPanel(null)} />
      ) : null}

      <ThemedText type="smallBold" style={{ marginTop: Spacing.four, marginBottom: Spacing.two }}>{t('debt.detail.schedule')}</ThemedText>
      {debt.schedule.map((s) => {
        const overdue = !s.paid && s.dueDate < today && debt.status === 'active';
        const canPay = !s.paid && debt.status === 'active';
        return (
          <Pressable
            key={s.n}
            style={[styles.row, { borderBottomColor: colors.divider }]}
            disabled={!canPay && !(s.paid && !s.paid.historic && debt.status === 'active')}
            onPress={() => (s.paid ? confirmUndo(s.n) : setPanel({ type: 'pay', n: s.n }))}
          >
            <View style={styles.flex}>
              <ThemedText>{t('debt.detail.instalmentN', { n: s.n })}</ThemedText>
              <ThemedText type="small" style={{ color: overdue ? colors.negative : colors.textSecondary }}>
                {s.paid
                  ? t(s.paid.historic ? 'debt.detail.paidBefore' : 'debt.detail.paidOn', { date: dateLabel(s.paid.date) })
                  : overdue
                    ? t('debt.detail.overdueShort', { date: dateLabel(s.dueDate) })
                    : dateLabel(s.dueDate)}
              </ThemedText>
            </View>
            <View style={styles.rowRight}>
              <ThemedText style={s.paid ? { color: colors.textSecondary, textDecorationLine: 'line-through' } : undefined}>{money(instalmentAmount(s))}</ThemedText>
              <ThemedText type="small" style={{ color: s.paid ? colors.positive : colors.accent, fontWeight: '600' }}>
                {s.paid ? t('debt.detail.paid') : canPay ? t('debt.detail.markPaid') : ''}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}

      {debt.status === 'active' ? (
        <View style={styles.actions}>
          <ActionButton label={t('debt.settle.action')} onPress={() => setPanel({ type: 'settle' })} />
        </View>
      ) : null}
      <Pressable style={styles.textButton} onPress={confirmDelete}>
        <ThemedText style={{ color: colors.negative, fontWeight: '600' }}>{t('debt.delete.action')}</ThemedText>
      </Pressable>
    </View>
  );
}

function ActionButton({ label, onPress, primary, disabled }: { label: string; onPress: () => void; primary?: boolean; disabled?: boolean }) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.action, { backgroundColor: primary && !disabled ? colors.accent : colors.backgroundElement, opacity: disabled ? 0.5 : 1 }]}
    >
      <ThemedText style={{ color: primary && !disabled ? '#fff' : colors.text, fontWeight: '700' }}>{label}</ThemedText>
    </Pressable>
  );
}

/** Marks one instalment as paid, or repays a credit line. Starts from what the schedule says; change it if the lender charged differently. */
function PayPanel(props: { debt: Debt; mode: 'pay'; n: number; onDone: () => void } | { debt: Debt; mode: 'repay'; defaultAmount: number; onDone: () => void }) {
  const colors = useTheme();
  const { t } = useT();
  const { selectableAccounts } = useTransactions();
  const { payInstalment, repayCredit } = useDebts();
  const { debt, onDone } = props;
  const inst = props.mode === 'pay' ? debt.schedule.find((s) => s.n === props.n) : undefined;
  const initial = props.mode === 'pay' ? (inst ? instalmentAmount(inst) : 0) : props.defaultAmount;
  const [amount, setAmount] = useState(String(initial));
  const [date, setDate] = useState(toDateKey(new Date()));
  const options = selectableAccounts.filter((a) => a.id !== debt.accountId);
  const [fromId, setFromId] = useState(options.find((a) => a.id === debt.payFromAccountId)?.id ?? options[0]?.id ?? '');
  const amountN = toNumber(amount);
  const valid = Number.isFinite(amountN) && amountN > 0 && fromId !== '';
  const extra = inst && valid ? Math.max(0, Math.round((amountN - inst.principal) * 100) / 100) : 0;

  function confirm() {
    if (!valid) return;
    if (props.mode === 'pay') payInstalment(debt.id, props.n, { date, amount: amountN, fromAccountId: fromId });
    else repayCredit(debt.id, { date, amount: amountN, fromAccountId: fromId });
    onDone();
  }

  return (
    <View style={[styles.panel, { borderColor: colors.accent }]}>
      <ThemedText type="smallBold">{props.mode === 'pay' ? t('debt.pay.title', { n: props.n }) : t('debt.credit.repayTitle')}</ThemedText>
      <FieldLabel text={t('debt.pay.amount')} />
      <DebtInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      {props.mode === 'pay' ? (
        <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: Spacing.one }}>
          {extra > 0 ? t('debt.pay.splitHint', { extra: formatMoney(extra) }) : t('debt.pay.noExtra')}
        </ThemedText>
      ) : null}
      <FieldLabel text={t('debt.pay.date')} />
      <DateField value={date} onChange={setDate} />
      <FieldLabel text={t('debt.pay.from')} />
      <AccountPicker accounts={options} value={fromId} onChange={setFromId} />
      <View style={styles.actions}>
        <ActionButton label={t('common.cancel')} onPress={onDone} />
        <ActionButton label={t('debt.pay.confirm')} primary disabled={!valid} onPress={confirm} />
      </View>
    </View>
  );
}

function SettlePanel({ debt, onDone }: { debt: Debt; onDone: () => void }) {
  const colors = useTheme();
  const { t } = useT();
  const { selectableAccounts } = useTransactions();
  const { settle } = useDebts();
  const remaining = remainingPrincipal(debt);
  const [extra, setExtra] = useState('');
  const [date, setDate] = useState(toDateKey(new Date()));
  const options = selectableAccounts.filter((a) => a.id !== debt.accountId);
  const [fromId, setFromId] = useState(options.find((a) => a.id === debt.payFromAccountId)?.id ?? options[0]?.id ?? '');
  const extraN = Number.isFinite(toNumber(extra)) ? Math.max(0, toNumber(extra)) : 0;
  const valid = fromId !== '';

  return (
    <View style={[styles.panel, { borderColor: colors.accent }]}>
      <ThemedText type="smallBold">{t('debt.settle.title')}</ThemedText>
      <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: Spacing.one }}>
        {t('debt.settle.body', { amount: formatMoney(remaining) })}
      </ThemedText>
      <FieldLabel text={t('debt.settle.extra')} hint={t('debt.settle.extraHint')} />
      <DebtInput value={extra} onChangeText={setExtra} keyboardType="decimal-pad" placeholder="0.00" />
      <FieldLabel text={t('debt.pay.date')} />
      <DateField value={date} onChange={setDate} />
      <FieldLabel text={t('debt.pay.from')} />
      <AccountPicker accounts={options} value={fromId} onChange={setFromId} />
      <View style={styles.actions}>
        <ActionButton label={t('common.cancel')} onPress={onDone} />
        <ActionButton
          label={t('debt.settle.confirm')}
          primary
          disabled={!valid}
          onPress={() => {
            settle(debt.id, { date, extra: extraN, fromAccountId: fromId });
            onDone();
          }}
        />
      </View>
    </View>
  );
}

function EditPanel({ debt, onDone }: { debt: Debt; onDone: () => void }) {
  const colors = useTheme();
  const { t } = useT();
  const { updateDebt } = useDebts();
  const [name, setName] = useState(debt.name);
  const [limit, setLimit] = useState(String(debt.creditLimit ?? ''));
  const [dueDay, setDueDay] = useState(debt.dueDay ? String(debt.dueDay) : '');
  const limitN = toNumber(limit);
  const dayN = Math.round(toNumber(dueDay));
  const valid = name.trim().length > 0 && Number.isFinite(limitN) && limitN > 0 && (!dueDay || (dayN >= 1 && dayN <= 28));

  return (
    <View style={[styles.panel, { borderColor: colors.accent }]}>
      <ThemedText type="smallBold">{t('debt.credit.editTitle')}</ThemedText>
      <FieldLabel text={t('debt.form.nameLabel')} />
      <DebtInput value={name} onChangeText={setName} maxLength={40} />
      <FieldLabel text={t('debt.form.limit')} />
      <DebtInput value={limit} onChangeText={setLimit} keyboardType="decimal-pad" />
      <FieldLabel text={t('debt.form.dueDay')} hint={t('debt.form.dueDayHint')} />
      <DebtInput value={dueDay} onChangeText={setDueDay} keyboardType="number-pad" maxLength={2} />
      <View style={styles.actions}>
        <ActionButton label={t('common.cancel')} onPress={onDone} />
        <ActionButton
          label={t('common.save')}
          primary
          disabled={!valid}
          onPress={() => {
            updateDebt(debt.id, { name: name.trim(), creditLimit: limitN, dueDay: dueDay ? dayN : undefined });
            onDone();
          }}
        />
      </View>
      <View style={{ height: 1, backgroundColor: colors.divider, marginTop: Spacing.three }} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  box: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '94%' },
  handle: { width: 36, height: 4, borderRadius: Radius.xs, alignSelf: 'center', marginBottom: Spacing.three },
  flex: { flex: 1 },
  card: { padding: Spacing.three, borderRadius: Radius.lg, marginTop: Spacing.two, gap: 6 },
  big: { fontSize: FontSize.largeTitle, lineHeight: 36, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowRight: { alignItems: 'flex-end' },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  action: { flex: 1, padding: 14, borderRadius: Radius.md, alignItems: 'center' },
  panel: { borderWidth: 1.5, borderRadius: Radius.lg, padding: Spacing.three, marginTop: Spacing.three },
  textButton: { padding: 14, alignItems: 'center', marginTop: Spacing.two },
});
