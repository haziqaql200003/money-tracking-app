import type { TKey } from '@/i18n';

export const APP_NAME = 'WaKira';
export const MOTTO = 'Kira. Faham. Rancang.';
/** Dictionary key of the slogan: show it with `t(SLOGAN_KEY)` so it follows the language. */
export const SLOGAN_KEY = 'auth.brand.slogan' as const satisfies TKey;

/** Tiga tonggak produk: Track -> Analyse -> Plan. Show with `t(p.labelKey)` / `t(p.hintKey)`. */
export const PILLARS = [
  { key: 'kira', labelKey: 'auth.pillar.kira.label', hintKey: 'auth.pillar.kira.hint' },
  { key: 'faham', labelKey: 'auth.pillar.faham.label', hintKey: 'auth.pillar.faham.hint' },
  { key: 'rancang', labelKey: 'auth.pillar.rancang.label', hintKey: 'auth.pillar.rancang.hint' },
] as const satisfies readonly { key: string; labelKey: TKey; hintKey: TKey }[];
