import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/glass/glass';
import { SlidingGlassTrack } from '@/components/glass/sliding-glass-track';
import { FontSize, Radius, Type } from '@/constants/theme';
import { useAddRecord } from '@/context/AddRecordContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

export const TAB_BAR_HEIGHT = 68;
const ADD_ROUTE = 'add';

/**
 * Floating glass tab bar. The lens under the active tab glides between tabs, stretches while it moves,
 * and can be held and dragged. The centre "+" is a button, not a tab, so the lens never rests on it.
 */
export function GlassTabBar({ state, descriptors, navigation, blurTarget }: BottomTabBarProps & { blurTarget?: RefObject<View | null> }) {
  const { t } = useT();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { openAddRecord } = useAddRecord();

  const routes = state.routes;
  const addIndex = routes.findIndex((r) => r.name === ADD_ROUTE);

  function goTo(i: number) {
    const route = routes[i];
    if (!route || route.name === ADD_ROUTE) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (state.index !== i && !event.defaultPrevented) navigation.navigate(route.name);
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 2 }]}>
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
              onPress={() => goTo(i)}
              style={styles.slot}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
            >
              {options.tabBarIcon ? options.tabBarIcon({ focused, color, size: 22 }) : null}
              <Text numberOfLines={1} style={[Type.caption, styles.label, { color, fontWeight: focused ? '700' : '500' }]}>
                {label}
              </Text>
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
  label: { fontSize: FontSize.micro, lineHeight: 14 },
  addButton: { width: 50, height: 50, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
