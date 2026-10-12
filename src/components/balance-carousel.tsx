import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AccountCard } from '@/components/account-card';
import { AddAccountModal } from '@/components/add-account-modal';
import { DEFAULT_COLOR, normalizeDesign, type CardDesign } from '@/constants/card-styles';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import type { Account, Transaction } from '@/context/TransactionsContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import type { IconName } from '@/constants/categories';
import { useT } from '@/i18n';
import { accountName } from '@/i18n/data';
import { cycleOf } from '@/utils/cycle';
import { formatMoney } from '@/utils/currency';
import { looksLikeSavings } from '@/utils/saved';
import { toDateKey } from '@/utils/dates';

const PEEK = 28; // how much of the next card shows at the right edge
const GAP = 12;
const CARD_HEIGHT = 196;


type AccountSlide = {
  kind: 'account';
  id: string;
  account: Account | null; // null = the "All accounts" card (not editable)
  title: string;
  subtitle: string;
  icon: IconName;
  balance: number;
  income: number;
  spending: number;
  color: string;
  design: CardDesign;
  last4?: string;
};
type AddSlide = { kind: 'add'; id: 'add' };
/** All savings and asset accounts as one card: they are not money to spend, so they stay out of the row of accounts. */
type SavingsSlide = Omit<AccountSlide, 'kind' | 'account'> & { kind: 'savings' };
type Slide = AccountSlide | SavingsSlide | AddSlide;

// This month's income/spending, optionally limited to one account.
function monthTotals(transactions: Transaction[], accountId?: string) {
  const nowKey = cycleOf(toDateKey(new Date()));
  let income = 0;
  let spending = 0;
  transactions.forEach((t) => {
    if (accountId && t.accountId !== accountId) return;
    if (cycleOf(t.date) !== nowKey) return;
    if (t.type === 'credit') income += t.amount;
    else spending += t.amount;
  });
  return { income, spending };
}

type Props = {
  /**
   * Called when the card in view changes. `null` means the "All accounts" card.
   * Not called while the "Add a new account" card is in view, so the previous selection stays.
   */
  onSelectAccount?: (accountId: string | null) => void;
};

export function BalanceCarousel({ onSelectAccount }: Props) {
  const { t, tp } = useT();
  const colors = useTheme();
  const { hideAmounts, toggleHideAmounts } = usePrivacy();
  const { width } = useWindowDimensions();
  const { selectableAccounts: accounts, transactions, accountBalance } = useTransactions();
  const [index, setIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const router = useRouter();

  const cardWidth = width - Spacing.four * 2 - PEEK;
  const snap = cardWidth + GAP;

  // The first card is money you can use: bank, cash and other accounts. Savings are kept apart on purpose.
  const spendable = accounts.filter((a) => !looksLikeSavings(a));
  const savings = accounts.filter((a) => looksLikeSavings(a));
  const spendableBalance = spendable.reduce((s, a) => s + accountBalance(a.id), 0);
  const savingsBalance = savings.reduce((s, a) => s + accountBalance(a.id), 0);
  const spendableIds = new Set(spendable.map((a) => a.id));
  const savingsIds = new Set(savings.map((a) => a.id));

  const slides: Slide[] = [
    {
      kind: 'account',
      id: 'total',
      account: null,
      title: t('home.carousel.spendable'),
      subtitle:
        savings.length > 0
          ? t('home.carousel.spendableSub', { count: spendable.length, savings: hideAmounts ? 'RM ••••' /* i18n-ignore */ : formatMoney(savingsBalance) })
          : tp('home.carousel.accountCount', spendable.length),
      icon: 'wallet',
      balance: spendableBalance,
      ...monthTotals(transactions.filter((x) => spendableIds.has(x.accountId))),
      color: '#3B4A6B',
      design: 'aurora',
    },
    ...spendable.map(
      (a): AccountSlide => ({
        kind: 'account',
        id: a.id,
        account: a,
        title: accountName(a),
        subtitle: [a.provider, a.typeLabel ?? t(`home.carousel.type.${a.type}`)].filter(Boolean).join(' · '),
        icon: a.icon,
        balance: accountBalance(a.id),
        ...monthTotals(transactions, a.id),
        color: a.color ?? DEFAULT_COLOR[a.type] ?? DEFAULT_COLOR.other,
        design: normalizeDesign(a.design),
        last4: a.last4,
      }),
    ),
    ...(savings.length > 0
      ? [
          {
            kind: 'savings' as const,
            id: 'savings',
            title: t('home.carousel.savingsTitle'),
            subtitle: tp('home.carousel.savingsSub', savings.length),
            icon: 'trending-up' as IconName,
            balance: savingsBalance,
            ...monthTotals(transactions.filter((x) => savingsIds.has(x.accountId))),
            color: '#1E7F5C',
            design: 'aurora' as CardDesign,
          },
        ]
      : []),
    { kind: 'add', id: 'add' },
  ];

  const active = Math.min(index, slides.length - 1);
  // undefined = the "Add" card is showing (leave the selection alone), null = "All accounts"
  const activeSlide = slides[active];
  const selection = activeSlide.kind !== 'account' ? undefined : (activeSlide.account?.id ?? null);

  useEffect(() => {
    if (selection !== undefined) onSelectAccount?.(selection);
  }, [selection, onSelectAccount]);

  function openAdd() {
    setEditing(null);
    setModalVisible(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setModalVisible(true);
  }

  return (
    <View style={styles.wrapper}>
      <FlatList
        horizontal
        data={slides}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={snap}
        snapToAlignment="start"
        decelerationRate="fast"
        style={styles.list}
        contentContainerStyle={styles.listContent}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / snap))}
        renderItem={({ item }) => {
          if (item.kind === 'add') {
            return (
              <Pressable
                onPress={openAdd}
                style={[
                  styles.addCard,
                  { width: cardWidth, borderColor: colors.divider, backgroundColor: colors.backgroundElement },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('home.carousel.addTitle')}
              >
                <View style={[styles.addCircle, { backgroundColor: colors.background }]}>
                  <Text style={[styles.addPlus, { color: colors.text }]}>+</Text>
                </View>
                <Text style={[styles.addTitle, { color: colors.text }]}>{t('home.carousel.addTitle')}</Text>
                <Text style={[styles.addHint, { color: colors.textSecondary }]}>
                  {t('home.carousel.addHint')}
                </Text>
              </Pressable>
            );
          }

          const card = (
            <AccountCard
              width={cardWidth}
              title={item.title}
              subtitle={item.subtitle}
              icon={item.icon}
              balance={item.balance}
              income={item.income}
              spending={item.spending}
              color={item.color}
              design={item.design}
              last4={item.last4}
              hidden={hideAmounts}
              onToggleHidden={toggleHideAmounts}
            />
          );

          if (item.kind === 'savings') {
            return (
              <Pressable onPress={() => router.push('/more/assets')} accessibilityRole="button" accessibilityLabel={item.title}>
                {card}
              </Pressable>
            );
          }
          return item.account ? <Pressable onPress={() => openEdit(item.account!)}>{card}</Pressable> : card;
        }}
      />

      <View style={styles.dots}>
        {slides.map((s, i) => (
          <View
            key={s.id}
            style={[
              styles.dot,
              { backgroundColor: i === active ? colors.text : colors.divider },
              i === active && styles.dotActive,
            ]}
          />
        ))}
      </View>

      <AddAccountModal visible={modalVisible} onClose={() => setModalVisible(false)} editingAccount={editing} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.four },
  // Bleeds to the screen edges so the next card can peek in.
  list: { marginHorizontal: -Spacing.four, flexGrow: 0 },
  listContent: { paddingHorizontal: Spacing.four, gap: GAP },
  addCard: {
    height: CARD_HEIGHT,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 6,
  },
  addCircle: { width: 48, height: 48, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  addPlus: { fontSize: FontSize.largeTitle, lineHeight: 34, fontWeight: '400' },
  addTitle: { fontSize: FontSize.body, fontWeight: '700', marginTop: 4 },
  addHint: { fontSize: FontSize.caption, lineHeight: 18, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: Radius.pill },
  dotActive: { width: 18 },
});
