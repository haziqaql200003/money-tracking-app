import { Platform, useWindowDimensions } from 'react-native';

/** Web wider than this gets the desktop layout (side menu, wide dashboards). Narrower web and phones keep the app layout. */
export const DESKTOP_MIN_WIDTH = 1024;
/** Web from this width up to DESKTOP_MIN_WIDTH is a tablet: an icon rail instead of the bottom bar. */
export const TABLET_MIN_WIDTH = 768;
/** From this width the side menu shows every group open; below it (a laptop) only the group you are in. */
export const WIDE_DESKTOP_MIN_WIDTH = 1440;
/** Content never stretches wider than this on a big monitor. */
export const DESKTOP_MAX_CONTENT = 1280;

/**
 * The four layouts of the web version. Phones and tablets running the app are always `mobile`, so the
 * iOS and Android layouts never change because of this hook.
 * - mobile: below 768 px, bottom tab bar
 * - tablet: 768–1023 px, icon rail on the left
 * - laptop: 1024–1439 px, side menu with collapsible groups
 * - desktop: 1440 px and up, side menu with every group open
 */
export type Breakpoint = 'mobile' | 'tablet' | 'laptop' | 'desktop';

export function breakpointFor(width: number, web = Platform.OS === 'web'): Breakpoint {
  if (!web) return 'mobile';
  if (width >= WIDE_DESKTOP_MIN_WIDTH) return 'desktop';
  if (width >= DESKTOP_MIN_WIDTH) return 'laptop';
  if (width >= TABLET_MIN_WIDTH) return 'tablet';
  return 'mobile';
}

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  return breakpointFor(width);
}

/** Laptop or desktop width on the web: side menu, wide layouts, pop-ups instead of bottom sheets. */
export function useIsDesktop(): boolean {
  const bp = useBreakpoint();
  return bp === 'laptop' || bp === 'desktop';
}

/** Tablet width on the web: icon rail on the left, the phone layout of each screen. */
export function useIsTablet(): boolean {
  return useBreakpoint() === 'tablet';
}

/** A mouse or trackpad is the main pointer (web only). Read once: it does not change while the page is open. */
function finePointer(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(pointer: fine)').matches;
  } catch {
    return false;
  }
}

/**
 * True when the pengguna most likely uses a mouse, so hints should say "click" rather than "tap", and gestures
 * such as swipe or press-and-hold need a visible alternative. A laptop-width browser counts even without the
 * media query (older browsers); a touch tablet browser does not.
 */
export function usePointerHints(): boolean {
  const desktop = useIsDesktop();
  return desktop || finePointer();
}
