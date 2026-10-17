import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateField } from '@/components/ui/date-field';
import { DebtAmountInput, DebtInput, FieldLabel, toNumber } from '@/components/debts/debt-ui';
import { SheetHeader } from '@/components/ui/sheet-header';
import { ThemedText } from '@/components/ui/themed-text';
import { Chip } from '@/components/ui/chip';
import { DragSheet } from '@/components/ui/drag-sheet';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useDebts } from '@/context/DebtsContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { formatDate } from '@/i18n/format';
import { formatMoney } from '@/utils/currency';
import { toDateKey } from '@/utils/dates';
import { iouLeft, iouPaid, type Iou, type IouDirection, type IouRepeat } from '@/utils/ious';
import { Alert } from '@/services/dialog';

const MASK = 'RM ••••'; // i18n-ignore

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Pass an existing record to edit it and record payments. */
  editing?: Iou | null;
};

export function IouModal({ visible, onClose, editing }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <DragSheet visible={visible} onClose={onClose} style={[styles.box, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />
          <SheetHeader
            title={editing ? t('debt.iou.form.edit') : t('debt.iou.form.new')}
            left={
              <Pressable onPress={onClose} hitSlop={12}>
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>{t('common.cancel')}</ThemedText>
              </Pressable>
            }
          />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {visible ? <IouForm key={editing?.id ?? 'new'} editing={editing ?? null} onDone={onClose} /> : null}
          </ScrollView>
        </DragSheet>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function IouForm({ editing, onDone }: { editing: Iou | null; onDone: () => void }) {
  const colors = useTheme();
  const { t } = useT();
  const { addIou, updateIou, addIouPayment, removeIouPayment, deleteIou } = useDebts();
  const { hideAmounts } = usePrivacy();
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));

  const [person, setPerson] = useState(editing?.person ?? '');
  const [direction, setDirection] = useState<IouDirection>(editing?.direction ?? 'owe');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [hasDue, setHasDue] = useState(!!editing?.dueDate);
  const [due, setDue] = useState(editing?.dueDate ?? toDateKey(new Date()));
  const [repeat, setRepeat] = useState<IouRepeat>(editing?.repeat ?? 'none');
  const [note, setNote] = useState(editing?.note ?? '');
  const [pay, setPay] = useState('');

  const amountN = toNumber(amount);
  const valid = person.trim().length > 0 && Number.isFinite(amountN) && amountN > 0;
  const payN = toNumber(pay);
  const left = editing ? iouLeft(editing) : 0;
  const payValid = !!editing && Number.isFinite(payN) && payN > 0 && payN <= left + 0.001;
  const dateLabel = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return formatDate(new Date(y, m - 1, d));
  };

  function save() {
    if (!valid) return;
    const data = {
      person: person.trim(),
      direction,
      amount: Math.round(amountN * 100) / 100,
      dueDate: hasDue ? due : undefined,
      repeat,
      note: note.trim() || undefined,
    };
    if (editing) updateIou(editing.id, data);
    else addIou(data);
    onDone();
  }

  function remove() {
    if (!editing) return;
    Alert.alert(t('debt.iou.form.deleteTitle'), t('debt.iou.form.deleteBody', { person: editing.person }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteIou(editing.id);
          onDone();
        },
      },
    ]);
  }

  return (
    <View>
      <FieldLabel text={t('debt.iou.form.who')} />
      <DebtInput value={person} onChangeText={setPerson} placeholder={t('debt.iou.form.whoPlaceholder')} maxLength={40} autoFocus={!editing} />

      <FieldLabel text={t('debt.iou.form.direction')} />
      <View style={styles.chips}>
        <Chip label={t('debt.iou.form.dirOwe')} active={direction === 'owe'} onPress={() => setDirection('owe')} />
        <Chip label={t('debt.iou.form.dirOwed')} active={direction === 'owed'} onPress={() => setDirection('owed')} />
      </View>

      <FieldLabel text={t('debt.iou.form.amount')} />
      <DebtAmountInput value={amount} onChangeText={setAmount} placeholder="0.00" />

      <View style={[styles.switchRow, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.flex}>
          <ThemedText>{t('debt.iou.form.setDue')}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.iou.form.setDueSub')}</ThemedText>
        </View>
        <Switch value={hasDue} onValueChange={setHasDue} trackColor={{ true: colors.accent }} />
      </View>
      {hasDue ? (
        <View style={styles.dateBlock}>
          <DateField value={due} onChange={setDue} />
        </View>
      ) : null}

      <FieldLabel text={t('debt.iou.form.repeat')} hint={t('debt.iou.form.repeatHint')} />
      <View style={styles.chips}>
        <Chip label={t('debt.iou.form.repeatNone')} active={repeat === 'none'} onPress={() => setRepeat('none')} />
        <Chip label={t('debt.iou.form.repeatWeekly')} active={repeat === 'weekly'} onPress={() => setRepeat('weekly')} />
        <Chip label={t('debt.iou.form.repeatMonthly')} active={repeat === 'monthly'} onPress={() => setRepeat('monthly')} />
      </View>

      <FieldLabel text={t('debt.iou.form.noteLabel')} />
      <DebtInput value={note} onChangeText={setNote} placeholder={t('debt.iou.form.notePlaceholder')} maxLength={80} />

      <ThemedText type="small" style={[styles.hint, { color: colors.textSecondary }]}>{t('debt.iou.note')}</ThemedText>

      <Pressable
        style={[styles.saveButton, { backgroundColor: valid ? colors.accent : colors.backgroundSelected }]}
        onPress={save}
        disabled={!valid}
        accessibilityRole="button"
      >
        <ThemedText style={[styles.saveText, !valid && { color: colors.textSecondary }]}>{t('debt.iou.form.save')}</ThemedText>
      </Pressable>

      {editing ? (
        <>
          <View style={[styles.payBox, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="smallBold">{t('debt.iou.form.recordPayment')}</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {t('debt.iou.paidOf', { paid: money(iouPaid(editing)), total: money(editing.amount) })} · {t('debt.iou.left', { amount: money(left) })}
            </ThemedText>
            {left > 0 ? (
              <>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.iou.form.recordPaymentSub')}</ThemedText>
                <DebtAmountInput value={pay} onChangeText={setPay} placeholder={t('debt.iou.form.paymentAmount')} />
                <View style={styles.payRow}>
                  <Pressable
                    style={[styles.smallButton, { backgroundColor: payValid ? colors.accent : colors.backgroundSelected }]}
                    disabled={!payValid}
                    onPress={() => {
                      addIouPayment(editing.id, payN);
                      setPay('');
                    }}
                    accessibilityRole="button"
                  >
                    <ThemedText style={[styles.saveText, !payValid && { color: colors.textSecondary }]}>{t('debt.iou.form.addPayment')}</ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.smallButton, { backgroundColor: colors.backgroundSelected }]}
                    onPress={() => addIouPayment(editing.id, left)}
                    accessibilityRole="button"
                  >
                    <ThemedText style={{ fontWeight: '700' }}>{t('debt.iou.form.settleAll')}</ThemedText>
                  </Pressable>
                </View>
              </>
            ) : null}
            {editing.payments.length > 0 ? (
              <View style={styles.history}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.iou.form.history')}</ThemedText>
                {editing.payments.map((p, i) => (
                  <View key={`${p.date}-${i}`} style={styles.historyRow}>
                    <ThemedText type="small" style={styles.flex}>{dateLabel(p.date)}</ThemedText>
                    <ThemedText type="smallBold">{money(p.amount)}</ThemedText>
                    <Pressable onPress={() => removeIouPayment(editing.id, i)} hitSlop={8} accessibilityRole="button">
                      <ThemedText type="small" style={{ color: colors.negative }}>{t('debt.iou.form.removePayment')}</ThemedText>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          <Pressable style={styles.textButton} onPress={remove} accessibilityRole="button">
            <ThemedText style={{ color: colors.negative, fontWeight: '600' }}>{t('debt.iou.form.delete')}</ThemedText>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  box: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  handle: { width: 36, height: 4, borderRadius: Radius.xs, alignSelf: 'center', marginBottom: Spacing.three },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.three, borderRadius: Radius.md, marginTop: Spacing.three },
  dateBlock: { marginTop: Spacing.two },
  hint: { marginTop: Spacing.three },
  saveButton: { padding: 16, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.three },
  saveText: { color: '#fff', fontWeight: '700', fontSize: FontSize.body },
  payBox: { padding: Spacing.three, borderRadius: Radius.lg, gap: 8, marginTop: Spacing.four },
  payRow: { flexDirection: 'row', gap: Spacing.two },
  smallButton: { flex: 1, padding: 12, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  history: { gap: 6, marginTop: Spacing.two },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  textButton: { padding: 14, alignItems: 'center' },
});
