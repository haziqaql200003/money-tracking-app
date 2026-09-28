import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function MoreLayout() {
  const colors = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}