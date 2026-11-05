import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { TransferModal } from '@/components/transactions/transfer-modal';
import { useMotionAllowed } from '@/components/cards/motion';
import { Sheet } from '@/components/ui/sheet';
import { ThemedText } from '@/components/ui/themed-text';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useAddRecord } from '@/context/AddRecordContext';
import { useAuth } from '@/context/AuthContext';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';

type IconName = keyof typeof Ionicons.glyphMap;
type LinkId =
  | 'add' | 'transfer' | 'recurring' | 'goals' | 'budgets' | 'debts' | 'report'
  | 'cashflow' | 'planner' | 'tax' | 'ai' | 'assets' | 'analyse';

type QuickLink = { id: LinkId; labelKey: TKey; icon: IconName; href?: Href };

/** Every link a pengguna can put on Home. 'add' and 'transfer' open a form; the rest open a screen. */
const LINKS: QuickLink[] = [
  { id: 'add', labelKey: 'home.quick.l.add', icon: 'add-circle-outline' },
  { id: 'transfer', labelKey: 'home.quick.l.transfer', icon: 'swap-horizontal-outline' },
  { id: 'recurring', labelKey: 'home.quick.l.recurring', icon: 'repeat-outline', href: '/more/recurring' },
  { id: 'goals', labelKey: 'home.quick.l.goals', icon: 'flag-outline', href: '/more/goals' },
  { id: 'budgets', labelKey: 'home.quick.l.budgets', icon: 'pie-chart-outline', href: '/more/budgets' },
  { id: 'debts', labelKey: 'home.quick.l.debts', icon: 'card-outline', href: '/more/debts' },
  { id: 'report', labelKey: 'home.quick.l.report', icon: 'document-text-outline', href: '/more/report' },
  { id: 'cashflow', labelKey: 'home.quick.l.cashflow', icon: 'calendar-outline', href: '/more/cashflow' },
  { id: 'planner', labelKey: 'home.quick.l.planner', icon: 'layers-outline', href: '/more/planner' },
  { id: 'tax', labelKey: 'home.quick.l.tax', icon: 'receipt-outline', href: '/more/tax' },
  { id: 'ai', labelKey: 'home.quick.l.ai', icon: 'sparkles-outline', href: '/more/ai' },
  { id: 'assets', labelKey: 'home.quick.l.assets', icon: 'wallet-outline', href: '/more/assets' },
  { id: 'analyse', labelKey: 'home.quick.l.analyse', icon: 'stats-chart-outline', href: '/analyse' },
];
const MAX_LINKS = 5;
const DEFAULT_LINKS: LinkId[] = ['add', 'transfer', 'recurring', 'goals'];

/** A tile that wobbles while the row is being edited, like iPhone icons. */
function Wobble({ active, odd, children }: { active: boolean; odd: boolean; children: ReactNode }) {
  const allowed = useMotionAllowed();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!active || !allowed) {
      v.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 120, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: -1, duration: 240, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 120, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const start = setTimeout(() => loop.start(), odd ? 90 : 0);
    return () => {
      clearTimeout(start);
      loop.stop();
    };
  }, [active, allowed, odd, v]);
  const rotate = v.interpolate({ inputRange: [-1, 1], outputRange: ['-3deg', '3deg'] });
  return <Animated.View style={{ transform: [{ rotate }] }}>{children}</Animated.View>;
}

/**
 * Home A5 (3.7.0): up to five shortcuts the pengguna picks. "Edit" makes them wobble; the red minus removes one,
 * the dashed tile adds one from the list. Saved per account.
 */
export function QuickLinks() {
  const { t } = useT();
  const colors = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { openAddRecord } = useAddRecord();
  const [stored, setStored] = usePersistedState<LinkId[]>('home-quick-links', DEFAULT_LINKS, user?.id ?? null);
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [transfer, setTransfer] = useState(false);

  const chosen = stored.filter((id, i) => LINKS.some((l) => l.id === id) && stored.indexOf(id) === i).slice(0, MAX_LINKS);
  const links = chosen.map((id) => LINKS.find((l) => l.id === id)!);
  const others = LINKS.filter((l) => !chosen.includes(l.id));
  const full = chosen.length >= MAX_LINKS;

  function open(link: QuickLink) {
    if (link.id === 'add') openAddRecord();
    else if (link.id === 'transfer') setTransfer(true);
    else if (link.href) router.push(link.href);
  }
  const remove = (id: LinkId) => setStored(chosen.filter((x) => x !== id));
  function add(id: LinkId) {
    if (full) return;
    const next = [...chosen, id];
    setStored(next);
    if (next.length >= MAX_LINKS) setPicking(false);
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
      <View style={styles.head}>
        <ThemedText type="smallBold">{t('home.quick.title')}</ThemedText>
        <Pressable
          onPress={() => setEditing((v) => !v)}
          hitSlop={8}
          style={[styles.editButton, { backgroundColor: editing ? colors.accent : colors.accentSoft }]}
          accessibilityRole="button"
        >
          <ThemedText style={[styles.editText, { color: editing ? colors.onAccent : colors.accent }]}>
            {editing ? t('home.quick.done') : t('home.quick.edit')}
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.row}>
        {links.map((link, i) => (
          <View key={link.id} style={styles.cell}>
            <Wobble active={editing} odd={i % 2 === 1}>
              <Pressable
                onPress={() => (editing ? undefined : open(link))}
                style={({ pressed }) => [styles.icon, { backgroundColor: colors.accentSoft }, pressed && !editing && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={t(link.labelKey)}
              >
                <Ionicons name={link.icon} size={22} color={colors.accent} />
              </Pressable>
              {editing ? (
                <Pressable
                  onPress={() => remove(link.id)}
                  hitSlop={8}
                  style={[styles.minus, { backgroundColor: colors.negative, borderColor: colors.backgroundElement }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.quick.remove', { name: t(link.labelKey) })}
                >
                  <Ionicons name="remove" size={14} color="#FFFFFF" />
                </Pressable>
              ) : null}
            </Wobble>
            <ThemedText style={styles.label} numberOfLines={2}>
              {t(link.labelKey)}
            </ThemedText>
          </View>
        ))}
        {editing && !full ? (
          <View style={styles.cell}>
            <Pressable
              onPress={() => setPicking(true)}
              style={[styles.icon, styles.addTile, { borderColor: colors.textSecondary }]}
              accessibilityRole="button"
              accessibilityLabel={t('home.quick.pickTitle')}
            >
              <Ionicons name="add" size={22} color={colors.textSecondary} />
            </Pressable>
            <ThemedText style={[styles.label, { color: colors.textSecondary }]}>{t('home.quick.add')}</ThemedText>
          </View>
        ) : null}
      </View>

      <Sheet visible={picking} onClose={() => setPicking(false)} title={t('home.quick.pickTitle')}>
        <ThemedText type="small" style={[styles.count, { color: full ? colors.warning : colors.textSecondary }]}>
          {full ? t('home.quick.full') : t('home.quick.count', { n: chosen.length })}
        </ThemedText>
        <View style={styles.grid}>
          {others.map((link) => (
            <Pressable
              key={link.id}
              onPress={() => add(link.id)}
              disabled={full}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: colors.backgroundElement, borderColor: colors.border },
                (pressed || full) && styles.pressed,
              ]}
              accessibilityRole="button"
            >
              <View style={[styles.optionIcon, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name={link.icon} size={18} color={colors.accent} />
              </View>
              <ThemedText type="smallBold" style={styles.optionText} numberOfLines={1}>
                {t(link.labelKey)}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </Sheet>

      <TransferModal visible={transfer} onClose={() => setTransfer(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingBottom: 10 },
  editButton: { borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  editText: { fontSize: FontSize.caption, fontWeight: '800' },
  row: { flexDirection: 'row' },
  cell: { width: '20%', alignItems: 'center', gap: 6 },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  addTile: { borderWidth: 1.5, borderStyle: 'dashed' },
  minus: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: FontSize.micro, lineHeight: 13, fontWeight: '700', textAlign: 'center' },
  pressed: { opacity: 0.6 },
  count: { marginBottom: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  option: { width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: Radius.md, borderWidth: 1 },
  optionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1 },
});
