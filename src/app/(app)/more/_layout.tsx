import { Stack, useNavigation } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useTheme } from '@/hooks/use-theme';

// A page opened from elsewhere (e.g. Import from Home) still has the More list under it, so Back leads there.
export const unstable_settings = { initialRouteName: 'index' };

type StackNav = {
  getState: () => { index: number; routes: { name: string }[] };
  reset: (state: { index: number; routes: { name: string }[] }) => void;
};

export default function MoreLayout() {
  const colors = useTheme();
  const tabs = useNavigation();
  // The stack's own navigation, caught from its screens (the layout only sees the tab navigator).
  const stack = useRef<StackNav | null>(null);

  // More always opens on its list: going to another tab, or tapping More again, closes the pages opened in it
  // (for example What's New), so nobody comes back to a page they opened long ago.
  useEffect(() => {
    const backToList = (onlyIfNoList: boolean) => {
      const nav = stack.current;
      if (!nav) return;
      const s = nav.getState();
      const noList = s.routes[0]?.name !== 'index';
      if (noList || (!onlyIfNoList && s.index > 0)) nav.reset({ index: 0, routes: [{ name: 'index' }] }); // i18n-ignore: route name
    };
    const offBlur = tabs.addListener('blur', () => backToList(false));
    // Tapping More again: the stack already goes back to its first page by itself; only a page opened
    // from another tab (with no list under it) needs help. `tabPress` is a tab event the generic type does not list.
    const offPress = (tabs.addListener as (e: string, cb: () => void) => () => void)('tabPress', () => backToList(true));
    return () => {
      offBlur();
      offPress();
    };
  }, [tabs]);

  return (
    <Stack
      screenListeners={({ navigation }) => {
        stack.current = navigation as unknown as StackNav;
        return {};
      }}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
