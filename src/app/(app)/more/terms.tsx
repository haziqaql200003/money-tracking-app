import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';

// DRAF sahaja. Sila semak dengan penasihat undang-undang sebelum dilancarkan ke kedai aplikasi.
const SECTIONS: { titleKey: TKey; bodyKey: TKey }[] = [
  { titleKey: 'more.terms.use.title', bodyKey: 'more.terms.use.body' },
  { titleKey: 'more.terms.advice.title', bodyKey: 'more.terms.advice.body' },
  { titleKey: 'more.terms.accuracy.title', bodyKey: 'more.terms.accuracy.body' },
  { titleKey: 'more.terms.data.title', bodyKey: 'more.terms.data.body' },
  { titleKey: 'more.terms.changes.title', bodyKey: 'more.terms.changes.body' },
];

export default function TermsScreen() {
  const colors = useTheme();
  const { t } = useT();
  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <ScreenHeader title={t('more.terms.title')} />
          {SECTIONS.map((s) => (
            <ThemedText key={s.titleKey} type="small" style={styles.block}>
              <ThemedText type="smallBold">{t(s.titleKey) + '\n'}</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {t(s.bodyKey)}
              </ThemedText>
            </ThemedText>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130 },
  block: { marginBottom: Spacing.four },
});
