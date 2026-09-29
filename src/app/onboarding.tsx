import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { IconName } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useAuth, type Goal } from '@/context/AuthContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';

const GOALS: { key: Goal; label: string; icon: IconName }[] = [
  { key: 'track', label: 'Jejak perbelanjaan', icon: 'receipt-outline' },
  { key: 'budget', label: 'Urus bajet', icon: 'pie-chart-outline' },
  { key: 'save', label: 'Kumpul simpanan', icon: 'trending-up-outline' },
  { key: 'debt', label: 'Kurangkan hutang', icon: 'card-outline' },
];

const TIPS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'add-circle', title: 'Tambah rekod', body: 'Tekan butang + di tengah bar bawah untuk rekod perbelanjaan atau pendapatan. Boleh pecahkan kepada item (cth. nasi lemak, SST).' },
  { icon: 'swap-horizontal', title: 'Kad akaun', body: 'Di Home, leret kad ke tepi untuk tukar akaun. Carta dan senarai di bawah akan ikut akaun yang dipilih.' },
  { icon: 'pie-chart', title: 'Bajet', body: 'More > Budgets: letak had bulanan setiap kategori dan lihat berapa selamat dibelanjakan sehari.' },
  { icon: 'eye-off', title: 'Privasi', body: 'Tekan ikon mata untuk sembunyikan semua jumlah bila di tempat awam.' },
  { icon: 'download', title: 'Data anda', body: 'More > Settings: eksport CSV, ulang tutorial, atau padam akaun dan semua data anda.' },
];

export default function OnboardingScreen() {
  const colors = useTheme();
  const { user, updateProfile } = useAuth();
  const { accounts, updateAccount } = useTransactions();

  // Langkah setup hanya untuk pengguna baru. "Ulang tutorial" terus ke tips.
  const firstTime = !user?.goal;
  const steps = firstTime ? ['welcome', 'setup', 'tips'] : ['tips'];
  const [index, setIndex] = useState(0);
  const step = steps[index];

  const [goal, setGoal] = useState<Goal>('track');
  const [bank, setBank] = useState('');
  const [cash, setCash] = useState('');

  const isLast = index === steps.length - 1;

  const parse = (t: string) => {
    const n = parseFloat(t.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  function next() {
    if (step === 'setup') {
      if (accounts.some((a) => a.id === 'bank')) updateAccount('bank', { initialBalance: parse(bank) });
      if (accounts.some((a) => a.id === 'cash')) updateAccount('cash', { initialBalance: parse(cash) });
    }
    if (!isLast) return setIndex(index + 1);
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
              <ThemedText style={{ color: colors.textSecondary }}>
                Money Tracker bantu anda catat perbelanjaan, tetapkan bajet dan faham ke mana wang anda pergi. Setup ambil kurang 1 minit.
              </ThemedText>
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
                Anggaran baki hari ini. Boleh diubah kemudian di tab Assets. Boleh kosongkan.
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
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  goal: { width: '48%', borderRadius: 16, padding: Spacing.three, alignItems: 'center', gap: 8 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.three, marginBottom: Spacing.two },
  balanceInput: { width: 110, fontSize: 16, paddingVertical: 14, textAlign: 'right' },
  tip: { flexDirection: 'row', gap: 12, borderRadius: 16, padding: Spacing.three, marginBottom: Spacing.two },
  tipIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: Spacing.four },
  button: { padding: 16, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
