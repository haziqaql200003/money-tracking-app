import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountPicker, DebtInput, FieldLabel, toNumber } from '@/components/debt-ui';
import { DateField } from '@/components/date-field';
import { SheetHeader } from '@/components/sheet-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { FALLBACK_EXPENSE_ID } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { useDebts } from '@/context/DebtsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { categoryName } from '@/i18n/data';
import { formatDate } from '@/i18n/format';
import { addMonths, buildSchedule, installmentTotalFee, instalmentAmount, round2, suggestedLoanPayment, totalToRepayOf, type DebtKind, type FeeMode, type RateType } from '@/utils/debts';
import { formatMoney } from '@/utils/currency';
import { toDateKey } from '@/utils/dates';

const PROVIDERS: Record<DebtKind, string[]> = {
  installment: ['SPayLater', 'Atome', 'Grab PayLater', 'TikTok PayLater'], // i18n-ignore: brand names
  loan: ['SLoan', 'TikTok Financing', 'Bank', 'Car loan'], // i18n-ignore: brand names
  credit: ['SPayLater', 'Grab PayLater', 'TikTok PayLater', 'Atome'], // i18n-ignore: brand names
};
const MONTH_CHOICES = [3, 6, 12, 24, 36, 60];

type Props = { visible: boolean; onClose: () => void };

export function DebtFormModal({ visible, onClose }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <ThemedView style={[styles.box, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />
          <SheetHeader
            title={t('debt.form.title')}
            left={
              <Pressable onPress={onClose} hitSlop={12}>
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                  {t('common.cancel')}
                </ThemedText>
              </Pressable>
            }
          />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {visible ? <DebtForm onDone={onClose} /> : null}
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DebtForm({ onDone }: { onDone: () => void }) {
  const colors = useTheme();
  const { t } = useT();
  const { hideAmounts } = usePrivacy();
  const { selectableAccounts } = useTransactions();
  const { expenseCategories } = useCategories();
  const { createInstalment, createLoan, createCredit } = useDebts();

  const today = toDateKey(new Date());
  const firstAccount = selectableAccounts[0]?.id ?? '';
  const [kind, setKind] = useState<DebtKind>('installment');
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [amount, setAmount] = useState('');
  const [months, setMonths] = useState('6');
  const [fee, setFee] = useState('');
  const [feeMode, setFeeMode] = useState<FeeMode>('pctMonth');
  const [rate, setRate] = useState('');
  const [rateType, setRateType] = useState<RateType>('flat');
  const [payment, setPayment] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [firstDueEdited, setFirstDueEdited] = useState<string | null>(null);
  const [receiveId, setReceiveId] = useState(firstAccount);
  const [payFromId, setPayFromId] = useState(firstAccount);
  const [categoryId, setCategoryId] = useState(FALLBACK_EXPENSE_ID);
  const [existing, setExisting] = useState(false);
  const [paidCount, setPaidCount] = useState('1');
  const [upfrontFee, setUpfrontFee] = useState('');
  const [limit, setLimit] = useState('');
  const [used, setUsed] = useState('');
  const [dueDay, setDueDay] = useState('');

  const firstDue = firstDueEdited ?? addMonths(startDate, 1);
  const money = (n: number) => (hideAmounts ? 'RM ••••' : formatMoney(n)); // i18n-ignore
  const amountN = toNumber(amount);
  const monthsN = Math.round(toNumber(months));
  const feeN = Number.isFinite(toNumber(fee)) ? Math.max(0, toNumber(fee)) : 0;
  const totalFeeN = installmentTotalFee(amountN, monthsN, feeMode, feeN);
  const rateN = Number.isFinite(toNumber(rate)) ? Math.max(0, toNumber(rate)) : 0;
  const paymentN = toNumber(payment);
  const paidN = existing ? Math.max(0, Math.round(toNumber(paidCount)) || 0) : 0;
  const upfrontN = Number.isFinite(toNumber(upfrontFee)) ? Math.max(0, toNumber(upfrontFee)) : 0;
  const limitN = toNumber(limit);
  const usedN = Number.isFinite(toNumber(used)) ? Math.max(0, toNumber(used)) : 0;
  const dueDayN = Math.round(toNumber(dueDay));

  const planValid = Number.isFinite(amountN) && amountN > 0 && monthsN >= 1 && monthsN <= 120;
  const schedule = !planValid || kind === 'credit'
    ? []
    : kind === 'installment'
      ? buildSchedule({ kind: 'installment', principal: amountN, months: monthsN, firstDue, totalFee: totalFeeN })
      : buildSchedule({ kind: 'loan', principal: amountN, months: monthsN, firstDue, ratePct: rateN, rateType, monthlyPayment: Number.isFinite(paymentN) && paymentN > 0 ? paymentN : undefined });
  const suggested = kind === 'loan' && planValid ? suggestedLoanPayment(amountN, monthsN, rateN, rateType) : 0;
  const totalExtra = round2(schedule.reduce((s, i) => s + i.interest, 0));
  const lastDue = schedule.length ? schedule[schedule.length - 1].dueDate : null;
  const existingOk = !existing || (paidN >= 1 && paidN < monthsN);

  const hasName = name.trim().length > 0;
  const valid =
    hasName &&
    firstAccount !== '' &&
    (kind === 'credit' ? Number.isFinite(limitN) && limitN > 0 && (!dueDay || (dueDayN >= 1 && dueDayN <= 28)) : planValid && existingOk);

  function save() {
    if (!valid) return;
    const base = { name: name.trim(), provider: provider.trim() };
    if (kind === 'installment') {
      createInstalment({ ...base, principal: round2(amountN), months: monthsN, totalFee: totalFeeN, startDate, firstDue, payFromAccountId: payFromId, categoryId, subcategory: '', paidCount: paidN });
    } else if (kind === 'loan') {
      createLoan({
        ...base, principal: round2(amountN), months: monthsN, ratePct: rateN, rateType,
        monthlyPayment: Number.isFinite(paymentN) && paymentN > 0 ? paymentN : undefined,
        startDate, firstDue, receiveAccountId: receiveId, payFromAccountId: payFromId, upfrontFee: upfrontN, paidCount: paidN,
      });
    } else {
      createCredit({ ...base, limit: round2(limitN), used: usedN, dueDay: dueDay ? dueDayN : undefined, payFromAccountId: payFromId });
    }
    onDone();
  }

  const dateLabel = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return formatDate(new Date(y, m - 1, d));
  };

  return (
    <View>
      <View style={styles.chips}>
        <Chip label={t('debt.kind.installment')} active={kind === 'installment'} onPress={() => setKind('installment')} />
        <Chip label={t('debt.kind.loan')} active={kind === 'loan'} onPress={() => setKind('loan')} />
        <Chip label={t('debt.kind.credit')} active={kind === 'credit'} onPress={() => setKind('credit')} />
      </View>
      <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: Spacing.two }}>
        {t(`debt.kind.${kind}Help`)}
      </ThemedText>

      <FieldLabel text={kind === 'installment' ? t('debt.form.whatBought') : t('debt.form.nameLabel')} />
      <DebtInput value={name} onChangeText={setName} placeholder={t(`debt.form.namePlaceholder.${kind}`)} maxLength={40} />

      <FieldLabel text={t('debt.form.provider')} />
      <DebtInput value={provider} onChangeText={setProvider} placeholder={t('debt.form.providerPlaceholder')} maxLength={30} />
      <View style={[styles.chips, { marginTop: Spacing.two }]}>
        {PROVIDERS[kind].map((p) => (
          <Chip key={p} label={p} active={provider === p} onPress={() => setProvider(p)} />
        ))}
      </View>

      {kind === 'credit' ? (
        <>
          <FieldLabel text={t('debt.form.limit')} />
          <DebtInput value={limit} onChangeText={setLimit} keyboardType="decimal-pad" placeholder="0.00" />
          <FieldLabel text={t('debt.form.used')} hint={t('debt.form.usedHint')} />
          <DebtInput value={used} onChangeText={setUsed} keyboardType="decimal-pad" placeholder="0.00" />
          <FieldLabel text={t('debt.form.dueDay')} hint={t('debt.form.dueDayHint')} />
          <DebtInput value={dueDay} onChangeText={setDueDay} keyboardType="number-pad" placeholder="15" maxLength={2} />
          <FieldLabel text={t('debt.form.payFrom')} />
          <AccountPicker accounts={selectableAccounts} value={payFromId} onChange={setPayFromId} />
        </>
      ) : (
        <>
          <FieldLabel text={kind === 'installment' ? t('debt.form.price') : t('debt.form.borrowed')} />
          <DebtInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />

          <FieldLabel text={t('debt.form.months')} />
          <View style={styles.chips}>
            {MONTH_CHOICES.map((m) => (
              <Chip key={m} label={String(m)} active={monthsN === m} onPress={() => setMonths(String(m))} />
            ))}
          </View>
          <DebtInput value={months} onChangeText={setMonths} keyboardType="number-pad" maxLength={3} style={{ marginTop: Spacing.two }} />

          {kind === 'installment' ? (
            <>
              <FieldLabel text={t('debt.form.interest')} hint={t('debt.form.interestHint')} />
              <DebtInput value={fee} onChangeText={setFee} keyboardType="decimal-pad" placeholder="0" />
              <View style={[styles.chips, { marginTop: Spacing.two }]}>
                <Chip label={t('debt.feeMode.pctMonth')} active={feeMode === 'pctMonth'} onPress={() => setFeeMode('pctMonth')} />
                <Chip label={t('debt.feeMode.pctTotal')} active={feeMode === 'pctTotal'} onPress={() => setFeeMode('pctTotal')} />
                <Chip label={t('debt.feeMode.rmMonth')} active={feeMode === 'rmMonth'} onPress={() => setFeeMode('rmMonth')} />
              </View>
            </>
          ) : (
            <>
              <FieldLabel text={t('debt.form.rate')} />
              <DebtInput value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="0" />
              <View style={[styles.chips, { marginTop: Spacing.two }]}>
                <Chip label={t('debt.rate.flat')} active={rateType === 'flat'} onPress={() => setRateType('flat')} />
                <Chip label={t('debt.rate.reducing')} active={rateType === 'reducing'} onPress={() => setRateType('reducing')} />
              </View>
              <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: Spacing.one }}>
                {t(`debt.rate.${rateType}Help`)}
              </ThemedText>
              <FieldLabel text={t('debt.form.lenderPayment')} hint={suggested > 0 ? t('debt.form.lenderPaymentHint', { amount: money(suggested) }) : undefined} />
              <DebtInput value={payment} onChangeText={setPayment} keyboardType="decimal-pad" placeholder={suggested > 0 ? String(suggested) : '0.00'} />
              <FieldLabel text={t('debt.form.upfrontFee')} hint={t('debt.form.upfrontFeeHint')} />
              <DebtInput value={upfrontFee} onChangeText={setUpfrontFee} keyboardType="decimal-pad" placeholder="0.00" />
            </>
          )}

          <FieldLabel text={kind === 'installment' ? t('debt.form.boughtOn') : t('debt.form.receivedOn')} />
          <DateField value={startDate} onChange={setStartDate} />
          <FieldLabel text={t('debt.form.firstDue')} />
          <DateField value={firstDue} onChange={setFirstDueEdited} />

          {kind === 'loan' ? (
            <>
              <FieldLabel text={t('debt.form.receiveInto')} />
              <AccountPicker accounts={selectableAccounts} value={receiveId} onChange={setReceiveId} />
            </>
          ) : (
            <>
              <FieldLabel text={t('debt.form.category')} />
              <View style={styles.chips}>
                {expenseCategories.map((c) => (
                  <Chip key={c.id} label={categoryName(c)} active={c.id === categoryId} onPress={() => setCategoryId(c.id)} />
                ))}
              </View>
            </>
          )}
          <FieldLabel text={t('debt.form.payFrom')} />
          <AccountPicker accounts={selectableAccounts} value={payFromId} onChange={setPayFromId} />

          <View style={[styles.switchRow, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.flex}>
              <ThemedText>{t('debt.form.existing')}</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {t('debt.form.existingSub')}
              </ThemedText>
            </View>
            <Switch value={existing} onValueChange={setExisting} trackColor={{ true: colors.accent }} />
          </View>
          {existing ? (
            <>
              <FieldLabel text={t('debt.form.paidCount')} />
              <DebtInput value={paidCount} onChangeText={setPaidCount} keyboardType="number-pad" maxLength={3} />
              {!existingOk ? (
                <ThemedText type="small" style={{ color: colors.negative, marginTop: Spacing.one }}>
                  {t('debt.form.paidCountBad', { months: monthsN || 0 })}
                </ThemedText>
              ) : null}
            </>
          ) : null}

          {schedule.length > 0 ? (
            <View style={[styles.preview, { backgroundColor: colors.accentSoft }]}>
              <ThemedText type="smallBold">{t('debt.form.preview')}</ThemedText>
              <ThemedText type="small">{t('debt.form.previewMonthly', { amount: money(instalmentAmount(schedule[0])), months: schedule.length })}</ThemedText>
              <ThemedText type="small">
                {t(kind === 'loan' ? 'debt.form.previewInterest' : 'debt.form.previewFees', { amount: money(totalExtra) })}
              </ThemedText>
              <ThemedText type="small">{t('debt.form.previewTotal', { amount: money(totalToRepayOf(schedule)) })}</ThemedText>
              {lastDue ? <ThemedText type="small">{t('debt.form.previewLast', { date: dateLabel(lastDue) })}</ThemedText> : null}
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {t(kind === 'loan' ? 'debt.form.accountingLoan' : 'debt.form.accountingInstalment')}
              </ThemedText>
            </View>
          ) : null}
        </>
      )}

      <Pressable style={[styles.saveButton, { backgroundColor: valid ? colors.accent : colors.backgroundSelected }]} onPress={save} disabled={!valid}>
        <ThemedText style={[styles.saveText, !valid && { color: colors.textSecondary }]}>{t('debt.form.save')}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  box: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '94%' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  flex: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.three, borderRadius: 14, marginTop: Spacing.three },
  preview: { padding: Spacing.three, borderRadius: 14, marginTop: Spacing.three, gap: 4 },
  saveButton: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: Spacing.four, marginBottom: Spacing.three },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
