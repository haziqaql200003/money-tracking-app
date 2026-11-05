import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TextInput } from '@/components/ui/text';

import { BrandAvatar } from '@/components/ui/brand-avatar';
import { ThemedText } from '@/components/ui/themed-text';
import { BRANDS, brandKey, type Brand } from '@/constants/brands';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

/** What the person picked: a known bank or e-wallet, one of the no-provider kinds, or a name they typed. */
export type ProviderChoice =
  | { kind: 'brand'; brand: Brand }
  | { kind: 'cash' }
  | { kind: 'savings' }
  | { kind: 'custom'; name: string };

type Props = {
  onPick: (choice: ProviderChoice) => void;
  /** The provider already chosen, so it can be marked. */
  current?: string;
  /** Leave out the no-provider rows (editing an account that already has a type). */
  hideNoProvider?: boolean;
};

const BANKS = BRANDS.filter((b) => b.kind === 'bank');
const WALLETS = BRANDS.filter((b) => b.kind === 'ewallet');
/** The ones most people use, shown before "show all". */
const TOP_BANKS = ['maybank', 'cimb', 'public-bank', 'rhb', 'bank-islam', 'hong-leong', 'ambank', 'bsn'];
const TOP_WALLETS = ['tng', 'grabpay', 'shopeepay', 'boost', 'mae', 'bigpay', 'setel'];

/** Short label under a logo: the first word for long names ("Touch 'n Go eWallet" > "Touch"), unless it is a known short form. */
const SHORT: Record<string, string> = { tng: 'TNG', 'public-bank': 'Public Bank', 'hong-leong': 'Hong Leong', 'bank-islam': 'Bank Islam' }; // i18n-ignore: brand

/**
 * Step one of a new account: pick where the money is kept. A grid of banks and e-wallets with their logos,
 * a search box for the rest, and rows for cash, savings and a name of your own.
 */
export function ProviderPicker({ onPick, current, hideNoProvider }: Props) {
  const { t } = useT();
  const colors = useTheme();
  const [query, setQuery] = useState('');
  const [allBanks, setAllBanks] = useState(false);
  const q = brandKey(query);
  const currentKey = current ? brandKey(current) : '';

  const found = useMemo(
    () => (q ? [...BANKS, ...WALLETS].filter((b) => [b.name, b.id, ...b.aliases].some((n) => brandKey(n).includes(q))) : []),
    [q],
  );
  const banks = allBanks ? BANKS : BANKS.filter((b) => TOP_BANKS.includes(b.id));
  const wallets = WALLETS.filter((b) => TOP_WALLETS.includes(b.id));

  const cell = (b: Brand) => {
    const on = currentKey !== '' && [b.name, b.id, ...b.aliases].some((n) => brandKey(n) === currentKey);
    return (
      <Pressable
        key={b.id}
        onPress={() => onPick({ kind: 'brand', brand: b })}
        style={({ pressed }) => [
          styles.cell,
          { backgroundColor: on ? colors.backgroundSelected : colors.backgroundElement, borderColor: on ? colors.accent : 'transparent' },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={b.name}
        accessibilityState={{ selected: on }}
      >
        <BrandAvatar name={b.name} size={44} />
        <ThemedText type="small" numberOfLines={1} style={styles.cellText}>
          {SHORT[b.id] ?? b.name}
        </ThemedText>
      </Pressable>
    );
  };

  const row = (icon: keyof typeof Ionicons.glyphMap, tint: string, title: string, sub: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: colors.backgroundElement }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${tint}22` }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <View style={styles.flex}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
          {sub}
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </Pressable>
  );

  return (
    <View>
      <View style={[styles.search, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('acct.pick.search')}
          placeholderTextColor={colors.textSecondary}
          style={[styles.searchInput, { color: colors.text }]}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={t('acct.pick.search')}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {q ? (
        <>
          {found.length > 0 ? <View style={styles.grid}>{found.map(cell)}</View> : null}
          <View style={styles.rows}>
            {row('create-outline', colors.accent, t('acct.pick.useTyped', { name: query.trim() }), t('acct.pick.useTypedSub'), () =>
              onPick({ kind: 'custom', name: query.trim() }),
            )}
          </View>
        </>
      ) : (
        <>
          <ThemedText type="small" style={[styles.sec, { color: colors.textSecondary }]}>
            {t('acct.pick.banks')}
          </ThemedText>
          <View style={styles.grid}>{banks.map(cell)}</View>
          <Pressable onPress={() => setAllBanks((v) => !v)} hitSlop={8} style={styles.more} accessibilityRole="button">
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
              {allBanks ? t('acct.pick.fewerBanks') : t('acct.pick.allBanks', { count: BANKS.length })}
            </ThemedText>
          </Pressable>

          <ThemedText type="small" style={[styles.sec, { color: colors.textSecondary }]}>
            {t('acct.pick.wallets')}
          </ThemedText>
          <View style={styles.grid}>{wallets.map(cell)}</View>

          {!hideNoProvider ? (
            <>
              <ThemedText type="small" style={[styles.sec, { color: colors.textSecondary }]}>
                {t('acct.pick.noProvider')}
              </ThemedText>
              <View style={styles.rows}>
                {row('cash', colors.positive, t('acct.type.cash'), t('acct.pick.cashSub'), () => onPick({ kind: 'cash' }))}
                {row('save', '#7C3AED', t('acct.type.savings'), t('acct.pick.savingsSub'), () => onPick({ kind: 'savings' }))}
                {row('create-outline', colors.accent, t('acct.pick.custom'), t('acct.pick.customSub'), () => onPick({ kind: 'custom', name: '' }))}
              </View>
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    minHeight: 46,
  },
  searchInput: { flex: 1, fontSize: FontSize.body, paddingVertical: 10 },
  sec: { fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: Spacing.four, marginBottom: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  // Four to a row on a phone: (100% - 3 gaps) / 4.
  cell: {
    width: '23%',
    flexGrow: 1,
    maxWidth: '24%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  cellText: { fontWeight: '600', fontSize: FontSize.caption, textAlign: 'center' },
  more: { alignSelf: 'flex-start', marginTop: Spacing.two },
  rows: { gap: Spacing.two, marginTop: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: Radius.md, padding: Spacing.three },
  rowIcon: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
