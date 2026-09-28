import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AddRecordProvider } from '@/context/AddRecordContext';
import { ProfileProvider } from '@/context/ProfileContext';
import { TransactionsProvider } from '@/context/TransactionsContext';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ProfileProvider>
        <TransactionsProvider>
          <AddRecordProvider>
            <AnimatedSplashOverlay />
            <AppTabs />
          </AddRecordProvider>
        </TransactionsProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}