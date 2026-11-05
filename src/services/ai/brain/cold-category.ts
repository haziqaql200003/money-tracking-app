import coldJson from './category-model.json';
import { featurize } from './featurize';

type Nb = { classes: string[]; prior: number[]; d: number[]; features: Record<string, [number, number][]> };
const models = coldJson as unknown as { expense: Nb; income: Nb };

/** Short forms people type that the word list does not know. */
const SHORT: Record<string, string> = {
  mkn: 'makan',
  mkan: 'makan',
  tghari: 'makan tengah hari',
  tengahari: 'makan tengah hari',
  tgh: 'tengah',
  byr: 'bayar',
  blj: 'belanja',
  bl: 'beli',
  mlm: 'malam',
  brkfast: 'breakfast',
  sarapan: 'sarapan',
  ptg: 'petang',
  mnm: 'minum',
};
/** "air" alone is a drink ("air suam", "air A&W", "air tebu"); it is the water bill only next to words like bil / syabas / meter. The model knows "teh" well, so a drink is read as one. */
const WATER_BILL = /\b(bil|bill|syabas|air selangor|pba|sain|laku|meter|utiliti|utility|tunggakan|water)\b/;
const expand = (title: string) => {
  const low = title.toLowerCase();
  const bill = WATER_BILL.test(low);
  return low
    .split(/\s+/)
    .map((w) => (w === 'air' && !bill ? 'teh' : (SHORT[w] ?? w)))
    .join(' ');
};

export type ColdGuess = { categoryId: string; subcategory: string; p: number };

/**
 * Which category does this title belong to, before the pengguna has any history of their own?
 * A Naive Bayes model trained by ml/train.py on Malaysian and English words (nasi lemak, tnb, grab, shell...).
 * The pengguna's own habits (category-model.ts) still win once they have enough records.
 */
export function coldCategory(title: string, kind: 'expense' | 'income'): ColdGuess | null {
  const m = models[kind];
  const feats = featurize(expand(title)).filter((f) => m.features[f]);
  if (feats.length === 0) return null;
  const score = m.classes.map((_, c) => m.prior[c] + feats.length * m.d[c]);
  for (const f of feats) for (const [c, delta] of m.features[f]) score[c] += delta;
  const max = Math.max(...score);
  const ex = score.map((s) => Math.exp(s - max));
  const z = ex.reduce((s, x) => s + x, 0);
  let best = 0;
  for (let i = 1; i < score.length; i++) if (score[i] > score[best]) best = i;
  const [categoryId, subcategory = ''] = m.classes[best].split('|');
  return { categoryId, subcategory, p: ex[best] / z };
}
