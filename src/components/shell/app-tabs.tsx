import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurTargetView } from 'expo-blur';

import { DesktopSidebar } from '@/components/desktop/desktop-sidebar';
import { DESKTOP_MAX_CONTENT, useIsDesktop } from '@/components/desktop/use-desktop';
import { GlassTabBar } from '@/components/glass/glass-tab-bar';
import { useTheme } from '@/hooks/use-theme';
import { useUpdates } from '@/context/UpdatesContext';
import { useT } from '@/i18n';
import { Radius } from '@/constants/theme';

/** Screens laid out for the full desktop width. */
const WIDE_ROUTES = new Set(['index', 'transactions', 'analyse']);
/** Screens inside More that also use the full desktop width. */
const WIDE_MORE_PATHS = ['/more/rancang'];

export default function AppTabs() {
  const { t } = useT();
  const colors = useTheme();
  const { hasUnseenUpdate } = useUpdates();
  // Android blur needs to know what to blur: the screens sit in this target, the tab bar blurs it.
  const blurTarget = useRef<View>(null);
  // Wide web: a side menu instead of the floating tab bar.
  const desktop = useIsDesktop();
  const pathname = usePathname();
  const wideMore = WIDE_MORE_PATHS.some((p) => pathname.startsWith(p));

  return (
    <Tabs
      tabBar={(props) => (desktop ? <DesktopSidebar {...props} /> : <GlassTabBar {...props} blurTarget={blurTarget} />)}
      screenLayout={({ children, route }) =>
        desktop ? (
          // Wide web: screens sit in a centred column so lines and cards do not stretch across a big monitor.
          // Home and Transactions have their own multi-column desktop layout; the rest read best a little narrower.
          <View style={[styles.target, { backgroundColor: colors.background }]}>
            <View style={[styles.desktopColumn, !(WIDE_ROUTES.has(route.name) || (route.name === 'more' && wideMore)) && styles.desktopReading]}>{children}</View>
          </View>
        ) : (
          <BlurTargetView ref={blurTarget} style={styles.target}>
            {children}
          </BlurTargetView>
        )
      }
      screenOptions={{
        headerShown: false,
        tabBarPosition: desktop ? 'left' : 'bottom',
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home.tabs.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: t('home.tabs.transactions'),
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
        }}
      />
      <Tabs.Screen
        name="analyse"
        options={{
          title: t('home.tabs.analyse'),
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('home.tabs.more'),
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="ellipsis-horizontal" size={size} color={color} />
              {hasUnseenUpdate ? <View style={[styles.tabBadge, { borderColor: colors.background }]} /> : null}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  target: { flex: 1 },
  desktopColumn: { flex: 1, width: '100%', maxWidth: DESKTOP_MAX_CONTENT, alignSelf: 'center' },
  desktopReading: { maxWidth: 980 },
  tabBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 9,
    height: 9,
    borderRadius: Radius.pill,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
  },
});
