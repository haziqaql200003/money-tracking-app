import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountPicker, DebtAmountInput, DebtInput, FieldLabel, toNumber } from '@/components/debts/debt-ui';
import { DateField } from '@/components/ui/date-field';
import { SheetHeader } from '@/components/ui/sheet-header';
import { DragSheet } from '@/components/ui/drag-sheet';
import { ThemedText } from '@/components/ui/themed-text';
import { Chip } from '@/components/ui/chip';
import { GlassSegmented } from '@/components/glass/glass-segmented';
import { FALLBACK_EXPENSE_ID } from '@/constants/categories';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { canRevisePlan, useDebts } from '@/context/DebtsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { categoryName } from '@/i18n/data';
import { formatDate } from '@/i18n/format';
import { addMonths, buildSchedule, installmentTotalFee, instalmentAmount, round2, suggestedLoanPayment, totalToRepayOf, type Debt, type DebtKind, type FeeMode, type RateType } from '@/utils/debts';
import { brandKey, findBrand, providerChoices } from '@/constants/brands';
import { BrandAvatar } from '@/components/ui/brand-avatar';
import { formatMoney } from '@/utils/currency';
import { toDateKey } from '@/utils/dates';

/** Quick picks, from the companies WaKira knows (constants/brands.ts), so they group and show their logo. */
const PROVIDERS: Record<DebtKind, string[]> = {
  installment: providerChoices('installment'),
  loan: [...providerChoices('loan'), 'Bank', 'Car loan'], // i18n-ignore: generic lender names
  credit: providerChoices('credit'),
};
const MONTH_CHOICES = [1, 3, 6, 12, 24, 36];

/** `editing`: an instalment plan or loan to correct. Credit lines are edited from their own sheet. */
type Props = { visible: boolean; onClose: () => void; editing?: Debt | null };

export function DebtFormModal({ visible, onClose, editing }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <DragSheet visible={visible} onClose={onClose} style={[styles.box, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />
          <SheetHeader
            title={editing ? t('debt.edit.title') : t('debt.form.title')}
            left={
              <Pressable onPress={onClose} hitSlop={12}>
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                  {t('common.cancel')}
                </ThemedText>
              </Pressable>
            }
          />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {visible ? <DebtForm key={editing?.id ?? 'new'} onDone={onClose} editing={editing ?? null} /> : null}
          </ScrollView>
        </DragSheet>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DebtForm({ onDone, editing }: { onDone: () => void; editing: Debt | null }) {
  const colors = useTheme();
  const { t } = useT();
  const { hideAmounts } = usePrivacy();
  const { selectableAccounts, transactions, transfers } = useTransactions();
  const { expenseCategories } = useCategories();
  const { debts, createInstalment, createLoan, createCredit, reviseInstalment, reviseLoan, updateDebt } = useDebts();

  const today = toDateKey(new Date());
  const firstAccount = selectableAccounts[0]?.id ?? '';
  // Editing starts from what was saved. The plan (amount, months, rate, dates) can only change while no payment was
  // recorded in WaKira; after that only the name, provider, category and pay-from account can.
  const [init] = useState(() => (editing ? formValuesOf(editing, transactions, transfers) : null));
  const locked = !!editing && !canRevisePlan(editing);
  const [kind, setKind] = useState<DebtKind>(editing?.kind ?? 'installment');
  const [name, setName] = useState(editing?.name ?? '');
  const [provider, setProvider] = useState(editing?.provider ?? '');
  const [amount, setAmount] = useState(init?.amount ?? '');
  const [months, setMonths] = useState(init?.months ?? '6');
  const [fee, setFee] = useState(init?.fee ?? '');
  const [feeMode, setFeeMode] = useState<FeeMode>(init ? 'rmMonth' : 'pctMonth');
  const [rate, setRate] = useState(init?.rate ?? '');
  const [rateType, setRateType] = useState<RateType>(editing?.rateType ?? 'flat');
  const [payment, setPayment] = useState(init?.payment ?? '');
  const [startDate, setStartDate] = useState(editing?.startDate ?? today);
  const [firstDueEdited, setFirstDueEdited] = useState<string | null>(init?.firstDue ?? null);
  const [receiveId, setReceiveId] = useState(init?.receiveId ?? firstAccount);
  const [payFromId, setPayFromId] = useState(editing?.payFromAccountId ?? firstAccount);
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? FALLBACK_EXPENSE_ID);
  const [existing, setExisting] = useState((init?.paidBefore ?? 0) > 0);
  const [paidCount, setPaidCount] = useState(init && init.paidBefore > 0 ? String(init.paidBefore) : '1');
  const [upfrontFee, setUpfrontFee] = useState(init?.upfrontFee ?? '');
  const [limit, setLimit] = useState('');
  const [used, setUsed] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [provOpen, setProvOpen] = useState(false);
  const [provTyping, setProvTyping] = useState(!!editing?.provider && !findBrand(editing.provider));
  const [monthsOther, setMonthsOther] = useState(() => !!init && !MONTH_CHOICES.includes(Number(init.months)));

  const firstDue = firstDueEdited ?? addMonths(startDate, 1);

  // The dropdown lists the companies already used (with how many open items), then the known ones for this kind.
  const keyOf = (name: string) => findBrand(name)?.id ?? brandKey(name);
  const usedProv = new Map<string, { name: string; count: number }>();
  for (const d of debts) {
    const nm = (d.provider ?? '').trim();
    if (!nm || d.id === editing?.id) continue;
    const k = keyOf(nm);
    const cur = usedProv.get(k) ?? { name: findBrand(nm)?.name ?? nm, count: 0 };
    if (d.status !== 'done') cur.count += 1;
    usedProv.set(k, cur);
  }
  const known = PROVIDERS[kind].filter((p) => !usedProv.has(keyOf(p)));
  const provKey = provider.trim() ? keyOf(provider.trim()) : '';
  const provCount = provKey ? usedProv.get(provKey)?.count ?? 0 : 0;
  const pickProvider = (p: string) => {
    setProvider(p);
    setProvTyping(false);
    setProvOpen(false);
  };
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
    (locked || (kind === 'credit' ? Number.isFinite(limitN) && limitN > 0 && (!dueDay || (dueDayN >= 1 && dueDayN <= 28)) : planValid && existingOk));

  function save() {
    if (!valid) return;
    const base = { name: name.trim(), provider: provider.trim() };
    if (editing && locked) {
      updateDebt(editing.id, { ...base, payFromAccountId: payFromId, ...(kind === 'installment' ? { categoryId } : {}) });
    } else if (editing && kind === 'installment') {
      reviseInstalment(editing.id, { ...base, principal: round2(amountN), months: monthsN, totalFee: totalFeeN, startDate, firstDue, payFromAccountId: payFromId, categoryId, subcategory: editing.subcategory ?? '', paidCount: paidN });
    } else if (editing && kind === 'loan') {
      reviseLoan(editing.id, {
        ...base, principal: round2(amountN), months: monthsN, ratePct: rateN, rateType,
        monthlyPayment: Number.isFinite(paymentN) && paymentN > 0 ? paymentN : undefined,
        startDate, firstDue, receiveAccountId: receiveId, payFromAccountId: payFromId, upfrontFee: upfrontN, paidCount: paidN,
      });
    } else if (kind === 'installment') {
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
      {editing ? (
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          {t(`debt.kind.${kind}`)}
        </ThemedText>
      ) : (
        <>
          <GlassSegmented
            options={[
              { key: 'installment' as DebtKind, label: t('debt.kind.installment') },
              { key: 'loan' as DebtKind, label: t('debt.kind.loan') },
              { key: 'credit' as DebtKind, label: t('debt.kind.credit') },
            ]}
            value={kind}
            onChange={setKind}
          />
          <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: Spacing.two }}>
            {t(`debt.kind.${kind}Help`)}
          </ThemedText>
        </>
      )}
      {locked ? (
        <View style={[styles.preview, { backgroundColor: colors.accentSoft }]}>
          <ThemedText type="small">{t('debt.edit.locked')}</ThemedText>
        </View>
      ) : editing ? (
        <View style={[styles.preview, { backgroundColor: colors.accentSoft }]}>
          <ThemedText type="small">{t('debt.edit.replan')}</ThemedText>
        </View>
      ) : null}

      <FieldLabel text={kind === 'installment' ? t('debt.form.whatBought') : t('debt.form.nameLabel')} />
      <DebtInput value={name} onChangeText={setName} placeholder={t(`debt.form.namePlaceholder.${kind}`)} maxLength={40} />

      <FieldLabel text={t('debt.form.provider')} />
      <Pressable
        onPress={() => setProvOpen((v) => !v)}
        style={[styles.provSelect, { backgroundColor: colors.backgroundElement, borderColor: provOpen ? colors.accent : colors.divider }]}
        accessibilityRole="button"
        accessibilityState={{ expanded: provOpen }}
      >
        {provider.trim() ? <BrandAvatar name={provider.trim()} size={32} /> : <Ionicons name="business-outline" size={22} color={colors.textSecondary} />}
        <ThemedText style={[styles.flex, { fontWeight: provider.trim() ? '700' : '400', color: provider.trim() ? colors.text : colors.textSecondary }]} numberOfLines={1}>
          {provider.trim() ? findBrand(provider)?.name ?? provider.trim() : t('debt.form.providerPick')}
        </ThemedText>
        {provCount > 0 ? (
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t('debt.form.providerExisting', { count: provCount })}
          </ThemedText>
        ) : null}
        <Ionicons name={provOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.accent} />
      </Pressable>
      {provOpen ? (
        <View style={[styles.provMenu, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
          {[...Array.from(usedProv.values()).map((u) => ({ name: u.name, count: u.count })), ...known.map((k) => ({ name: k, count: 0 }))].map((p) => {
            const on = provKey !== '' && keyOf(p.name) === provKey;
            return (
              <Pressable
                key={p.name}
                onPress={() => pickProvider(p.name)}
                style={({ pressed }) => [styles.provItem, on && { backgroundColor: colors.accentSoft }, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <BrandAvatar name={p.name} size={30} />
                <ThemedText style={[styles.flex, { fontWeight: '600' }]} numberOfLines={1}>{p.name}</ThemedText>
                {p.count > 0 ? (
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.form.providerExisting', { count: p.count })}</ThemedText>
                ) : null}
                {on ? <Ionicons name="checkmark" size={18} color={colors.accent} /> : null}
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => {
              setProvider('');
              setProvTyping(true);
              setProvOpen(false);
            }}
            style={({ pressed }) => [styles.provItem, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
          >
            <View style={[styles.provPlus, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="add" size={18} color={colors.accent} />
            </View>
            <ThemedText style={[styles.flex, { fontWeight: '700', color: colors.accent }]}>{t('debt.form.providerNew')}</ThemedText>
          </Pressable>
        </View>
      ) : null}
      {provTyping ? (
        <DebtInput value={provider} onChangeText={setProvider} placeholder={t('debt.form.providerPlaceholder')} maxLength={30} style={{ marginTop: Spacing.two }} />
      ) : null}

      {locked ? (
        <>
          {kind === 'installment' ? (
            <>
              <FieldLabel text={t('debt.form.category')} />
              <View style={styles.chips}>
                {expenseCategories.map((c) => (
                  <Chip key={c.id} label={categoryName(c)} active={c.id === categoryId} onPress={() => setCategoryId(c.id)} />
                ))}
              </View>
            </>
          ) : null}
          <FieldLabel text={t('debt.form.payFrom')} />
          <AccountPicker accounts={selectableAccounts} value={payFromId} onChange={setPayFromId} />
        </>
      ) : kind === 'credit' ? (
        <>
          <FieldLabel text={t('debt.form.limit')} />
          <DebtAmountInput value={limit} onChangeText={setLimit} placeholder="0.00" />
          <FieldLabel text={t('debt.form.used')} hint={t('debt.form.usedHint')} />
          <DebtAmountInput value={used} onChangeText={setUsed} placeholder="0.00" />
          <FieldLabel text={t('debt.form.dueDay')} hint={t('debt.form.dueDayHint')} />
          <DebtInput value={dueDay} onChangeText={setDueDay} keyboardType="number-pad" placeholder="15" maxLength={2} />
          <FieldLabel text={t('debt.form.payFrom')} />
          <AccountPicker accounts={selectableAccounts} value={payFromId} onChange={setPayFromId} />
        </>
      ) : (
        <>
          <FieldLabel text={kind === 'installment' ? t('debt.form.price') : t('debt.form.borrowed')} />
          <DebtAmountInput value={amount} onChangeText={setAmount} placeholder="0.00" />

          <FieldLabel text={t('debt.form.months')} />
          <View style={styles.chips}>
            {MONTH_CHOICES.map((m) => (
              <Chip
                key={m}
                label={t('debt.form.monthsN', { n: m })}
                active={!monthsOther && monthsN === m}
                onPress={() => {
                  setMonthsOther(false);
                  setMonths(String(m));
                }}
              />
            ))}
            <Chip label={t('debt.form.monthsOther')} active={monthsOther} onPress={() => setMonthsOther(true)} />
          </View>
          {monthsOther ? (
            <View style={styles.monthsRow}>
              <DebtInput
                value={months}
                onChangeText={(v) => setMonths(v.replace(/\D/g, ''))}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="18"
                style={styles.monthsInput}
                autoFocus
              />
              <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.form.monthsUnit')}</ThemedText>
            </View>
          ) : null}
          {kind === 'installment' ? (
            <ThemedText type="small" style={{ color: monthsN === 1 ? colors.accent : colors.textSecondary, fontWeight: monthsN === 1 ? '700' : '400', marginTop: Spacing.one }}>
              {monthsN === 1 ? `${t('debt.kind.bnpl')}. ` : ''}{t('debt.kind.bnplHint')}
            </ThemedText>
          ) : null}

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
              <DebtAmountInput value={payment} onChangeText={setPayment} placeholder={suggested > 0 ? String(suggested) : '0.00'} />
              <FieldLabel text={t('debt.form.upfrontFee')} hint={t('debt.form.upfrontFeeHint')} />
              <DebtAmountInput value={upfrontFee} onChangeText={setUpfrontFee} placeholder="0.00" />
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lineScroll} contentContainerStyle={styles.lineChips}>
                {expenseCategories.map((c) => (
                  <Chip key={c.id} label={categoryName(c)} active={c.id === categoryId} onPress={() => setCategoryId(c.id)} />
                ))}
              </ScrollView>
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
              <View style={styles.previewTop}>
                <ThemedText type="small" style={[styles.flex, { color: colors.textSecondary }]}>{t('debt.form.perMonth')}</ThemedText>
                <ThemedText style={styles.previewBig}>{money(instalmentAmount(schedule[0]))}</ThemedText>
              </View>
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
        <ThemedText style={[styles.saveText, !valid && { color: colors.textSecondary }]}>{editing ? t('common.save') : t('debt.form.save')}</ThemedText>
      </Pressable>
    </View>
  );
}

/** The form's starting values for a saved plan, read back from its schedule and the records it created. */
function formValuesOf(
  debt: Debt,
  transactions: { debtId?: string; subcategory: string; amount: number }[],
  transfers: { debtId?: string; fromAccountId: string; toAccountId: string }[],
) {
  const fees = round2(debt.schedule.reduce((sum, s) => sum + s.interest, 0));
  const first = debt.schedule[0];
  return {
    amount: String(debt.principal),
    months: String(debt.months),
    // Instalment fees come back as "RM a month", the one mode that is exact for any plan.
    fee: debt.kind === 'installment' && fees > 0 ? String(round2(fees / Math.max(1, debt.months))) : '',
    rate: debt.kind === 'loan' && debt.ratePct > 0 ? String(debt.ratePct) : '',
    payment: debt.kind === 'loan' && first ? String(instalmentAmount(first)) : '',
    firstDue: first?.dueDate ?? null,
    paidBefore: debt.schedule.filter((s) => s.paid?.historic).length,
    receiveId: transfers.find((x) => x.debtId === debt.id && x.fromAccountId === debt.accountId)?.toAccountId,
    upfrontFee: String(transactions.find((x) => x.debtId === debt.id && x.subcategory === 'Bank Fees')?.amount ?? ''), // i18n-ignore: stored sub-category id
  };
}

const styles = StyleSheet.create({
  provSelect: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: Spacing.three, minHeight: 52 },
  provMenu: { borderWidth: 1, borderRadius: Radius.md, marginTop: Spacing.two, padding: 6 },
  provItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 9, borderRadius: Radius.sm },
  provPlus: { width: 30, height: 30, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  monthsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
  monthsInput: { width: 110 },
  lineScroll: { marginHorizontal: -Spacing.four },
  lineChips: { paddingHorizontal: Spacing.four, gap: Spacing.two },
  previewTop: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 2 },
  previewBig: { fontSize: FontSize.title, fontWeight: '800' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  box: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '94%' },
  handle: { width: 36, height: 4, borderRadius: Radius.xs, alignSelf: 'center', marginBottom: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  flex: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.three, borderRadius: Radius.md, marginTop: Spacing.three },
  preview: { padding: Spacing.three, borderRadius: Radius.md, marginTop: Spacing.three, gap: 4 },
  saveButton: { padding: 16, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.four, marginBottom: Spacing.three },
  saveText: { color: '#fff', fontWeight: '700', fontSize: FontSize.body },
});
