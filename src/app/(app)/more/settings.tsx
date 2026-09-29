import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const THEMES: { key: ThemePreference; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
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
  const { displayName, setDisplayName, avatarColor } = useProfile();
  const { hideAmounts, toggleHideAmounts } = usePrivacy();
  const { themePreference, setThemePreference, warnPercent, setWarnPercent, dailyLimit, setDailyLimit } = useSettings();
  const { transactions, accounts, resetAllData } = useTransactions();
  const { getCategory, resetCategories } = useCategories();

  const { user, signOut, deleteAccount, updateProfile } = useAuth();

  function confirmDelete() {
    Alert.alert('Padam akaun?', 'Akaun dan semua data anda dipadam kekal. Tindakan ini tidak boleh dibatalkan.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Padam', style: 'destructive', onPress: () => deleteAccount() },
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
      Alert.alert('Nothing to export', 'You have no transactions yet.');
      return;
    }
    const csv = toCsv(
      [...transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
      (id) => accounts.find((a) => a.id === id)?.name ?? id,
      (id) => getCategory(id)?.name ?? id,
    );
    try {
      await Share.share({ message: csv, title: 'transactions.csv' });
    } catch {
      // sheet dismissed
    }
  }

  function confirmReset() {
    Alert.alert(
      'Reset all data?',
      'This clears every transaction, account, category and budget back to the sample data. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetAllData();
            resetCategories();
          },
        },
      ],
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader title="Settings" />

          <Section title="Profile">
            <View style={styles.nameRow}>
              <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                <ThemedText style={[styles.avatarLetter, { color: isLightColor(avatarColor) ? '#111827' : '#FFFFFF' }]}>{(name || '?').charAt(0).toUpperCase()}</ThemedText>
              </View>
              <View style={styles.flex}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  Display name
                </ThemedText>
                <TextInput
                  style={[styles.nameInput, { color: colors.text }]}
                  value={name}
                  onChangeText={setName}
                  onEndEditing={commitName}
                  placeholder="Your name"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                  maxLength={24}
                />
              </View>
            </View>
          </Section>

          <Section title="Akaun">
            <Row first icon="mail-outline" label="Email" value={user?.email} />
            <Row icon="school-outline" label="Ulang tutorial" onPress={() => updateProfile({ hasOnboarded: false })} />
            <Row icon="log-out-outline" label="Log keluar" onPress={signOut} />
            <Row icon="trash-outline" label="Padam akaun" subtitle="Padam semua data anda" danger onPress={confirmDelete} />
          </Section>

          <Section title="Appearance">
            <View style={styles.pad}>
              <View style={[styles.segmentTrack, { backgroundColor: colors.background }]}>
                {THEMES.map((t) => (
                  <Pressable
                    key={t.key}
                    style={[styles.segmentButton, themePreference === t.key && { backgroundColor: colors.backgroundElement }]}
                    onPress={() => setThemePreference(t.key)}
                  >
                    <ThemedText
                      type="small"
                      style={themePreference === t.key ? { fontWeight: '600' } : { color: colors.textSecondary }}
                    >
                      {t.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          </Section>

          <Section title="Privacy" footer="Masks balances and amounts on Home, Transactions, Assets and Budgets.">
            <Row
              first
              icon="eye-off-outline"
              label="Hide amounts"
              right={
                <Switch
                  value={hideAmounts}
                  onValueChange={toggleHideAmounts}
                  trackColor={{ true: colors.accent }}
                />
              }
            />
          </Section>

          <Section title="Budgets" footer="A budget is flagged as “Nearing limit” once you have used this much of it.">
            <View style={styles.pad}>
              <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.two }}>
                Warn me at
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
                Daily spending limit
              </ThemedText>
              <View style={styles.dailyLimitRow}>
                <View style={[styles.dailyLimitInputWrap, { backgroundColor: colors.background, borderColor: colors.divider }]}>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    RM
                  </ThemedText>
                  <TextInput
                    style={[styles.dailyLimitInput, { color: colors.text }]}
                    placeholder="Off"
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
                {dailyLimit > 0
                  ? `Shown as a line on your weekly spending chart on Home.`
                  : 'Off — no line shown on the chart.'}
              </ThemedText>
            </View>
          </Section>

          <Section title="General">
            <Row first icon="cash-outline" label="Currency" value="MYR (RM)" />
            <Row icon="calendar-outline" label="Week starts on" value="Monday" />
          </Section>

          <Section title="Data">
            <Row first icon="download-outline" label="Export all transactions" subtitle="Share as CSV" onPress={exportAll} />
            <Row icon="trash-outline" label="Reset all data" subtitle="Back to sample data" danger onPress={confirmReset} />
          </Section>

          <Section title="About">
            <Row
              first
              icon="information-circle-outline"
              label="Money Tracker"
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

  segmentTrack: { flexDirection: 'row', borderRadius: 10, padding: 3 },
  segmentButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },

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