import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassSegmented } from '@/components/glass/glass-segmented';
import { AccountDonutChart, type DonutSlice } from '@/components/account-donut-chart';
import { AddAccountModal } from '@/components/add-account-modal';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TransferModal } from '@/components/transfer-modal';
import { accountTypeLabel } from '@/constants/accounts';
import { DEFAULT_COLOR } from '@/constants/card-styles';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { usePrivacy } from '@/context/PrivacyContext';
import type { Account, AccountType, Transfer } from '@/context/TransactionsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { accountName } from '@/i18n/data';
import { dayLabel, monthKeyFromOffset } from '@/utils/dates';
import { formatMoney } from '@/utils/currency';
import { CategoryIcon } from '@/components/category-icon';
import { ReorderList } from '@/components/reorder-list';
import { SwipeRow } from '@/components/ui/swipe-row';
import { cycleOf } from '@/utils/cycle';

type Mode = 'account' | 'type';

const MODES: { key: Mode; labelKey: TKey }[] = [
  { key: 'account', labelKey: 'acct.assets.byAccount' },
  { key: 'type', labelKey: 'acct.assets.byType' },
];

const MASK = 'RM ••••••';

const colorOf = (a: Account) => a.color ?? DEFAULT_COLOR[a.type] ?? DEFAULT_COLOR.other;

const ACCOUNT_ROW_H = 72;

export default function AssetsScreen() {
  const { t } = useT();
  const colors = useTheme();
  const { accountBalances, balance, transactions, transfers, ready, deleteAccount, reorderAccounts } = useTransactions();
  const { hideAmounts, toggleHideAmounts } = usePrivacy();

  const [mode, setMode] = useState<Mode>('account');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [transferVisible, setTransferVisible] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  // While a row is being dragged the page must not scroll.
  const [sorting, setSorting] = useState(false);

  const accounts = accountBalances();

  // Net cash flow across all accounts this month.
  const monthKey = monthKeyFromOffset(0);
  const monthNet = useMemo(() => {
    let net = 0;
    const visible = new Set(accounts.map((a) => a.id));
    transactions.forEach((tx) => {
      if (cycleOf(tx.date) !== monthKey || !visible.has(tx.accountId)) return;
      net += tx.type === 'credit' ? tx.amount : -tx.amount;
    });
    return net;
  }, [transactions, monthKey, accounts]);

  // The donut only shows positive balances. Overdrawn accounts are listed separately.
  const positive = accounts.filter((a) => a.balance > 0);
  const overdrawn = accounts.filter((a) => a.balance < 0);

  let slices: DonutSlice[];
  if (mode === 'account') {
    slices = positive.map((a) => ({ id: a.id, label: accountName(a), value: a.balance, color: colorOf(a) }));
  } else {
    const byType = new Map<AccountType, number>();
    positive.forEach((a) => byType.set(a.type, (byType.get(a.type) ?? 0) + a.balance));
    slices = Array.from(byType.entries()).map(([type, value]) => ({
      id: type,
      label: accountTypeLabel(type),
      value,
      color: DEFAULT_COLOR[type] ?? DEFAULT_COLOR.other,
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

  function confirmDeleteAccount(account: Account) {
    Alert.alert(t('acct.add.deleteTitle'), t('acct.add.deleteMsg', { name: accountName(account) }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteAccount(account.id) },
    ]);
  }

  function openTransfer(transfer: Transfer | null = null) {
    if (!transfer && accounts.length < 2) {
      Alert.alert(t('acct.assets.alertTitle'), t('acct.assets.alertBody'));
      return;
    }
    setEditingTransfer(transfer);
    setTransferVisible(true);
  }

  const nameOfAccount = (id: string) => {
    const a = accounts.find((x) => x.id === id);
    return a ? accountName(a) : t('acct.assets.deletedAccount');
  };
  const shownIds = new Set(accounts.map((a) => a.id));
  const recentTransfers = [...transfers]
    .filter((tr) => shownIds.has(tr.fromAccountId) && shownIds.has(tr.toAccountId))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 5);

  const flowUp = monthNet > 0;
  const flowColor = monthNet < 0 ? colors.negative : monthNet > 0 ? colors.positive : colors.textSecondary;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} scrollEnabled={!sorting}>
          <ScreenHeader
            title={t('acct.assets.title')}
            right={
              <View style={styles.titleActions}>
                <Pressable
                  onPress={() => openTransfer()}
                  hitSlop={8}
                  style={[styles.addButton, { backgroundColor: colors.backgroundElement }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('acct.assets.transferA11y')}
                >
                  <Ionicons name="swap-horizontal" size={20} color={colors.accent} />
                </Pressable>
                <Pressable
                  onPress={openAdd}
                  hitSlop={8}
                  style={[styles.addButton, { backgroundColor: colors.accent }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('acct.add.submit')}
                >
                  <Ionicons name="add" size={22} color="#fff" />
                </Pressable>
              </View>
            }
          />
          {!(ready) ? <ScreenSkeleton variant="cards" /> : (
          <>

          {/* Net worth */}
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.rowBetween}>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {t('acct.assets.netWorth')}
              </ThemedText>
              <Pressable
                onPress={toggleHideAmounts}
                hitSlop={12}
                style={[styles.eye, { backgroundColor: colors.background }]}
                accessibilityRole="button"
                accessibilityLabel={hideAmounts ? t('acct.card.showAmounts') : t('acct.card.hideAmounts')}
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
                  {t('acct.assets.thisMonth')}
                </ThemedText>
              </View>
            ) : null}
          </View>

          {accounts.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="wallet-outline" size={32} color={colors.textSecondary} />
              <ThemedText style={styles.emptyTitle}>{t('acct.assets.emptyTitle')}</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                {t('acct.assets.emptyBody')}
              </ThemedText>
              <Pressable style={[styles.emptyButton, { backgroundColor: colors.accent }]} onPress={openAdd}>
                <ThemedText style={styles.emptyButtonText}>{t('acct.add.submit')}</ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Distribution */}
              <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <View style={{ marginBottom: Spacing.three }}>
                  <GlassSegmented
                    options={MODES.map((m) => ({ key: m.key, label: t(m.labelKey) }))}
                    value={mode}
                    onChange={changeMode}
                    trackColor={colors.background}
                  />
                </View>

                <AccountDonutChart slices={slices} selectedId={selected?.id ?? null}>
                  <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
                    {selected ? selected.label : t('acct.assets.title')}
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
                      {t('acct.assets.percentOfAssets', { percent: percentOf(selected.value) })}
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
                    {t('acct.assets.noPositive')}
                  </ThemedText>
                )}

                {overdrawn.length > 0 ? (
                  <View style={[styles.warning, { backgroundColor: `${colors.negative}1A` }]}>
                    <Ionicons name="alert-circle" size={16} color={colors.negative} />
                    <ThemedText type="small" style={[styles.flex, { color: colors.negative }]}>
                      {t('acct.assets.overdrawnNote', { list: overdrawn.map((a) => `${accountName(a)} ${money(a.balance)}`).join(', ') })}
                    </ThemedText>
                  </View>
                ) : null}
              </View>

              {/* Accounts */}
              <View style={styles.rowBetween}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>
                  {t('acct.assets.accountsHeader', { count: accounts.length })}
                </ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('acct.assets.tapToEdit')}
                </ThemedText>
              </View>

              <View style={[styles.listCard, styles.listFlush, { backgroundColor: colors.backgroundElement }]}>
                <ReorderList
                  items={accounts}
                  keyOf={(a) => a.id}
                  rowHeight={ACCOUNT_ROW_H}
                  background={colors.backgroundElement}
                  onReorder={reorderAccounts}
                  onDragChange={setSorting}
                  renderRow={(a, i, dragging) => {
                    const color = colorOf(a);
                    const subtitle = [a.typeLabel ?? accountTypeLabel(a.type), a.provider, a.last4 ? `•••• ${a.last4}` : null]
                      .filter(Boolean)
                      .join(' · ');
                    const negative = a.balance < 0;
                    return (
                      <SwipeRow
                        background={colors.backgroundElement}
                        disabled={dragging}
                        rightActions={[
                          { key: 'edit', label: t('common.edit'), icon: 'create-outline', color: colors.accent, onPress: () => openEdit(a) },
                          { key: 'delete', label: t('common.delete'), icon: 'trash-outline', color: colors.negative, onPress: () => confirmDeleteAccount(a) },
                        ]}
                        onFullSwipe={() => confirmDeleteAccount(a)}
                      >
                        <Pressable
                          onPress={() => openEdit(a)}
                          style={({ pressed }) => [
                            styles.accountRow,
                            i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
                            pressed && { opacity: 0.6 },
                          ]}
                        >
                          <CategoryIcon icon={a.icon} color={color} size={42} />
                          <View style={styles.flex}>
                            <ThemedText numberOfLines={1}>{accountName(a)}</ThemedText>
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
                              style={{ color: negative ? colors.negative : colors.textSecondary, fontSize: FontSize.caption, lineHeight: 16 }}
                            >
                              {negative
                                ? t('acct.assets.overdrawn')
                                : a.balance > 0
                                  ? t('acct.assets.percentOfAssets', { percent: percentOf(a.balance) })
                                  : t('acct.assets.empty')}
                            </ThemedText>
                          </View>
                        </Pressable>
                      </SwipeRow>
                    );
                  }}
                />
              </View>
              {accounts.length > 1 ? (
                <ThemedText type="small" style={[styles.sortHint, { color: colors.textSecondary }]}>
                  {t('acct.assets.sortHint')}
                </ThemedText>
              ) : null}

              <Pressable
                onPress={openAdd}
                style={[styles.addRow, { borderColor: colors.divider }]}
                accessibilityRole="button"
                accessibilityLabel={t('acct.assets.addNewA11y')}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                  {t('acct.add.submit')}
                </ThemedText>
              </Pressable>

              {/* Transfers */}
              {recentTransfers.length > 0 ? (
                <>
                  <View style={[styles.rowBetween, styles.transfersHeader]}>
                    <ThemedText type="smallBold" style={styles.sectionTitle}>
                      {t('acct.assets.recentTransfers')}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      {t('acct.assets.tapToEdit')}
                    </ThemedText>
                  </View>
                  <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>
                    {recentTransfers.map((tr, i) => (
                      <Pressable
                        key={tr.id}
                        onPress={() => openTransfer(tr)}
                        style={({ pressed }) => [
                          styles.accountRow,
                          i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
                          pressed && { opacity: 0.6 },
                        ]}
                      >
                        <View style={[styles.avatar, { backgroundColor: `${colors.accent}26` }]}>
                          <Ionicons name="swap-horizontal" size={20} color={colors.accent} />
                        </View>
                        <View style={styles.flex}>
                          <ThemedText numberOfLines={1}>
                            {nameOfAccount(tr.fromAccountId)} → {nameOfAccount(tr.toAccountId)}
                          </ThemedText>
                          <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
                            {dayLabel(tr.date)}
                            {tr.note ? ` · ${tr.note}` : ''}
                            {tr.recurringId ? ` · ${t('home.row.recurring')}` : ''}
                          </ThemedText>
                        </View>
                        <ThemedText style={{ fontWeight: '700' }}>{money(tr.amount)}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}
            </>
          )}
          </>
          )}
        </ScrollView>

        <AddAccountModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          editingAccount={editingAccount}
        />

        <TransferModal visible={transferVisible} onClose={() => setTransferVisible(false)} editing={editingTransfer} />
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

  titleActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  addButton: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  transfersHeader: { marginTop: Spacing.four },

  card: { borderRadius: Radius.lg, padding: 20, marginBottom: Spacing.three },
  eye: { width: 28, height: 28, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  total: { fontSize: FontSize.display, lineHeight: 44, fontWeight: '700', marginTop: 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
    marginTop: Spacing.two,
  },

  centerAmount: { fontSize: FontSize.heading, lineHeight: 26, fontWeight: '700', textAlign: 'center' },
  centerNote: { textAlign: 'center', marginTop: Spacing.three },

  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.two, marginTop: Spacing.four },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  dot: { width: 10, height: 10, borderRadius: Radius.pill },
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: Radius.md, padding: 12, marginTop: Spacing.three },

  sectionTitle: { fontSize: FontSize.body, marginBottom: Spacing.two },
  listCard: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three, marginBottom: Spacing.three },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12, height: ACCOUNT_ROW_H, paddingHorizontal: Spacing.three },
  listFlush: { paddingHorizontal: 0, overflow: 'hidden' },
  sortHint: { textAlign: 'center', marginTop: -Spacing.two, marginBottom: Spacing.three },
  avatar: { width: 42, height: 42, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarIcon: { fontSize: FontSize.heading },
  right: { alignItems: 'flex-end' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },

  empty: { borderRadius: Radius.lg, padding: Spacing.four, alignItems: 'center', gap: Spacing.two },
  emptyTitle: { fontSize: FontSize.body, fontWeight: '700' },
  emptyButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.lg, marginTop: Spacing.two },
  emptyButtonText: { color: '#fff', fontWeight: '700' },
});
