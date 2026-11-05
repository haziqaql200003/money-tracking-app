import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountPicker, DebtAmountInput, FieldLabel, toNumber } from '@/components/debts/debt-ui';
import { DateField } from '@/components/ui/date-field';
import { DragSheet } from '@/components/ui/drag-sheet';
import { SheetHeader } from '@/components/ui/sheet-header';
import { SlideToConfirm } from '@/components/ui/slide-to-confirm';
import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useDebts } from '@/context/DebtsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { formatDate } from '@/i18n/format';
import { formatMoney } from '@/utils/currency';
import { toDateKey } from '@/utils/dates';
import { creditStatus, instalmentAmount, nextCreditDue } from '@/utils/debts';
import { iouLeft } from '@/utils/ious';

/** What the sheet is about: one instalment of a plan, the bill of a credit line (SPayLater, card), or what is left of a record with a person. */
export type DueTarget = { kind: 'instalment'; debtId: string; n: number } | { kind: 'credit'; debtId: string } | { kind: 'iou'; iouId: string };

type Props = { target: DueTarget | null; onClose: () => void; onOpenDebts: () => void };

/**
 * The pop-up on Home for something that is due: pick the account, check the amount, slide to complete.
 * It writes the same records as paying from the Debts screen.
 */
export function PayDueSheet({ target, onClose, onOpenDebts }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!target} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <DragSheet visible={!!target} onClose={onClose} style={[styles.box, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />
          {/* Mounted only while something is open, so the fields start from its values with no reset code. */}
          {target ? <DueForm key={target.kind === 'iou' ? target.iouId : target.kind === 'credit' ? `credit:${target.debtId}` : `${target.debtId}:${target.n}`} target={target} onClose={onClose} onOpenDebts={onOpenDebts} /> : null}
        </DragSheet>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DueForm({ target, onClose, onOpenDebts }: { target: DueTarget; onClose: () => void; onOpenDebts: () => void }) {
  const colors = useTheme();
  const { t } = useT();
  const { debts, ious, payInstalment, repayCredit, addIouPayment } = useDebts();
  const { selectableAccounts, accountBalance } = useTransactions();

  const debt = target.kind !== 'iou' ? debts.find((d) => d.id === target.debtId) : undefined;
  const credit = target.kind === 'credit' && debt?.kind === 'credit' ? debt : undefined;
  const used = credit ? creditStatus(credit.creditLimit ?? 0, accountBalance(credit.accountId)).used : 0;
  const inst = debt && target.kind === 'instalment' ? debt.schedule.find((s) => s.n === target.n) : undefined;
  const iou = target.kind === 'iou' ? ious.find((i) => i.id === target.iouId) : undefined;

  const options = debt ? selectableAccounts.filter((a) => a.id !== debt.accountId) : selectableAccounts;
  const [amount, setAmount] = useState(String(inst ? instalmentAmount(inst) : iou ? iouLeft(iou) : used));
  const [date, setDate] = useState(toDateKey(new Date()));
  const [fromId, setFromId] = useState(options.find((a) => a.id === debt?.payFromAccountId)?.id ?? options[0]?.id ?? '');

  // The thing may have been paid or removed while the sheet was open (for example from another device).
  const gone =
    (target.kind === 'instalment' && (!debt || !inst || !!inst.paid)) ||
    (target.kind === 'credit' && (!credit || used <= 0)) ||
    (target.kind === 'iou' && (!iou || iouLeft(iou) <= 0));
  if (gone) return <GoneNote onClose={onClose} />;

  const incoming = iou?.direction === 'owed';
  const amountN = toNumber(amount);
  const max = iou ? iouLeft(iou) : credit ? used : Infinity;
  const valid = Number.isFinite(amountN) && amountN > 0 && amountN <= max + 0.001 && fromId !== '';
  const title = debt && inst ? t('debt.due.instalmentTitle', { name: debt.name, n: inst.n }) : credit ? credit.name : iou ? iou.person : '';
  const dueDate = inst?.dueDate ?? (credit?.dueDay ? nextCreditDue(credit.dueDay, toDateKey(new Date())) : iou?.dueDate);
  const dueLabel = dueDate ? (() => { const [y, m, d] = dueDate.split('-').map(Number); return t('debt.due.dueOn', { date: formatDate(new Date(y, m - 1, d)) }); })() : '';

  function complete() {
    if (!valid) return;
    if (debt && inst) payInstalment(debt.id, inst.n, { date, amount: amountN, fromAccountId: fromId });
    else if (credit) repayCredit(credit.id, { date, amount: amountN, fromAccountId: fromId });
    else if (iou) addIouPayment(iou.id, amountN, date, fromId);
    onClose();
  }

  return (
    <>
      <SheetHeader
        title={title}
        left={
          <Pressable onPress={onClose} hitSlop={12}>
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>{t('common.cancel')}</ThemedText>
          </Pressable>
        }
        right={
          <Pressable onPress={onOpenDebts} hitSlop={12} accessibilityRole="button">
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>{t('debt.due.view')}</ThemedText>
          </Pressable>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {iou ? <ThemedText type="smallBold">{t(incoming ? 'debt.iou.theyOweLine' : 'debt.iou.youOweLine', { person: iou.person })}</ThemedText> : null}
        {dueLabel ? <ThemedText type="small" style={{ color: colors.textSecondary }}>{dueLabel}</ThemedText> : null}
        <FieldLabel text={t('debt.pay.amount')} />
        <DebtAmountInput value={amount} onChangeText={setAmount} />
        {iou || credit ? (
          <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: Spacing.one }}>
            {iou ? t('debt.iou.left', { amount: formatMoney(iouLeft(iou)) }) : t('debt.due.creditUsed', { amount: formatMoney(used) })}
          </ThemedText>
        ) : null}
        <FieldLabel text={t('debt.pay.date')} />
        <DateField value={date} onChange={setDate} />
        <FieldLabel text={t(incoming ? 'debt.due.receiveInto' : 'debt.pay.from')} />
        {options.length > 0 ? <AccountPicker accounts={options} value={fromId} onChange={setFromId} /> : <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.due.noAccount')}</ThemedText>}
        <View style={styles.slide}>
          <SlideToConfirm label={t(incoming ? 'debt.due.slideReceive' : 'debt.due.slidePay')} disabled={!valid} onConfirm={complete} />
        </View>
      </ScrollView>
    </>
  );
}

function GoneNote({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  return (
    <Pressable onPress={onClose} style={styles.gone} accessibilityRole="button">
      <ThemedText style={{ fontWeight: '700' }}>{t('debt.due.done')}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  box: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  handle: { width: 36, height: 4, borderRadius: Radius.xs, alignSelf: 'center', marginBottom: Spacing.three },
  slide: { marginTop: Spacing.four, marginBottom: Spacing.two },
  gone: { padding: Spacing.five, alignItems: 'center' },
});
