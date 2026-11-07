/**
 * Pulls the details out of a message with plain rules: amounts, dates, accounts, periods, titles.
 * (The router decides WHAT the pengguna wants; this decides the numbers and names.)
 */
import { addDays } from '@/utils/cycle';

import type { AiData } from '../engine';

export type Span = { start: number; end: number };
export type AmountHit = Span & { value: number };

const toNumber = (s: string) => Number(s.replace(/,/g, ''));
const sane = (n: number) => Number.isFinite(n) && n > 0 && n < 10_000_000;

/** "rm12.50", "12.50 ringgit", "50 sen", "1.2k" first; plain numbers only when nothing explicit is there. */
export function findAmounts(text: string): AmountHit[] {
  const low = text.toLowerCase();
  const hits: AmountHit[] = [];
  const overlaps = (s: number, e: number) => hits.some((h) => s < h.end && e > h.start);
  const add = (m: RegExpExecArray, value: number) => {
    if (sane(value) && !overlaps(m.index, m.index + m[0].length)) hits.push({ start: m.index, end: m.index + m[0].length, value });
  };
  for (const m of low.matchAll(/(?:rm|myr)\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?(?![a-z])/g)) add(m, toNumber(m[1]) * (m[2] ? 1000 : 1));
  for (const m of low.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(?:ringgit|rm|myr)\b/g)) add(m, toNumber(m[1]));
  for (const m of low.matchAll(/(\d+)\s*sen\b/g)) add(m, toNumber(m[1]) / 100);
  for (const m of low.matchAll(/(\d+(?:\.\d+)?)\s*k\b/g)) add(m, toNumber(m[1]) * 1000);
  if (hits.length === 0) {
    for (const m of low.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
      const s = m.index;
      const e = s + m[0].length;
      const before = low.slice(Math.max(0, s - 1), s);
      const after = low.slice(e, e + 1);
      if (/[a-z/-]/.test(before) || /[a-z/-]/.test(after)) continue; // part of a word or a date
      const tail = low.slice(e, e + 9).trim();
      if (/^(bulan|months?|minggu|weeks?|hari|days?|tahun|years?|kali|times?|transaksi|records?|item|orang)\b/.test(tail)) continue; // a count, not money
      add(m, toNumber(m[0]));
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

/** The amount of one item. With several numbers, the last one with sen is the price ("2 nasi lemak 6.50"). */
export function pickAmount(hits: AmountHit[], text: string): AmountHit | null {
  if (hits.length === 0) return null;
  const withSen = [...hits].reverse().find((h) => /\./.test(text.slice(h.start, h.end)));
  return withSen ?? hits[hits.length - 1];
}

/* ---------------- dates ---------------- */

const MONTH_NAMES: [RegExp, number][] = [
  [/^(jan|januari|january)$/, 1], [/^(feb|februari|february)$/, 2], [/^(mac|mar|march)$/, 3], [/^(apr|april)$/, 4],
  [/^(mei|may)$/, 5], [/^(jun|june)$/, 6], [/^(jul|julai|july)$/, 7], [/^(ogos|ogs|aug|august)$/, 8],
  [/^(sep|sept|september)$/, 9], [/^(okt|oct|oktober|october)$/, 10], [/^(nov|november)$/, 11], [/^(dis|dec|disember|december)$/, 12],
];
const pad = (n: number) => String(n).padStart(2, '0');
const validDay = (y: number, m: number, d: number) => m >= 1 && m <= 12 && d >= 1 && d <= new Date(y, m, 0).getDate();

/** "10 november 2026", "10hb nov", "10/11/2026", "10/11" -> YYYY-MM-DD. A date without a year is the next one that is not in the past. */
export function dateIn(text: string, todayKey: string): { key: string; match: string } | undefined {
  const [ty, tm, td] = todayKey.split('-').map(Number);
  const fix = (day: number, month: number, year?: number) => {
    if (year !== undefined) return year < 100 ? 2000 + year : year;
    return month < tm || (month === tm && day < td) ? ty + 1 : ty;
  };
  const re = /\b(\d{1,2})\s*(?:hb|haribulan|st|nd|rd|th)?\s+(?:of\s+)?([a-z]{3,9})\.?(?:\s*,?\s*(\d{4}))?\b/gi;
  for (const w of text.matchAll(re)) {
    const mo = MONTH_NAMES.find(([r]) => r.test(w[2].toLowerCase()))?.[1];
    if (!mo) continue;
    const day = Number(w[1]);
    const y = fix(day, mo, w[3] ? Number(w[3]) : undefined);
    if (validDay(y, mo, day)) return { key: `${y}-${pad(mo)}-${pad(day)}`, match: w[0] };
  }
  let m: RegExpMatchArray | null;
  m = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (m) {
    const day = Number(m[1]);
    const mo = Number(m[2]);
    const y = fix(day, mo, m[3] ? Number(m[3]) : undefined);
    if (validDay(y, mo, day)) return { key: `${y}-${pad(mo)}-${pad(day)}`, match: m[0] };
  }
  return undefined;
}
export function findDate(text: string, today: string): string | undefined {

  const low = text.toLowerCase();
  if (/\b(semalam|yesterday|smlm)\b/.test(low)) return addDays(today, -1);
  if (/\b(kelmarin|2 days ago|dua hari lepas)\b/.test(low)) return addDays(today, -2);
  if (/\b(hari ni|hari ini|today|tadi|baru je|just now)\b/.test(low)) return today;
  const named = dateIn(low, today);
  if (named) return named.key;
  const m = low.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (m) {
    const day = Number(m[1]);
    const mon = Number(m[2]);
    let year = m[3] ? Number(m[3]) : Number(today.slice(0, 4));
    if (year < 100) year += 2000;
    if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
      const key = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!Number.isNaN(new Date(`${key}T00:00:00`).getTime())) return key;
    }
  }
  return undefined;
}

/* ---------------- periods ---------------- */

export type PeriodName = 'today' | 'last_7_days' | 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'last_12_months' | 'this_year' | 'all';

export function findPeriod(text: string): PeriodName | undefined {
  const low = text.toLowerCase();
  if (/\b(hari ni|hari ini|today)\b/.test(low)) return 'today';
  if (/\b(bulan lepas|bulan lalu|last month|previous month)\b/.test(low)) return 'last_month';
  if (/\b(minggu ni|minggu ini|this week|7 hari|seminggu|last week|minggu lepas|past week)\b/.test(low)) return 'last_7_days';
  if (/\b(bulan ni|bulan ini|this month)\b/.test(low)) return 'this_month';
  if (/\b(tahun ni|tahun ini|this year)\b/.test(low)) return 'this_year';
  if (/\b(12 bulan|setahun|12 months|a year|past year|tahun lepas)\b/.test(low)) return 'last_12_months';
  if (/\b(6 bulan|enam bulan|6 months|half a year|setengah tahun)\b/.test(low)) return 'last_6_months';
  if (/\b(3 bulan|tiga bulan|3 months|three months|quarter)\b/.test(low)) return 'last_3_months';
  if (/\b(semua|sepanjang masa|all time|ever|keseluruhan)\b/.test(low)) return 'all';
  return undefined;
}

/** A custom window: "past 14 days", "2 minggu lepas", "last 3 weeks", "dalam 10 hari". */
export type Range = { from: string; to: string; days: number };

const UNIT_DAYS: Record<string, number> = { day: 1, days: 1, hari: 1, week: 7, weeks: 7, minggu: 7, month: 30, months: 30, bulan: 30 };

/** The LAST "N days / weeks" in the message wins, so "not 14 weeks but 14 days" means 14 days. */
export function findRange(text: string, today: string): Range | undefined {
  const re = /\b(\d{1,3})\s*(days?|hari|weeks?|minggu)\b/gi;
  let last: RegExpExecArray | null = null;
  for (const m of text.matchAll(re)) last = m;
  if (!last) return undefined;
  const n = Number(last[1]);
  const days = Math.min(730, Math.max(1, n * UNIT_DAYS[last[2].toLowerCase()]));
  return { from: addDays(today, -(days - 1)), to: today, days };
}

/** "3 bulan" / "in 6 months" -> 3 / 6 (for the forecast). */
export function findMonths(text: string): number | undefined {
  const m = text.toLowerCase().match(/\b(\d{1,2})\s*(bulan|months?)\b/);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 12) return n;
  }
  if (/\b(setahun|a year|12 bulan)\b/i.test(text)) return 6;
  return undefined;
}

/** "5 transaksi terakhir" / "last 10" -> 5 / 10 */
export function findCount(text: string): number | undefined {
  const m = text.toLowerCase().match(/\b(\d{1,2})\s*(transaksi|rekod|records?|transactions?|terakhir|latest|last|terkini)\b/) ?? text.toLowerCase().match(/\b(?:last|latest|terakhir|terkini)\s*(\d{1,2})\b/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return n >= 1 && n <= 40 ? n : undefined;
}

/* ---------------- categories (for questions like "berapa belanja makan") ---------------- */

const CATEGORY_HINTS: [string, RegExp][] = [
  ['food', /\b(makan|makanan|food|minum|kopi|coffee|lunch|dinner|breakfast|groceries|grocery|dapur|restoran|restaurant)\b/],
  ['transport', /\b(transport|minyak|petrol|fuel|grab|tol|toll|parking|parkir|bas|lrt|mrt|kereta|car)\b/],
  ['bills', /\b(bil|bills?|utiliti|utilities|api|air|elektrik|electricity|internet|sewa|rent)\b/],
  ['shopping', /\b(shopping|beli[- ]belah|baju|pakaian|clothes|shopee|lazada)\b/],
  ['health', /\b(kesihatan|health|ubat|klinik|hospital|medicine|doctor|doktor)\b/],
  ['education', /\b(pendidikan|education|yuran|tuisyen|sekolah|buku|school|tuition)\b/],
  ['entertainment', /\b(hiburan|entertainment|wayang|movie|game|games|konsert)\b/],
  ['subscriptions', /\b(langganan|subscriptions?|netflix|spotify|youtube)\b/],
  ['gifts', /\b(hadiah|gifts?|derma|sedekah)\b/],
  ['family', /\b(keluarga|family|anak|mak|ayah|ibu)\b/],
  ['travel', /\b(melancong|travel|pelancongan|hotel|flight|tiket)\b/],
];

export function findCategoryHint(text: string): string | undefined {
  const low = text.toLowerCase();
  return CATEGORY_HINTS.find(([, re]) => re.test(low))?.[0];
}

/** "belanja kat shopee" -> "shopee". Returns the name after kat / di / at / on, when it is not a category word. */
export function findMerchant(text: string): string | undefined {
  const m = text.toLowerCase().match(/\b(?:kat|dekat|di|at|on|for|untuk|dengan)\s+([a-z0-9][a-z0-9 &'.-]{1,30}?)(?=\s+(?:bulan|minggu|tahun|hari|this|last|in|berapa|how|tadi|semalam)\b|[?.!,]|$)/);
  const name = m?.[1]?.trim();
  if (!name || name.length < 3) return undefined;
  if (findCategoryHint(name)) return undefined;
  if (/^(mana|apa|berapa|what|where|the|my|aku|saya|kau|awak|sini|situ)\b/.test(name)) return undefined;
  return name;
}

/** "lebih rm100" / "above 100" -> 100 */
export function findMinAmount(text: string): number | undefined {
  const m = text.toLowerCase().match(/\b(?:lebih|melebihi|above|over|more than|atas|>)\s*(?:rm|myr)?\s*(\d[\d,]*(?:\.\d+)?)/);
  return m ? toNumber(m[1]) : undefined;
}

/** "bawah rm20" / "under 20" -> 20 */
export function findMaxAmount(text: string): number | undefined {
  const m = text.toLowerCase().match(/\b(?:bawah|below|under|kurang dari|kurang daripada|less than|<)\s*(?:rm|myr)?\s*(\d[\d,]*(?:\.\d+)?)/);
  return m ? toNumber(m[1]) : undefined;
}

export const wantsBiggest = (text: string) => /\b(terbesar|paling (?:besar|mahal|banyak)|biggest|largest|highest|most expensive|top)\b/i.test(text);

/* ---------------- accounts ---------------- */

export type AccountHit = Span & { id: string };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Which of the pengguna's accounts does the message name? Matches the account name or provider ("Maybank", "TNG"),
 * and the generic words "cash/tunai", "savings/simpanan" and "bank" when only one account fits.
 */
export function findAccounts(text: string, d: AiData): AccountHit[] {
  const low = text.toLowerCase();
  const keys: { key: string; ids: Set<string> }[] = [];
  const addKey = (key: string, id: string) => {
    const k = key.trim().toLowerCase();
    if (k.length < 2) return;
    const hit = keys.find((x) => x.key === k);
    if (hit) hit.ids.add(id);
    else keys.push({ key: k, ids: new Set([id]) });
  };
  for (const a of d.accounts) {
    addKey(d.accountLabel(a), a.id);
    if (a.provider) addKey(a.provider, a.id);
    if (/tng|touch/i.test(`${a.name} ${a.provider ?? ''}`)) for (const k of ['tng', 'touch n go', "touch'n go", 'touchngo']) addKey(k, a.id);
    if (a.type === 'cash') for (const k of ['cash', 'tunai', 'duit tunai', 'wallet', 'dompet']) addKey(k, a.id);
    if (a.savings || a.type === 'savings') for (const k of ['savings', 'simpanan', 'tabung']) addKey(k, a.id);
    if (a.type === 'bank' && !a.savings) addKey('bank', a.id);
  }
  const found: AccountHit[] = [];
  for (const { key, ids } of keys.sort((x, y) => y.key.length - x.key.length)) {
    if (ids.size !== 1) continue; // ambiguous word ("bank" with two banks): the pengguna must say which
    const re = new RegExp(`(?:^|[^a-z0-9])(${escapeRe(key)})(?![a-z0-9])`, 'g');
    for (const m of low.matchAll(re)) {
      const start = m.index + m[0].length - m[1].length;
      const end = start + m[1].length;
      if (!found.some((f) => start < f.end && end > f.start)) found.push({ start, end, id: [...ids][0] });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

/** Which way does the money go? Uses the words right before each account: "dari / from / guna" = source, "ke / to / dalam" = target. */
export function transferDirection(text: string, hits: AccountHit[]): { from?: string; to?: string } {
  const low = text.toLowerCase();
  let from: string | undefined;
  let to: string | undefined;
  const loose: string[] = [];
  for (const h of hits) {
    const before = low.slice(Math.max(0, h.start - 14), h.start);
    if (/\b(dari|daripada|from|guna|gunakan|using|pakai|via|menggunakan)\s*$/.test(before)) from ??= h.id;
    else if (/\b(ke|kepada|to|into|dalam|masuk(?:kan)?|untuk)\s*$/.test(before)) to ??= h.id;
    else loose.push(h.id);
  }
  // Left over: "bank ke cash 80" (first = from, second = to), or "topup tng 50" (the one mentioned is the target).
  for (const id of loose) {
    if (!from && !to && loose.length >= 2 && id === loose[0]) from = id;
    else if (!to && id !== from) to = id;
    else if (!from && id !== to) from = id;
  }
  return { from, to };
}

/* ---------------- titles ---------------- */

const FILLER = new Set(
  (
    'beli bayar byr bayaran tadi baru semalam kelmarin smlm ni ini today yesterday guna gunakan pakai dgn dengan kat dekat di at on for untuk the a an my aku saya i paid pay spent spend ' +
    'bought buy got dapat terima dah sudah masuk dalam dari ke to from using via cash tunai ringgit rm myr sen je saja sahaja lah la ye ya nak mahu want to record rekod catat tolong please wakira ' +
    'sebanyak sebanyaknya total jumlah lagi tu nya pula pun dan and expense expenses perbelanjaan'
  ).split(' '),
);

/** What is left of one item after the amount, the account and the filler words: "nasi lemak telur". */
export function cleanTitle(segment: string, remove: Span[]): string {
  let out = '';
  let i = 0;
  for (const r of [...remove].sort((a, b) => a.start - b.start)) {
    if (r.start >= i) {
      out += `${segment.slice(i, r.start)} `;
      i = r.end;
    }
  }
  out += segment.slice(i);
  const words = out
    .replace(/\bhari\s+(?:ni|ini)\b/gi, ' ')
    .replace(/[^\p{L}\p{N}\s'&()-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w) && !FILLER.has(w.toLowerCase().replace(/[()]/g, '')) && !/^\(?\d+([/-]\d+)*\)?$/.test(w));
  // "pay with maybank" leaves a dangling "with" once the account is removed.
  const DANGLING = /^(?:with|dengan|guna|using|via|pay|by)$/i;
  while (words.length > 0 && DANGLING.test(words[words.length - 1])) words.pop();
  while (words.length > 0 && DANGLING.test(words[0])) words.shift();
  const title = words.join(' ').trim().slice(0, 60);
  return title ? title[0].toUpperCase() + title.slice(1) : '';
}

/** Splits "nasi lemak 6.50, teh tarik 2.50 dan roti 3" into one piece per item (commas inside numbers are kept). */
export function splitItems(text: string): string[] {
  return text
    .split(/,(?!\d)|;|\n|\s&\s|\s\+\s|\b(?:dan|and)\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
}
