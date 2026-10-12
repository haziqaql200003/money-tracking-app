import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

// The story and the start buttons come first; sign in and sign up open from there.
export const unstable_settings = { initialRouteName: 'welcome' };

export default function AuthLayout() {
  const colors = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="forgot" />
    </Stack>
  );
}
