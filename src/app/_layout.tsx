import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AddRecordProvider } from '@/context/AddRecordContext';
import { CategoriesProvider } from '@/context/CategoriesContext';
import { PrivacyProvider } from '@/context/PrivacyContext';
import { ProfileProvider } from '@/context/ProfileContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { TransactionsProvider } from '@/context/TransactionsContext';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SettingsProvider>
        <ProfileProvider>
          <PrivacyProvider>
            <CategoriesProvider>
              <TransactionsProvider>
                <AddRecordProvider>
                  <AnimatedSplashOverlay />
                  <AppTabs />
                </AddRecordProvider>
              </TransactionsProvider>
            </CategoriesProvider>
          </PrivacyProvider>
        </ProfileProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}