import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassSegmented } from '@/components/glass/glass-segmented';
import { setGyroEnabled, useGyroEnabled } from '@/components/cards/motion';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { isLightColor } from '@/constants/card-styles';
import type { IconName } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useProfile } from '@/context/ProfileContext';
import { useSettings, type ThemePreference } from '@/context/SettingsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { toCsv } from '@/utils/csv';
import { useAuth } from '@/context/AuthContext';
import { usePlan } from '@/context/PlanContext';
import { accountName, categoryName } from '@/i18n/data';
import { setLanguage, useT, type Lang, type TKey } from '@/i18n';
import { formatDate, weekdayLong } from '@/i18n/format';
import { useSyncStatus } from '@/services/cloud-sync';

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

function Section({ title, footer, children }: { title: string; footer?: string; children: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={styles.section}>
      <ThemedText type="small" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {title.toUpperCase()}
      </ThemedText>
      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>{children}</View>
      {footer ? (
        <ThemedText type="small" style={[styles.footer, { color: colors.textSecondary }]}>
          {footer}
        </ThemedText>
      ) : null}
    </View>
  );
}

type RowProps = {
  icon: IconName;
  label: string;
  subtitle?: string;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  first?: boolean;
};

function Row({ icon, label, subtitle, value, right, onPress, danger, first }: RowProps) {
  const colors = useTheme();
  const tint = danger ? colors.negative : colors.accent;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
        pressed && { opacity: 0.6 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${tint}26` }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={styles.flex}>
        <ThemedText style={danger ? { color: colors.negative } : undefined}>{label}</ThemedText>
        {subtitle ? (
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {value ? (
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          {value}
        </ThemedText>
      ) : null}
      {right}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colors = useTheme();
  const { t, tp, lang } = useT();
  const { displayName, setDisplayName, avatarColor } = useProfile();
  const { hideAmounts, toggleHideAmounts } = usePrivacy();
  const gyroEnabled = useGyroEnabled();
  const { themePreference, setThemePreference, warnPercent, setWarnPercent, dailyLimit, setDailyLimit } = useSettings();
  const { transactions, accounts, resetAllData } = useTransactions();
  const { getCategory, resetCategories } = useCategories();
  const { resetPlan } = usePlan();

  const { user, signOut, deleteAccount, updateProfile, cloud, syncNow } = useAuth();
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

  function changeLanguage(language: Lang) {
    if (language === lang) return;
    updateProfile({ language });
    setLanguage(language);
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

  const [name, setName] = useState(displayName);
  const [dailyLimitText, setDailyLimitText] = useState(dailyLimit > 0 ? String(dailyLimit) : '');

  function commitName() {
    const trimmed = name.trim();
    if (trimmed) setDisplayName(trimmed);
    else setName(displayName);
  }

  function applyDailyLimit(n: number) {
    const rounded = Math.round(n * 100) / 100;
    setDailyLimit(rounded > 0 ? rounded : 0);
    setDailyLimitText(rounded > 0 ? String(rounded) : '');
  }

  function commitDailyLimit() {
    const n = parseFloat(dailyLimitText.replace(',', '.'));
    applyDailyLimit(Number.isFinite(n) ? n : 0);
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
    Alert.alert(
      t('more.settings.resetTitle'),
      t('more.settings.resetMsg'),
      [
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
      ],
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader title={t('more.settings.title')} />

          <Section title={t('more.settings.profile')}>
            <View style={styles.nameRow}>
              <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                <ThemedText style={[styles.avatarLetter, { color: isLightColor(avatarColor) ? '#111827' : '#FFFFFF' }]}>{(name || '?').charAt(0).toUpperCase()}</ThemedText>
              </View>
              <View style={styles.flex}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('more.settings.displayName')}
                </ThemedText>
                <TextInput
                  style={[styles.nameInput, { color: colors.text }]}
                  value={name}
                  onChangeText={setName}
                  onEndEditing={commitName}
                  placeholder={t('more.settings.namePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                  maxLength={24}
                />
              </View>
            </View>
          </Section>

          <Section title={t('more.settings.account')}>
            <Row first icon="mail-outline" label={t('more.settings.email')} value={user?.email} />
            <Row icon="school-outline" label={t('more.settings.repeatTutorial')} onPress={() => updateProfile({ hasOnboarded: false })} />
            <Row icon="log-out-outline" label={t('more.settings.logOut')} onPress={signOut} />
            <Row icon="trash-outline" label={t('more.settings.deleteAccount')} subtitle={t('more.settings.deleteAccountSub')} danger onPress={confirmDelete} />
          </Section>

          {cloud ? (
            <Section title={t('more.settings.cloudSync')}>
              <Row first icon="cloud-done-outline" label={t('more.settings.cloudSync')} subtitle={syncText} />
              <Row icon="sync-outline" label={t('more.settings.syncNow')} subtitle={t('more.settings.syncNowSub')} onPress={() => void syncNow()} />
            </Section>
          ) : null}

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

          <Section title={t('more.settings.privacy')} footer={t('more.settings.privacyFooter')}>
            <Row
              first
              icon="eye-off-outline"
              label={t('more.settings.hideAmounts')}
              right={
                <Switch
                  value={hideAmounts}
                  onValueChange={toggleHideAmounts}
                  trackColor={{ true: colors.accent }}
                />
              }
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

          <Section title={t('more.settings.data')}>
            <Row first icon="download-outline" label={t('more.settings.export')} subtitle={t('more.settings.exportSub')} onPress={exportAll} />
            <Row icon="trash-outline" label={t('more.settings.resetData')} subtitle={t('more.settings.resetDataSub')} danger onPress={confirmReset} />
          </Section>

          <Section title={t('more.settings.about')}>
            <Row
              first
              icon="information-circle-outline"
              label="WaKira" // i18n-ignore
              value={`v${Constants.expoConfig?.version ?? '1.0.0'}`}
            />
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

  section: { marginBottom: Spacing.four },
  sectionTitle: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, marginBottom: 6, marginLeft: 4 },
  card: { borderRadius: 20, overflow: 'hidden' },
  footer: { fontSize: 12, lineHeight: 16, marginTop: 6, marginLeft: 4 },
  pad: { padding: Spacing.three },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingVertical: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.three },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 20, fontWeight: '700' },
  nameInput: { fontSize: 18, fontWeight: '600', paddingVertical: 2 },


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
