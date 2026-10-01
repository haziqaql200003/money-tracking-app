import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AddRecordProvider } from '@/context/AddRecordContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CategoriesProvider } from '@/context/CategoriesContext';
import { PlanProvider } from '@/context/PlanContext';
import { PrivacyProvider } from '@/context/PrivacyContext';
import { ProfileProvider } from '@/context/ProfileContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { TransactionsProvider } from '@/context/TransactionsContext';
import { UpdatesProvider } from '@/context/UpdatesContext';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, isReady } = useAuth();
  if (!isReady) return null; // splash masih menutup skrin

  const loggedIn = !!user;
  const onboarded = !!user?.hasOnboarded;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!loggedIn}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="privacy" />
      </Stack.Protected>
      <Stack.Protected guard={loggedIn && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={loggedIn && onboarded}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <UpdatesProvider>
          <SettingsProvider>
            <ProfileProvider>
              <PrivacyProvider>
                <CategoriesProvider>
                  <TransactionsProvider>
                    <PlanProvider>
                      <AddRecordProvider>
                        <AnimatedSplashOverlay />
                        <RootNavigator />
                      </AddRecordProvider>
                    </PlanProvider>
                  </TransactionsProvider>
                </CategoriesProvider>
              </PrivacyProvider>
            </ProfileProvider>
          </SettingsProvider>
        </UpdatesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
