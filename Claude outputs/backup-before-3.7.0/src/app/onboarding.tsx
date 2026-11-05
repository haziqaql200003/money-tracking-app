import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmountInput } from '@/components/ui/amount-input';
import { ThemedView } from '@/components/ui/themed-view';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { CARD_COLORS } from '@/constants/card-styles';
import { FALLBACK_INCOME_ID, type IconName } from '@/constants/categories';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useAuth, type Goal, type Language } from '@/context/AuthContext';
import { usePlan } from '@/context/PlanContext';
import { useSettings } from '@/context/SettingsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useTheme } from '@/hooks/use-theme';
import { setLanguage, useT, type TKey } from '@/i18n';
import { markDeviceSeen, setPendingImport } from '@/services/intro';
import { cycleOf } from '@/utils/cycle';
import { cycleRangeLabel, toDateKey } from '@/utils/dates';
import { salaryPlan } from '@/utils/setup';

type GoalChoice = Goal | 'bills';
const GOALS: { key: GoalChoice; labelKey: TKey; subKey: TKey; icon: IconName }[] = [
  { key: 'track', labelKey: 'auth.onboarding.goal.track', subKey: 'ob.goal.trackSub', icon: 'receipt-outline' },
  { key: 'budget', labelKey: 'auth.onboarding.goal.budget', subKey: 'ob.goal.budgetSub', icon: 'pie-chart-outline' },
  { key: 'save', labelKey: 'auth.onboarding.goal.save', subKey: 'ob.goal.saveSub', icon: 'trending-up-outline' },
  { key: 'debt', labelKey: 'auth.onboarding.goal.debt', subKey: 'ob.goal.debtSub', icon: 'card-outline' },
  { key: 'bills', labelKey: 'ob.goal.bills', subKey: 'ob.goal.billsSub', icon: 'calendar-outline' },
];
const PAYDAYS = [15, 20, 23, 24, 25, 26, 27, 28];
const AVATARS = CARD_COLORS.slice(0, 6);
const LANGS: { key: Language; label: string }[] = [
  { key: 'ms', label: 'Bahasa Melayu' }, // i18n-ignore
  { key: 'en', label: 'English' }, // i18n-ignore
];
const STEP_COUNT = 7; // the numbered steps between the welcome and the summary
const LAST = STEP_COUNT + 1;

const parse = (text: string) => {
  const n = parseFloat(text.replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

/**
 * The tutorial a new account goes through once, right after sign-up:
 * profile, goals, how the month is counted, salary, accounts, old records, reminders, then a summary.
 * Every step can be skipped. Nothing is saved until the last button, except the month rule (so its preview is real).
 */
export default function OnboardingScreen() {
  const colors = useTheme();
  const { t, lang } = useT();
  const { user, updateProfile } = useAuth();
  const { accounts, updateAccount, addAccount, addRecurring } = useTransactions();
  const { enableReminders, setBudgetAlerts, setDailyNudge } = usePlan();
  const settings = useSettings();
  const [, setGoalList] = usePersistedState<GoalChoice[]>('profile_goals', [], user?.id ?? null);

  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState((user?.displayName ?? '').split(' ')[0] ?? '');
  const [avatar, setAvatar] = useState(user?.avatarColor && AVATARS.includes(user.avatarColor) ? user.avatarColor : AVATARS[0]);
  const [goals, setGoals] = useState<GoalChoice[]>(['track']);
  const [salary, setSalary] = useState('');
  const [varies, setVaries] = useState(false);
  const [bank, setBank] = useState('');
  const [cash, setCash] = useState('');
  const [ewallet, setEwallet] = useState<string | null>(null);
  const [savings, setSavings] = useState<string | null>(null);
  const [wantImport, setWantImport] = useState(false);
  const [remind, setRemind] = useState({ nudge: true, bills: true, budget: false });
  const [customDay, setCustomDay] = useState('');
  const [busy, setBusy] = useState(false);

  const { calendarMonths, payday, paydayEom, paydayAdjust } = settings;
  const payMode = !calendarMonths;
  const todayKey = toDateKey(new Date());
  const range = payMode ? cycleRangeLabel(cycleOf(todayKey)) : '';
  const payWord = paydayEom ? t('ob.month.eom') : t('ob.month.dayN', { n: payday });
  const fullName = user?.fullName ?? '';
  const name = nickname.trim() || (user?.displayName ?? '');

  function toggleGoal(k: GoalChoice) {
    setGoals((g) => (g.includes(k) ? g.filter((x) => x !== k) : [...g, k]));
  }
  function pickPayday(d: number | 'eom') {
    if (d === 'eom') settings.setPaydayEom(true);
    else {
      settings.setPaydayEom(false);
      settings.setPayday(d);
    }
  }
  function choosePayMode() {
    if (!payMode) pickPayday(25);
  }

  async function finish() {
    if (busy) return;
    setBusy(true);
    const primary = (['track', 'budget', 'save', 'debt'] as Goal[]).find((g) => goals.includes(g)) ?? 'track';
    setGoalList(goals);

    if (accounts.some((a) => a.id === 'bank')) updateAccount('bank', { initialBalance: parse(bank) });
    if (accounts.some((a) => a.id === 'cash')) updateAccount('cash', { initialBalance: parse(cash) });
    if (ewallet !== null) addAccount({ name: 'E-wallet', type: 'other', typeLabel: 'E-wallet', icon: 'phone-portrait', initialBalance: parse(ewallet) }); // i18n-ignore: stored name the person can rename
    if (savings !== null) addAccount({ name: t('acct.type.savings'), type: 'savings', icon: 'shield-checkmark', initialBalance: parse(savings) });

    const plan = salaryPlan({ salary, payDay: payMode ? String(paydayEom ? 31 : payday) : '1', varies }, todayKey).plan;
    if (plan) {
      const bankAccount = accounts.find((a) => a.id === 'bank') ?? accounts[0];
      if (bankAccount) {
        addRecurring({
          title: t('auth.onboarding.salaryRecurringTitle'),
          amount: plan.amount,
          amountMode: plan.ask ? 'ask' : 'fixed',
          type: 'credit',
          categoryId: FALLBACK_INCOME_ID,
          subcategory: 'Salary',
          accountId: bankAccount.id,
          frequency: 'monthly',
          startDate: plan.startDate,
          nextDate: plan.startDate,
          active: true,
        });
      }
    }

    if (remind.nudge || remind.bills || remind.budget) {
      const allowed = await enableReminders();
      if (allowed) {
        setDailyNudge(remind.nudge);
        setBudgetAlerts(remind.budget);
      }
    }
    if (wantImport) setPendingImport();
    // The account was set up on this phone: no "welcome back" here, and the Home walkthrough runs next.
    if (user) markDeviceSeen(user.id);

    // Last: this moves the app on to Home.
    updateProfile({ displayName: name.slice(0, 24), avatarColor: avatar, language: lang, goal: primary, hasOnboarded: true });
  }

  function next() {
    if (step < LAST) setStep(step + 1);
    else void finish();
  }

  const summary: { k: string; v: string }[] = [
    { k: t('ob.sum.language'), v: lang === 'ms' ? 'Bahasa Melayu' : 'English' }, // i18n-ignore
    { k: t('ob.sum.goals'), v: goals.length ? goals.map((g) => t(GOALS.find((x) => x.key === g)!.labelKey)).join(', ') : t('ob.sum.none') },
    { k: t('ob.sum.month'), v: payMode ? `${payWord}${paydayAdjust ? t('ob.sum.earlyIfOff') : ''}` : t('ob.month.calShort') },
    { k: t('ob.sum.salary'), v: parse(salary) > 0 ? `RM ${salary}${varies ? t('ob.sum.varies') : ''}` : varies ? t('ob.sum.variesOnly') : t('ob.sum.skipped') },
    { k: t('ob.sum.accounts'), v: [t('auth.onboarding.bank'), t('auth.onboarding.cash'), ewallet !== null ? 'E-wallet' : '', savings !== null ? t('acct.type.savings') : ''].filter(Boolean).join(', ') }, // i18n-ignore
  ];

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.top}>
            {step > 0 && step < LAST + 1 ? <IconButton icon="chevron-back" onPress={() => setStep(step - 1)} label={t('common.back')} /> : <View style={styles.iconSpace} />}
            <View style={styles.segs}>
              {Array.from({ length: STEP_COUNT }, (_, i) => (
                <View key={i} style={[styles.seg, { backgroundColor: step === 0 ? 'transparent' : step > i ? colors.accent : colors.divider }]} />
              ))}
            </View>
            {step < LAST ? (
              <Pressable onPress={() => setStep(step === 0 ? LAST : step + 1)} hitSlop={8} style={styles.skip} accessibilityRole="button">
                <Text style={[Type.label, { color: colors.textSecondary }]}>{t('ob.common.skip')}</Text>
              </Pressable>
            ) : (
              <View style={styles.iconSpace} />
            )}
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {step > 0 && step < LAST ? <Text style={[Type.overline, { color: colors.accent }]}>{t('ob.common.stepOf', { n: step, total: STEP_COUNT })}</Text> : null}

            {step === 0 ? (
              <>
                <View style={[styles.hero, { backgroundColor: colors.accent }]}>
                  <View style={styles.heroBack} />
                  <View style={[styles.heroFront, { backgroundColor: colors.backgroundElement }]}>
                    <Text style={[Type.label, { color: colors.textSecondary }]}>{t('auth.onboarding.bank')}</Text>
                    {/* i18n-ignore: amount in the sample picture */}
                    <Text style={[Type.title, { color: colors.text }]}>RM 3,240.50</Text>
                  </View>
                  <View style={styles.heroPills}>
                    {(['auth.pillar.kira.label', 'auth.pillar.faham.label', 'auth.pillar.rancang.label'] as TKey[]).map((k) => (
                      <View key={k} style={[styles.heroPill, { backgroundColor: colors.backgroundElement }]}>
                        <Text style={[Type.label, { color: colors.accent }]}>{t(k)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Text style={[styles.title, { color: colors.text }]}>{t('ob.tut.hello', { name })}</Text>
                <Text style={[Type.body, { color: colors.textSecondary }]}>{t('ob.tut.helloBody')}</Text>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{t('ob.profile.title')}</Text>
                {fullName ? (
                  <View style={[styles.fromReg, { backgroundColor: colors.accentSoft }]}>
                    <View style={styles.flex}>
                      <Text style={[Type.caption, { color: colors.accent }]}>{t('ob.profile.fullName')}</Text>
                      <Text style={[Type.heading, { color: colors.text }]}>{fullName}</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                  </View>
                ) : null}
                <View style={styles.avatarRow}>
                  <View style={[styles.avatar, { backgroundColor: avatar }]}>
                    <Text style={styles.avatarText}>{(name[0] ?? 'W').toUpperCase()}</Text>
                  </View>
                  <View style={styles.swatches}>
                    {AVATARS.map((c) => (
                      <Pressable key={c} onPress={() => setAvatar(c)} style={[styles.swatch, { backgroundColor: c, borderColor: c === avatar ? colors.text : 'transparent' }]} accessibilityRole="button" accessibilityLabel={t('ob.profile.colour')} />
                    ))}
                  </View>
                </View>
                <Field label={t('ob.profile.nickname')}>
                  <TextInput value={nickname} onChangeText={setNickname} placeholder={t('ob.profile.nicknamePh')} placeholderTextColor={colors.textSecondary} maxLength={24} style={[styles.input, { color: colors.text }]} />
                </Field>
                <Field label={t('auth.register.language')}>
                  <View style={styles.twoCol}>
                    {LANGS.map((l) => {
                      const on = lang === l.key;
                      return (
                        <Pressable key={l.key} onPress={() => setLanguage(l.key)} style={[styles.choice, { backgroundColor: on ? colors.accent : colors.background }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                          <Text style={[Type.label, { color: on ? '#fff' : colors.text }]}>{l.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </Field>
                <View style={[styles.rowCard, { backgroundColor: colors.backgroundElement }]}>
                  <Text style={[Type.body, { color: colors.text, flex: 1 }]}>{t('ob.profile.currency')}</Text>
                  <Text style={[Type.label, { color: colors.accent }]}>{t('ob.profile.rm')}</Text>
                </View>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{t('ob.goal.title')}</Text>
                <Text style={[Type.body, styles.lead, { color: colors.textSecondary }]}>{t('ob.goal.body')}</Text>
                {GOALS.map((g) => {
                  const on = goals.includes(g.key);
                  return (
                    <Pressable
                      key={g.key}
                      onPress={() => toggleGoal(g.key)}
                      style={[styles.option, { backgroundColor: colors.backgroundElement, borderColor: on ? colors.accent : colors.border }]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                    >
                      <View style={[styles.optIcon, { backgroundColor: colors.accentSoft }]}>
                        <Ionicons name={g.icon} size={20} color={colors.accent} />
                      </View>
                      <View style={styles.flex}>
                        <Text style={[Type.heading, { color: colors.text }]}>{t(g.labelKey)}</Text>
                        <Text style={[Type.label, { color: colors.textSecondary, fontWeight: '500' }]}>{t(g.subKey)}</Text>
                      </View>
                      <Ionicons name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? colors.accent : colors.textSecondary} />
                    </Pressable>
                  );
                })}
              </>
            ) : null}

            {step === 3 ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{t('ob.month.title')}</Text>
                <Text style={[Type.body, styles.lead, { color: colors.textSecondary }]}>{t('ob.month.body')}</Text>
                <View style={styles.twoCol}>
                  <Pressable onPress={settings.setCalendarMonths} style={[styles.bigChoice, { backgroundColor: colors.backgroundElement, borderColor: !payMode ? colors.accent : colors.border }]} accessibilityRole="button" accessibilityState={{ selected: !payMode }}>
                    <Text style={[styles.bigNum, { color: colors.accent }]}>{t('ob.month.first')}</Text>
                    <Text style={[Type.label, { color: colors.text }]}>{t('more.profile.mode.month')}</Text>
                  </Pressable>
                  <Pressable onPress={choosePayMode} style={[styles.bigChoice, { backgroundColor: colors.backgroundElement, borderColor: payMode ? colors.accent : colors.border }]} accessibilityRole="button" accessibilityState={{ selected: payMode }}>
                    <Text style={[styles.bigNum, { color: colors.accent }]}>{payMode ? payWord : '25'}</Text>
                    <Text style={[Type.label, { color: colors.text }]}>{t('more.profile.mode.payday')}</Text>
                  </Pressable>
                </View>
                {payMode ? (
                  <View style={[styles.box, { backgroundColor: colors.backgroundElement }]}>
                    <Text style={[Type.label, { color: colors.text }]}>{t('ob.month.paidOn')}</Text>
                    <View style={styles.dayGrid}>
                      {PAYDAYS.map((d) => {
                        const on = !paydayEom && payday === d;
                        return (
                          <Pressable key={d} onPress={() => pickPayday(d)} style={[styles.day, { backgroundColor: on ? colors.accent : colors.background }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                            <Text style={[Type.label, { color: on ? '#fff' : colors.text }]}>{d}</Text>
                          </Pressable>
                        );
                      })}
                      <Pressable onPress={() => pickPayday('eom')} style={[styles.day, styles.dayWide, { backgroundColor: paydayEom ? colors.accent : colors.background }]} accessibilityRole="button" accessibilityState={{ selected: paydayEom }}>
                        <Text style={[Type.label, { color: paydayEom ? '#fff' : colors.text }]}>{t('ob.month.eomShort')}</Text>
                      </Pressable>
                    </View>
                    <View style={styles.customRow}>
                      <Text style={[Type.label, { color: colors.textSecondary, flex: 1, fontWeight: '500' }]}>{t('ob.month.otherDay')}</Text>
                      <TextInput
                        value={customDay}
                        onChangeText={(v) => {
                          const clean = v.replace(/\D/g, '').slice(0, 2);
                          setCustomDay(clean);
                          const n = Number(clean);
                          if (n >= 1 && n <= 28) pickPayday(n);
                        }}
                        placeholder="1-28"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="number-pad"
                        maxLength={2}
                        style={[styles.dayInput, { color: colors.text, backgroundColor: colors.background }]}
                      />
                    </View>
                    <View style={[styles.switchRow, { backgroundColor: colors.background }]}>
                      <View style={styles.flex}>
                        <Text style={[Type.label, { color: colors.text }]}>{t('ob.month.adjust')}</Text>
                        <Text style={[Type.caption, { color: colors.textSecondary }]}>{t('ob.month.adjustSub')}</Text>
                      </View>
                      <Switch value={paydayAdjust} onValueChange={settings.setPaydayAdjust} trackColor={{ true: colors.accent }} />
                    </View>
                    {range ? (
                      <View style={[styles.preview, { backgroundColor: colors.accentSoft }]}>
                        <Ionicons name="calendar-outline" size={16} color={colors.accent} />
                        <Text style={[Type.label, { color: colors.accent }]}>{t('ob.month.preview', { range })}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <Text style={[Type.label, { color: colors.textSecondary, fontWeight: '500' }]}>{t('ob.month.calNote')}</Text>
                )}
              </>
            ) : null}

            {step === 4 ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{t('auth.onboarding.salaryTitle')}</Text>
                <Text style={[Type.body, styles.lead, { color: colors.textSecondary }]}>{t('ob.salary.body', { when: payMode ? payWord : t('ob.month.calShort') })}</Text>
                <Field label={t('auth.onboarding.netSalary')}>
                  <View style={styles.moneyRow}>
                    {/* i18n-ignore: amount in the sample picture */}
                    <Text style={[Type.heading, { color: colors.textSecondary }]}>RM</Text>
                    <AmountInput value={salary} onChange={setSalary} placeholder="0.00" placeholderTextColor={colors.textSecondary} style={[styles.bigInput, { color: colors.text }]} />
                  </View>
                </Field>
                <View style={[styles.switchRow, { backgroundColor: colors.backgroundElement }]}>
                  <View style={styles.flex}>
                    <Text style={[Type.heading, { color: colors.text }]}>{t('auth.onboarding.salaryVaries')}</Text>
                    <Text style={[Type.label, { color: colors.textSecondary, fontWeight: '500' }]}>{t('ob.salary.variesSub')}</Text>
                  </View>
                  <Switch value={varies} onValueChange={setVaries} trackColor={{ true: colors.accent }} />
                </View>
                <View style={[styles.preview, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="lock-closed-outline" size={16} color={colors.accent} />
                  <Text style={[Type.label, { color: colors.accent, flex: 1, fontWeight: '500' }]}>{t('ob.salary.private')}</Text>
                </View>
              </>
            ) : null}

            {step === 5 ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{t('ob.acct.title')}</Text>
                <Text style={[Type.body, styles.lead, { color: colors.textSecondary }]}>{t('ob.acct.body')}</Text>
                <AccountRow icon="business" tint="#E6EAF7" label={t('auth.onboarding.bank')} hint={t('ob.acct.bankHint')} value={bank} onChange={(v) => setBank(v ?? '')} />
                <AccountRow icon="cash" tint="#FFF1DC" label={t('auth.onboarding.cash')} hint={t('ob.acct.cashHint')} value={cash} onChange={(v) => setCash(v ?? '')} />
                <AccountRow icon="phone-portrait" tint="#E3F2EA" label="E-wallet" hint={t('ob.acct.ewalletHint')} value={ewallet} onChange={setEwallet} optional />{/* i18n-ignore */}
                <AccountRow icon="shield-checkmark" tint="#F1E6F7" label={t('acct.type.savings')} hint={t('ob.acct.savingsHint')} value={savings} onChange={setSavings} optional />
                <View style={[styles.preview, { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.divider }]}>
                  <Ionicons name="add" size={18} color={colors.accent} />
                  <Text style={[Type.label, { color: colors.accent, flex: 1 }]}>{t('ob.acct.more')}</Text>
                </View>
              </>
            ) : null}

            {step === 6 ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{t('ob.hist.title')}</Text>
                <Text style={[Type.body, styles.lead, { color: colors.textSecondary }]}>{t('ob.hist.body')}</Text>
                <Pressable
                  onPress={() => {
                    setWantImport(true);
                    setStep(7);
                  }}
                  style={[styles.bigOption, { backgroundColor: colors.accent }]}
                  accessibilityRole="button"
                >
                  <View style={[styles.bigIcon, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
                    <Ionicons name="document-text-outline" size={24} color="#fff" />
                  </View>
                  <View style={styles.flex}>
                    <Text style={[Type.heading, { color: '#fff' }]}>{t('ob.hist.import')}</Text>
                    <Text style={[Type.label, { color: 'rgba(255,255,255,0.85)', fontWeight: '500' }]}>{t('ob.hist.importSub')}</Text>
                  </View>
                  {wantImport ? <Ionicons name="checkmark-circle" size={24} color="#fff" /> : null}
                </Pressable>
                <Pressable
                  onPress={() => {
                    setWantImport(false);
                    setStep(7);
                  }}
                  style={[styles.bigOption, { backgroundColor: colors.backgroundElement, borderWidth: 1.5, borderColor: colors.border }]}
                  accessibilityRole="button"
                >
                  <View style={[styles.bigIcon, { backgroundColor: colors.accentSoft }]}>
                    <Ionicons name="add" size={24} color={colors.accent} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={[Type.heading, { color: colors.text }]}>{t('ob.hist.fresh')}</Text>
                    <Text style={[Type.label, { color: colors.textSecondary, fontWeight: '500' }]}>{t('ob.hist.freshSub')}</Text>
                  </View>
                </Pressable>
              </>
            ) : null}

            {step === 7 ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{t('ob.remind.title')}</Text>
                <Text style={[Type.body, styles.lead, { color: colors.textSecondary }]}>{t('ob.remind.body')}</Text>
                {(
                  [
                    ['nudge', 'ob.remind.nudge', 'ob.remind.nudgeSub'],
                    ['bills', 'ob.remind.bills', 'ob.remind.billsSub'],
                    ['budget', 'ob.remind.budget', 'ob.remind.budgetSub'],
                  ] as const
                ).map(([k, label, sub]) => (
                  <View key={k} style={[styles.switchRow, { backgroundColor: colors.backgroundElement }]}>
                    <View style={styles.flex}>
                      <Text style={[Type.heading, { color: colors.text }]}>{t(label)}</Text>
                      <Text style={[Type.label, { color: colors.textSecondary, fontWeight: '500' }]}>{t(sub)}</Text>
                    </View>
                    <Switch value={remind[k]} onValueChange={(v) => setRemind((r) => ({ ...r, [k]: v }))} trackColor={{ true: colors.accent }} />
                  </View>
                ))}
                <Text style={[Type.caption, { color: colors.textSecondary }]}>{t('ob.remind.permission')}</Text>
              </>
            ) : null}

            {step === LAST ? (
              <>
                <View style={[styles.avatar, { backgroundColor: avatar, marginTop: Spacing.three }]}>
                  <Text style={styles.avatarText}>{(name[0] ?? 'W').toUpperCase()}</Text>
                </View>
                <Text style={[styles.title, { color: colors.text }]}>{t('ob.sum.title', { name })}</Text>
                <View style={[styles.sumCard, { backgroundColor: colors.backgroundElement }]}>
                  {summary.map((r, i) => (
                    <View key={r.k} style={[styles.sumRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
                      <Text style={[Type.label, { color: colors.textSecondary, fontWeight: '500' }]}>{r.k}</Text>
                      <Text style={[Type.label, { color: colors.text, flex: 1, textAlign: 'right' }]}>{r.v}</Text>
                    </View>
                  ))}
                </View>
                <Text style={[Type.label, { color: colors.textSecondary, fontWeight: '500' }]}>{wantImport ? t('ob.sum.nextImport') : t('ob.sum.next')}</Text>
              </>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            {step !== 6 ? (
              <Button
                label={step === 0 ? t('ob.tut.start') : step === LAST ? t('ob.sum.go') : step === LAST - 1 ? t('ob.common.done') : t('ob.common.continue')}
                onPress={next}
                loading={busy}
              />
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={[styles.field, { backgroundColor: colors.backgroundElement }]}>
      <Text style={[Type.caption, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

/** One account in the tutorial. `optional` ones are ticked on or off; when off, value is null. */
function AccountRow({ icon, tint, label, hint, value, onChange, optional }: { icon: IconName; tint: string; label: string; hint: string; value: string | null; onChange: (v: string | null) => void; optional?: boolean }) {
  const colors = useTheme();
  const { t } = useT();
  const on = value !== null;
  return (
    <View style={[styles.acct, { backgroundColor: colors.backgroundElement, borderColor: on ? colors.accent : colors.border }]}>
      <Pressable
        disabled={!optional}
        onPress={() => onChange(on ? null : '')}
        style={styles.acctHead}
        accessibilityRole={optional ? 'checkbox' : undefined}
        accessibilityState={optional ? { checked: on } : undefined}
      >
        <View style={[styles.optIcon, { backgroundColor: tint }]}>
          <Ionicons name={icon} size={18} color="#141A2E" />
        </View>
        <Text style={[Type.heading, { color: colors.text, flex: 1 }]}>{label}</Text>
        {optional ? <Ionicons name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? colors.accent : colors.textSecondary} /> : null}
      </Pressable>
      {on ? (
        <View style={[styles.acctInput, { backgroundColor: colors.background }]}>
          <Text style={[Type.caption, { color: colors.textSecondary, flex: 1 }]}>{hint}</Text>
          {/* i18n-ignore: amount in the sample picture */}
          <Text style={[Type.label, { color: colors.textSecondary }]}>RM</Text>
          <AmountInput
            value={value ?? ''}
            onChange={onChange}
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel={t('ob.acct.balanceOf', { name: label })}
            style={[styles.acctAmount, { color: colors.text }]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.four, paddingTop: Spacing.two, minHeight: 52 },
  iconSpace: { width: 44, height: 44 },
  segs: { flex: 1, flexDirection: 'row', gap: 4, justifyContent: 'center' },
  seg: { flex: 1, maxWidth: 30, height: 5, borderRadius: Radius.xs },
  skip: { minWidth: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.four, gap: 12 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5 },
  lead: { marginTop: -4 },
  hero: { height: 260, borderRadius: Radius.xl, overflow: 'hidden', padding: Spacing.four, justifyContent: 'flex-end', marginBottom: Spacing.two },
  heroBack: { position: 'absolute', left: 28, top: 30, width: 200, height: 122, borderRadius: 20, backgroundColor: '#5B73E8', transform: [{ rotate: '-8deg' }] },
  heroFront: { position: 'absolute', left: 92, top: 50, width: 210, height: 128, borderRadius: 20, padding: 16, justifyContent: 'space-between', transform: [{ rotate: '5deg' }] },
  heroPills: { flexDirection: 'row', gap: 8 },
  heroPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill },
  fromReg: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: Radius.md },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 4 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  swatches: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 3 },
  field: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three, paddingVertical: 12, gap: 6 },
  input: { fontSize: 18, fontWeight: '700', paddingVertical: 4 },
  twoCol: { flexDirection: 'row', gap: 10 },
  choice: { flex: 1, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  rowCard: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, padding: Spacing.three },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Radius.lg, borderWidth: 2, padding: 14 },
  optIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bigChoice: { flex: 1, height: 104, borderRadius: Radius.lg, borderWidth: 2, padding: 14, justifyContent: 'space-between' },
  bigNum: { fontSize: 24, fontWeight: '800' },
  box: { borderRadius: Radius.lg, padding: Spacing.three, gap: 12 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  day: { width: '22%', flexGrow: 1, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  dayWide: { width: '100%' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayInput: { width: 72, height: 44, borderRadius: Radius.md, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Radius.lg, padding: 14 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: Radius.md },
  moneyRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  bigInput: { flex: 1, fontSize: 28, fontWeight: '800', paddingVertical: 2 },
  acct: { borderRadius: Radius.lg, borderWidth: 2 },
  acctHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 58 },
  acctInput: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 12, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.md },
  acctAmount: { width: 100, textAlign: 'right', fontSize: 17, fontWeight: '800', paddingVertical: 4 },
  bigOption: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: Radius.lg, padding: 16, minHeight: 84 },
  bigIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  sumCard: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12 },
  footer: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.three },
});
