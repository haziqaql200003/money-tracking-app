import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, TextInput, View, useColorScheme } from 'react-native';

import { AmountInput } from '@/components/amount-input';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet } from '@/components/ui/sheet';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { accountName } from '@/i18n/data';
import { formatDate } from '@/i18n/format';
import { formatMoney } from '@/utils/currency';

type Props = { visible: boolean; onClose: () => void; accountId: string | null };

const keyToDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const dateToKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Every balance adjustment of one account, newest first. An adjustment counts as income when it adds money and as
 * spending when it takes money off, on its date. Any of them can be changed (amount, direction, date, note) or removed.
 */
export function AdjustmentsModal({ visible, onClose, accountId }: Props) {
  const { t } = useT();
  const colors = useTheme();
  const isDark = useColorScheme() === 'dark';
  const { accounts, updateAdjustment, removeAdjustment } = useTransactions();
  const account = accounts.find((a) => a.id === accountId);
  const list = [...(account?.adjustments ?? [])].sort((a, b) => (a.date === b.date ? (b.createdAt ?? 0) - (a.createdAt ?? 0) : a.date < b.date ? 1 : -1));
  const latest = list[0];

  const [selected, setSelected] = useState<string | null>(null);
  const [adds, setAdds] = useState(true);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [picking, setPicking] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [seededFor, setSeededFor] = useState<string | null>(null);

  const current = list.find((a) => a.id === selected) ?? null;

  function pick(id: string) {
    const adj = list.find((a) => a.id === id);
    if (!adj) return;
    setSelected(id);
    setAdds(adj.amount >= 0);
    setAmount(Math.abs(adj.amount).toFixed(2));
    setDate(adj.date);
    setNote(adj.note ?? '');
    setPicking(false);
  }

  // Open on the latest adjustment each time the sheet opens (once, not on every change).
  if (visible && latest && seededFor === null) {
    setSeededFor(latest.id);
    pick(latest.id);
  }
  if (!visible && seededFor !== null) {
    setSeededFor(null);
    setSelected(null);
  }

  const parsed = parseFloat(amount);
  const canSave = !!current && Number.isFinite(parsed) && parsed > 0 && !!date;

  function save() {
    if (!account || !current || !canSave) return;
    const ok = updateAdjustment(account.id, current.id, { amount: adds ? parsed : -parsed, date, note });
    if (!ok) Alert.alert(t('acct.adj.goneTitle'), t('acct.adj.goneMsg'));
    else onClose();
  }

  function remove() {
    if (!account || !current) return;
    removeAdjustment(account.id, current.id);
    onClose();
  }

  function onDateChange(event: DateTimePickerEvent, chosen?: Date) {
    if (Platform.OS === 'android') {
      setPicking(false);
      if (event.type === 'set' && chosen) setDate(dateToKey(chosen));
      return;
    }
    if (chosen) setPickerDate(chosen);
  }

  const money = (n: number) => formatMoney(n, { signed: true, type: n >= 0 ? 'credit' : 'debit' });
  const border = { borderColor: colors.divider, backgroundColor: colors.background };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('acct.adj.title')}>
      {account ? (
        <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.three, textAlign: 'center' }}>
          {accountName(account)}
        </ThemedText>
      ) : null}

      {current ? (
        <Card style={styles.block}>
          <ThemedText type="smallBold">{t('acct.adj.editTitle')}</ThemedText>
          <ThemedText type="small" style={[styles.help, { color: colors.textSecondary }]}>
            {t('acct.adj.editHelp')}
          </ThemedText>

          <View style={styles.choiceRow}>
            {[
              { value: true, label: t('acct.adj.adds'), color: colors.positive },
              { value: false, label: t('acct.adj.takes'), color: colors.negative },
            ].map((c) => {
              const active = adds === c.value;
              return (
                <Pressable
                  key={String(c.value)}
                  onPress={() => setAdds(c.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.choice, { borderColor: active ? c.color : colors.divider, backgroundColor: active ? colors.backgroundSelected : colors.background }]}
                >
                  <ThemedText type="small" style={{ color: active ? c.color : colors.textSecondary, fontWeight: '700' }}>
                    {c.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
            {t('acct.adj.amount')}
          </ThemedText>
          <AmountInput value={amount} onChange={setAmount} style={[styles.input, { color: colors.text }, border]} placeholderTextColor={colors.textSecondary} />

          <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
            {t('acct.adj.date')}
          </ThemedText>
          <Pressable
            style={[styles.input, styles.dateRow, border]}
            onPress={() => {
              setPickerDate(keyToDate(date));
              setPicking(true);
            }}
          >
            <View style={styles.dateLeft}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <ThemedText>{formatDate(keyToDate(date))}</ThemedText>
            </View>
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
              {t('tx.add.pickDate')}
            </ThemedText>
          </Pressable>
          {picking && Platform.OS === 'ios' ? (
            <View style={[styles.pickerCard, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
              <View style={styles.pickerBar}>
                <Pressable onPress={() => setPicking(false)} hitSlop={8}>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    {t('common.cancel')}
                  </ThemedText>
                </Pressable>
                <ThemedText type="smallBold">{t('tx.add.selectDate')}</ThemedText>
                <Pressable
                  onPress={() => {
                    setDate(dateToKey(pickerDate));
                    setPicking(false);
                  }}
                  hitSlop={8}
                >
                  <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
                    {t('common.done')}
                  </ThemedText>
                </Pressable>
              </View>
              <DateTimePicker value={pickerDate} mode="date" display="spinner" onChange={onDateChange} themeVariant={isDark ? 'dark' : 'light'} maximumDate={new Date()} />
            </View>
          ) : null}
          {picking && Platform.OS === 'android' ? <DateTimePicker value={keyToDate(date)} mode="date" display="default" onChange={onDateChange} maximumDate={new Date()} /> : null}

          <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
            {t('acct.adj.note')}
          </ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text }, border]}
            placeholder={t('acct.adj.notePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={note}
            onChangeText={setNote}
            maxLength={80}
          />
          <View style={styles.buttons}>
            <Button label={t('common.save')} onPress={save} disabled={!canSave} style={styles.flex} />
            <Button label={t('acct.adj.remove')} variant="danger" onPress={remove} style={styles.flex} />
          </View>
        </Card>
      ) : null}

      {list.length === 0 ? (
        <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: Spacing.four }}>
          {t('acct.adj.empty')}
        </ThemedText>
      ) : (
        <>
          <ThemedText type="small" style={[styles.listHint, { color: colors.textSecondary }]}>
            {t('acct.adj.tapHint')}
          </ThemedText>
          <Card padding={0} style={styles.block}>
            {list.map((a, i) => (
              <Pressable
                key={a.id}
                onPress={() => pick(a.id)}
                style={[
                  styles.row,
                  a.id === selected && { backgroundColor: colors.backgroundSelected },
                  i < list.length - 1 && { borderBottomColor: colors.divider, borderBottomWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <View style={styles.flex}>
                  <ThemedText numberOfLines={1}>{a.note?.trim() || t('acct.adj.rowTitle')}</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    {formatDate(keyToDate(a.date))}
                    {a.before !== undefined && a.after !== undefined ? ` · ${formatMoney(a.before)} → ${formatMoney(a.after)}` : ''}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.amount, { color: a.amount >= 0 ? colors.positive : colors.negative }]}>{money(a.amount)}</ThemedText>
              </Pressable>
            ))}
          </Card>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: Spacing.three },
  help: { marginTop: 2 },
  label: { marginTop: Spacing.three, marginBottom: Spacing.one },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: 14, fontSize: FontSize.body },
  choiceRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  choice: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerCard: { borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginTop: Spacing.two },
  pickerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  buttons: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  flex: { flex: 1 },
  listHint: { marginBottom: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: 12 },
  amount: { fontWeight: '700', ...tabularNums },
});
