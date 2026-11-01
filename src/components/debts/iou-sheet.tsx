import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountPicker, DebtAmountInput, FieldLabel, ProgressBar, toNumber } from '@/components/debts/debt-ui';
import { Chip } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { DragSheet } from '@/components/ui/drag-sheet';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { SlideToConfirm } from '@/components/ui/slide-to-confirm';
import { ThemedText } from '@/components/ui/themed-text';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useDebts } from '@/context/DebtsContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { accountName } from '@/i18n/data';
import { formatDate } from '@/i18n/format';
import { dayNumber, dueText } from '@/utils/bills';
import { formatMoney } from '@/utils/currency';
import { toDateKey } from '@/utils/dates';
import { iouDone, iouLeft, iouOverdue, iouPaid } from '@/utils/ious';

const MASK = 'RM ••••'; // i18n-ignore

type View_ = 'pay' | 'info';

type Props = {
  iouId: string | null;
  /** Which side to open on. Left out: paying when you owe or it is late, the summary otherwise. */
  mode?: View_;
  onClose: () => void;
  /** Shows the "view details" link when given. */
  onOpenDetail?: (id: string) => void;
};

/**
 * The pop-up for one record with a person, opened from Home or the People list.
 * Pay side: amount, account, slide to complete. Summary side: what is left, the history, a nudge to send.
 */
export function IouSheet({ iouId, mode, onClose, onOpenDetail }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!iouId} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <DragSheet visible={!!iouId} onClose={onClose} style={[styles.box, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />
          {/* Mounted only while open, so the fields start from this record with no reset code. */}
          {iouId ? <IouBody key={`${iouId}:${mode ?? ''}`} iouId={iouId} mode={mode} onClose={onClose} onOpenDetail={onOpenDetail} /> : null}
        </DragSheet>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function IouBody({ iouId, mode, onClose, onOpenDetail }: { iouId: string; mode?: View_; onClose: () => void; onOpenDetail?: (id: string) => void }) {
  const colors = useTheme();
  const { t } = useT();
  const { ious, addIouPayment } = useDebts();
  const { selectableAccounts, accounts } = useTransactions();
  const { hideAmounts } = usePrivacy();
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const today = toDateKey(new Date());

  const iou = ious.find((i) => i.id === iouId);
  const [view, setView] = useState<View_>(mode ?? (iou && (iou.direction === 'owe' || iouOverdue(iou, today)) ? 'pay' : 'info'));
  const [amount, setAmount] = useState(String(iou ? iouLeft(iou) : ''));
  const [date, setDate] = useState(today);
  // '' = a note only (no account moves).
  const [fromId, setFromId] = useState(selectableAccounts[0]?.id ?? '');

  // It may have been settled or removed while the sheet was open (for example from another device).
  if (!iou || iouDone(iou)) {
    return (
      <Pressable onPress={onClose} style={styles.gone} accessibilityRole="button">
        <ThemedText style={{ fontWeight: '700' }}>{iou ? t('debt.iou.detail.settled') : t('debt.iou.detail.gone')}</ThemedText>
      </Pressable>
    );
  }

  const incoming = iou.direction === 'owed';
  const left = iouLeft(iou);
  const paid = iouPaid(iou);
  const pct = iou.amount > 0 ? Math.round((paid / iou.amount) * 100) : 0;
  const amountN = toNumber(amount);
  const valid = Number.isFinite(amountN) && amountN > 0 && amountN <= left + 0.001;
  const tone = incoming ? colors.positive : colors.negative;
  const overdue = iouOverdue(iou, today);
  const dateLabel = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return formatDate(new Date(y, m - 1, d));
  };
  const half = Math.round((left / 2) * 100) / 100;
  const dueLine = iou.dueDate
    ? overdue
      ? t('debt.iou.overdueOn', { date: dateLabel(iou.dueDate) })
      : t('debt.iou.dueOn', { date: dateLabel(iou.dueDate) })
    : t('debt.iou.noDue');

  function complete() {
    if (!valid || !iou) return;
    addIouPayment(iou.id, amountN, date, fromId || undefined);
    onClose();
  }

  async function remind() {
    if (!iou) return;
    try {
      await Share.share({ message: t('debt.iou.remindMsg', { person: iou.person, amount: formatMoney(left) }) });
    } catch {
      // The share sheet failing (or being dismissed) needs no message.
    }
  }

  const head = (
    <View style={styles.head}>
      <PersonAvatar name={iou.person} size={48} tone={incoming ? 'owed' : 'owe'} />
      <View style={styles.flex}>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          {t(incoming ? 'debt.iou.sheet.owedBy' : 'debt.iou.sheet.oweTo')}
        </ThemedText>
        <ThemedText style={styles.name} numberOfLines={1}>{iou.person}</ThemedText>
      </View>
      {view === 'pay' && overdue && iou.dueDate ? (
        <View style={[styles.chip, { backgroundColor: `${colors.negative}22` }]}>
          <ThemedText type="small" style={{ color: colors.negative, fontWeight: '800' }}>{dueText(dayNumber(iou.dueDate) - dayNumber(today))}</ThemedText>
        </View>
      ) : null}
      {view === 'info' ? (
        <Pressable onPress={onClose} hitSlop={10} style={[styles.close, { backgroundColor: colors.backgroundSelected }]} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );

  if (view === 'pay') {
    return (
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {head}
        <View style={styles.center}>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>{t(incoming ? 'debt.iou.sheet.receiveTitle' : 'debt.iou.sheet.payTitle')}</ThemedText>
          <DebtAmountInput value={amount} onChangeText={setAmount} style={styles.bigInput} />
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t('debt.iou.left', { amount: money(left) })}
            {iou.note ? ` · ${iou.note}` : ''}
          </ThemedText>
        </View>
        <View style={styles.quick}>
          <Chip size="sm" label={t('debt.iou.sheet.full', { amount: money(left) })} active={Math.abs(amountN - left) < 0.005} onPress={() => setAmount(String(left))} />
          {left > 1 ? <Chip size="sm" label={t('debt.iou.sheet.half', { amount: money(half) })} active={Math.abs(amountN - half) < 0.005} onPress={() => setAmount(String(half))} /> : null}
        </View>
        <FieldLabel text={t(incoming ? 'debt.due.receiveInto' : 'debt.pay.from')} />
        <AccountPicker accounts={selectableAccounts} value={fromId} onChange={setFromId} />
        <View style={styles.noAcc}>
          <Chip size="sm" label={t('debt.iou.form.noAccount')} active={fromId === ''} onPress={() => setFromId('')} />
        </View>
        <FieldLabel text={t('debt.pay.date')} />
        <DateField value={date} onChange={setDate} />
        <View style={styles.slide}>
          <SlideToConfirm label={t(incoming ? 'debt.due.slideReceive' : 'debt.due.slidePay')} disabled={!valid} onConfirm={complete} />
        </View>
        {onOpenDetail ? (
          <Pressable onPress={() => onOpenDetail(iou.id)} style={styles.link} accessibilityRole="button">
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>{t('debt.iou.sheet.viewDetail', { person: iou.person })}</ThemedText>
          </Pressable>
        ) : null}
      </ScrollView>
    );
  }

  const history = [...iou.payments].reverse().slice(0, 3);
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {head}
      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.cardTop}>
          <ThemedText style={[styles.big, { color: tone }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{money(left)}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.iou.sheet.ofTotal', { amount: money(iou.amount) })}</ThemedText>
        </View>
        {paid > 0 ? <ProgressBar percent={pct} color={colors.positive} /> : null}
        <View style={styles.cardTop}>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {paid > 0 ? t(incoming ? 'debt.iou.sheet.receivedLine' : 'debt.iou.sheet.paidLine', { amount: money(paid), pct }) : iou.note ?? ''}
          </ThemedText>
          <ThemedText type="small" style={{ color: overdue ? colors.negative : colors.textSecondary, fontWeight: overdue ? '700' : '500' }}>{dueLine}</ThemedText>
        </View>
      </View>
      <View style={styles.buttons}>
        <Pressable style={[styles.btn, { backgroundColor: colors.accent }]} onPress={() => setView('pay')} accessibilityRole="button">
          <ThemedText style={styles.btnText}>{t('debt.iou.sheet.recordPayment')}</ThemedText>
        </Pressable>
        {incoming ? (
          <Pressable style={[styles.btn, { backgroundColor: colors.accentSoft }]} onPress={remind} accessibilityRole="button">
            <ThemedText style={[styles.btnText, { color: colors.accent }]}>{t('debt.iou.sheet.remind')}</ThemedText>
          </Pressable>
        ) : null}
      </View>
      <ThemedText type="smallBold" style={styles.sectionTitle}>{t('debt.iou.sheet.history')}</ThemedText>
      <View style={[styles.card, { backgroundColor: colors.backgroundElement, paddingVertical: Spacing.one }]}>
        {history.length === 0 ? (
          <ThemedText type="small" style={{ color: colors.textSecondary, paddingVertical: 12 }}>{t('debt.iou.sheet.noPayments')}</ThemedText>
        ) : (
          history.map((p, i) => {
            const acc = accounts.find((a) => a.id === p.accountId);
            return (
              <View key={`${p.date}-${i}`} style={[styles.histRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
                <View style={styles.flex}>
                  <ThemedText type="smallBold">{dateLabel(p.date)}</ThemedText>
                  {acc ? <ThemedText type="small" style={{ color: colors.textSecondary }}>{accountName(acc)}</ThemedText> : null}
                </View>
                <ThemedText type="smallBold" style={{ color: incoming ? colors.positive : colors.text }}>{money(p.amount)}</ThemedText>
              </View>
            );
          })
        )}
      </View>
      {onOpenDetail ? (
        <Pressable onPress={() => onOpenDetail(iou.id)} style={styles.link} accessibilityRole="button">
          <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>{t('debt.iou.sheet.openFull')}</ThemedText>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  box: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  handle: { width: 36, height: 4, borderRadius: Radius.xs, alignSelf: 'center', marginBottom: Spacing.three },
  flex: { flex: 1, minWidth: 0 },
  gone: { padding: Spacing.five, alignItems: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.three },
  name: { fontSize: FontSize.heading, fontWeight: '800' },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  close: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: 4 },
  bigInput: { fontSize: 36, fontWeight: '800', textAlign: 'center', minWidth: 220, paddingVertical: 10, ...tabularNums },
  quick: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.two, marginTop: Spacing.two },
  noAcc: { flexDirection: 'row', marginTop: Spacing.two },
  slide: { marginTop: Spacing.four, marginBottom: Spacing.two },
  link: { alignItems: 'center', paddingVertical: Spacing.three },
  card: { borderRadius: Radius.lg, padding: Spacing.three, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.two },
  big: { fontSize: 30, fontWeight: '800', flexShrink: 1, ...tabularNums },
  buttons: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  btn: { flex: 1, paddingVertical: 14, borderRadius: Radius.lg, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.label },
  sectionTitle: { marginTop: Spacing.three, marginBottom: Spacing.two },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
});
