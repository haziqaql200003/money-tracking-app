import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCategories } from '@/context/CategoriesContext';
import { useTheme } from '@/hooks/use-theme';
import { getLanguage, useT, type TKey } from '@/i18n';
import { categoryName } from '@/i18n/data';
import { ScanError, scanReceipt, type ScanErrorCode, type ScanSource } from '@/services/receipt-scan';
import { Alert } from '@/services/dialog';
import { loadJSON, saveJSON, userKey } from '@/services/storage';
import { toDateString, newItemId } from './helpers';
import { receiptToPrefill, type ReceiptPrefill } from '@/utils/receipt';

const ERROR_KEY: Record<ScanErrorCode, TKey> = {
  unavailable: 'scan.errUnavailable',
  permission: 'scan.errPermission',
  tooLarge: 'scan.errTooLarge',
  limit: 'scan.errLimit',
  unreadable: 'scan.errUnreadable',
  network: 'scan.errNetwork',
};

/** "Scan receipt" row at the top of a new transaction. Hands the result to the sheet, which refills the form. */
export function ScanReceipt({ onPrefill }: { onPrefill: (p: ReceiptPrefill) => void }) {
  const colors = useTheme();
  const { t } = useT();
  const { user, cloud } = useAuth();
  const { expenseCategories } = useCategories();
  const [busy, setBusy] = useState(false);

  // Scanning goes through the cloud account, so it is hidden in phone-only mode.
  if (!cloud || !user) return null;
  const userId = user.id;

  async function run(source: ScanSource) {
    setBusy(true);
    try {
      const cats = expenseCategories.map((c) => ({ id: c.id, name: categoryName(c), subs: c.subcategories }));
      const result = await scanReceipt(source, cats, getLanguage());
      if (result) onPrefill(receiptToPrefill(result, expenseCategories, toDateString(new Date()), newItemId));
    } catch (e) {
      const code = e instanceof ScanError ? e.code : 'network';
      Alert.alert(t('scan.errTitle'), t(ERROR_KEY[code]));
    } finally {
      setBusy(false);
    }
  }

  function choose() {
    Alert.alert(t('scan.chooseTitle'), t('scan.chooseMsg'), [
      { text: t('scan.camera'), onPress: () => void run('camera') },
      { text: t('scan.gallery'), onPress: () => void run('gallery') },
      { text: t('scan.pdf'), onPress: () => void run('pdf') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  /** The first scan explains that the picture leaves the phone; the answer is remembered on this phone. */
  async function start() {
    if (busy) return;
    const key = userKey(userId, 'scan:consent');
    if (await loadJSON<boolean>(key)) return choose();
    Alert.alert(t('scan.consentTitle'), t('scan.consentBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('scan.consentOk'),
        onPress: () => {
          void saveJSON(key, true);
          choose();
        },
      },
    ]);
  }

  return (
    <Pressable
      onPress={() => void start()}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={t('scan.button')}
      style={[styles.row, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
    >
      {busy ? <ActivityIndicator color={colors.accent} /> : <Ionicons name="scan-outline" size={22} color={colors.accent} />}
      <View style={styles.text}>
        <ThemedText style={{ fontWeight: '600' }}>{busy ? t('scan.reading') : t('scan.button')}</ThemedText>
        {busy ? null : (
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t('scan.buttonSub')}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.three,
  },
  text: { flex: 1 },
});
