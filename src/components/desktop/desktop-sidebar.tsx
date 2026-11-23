import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { useBreakpoint } from '@/components/desktop/use-desktop';
import { activeGroupId, activeNavId, NAV_GROUPS, SETTINGS_ITEM, type NavGroup, type NavItem } from '@/components/shell/nav-model';
import { isLightColor } from '@/constants/card-styles';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAddRecord } from '@/context/AddRecordContext';
import { useProfile } from '@/context/ProfileContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useUpdates } from '@/context/UpdatesContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

/** Typing in a field must not trigger a shortcut. */
function typingInField(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/** The N key opens New record anywhere on the page (not while typing). Shared by the side menu and the tablet rail. */
export function useNewRecordShortcut() {
  const { openAddRecord } = useAddRecord();
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
}

/** Opens a menu item: a bottom tab through the navigator, a More page through the router. */
export function useNavGo({ state, navigateToTab }: Pick<BottomTabBarProps, 'state' | 'navigateToTab'>) {
  const router = useRouter();
  return (item: NavItem) => {
    if (item.tab) {
      const key = state.routes.find((r) => r.name === item.tab)?.key;
      if (key) navigateToTab(key);
    } else if (item.href) router.navigate(item.href);
  };
}

/**
 * The web's side menu (laptop and desktop width), in place of the floating tab bar. Places are grouped by the motto:
 * Kira (track), Faham (understand), Rancang (plan), with Settings & help and your profile at the bottom.
 * On a wide screen every group is open. On a laptop only the group you are in is open, so the menu fits a short
 * window; the others open with a click and stay as you left them.
 */
export function DesktopSidebar(props: BottomTabBarProps) {
  const colors = useTheme();
  const { t } = useT();
  const router = useRouter();
  const { openAddRecord } = useAddRecord();
  const { displayName, avatarColor } = useProfile();
  const { hasUnseenUpdate } = useUpdates();
  const { pendingEntries } = useTransactions();
  const go = useNavGo(props);
  useNewRecordShortcut();

  const pathname = usePathname();
  const activeId = activeNavId(pathname);
  const activeGroup = activeGroupId(pathname);
  const compact = useBreakpoint() === 'laptop';

  // Laptop only: groups the pengguna opened or closed by hand. Unset groups follow "open if you are in it".
  const [manual, setManual] = useState<Partial<Record<NavGroup['id'], boolean>>>({});
  const isOpen = (g: NavGroup) => !compact || (manual[g.id] ?? g.id === activeGroup);

  const badgeFor = (item: NavItem): number => (item.id === 'recurring' ? pendingEntries.length : 0);

  const row = (item: NavItem) => {
    const active = activeId === item.id;
    const badge = badgeFor(item);
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
        {badge > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.negative }]}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}{/* i18n-ignore */}</Text>
          </View>
        ) : null}
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
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.newRecord,
            { backgroundColor: colors.accent },
            (pressed || hovered) && { opacity: 0.9 },
          ]}
        >
          <Ionicons name="add" size={18} color={colors.onAccent} />
          <Text style={[styles.newRecordText, { color: colors.onAccent }]}>{t('home.desktop.newRecord')}</Text>
          <Text style={[styles.kbd, { color: colors.onAccent }]}>N{/* i18n-ignore */}</Text>
        </Pressable>

        {NAV_GROUPS.map((g) => {
          const open = isOpen(g);
          const title = t(g.titleKey);
          return (
            <View key={g.id} style={styles.group}>
              <Pressable
                disabled={!compact}
                onPress={() => setManual((m) => ({ ...m, [g.id]: !open }))}
                accessibilityRole={compact ? 'button' : 'header'}
                accessibilityState={compact ? { expanded: open } : undefined}
                accessibilityLabel={compact ? t(open ? 'home.nav.hideGroup' : 'home.nav.showGroup', { group: title }) : title}
                style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [styles.groupHead, compact && hovered && { backgroundColor: colors.backgroundSelected }]}
              >
                <Text style={[styles.groupTitle, { color: colors.accent }]}>{title.toUpperCase()}</Text>
                <Text style={[styles.groupSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {open || !compact ? t(g.subKey) : t('home.nav.pages', { count: g.items.length })}
                </Text>
                {compact ? <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} /> : null}
              </Pressable>
              {open ? g.items.map(row) : null}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        {hasUnseenUpdate ? row({ id: 'whats-new', icon: 'sparkles-outline', labelKey: 'more.index.menu.whatsNew', href: '/more/whats-new' }) : null}
        {row(SETTINGS_ITEM)}
        <Pressable
          onPress={() => router.navigate('/more/profile')}
          accessibilityRole="link"
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.profile,
            { borderColor: colors.border },
            (pressed || hovered) && { backgroundColor: colors.backgroundSelected },
          ]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { width: 248, borderRightWidth: 1, paddingBottom: Spacing.three },
  scroll: { padding: Spacing.three, gap: 14 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.two, paddingTop: Spacing.two },
  logo: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: FontSize.heading, fontWeight: '800' },
  brandTag: { fontSize: FontSize.micro, letterSpacing: 0.6 },
  newRecord: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: Radius.md, paddingHorizontal: 14 },
  newRecordText: { flex: 1, fontSize: FontSize.label, fontWeight: '700' },
  kbd: { fontSize: FontSize.micro, opacity: 0.8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  group: { gap: 2 },
  groupHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  groupTitle: { fontSize: FontSize.micro, fontWeight: '800', letterSpacing: 0.8 },
  groupSub: { flex: 1, fontSize: FontSize.micro },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10 },
  itemText: { fontSize: FontSize.label, flex: 1 },
  badge: { minWidth: 20, height: 20, borderRadius: Radius.pill, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  footer: { paddingHorizontal: Spacing.three, gap: 6 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: Radius.md, borderWidth: 1 },
  avatar: { width: 32, height: 32, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  profileName: { fontSize: FontSize.label, fontWeight: '700' },
  profileSub: { fontSize: FontSize.caption },
});
