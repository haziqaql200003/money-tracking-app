import { useRouter } from 'expo-router';
import { Alert, ScrollView, Share, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Row, Section } from '@/components/settings-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCategories } from '@/context/CategoriesContext';
import { usePlan } from '@/context/PlanContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { accountName, categoryName } from '@/i18n/data';
import { formatDate } from '@/i18n/format';
import { listBackups, restoreBackups, useSyncStatus } from '@/services/cloud-sync';
import { toCsv } from '@/utils/csv';

/** Everything about where your data lives and how to take it with you or remove it. */
export default function DataPrivacyScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { t, tp } = useT();
  const { hideAmounts, toggleHideAmounts } = usePrivacy();
  const { transactions, accounts, resetAllData } = useTransactions();
  const { getCategory, resetCategories } = useCategories();
  const { resetPlan } = usePlan();
  const { user, deleteAccount, cloud, syncNow } = useAuth();
  const sync = useSyncStatus();

  const syncText = (() => {
    if (sync.state === 'syncing') return t('more.settings.syncSyncing');
    if (sync.state === 'offline') return t('more.settings.syncOffline');
    if (sync.pending > 0) return tp('more.settings.syncPending', sync.pending);
    if (!sync.lastSyncedAt) return t('more.settings.syncNever');
    const d = new Date(sync.lastSyncedAt);
    const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return t('more.settings.syncLast', { time: `${formatDate(d)}, ${hhmm}` });
  })();

  async function askRestore() {
    if (!user) return;
    const keys = await listBackups(user.id);
    if (keys.length === 0) {
      Alert.alert(t('more.settings.restoreTitle'), t('more.settings.restoreNone'));
      return;
    }
    Alert.alert(t('more.settings.restoreTitle'), t('more.settings.restoreBody', { count: keys.length }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('more.settings.restoreGo'), onPress: () => void restoreBackups(user.id) },
    ]);
  }

  async function exportAll() {
    if (transactions.length === 0) {
      Alert.alert(t('more.settings.exportEmptyTitle'), t('more.settings.exportEmptyMsg'));
      return;
    }
    const csv = toCsv(
      [...transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
      (id) => {
        const a = accounts.find((x) => x.id === id);
        return a ? accountName(a) : id;
      },
      (id) => {
        const c = getCategory(id);
        return c ? categoryName(c) : id;
      },
    );
    try {
      await Share.share({ message: csv, title: 'transactions.csv' /* i18n-ignore */ });
    } catch {
      // sheet dismissed
    }
  }

  function confirmReset() {
    Alert.alert(t('more.settings.resetTitle'), t('more.settings.resetMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.reset'),
        style: 'destructive',
        onPress: () => {
          resetAllData();
          resetCategories();
          resetPlan();
        },
      },
    ]);
  }

  function confirmDelete() {
    Alert.alert(t('more.settings.deleteAccountTitle'), t('more.settings.deleteAccountMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteAccount().then((res) => {
            if (!res.ok) Alert.alert(t('more.settings.deleteFailedTitle'), res.error);
          });
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <ScreenHeader title={t('more.data.title')} />

          <ThemedText type="small" style={[styles.intro, { color: colors.textSecondary }]}>
            {t('more.data.principles')} {t('more.data.local')}
          </ThemedText>

          {cloud ? (
            <Section title={t('more.settings.cloudSync')}>
              <Row first icon="cloud-done-outline" label={t('more.settings.cloudSync')} subtitle={syncText} />
              <Row icon="sync-outline" label={t('more.settings.syncNow')} subtitle={t('more.settings.syncNowSub')} onPress={() => void syncNow()} />
              <Row icon="time-outline" label={t('more.settings.restoreTitle')} subtitle={t('more.settings.restoreSub')} onPress={() => void askRestore()} />
            </Section>
          ) : null}

          <Section title={t('more.settings.privacy')} footer={t('more.settings.privacyFooter')}>
            <Row
              first
              icon="eye-off-outline"
              label={t('more.settings.hideAmounts')}
              right={<Switch value={hideAmounts} onValueChange={toggleHideAmounts} trackColor={{ true: colors.accent }} />}
            />
          </Section>

          <Section title={t('more.settings.data')}>
            <Row first icon="download-outline" label={t('more.settings.export')} subtitle={t('more.settings.exportSub')} onPress={exportAll} />
            <Row icon="push-outline" label={t('more.settings.import')} subtitle={t('more.settings.importSub')} onPress={() => router.push('/more/import')} />
          </Section>

          <Section title={t('more.data.policies')}>
            <Row first icon="document-text-outline" label={t('more.data.privacyPolicy')} onPress={() => router.push('/privacy')} />
            <Row icon="reader-outline" label={t('more.data.terms')} onPress={() => router.push('/more/terms')} />
          </Section>

          <Section title={t('more.data.danger')}>
            <Row first icon="trash-outline" label={t('more.settings.resetData')} subtitle={t('more.settings.resetDataSub')} danger onPress={confirmReset} />
            <Row icon="trash-outline" label={t('more.settings.deleteAccount')} subtitle={t('more.settings.deleteAccountSub')} danger onPress={confirmDelete} />
          </Section>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130 },
  intro: { marginBottom: Spacing.four, marginLeft: 4 },
});
