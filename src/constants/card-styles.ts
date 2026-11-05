import type { TKey } from '@/i18n';

/** Premium designs that can be picked (3.6.0): the Spectrum series, Aurora, Titanium Black and the chipless Titanium Metallic series. */
export type SpectrumDesign = 'pro-spectrum-classic' | 'pro-spectrum-pulse' | 'pro-spectrum-cyber' | 'pro-spectrum-neon';
export type TitaniumSeriesDesign = 'pro-ti-contour' | 'pro-ti-flux' | 'pro-ti-reserve' | 'pro-ti-deco';
export type ProCardDesign = SpectrumDesign | 'pro-aurora' | 'pro-titanium' | TitaniumSeriesDesign;
export type CardDesign = 'aurora' | 'gradient' | 'stripes' | 'solid' | ProCardDesign;

/** Colour finishes for the Titanium Metallic series (the only premium cards that can be recoloured). */
export type TitaniumFinish = 'graphite' | 'champagne' | 'rose' | 'silver' | 'midnight';

/** Premium designs bring their own colours and animation, so the colour picker does not apply to them. */
export const PRO_DESIGNS: { id: ProCardDesign; label: string }[] = [
  { id: 'pro-spectrum-classic', label: 'Spectrum Classic' }, // i18n-ignore: design name
  { id: 'pro-spectrum-pulse', label: 'Spectrum Pulse' }, // i18n-ignore: design name
  { id: 'pro-spectrum-cyber', label: 'Spectrum Cyber' }, // i18n-ignore: design name
  { id: 'pro-spectrum-neon', label: 'Spectrum Neon' }, // i18n-ignore: design name
  { id: 'pro-aurora', label: 'Aurora' }, // i18n-ignore: design name
  { id: 'pro-titanium', label: 'Titanium Black' }, // i18n-ignore: design name
  { id: 'pro-ti-contour', label: 'Titanium Contour' }, // i18n-ignore: design name
  { id: 'pro-ti-flux', label: 'Titanium Flux' }, // i18n-ignore: design name
  { id: 'pro-ti-reserve', label: 'Titanium Reserve' }, // i18n-ignore: design name
  { id: 'pro-ti-deco', label: 'Titanium Deco' }, // i18n-ignore: design name
];

/**
 * Designs taken out of the picker in 3.6.0. Their code is kept, but an account that still uses one is shown
 * (and saved on its next edit) as Titanium Contour in Graphite.
 */
const RETIRED_DESIGNS = ['pro-songket', 'pro-glass', 'pro-diraja', 'pro-batik'];
export const RETIRED_FALLBACK: ProCardDesign = 'pro-ti-contour';

export const TITANIUM_FINISHES: { id: TitaniumFinish; labelKey: TKey }[] = [
  { id: 'graphite', labelKey: 'acct.finish.graphite' },
  { id: 'champagne', labelKey: 'acct.finish.champagne' },
  { id: 'rose', labelKey: 'acct.finish.rose' },
  { id: 'silver', labelKey: 'acct.finish.silver' },
  { id: 'midnight', labelKey: 'acct.finish.midnight' },
];
export const DEFAULT_FINISH: TitaniumFinish = 'graphite';

export function isProDesign(design: CardDesign): design is ProCardDesign {
  return design.startsWith('pro-');
}

export function isSpectrumDesign(design: CardDesign): design is SpectrumDesign {
  return design.startsWith('pro-spectrum-');
}

/** The chipless Titanium Metallic series: these take a colour finish. */
export function isTitaniumSeries(design: CardDesign): design is TitaniumSeriesDesign {
  return design.startsWith('pro-ti-');
}

/** Saved data from older versions or edits may hold anything; fall back to the default look. */
export function normalizeDesign(value: unknown): CardDesign {
  if (RETIRED_DESIGNS.includes(value as string)) return RETIRED_FALLBACK;
  const all = [...CARD_DESIGNS.map((d) => d.id), ...PRO_DESIGNS.map((d) => d.id)];
  return all.includes(value as CardDesign) ? (value as CardDesign) : DEFAULT_DESIGN;
}

export function normalizeFinish(value: unknown): TitaniumFinish {
  return TITANIUM_FINISHES.some((f) => f.id === value) ? (value as TitaniumFinish) : DEFAULT_FINISH;
}

export const CARD_DESIGNS: { id: Exclude<CardDesign, ProCardDesign>; labelKey: TKey }[] = [
  { id: 'aurora', labelKey: 'acct.design.aurora' },
  { id: 'gradient', labelKey: 'acct.design.gradient' },
  { id: 'stripes', labelKey: 'acct.design.stripes' },
  { id: 'solid', labelKey: 'acct.design.solid' },
];

export const CARD_COLORS = [
  '#2563EB', // blue
  '#7C3AED', // violet
  '#DB2777', // pink
  '#DC2626', // red
  '#EA580C', // orange
  '#D97706', // amber
  '#16A34A', // green
  '#0D9488', // teal
  '#475569', // slate
  '#111827', // graphite
];

export const DEFAULT_DESIGN: CardDesign = 'aurora';

// Keyed by account type ('bank' | 'cash' | 'other').
export const DEFAULT_COLOR: Record<string, string> = {
  bank: '#2563EB',
  cash: '#059669',
  savings: '#7C3AED',
  ewallet: '#0EA5E9',
  other: '#EA580C',
};

export function isValidHex(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

/** amount from -1 (towards black) to 1 (towards white). */
export function shade(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const target = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  const mix = (c: number) => (target - c) * p + c;
  return rgbToHex(mix(r), mix(g), mix(b));
}

/** Blend two hex colours: t = 0 gives `a`, t = 1 gives `b`. */
export function mixHex(a: string, b: string, t: number) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex(x.r + (y.r - x.r) * t, x.g + (y.g - x.g) * t, x.b + (y.b - x.b) * t);
}

/** WCAG relative luminance (0 = black, 1 = white). */
export function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const ch = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

/** WCAG contrast ratio between two hex colours (1 to 21). */
export function contrast(a: string, b: string) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function isLightColor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.7;
}

export function hslToHex(h: number, s: number, l: number) {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}
