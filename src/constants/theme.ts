/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform, type TextStyle } from 'react-native';

type FontVariant = NonNullable<TextStyle['fontVariant']>[number];

/**
 * WaKira "Tenun" palette — quiet woven-cloth neutrals, ink-indigo for action, and a single
 * songket-gold thread (`gold`) kept for premium moments (Songket card, goals, milestones).
 * Existing keys keep their names so every screen picks up the new look; new keys are additive.
 */
export const Colors = {
  light: {
    text: '#141A2E', // ink
    background: '#F3F5F9', // kapas: cool cotton, not cream
    backgroundElement: '#FFFFFF', // cards, inputs, sheets' inner surfaces
    backgroundSelected: '#E5E9F2',
    textSecondary: '#586078',
    positive: '#1E7F5C', // pandan
    negative: '#C13B2D', // cili
    accent: '#26357F', // tinta indigo
    divider: '#DDE2EC',
    accentSoft: '#E4E8F7',
    onAccent: '#FFFFFF',
    warning: '#A66A00', // kunyit, dark enough for text on light
    info: '#1F6FA8',
    gold: '#B8891E', // songket thread
    overlay: 'rgba(12,16,32,0.5)',
  },
  dark: {
    text: '#F2F4FA',
    background: '#0C111F', // malam
    backgroundElement: '#161D31',
    backgroundSelected: '#222B46',
    textSecondary: '#A4ACC4',
    positive: '#4FBF93',
    negative: '#EE7F6F',
    accent: '#5B73E8',
    divider: '#252E49',
    accentSoft: '#1D2749',
    onAccent: '#FFFFFF',
    warning: '#E5B04A',
    info: '#62AEE3',
    gold: '#D9B45A',
    overlay: 'rgba(0,0,0,0.6)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 800;

/** Corner radii. Use these instead of ad-hoc numbers so cards, inputs and chips read as one family. */
export const Radius = {
  sm: 8, // small tags, thumbnails
  md: 12, // inputs, buttons, rows
  lg: 16, // cards
  xl: 24, // account cards, sheets
  pill: 999,
} as const;

/**
 * Type scale (system font for now; a brand typeface arrives with the screen-by-screen redesign).
 * Money and other figures should use `tabularNums` so digits do not jitter when values change.
 */
export const Type = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
} as const;

export const tabularNums: { fontVariant: FontVariant[] } = { fontVariant: ['tabular-nums'] };
