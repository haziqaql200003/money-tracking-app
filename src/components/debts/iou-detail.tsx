import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IouModal } from '@/components/debts/iou-modal';
import { IouSheet } from '@/components/debts/iou-sheet';
import { ProgressBar } from '@/components/debts/debt-ui';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useDebts } from '@/context/DebtsContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { accountName } from '@/i18n/data';
import { formatDate } from '@/i18n/format';
import { formatMoney } from '@/utils/currency';
import { toDateKey } from '@/utils/dates';
import { iouDone, iouLeft, iouOverdue, iouPaid, type Iou, type IouRepeat } from '@/utils/ious';

const MASK = 'RM ••••'; // i18n-ignore
const REPEAT_KEY: Record<IouRepeat, TKey> = {
  none: 'debt.iou.form.repeatNone',
  weekly: 'debt.iou.form.repeatWeekly',
  monthly: 'debt.iou.form.repeatMonthly',
};

type Props = { iouId: string | null; onClose: () => void };

/**
 * The full page for one record with a person: what is left, the actions, the settings and the history.
 * Its own pay sheet and edit form open on top of it, so closing them lands back here.
 */
export function IouDetail({ iouId, onClose }: Props) {
  return (
    <Modal visible={!!iouId} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <ThemedView style={styles.flex}>{iouId ? <DetailBody key={iouId} iouId={iouId} onClose={onClose} /> : null}</ThemedView>
    </Modal>
  );
}

function DetailBody({ iouId, onClose }: { iouId: string; onClose: () => void }) {
  const colors = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { ious } = useDebts();
  const { accounts } = useTransactions();
  const { hideAmounts } = usePrivacy();
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const today = toDateKey(new Date());
  const [paying, setPaying] = useState(false);
  const [editing, setEditing] = useState(false);

  const iou: Iou | undefined = ious.find((i) => i.id === iouId);
  // Deleted from the edit form: nothing left to show.
  useEffect(() => {
    if (!iou) onClose();
  }, [iou, onClose]);
  if (!iou) return null;

  const incoming = iou.direction === 'owed';
  const done = iouDone(iou);
  const left = iouLeft(iou);
  const paid = iouPaid(iou);
  const pct = iou.amount > 0 ? Math.round((paid / iou.amount) * 100) : 0;
  const tone = done ? colors.textSecondary : incoming ? colors.positive : colors.negative;
  const overdue = iouOverdue(iou, today);
  const dateLabel = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return formatDate(new Date(y, m - 1, d));
  };

  async function remind() {
    if (!iou) return;
    try {
      await Share.share({ message: t('debt.iou.remindMsg', { person: iou.person, amount: formatMoney(left) }) });
    } catch {
      // Dismissing the share sheet needs no message.
    }
  }

  const events = [
    ...[...iou.payments].reverse().map((p, i) => ({
      key: `p${i}`,
      title: t(incoming ? 'debt.iou.detail.paymentIn' : 'debt.iou.detail.paymentOut'),
      date: p.date,
      account: accounts.find((a) => a.id === p.accountId),
      amount: p.amount,
      payment: true,
    })),
    { key: 'created', title: t(incoming ? 'debt.iou.detail.createdOwed' : 'debt.iou.detail.createdOwe'), date: iou.createdAt, account: undefined, amount: iou.amount, payment: false },
  ];

  return (
    <>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.two, paddingBottom: insets.bottom + Spacing.five }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={onClose} hitSlop={10} style={[styles.round, { backgroundColor: colors.backgroundElement }]} accessibilityRole="button" accessibilityLabel={t('common.close')}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <PersonAvatar name={iou.person} size={68} tone={done ? 'done' : incoming ? 'owed' : 'owe'} ring />
          <ThemedText style={styles.name} numberOfLines={1}>{iou.person}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t(incoming ? 'debt.iou.sheet.owedBy' : 'debt.iou.sheet.oweTo')}
          </ThemedText>
          {done ? (
            <View style={[styles.badge, { backgroundColor: `${colors.positive}22` }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.positive} />
              <ThemedText type="small" style={{ color: colors.positive, fontWeight: '800' }}>{t('debt.iou.detail.settled')}</ThemedText>
            </View>
          ) : (
            <ThemedText style={[styles.big, { color: tone }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{money(left)}</ThemedText>
          )}
          {paid > 0 || !done ? (
            <View style={styles.progress}>
              <ProgressBar percent={done ? 100 : pct} color={colors.positive} />
              <View style={styles.progressRow}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {paid > 0 ? t(incoming ? 'debt.iou.sheet.receivedLine' : 'debt.iou.sheet.paidLine', { amount: money(paid), pct }) : ''}
                </ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('debt.iou.sheet.ofTotal', { amount: money(iou.amount) })}</ThemedText>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          {!done ? <Action icon="add" label={t('debt.iou.sheet.recordPayment')} primary onPress={() => setPaying(true)} /> : null}
          {!done && incoming ? <Action icon="notifications-outline" label={t('debt.iou.sheet.remind')} onPress={remind} /> : null}
          <Action icon="create-outline" label={t('debt.iou.detail.edit')} onPress={() => setEditing(true)} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <InfoRow label={t('debt.iou.detail.dueDate')} value={iou.dueDate ? dateLabel(iou.dueDate) : t('debt.iou.detail.none')} valueColor={overdue ? colors.negative : undefined} onPress={() => setEditing(true)} />
          <InfoRow label={t('debt.iou.detail.repeat')} value={t(REPEAT_KEY[iou.repeat])} onPress={() => setEditing(true)} />
          <InfoRow label={t('debt.iou.detail.note')} value={iou.note || t('debt.iou.detail.none')} onPress={() => setEditing(true)} last />
        </View>

        <ThemedText type="smallBold" style={styles.sectionTitle}>{t('debt.iou.detail.history')}</ThemedText>
        <View style={[styles.card, { backgroundColor: colors.backgroundElement, paddingVertical: Spacing.one }]}>
          {events.map((e, i) => (
            <View key={e.key} style={[styles.event, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
              <View style={[styles.dot, { backgroundColor: e.payment ? `${colors.positive}26` : colors.backgroundSelected }]}>
                <Ionicons name={e.payment ? 'checkmark' : 'add'} size={16} color={e.payment ? colors.positive : colors.textSecondary} />
              </View>
              <View style={styles.flex}>
                <ThemedText type="smallBold">{e.title}</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {dateLabel(e.date)}
                  {e.account ? ` · ${accountName(e.account)}` : ''}
                </ThemedText>
              </View>
              <ThemedText type="smallBold" style={{ color: e.payment && incoming ? colors.positive : colors.text }}>{money(e.amount)}</ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>

      <IouSheet iouId={paying ? iou.id : null} mode="pay" onClose={() => setPaying(false)} />
      <IouModal visible={editing} editing={iou} onClose={() => setEditing(false)} />
    </>
  );
}

function Action({ icon, label, primary, onPress }: { icon: 'add' | 'notifications-outline' | 'create-outline'; label: string; primary?: boolean; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.action} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.actionCircle, { backgroundColor: primary ? colors.accent : colors.accentSoft }]}>
        <Ionicons name={icon} size={24} color={primary ? '#fff' : colors.accent} />
      </View>
      <ThemedText type="small" style={styles.actionLabel} numberOfLines={2}>{label}</ThemedText>
    </Pressable>
  );
}

function InfoRow({ label, value, valueColor, onPress, last }: { label: string; value: string; valueColor?: string; onPress: () => void; last?: boolean }) {
  const colors = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.infoRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]} accessibilityRole="button">
      <ThemedText style={styles.flex}>{label}</ThemedText>
      <ThemedText type="small" style={{ color: valueColor ?? colors.textSecondary, flexShrink: 1, fontWeight: valueColor ? '700' : '500' }} numberOfLines={1}>{value}</ThemedText>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  content: { paddingHorizontal: Spacing.four },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.two },
  round: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', gap: 4 },
  name: { fontSize: FontSize.title, fontWeight: '800', marginTop: Spacing.two },
  big: { fontSize: 38, lineHeight: 46, fontWeight: '800', ...tabularNums },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, marginTop: Spacing.two },
  progress: { alignSelf: 'stretch', gap: 4, marginTop: Spacing.two },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: Spacing.four },
  action: { flex: 1, alignItems: 'center', gap: 6 },
  actionCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontWeight: '700', textAlign: 'center' },
  card: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  sectionTitle: { marginTop: Spacing.four, marginBottom: Spacing.two },
  event: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
