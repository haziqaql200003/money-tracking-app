import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter, type Href } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { isLightColor } from '@/constants/card-styles';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAddRecord } from '@/context/AddRecordContext';
import { useProfile } from '@/context/ProfileContext';
import { useUpdates } from '@/context/UpdatesContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';

type Item = { id: string; icon: keyof typeof Ionicons.glyphMap; labelKey: TKey; tab?: string; href?: Href };

const MAIN: Item[] = [
  { id: 'index', icon: 'home-outline', labelKey: 'home.tabs.home', tab: 'index' },
  { id: 'transactions', icon: 'list-outline', labelKey: 'home.tabs.transactions', tab: 'transactions' },
  { id: 'analyse', icon: 'bar-chart-outline', labelKey: 'home.tabs.analyse', tab: 'analyse' },
  { id: 'rancang', icon: 'flag-outline', labelKey: 'more.index.menu.rancang', href: '/more/rancang' },
];
const MANAGE: Item[] = [
  { id: 'budgets', icon: 'pie-chart-outline', labelKey: 'more.index.menu.budgets', href: '/more/budgets' },
  { id: 'debts', icon: 'card-outline', labelKey: 'more.index.menu.debts', href: '/more/debts' },
  { id: 'recurring', icon: 'repeat-outline', labelKey: 'more.index.menu.recurring', href: '/more/recurring' },
  { id: 'assets', icon: 'wallet-outline', labelKey: 'more.index.menu.assets', href: '/more/assets' },
  { id: 'categories', icon: 'pricetags-outline', labelKey: 'more.index.menu.categories', href: '/more/categories' },
  { id: 'planner', icon: 'cash-outline', labelKey: 'alloc.title', href: '/more/planner' },
  { id: 'cashflow', icon: 'calendar-outline', labelKey: 'cal.title', href: '/more/cashflow' },
  { id: 'report', icon: 'document-text-outline', labelKey: 'mrep.title', href: '/more/report' },
  { id: 'tax', icon: 'receipt-outline', labelKey: 'tax.title', href: '/more/tax' },
  { id: 'feedback', icon: 'chatbubble-ellipses-outline', labelKey: 'fb.title', href: '/more/feedback' },
];

/** Typing in a field must not trigger a shortcut. */
function typingInField(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/**
 * The web's side menu (desktop width), in place of the floating tab bar: the four main places, the things you
 * manage, a New record button (also the N key) and your profile at the bottom.
 */
export function DesktopSidebar({ navigation }: BottomTabBarProps) {
  const colors = useTheme();
  const { t } = useT();
  const router = useRouter();
  const { openAddRecord } = useAddRecord();
  const { displayName, avatarColor } = useProfile();
  const { hasUnseenUpdate } = useUpdates();

  // Which row is lit: from the address, so it is right however the page was reached.
  const pathname = usePathname();
  const sub = pathname.startsWith('/more/') ? pathname.slice('/more/'.length).split('/')[0] : null;
  const known = new Set([...MAIN, ...MANAGE].map((i) => i.id));
  const activeId =
    pathname === '/' ? 'index' : sub ? (known.has(sub) || sub === 'whats-new' ? sub : 'more') : pathname === '/more' ? 'more' : pathname.slice(1).split('/')[0];

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typingInField(e.target)) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openAddRecord();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openAddRecord]);

  const go = (item: Item) => {
    if (item.tab) navigation.navigate(item.tab);
    else if (item.href) router.navigate(item.href);
  };

  const row = (item: Item) => {
    const active = activeId === item.id;
    return (
      <Pressable
        key={item.id}
        onPress={() => go(item)}
        accessibilityRole="link"
        accessibilityState={{ selected: active }}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.item,
          active ? { backgroundColor: colors.accentSoft } : (hovered || pressed) && { backgroundColor: colors.backgroundSelected },
        ]}
      >
        <Ionicons name={item.icon} size={18} color={active ? colors.accent : colors.text} />
        <Text style={[styles.itemText, { color: active ? colors.accent : colors.text, fontWeight: active ? '700' : '500' }]} numberOfLines={1}>
          {t(item.labelKey)}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { backgroundColor: colors.backgroundElement, borderRightColor: colors.border }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: colors.accent }]}>
            <Ionicons name="wallet" size={18} color={colors.onAccent} />
          </View>
          <View>
            <Text style={[styles.brandName, { color: colors.accent }]}>WaKira{/* i18n-ignore */}</Text>
            <Text style={[styles.brandTag, { color: colors.textSecondary }]}>KIRA · FAHAM · RANCANG{/* i18n-ignore */}</Text>
          </View>
        </View>

        <Pressable
          onPress={openAddRecord}
          accessibilityRole="button"
          style={({ pressed }) => [styles.newRecord, { backgroundColor: colors.accent }, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="add" size={18} color={colors.onAccent} />
          <Text style={[styles.newRecordText, { color: colors.onAccent }]}>{t('home.desktop.newRecord')}</Text>
          <Text style={[styles.kbd, { color: colors.onAccent }]}>N{/* i18n-ignore */}</Text>
        </Pressable>

        <View style={styles.group}>{MAIN.map(row)}</View>
        <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>{t('home.desktop.manage')}</Text>
        <View style={styles.group}>{MANAGE.map(row)}</View>
        <View style={styles.group}>
          {row({ id: 'more', icon: 'ellipsis-horizontal-circle-outline', labelKey: 'home.tabs.more', href: '/more' })}
          {hasUnseenUpdate ? row({ id: 'whats-new', icon: 'sparkles-outline', labelKey: 'more.index.menu.whatsNew', href: '/more/whats-new' }) : null}
        </View>
      </ScrollView>

      <Pressable
        onPress={() => router.navigate('/more/profile')}
        accessibilityRole="link"
        style={({ pressed }) => [styles.profile, { borderColor: colors.border }, pressed && { backgroundColor: colors.backgroundSelected }]}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={{ color: isLightColor(avatarColor) ? Colors.light.text : '#FFFFFF', fontWeight: '700' }}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[styles.profileSub, { color: colors.textSecondary }]} numberOfLines={1}>
            {t('home.desktop.profile')}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { width: 248, borderRightWidth: 1, paddingBottom: Spacing.three },
  scroll: { padding: Spacing.three, gap: Spacing.two },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.two, paddingTop: Spacing.two, paddingBottom: Spacing.three },
  logo: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: FontSize.heading, fontWeight: '800' },
  brandTag: { fontSize: FontSize.micro, letterSpacing: 0.6 },
  newRecord: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: Radius.md, paddingHorizontal: 14, marginBottom: Spacing.two },
  newRecordText: { flex: 1, fontSize: FontSize.label, fontWeight: '700' },
  kbd: { fontSize: FontSize.micro, opacity: 0.8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  group: { gap: 2 },
  groupTitle: { fontSize: FontSize.micro, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 12, paddingTop: Spacing.three, paddingBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  itemText: { fontSize: FontSize.label, flex: 1 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: Spacing.three, padding: 10, borderRadius: Radius.md, borderWidth: 1 },
  avatar: { width: 32, height: 32, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  profileName: { fontSize: FontSize.label, fontWeight: '700' },
  profileSub: { fontSize: FontSize.caption },
});
