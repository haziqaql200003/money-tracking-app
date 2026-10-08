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
    divider: '#E3E7EF',
    border: '#E6E9F1', // hairline outline around cards on the light background
    accentSoft: '#E6EAF7',
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
    border: '#1F2840',
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

/**
 * Corner radii (2.0.0). Use these instead of ad-hoc numbers so cards, inputs and chips read as one family.
 * Anything round (avatars, icon buttons, dots, pills) uses `pill`.
 */
export const Radius = {
  xs: 4, // progress bars, tiny marks
  sm: 8, // tags, thumbnails, small icon tiles
  md: 12, // inputs, buttons, list icon tiles
  lg: 20, // cards and grouped lists
  xl: 28, // sheets, hero cards
  pill: 999,
} as const;

/** The only font sizes in the app (2.0.0). Pick by role, not by eye. */
export const FontSize = {
  micro: 11, // tab labels, chart axes
  caption: 12, // footnotes, meta
  label: 14, // secondary text, chips, buttons (small)
  body: 16, // default text
  heading: 18, // section and card titles
  title: 22, // sub-screen titles, key figures in cards
  largeTitle: 30, // tab screen titles
  display: 34, // hero amounts
} as const;

/**
 * Type scale (system font for now; a brand typeface arrives with the screen-by-screen redesign).
 * Money and other figures should use `tabularNums` so digits do not jitter when values change.
 */
export const Type = {
  display: { fontSize: FontSize.display, lineHeight: 40, fontWeight: '800', letterSpacing: -0.5 },
  largeTitle: { fontSize: FontSize.largeTitle, lineHeight: 36, fontWeight: '800', letterSpacing: -0.4 },
  title: { fontSize: FontSize.title, lineHeight: 28, fontWeight: '700', letterSpacing: -0.2 },
  heading: { fontSize: FontSize.heading, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: FontSize.body, lineHeight: 22, fontWeight: '500' },
  label: { fontSize: FontSize.label, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: FontSize.caption, lineHeight: 16, fontWeight: '500' },
  micro: { fontSize: FontSize.micro, lineHeight: 14, fontWeight: '600' },
  /** Small uppercase label above grouped lists. */
  overline: { fontSize: FontSize.caption, lineHeight: 16, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
} as const;

export const tabularNums: { fontVariant: FontVariant[] } = { fontVariant: ['tabular-nums'] };
