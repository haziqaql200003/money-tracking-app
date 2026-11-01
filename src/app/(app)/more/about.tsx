import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Row, Section } from '@/components/settings/settings-ui';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { CHANGELOG } from '@/constants/changelog';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { Alert } from '@/services/dialog';
import { clearErrorLog, formatErrorLog, getErrorLog } from '@/services/error-log';
import { datedName, shareTextFile } from '@/services/share-file';
import { toDateKey } from '@/utils/dates';

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
  const { t, lang } = useT();
  const latest = CHANGELOG[0];
  const muted = { color: colors.textSecondary };
  const [errorCount, setErrorCount] = useState(0);
  useFocusEffect(
    useCallback(() => {
      void getErrorLog().then((l) => setErrorCount(l.length));
    }, []),
  );

  async function openErrorLog() {
    const list = await getErrorLog();
    if (list.length === 0) {
      Alert.alert(t('more.about.errorLog'), t('more.about.errorLogNone'));
      return;
    }
    Alert.alert(t('more.about.errorLog'), t('more.about.errorLogBody', { count: list.length }), [
      { text: t('common.close'), style: 'cancel' },
      {
        text: t('more.about.errorLogClear'),
        style: 'destructive',
        onPress: () => {
          void clearErrorLog().then(() => setErrorCount(0));
        },
      },
      { text: t('more.about.errorLogShare'), onPress: () => void shareTextFile(datedName('wakira-error-log', toDateKey(new Date()), 'txt'), formatErrorLog(list), 'text/plain') }, // i18n-ignore: file name
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <ScreenHeader title={t('more.about.title')} />

          <View style={styles.hero}>
            <View style={[styles.logo, { backgroundColor: colors.accent }]}>
              <ThemedText style={[styles.logoLetter, { color: colors.onAccent }]}>W{/* i18n-ignore */}</ThemedText>
            </View>
            <ThemedText style={styles.brand}>WaKira{/* i18n-ignore */}</ThemedText>
            <ThemedText type="small" style={[styles.tagline, muted]}>{t('more.about.tagline')}</ThemedText>
          </View>

          {/* The newest release, right here */}
          {latest ? (
            <Pressable
              onPress={() => router.push('/more/whats-new')}
              style={({ pressed }) => [styles.newCard, { backgroundColor: colors.backgroundElement }, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
            >
              <View style={styles.newTop}>
                <View style={[styles.versionPill, { backgroundColor: colors.accentSoft }]}>
                  <ThemedText type="small" style={{ color: colors.accent, fontWeight: '800' }}>v{latest.version}</ThemedText>
                </View>
                <ThemedText type="small" style={muted}>{t('more.about.latest')}</ThemedText>
              </View>
              <ThemedText style={styles.newTitle}>{lang === 'ms' ? latest.titleMs : latest.title}</ThemedText>
              {(latest.highlights ?? []).map((h) => (
                <ThemedText key={h.text} type="small" style={muted}>{'•  ' + (lang === 'ms' ? h.ms : h.text)}</ThemedText>
              ))}
              <ThemedText type="small" style={{ color: colors.accent, fontWeight: '800', marginTop: 4 }}>{t('more.about.allVersions')}</ThemedText>
            </Pressable>
          ) : null}

          <Section title={t('more.about.version')}>
            <Row first icon="information-circle-outline" label={t('more.about.version')} value={`v${Constants.expoConfig?.version ?? '1.0.0'}`} />
            <Row icon="megaphone-outline" label={t('more.about.whatsNew')} onPress={() => router.push('/more/whats-new')} />
            <Row icon="document-text-outline" label={t('more.data.privacyPolicy')} onPress={() => router.push('/privacy')} />
            <Row icon="reader-outline" label={t('more.data.terms')} onPress={() => router.push('/more/terms')} />
            <Row icon="bug-outline" label={t('more.about.errorLog')} value={String(errorCount)} onPress={() => void openErrorLog()} />
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
  hero: { alignItems: 'center', paddingVertical: Spacing.three, marginBottom: Spacing.two, gap: 6 },
  logo: { width: 64, height: 64, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { fontSize: 30, lineHeight: 36, fontWeight: '800' },
  newCard: { borderRadius: Radius.lg, padding: Spacing.three, gap: 4, marginBottom: Spacing.four },
  newTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  versionPill: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  newTitle: { fontSize: FontSize.heading, fontWeight: '800', marginVertical: 4 },
  brand: { fontSize: FontSize.largeTitle, lineHeight: 38, fontWeight: '800' },
  tagline: { textAlign: 'center', paddingHorizontal: Spacing.three },
  point: { marginBottom: 8 },
  qa: { marginBottom: Spacing.three, gap: 2 },
});
