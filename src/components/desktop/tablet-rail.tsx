import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { useNavGo, useNewRecordShortcut } from '@/components/desktop/desktop-sidebar';
import { activeNavId, NAV_GROUPS, SETTINGS_ITEM, type NavItem } from '@/components/shell/nav-model';
import { isLightColor } from '@/constants/card-styles';
import { Colors, Radius } from '@/constants/theme';
import { useAddRecord } from '@/context/AddRecordContext';
import { useProfile } from '@/context/ProfileContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useUpdates } from '@/context/UpdatesContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

export const RAIL_WIDTH = 72;

/**
 * Tablet-width web (768–1023 px): a slim icon rail on the left instead of the bottom bar, so the screen keeps its
 * full height and wide cards do not stretch under a floating bar. Same groups as the side menu; a name appears
 * beside an icon on hover or focus, and every icon has a spoken label.
 */
export function TabletRail(props: BottomTabBarProps) {
  const colors = useTheme();
  const { t } = useT();
  const router = useRouter();
  const { openAddRecord } = useAddRecord();
  const { displayName, avatarColor } = useProfile();
  const { hasUnseenUpdate } = useUpdates();
  const { pendingEntries } = useTransactions();
  const go = useNavGo(props);
  useNewRecordShortcut();

  const activeId = activeNavId(usePathname());
  const [tip, setTip] = useState<{ label: string; y: number } | null>(null);

  const icon = (item: NavItem) => {
    const active = activeId === item.id;
    const label = t(item.labelKey);
    const dot = (item.id === 'recurring' && pendingEntries.length > 0) || (item.id === 'settings' && hasUnseenUpdate);
    return (
      <Pressable
        key={item.id}
        onPress={() => go(item)}
        onHoverIn={(e) => setTip({ label, y: (e.nativeEvent as unknown as { pageY?: number }).pageY ?? 0 })}
        onHoverOut={() => setTip(null)}
        accessibilityRole="link"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.icon,
          active ? { backgroundColor: colors.accentSoft } : hovered && { backgroundColor: colors.backgroundSelected },
        ]}
      >
        <Ionicons name={item.icon} size={20} color={active ? colors.accent : colors.text} />
        {dot ? <View style={[styles.dot, { backgroundColor: colors.negative, borderColor: colors.backgroundElement }]} /> : null}
      </Pressable>
    );
  };

  return (
    <View style={[styles.rail, { backgroundColor: colors.backgroundElement, borderRightColor: colors.border }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.logo, { backgroundColor: colors.accent }]}>
          <Ionicons name="wallet" size={18} color={colors.onAccent} />
        </View>
        <Pressable
          onPress={openAddRecord}
          accessibilityRole="button"
          accessibilityLabel={t('home.tabs.addRecord')}
          style={({ pressed }) => [styles.add, { backgroundColor: colors.accent }, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="add" size={24} color={colors.onAccent} />
        </Pressable>
        {NAV_GROUPS.map((g) => (
          <View key={g.id} style={styles.group}>
            <Text style={[styles.groupTitle, { color: colors.accent }]}>{t(g.titleKey).toUpperCase()}</Text>
            {g.items.map(icon)}
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        {icon(SETTINGS_ITEM)}
        <Pressable
          onPress={() => router.navigate('/more/profile')}
          accessibilityRole="link"
          accessibilityLabel={t('home.desktop.profile')}
          style={[styles.avatar, { backgroundColor: avatarColor }]}
        >
          <Text style={{ color: isLightColor(avatarColor) ? Colors.light.text : '#FFFFFF', fontWeight: '800' }}>{displayName.charAt(0).toUpperCase()}</Text>
        </Pressable>
      </View>
      {tip ? (
        <View pointerEvents="none" style={[styles.tip, { top: Math.max(8, tip.y - 16), backgroundColor: colors.text }]}>
          <Text style={[styles.tipText, { color: colors.background }]} numberOfLines={1}>
            {tip.label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { width: RAIL_WIDTH, borderRightWidth: 1, zIndex: 10 },
  scroll: { alignItems: 'center', paddingVertical: 14, gap: 6 },
  logo: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  add: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  group: { alignItems: 'center', gap: 4, paddingTop: 6 },
  groupTitle: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  icon: { width: 48, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 7, right: 10, width: 9, height: 9, borderRadius: Radius.pill, borderWidth: 1.5 },
  footer: { alignItems: 'center', gap: 8, paddingBottom: 14, paddingTop: 6 },
  avatar: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  tip: { position: 'absolute', left: RAIL_WIDTH - 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, maxWidth: 220 },
  tipText: { fontSize: 13, fontWeight: '700' },
});
