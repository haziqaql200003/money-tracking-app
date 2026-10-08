import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppLockScreen } from '@/components/app-lock-screen';
import { AddRecordProvider } from '@/context/AddRecordContext';
import { AppLockProvider } from '@/context/AppLockContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CategoriesProvider } from '@/context/CategoriesContext';
import { DebtsProvider } from '@/context/DebtsContext';
import { PlanProvider } from '@/context/PlanContext';
import { PrivacyProvider } from '@/context/PrivacyContext';
import { ProfileProvider } from '@/context/ProfileContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { TransactionsProvider } from '@/context/TransactionsContext';
import { UndoProvider } from '@/context/UndoContext';
import { UpdatesProvider } from '@/context/UpdatesContext';
import { useT } from '@/i18n';
import { clearLock } from '@/services/app-lock';

SplashScreen.preventAutoHideAsync();

/** One lock per signed-in account. Signing out (or being signed out) forgets the PIN, so the next person starts clean. */
function LockScope({ children }: { children: ReactNode }) {
  const { user, isReady } = useAuth();
  useEffect(() => {
    if (isReady && !user) void clearLock();
  }, [isReady, user]);
  return <AppLockProvider key={user?.id ?? 'none'}>{children}</AppLockProvider>;
}

function RootNavigator() {
  const { user, isReady, migrationPending } = useAuth();
  const { lang } = useT();
  if (!isReady) return null; // splash masih menutup skrin

  const loggedIn = !!user;
  const onboarded = !!user?.hasOnboarded;
  // An account that began with Google / Apple has not seen the Privacy Notice yet.
  const needsConsent = loggedIn && !user?.consentAt;

  return (
    // Remounting on a language change redraws every screen in the new language.
    <Stack key={lang} screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!loggedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={needsConsent}>
        <Stack.Screen name="consent" />
      </Stack.Protected>
      <Stack.Protected guard={loggedIn && !needsConsent && migrationPending}>
        <Stack.Screen name="migrate" />
      </Stack.Protected>
      <Stack.Protected guard={loggedIn && !needsConsent && !migrationPending && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={loggedIn && !needsConsent && !migrationPending && onboarded}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      {/* Open to everyone (sign-up form, consent step and Profile > Data link here). They sit LAST on purpose: the
          router opens the first screen that is available, so declared earlier they hijack the start page. */}
      <Stack.Screen name="privacy" />
      <Stack.Screen name="auth-callback" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <LockScope>
        <UpdatesProvider>
          <SettingsProvider>
            <ProfileProvider>
              <PrivacyProvider>
                <CategoriesProvider>
                  <TransactionsProvider>
                    <DebtsProvider>
                    <PlanProvider>
                      <AddRecordProvider>
                        <AnimatedSplashOverlay />
                        <UndoProvider>
                          <RootNavigator />
                          <AppLockScreen />
                        </UndoProvider>
                      </AddRecordProvider>
                    </PlanProvider>
                  </DebtsProvider>
                  </TransactionsProvider>
                </CategoriesProvider>
              </PrivacyProvider>
            </ProfileProvider>
          </SettingsProvider>
        </UpdatesProvider>
        </LockScope>
      </AuthProvider>
    </ThemeProvider>
    </GestureHandlerRootView>
  );
}
