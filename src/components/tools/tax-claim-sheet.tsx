import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/ui/amount-input';
import { DateField } from '@/components/ui/date-field';
import { ThemedText } from '@/components/ui/themed-text';
import { ToolSheet } from '@/components/tools/tool-sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { FormField, TextField } from '@/components/ui/form-field';
import { RELIEFS } from '@/constants/tax-relief';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useTools } from '@/context/ToolsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { Alert } from '@/services/dialog';
import { formatMoney } from '@/utils/currency';
import { toDateKey } from '@/utils/dates';
import type { TaxClaim } from '@/utils/tax-relief';

type Props = {
  visible: boolean;
  /** The claim being edited, or null to add one. */
  claim: TaxClaim | null;
  /** The relief to start with when adding. */
  reliefId: string | null;
  year: number;
  onClose: () => void;
};

/** Add or change one tax relief claim, typed in or taken from a record you already made. */
function ClaimForm({ claim, reliefId, year, onClose }: Omit<Props, 'visible'>) {
  const colors = useTheme();
  const { t } = useT();
  const { addClaim, updateClaim, deleteClaim } = useTools();
  const { transactions } = useTransactions();
  const [relief, setRelief] = useState<string | null>(claim?.reliefId ?? reliefId);
  const [amount, setAmount] = useState(claim ? String(claim.amount) : '');
  const [date, setDate] = useState(claim?.date ?? (Number(toDateKey(new Date()).slice(0, 4)) === year ? toDateKey(new Date()) : `${year}-12-31`));
  const [note, setNote] = useState(claim?.note ?? '');
  const [txId, setTxId] = useState<string | undefined>(claim?.txId);
  const [picking, setPicking] = useState(false);
  const [tried, setTried] = useState(false);

  const records = useMemo(
    () =>
      transactions
        .filter((x) => x.type === 'debit' && !x.taxReliefId && Number(x.date.slice(0, 4)) === year)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 80),
    [transactions, year],
  );

  const value = parseFloat(amount.replace(',', '.'));
  const amountOk = Number.isFinite(value) && value > 0;
  const errAmount = tried && !amountOk ? t('tax.err.amount') : undefined;
  const errRelief = tried && !relief ? t('tax.err.relief') : undefined;

  function save() {
    setTried(true);
    if (!relief || !amountOk) return;
    const body = { reliefId: relief, amount: Math.round(value * 100) / 100, date, note: note.trim() || undefined, txId };
    if (claim) updateClaim(claim.id, body);
    else addClaim(body);
    onClose();
  }

  function remove() {
    if (!claim) return;
    Alert.alert(t('tax.delete.confirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('tax.delete'),
        style: 'destructive',
        onPress: () => {
          deleteClaim(claim.id);
          onClose();
        },
      },
    ]);
  }

  return (
    <ToolSheet visible title={picking ? t('tax.pick.title') : claim ? t('tax.edit.title') : t('tax.add.title')} onClose={onClose}>
      {picking ? (
        <View style={{ gap: Spacing.two }}>
          {records.length === 0 ? <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('tax.pick.empty')}</ThemedText> : null}
          {records.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => {
                setAmount(String(r.amount));
                setDate(r.date);
                setNote(r.title);
                setTxId(r.id);
                setPicking(false);
              }}
              style={[styles.rec, { backgroundColor: colors.backgroundElement }]}
            >
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold" numberOfLines={1}>{r.title}</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>{r.date}</ThemedText>
              </View>
              <ThemedText type="smallBold">{formatMoney(r.amount)}</ThemedText>
            </Pressable>
          ))}
          <Button label={t('common.back')} variant="ghost" onPress={() => setPicking(false)} />
        </View>
      ) : (
        <>
          <FormField label={t('tax.f.relief')} error={errRelief}>
            <View style={styles.chips}>
              {RELIEFS.map((d) => (
                <Chip key={d.id} size="sm" icon={d.icon} label={t(d.nameKey)} active={relief === d.id} onPress={() => setRelief(d.id)} />
              ))}
            </View>
          </FormField>
          <FormField label={t('tax.f.amount')} error={errAmount}>
            <AmountInput
              value={amount}
              onChange={setAmount}
              style={[Type.heading, styles.amount, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: errAmount ? colors.negative : colors.divider }]}
              placeholderTextColor={colors.textSecondary}
            />
          </FormField>
          <FormField label={t('tax.f.date')}>
            <DateField value={date} onChange={setDate} maxToday />
          </FormField>
          <TextField label={t('tax.f.note')} value={note} onChangeText={setNote} maxLength={80} />
          {txId ? (
            <View style={styles.linked}>
              <Ionicons name="link-outline" size={14} color={colors.textSecondary} />
              <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('tax.linked')}</ThemedText>
            </View>
          ) : null}
          <Button label={t('tax.pick')} variant="secondary" icon="list-outline" onPress={() => setPicking(true)} />
          <Button label={t('tax.save')} onPress={save} />
          {claim ? <Button label={t('tax.delete')} variant="danger" onPress={remove} /> : null}
        </>
      )}
    </ToolSheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  amount: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: 12 },
  rec: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.three, borderRadius: Radius.md },
  linked: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});

/** Add or change one tax relief claim. The form starts fresh every time it opens. */
export function TaxClaimSheet(props: Props) {
  return props.visible ? <ClaimForm claim={props.claim} reliefId={props.reliefId} year={props.year} onClose={props.onClose} /> : null;
}
