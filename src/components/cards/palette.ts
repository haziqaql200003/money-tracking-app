export type Hsl = { h: number; s: number; l: number };

const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

export function hexToHsl(hex: string): Hsl {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s) / 100;
  const ll = clamp(l) / 100;
  const k = (n: number) => (n + hh / 30) % 12;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n: number) => ll - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// Shift hue / saturation / lightness relative to a colour
export function tone(hex: string, dh = 0, ds = 0, dl = 0): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h + dh, s + ds, l + dl);
}

// Keep the hue, set saturation and lightness directly (used for dark backgrounds)
export function setSL(hex: string, s: number, l: number): string {
  const { h } = hexToHsl(hex);
  return hslToHex(h, s, l);
}

export function withAlpha(hex: string, alpha: number): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Colours the user can pick from (Pro). They can also drag the hue strip for any colour.
export const ACCENT_PRESETS = [
  { id: 'emas', name: 'Emas', color: '#D4AF55' },
  { id: 'rose', name: 'Rose Gold', color: '#E8A98F' },
  { id: 'perak', name: 'Perak', color: '#B9C3D3' },
  { id: 'zamrud', name: 'Zamrud', color: '#2FD4A4' },
  { id: 'nilam', name: 'Nilam', color: '#4F8BFF' },
  { id: 'delima', name: 'Delima', color: '#FF5C7C' },
  { id: 'kecubung', name: 'Kecubung', color: '#9B7BFF' },
] as const;

export const DEFAULT_ACCENT = {
  songket: '#D4AF55',
  glass: '#9B7BFF',
  aurora: '#2FD4A4',
  titanium: '#8E8E96',
  diraja: '#7A1426',
  batik: '#0B4F55',
};