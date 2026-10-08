import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Row, Section } from '@/components/settings-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';

const HELP: { q: TKey; a: TKey }[] = [
  { q: 'more.about.h1.q', a: 'more.about.h1.a' },
  { q: 'more.about.h2.q', a: 'more.about.h2.a' },
  { q: 'more.about.h3.q', a: 'more.about.h3.a' },
  { q: 'more.about.h4.q', a: 'more.about.h4.a' },
  { q: 'more.about.h5.q', a: 'more.about.h5.a' },
];
const PRINCIPLES: TKey[] = ['more.about.p1', 'more.about.p2', 'more.about.p3'];

export default function AboutScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { t } = useT();
  const muted = { color: colors.textSecondary };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <ScreenHeader title={t('more.about.title')} />

          <View style={styles.hero}>
            <ThemedText style={styles.brand}>WaKira{/* i18n-ignore */}</ThemedText>
            <ThemedText type="small" style={[styles.tagline, muted]}>{t('more.about.tagline')}</ThemedText>
          </View>

          <Section title={t('more.about.version')}>
            <Row first icon="information-circle-outline" label={t('more.about.version')} value={`v${Constants.expoConfig?.version ?? '1.0.0'}`} />
            <Row icon="megaphone-outline" label={t('more.about.whatsNew')} onPress={() => router.push('/more/whats-new')} />
            <Row icon="document-text-outline" label={t('more.data.privacyPolicy')} onPress={() => router.push('/privacy')} />
            <Row icon="reader-outline" label={t('more.data.terms')} onPress={() => router.push('/more/terms')} />
          </Section>

          <Section title={t('more.about.principles')}>
            <View style={styles.pad}>
              {PRINCIPLES.map((k) => (
                <ThemedText key={k} type="small" style={[styles.point, muted]}>
                  {'•  ' + t(k)}
                </ThemedText>
              ))}
            </View>
          </Section>

          <Section title={t('more.about.help')}>
            <View style={styles.pad}>
              {HELP.map((h) => (
                <View key={h.q} style={styles.qa}>
                  <ThemedText type="smallBold">{t(h.q)}</ThemedText>
                  <ThemedText type="small" style={muted}>{t(h.a)}</ThemedText>
                </View>
              ))}
            </View>
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
  pad: { padding: Spacing.three },
  hero: { alignItems: 'center', paddingVertical: Spacing.three, marginBottom: Spacing.three, gap: 6 },
  brand: { fontSize: 32, lineHeight: 38, fontWeight: '800' },
  tagline: { textAlign: 'center', paddingHorizontal: Spacing.three },
  point: { marginBottom: 8 },
  qa: { marginBottom: Spacing.three, gap: 2 },
});
