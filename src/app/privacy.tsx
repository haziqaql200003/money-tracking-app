import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { useT, type TKey } from '@/i18n';

// DRAF sahaja. Sila semak dengan penasihat undang-undang sebelum dilancarkan (PDPA 2010, dipinda 2024).
const SECTIONS: { titleKey: TKey; bodyKey: TKey }[] = [
  { titleKey: 'auth.privacy.collect.title', bodyKey: 'auth.privacy.collect.body' },
  { titleKey: 'auth.privacy.purpose.title', bodyKey: 'auth.privacy.purpose.body' },
  { titleKey: 'auth.privacy.storage.title', bodyKey: 'auth.privacy.storage.body' },
  { titleKey: 'auth.privacy.retention.title', bodyKey: 'auth.privacy.retention.body' },
  { titleKey: 'auth.privacy.rights.title', bodyKey: 'auth.privacy.rights.body' },
  { titleKey: 'auth.privacy.contact.title', bodyKey: 'auth.privacy.contact.body' },
];

export default function PrivacyScreen() {
  const colors = useTheme();
  const { t } = useT();
  const { cloud } = useAuth();
  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <ScreenHeader title={t('auth.privacy.title')} />
          {SECTIONS.map((s) => (
            <ThemedText key={s.titleKey} type="small" style={styles.block}>
              <ThemedText type="smallBold">{t(s.titleKey) + '\n'}</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {t(cloud && s.bodyKey === 'auth.privacy.storage.body' ? 'auth.privacy.storage.bodyCloud' : s.bodyKey)}
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
  content: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six },
  block: { marginBottom: Spacing.four, lineHeight: 22 },
});
