import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassSegmented } from '@/components/glass/glass-segmented';
import { setGyroEnabled, useGyroEnabled } from '@/components/cards/motion';
import { ScreenHeader } from '@/components/screen-header';
import { Row, Section } from '@/components/settings-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSettings, type ThemePreference } from '@/context/SettingsContext';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { weekdayLong } from '@/i18n/format';
import { setLanguage, useT, type Lang, type TKey } from '@/i18n';

const THEMES: { key: ThemePreference; labelKey: TKey }[] = [
  { key: 'system', labelKey: 'more.settings.theme.system' },
  { key: 'light', labelKey: 'more.settings.theme.light' },
  { key: 'dark', labelKey: 'more.settings.theme.dark' },
];
// Each language is always shown in its own language.
const LANGUAGES: { key: Lang; label: string }[] = [
  { key: 'ms', label: 'Bahasa Melayu' }, // i18n-ignore
  { key: 'en', label: 'English' }, // i18n-ignore
];
const WARN_OPTIONS = [70, 80, 90];

export default function SettingsScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { t, lang } = useT();
  const gyroEnabled = useGyroEnabled();
  const { themePreference, setThemePreference, warnPercent, setWarnPercent, dailyLimit, setDailyLimit } = useSettings();
  const { user, signOut, updateProfile } = useAuth();
  function changeLanguage(language: Lang) {
    if (language === lang) return;
    updateProfile({ language });
    setLanguage(language);
  }

  const [dailyLimitText, setDailyLimitText] = useState(dailyLimit > 0 ? String(dailyLimit) : '');

  function applyDailyLimit(n: number) {
    const rounded = Math.round(n * 100) / 100;
    setDailyLimit(rounded > 0 ? rounded : 0);
    setDailyLimitText(rounded > 0 ? String(rounded) : '');
  }

  function commitDailyLimit() {
    const n = parseFloat(dailyLimitText.replace(',', '.'));
    applyDailyLimit(Number.isFinite(n) ? n : 0);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader title={t('more.settings.title')} />

          <Section title={t('more.settings.account')}>
            <Row first icon="mail-outline" label={t('more.settings.email')} value={user?.email} />
            <Row icon="school-outline" label={t('more.settings.repeatTutorial')} onPress={() => updateProfile({ hasOnboarded: false })} />
            <Row icon="log-out-outline" label={t('more.settings.logOut')} onPress={signOut} />
          </Section>

          <Section title={t('more.settings.appearance')}>
            <View style={styles.pad}>
              <GlassSegmented
                options={THEMES.map((o) => ({ key: o.key, label: t(o.labelKey) }))}
                value={themePreference}
                onChange={setThemePreference}
                trackColor={colors.background}
              />
            </View>
          </Section>

          <Section title={t('more.settings.language')} footer={t('more.settings.languageFooter')}>
            <View style={styles.pad}>
              <GlassSegmented
                options={LANGUAGES}
                value={lang}
                onChange={changeLanguage}
                trackColor={colors.background}
              />
            </View>
          </Section>

          <Section title={t('more.settings.cardMotion')} footer={t('more.settings.cardMotionFooter')}>
            <Row
              first
              icon="phone-portrait-outline"
              label={t('more.settings.tiltWithPhone')}
              right={<Switch value={gyroEnabled} onValueChange={setGyroEnabled} trackColor={{ true: colors.accent }} />}
            />
          </Section>

          <Section title={t('more.settings.budgets')} footer={t('more.settings.budgetsFooter')}>
            <View style={styles.pad}>
              <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.two }}>
                {t('more.settings.warnAt')}
              </ThemedText>
              <View style={styles.chipRow}>
                {WARN_OPTIONS.map((w) => {
                  const active = warnPercent === w;
                  return (
                    <Pressable
                      key={w}
                      onPress={() => setWarnPercent(w)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? colors.accent : colors.background,
                          borderColor: active ? colors.accent : colors.divider,
                        },
                      ]}
                    >
                      <ThemedText type="small" style={active ? { color: '#fff', fontWeight: '600' } : { color: colors.textSecondary }}>
                        {w}%
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: Spacing.four, marginBottom: Spacing.two }}>
                {t('more.settings.dailyLimit')}
              </ThemedText>
              <View style={styles.dailyLimitRow}>
                <View style={[styles.dailyLimitInputWrap, { backgroundColor: colors.background, borderColor: colors.divider }]}>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    RM{/* i18n-ignore */}
                  </ThemedText>
                  <TextInput
                    style={[styles.dailyLimitInput, { color: colors.text }]}
                    placeholder={t('more.settings.dailyLimitOff')}
                    placeholderTextColor={colors.textSecondary}
                    value={dailyLimitText}
                    onChangeText={setDailyLimitText}
                    onEndEditing={commitDailyLimit}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                  />
                </View>
                {[50, 100, 150].map((q) => {
                  const active = dailyLimit === q;
                  return (
                    <Pressable
                      key={q}
                      onPress={() => applyDailyLimit(active ? 0 : q)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? colors.accent : colors.background,
                          borderColor: active ? colors.accent : colors.divider,
                        },
                      ]}
                    >
                      <ThemedText type="small" style={active ? { color: '#fff', fontWeight: '600' } : { color: colors.textSecondary }}>
                        {q}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: 6 }}>
                {dailyLimit > 0 ? t('more.settings.dailyLimitOn') : t('more.settings.dailyLimitOffHint')}
              </ThemedText>
            </View>
          </Section>

          <Section title={t('more.settings.general')}>
            <Row first icon="cash-outline" label={t('more.settings.currency')} value="MYR (RM)" /* i18n-ignore */ />
            <Row icon="calendar-outline" label={t('more.settings.weekStarts')} value={weekdayLong(0)} />
          </Section>

          <Section title={t('more.settings.more')}>
            <Row first icon="person-circle-outline" label={t('more.profile.title')} subtitle={t('more.settings.profileSub')} onPress={() => router.push('/more/profile')} />
            <Row icon="shield-checkmark-outline" label={t('more.data.title')} subtitle={t('more.settings.dataSub')} onPress={() => router.push('/more/data')} />
            <Row icon="information-circle-outline" label={t('more.about.title')} subtitle={t('more.settings.aboutSub')} onPress={() => router.push('/more/about')} />
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
  flex: { flex: 1 },

  pad: { padding: Spacing.three },




  chipRow: { flexDirection: 'row', gap: Spacing.two },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
    dailyLimitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  dailyLimitInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    width: '100%',
  },
  dailyLimitInput: { flex: 1, fontSize: 15, paddingVertical: 10 },
});
