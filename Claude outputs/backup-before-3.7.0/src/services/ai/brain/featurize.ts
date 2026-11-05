/**
 * Turns a message into features for the router. This is a line-for-line copy of ml/features.py:
 * if you change one, change the other and retrain (node scripts/brain-check.mjs compares them using parity.json).
 *
 * Steps: lowercase -> money becomes <amt> -> dates become <date> -> other numbers become <num> -> only a-z 0-9 and the
 * markers stay -> words, word pairs and 3-4 letter chunks inside each word (so "mkn" or "mkan" still look like "makan").
 */

const RE_AMT = [/(?:rm|myr)\s*\d[\d,]*(?:\.\d+)?k?/g, /\d[\d,]*(?:\.\d+)?\s*(?:ringgit|rm|myr)\b/g, /\d+\s*sen\b/g, /\d+(?:\.\d+)?k\b/g];
const RE_DATE = /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g;
const RE_NUM = /\d+(?:[.,]\d+)*/g;
const RE_KEEP = /[^a-z0-9<>]+/g;

export function normalize(text: string): string {
  let t = text.toLowerCase();
  for (const r of RE_AMT) t = t.replace(r, ' <amt> ');
  t = t.replace(RE_DATE, ' <date> ');
  t = t.replace(RE_NUM, ' <num> ');
  t = t.replace(RE_KEEP, ' ');
  return t.split(/\s+/).filter(Boolean).join(' ');
}

export function featurize(text: string): string[] {
  const norm = normalize(text);
  const toks = norm ? norm.split(' ') : [];
  const feats = new Set<string>();
  toks.forEach((w, i) => {
    feats.add(`w:${w}`);
    if (i + 1 < toks.length) feats.add(`b:${w}_${toks[i + 1]}`);
    if (!w.startsWith('<') && w.length >= 3) {
      const s = `^${w}$`;
      for (const n of [3, 4]) for (let j = 0; j + n <= s.length; j++) feats.add(`c:${s.slice(j, j + n)}`);
    }
  });
  return [...feats].sort();
}
