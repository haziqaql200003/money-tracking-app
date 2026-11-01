import type { Transaction, TransactionType } from '@/context/TransactionsContext';
import { isAdjustmentEntry } from '@/utils/saved';

/**
 * WaKira's own small model, trained on this phone from the pengguna's own records. Nothing leaves the phone.
 *
 * It learns which category (and subcategory) a title usually belongs to, e.g. "Petronas" -> Transport / Petrol.
 * Two layers:
 *   1. Exact title memory: the same title seen 2+ times is almost always the same category.
 *   2. Naive Bayes over the words in the title, for titles never seen before ("Nasi lemak Kak Ros").
 *
 * The AI assistant uses it to check the category it suggests: when the pengguna's own habit is clear,
 * the habit wins. It retrains whenever the records change (it takes a few milliseconds for thousands of records).
 */

export type CategoryGuess = {
  categoryId: string;
  subcategory: string;
  /** 0-1. */
  confidence: number;
  /** How many past records back this guess. */
  samples: number;
  source: 'exact' | 'words';
};

export type CategoryModel = {
  predict: (title: string, type: TransactionType) => CategoryGuess | null;
  /** Records the model learned from. */
  size: number;
};

const MAX_TRAIN = 3000;
const STOP = new Set(['dan', 'the', 'and', 'di', 'ke', 'untuk', 'for', 'of', 'rm', 'sdn', 'bhd', 'my', 'ltd', 'plt', 'enterprise', 'trading']);

export const normTitle = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

export function tokens(title: string): string[] {
  return normTitle(title)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2 && !/^\d+$/.test(w) && !STOP.has(w));
}

type ClassStats = { docs: number; words: Map<string, number>; wordTotal: number; subs: Map<string, number> };

function topKey(m: Map<string, number>): [string, number] | null {
  let best: [string, number] | null = null;
  for (const e of m) if (!best || e[1] > best[1]) best = e;
  return best;
}

function trainSide(list: Transaction[]) {
  const exact = new Map<string, Map<string, number>>(); // title -> "cat|sub" -> count
  const classes = new Map<string, ClassStats>();
  const vocab = new Set<string>();
  for (const t of list) {
    const key = `${t.categoryId}|${t.subcategory ?? ''}`;
    const title = normTitle(t.title);
    if (title) {
      const m = exact.get(title) ?? new Map<string, number>();
      m.set(key, (m.get(key) ?? 0) + 1);
      exact.set(title, m);
    }
    const c = classes.get(t.categoryId) ?? { docs: 0, words: new Map(), wordTotal: 0, subs: new Map() };
    c.docs += 1;
    c.subs.set(t.subcategory ?? '', (c.subs.get(t.subcategory ?? '') ?? 0) + 1);
    for (const w of new Set(tokens(t.title))) {
      c.words.set(w, (c.words.get(w) ?? 0) + 1);
      c.wordTotal += 1;
      vocab.add(w);
    }
    classes.set(t.categoryId, c);
  }
  return { exact, classes, vocab, total: list.length };
}

export function trainCategoryModel(transactions: Transaction[]): CategoryModel {
  // Newest first, own typed records only: recurring entries and balance adjustments say nothing about habits.
  const usable = transactions
    .filter((t) => !t.recurringId && !isAdjustmentEntry(t) && t.title.trim() && t.categoryId)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, MAX_TRAIN);
  const sides = {
    debit: trainSide(usable.filter((t) => t.type === 'debit')),
    credit: trainSide(usable.filter((t) => t.type === 'credit')),
  };

  function predict(title: string, type: TransactionType): CategoryGuess | null {
    const side = sides[type];
    if (side.total === 0) return null;

    // 1) Same title as before.
    const seen = side.exact.get(normTitle(title));
    if (seen) {
      const all = [...seen.values()].reduce((s, v) => s + v, 0);
      const best = topKey(seen);
      if (best && all >= 2) {
        const [categoryId, subcategory] = best[0].split('|');
        return { categoryId, subcategory, confidence: best[1] / all, samples: all, source: 'exact' };
      }
    }

    // 2) Words in the title.
    const words = tokens(title).filter((w) => side.vocab.has(w));
    if (words.length === 0) return null;
    const v = side.vocab.size;
    const scores: { id: string; logp: number; hits: number }[] = [];
    for (const [id, c] of side.classes) {
      let logp = Math.log(c.docs / side.total);
      let hits = 0;
      for (const w of words) {
        const n = c.words.get(w) ?? 0;
        if (n > 0) hits += n;
        logp += Math.log((n + 1) / (c.wordTotal + v));
      }
      scores.push({ id, logp, hits });
    }
    scores.sort((a, b) => b.logp - a.logp);
    const max = scores[0].logp;
    const sum = scores.reduce((s, x) => s + Math.exp(x.logp - max), 0);
    const best = scores[0];
    if (best.hits === 0) return null;
    const c = side.classes.get(best.id)!;
    const sub = topKey(c.subs)?.[0] ?? '';
    return { categoryId: best.id, subcategory: sub, confidence: 1 / sum, samples: best.hits, source: 'words' };
  }

  return { predict, size: usable.length };
}
