/** Understanding the cells: which column is what, and turning text into dates, amounts and in/out. Pure functions. */
import { serialToIso } from './table';

export type Role = 'date' | 'title' | 'amount' | 'debit' | 'credit' | 'type' | 'category' | 'subcategory' | 'account';
export const ROLES: Role[] = ['date', 'title', 'amount', 'debit', 'credit', 'type', 'category', 'subcategory', 'account'];

/** column index per role, or -1 when the file has no such column */
export type Mapping = Record<Role, number>;
export const emptyMapping = (): Mapping => ({ date: -1, title: -1, amount: -1, debit: -1, credit: -1, type: -1, category: -1, subcategory: -1, account: -1 });

export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Header words (already normalised) per role, English and Malay. First exact hits win, then "contains". */
const HEADERS: Record<Role, string[]> = {
  date: ['date', 'tarikh', 'transaction date', 'tarikh transaksi', 'posting date', 'tkh', 'day'],
  title: ['title', 'description', 'desc', 'details', 'detail', 'memo', 'name', 'item', 'remarks', 'remark', 'keterangan', 'butiran', 'perihal', 'tajuk', 'nota', 'note', 'notes', 'payee', 'merchant', 'particulars', 'transaction'],
  amount: ['amount', 'amt', 'jumlah', 'value', 'nilai', 'rm', 'myr', 'total', 'sum', 'price', 'harga'],
  debit: ['debit', 'withdrawal', 'withdrawals', 'expense', 'expenses', 'spending', 'out', 'belanja', 'perbelanjaan', 'keluar', 'wang keluar', 'dr', 'paid out'],
  credit: ['credit', 'deposit', 'deposits', 'income', 'in', 'masuk', 'pendapatan', 'wang masuk', 'cr', 'paid in'],
  type: ['type', 'jenis', 'kind', 'in out', 'transaction type', 'jenis transaksi', 'dr cr', 'income expense'],
  category: ['category', 'kategori', 'cat', 'group', 'kumpulan'],
  subcategory: ['subcategory', 'sub category', 'subkategori', 'sub kategori', 'sub cat'],
  account: ['account', 'akaun', 'wallet', 'bank', 'dompet', 'payment method', 'payment', 'kaedah bayaran', 'method', 'paid from', 'source'],
};

function headerRole(cell: string): Role | null {
  const n = norm(cell);
  if (!n) return null;
  for (const role of ROLES) if (HEADERS[role].includes(n)) return role;
  // "contains": subcategory before category, debit/credit before the generic amount
  const order: Role[] = ['subcategory', 'category', 'debit', 'credit', 'type', 'account', 'date', 'amount', 'title'];
  for (const role of order) {
    for (const h of HEADERS[role]) if (h.length >= 4 && (n.includes(h) || n.startsWith(`${h} `))) return role;
  }
  return null;
}

export type Detected = { headerRow: number; mapping: Mapping };

/** Finds the header row (first 10 rows) and guesses a column for every role. Never throws. */
export function detectColumns(rows: string[][]): Detected {
  let headerRow = -1;
  let found: Mapping = emptyMapping();
  let bestHits = 1;
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const m = emptyMapping();
    let hits = 0;
    rows[r].forEach((cell, c) => {
      const role = headerRole(cell);
      if (role && m[role] === -1) {
        m[role] = c;
        hits++;
      }
    });
    if (hits > bestHits) {
      bestHits = hits;
      headerRow = r;
      found = m;
    }
  }
  const start = headerRow + 1;
  const sample = rows.slice(start, start + 30);
  const used = (c: number) => ROLES.some((role) => found[role] === c);
  const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
  // No header words for date/amount? Look at what the cells contain.
  if (found.date === -1) {
    for (let c = 0; c < width; c++) {
      if (used(c)) continue;
      const vals = sample.map((r) => r[c] ?? '').filter(Boolean);
      if (vals.length && vals.filter((v) => parseDate(v, 'dmy')).length / vals.length >= 0.7) {
        found.date = c;
        break;
      }
    }
  }
  if (found.amount === -1 && found.debit === -1 && found.credit === -1) {
    for (let c = 0; c < width; c++) {
      if (used(c)) continue;
      const vals = sample.map((r) => r[c] ?? '').filter(Boolean);
      if (vals.length && vals.filter((v) => parseAmount(v) !== null).length / vals.length >= 0.7) {
        found.amount = c;
        break;
      }
    }
  }
  if (found.title === -1) {
    for (let c = 0; c < width; c++) {
      if (used(c)) continue;
      const vals = sample.map((r) => r[c] ?? '').filter(Boolean);
      if (vals.length && vals.filter((v) => parseAmount(v) === null && !parseDate(v, 'dmy')).length / vals.length >= 0.7) {
        found.title = c;
        break;
      }
    }
  }
  return { headerRow, mapping: found };
}

/* ---------------- dates ---------------- */

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, januari: 1, feb: 2, february: 2, februari: 2, mar: 3, march: 3, mac: 3, apr: 4, april: 4,
  may: 5, mei: 5, jun: 6, june: 6, jul: 7, july: 7, julai: 7, aug: 8, august: 8, ogos: 8, ogo: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, okt: 10, oktober: 10, nov: 11, november: 11,
  dec: 12, december: 12, dis: 12, disember: 12,
};

export type DateOrder = 'dmy' | 'mdy';

function valid(y: number, m: number, d: number): string | null {
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1) return null;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d > days) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
const fullYear = (y: number) => (y < 100 ? 2000 + y : y);

/** Returns YYYY-MM-DD or null. `order` only matters for ambiguous numbers such as 03/04/2026. */
export function parseDate(input: string, order: DateOrder): string | null {
  const s = input.trim();
  if (!s) return null;
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/.exec(s);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:[T\s,].*)?$/.exec(s);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const y = fullYear(+m[3]);
    return order === 'dmy' ? valid(y, b, a) : valid(y, a, b);
  }
  m = /^(\d{1,2})[\s\-/.]*([A-Za-z]{3,9})\.?[\s\-/.,]*(\d{2}|\d{4})(?:[T\s,].*)?$/.exec(s);
  if (m && MONTHS[m[2].toLowerCase()]) return valid(fullYear(+m[3]), MONTHS[m[2].toLowerCase()], +m[1]);
  m = /^([A-Za-z]{3,9})\.?[\s\-/.]*(\d{1,2})(?:st|nd|rd|th)?[\s,\-/.]+(\d{2}|\d{4})$/.exec(s);
  if (m && MONTHS[m[1].toLowerCase()]) return valid(fullYear(+m[3]), MONTHS[m[1].toLowerCase()], +m[2]);
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (m) return valid(+m[1], +m[2], +m[3]);
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n >= 32874 && n <= 73415) return serialToIso(n); // 1990..2100
  }
  return null;
}

/** Looks at slash-style dates in the file: a first part above 12 means day-first, a second part above 12 means month-first. */
export function detectDateOrder(values: string[]): DateOrder {
  let dmy = 0;
  let mdy = 0;
  for (const v of values) {
    const m = /^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/.exec(v.trim());
    if (!m) continue;
    if (+m[1] > 12) dmy++;
    else if (+m[2] > 12) mdy++;
  }
  return mdy > dmy ? 'mdy' : 'dmy'; // Malaysia writes day first
}

/* ---------------- amounts ---------------- */

export type Amount = { value: number; negative: boolean; hint?: 'credit' | 'debit' };

/** "RM 1,234.50", "(120)", "-50", "1.234,50", "250 CR". Returns the absolute value plus whether it was negative. */
export function parseAmount(input: string): Amount | null {
  let s = input.trim();
  if (!s) return null;
  let negative = false;
  let hint: Amount['hint'];
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  const suffix = /\s*(CR|DR|cr|dr)\.?$/.exec(s);
  if (suffix) {
    hint = suffix[1].toLowerCase() === 'cr' ? 'credit' : 'debit';
    s = s.slice(0, suffix.index);
  }
  s = s.replace(/(RM|MYR|USD|SGD|\$|€|£)/gi, '').replace(/[\s ]/g, '');
  if (s.startsWith('-') || s.startsWith('−')) {
    negative = true;
    s = s.slice(1);
  } else if (s.endsWith('-')) {
    negative = true;
    s = s.slice(0, -1);
  }
  if (s.startsWith('+')) s = s.slice(1);
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  let normalised: string;
  if (lastDot >= 0 && lastComma >= 0) {
    normalised = lastDot > lastComma ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.');
  } else if (lastComma >= 0) {
    normalised = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : /,\d{1,2}$/.test(s) && s.indexOf(',') === lastComma ? s.replace(',', '.') : s.replace(/,/g, '');
  } else if (lastDot >= 0) {
    normalised = (s.match(/\./g) ?? []).length > 1 ? s.replace(/\./g, '') : s;
  } else normalised = s;
  const value = Math.round(Number(normalised) * 100) / 100;
  if (!Number.isFinite(value)) return null;
  return { value, negative, hint };
}

/* ---------------- income / expense words ---------------- */

const CREDIT_WORDS = new Set(['credit', 'cr', 'income', 'in', 'masuk', 'pendapatan', 'deposit', 'terima', 'diterima', 'gaji', 'salary', 'plus', '+']);
const DEBIT_WORDS = new Set(['debit', 'dr', 'expense', 'expenses', 'out', 'keluar', 'belanja', 'perbelanjaan', 'withdrawal', 'bayar', 'bayaran', 'spend', 'spending', 'minus', '-']);

export function parseTypeWord(input: string): 'credit' | 'debit' | null {
  const raw = input.trim().toLowerCase();
  if (raw === '+') return 'credit';
  if (raw === '-') return 'debit';
  const n = norm(input);
  if (CREDIT_WORDS.has(n)) return 'credit';
  if (DEBIT_WORDS.has(n)) return 'debit';
  return null;
}
