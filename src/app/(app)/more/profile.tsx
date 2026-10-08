import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EvenGrid } from '@/components/even-grid';
import { ScreenHeader } from '@/components/screen-header';
import { Row, Section } from '@/components/settings-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CARD_COLORS, isLightColor } from '@/constants/card-styles';
import { MY_STATES } from '@/constants/my-holidays';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCategories } from '@/context/CategoriesContext';
import { usePlan } from '@/context/PlanContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useProfile } from '@/context/ProfileContext';
import { useSettings } from '@/context/SettingsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { formatDate } from '@/i18n/format';
import { formatMoney } from '@/utils/currency';
import { cycleInfo, daysToPayday, nextPayday, usesCalendarMonths } from '@/utils/cycle';
import { cycleRangeLabel, toDateKey } from '@/utils/dates';
import { snapshotOf } from '@/utils/insight-feed';

const MASK = 'RM ••••'; // i18n-ignore
const STEP = 5;

/** Who you are, how WaKira should read your finances, and shortcuts. Numbers are derived, never typed in. */
export default function ProfileScreen() {
  const colors = useTheme();
  const { t } = useT();
  const router = useRouter();
  const { user } = useAuth();
  const { displayName, setDisplayName, avatarColor, setAvatarColor } = useProfile();
  const { transactions } = useTransactions();
  const { expenseCategories } = useCategories();
  const { goals } = usePlan();
  const { hideAmounts } = usePrivacy();
  const { savingsTarget, setSavingsTarget, payday, setPayday, paydayEom, setPaydayEom, paydayAdjust, setPaydayAdjust, country, setCountry, state, setState } = useSettings();

  const [name, setName] = useState(displayName);
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));

  const snapshot = useMemo(() => snapshotOf(transactions, toDateKey(new Date())), [transactions]);
  const since = useMemo(() => {
    if (transactions.length === 0) return null;
    const earliest = transactions.reduce((min, tx) => (tx.date < min ? tx.date : min), transactions[0].date);
    const [y, m, d] = earliest.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [transactions]);

  function commitName() {
    const trimmed = name.trim();
    if (trimmed) setDisplayName(trimmed);
    else setName(displayName);
  }

  const ink = isLightColor(avatarColor) ? '#111827' : '#FFFFFF';
  const muted = { color: colors.textSecondary };
  const budgeted = expenseCategories.filter((c) => c.monthlyLimit > 0).length;
  const activeGoals = goals.filter((g) => !g.paused).length;
  const rateColor = snapshot?.rate == null ? colors.text : snapshot.rate >= savingsTarget ? colors.positive : colors.warning;

  const todayKey = toDateKey(new Date());
  const cycleKey = cycleInfo(todayKey).key;
  const paydayRange = cycleRangeLabel(cycleKey);
  const toPayday = daysToPayday(todayKey);
  const calendarMonths = usesCalendarMonths();
  const next = nextPayday(todayKey);
  const dateText = (key: string) => formatDate(new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10))));

  const stat = (label: string, value: string, color?: string) => (
    <View style={styles.statRow}>
      <ThemedText type="small" style={muted}>{label}</ThemedText>
      <ThemedText style={[styles.statValue, color ? { color } : null]}>{value}</ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader title={t('more.profile.title')} />

          <View style={styles.identity}>
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <ThemedText style={[styles.avatarLetter, { color: ink }]}>{(name || '?').charAt(0).toUpperCase()}</ThemedText>
            </View>
            <TextInput
              style={[styles.nameInput, { color: colors.text }]}
              value={name}
              onChangeText={setName}
              onEndEditing={commitName}
              placeholder={t('acct.profile.namePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              textAlign="center"
              maxLength={24}
              returnKeyType="done"
            />
            {user?.email ? <ThemedText type="small" style={muted}>{user.email}</ThemedText> : null}
            {since ? <ThemedText type="small" style={muted}>{t('acct.profile.since', { date: formatDate(since) })}</ThemedText> : null}
          </View>

          <View style={styles.swatches}>
            <EvenGrid columns={5} rowGap={12}>
              {CARD_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setAvatarColor(c)}
                  style={[styles.swatch, { backgroundColor: c }, avatarColor === c && { borderColor: colors.text }]}
                  accessibilityLabel={t('acct.profile.avatarColourA11y', { color: c })}
                />
              ))}
            </EvenGrid>
          </View>

          <Section title={t('more.profile.snap.title')} footer={snapshot ? t('more.profile.snap.sub', { n: snapshot.months }) : undefined}>
            <View style={styles.pad}>
              {snapshot ? (
                <>
                  {stat(t('more.profile.snap.income'), money(snapshot.income))}
                  {stat(t('more.profile.snap.spending'), money(snapshot.spending))}
                  {stat(t('more.profile.snap.saved'), money(snapshot.saved), snapshot.saved >= 0 ? colors.positive : colors.negative)}
                  {snapshot.rate !== null
                    ? stat(t('more.profile.snap.rate'), t('more.profile.snap.rateVs', { rate: Math.round(snapshot.rate), target: savingsTarget }), rateColor)
                    : null}
                  {stat(t('more.profile.snap.goals'), String(activeGoals))}
                  {stat(t('more.profile.snap.budgets'), String(budgeted))}
                </>
              ) : (
                <ThemedText type="small" style={muted}>{t('more.profile.snap.empty')}</ThemedText>
              )}
            </View>
          </Section>

          <Section title={t('more.profile.prefs.title')} footer={t('more.profile.targetFooter')}>
            <View style={[styles.pad, styles.targetRow]}>
              <View style={styles.flex}>
                <ThemedText>{t('more.profile.target')}</ThemedText>
                <ThemedText type="small" style={muted}>{t('more.profile.targetValue', { target: savingsTarget })}</ThemedText>
              </View>
              <Pressable
                onPress={() => setSavingsTarget(savingsTarget - STEP)}
                style={[styles.stepBtn, { backgroundColor: colors.background }]}
                accessibilityRole="button"
                accessibilityLabel={t('more.profile.targetDown')}
              >
                <Ionicons name="remove" size={20} color={colors.text} />
              </Pressable>
              <ThemedText style={styles.targetNumber}>{savingsTarget}%</ThemedText>
              <Pressable
                onPress={() => setSavingsTarget(savingsTarget + STEP)}
                style={[styles.stepBtn, { backgroundColor: colors.background }]}
                accessibilityRole="button"
                accessibilityLabel={t('more.profile.targetUp')}
              >
                <Ionicons name="add" size={20} color={colors.text} />
              </Pressable>
            </View>
          </Section>

          <Section title={t('more.profile.location')} footer={t('more.profile.locationFooter')}>
            <View style={styles.pad}>
              <ThemedText type="small" style={muted}>{t('more.profile.country')}</ThemedText>
              <View style={styles.chipWrap}>
                {(['MY', 'OTHER'] as const).map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCountry(c)}
                    style={[styles.locChip, { backgroundColor: country === c ? colors.accent : colors.background }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: country === c }}
                  >
                    <ThemedText type="small" style={{ color: country === c ? '#FFFFFF' : colors.text }}>
                      {t(c === 'MY' ? 'more.profile.countryMy' : 'more.profile.countryOther')}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
              {country === 'MY' ? (
                <>
                  <ThemedText type="small" style={[muted, styles.locLabel]}>{t('more.profile.state')}</ThemedText>
                  <View style={styles.chipWrap}>
                    <Pressable
                      onPress={() => setState(null)}
                      style={[styles.locChip, { backgroundColor: state === null ? colors.accent : colors.background }]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: state === null }}
                    >
                      <ThemedText type="small" style={{ color: state === null ? '#FFFFFF' : colors.text }}>{t('more.profile.stateAny')}</ThemedText>
                    </Pressable>
                    {MY_STATES.map((st) => (
                      <Pressable
                        key={st.code}
                        onPress={() => setState(st.code)}
                        style={[styles.locChip, { backgroundColor: state === st.code ? colors.accent : colors.background }]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: state === st.code }}
                      >
                        <ThemedText type="small" style={{ color: state === st.code ? '#FFFFFF' : colors.text }}>{st.name}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                  {state && MY_STATES.find((x) => x.code === state)?.friSat ? (
                    <ThemedText type="small" style={[muted, styles.locLabel]}>{t('more.profile.friSatNote')}</ThemedText>
                  ) : null}
                </>
              ) : null}
            </View>
          </Section>

          <Section
            title={t('more.profile.payday')}
            footer={t('more.profile.paydayFooter') + (paydayAdjust ? ' ' + t(country === 'OTHER' ? 'more.profile.paydayNoList' : state ? 'more.profile.paydayHolidaysState' : 'more.profile.paydayHolidays') : '')}
          >
            <Row
              first
              icon="calendar-number-outline"
              label={t('more.profile.paydayEom')}
              subtitle={t('more.profile.paydayEomSub')}
              right={<Switch value={paydayEom} onValueChange={setPaydayEom} trackColor={{ true: colors.accent }} />}
            />
            <Row
              icon="briefcase-outline"
              label={t('more.profile.paydayAdjust')}
              subtitle={t('more.profile.paydayAdjustSub')}
              right={<Switch value={paydayAdjust} onValueChange={setPaydayAdjust} trackColor={{ true: colors.accent }} />}
            />
            <View style={[styles.pad, styles.targetRow, paydayEom && { opacity: 0.4 }, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
              <View style={styles.flex}>
                <ThemedText>{t('more.profile.paydayDay')}</ThemedText>
                <ThemedText type="small" style={muted}>
                  {paydayEom ? t('more.profile.paydayEomValue') : payday <= 1 ? t('more.profile.paydayCalendar') : t('more.profile.paydayValue', { day: payday })}
                </ThemedText>
              </View>
              <Pressable
                disabled={paydayEom}
                onPress={() => setPayday(payday - 1)}
                style={[styles.stepBtn, { backgroundColor: colors.background }]}
                accessibilityRole="button"
                accessibilityLabel={t('more.profile.paydayDown')}
              >
                <Ionicons name="remove" size={20} color={colors.text} />
              </Pressable>
              <ThemedText style={styles.targetNumber}>{paydayEom ? '-' : payday}</ThemedText>
              <Pressable
                disabled={paydayEom}
                onPress={() => setPayday(payday + 1)}
                style={[styles.stepBtn, { backgroundColor: colors.background }]}
                accessibilityRole="button"
                accessibilityLabel={t('more.profile.paydayUp')}
              >
                <Ionicons name="add" size={20} color={colors.text} />
              </Pressable>
            </View>
            {!calendarMonths ? (
              <ThemedText type="small" style={[styles.paydayNow, muted]}>
                {next.reason
                  ? t(next.reason === 'weekend' ? 'more.profile.paydayNextWeekend' : 'more.profile.paydayNextHoliday', { date: dateText(next.date), base: dateText(next.base) })
                  : t('more.profile.paydayNext', { date: dateText(next.date) })}
                {'\n'}
                {toPayday === 0 ? t('more.profile.paydayToday', { range: paydayRange }) : t('more.profile.paydayNow', { range: paydayRange, days: toPayday })}
              </ThemedText>
            ) : null}
          </Section>

          <Section title={t('more.profile.shortcuts')}>
            <Row first icon="pie-chart-outline" label={t('acct.profile.budgets')} subtitle={t('acct.profile.budgetsSub')} onPress={() => router.push('/more/budgets')} />
            <Row icon="pricetags-outline" label={t('acct.profile.categories')} subtitle={t('acct.profile.categoriesSub')} onPress={() => router.push('/more/categories')} />
            <Row icon="lock-closed-outline" label={t('more.security.title')} subtitle={t('more.security.profile.link')} onPress={() => router.push('/more/security')} />
            <Row icon="settings-outline" label={t('acct.profile.settings')} subtitle={t('acct.profile.settingsSub')} onPress={() => router.push('/more/settings')} />
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
  identity: { alignItems: 'center', gap: 4, paddingVertical: Spacing.three },
  avatar: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  avatarLetter: { fontSize: 36, lineHeight: 42, fontWeight: '700' },
  nameInput: { fontSize: 22, fontWeight: '700', paddingVertical: 2, minWidth: 160 },
  swatches: { marginBottom: Spacing.four },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: 'transparent', alignSelf: 'center' },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7 },
  statValue: { fontSize: 16, fontWeight: '700' },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  paydayNow: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  locChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  locLabel: { marginTop: Spacing.three },
  targetNumber: { fontSize: 18, fontWeight: '700', minWidth: 52, textAlign: 'center' },
});
