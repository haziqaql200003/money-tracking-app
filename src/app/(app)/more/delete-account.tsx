import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField } from '@/components/auth/auth-field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedView } from '@/components/ui/themed-view';
import { Button } from '@/components/ui/button';
import type { IconName } from '@/constants/categories';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { usePlan } from '@/context/PlanContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useExportCsv } from '@/hooks/use-export-csv';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { resetIntro } from '@/services/intro';

/**
 * Delete the account in three steps: see what goes (and export first), confirm who you are, type the word.
 * Afterwards the app starts again from the splash, as if just installed.
 */
export default function DeleteAccountScreen() {
  const colors = useTheme();
  const { t } = useT();
  const { user, cloud, deleteAccount, hasPassword, verifyPassword } = useAuth();
  const { transactions, selectableAccounts } = useTransactions();
  const { goals } = usePlan();
  const exportCsv = useExportCsv();
  const [step, setStep] = useState(0);
  const [needsPw, setNeedsPw] = useState(true);
  const [password, setPassword] = useState('');
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const target = t('ob.del.word');

  useEffect(() => {
    let alive = true;
    hasPassword().then((v) => alive && setNeedsPw(v));
    return () => {
      alive = false;
    };
  }, [hasPassword]);

  const items: { icon: IconName; labelKey: TKey; count?: number }[] = [
    { icon: 'receipt-outline', labelKey: 'ob.del.itemTx', count: transactions.length },
    { icon: 'card-outline', labelKey: 'ob.del.itemAccounts', count: selectableAccounts.length },
    { icon: 'flag-outline', labelKey: 'ob.del.itemGoals', count: goals.length },
    { icon: 'options-outline', labelKey: 'ob.del.itemSettings' },
    { icon: cloud ? 'cloud-outline' : 'phone-portrait-outline', labelKey: cloud ? 'ob.del.itemCloud' : 'ob.del.itemPhone' },
  ];

  async function confirmIdentity() {
    setError(null);
    if (!needsPw) return setStep(2);
    setBusy(true);
    const ok = await verifyPassword(password);
    setBusy(false);
    if (!ok) return setError(t('ob.del.wrongPw'));
    setStep(2);
  }

  async function remove() {
    if (word.trim().toUpperCase() !== target.toUpperCase()) return;
    setBusy(true);
    setError(null);
    resetIntro(); // afterwards: back to the splash and the story, like a fresh install
    const res = await deleteAccount();
    setBusy(false);
    if (!res.ok) setError(res.error);
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ScreenHeader title={t('more.settings.deleteAccount')} />
            <Text style={[Type.overline, { color: colors.negative }]}>{t('ob.common.stepOf', { n: step + 1, total: 3 })}</Text>

            {step === 0 ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{t('ob.del.whatTitle')}</Text>
                <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                  {items.map((it, i) => (
                    <View key={it.labelKey} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
                      <Ionicons name={it.icon} size={20} color={colors.negative} />
                      <Text style={[Type.label, { color: colors.text, flex: 1 }]}>{t(it.labelKey)}</Text>
                      {it.count !== undefined ? <Text style={[Type.label, { color: colors.textSecondary }]}>{it.count}</Text> : null}
                    </View>
                  ))}
                </View>
                <View style={[styles.note, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="download-outline" size={18} color={colors.accent} />
                  <View style={styles.flex}>
                    <Text style={[Type.label, { color: colors.accent }]}>{t('ob.del.exportFirst')}</Text>
                    <Text style={[Type.caption, { color: colors.accent }]}>{t('ob.del.exportSub')}</Text>
                  </View>
                </View>
                <Button label={t('more.settings.export')} variant="secondary" icon="download-outline" onPress={() => void exportCsv()} />
              </>
            ) : null}

            {step === 1 ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{t('ob.del.whoTitle')}</Text>
                <Text style={[Type.body, { color: colors.textSecondary, marginBottom: Spacing.three }]}>
                  {needsPw ? t('ob.del.whoPw', { email: user?.email ?? '' }) : t('ob.del.whoSocial', { email: user?.email ?? '' })}
                </Text>
                {needsPw ? <AuthField label={t('auth.field.password')} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" textContentType="password" autoFocus onSubmitEditing={confirmIdentity} /> : null}
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{t('ob.del.lastTitle')}</Text>
                <Text style={[Type.body, { color: colors.textSecondary, marginBottom: Spacing.three }]}>{t('ob.del.lastBody', { word: target })}</Text>
                <TextInput
                  value={word}
                  onChangeText={setWord}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder={target}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.word, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: word.trim().toUpperCase() === target.toUpperCase() ? colors.negative : colors.divider }]}
                  accessibilityLabel={t('ob.del.typeLabel', { word: target })}
                />
              </>
            ) : null}

            {error ? <Text style={[Type.label, { color: colors.negative, marginTop: Spacing.two }]}>{error}</Text> : null}
            <View style={styles.footer}>
            {step === 0 ? <Button label={t('ob.common.continue')} variant="danger" onPress={() => setStep(1)} /> : null}
            {step === 1 ? <Button label={t('ob.common.continue')} variant="danger" onPress={() => void confirmIdentity()} disabled={needsPw && !password} loading={busy} /> : null}
            {step === 2 ? <Button label={t('ob.del.go')} variant="danger" onPress={() => void remove()} disabled={word.trim().toUpperCase() !== target.toUpperCase()} loading={busy} /> : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130, gap: 12 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.4 },
  card: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50 },
  note: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: Radius.md, alignItems: 'flex-start' },
  word: { height: 56, borderRadius: Radius.md, borderWidth: 2, paddingHorizontal: Spacing.three, fontSize: 20, fontWeight: '800', letterSpacing: 2 },
  footer: { marginTop: Spacing.three },
});
