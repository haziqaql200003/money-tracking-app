import { Platform, useWindowDimensions } from 'react-native';

/** Web wider than this gets the desktop layout (side menu, wide dashboards). Narrower web and phones keep the app layout. */
export const DESKTOP_MIN_WIDTH = 1024;
/** Content never stretches wider than this on a big monitor. */
export const DESKTOP_MAX_CONTENT = 1280;

export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH;
}
