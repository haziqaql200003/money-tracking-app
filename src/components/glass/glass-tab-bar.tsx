import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useRef, useState, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/glass/glass';
import { SlidingGlassTrack } from '@/components/glass/sliding-glass-track';
import { Radius, Type } from '@/constants/theme';
import { useAddRecord } from '@/context/AddRecordContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

export const TAB_BAR_HEIGHT = 68;
const ADD_ROUTE = 'add';
const HINT_W = 140;

/**
 * Floating glass tab bar. The lens under the active tab glides between tabs, stretches while it moves,
 * and can be held and dragged. The centre "+" is a button, not a tab, so the lens never rests on it.
 */
export function GlassTabBar({ state, descriptors, navigation, blurTarget }: BottomTabBarProps & { blurTarget?: RefObject<View | null> }) {
  const { t } = useT();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { openAddRecord } = useAddRecord();

  // Tabs are icons only. Pressing (or hovering on web) a tab shows its name in a small pill above the bar.
  const [hint, setHint] = useState<number | null>(null);
  const [barWidth, setBarWidth] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showHint(i: number, autoHideMs?: number) {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHint(i);
    if (autoHideMs) hideTimer.current = setTimeout(() => setHint(null), autoHideMs);
  }
  function hideHint(delayMs = 0) {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHint(null), delayMs);
  }

  const routes = state.routes;
  const addIndex = routes.findIndex((r) => r.name === ADD_ROUTE);

  function goTo(i: number) {
    const route = routes[i];
    if (!route || route.name === ADD_ROUTE) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (state.index !== i && !event.defaultPrevented) navigation.navigate(route.name);
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 2 }]}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
    >
      {hint !== null && routes[hint] ? (
        <View pointerEvents="none" style={[styles.hintBox, { bottom: TAB_BAR_HEIGHT + 8, left: ((hint + 0.5) / routes.length) * barWidth - HINT_W / 2 }]}>
          <View style={[styles.hint, { backgroundColor: colors.text }]}>
            <Text numberOfLines={1} style={[Type.label, { color: colors.background }]}>
              {typeof descriptors[routes[hint].key].options.title === 'string' ? descriptors[routes[hint].key].options.title : routes[hint].name}
            </Text>
          </View>
        </View>
      ) : null}
      <SlidingGlassTrack
        height={TAB_BAR_HEIGHT}
        radius={TAB_BAR_HEIGHT / 2}
        inset={5}
        index={state.index}
        disabled={addIndex >= 0 ? [addIndex] : undefined}
        onSelect={goTo}
        background={<Glass radius={TAB_BAR_HEIGHT / 2} blurTarget={blurTarget} style={StyleSheet.absoluteFill} />}
        slots={routes.map((route, i) => {
          const { options } = descriptors[route.key];

          if (route.name === ADD_ROUTE) {
            return (
              <View key={route.key} style={styles.slot}>
                <Pressable
                  onPress={openAddRecord}
                  style={[styles.addButton, { backgroundColor: colors.accent }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.tabs.addRecord')}
                >
                  <Ionicons name="add" size={28} color={colors.onAccent} />
                </Pressable>
              </View>
            );
          }

          const focused = state.index === i;
          const color = focused ? colors.text : colors.textSecondary;
          const label = typeof options.title === 'string' ? options.title : route.name;
          return (
            <Pressable
              key={route.key}
              onPress={() => {
                goTo(i);
                showHint(i, 1100);
              }}
              onPressIn={() => showHint(i)}
              onPressOut={() => hideHint(700)}
              onHoverIn={() => showHint(i)}
              onHoverOut={() => hideHint(0)}
              style={styles.slot}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
            >
              {options.tabBarIcon ? options.tabBarIcon({ focused, color, size: 26 }) : null}
            </Pressable>
          );
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16 },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  hintBox: { position: 'absolute', width: HINT_W, alignItems: 'center' },
  hint: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.pill, maxWidth: HINT_W },
  addButton: { width: 50, height: 50, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
