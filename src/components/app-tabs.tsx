import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurTargetView } from 'expo-blur';

import { GlassTabBar } from '@/components/glass/glass-tab-bar';
import { useTheme } from '@/hooks/use-theme';
import { useUpdates } from '@/context/UpdatesContext';
import { useT } from '@/i18n';
import { Radius } from '@/constants/theme';

export default function AppTabs() {
  const { t } = useT();
  const colors = useTheme();
  const { hasUnseenUpdate } = useUpdates();
  // Android blur needs to know what to blur: the screens sit in this target, the tab bar blurs it.
  const blurTarget = useRef<View>(null);

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} blurTarget={blurTarget} />}
      screenLayout={({ children }) => (
        <BlurTargetView ref={blurTarget} style={styles.target}>
          {children}
        </BlurTargetView>
      )}
      screenOptions={{
        headerShown: false,
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
