import { Colors, type ThemeColor } from '@/constants/theme';
import {
  contrast,
  isSpectrumDesign,
  isTitaniumSeries,
  mixHex,
  normalizeFinish,
  shade,
  type CardDesign,
  type TitaniumFinish,
} from '@/constants/card-styles';

/** Every colour token a screen can ask for (same keys as `Colors.light` / `Colors.dark`). */
export type ThemeColors = Record<ThemeColor, string>;

export type AppThemeId =
  | 'spectrum-classic'
  | 'spectrum-pulse'
  | 'spectrum-cyber'
  | 'spectrum-neon'
  | 'aurora'
  | `ti-${TitaniumFinish}`;

type ThemeSeed = {
  name: string;
  series: 'Spectrum' | 'Aurora' | 'Titanium';
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
  /** Second colour: used for `gold` (goal and milestone highlights) and soft glows. */
  accent2: string;
  /** Optional override for warnings (Aurora uses a warm cabin-light yellow). */
  warning?: string;
};

/**
 * Premium app themes (3.6.0). Each one follows a premium card: the pengguna picks a "theme card" in Settings.
 * Rules: dark mode only (in light mode only the card's accent is used), and green for income / red for
 * spending never change. Text sizes and screen layout stay the same.
 */
const SEEDS: Record<AppThemeId, ThemeSeed> = {
  'spectrum-classic': { name: 'RGB Classic', series: 'Spectrum', bg: '#07060D', surface: '#121022', text: '#FFFFFF', muted: '#A49FC0', accent: '#FF2D95', onAccent: '#07060D', accent2: '#FF8A00' }, // i18n-ignore: theme name
  'spectrum-pulse': { name: 'Pulse', series: 'Spectrum', bg: '#08070F', surface: '#14121F', text: '#FFF7F0', muted: '#B3A796', accent: '#FF8A2A', onAccent: '#1A0D00', accent2: '#2DFF7A' }, // i18n-ignore: theme name
  'spectrum-cyber': { name: 'Cyber', series: 'Spectrum', bg: '#040806', surface: '#0A120D', text: '#E9FFF1', muted: '#7FA58E', accent: '#38FF8B', onAccent: '#02140A', accent2: '#FFE600' }, // i18n-ignore: theme name
  'spectrum-neon': { name: 'Neon', series: 'Spectrum', bg: '#0A0614', surface: '#170F2A', text: '#FBF4FF', muted: '#AE9CC8', accent: '#D04DFF', onAccent: '#0A0614', accent2: '#00D9FF' }, // i18n-ignore: theme name
  aurora: { name: 'Borealis', series: 'Aurora', bg: '#050B1A', surface: '#0B1729', text: '#F2FBFF', muted: '#8FA7B8', accent: '#2FD4A4', onAccent: '#02150F', accent2: '#C46BFF', warning: '#FFC66B' }, // i18n-ignore: theme name
  'ti-graphite': { name: 'Graphite', series: 'Titanium', bg: '#0D0D0F', surface: '#17171A', text: '#ECECEF', muted: '#8E8E96', accent: '#C9CAD1', onAccent: '#0D0D0F', accent2: '#C9CAD1' }, // i18n-ignore: theme name
  'ti-champagne': { name: 'Champagne', series: 'Titanium', bg: '#0C0A07', surface: '#18140E', text: '#ECECEF', muted: '#9C8D72', accent: '#D8B878', onAccent: '#0C0A07', accent2: '#D8B878' }, // i18n-ignore: theme name
  'ti-rose': { name: 'Rose Gold', series: 'Titanium', bg: '#0E0A09', surface: '#1A1312', text: '#ECECEF', muted: '#A08A84', accent: '#E0A690', onAccent: '#0E0A09', accent2: '#E0A690' }, // i18n-ignore: theme name
  'ti-silver': { name: 'Perak', series: 'Titanium', bg: '#141519', surface: '#202227', text: '#F2F3F6', muted: '#9A9DA6', accent: '#E8EAEF', onAccent: '#141519', accent2: '#E8EAEF' }, // i18n-ignore: theme name
  'ti-midnight': { name: 'Midnight', series: 'Titanium', bg: '#090C15', surface: '#121828', text: '#ECECEF', muted: '#7E8AA6', accent: '#9FB2D6', onAccent: '#090C15', accent2: '#9FB2D6' }, // i18n-ignore: theme name
};

export function themeName(id: AppThemeId) {
  return SEEDS[id].name;
}
export function themeSeries(id: AppThemeId) {
  return SEEDS[id].series;
}
/** The theme's main colour, for swatches and icons in Settings. */
export function themeAccent(id: AppThemeId) {
  return SEEDS[id].accent;
}

/** Which theme a premium card brings. Free designs bring none. Titanium Black shares the Graphite theme. */
export function themeForCard(design: CardDesign, finish?: TitaniumFinish): AppThemeId | null {
  if (isSpectrumDesign(design)) return design.replace('pro-', '') as AppThemeId;
  if (design === 'pro-aurora') return 'aurora';
  if (design === 'pro-titanium') return 'ti-graphite';
  if (isTitaniumSeries(design)) return `ti-${normalizeFinish(finish)}`;
  return null;
}

/** Darken a colour until it can be read on a light background (4.5:1), for the light-mode accent. */
function readableOnLight(hex: string, bg: string) {
  let c = hex;
  for (let i = 0; i < 20 && contrast(c, bg) < 4.5; i++) c = shade(c, -0.08);
  return c;
}

function darkPalette(s: ThemeSeed): ThemeColors {
  const base = Colors.dark;
  return {
    ...base,
    text: s.text,
    background: s.bg,
    backgroundElement: s.surface,
    backgroundSelected: mixHex(s.surface, s.accent, 0.16),
    textSecondary: s.muted,
    accent: s.accent,
    accentSoft: mixHex(s.bg, s.accent, 0.18),
    onAccent: s.onAccent,
    divider: mixHex(s.surface, '#FFFFFF', 0.08),
    border: mixHex(s.bg, '#FFFFFF', 0.08),
    gold: s.accent2,
    warning: s.warning ?? base.warning,
    // Income green and spending red stay exactly as in the normal dark theme.
    positive: base.positive,
    negative: base.negative,
    heat0: mixHex(s.surface, s.accent, 0.1),
    heat1: mixHex(s.surface, s.accent, 0.3),
    heat2: mixHex(s.surface, s.accent, 0.52),
    heat3: mixHex(s.surface, s.accent, 0.76),
    heat4: s.accent,
    heatInk: s.bg,
  };
}

function lightPalette(s: ThemeSeed): ThemeColors {
  const base = Colors.light;
  const accent = readableOnLight(s.accent, base.background);
  return {
    ...base,
    accent,
    accentSoft: mixHex('#FFFFFF', accent, 0.12),
    onAccent: '#FFFFFF',
  };
}

const cache = new Map<string, ThemeColors>();

/** Colours for the whole app. No theme = the normal Tenun look. */
export function buildPalette(id: AppThemeId | null, dark: boolean): ThemeColors {
  if (!id) return Colors[dark ? 'dark' : 'light'];
  const key = `${id}|${dark ? 'd' : 'l'}`;
  let p = cache.get(key);
  if (!p) {
    p = dark ? darkPalette(SEEDS[id]) : lightPalette(SEEDS[id]);
    cache.set(key, p);
  }
  return p;
}
