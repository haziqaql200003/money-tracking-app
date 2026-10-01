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
import { toDateKey } from '@/utils/dates';
import { salaryPlan } from '@/utils/setup';

const GOALS: { key: Goal; label: string; icon: IconName }[] = [
  { key: 'track', label: 'Jejak perbelanjaan', icon: 'receipt-outline' },
  { key: 'budget', label: 'Urus bajet', icon: 'pie-chart-outline' },
  { key: 'save', label: 'Kumpul simpanan', icon: 'trending-up-outline' },
  { key: 'debt', label: 'Kurangkan hutang', icon: 'card-outline' },
];

const TIPS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'add-circle', title: 'Tambah rekod', body: 'Tekan butang + di tengah bar bawah untuk rekod perbelanjaan, pendapatan atau pindahan antara akaun. Boleh pecahkan kepada item (cth. nasi lemak, SST).' },
  { icon: 'swap-horizontal', title: 'Kad akaun', body: 'Di Home, leret kad ke tepi untuk tukar akaun. Carta dan senarai di bawah akan ikut akaun yang dipilih.' },
  { icon: 'bar-chart', title: 'Analyse (Faham)', body: 'Tab Analyse tunjuk pendapatan vs perbelanjaan setiap bulan, ke mana wang pergi, hari paling boros dan beberapa ringkasan ringkas.' },
  { icon: 'flag', title: 'Rancang', body: 'More > Rancang: sasaran simpanan, bil akan datang dan peringatan di satu tempat. Bajet juga boleh dilihat dari sini.' },
  { icon: 'repeat', title: 'Berulang', body: 'More > Recurring: gaji, sewa atau langganan direkod sendiri pada tarikhnya. Pilih "Confirm each time" kalau jumlahnya berubah-ubah (cth. bil elektrik).' },
  { icon: 'wallet', title: 'Aset & pindahan', body: 'More > Assets: semua akaun dan jumlah nilai bersih. Pindah wang antara akaun tidak dikira sebagai perbelanjaan atau pendapatan.' },
  { icon: 'pie-chart', title: 'Bajet', body: 'More > Budgets: letak had bulanan setiap kategori dan lihat berapa selamat dibelanjakan sehari.' },
  { icon: 'notifications', title: 'Peringatan', body: 'More > Rancang > Reminders: hidupkan notifikasi untuk bil yang hampir tiba dan amaran bila bajet hampir habis. Anda yang pilih, dan boleh dimatikan bila-bila masa.' },
  { icon: 'eye-off', title: 'Privasi', body: 'Tekan ikon mata untuk sembunyikan semua jumlah bila di tempat awam.' },
  { icon: 'download', title: 'Data anda', body: 'More > Settings: eksport CSV, ulang tutorial, atau padam akaun dan semua data anda.' },
];

const PILLAR_ICON: Record<(typeof PILLARS)[number]['key'], IconName> = {
  kira: 'create-outline',
  faham: 'analytics-outline',
  rancang: 'flag-outline',
};

export default function OnboardingScreen() {
  const colors = useTheme();
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

  const parse = (t: string) => {
    const n = parseFloat(t.replace(',', '.'));
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
          title: 'Gaji',
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
              <ThemedText style={styles.title}>Hai, {user?.displayName}!</ThemedText>
              <ThemedText style={[styles.motto, { color: colors.accent }]}>{MOTTO}</ThemedText>
              <ThemedText style={{ color: colors.textSecondary }}>
                {APP_NAME} bantu anda mencatat, memahami dan merancang wang anda. Setup ambil kurang 2 minit dan semua langkah pilihan.
              </ThemedText>

              <View style={styles.pillars}>
                {PILLARS.map((p) => (
                  <View key={p.key} style={[styles.pillar, { backgroundColor: colors.backgroundElement }]}>
                    <View style={[styles.tipIcon, { backgroundColor: `${colors.accent}26` }]}>
                      <Ionicons name={PILLAR_ICON[p.key]} size={20} color={colors.accent} />
                    </View>
                    <View style={styles.flex}>
                      <ThemedText type="smallBold">{p.label}</ThemedText>
                      <ThemedText type="small" style={{ color: colors.textSecondary }}>{p.hint}</ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {step === 'setup' ? (
            <>
              <ThemedText style={styles.title}>Apa matlamat anda?</ThemedText>
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
                        {g.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <ThemedText style={[styles.title, { marginTop: Spacing.four }]}>Baki permulaan</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.three }}>
                Anggaran baki hari ini. Boleh diubah kemudian di More → Assets. Boleh kosongkan.
              </ThemedText>
              {[
                { label: 'Bank', value: bank, set: setBank },
                { label: 'Tunai', value: cash, set: setCash },
              ].map((f) => (
                <View key={f.label} style={[styles.balanceRow, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
                  <ThemedText style={styles.flex}>{f.label}</ThemedText>
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
              <ThemedText style={styles.title}>Gaji anda</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.three }}>
                Pilihan. Isi gaji bersih (selepas EPF dan SOCSO) dan kami rekodkan sendiri setiap bulan, bermula pada tarikh gaji seterusnya. Boleh langkau dan ditambah kemudian di More → Recurring.
              </ThemedText>
              <View style={[styles.balanceRow, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
                <ThemedText style={styles.flex}>Gaji bersih</ThemedText>
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
                <ThemedText style={styles.flex}>Tarikh gaji (hari dalam bulan)</ThemedText>
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
                  Masukkan tarikh gaji antara 1 dan 31, atau kosongkan gaji untuk langkau.
                </ThemedText>
              ) : null}
              <View style={[styles.balanceRow, styles.switchRow, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
                <View style={styles.flex}>
                  <ThemedText>Jumlah berubah-ubah</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    Kami tanya jumlah sebenar setiap bulan, bukan rekod sendiri.
                  </ThemedText>
                </View>
                <Switch value={salaryVaries} onValueChange={setSalaryVaries} trackColor={{ true: colors.accent }} />
              </View>

              {goal === 'save' ? (
                <>
                  <ThemedText style={[styles.title, { marginTop: Spacing.four }]}>Sasaran simpanan pertama</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.three }}>
                    Pilihan. Contoh: Dana kecemasan, Umrah, Kereta. Tarikh akhir boleh ditetapkan kemudian di More → Rancang.
                  </ThemedText>
                  <View style={[styles.balanceRow, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
                    <TextInput
                      value={goalName}
                      onChangeText={setGoalName}
                      placeholder="Nama sasaran"
                      placeholderTextColor={colors.textSecondary}
                      maxLength={40}
                      style={[styles.balanceInput, styles.nameInput, { color: colors.text }]}
                    />
                  </View>
                  <View style={[styles.balanceRow, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
                    <ThemedText style={styles.flex}>Sasaran</ThemedText>
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
                    ? 'Bajet bulanan setiap kategori boleh ditetapkan di More → Budgets.'
                    : goal === 'debt'
                      ? 'Letak bayaran hutang bulanan di More → Recurring supaya ia sentiasa dalam jadual bil anda.'
                      : 'Mulakan dengan menambah rekod pertama menggunakan butang + di bawah.'}
                </ThemedText>
              )}
            </>
          ) : null}

          {step === 'tips' ? (
            <>
              <ThemedText style={styles.title}>Cara guna</ThemedText>
              {TIPS.map((t) => (
                <View key={t.title} style={[styles.tip, { backgroundColor: colors.backgroundElement }]}>
                  <View style={[styles.tipIcon, { backgroundColor: `${colors.accent}26` }]}>
                    <Ionicons name={t.icon} size={20} color={colors.accent} />
                  </View>
                  <View style={styles.flex}>
                    <ThemedText type="smallBold">{t.title}</ThemedText>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>{t.body}</ThemedText>
                  </View>
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={next} style={[styles.button, { backgroundColor: colors.accent }]}>
            <ThemedText style={styles.buttonText}>{isLast ? 'Mula guna' : 'Seterusnya'}</ThemedText>
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