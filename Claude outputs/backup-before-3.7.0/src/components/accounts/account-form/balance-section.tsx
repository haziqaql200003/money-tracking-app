import { Ionicons } from '@expo/vector-icons';
import { Pressable, TextInput, View } from 'react-native';

import { AmountInput } from '@/components/ui/amount-input';
import { ThemedText } from '@/components/ui/themed-text';
import { tabularNums } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { formatMoney } from '@/utils/currency';

import { styles } from './styles';

type Props = {
  isEditing: boolean;
  currentBalance: number;
  adjustTo: string;
  setAdjustTo: (v: string) => void;
  adjustZero: boolean;
  setAdjustZero: (update: boolean | ((v: boolean) => boolean)) => void;
  adjustTarget: number | null;
  adjustDelta: number;
  adjustNote: string;
  setAdjustNote: (v: string) => void;
  adjustmentCount: number;
  onOpenHistory: () => void;
  initialBalance: string;
  setInitialBalance: (v: string) => void;
};

/** "Balance": the starting balance for a new account, or the balance correction (with note and history) when editing. */
export function BalanceSection({
  isEditing,
  currentBalance,
  adjustTo,
  setAdjustTo,
  adjustZero,
  setAdjustZero,
  adjustTarget,
  adjustDelta,
  adjustNote,
  setAdjustNote,
  adjustmentCount,
  onOpenHistory,
  initialBalance,
  setInitialBalance,
}: Props) {
  const { t } = useT();
  const colors = useTheme();

  return (
    <>
      <ThemedText type="smallBold" style={[styles.section, { color: colors.textSecondary }]}>
        {t('acct.add.secBalance')}
      </ThemedText>
      {isEditing ? (
        <>
          <View style={[styles.balanceRow, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {t('acct.add.currentBalance')}
            </ThemedText>
            <ThemedText type="smallBold" style={tabularNums}>
              {formatMoney(currentBalance)}
            </ThemedText>
          </View>
          <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            {t('acct.add.adjustLabel')}
          </ThemedText>
          <AmountInput
            value={adjustTo}
            onChange={(v) => {
              setAdjustZero(false);
              setAdjustTo(v);
            }}
            style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
            placeholderTextColor={colors.textSecondary}
          />
          {currentBalance !== 0 ? (
            <Pressable onPress={() => { setAdjustTo(''); setAdjustZero((v) => !v); }} hitSlop={8} style={styles.zeroLink}>
              <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                {adjustZero ? t('common.cancel') : t('acct.add.adjustZero')}
              </ThemedText>
            </Pressable>
          ) : null}
          <ThemedText type="small" style={[styles.helper, { color: colors.textSecondary, textAlign: 'left' }]}>
            {adjustTarget === null
              ? t('acct.add.adjustHint')
              : adjustDelta === 0
                ? t('acct.add.adjustNone')
                : t('acct.add.adjustPreview', {
                    amount: formatMoney(adjustDelta, { signed: true, type: adjustDelta > 0 ? 'credit' : 'debit' }),
                  })}
          </ThemedText>
          <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            {t('acct.adj.note')}
          </ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
            placeholder={t('acct.adj.notePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={adjustNote}
            onChangeText={setAdjustNote}
            maxLength={80}
          />
          {adjustmentCount > 0 ? (
            <Pressable onPress={() => onOpenHistory()} style={[styles.historyLink, { backgroundColor: colors.backgroundElement }]} accessibilityRole="button">
              <ThemedText type="small" style={{ flex: 1 }}>
                {t('acct.adj.historyLink', { count: adjustmentCount })}
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </>
      ) : (
        <>
          <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 0 }]}>
            {t('acct.add.startBalance')}
          </ThemedText>
          <AmountInput
            value={initialBalance}
            onChange={setInitialBalance}
            style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
            placeholderTextColor={colors.textSecondary}
          />
        </>
      )}
    </>
  );
}
