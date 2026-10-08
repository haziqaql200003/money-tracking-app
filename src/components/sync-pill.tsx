import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CLOUD_ENABLED } from '@/services/supabase';
import { useSyncStatus } from '@/services/cloud-sync';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { Radius } from '@/constants/theme';

/** Small note on Home while changes are being sent to the server, or waiting for the phone to get back online. */
export function SyncPill() {
  const colors = useTheme();
  const { t } = useT();
  const sync = useSyncStatus();
  if (!CLOUD_ENABLED) return null;
  const syncing = sync.state === 'syncing';
  const waiting = sync.state === 'offline' && sync.pending > 0;
  if (!syncing && !waiting) return null;
  return (
    <View style={[styles.pill, { backgroundColor: colors.backgroundElement }]} accessibilityLiveRegion="polite">
      {syncing ? <ActivityIndicator size="small" color={colors.textSecondary} /> : null}
      <ThemedText type="small" style={{ color: colors.textSecondary }}>
        {syncing ? t('common.syncing') : t('common.syncOffline')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md, marginBottom: 12 },
});
