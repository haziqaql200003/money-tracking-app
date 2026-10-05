import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CHANGELOG, entryText, releaseTitle, type ChangeKind } from '@/constants/changelog';
import { Spacing } from '@/constants/theme';
import { useUpdates } from '@/context/UpdatesContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { formatDate } from '@/i18n/format';

const KIND_ICON: Record<ChangeKind, keyof typeof Ionicons.glyphMap> = {
  new: 'sparkles',
  improved: 'trending-up',
  fixed: 'build',
};

// 'YYYY-MM-DD' as a local date (new Date(string) would read it as UTC).
function parseDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function WhatsNewScreen() {
  const colors = useTheme();
  const { t, lang } = useT();
  const { markUpdateSeen } = useUpdates();

  useEffect(() => {
    markUpdateSeen();
  }, [markUpdateSeen]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <ScreenHeader title={t('more.whatsNew.title')} />

          {CHANGELOG.map((release, idx) => (
            <View key={release.version} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <View style={styles.headerRow}>
                <View style={[styles.versionPill, { backgroundColor: idx === 0 ? colors.accent : colors.background }]}>
                  <ThemedText type="small" style={{ color: idx === 0 ? '#fff' : colors.textSecondary, fontWeight: '700' }}>
                    v{release.version}
                  </ThemedText>
                </View>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {formatDate(parseDate(release.date), 'long')}
                </ThemedText>
              </View>

              <ThemedText style={styles.title}>{releaseTitle(release, lang)}</ThemedText>

              <View style={styles.changes}>
                {release.changes.map((c, i) => {
                  return (
                    <View key={i} style={styles.changeRow}>
                      <Ionicons name={KIND_ICON[c.kind]} size={15} color={colors.accent} style={styles.changeIcon} />
                      <ThemedText type="small" style={styles.flex}>
                        {entryText(c, lang)}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

          <ThemedText type="small" style={[styles.footer, { color: colors.textSecondary }]}>
            {t('more.whatsNew.caughtUp')}
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130 },
  flex: { flex: 1 },
  card: { borderRadius: 20, padding: 20, marginBottom: Spacing.three },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  versionPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: Spacing.two },
  changes: { gap: 8 },
  changeRow: { flexDirection: 'row', gap: 8 },
  changeIcon: { marginTop: 2 },
  footer: { textAlign: 'center', marginTop: Spacing.two },
});