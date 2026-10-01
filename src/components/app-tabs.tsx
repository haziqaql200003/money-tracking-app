import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';

import { GlassTabBar } from '@/components/glass/glass-tab-bar';
import { useTheme } from '@/hooks/use-theme';
import { useUpdates } from '@/context/UpdatesContext';

export default function AppTabs() {
  const colors = useTheme();
  const { hasUnseenUpdate } = useUpdates();

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
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
          title: 'Analyse',
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
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
  tabBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
  },
});
