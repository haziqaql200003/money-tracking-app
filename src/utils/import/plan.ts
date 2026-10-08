/** Turns table rows into transactions: reads each row, matches categories/accounts, flags duplicates. Pure functions. */
import { parseAmount, parseDate, parseTypeWord, norm, type DateOrder, type Mapping } from './columns';

export type Kind = 'expense' | 'income';
export type ImportCategory = { id: string; kind: Kind; names: string[]; subs: { name: string; names: string[] }[] };
export type ImportAccount = { id: string; names: string[] };
export type ExistingTx = { date: string; type: 'debit' | 'credit'; amount: number; title: string };
export type Context = {
  categories: ImportCategory[];
  accounts: ImportAccount[];
  existing: ExistingTx[];
  fallback: Record<Kind, string>;
};
export type Options = { dateOrder: DateOrder; positiveIs: 'expense' | 'income'; skipDuplicates: boolean };

export type Parsed = {
  line: number; // 1-based row number in the file, for messages
  date: string;
  title: string;
  amount: number;
  type: 'debit' | 'credit';
  catText: string;
  subText: string;
  accText: string;
  duplicate: boolean;
};
export type Problem = { line: number; reason: 'date' | 'amount' };

/** Loose words people use in their own sheets, mapped to the default category ids. */
const ALIASES: Record<string, string[]> = {
  food: ['makan', 'makanan', 'food', 'dining', 'minum', 'minuman', 'drinks', 'groceries', 'grocery', 'kopi', 'coffee', 'lunch', 'dinner', 'breakfast'],
  transport: ['transport', 'pengangkutan', 'petrol', 'fuel', 'minyak', 'tol', 'toll', 'parking', 'grab', 'kereta', 'car', 'motor'],
  bills: ['bil', 'bills', 'bill', 'utiliti', 'utilities', 'sewa', 'rent', 'housing', 'rumah', 'elektrik', 'air', 'internet'],
  shopping: ['shopping', 'beli belah', 'membeli belah', 'pakaian', 'clothes', 'barang'],
  health: ['health', 'kesihatan', 'medical', 'perubatan', 'ubat', 'doktor', 'hospital'],
  education: ['education', 'pendidikan', 'sekolah', 'school', 'kursus', 'course', 'buku', 'books'],
  entertainment: ['entertainment', 'hiburan', 'movie', 'wayang', 'game', 'games', 'hobi', 'hobby'],
  financial: ['financial', 'kewangan', 'loan', 'pinjaman', 'kad kredit', 'credit card', 'insurans', 'insurance', 'cukai', 'tax'],
  family: ['family', 'keluarga', 'ibu bapa', 'parents', 'anak', 'children', 'personal', 'peribadi'],
  travel: ['travel', 'pelancongan', 'percutian', 'holiday', 'hotel', 'flight', 'tiket'],
  work: ['work', 'kerja', 'office', 'pejabat', 'business expenses'],
  subscriptions: ['subscription', 'subscriptions', 'langganan', 'netflix', 'spotify'],
  gifts: ['gifts', 'gift', 'hadiah', 'raya', 'birthday', 'wedding', 'kenduri'],
  religious: ['zakat', 'sedekah', 'derma', 'donation', 'amal', 'charity', 'religious', 'agama'],
  other: ['other', 'others', 'lain', 'lain lain', 'misc', 'miscellaneous', 'pelbagai', 'uncategorized'],
  income: ['gaji', 'salary', 'income', 'pendapatan', 'wages', 'bonus'],
  freelance: ['freelance', 'kerja bebas', 'bisnes', 'business', 'perniagaan', 'side income'],
  investment: ['investment', 'pelaburan', 'dividend', 'dividen', 'saham'],
  otherincome: ['other income', 'pendapatan lain', 'cashback', 'refund', 'hadiah diterima'],
};

type Found = { categoryId: string; subcategory: string };

function findCategory(text: string, kind: Kind | null, ctx: Context): Found | null {
  const n = norm(text);
  if (!n) return null;
  const pool = ctx.categories.filter((c) => kind === null || c.kind === kind);
  for (const c of pool) if (c.id === n || c.names.some((x) => norm(x) === n)) return { categoryId: c.id, subcategory: '' };
  for (const c of pool) {
    const sub = c.subs.find((s) => s.names.some((x) => norm(x) === n));
    if (sub) return { categoryId: c.id, subcategory: sub.name };
  }
  for (const c of pool) {
    const words = ALIASES[c.id];
    if (words?.includes(n)) return { categoryId: c.id, subcategory: '' };
  }
  // "Food" in "Food & Drinks", "Makanan" in "Makanan & Minuman" (whole first word, at least 4 letters)
  if (n.length >= 4) {
    for (const c of pool) if (c.names.some((x) => norm(x).split(' ')[0] === n)) return { categoryId: c.id, subcategory: '' };
  }
  return null;
}

export function analyze(rows: string[][], headerRow: number, m: Mapping, opt: Options, ctx: Context): { parsed: Parsed[]; problems: Problem[]; total: number } {
  const body = rows.slice(headerRow + 1);
  const get = (r: string[], c: number) => (c >= 0 ? (r[c] ?? '').trim() : '');
  const hasNegative = m.amount >= 0 && body.some((r) => parseAmount(get(r, m.amount))?.negative);
  const seen = new Set(ctx.existing.map((e) => `${e.date}|${e.type}|${e.amount.toFixed(2)}|${norm(e.title)}`));
  const parsed: Parsed[] = [];
  const problems: Problem[] = [];
  let total = 0;

  body.forEach((r, i) => {
    if (!r.some((c) => c.trim() !== '')) return;
    total++;
    const line = headerRow + 2 + i;
    const date = parseDate(get(r, m.date), opt.dateOrder);
    if (!date) return void problems.push({ line, reason: 'date' });

    const catText = get(r, m.category);
    const subText = get(r, m.subcategory);
    const accText = get(r, m.account);
    const title = get(r, m.title);

    let type: 'debit' | 'credit' | null = null;
    let value: number | null = null;

    const credit = m.credit >= 0 ? parseAmount(get(r, m.credit)) : null;
    const debit = m.debit >= 0 ? parseAmount(get(r, m.debit)) : null;
    if ((credit && credit.value > 0) || (debit && debit.value > 0)) {
      if (credit && credit.value > 0) {
        type = 'credit';
        value = credit.value;
      } else if (debit) {
        type = 'debit';
        value = debit.value;
      }
    } else if (m.amount >= 0) {
      const a = parseAmount(get(r, m.amount));
      if (a) {
        value = a.value;
        const word = m.type >= 0 ? parseTypeWord(get(r, m.type)) : null;
        if (word) type = word;
        else if (a.hint) type = a.hint;
        else if (hasNegative) type = a.negative ? 'debit' : 'credit';
        else if (a.negative) type = 'debit';
        else {
          const guess = findCategory(catText || subText, null, ctx);
          const kind = guess ? ctx.categories.find((c) => c.id === guess.categoryId)?.kind : undefined;
          type = kind ? (kind === 'income' ? 'credit' : 'debit') : opt.positiveIs === 'income' ? 'credit' : 'debit';
        }
      }
    }
    if (type === null || value === null || value <= 0) return void problems.push({ line, reason: 'amount' });

    const shownTitle = title || subText || catText;
    const key = `${date}|${type}|${value.toFixed(2)}|${norm(shownTitle)}`;
    parsed.push({ line, date, title: shownTitle, amount: value, type, catText, subText, accText, duplicate: seen.has(key) });
  });
  return { parsed, problems, total };
}

/* ---------------- matching what the file calls things ---------------- */

export type UnmatchedCategory = { key: string; kind: Kind; text: string; count: number };
export type UnmatchedAccount = { key: string; text: string; count: number };

const kindOf = (p: Parsed): Kind => (p.type === 'credit' ? 'income' : 'expense');
export const categoryKey = (kind: Kind, text: string) => `${kind}|${norm(text)}`;

export function unmatchedCategories(rows: Parsed[], ctx: Context): UnmatchedCategory[] {
  const map = new Map<string, UnmatchedCategory>();
  for (const p of rows) {
    const text = p.catText || '';
    if (!text.trim()) continue;
    const kind = kindOf(p);
    if (findCategory(text, kind, ctx)) continue;
    const key = categoryKey(kind, text);
    const hit = map.get(key);
    if (hit) hit.count++;
    else map.set(key, { key, kind, text, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export function unmatchedAccounts(rows: Parsed[], ctx: Context): UnmatchedAccount[] {
  const map = new Map<string, UnmatchedAccount>();
  for (const p of rows) {
    const text = p.accText;
    if (!text.trim()) continue;
    const n = norm(text);
    if (ctx.accounts.some((a) => a.id === n || a.names.some((x) => norm(x) === n))) continue;
    const hit = map.get(n);
    if (hit) hit.count++;
    else map.set(n, { key: n, text, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/** 'new' = create a category/account with the file's name; 'fallback' = Miscellaneous / Other income; otherwise an existing id. */
export type CategoryChoice = 'new' | 'fallback' | string;
export type AccountChoice = 'new' | 'default' | string;
export type Choices = {
  categories: Record<string, CategoryChoice>;
  accounts: Record<string, AccountChoice>;
  defaultAccountId: string;
};

export type Draft = { date: string; title: string; amount: number; type: 'debit' | 'credit'; categoryRef: string; subcategory: string; accountRef: string };
export type Finalized = {
  drafts: Draft[];
  newCategories: { key: string; name: string; kind: Kind }[];
  newAccounts: { key: string; name: string }[];
  skippedDuplicates: number;
};

/** `categoryRef` / `accountRef` are real ids, or `new:<key>` for ones that still have to be created. */
export function finalize(rows: Parsed[], ctx: Context, choices: Choices, skipDuplicates: boolean): Finalized {
  const newCategories = new Map<string, { key: string; name: string; kind: Kind }>();
  const newAccounts = new Map<string, { key: string; name: string }>();
  const drafts: Draft[] = [];
  let skippedDuplicates = 0;

  for (const p of rows) {
    if (skipDuplicates && p.duplicate) {
      skippedDuplicates++;
      continue;
    }
    const kind = kindOf(p);
    let categoryRef = ctx.fallback[kind];
    let subcategory = '';
    const found = p.catText ? findCategory(p.catText, kind, ctx) : null;
    const foundBySub = !found && p.subText ? findCategory(p.subText, kind, ctx) : null;
    if (found) {
      categoryRef = found.categoryId;
      subcategory = found.subcategory;
    } else if (p.catText) {
      const key = categoryKey(kind, p.catText);
      const choice = choices.categories[key] ?? 'fallback';
      if (choice === 'new') {
        categoryRef = `new:${key}`;
        if (!newCategories.has(key)) newCategories.set(key, { key, name: p.catText, kind });
      } else if (choice !== 'fallback') categoryRef = choice;
    } else if (foundBySub) {
      categoryRef = foundBySub.categoryId;
      subcategory = foundBySub.subcategory;
    }
    if (!subcategory && p.subText) {
      const cat = ctx.categories.find((c) => c.id === categoryRef);
      const n = norm(p.subText);
      const sub = cat?.subs.find((s) => s.names.some((x) => norm(x) === n));
      subcategory = sub ? sub.name : p.subText;
    }

    let accountRef = choices.defaultAccountId;
    if (p.accText.trim()) {
      const n = norm(p.accText);
      const acc = ctx.accounts.find((a) => a.id === n || a.names.some((x) => norm(x) === n));
      if (acc) accountRef = acc.id;
      else {
        const choice = choices.accounts[n] ?? 'default';
        if (choice === 'new') {
          accountRef = `new:${n}`;
          if (!newAccounts.has(n)) newAccounts.set(n, { key: n, name: p.accText });
        } else if (choice !== 'default') accountRef = choice;
      }
    }
    drafts.push({ date: p.date, title: p.title, amount: p.amount, type: p.type, categoryRef, subcategory, accountRef });
  }
  return { drafts, newCategories: [...newCategories.values()], newAccounts: [...newAccounts.values()], skippedDuplicates };
}
