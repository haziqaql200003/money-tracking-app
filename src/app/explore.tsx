import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountDonutChart, type DonutSlice } from '@/components/account-donut-chart';
import { AddAccountModal } from '@/components/add-account-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DEFAULT_COLOR } from '@/constants/card-styles';
import { Spacing } from '@/constants/theme';
import { usePrivacy } from '@/context/PrivacyContext';
import type { Account, AccountType } from '@/context/TransactionsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { monthKeyFromOffset } from '@/utils/dates';
import { formatMoney } from '@/utils/currency';

type Mode = 'account' | 'type';

const MODES: { key: Mode; label: string }[] = [
  { key: 'account', label: 'By account' },
  { key: 'type', label: 'By type' },
];

const TYPE_LABEL: Record<AccountType, string> = { bank: 'Bank', cash: 'Cash', other: 'Other' };
const MASK = 'RM ••••••';

const colorOf = (a: Account) => a.color ?? DEFAULT_COLOR[a.type] ?? DEFAULT_COLOR.other;

export default function AssetsScreen() {
  const colors = useTheme();
  const { accountBalances, balance, transactions } = useTransactions();
  const { hideAmounts, toggleHideAmounts } = usePrivacy();

  const [mode, setMode] = useState<Mode>('account');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const accounts = accountBalances();

  // Net cash flow across all accounts this month.
  const monthKey = monthKeyFromOffset(0);
  const monthNet = useMemo(() => {
    let net = 0;
    transactions.forEach((t) => {
      if (!t.date.startsWith(monthKey)) return;
      net += t.type === 'credit' ? t.amount : -t.amount;
    });
    return net;
  }, [transactions, monthKey]);

  // The donut only shows positive balances. Overdrawn accounts are listed separately.
  const positive = accounts.filter((a) => a.balance > 0);
  const overdrawn = accounts.filter((a) => a.balance < 0);

  let slices: DonutSlice[];
  if (mode === 'account') {
    slices = positive.map((a) => ({ id: a.id, label: a.name, value: a.balance, color: colorOf(a) }));
  } else {
    const byType = new Map<AccountType, number>();
    positive.forEach((a) => byType.set(a.type, (byType.get(a.type) ?? 0) + a.balance));
    slices = Array.from(byType.entries()).map(([t, value]) => ({
      id: t,
      label: TYPE_LABEL[t],
      value,
      color: DEFAULT_COLOR[t] ?? DEFAULT_COLOR.other,
    }));
  }
  slices.sort((a, b) => b.value - a.value);

  const assetsTotal = slices.reduce((sum, s) => sum + s.value, 0);
  const selected = slices.find((s) => s.id === selectedId) ?? null;
  const percentOf = (value: number) => (assetsTotal > 0 ? Math.round((value / assetsTotal) * 100) : 0);

  const money = (n: number) => (hideAmounts ? MASK : `${n < 0 ? '-' : ''}${formatMoney(n)}`);

  function changeMode(next: Mode) {
    setMode(next);
    setSelectedId(null);
  }

  function openAdd() {
    setEditingAccount(null);
    setModalVisible(true);
  }

  function openEdit(account: Account) {
    setEditingAccount(account);
    setModalVisible(true);
  }

  const flowUp = monthNet > 0;
  const flowColor = monthNet < 0 ? colors.negative : monthNet > 0 ? colors.positive : colors.textSecondary;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Title */}
          <View style={styles.titleRow}>
            <ThemedText type="title" style={styles.heading}>
              Assets
            </ThemedText>
            <Pressable
              onPress={openAdd}
              hitSlop={8}
              style={[styles.addButton, { backgroundColor: colors.accent }]}
              accessibilityRole="button"
              accessibilityLabel="Add account"
            >
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
          </View>

          {/* Net worth */}
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.rowBetween}>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                Net worth
              </ThemedText>
              <Pressable
                onPress={toggleHideAmounts}
                hitSlop={12}
                style={[styles.eye, { backgroundColor: colors.background }]}
                accessibilityRole="button"
                accessibilityLabel={hideAmounts ? 'Show amounts' : 'Hide amounts'}
              >
                <Ionicons name={hideAmounts ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.text} />
              </Pressable>
            </View>
            <ThemedText
              style={[styles.total, balance < 0 && { color: colors.negative }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {money(balance)}
            </ThemedText>
            {transactions.length > 0 ? (
              <View style={[styles.pill, { backgroundColor: colors.background }]}>
                <ThemedText type="small" style={{ color: flowColor, fontWeight: '700' }}>
                  {monthNet === 0 ? '•' : flowUp ? '▲' : '▼'}{' '}
                  {hideAmounts ? MASK : formatMoney(monthNet, { signed: monthNet !== 0, type: flowUp ? 'credit' : 'debit' })}
                </ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  this month
                </ThemedText>
              </View>
            ) : null}
          </View>

          {accounts.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="wallet-outline" size={32} color={colors.textSecondary} />
              <ThemedText style={styles.emptyTitle}>No accounts yet</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                Add a bank, cash or e-wallet account to start tracking your assets.
              </ThemedText>
              <Pressable style={[styles.emptyButton, { backgroundColor: colors.accent }]} onPress={openAdd}>
                <ThemedText style={styles.emptyButtonText}>Add account</ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Distribution */}
              <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <View style={[styles.segmentTrack, { backgroundColor: colors.background }]}>
                  {MODES.map((m) => (
                    <Pressable
                      key={m.key}
                      style={[styles.segmentButton, mode === m.key && { backgroundColor: colors.backgroundElement }]}
                      onPress={() => changeMode(m.key)}
                    >
                      <ThemedText
                        type="small"
                        style={mode === m.key ? { fontWeight: '600' } : { color: colors.textSecondary }}
                      >
                        {m.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>

                <AccountDonutChart slices={slices} selectedId={selected?.id ?? null}>
                  <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
                    {selected ? selected.label : 'Assets'}
                  </ThemedText>
                  <ThemedText
                    style={styles.centerAmount}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    {money(selected ? selected.value : assetsTotal)}
                  </ThemedText>
                  {selected ? (
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      {percentOf(selected.value)}% of assets
                    </ThemedText>
                  ) : null}
                </AccountDonutChart>

                {slices.length > 0 ? (
                  <View style={styles.legend}>
                    {slices.map((s) => {
                      const active = selected?.id === s.id;
                      return (
                        <Pressable
                          key={s.id}
                          onPress={() => setSelectedId(active ? null : s.id)}
                          style={[
                            styles.legendChip,
                            {
                              backgroundColor: active ? colors.backgroundSelected : colors.background,
                              borderColor: active ? s.color : colors.divider,
                            },
                          ]}
                        >
                          <View style={[styles.dot, { backgroundColor: s.color }]} />
                          <ThemedText type="small" numberOfLines={1} style={{ fontWeight: active ? '700' : '500' }}>
                            {s.label}
                          </ThemedText>
                          <ThemedText type="small" style={{ color: colors.textSecondary }}>
                            {percentOf(s.value)}%
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <ThemedText type="small" style={[styles.centerNote, { color: colors.textSecondary }]}>
                    No positive balances to chart yet.
                  </ThemedText>
                )}

                {overdrawn.length > 0 ? (
                  <View style={[styles.warning, { backgroundColor: `${colors.negative}1A` }]}>
                    <Ionicons name="alert-circle" size={16} color={colors.negative} />
                    <ThemedText type="small" style={[styles.flex, { color: colors.negative }]}>
                      {overdrawn.map((a) => `${a.name} ${money(a.balance)}`).join(', ')} — overdrawn, not shown in the
                      chart.
                    </ThemedText>
                  </View>
                ) : null}
              </View>

              {/* Accounts */}
              <View style={styles.rowBetween}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>
                  Accounts · {accounts.length}
                </ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  Tap to edit
                </ThemedText>
              </View>

              <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>
                {accounts.map((a, i) => {
                  const color = colorOf(a);
                  const subtitle = [TYPE_LABEL[a.type], a.provider, a.last4 ? `•••• ${a.last4}` : null]
                    .filter(Boolean)
                    .join(' · ');
                  const negative = a.balance < 0;
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => openEdit(a)}
                      style={({ pressed }) => [
                        styles.accountRow,
                        i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <View style={[styles.avatar, { backgroundColor: `${color}26` }]}>
                        <ThemedText style={styles.avatarIcon}>{a.icon}</ThemedText>
                      </View>
                      <View style={styles.flex}>
                        <ThemedText numberOfLines={1}>{a.name}</ThemedText>
                        <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
                          {subtitle}
                        </ThemedText>
                      </View>
                      <View style={styles.right}>
                        <ThemedText style={{ fontWeight: '700', color: negative ? colors.negative : colors.text }}>
                          {money(a.balance)}
                        </ThemedText>
                        <ThemedText
                          type="small"
                          style={{ color: negative ? colors.negative : colors.textSecondary, fontSize: 12, lineHeight: 16 }}
                        >
                          {negative ? 'Overdrawn' : a.balance > 0 ? `${percentOf(a.balance)}% of assets` : 'Empty'}
                        </ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={openAdd}
                style={[styles.addRow, { borderColor: colors.divider }]}
                accessibilityRole="button"
                accessibilityLabel="Add a new account"
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                  Add account
                </ThemedText>
              </Pressable>
            </>
          )}
        </ScrollView>

        <AddAccountModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          editingAccount={editingAccount}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130 },
  flex: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.three },
  heading: { fontSize: 34, lineHeight: 40 },
  addButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  card: { borderRadius: 20, padding: 20, marginBottom: Spacing.three },
  eye: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  total: { fontSize: 36, lineHeight: 44, fontWeight: '700', marginTop: 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: Spacing.two,
  },

  segmentTrack: { flexDirection: 'row', borderRadius: 10, padding: 3, marginBottom: Spacing.three },
  segmentButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  centerAmount: { fontSize: 20, lineHeight: 26, fontWeight: '700', textAlign: 'center' },
  centerNote: { textAlign: 'center', marginTop: Spacing.three },

  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.two, marginTop: Spacing.four },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, padding: 12, marginTop: Spacing.three },

  sectionTitle: { fontSize: 16, marginBottom: Spacing.two },
  listCard: { borderRadius: 20, paddingHorizontal: Spacing.three, marginBottom: Spacing.three },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarIcon: { fontSize: 20 },
  right: { alignItems: 'flex-end' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },

  empty: { borderRadius: 20, padding: Spacing.four, alignItems: 'center', gap: Spacing.two },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: Spacing.two },
  emptyButtonText: { color: '#fff', fontWeight: '700' },
});