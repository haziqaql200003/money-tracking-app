import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { APP_NAME, MOTTO, PILLARS } from '@/constants/brand';
import { FALLBACK_INCOME_ID, type IconName } from '@/constants/categories';
import { GOAL_PRESETS } from '@/constants/goals';
import { Spacing } from '@/constants/theme';
import { useAuth, type Goal } from '@/context/AuthContext';
import { usePlan } from '@/context/PlanContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { toDateKey } from '@/utils/dates';
import { salaryPlan } from '@/utils/setup';

const GOALS: { key: Goal; labelKey: TKey; icon: IconName }[] = [
  { key: 'track', labelKey: 'auth.onboarding.goal.track', icon: 'receipt-outline' },
  { key: 'budget', labelKey: 'auth.onboarding.goal.budget', icon: 'pie-chart-outline' },
  { key: 'save', labelKey: 'auth.onboarding.goal.save', icon: 'trending-up-outline' },
  { key: 'debt', labelKey: 'auth.onboarding.goal.debt', icon: 'card-outline' },
];

const TIPS: { icon: IconName; titleKey: TKey; bodyKey: TKey }[] = [
  { icon: 'add-circle', titleKey: 'auth.onboarding.tip.add.title', bodyKey: 'auth.onboarding.tip.add.body' },
  { icon: 'swap-horizontal', titleKey: 'auth.onboarding.tip.cards.title', bodyKey: 'auth.onboarding.tip.cards.body' },
  { icon: 'bar-chart', titleKey: 'auth.onboarding.tip.analyse.title', bodyKey: 'auth.onboarding.tip.analyse.body' },
  { icon: 'flag', titleKey: 'auth.onboarding.tip.plan.title', bodyKey: 'auth.onboarding.tip.plan.body' },
  { icon: 'repeat', titleKey: 'auth.onboarding.tip.recurring.title', bodyKey: 'auth.onboarding.tip.recurring.body' },
  { icon: 'wallet', titleKey: 'auth.onboarding.tip.assets.title', bodyKey: 'auth.onboarding.tip.assets.body' },
  { icon: 'pie-chart', titleKey: 'auth.onboarding.tip.budgets.title', bodyKey: 'auth.onboarding.tip.budgets.body' },
  { icon: 'notifications', titleKey: 'auth.onboarding.tip.reminders.title', bodyKey: 'auth.onboarding.tip.reminders.body' },
  { icon: 'eye-off', titleKey: 'auth.onboarding.tip.privacy.title', bodyKey: 'auth.onboarding.tip.privacy.body' },
  { icon: 'download', titleKey: 'auth.onboarding.tip.data.title', bodyKey: 'auth.onboarding.tip.data.body' },
];

const PILLAR_ICON: Record<(typeof PILLARS)[number]['key'], IconName> = {
  kira: 'create-outline',
  faham: 'analytics-outline',
  rancang: 'flag-outline',
};

export default function OnboardingScreen() {
  const colors = useTheme();
  const { t } = useT();
  const { user, updateProfile } = useAuth();
  const { accounts, updateAccount, addRecurring } = useTransactions();
  const { addGoal } = usePlan();

  // Langkah setup hanya untuk pengguna baru. "Ulang tutorial" terus ke tips.
  const firstTime = !user?.goal;
  const steps = firstTime ? ['welcome', 'setup', 'plan', 'tips'] : ['tips'];
  const [index, setIndex] = useState(0);
  const step = steps[index];

  const [goal, setGoal] = useState<Goal>('track');
  const [bank, setBank] = useState('');
  const [cash, setCash] = useState('');
  // Langkah "plan": semua pilihan. Tiada apa yang disimpan sehingga "Mula guna" ditekan.
  const [salary, setSalary] = useState('');
  const [payDay, setPayDay] = useState('');
  const [salaryVaries, setSalaryVaries] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');

  const isLast = index === steps.length - 1;

  const parse = (text: string) => {
    const n = parseFloat(text.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  const salaryResult = salaryPlan({ salary, payDay, varies: salaryVaries }, toDateKey(new Date()));
  const planInvalid = salaryResult.invalid;
  const goalTargetValue = parse(goalTarget);
  const wantsGoal = goal === 'save' && goalName.trim().length > 0 && goalTargetValue > 0;

  function applyPlan() {
    if (salaryResult.plan) {
      const bankAccount = accounts.find((a) => a.id === 'bank') ?? accounts[0];
      if (bankAccount) {
        addRecurring({
          title: t('auth.onboarding.salaryRecurringTitle'),
          amount: salaryResult.plan.amount,
          amountMode: salaryResult.plan.ask ? 'ask' : 'fixed',
          type: 'credit',
          categoryId: FALLBACK_INCOME_ID,
          subcategory: 'Salary',
          accountId: bankAccount.id,
          frequency: 'monthly',
          startDate: salaryResult.plan.startDate,
          nextDate: salaryResult.plan.startDate,
          active: true,
        });
      }
    }
    if (wantsGoal) {
      const look = GOAL_PRESETS[0];
      addGoal({ name: goalName.trim(), target: Math.round(goalTargetValue * 100) / 100, icon: look.icon as string, color: look.color });
    }
  }

  function next() {
    if (step === 'setup') {
      if (accounts.some((a) => a.id === 'bank')) updateAccount('bank', { initialBalance: parse(bank) });
      if (accounts.some((a) => a.id === 'cash')) updateAccount('cash', { initialBalance: parse(cash) });
    }
    if (step === 'plan' && planInvalid) return;
    if (!isLast) return setIndex(index + 1);
    // Hanya di sini: kalau pengguna keluar di tengah jalan, tiada gaji atau matlamat yang tinggal separuh.
    if (firstTime) applyPlan();
    updateProfile({ goal: user?.goal ?? goal, hasOnboarded: true });
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.dots}>
          {steps.map((s, i) => (
            <View key={s} style={[styles.dot, { backgroundColor: i === index ? colors.accent : colors.divider }, i === index && styles.dotActive]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 'welcome' ? (
            <>
              <View style={[styles.hero, { backgroundColor: `${colors.accent}26` }]}>
                <Ionicons name="sparkles" size={40} color={colors.accent} />
              </View>
              <ThemedText style={styles.title}>{t('auth.onboarding.hello', { name: user?.displayName ?? '' })}</ThemedText>
              <ThemedText style={[styles.motto, { color: colors.accent }]}>{MOTTO}</ThemedText>
              <ThemedText style={{ color: colors.textSecondary }}>
                {t('auth.onboarding.welcomeBody', { app: APP_NAME })}
              </ThemedText>

              <View style={styles.pillars}>
                {PILLARS.map((p) => (
                  <View key={p.key} style={[styles.pillar, { backgroundColor: colors.backgroundElement }]}>
                    <View style={[styles.tipIcon, { backgroundColor: `${colors.accent}26` }]}>
                      <Ionicons name={PILLAR_ICON[p.key]} size={20} color={colors.accent} />
                    </View>
                    <View style={styles.flex}>
                      <ThemedText type="smallBold">{t(p.labelKey)}</ThemedText>
                      <ThemedText type="small" style={{ color: colors.textSecondary }}>{t(p.hintKey)}</ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {step === 'setup' ? (
            <>
              <ThemedText style={styles.title}>{t('auth.onboarding.goalTitle')}</ThemedText>
              <View style={styles.goalGrid}>
                {GOALS.map((g) => {
                  const active = goal === g.key;
                  return (
                    <Pressable
                      key={g.key}
                      onPress={() => setGoal(g.key)}
                      style={[styles.goal, { backgroundColor: colors.backgroundElement, borderColor: active ? colors.accent : colors.divider, borderWidth: active ? 2 : 1 }]}
                    >
                      <Ionicons name={g.icon} size={24} color={active ? colors.accent : colors.textSecondary} />
                      <ThemedText type="small" style={{ fontWeight: active ? '700' : '500', textAlign: 'center' }}>
                        {t(g.labelKey)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <ThemedText style={[styles.title, { marginTop: Spacing.four }]}>{t('auth.onboarding.balanceTitle')}</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.three }}>
                {t('auth.onboarding.balanceBody')}
              </ThemedText>
              {[
                { id: 'bank', label: t('auth.onboarding.bank'), value: bank, set: setBank },
                { id: 'cash', label: t('auth.onboarding.cash'), value: cash, set: setCash },
              ].map((f) => (
                <View key={f.id} style={[styles.balanceRow, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
                  <ThemedText style={styles.flex}>{f.label}</ThemedText>
                  {/* i18n-ignore */}
<ThemedText type="small" style={{ color: colors.textSecondary }}>RM</ThemedText>
                  <TextInput
                    value={f.value}
                    onChangeText={f.set}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                    style={[styles.balanceInput, { color: colors.text }]}
                  />
                </View>
              ))}
            </>
          ) : null}

          {step === 'plan' ? (
            <>
              <ThemedText style={styles.title}>{t('auth.onboarding.salaryTitle')}</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.three }}>
                {t('auth.onboarding.salaryBody')}
              </ThemedText>
              <View style={[styles.balanceRow, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
                <ThemedText style={styles.flex}>{t('auth.onboarding.netSalary')}</ThemedText>
                {/* i18n-ignore */}
<ThemedText type="small" style={{ color: colors.textSecondary }}>RM</ThemedText>
                <TextInput
                  value={salary}
                  onChangeText={setSalary}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  style={[styles.balanceInput, { color: colors.text }]}
                />
              </View>
              <View style={[styles.balanceRow, { backgroundColor: colors.backgroundElement, borderColor: planInvalid ? colors.negative : colors.divider }]}>
                <ThemedText style={styles.flex}>{t('auth.onboarding.payDay')}</ThemedText>
                <TextInput
                  value={payDay}
                  onChangeText={setPayDay}
                  placeholder="25"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={[styles.balanceInput, styles.dayInput, { color: colors.text }]}
                />
              </View>
              {planInvalid ? (
                <ThemedText type="small" style={{ color: colors.negative, marginBottom: Spacing.two }}>
                  {t('auth.onboarding.payDayInvalid')}
                </ThemedText>
              ) : null}
              <View style={[styles.balanceRow, styles.switchRow, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
                <View style={styles.flex}>
                  <ThemedText>{t('auth.onboarding.salaryVaries')}</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    {t('auth.onboarding.salaryVariesHint')}
                  </ThemedText>
                </View>
                <Switch value={salaryVaries} onValueChange={setSalaryVaries} trackColor={{ true: colors.accent }} />
              </View>

              {goal === 'save' ? (
                <>
                  <ThemedText style={[styles.title, { marginTop: Spacing.four }]}>{t('auth.onboarding.goalSectionTitle')}</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.three }}>
                    {t('auth.onboarding.goalSectionBody')}
                  </ThemedText>
                  <View style={[styles.balanceRow, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
                    <TextInput
                      value={goalName}
                      onChangeText={setGoalName}
                      placeholder={t('auth.onboarding.goalNamePlaceholder')}
                      placeholderTextColor={colors.textSecondary}
                      maxLength={40}
                      style={[styles.balanceInput, styles.nameInput, { color: colors.text }]}
                    />
                  </View>
                  <View style={[styles.balanceRow, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
                    <ThemedText style={styles.flex}>{t('auth.onboarding.goalTarget')}</ThemedText>
                    {/* i18n-ignore */}
<ThemedText type="small" style={{ color: colors.textSecondary }}>RM</ThemedText>
                    <TextInput
                      value={goalTarget}
                      onChangeText={setGoalTarget}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                      style={[styles.balanceInput, { color: colors.text }]}
                    />
                  </View>
                </>
              ) : (
                <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: Spacing.three }}>
                  {goal === 'budget'
                    ? t('auth.onboarding.hintBudget')
                    : goal === 'debt'
                      ? t('auth.onboarding.hintDebt')
                      : t('auth.onboarding.hintDefault')}
                </ThemedText>
              )}
            </>
          ) : null}

          {step === 'tips' ? (
            <>
              <ThemedText style={styles.title}>{t('auth.onboarding.tipsTitle')}</ThemedText>
              {TIPS.map((tip) => (
                <View key={tip.titleKey} style={[styles.tip, { backgroundColor: colors.backgroundElement }]}>
                  <View style={[styles.tipIcon, { backgroundColor: `${colors.accent}26` }]}>
                    <Ionicons name={tip.icon} size={20} color={colors.accent} />
                  </View>
                  <View style={styles.flex}>
                    <ThemedText type="smallBold">{t(tip.titleKey)}</ThemedText>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>{t(tip.bodyKey)}</ThemedText>
                  </View>
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={next} style={[styles.button, { backgroundColor: colors.accent }]}>
            <ThemedText style={styles.buttonText}>{isLast ? t('auth.onboarding.start') : t('auth.onboarding.next')}</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: Spacing.three },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 18 },
  content: { padding: Spacing.four, gap: Spacing.two },
  hero: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: Spacing.four },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700', marginBottom: Spacing.two },
  motto: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  pillars: { gap: Spacing.two, marginTop: Spacing.three },
  pillar: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: Spacing.three },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  goal: { width: '48%', borderRadius: 16, padding: Spacing.three, alignItems: 'center', gap: 8 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.three, marginBottom: Spacing.two },
  balanceInput: { width: 110, fontSize: 16, paddingVertical: 14, textAlign: 'right' },
  dayInput: { width: 56 },
  nameInput: { flex: 1, width: undefined, textAlign: 'left' },
  switchRow: { paddingVertical: Spacing.two },
  tip: { flexDirection: 'row', gap: 12, borderRadius: 16, padding: Spacing.three, marginBottom: Spacing.two },
  tipIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: Spacing.four },
  button: { padding: 16, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});