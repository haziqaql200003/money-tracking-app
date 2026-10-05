export type ProCardDesign = 'pro-songket' | 'pro-glass' | 'pro-aurora' | 'pro-titanium' | 'pro-diraja' | 'pro-batik';
export type CardDesign = 'aurora' | 'gradient' | 'stripes' | 'solid' | ProCardDesign;

/** Premium designs bring their own colours and animation, so the colour picker does not apply to them. */
export const PRO_DESIGNS: { id: ProCardDesign; label: string }[] = [
  { id: 'pro-songket', label: 'Songket' },
  { id: 'pro-glass', label: 'Glass' },
  { id: 'pro-aurora', label: 'Aurora' },
  { id: 'pro-titanium', label: 'Titanium' },
  { id: 'pro-diraja', label: 'Diraja' },
  { id: 'pro-batik', label: 'Batik' },
];

export function isProDesign(design: CardDesign): design is ProCardDesign {
  return design.startsWith('pro-');
}

/** Saved data from older versions or edits may hold anything; fall back to the default look. */
export function normalizeDesign(value: unknown): CardDesign {
  const all = [...CARD_DESIGNS.map((d) => d.id), ...PRO_DESIGNS.map((d) => d.id)];
  return all.includes(value as CardDesign) ? (value as CardDesign) : DEFAULT_DESIGN;
}

export const CARD_DESIGNS: { id: Exclude<CardDesign, ProCardDesign>; label: string }[] = [
  { id: 'aurora', label: 'Aurora' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'stripes', label: 'Stripes' },
  { id: 'solid', label: 'Solid' },
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
