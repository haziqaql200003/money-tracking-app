import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAddRecord } from '@/context/AddRecordContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const colors = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { openAddRecord } = useAddRecord();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        // Floats over the content so the blur has something to blur.
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
            style={StyleSheet.absoluteFill}
          />
        ),
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
          tabBarButton: () => (
            <View style={styles.addSlot}>
              <Pressable
                style={[styles.addButton, { backgroundColor: colors.accent }]}
                onPress={openAddRecord}
                accessibilityRole="button"
                accessibilityLabel="Add record"
              >
                <Ionicons name="add" size={32} color="#fff" />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Assets',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addSlot: { flex: 1, alignItems: 'center' },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});