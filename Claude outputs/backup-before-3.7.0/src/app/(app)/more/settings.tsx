import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmountInput } from '@/components/ui/amount-input';
import { GlassSegmented } from '@/components/glass/glass-segmented';
import { setGyroEnabled, useGyroEnabled } from '@/components/cards/motion';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Row, Section } from '@/components/settings/settings-ui';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Chip } from '@/components/ui/chip';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { usePrivacy } from '@/context/PrivacyContext';
import { useSettings, type ThemePreference } from '@/context/SettingsContext';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { useTransactions } from '@/context/TransactionsContext';
import { themeAccent, themeForCard, themeName, themeSeries } from '@/constants/app-themes';
import { normalizeDesign, normalizeFinish } from '@/constants/card-styles';
import { accountName } from '@/i18n/data';
import { setCoachSeen } from '@/services/intro';
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
  const { themePreference, setThemePreference, warnPercent, setWarnPercent, dailyLimit, setDailyLimit, themeCard, setThemeCard } = useSettings();
  const { selectableAccounts } = useTransactions();
  const dark = useColorScheme() === 'dark';
  // Accounts with a premium card: each one can lend its theme to the whole app.
  const themeCards = selectableAccounts
    .map((a) => ({ account: a, theme: themeForCard(normalizeDesign(a.design), normalizeFinish(a.finish)) }))
    .filter((x) => x.theme !== null);
  const activeCard = themeCards.some((x) => x.account.id === themeCard) ? themeCard : null;
  const { user, updateProfile } = useAuth();
  const { hideAmounts, toggleHideAmounts } = usePrivacy();
  // The tutorial questions are done once; "repeat" replays the Home walkthrough instead.
  function replayTour() {
    if (user) setCoachSeen(user.id, false);
    router.navigate('/');
  }
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

          <Section
            title={t('more.settings.cardTheme')}
            footer={activeCard && !dark ? t('more.settings.cardThemeLight') : t('more.settings.cardThemeFooter')}
          >
            <Row
              first
              icon="color-palette-outline"
              label={t('more.settings.cardThemeDefault')}
              subtitle={t('more.settings.cardThemeDefaultSub')}
              onPress={() => setThemeCard(null)}
              right={activeCard ? <View style={styles.check} /> : <Ionicons name="checkmark" size={20} color={colors.accent} />}
            />
            {themeCards.map(({ account, theme }) =>
              theme ? (
                <Row
                  key={account.id}
                  icon="card-outline"
                  tint={themeAccent(theme)}
                  label={accountName(account)}
                  subtitle={`${themeSeries(theme)} · ${themeName(theme)}`}
                  onPress={() => setThemeCard(account.id)}
                  right={activeCard === account.id ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : <View style={styles.check} />}
                />
              ) : null,
            )}
            {themeCards.length === 0 ? (
              <Row icon="sparkles-outline" label={t('more.settings.cardThemeEmpty')} onPress={() => router.push('/more/assets')} />
            ) : null}
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

          {/* Privacy and sign-in, gathered here so Settings is the one place to look */}
          <Section title={t('more.settings.privacySecurity')}>
            <Row
              first
              icon="eye-off-outline"
              label={t('more.settings.hideAmounts')}
              subtitle={t('more.settings.hideAmountsSub')}
              tint="#15803D"
              right={<Switch value={hideAmounts} onValueChange={toggleHideAmounts} trackColor={{ true: colors.accent }} />}
            />
            <Row icon="lock-closed-outline" label={t('more.security.title')} subtitle={t('more.index.security.sub')} tint="#6366F1" onPress={() => router.push('/more/security')} />
            <Row icon="notifications-outline" label={t('more.settings.reminders')} subtitle={t('more.settings.remindersSub')} tint="#22C55E" onPress={() => router.push('/more/rancang')} />
          </Section>

          <Section title={t('more.settings.budgets')} footer={t('more.settings.budgetsFooter')}>
            <View style={styles.pad}>
              <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.two }}>
                {t('more.settings.warnAt')}
              </ThemedText>
              <GlassSegmented
                options={WARN_OPTIONS.map((w) => ({ key: String(w), label: `${w}%` }))}
                value={String(warnPercent)}
                onChange={(k) => setWarnPercent(Number(k))}
                trackColor={colors.background}
              />
              <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: Spacing.four, marginBottom: Spacing.two }}>
                {t('more.settings.dailyLimit')}
              </ThemedText>
              <View style={styles.dailyLimitRow}>
                <View style={[styles.dailyLimitInputWrap, { backgroundColor: colors.background, borderColor: colors.divider }]}>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    RM{/* i18n-ignore */}
                  </ThemedText>
                  <AmountInput
                    style={[styles.dailyLimitInput, { color: colors.text }]}
                    placeholder={t('more.settings.dailyLimitOff')}
                    placeholderTextColor={colors.textSecondary}
                    value={dailyLimitText}
                    onChange={setDailyLimitText}
                    onBlur={commitDailyLimit}
                  />
                </View>
                {[50, 100, 150].map((q) => (
                  <Chip key={q} size="sm" label={`RM ${q}`} active={dailyLimit === q} onPress={() => applyDailyLimit(dailyLimit === q ? 0 : q)} style={styles.flex} />
                ))}
              </View>
              <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: 6 }}>
                {dailyLimit > 0 ? t('more.settings.dailyLimitOn') : t('more.settings.dailyLimitOffHint')}
              </ThemedText>
            </View>
          </Section>

          <Section title={t('more.settings.general')}>
            <Row first icon="cash-outline" label={t('more.settings.currency')} value="MYR (RM)" /* i18n-ignore */ />
            <Row icon="calendar-outline" label={t('more.settings.weekStarts')} value={weekdayLong(0)} />
            <Row icon="school-outline" label={t('more.settings.repeatTutorial')} onPress={replayTour} />
          </Section>

          <Section title={t('more.settings.dataSection')}>
            <Row first icon="shield-checkmark-outline" label={t('more.data.title')} subtitle={t('more.settings.dataSub')} tint="#0EA5E9" onPress={() => router.push('/more/data')} />
            <Row icon="push-outline" label={t('more.settings.import')} subtitle={t('more.settings.importSub')} tint="#0EA5E9" onPress={() => router.push('/more/import')} />
            <Row icon="information-circle-outline" label={t('more.about.title')} subtitle={t('more.settings.aboutSub')} tint="#64748B" onPress={() => router.push('/more/about')} />
            <Row icon="trash-outline" label={t('more.settings.deleteAccount')} subtitle={t('more.settings.deleteAccountSub')} danger onPress={() => router.push('/more/delete-account')} />
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
  check: { width: 20 },
  dailyLimitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  dailyLimitInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    width: '100%',
  },
  dailyLimitInput: { flex: 1, fontSize: FontSize.label, paddingVertical: 10 },
});
