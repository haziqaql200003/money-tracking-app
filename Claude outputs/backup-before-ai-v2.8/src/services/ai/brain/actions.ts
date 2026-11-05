/**
 * Things the brain can SET UP in other parts of WaKira, always as a card the pengguna confirms:
 *   instalment  "record installment in SPayLater, Claude AI RM99, 3 bulan"   -> Hutang (instalment plan)
 *   iou         "Ali hutang saya RM50" / "I owe Siti 30"                    -> Hutang (between people)
 *   budget      "set bajet makan RM500"                                      -> category budget
 *   goal        "nak simpan RM5000 untuk kahwin by Disember 2027"            -> savings goal
 *   recurring   "bayar Netflix RM17 setiap bulan"                            -> recurring bill
 * Each one is spotted by clear words (rules), so nothing is guessed from a vague sentence.
 */
import { GOAL_PRESETS } from '@/constants/goals';
import type { RecurringRule } from '@/context/TransactionsContext';
import { addDays } from '@/utils/cycle';

import type { AiData } from '../engine';
import { coldCategory } from './cold-category';
import { rm, type Translate } from './reply';
import { findAccounts, findAmounts, findCategoryHint, pickAmount } from './slots';
import type { ActionProposal } from './types';

let n = 0;
const ref = () => `a${Date.now().toString(36)}${(n++).toString(36)}`;
const round2 = (x: number) => Math.round(x * 100) / 100;

/** Same day next month (day capped at 28 so it exists in every month). */
export function nextMonth(dateKey: string, k = 1): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const total = y * 12 + (m - 1) + k;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-${String(Math.min(d, 28)).padStart(2, '0')}`;
}

/** The account the pengguna named, else the one they use most (never a savings account). */
function payAccount(text: string, d: AiData): string | undefined {
  const named = findAccounts(text, d)[0]?.id;
  if (named) return named;
  const counts = new Map<string, number>();
  for (const x of d.transactions.slice(-60)) counts.set(x.accountId, (counts.get(x.accountId) ?? 0) + 1);
  const usable = d.accounts.filter((a) => !a.savings);
  return [...usable].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))[0]?.id;
}

function categoryFor(title: string, d: AiData) {
  const g = title ? coldCategory(title, 'expense') : null;
  const c = g && g.p >= 0.35 ? d.categories.find((x) => x.id === g.categoryId && x.kind === 'expense') : undefined;
  return c ? { categoryId: c.id, subcategory: c.subcategories.includes(g!.subcategory) ? g!.subcategory : (c.subcategories[0] ?? '') } : {};
}

const accName = (d: AiData, id?: string) => {
  const a = id ? d.accounts.find((x) => x.id === id) : undefined;
  return a ? d.accountLabel(a) : '-';
};

/** Words that are not part of a name ("record installment in SPayLater about ..."). */
const NOISE = new Set(
  (
    'record rekod catat add tambah new baru installment installments instalment instalments ansuran bnpl paylater spaylater atome grab boost payflex shopee split ' +
    'in dalam guna using via with dengan about tentang untuk for it its it\'s is ini itu a an the my saya aku bayar pay paid beli bought buy plan bulan months month x kali ' +
    'rm myr ringgit sebulan monthly per setiap tiap every and dan . , - over selama sepanjang'
  ).split(' '),
);
function nameFrom(text: string, extra: RegExp[] = []): string {
  let s = text;
  for (const r of extra) s = s.replace(r, ' ');
  const words = s
    .replace(/[^\p{L}\p{N}\s&'-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !NOISE.has(w.toLowerCase()) && !/^\d+([.,]\d+)?k?$/i.test(w) && !/^(rm|myr)\d/i.test(w) && !/^\d+(x|bln|bulan|months?)$/i.test(w));
  const name = words.join(' ').trim().slice(0, 50);
  return name ? name[0].toUpperCase() + name.slice(1) : '';
}

/* ---------------- instalment / BNPL ---------------- */

const PROVIDERS: [RegExp, string][] = [
  [/\b(spaylater|shopee ?pay ?later|s ?pay ?later)\b/i, 'SPayLater'],
  [/\batome\b/i, 'Atome'],
  [/\b(grab ?pay ?later|paylater by grab|grab ?later)\b/i, 'Grab PayLater'],
  [/\b(boost ?payflex|payflex)\b/i, 'Boost PayFlex'],
  [/\b(kad kredit|credit card)\b/i, 'Credit card'],
  [/\b(tiktok ?shop ?pay ?later|tik ?tok ?pay ?later|tiktok ?later)\b/i, 'TikTok PayLater'],
  [/\b(pay ?later|bnpl)\b/i, 'PayLater'],
];
export const detectInstalment = (text: string) => /\b(ansuran|installments?|instalments?|bnpl|pay ?later|spaylater|atome|payflex|easy ?payment|epp)\b/i.test(text);

export function monthsIn(text: string): number | undefined {
  const m = text.match(/\b(\d{1,2})\s*(bulan|bln|months?|mths?|ansuran|installments?|instalments?|kali|x)\b/i) ?? text.match(/\bx\s*(\d{1,2})\b/i);
  const v = m ? Number(m[1]) : NaN;
  return v >= 1 && v <= 60 ? v : undefined;
}

export type InstalmentDraft = { name: string; provider: string; amount?: number; perMonth: boolean; months?: number; payFrom?: string; date?: string; firstDue?: string; interest?: boolean };

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
  let m = text.match(/\b(\d{1,2})\s*(?:hb|haribulan|st|nd|rd|th)?\s+(?:of\s+)?([a-z]{3,9})\.?(?:\s*,?\s*(\d{4}))?\b/i);
  if (m) {
    const mo = MONTH_NAMES.find(([re]) => re.test(m![2].toLowerCase()))?.[1];
    if (mo) {
      const day = Number(m[1]);
      const y = fix(day, mo, m[3] ? Number(m[3]) : undefined);
      if (validDay(y, mo, day)) return { key: `${y}-${pad(mo)}-${pad(day)}`, match: m[0] };
    }
  }
  m = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (m) {
    const day = Number(m[1]);
    const mo = Number(m[2]);
    const y = fix(day, mo, m[3] ? Number(m[3]) : undefined);
    if (validDay(y, mo, day)) return { key: `${y}-${pad(mo)}-${pad(day)}`, match: m[0] };
  }
  return undefined;
}

export function instalmentDraft(text: string, d: AiData): InstalmentDraft {
  const provider = PROVIDERS.find(([re]) => re.test(text))?.[1] ?? '';
  // "first payment 10 november 2026" / "bayaran pertama 10 nov": take the date, then drop the whole phrase so it never ends up in the name.
  const clause = text.match(/\b(first (?:payment|due|instal?lment)(?: (?:is|on|date))?|bayaran pertama|mula bayar|start(?:s|ing)?(?: on)?|due(?: on)?|bermula)\b[^,.;\n]*/i);
  const found = dateIn(clause ? clause[0] : '', d.todayKey);
  const rate = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
  let body = text;
  if (clause) body = body.replace(clause[0], ' ');
  // "with 0% interest" / "faedah 0%" / "tanpa faedah" are about the plan, not the item name.
  body = body.replace(/\b(?:with|dengan|at|tanpa|no)?\s*\d+(?:[.,]\d+)?\s*%\s*(?:interest|faedah|kadar)?/gi, ' ').replace(/\b(?:interest|faedah|bunga)\b/gi, ' ');
  const hit = pickAmount(findAmounts(body), body);
  return {
    name: nameFrom(body, PROVIDERS.map(([re]) => new RegExp(re.source, 'gi'))),
    provider,
    amount: hit?.value,
    perMonth: /\b(sebulan|per month|a month|monthly|\/bulan|\/month|setiap bulan|each month)\b/i.test(text),
    months: monthsIn(body),
    payFrom: payAccount(text, d),
    ...(found ? { firstDue: found.key } : {}),
    ...(rate && Number(rate[1].replace(',', '.')) > 0 ? { interest: true } : {}),
  };
}

export function instalmentAction(t: Translate, d: AiData, draft: InstalmentDraft): ActionProposal | null {
  if (!draft.amount || !draft.months || !draft.payFrom) return null;
  const principal = round2(draft.perMonth ? draft.amount * draft.months : draft.amount);
  const monthly = round2(principal / draft.months);
  const today = d.todayKey;
  const name = draft.name || draft.provider || t('ai.b.act.instalmentName');
  const input = {
    name,
    provider: draft.provider || t('ai.b.act.providerUnknown'),
    principal,
    months: draft.months,
    totalFee: 0,
    startDate: today,
    firstDue: draft.firstDue ?? nextMonth(today),
    payFromAccountId: draft.payFrom,
    paidCount: 0,
    ...categoryFor(name, d),
  };
  return {
    kind: 'instalment',
    ref: ref(),
    title: t('ai.b.act.instalment'),
    input,
    summary: [
      { label: t('ai.b.act.what'), value: name },
      { label: t('ai.b.act.provider'), value: input.provider },
      { label: t('ai.b.act.total'), value: rm(principal) },
      { label: t('ai.b.act.plan'), value: t('ai.b.act.planValue', { months: draft.months, monthly: rm(monthly) }) },
      { label: t('ai.b.act.firstDue'), value: input.firstDue },
      { label: t('ai.b.act.payFrom'), value: accName(d, draft.payFrom) },
    ],
    notes: [draft.interest ? t('ai.b.act.interestNote') : t('ai.b.act.noFee'), ...(draft.perMonth ? [] : [t('ai.b.act.assumedTotal', { amount: rm(principal) })])],
  };
}

/* ---------------- IOU (between people) ---------------- */

const NOT_PERSON = new Set('saya aku me i you awak kau duit money rm the a my dia bank maybank cimb tng cash tunai kawan'.split(' '));

export function iouAction(t: Translate, d: AiData, text: string): ActionProposal | null {
  if (detectInstalment(text)) return null;
  const low = text.toLowerCase();
  const amount = pickAmount(findAmounts(text), text)?.value;
  if (!amount) return null;
  let person: string | undefined;
  let direction: 'owe' | 'owed' | undefined;
  let m: RegExpMatchArray | null;
  if ((m = low.match(/\b([a-z][a-z'-]{1,20})\s+(?:hutang|owes|berhutang(?: dengan)?|pinjam(?: duit)?(?: dari| daripada)?)\s+(?:saya|aku|me)\b/))) [person, direction] = [m[1], 'owed'];
  else if ((m = low.match(/\b(?:pinjamkan|lent|lend|bagi pinjam|beri pinjam)\s+(?:duit\s+)?(?:kepada|kat|to|dekat)?\s*([a-z][a-z'-]{1,20})/))) [person, direction] = [m[1], 'owed'];
  else if ((m = low.match(/\b(?:saya|aku|i)\s+(?:hutang|owe|berhutang(?: dengan| kepada| kat)?)\s+([a-z][a-z'-]{1,20})/))) [person, direction] = [m[1], 'owe'];
  else if ((m = low.match(/\b(?:pinjam|borrowed?)(?:\s+duit)?\s+(?:dari|daripada|from|kat|dengan)\s+([a-z][a-z'-]{1,20})/))) [person, direction] = [m[1], 'owe'];
  else if ((m = low.match(/\bhutang\s+(?!saya|aku)([a-z][a-z'-]{1,20})\b/))) [person, direction] = [m[1], 'owe'];
  if (!person || !direction || NOT_PERSON.has(person)) return null;
  const name = person[0].toUpperCase() + person.slice(1);
  return {
    kind: 'iou',
    ref: ref(),
    title: t(direction === 'owe' ? 'ai.b.act.iouOwe' : 'ai.b.act.iouOwed'),
    input: { person: name, direction, amount: round2(amount), repeat: 'none' },
    summary: [
      { label: t('ai.b.act.person'), value: name },
      { label: t('ai.b.act.amount'), value: rm(amount) },
      { label: t('ai.b.act.direction'), value: t(direction === 'owe' ? 'ai.b.act.youOwe' : 'ai.b.act.theyOwe', { name }) },
    ],
    notes: [t('ai.b.act.iouNote')],
  };
}

/* ---------------- budget ---------------- */

export const detectBudgetSet = (text: string) =>
  /\b(set|tetapkan|letak|letakkan|buat|tukar|change|naikkan|turunkan|ubah|make)\b.{0,30}\b(bajet|budget|had|limit)\b/i.test(text) || /\b(bajet|budget)\b.{0,25}\b(jadi|to|kepada|=)\s*(rm|myr)?\s*\d/i.test(text);

export function budgetAction(t: Translate, d: AiData, text: string): ActionProposal | { ask: string } | null {
  const amount = pickAmount(findAmounts(text), text)?.value;
  if (!amount) return null;
  const hint = findCategoryHint(text);
  const named = d.categories.find((c) => c.kind === 'expense' && text.toLowerCase().includes(d.categoryLabel(c).toLowerCase()));
  const cat = named ?? (hint ? d.categories.find((c) => c.id === hint && c.kind === 'expense') : undefined);
  if (!cat) return { ask: t('ai.b.act.budgetWhich', { amount: rm(amount) }) };
  return {
    kind: 'budget',
    ref: ref(),
    title: t('ai.b.act.budget'),
    categoryId: cat.id,
    limit: round2(amount),
    previous: cat.monthlyLimit,
    summary: [
      { label: t('ai.b.act.category'), value: d.categoryLabel(cat) },
      { label: t('ai.b.act.newLimit'), value: t('ai.b.act.perMonth', { amount: rm(amount) }) },
      { label: t('ai.b.act.oldLimit'), value: cat.monthlyLimit > 0 ? rm(cat.monthlyLimit) : t('ai.b.act.none') },
    ],
    notes: [],
  };
}

/* ---------------- savings goal ---------------- */

const MONTH_NUM: [RegExp, number][] = [
  [/\b(jan|january|januari)\b/i, 1], [/\b(feb|february|februari)\b/i, 2], [/\b(mac|march|mar)\b/i, 3], [/\b(apr|april)\b/i, 4], [/\b(mei|may)\b/i, 5], [/\b(jun|june)\b/i, 6],
  [/\b(jul|july|julai)\b/i, 7], [/\b(ogos|aug|august)\b/i, 8], [/\b(sep|sept|september)\b/i, 9], [/\b(okt|oct|october|oktober)\b/i, 10], [/\b(nov|november)\b/i, 11], [/\b(dis|dec|december|disember)\b/i, 12],
];
function deadlineIn(text: string, today: string): string | undefined {
  const mon = MONTH_NUM.find(([re]) => re.test(text))?.[1];
  const yr = text.match(/\b(20\d{2})\b/);
  if (!mon && !yr) {
    const inN = text.match(/\b(?:dalam|in|within)\s+(\d{1,2})\s*(bulan|months?)\b/i);
    return inN ? nextMonth(today, Number(inN[1])) : undefined;
  }
  let y = yr ? Number(yr[1]) : Number(today.slice(0, 4));
  const m = mon ?? 12;
  if (!yr && `${y}-${String(m).padStart(2, '0')}` <= today.slice(0, 7)) y += 1;
  const last = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${last}`;
}

export const detectGoal = (text: string) =>
  /\b(goal|matlamat|sasaran|target)\b/i.test(text) || /\b(simpan|save|saving|kumpul|tabung)\b.{0,25}\b(untuk|for)\b/i.test(text);

export function goalAction(t: Translate, d: AiData, text: string): ActionProposal | null {
  const amount = pickAmount(findAmounts(text.replace(/\b20\d{2}\b/g, ' ')), text)?.value;
  if (!amount || amount < 10) return null;
  const forPart = text.match(/\b(?:untuk|for)\s+(.+?)(?:\s+(?:by|sebelum|before|dalam|in|pada|on|menjelang)\b|$)/i)?.[1] ?? '';
  const name = nameFrom(forPart || text, [/\b(goal|matlamat|sasaran|target|nak|want|i|simpan|save|saving|kumpul|tabung|untuk|for|by|sebelum)\b/gi, ...MONTH_NUM.map(([re]) => new RegExp(re.source, 'gi')), /\b20\d{2}\b/g]);
  const deadline = deadlineIn(text, d.todayKey);
  const monthsLeft = deadline ? Math.max(1, (Number(deadline.slice(0, 4)) - Number(d.todayKey.slice(0, 4))) * 12 + Number(deadline.slice(5, 7)) - Number(d.todayKey.slice(5, 7))) : undefined;
  const monthly = monthsLeft ? round2(amount / monthsLeft) : undefined;
  const look = GOAL_PRESETS[0];
  const goalName = name || t('ai.b.act.goalName');
  return {
    kind: 'goal',
    ref: ref(),
    title: t('ai.b.act.goal'),
    input: { name: goalName, target: round2(amount), deadline, monthly, icon: look.icon as string, color: look.color },
    summary: [
      { label: t('ai.b.act.goalFor'), value: goalName },
      { label: t('ai.b.act.target'), value: rm(amount) },
      ...(deadline ? [{ label: t('ai.b.act.deadline'), value: deadline }] : []),
      ...(monthly ? [{ label: t('ai.b.act.monthlyNeeded'), value: t('ai.b.act.perMonth', { amount: rm(monthly) }) }] : []),
    ],
    notes: [t('ai.b.act.goalNote')],
  };
}

/* ---------------- recurring bill ---------------- */

export const detectRecurring = (text: string) =>
  /\b(setiap bulan|tiap bulan|tiap-tiap bulan|every month|monthly|bulanan|setiap minggu|every week|weekly|setiap tahun|every year|yearly|tahunan)\b/i.test(text) &&
  !/\b(berapa|how much|how|what|apa|kenapa|why|tunjuk|show|purata|average)\b/i.test(text);

export function recurringAction(t: Translate, d: AiData, text: string): ActionProposal | null {
  const hit = pickAmount(findAmounts(text), text);
  const accountId = payAccount(text, d);
  if (!hit || !accountId) return null;
  const frequency: RecurringRule['frequency'] = /\b(minggu|week|weekly)\b/i.test(text) ? 'weekly' : /\b(tahun|year|yearly|tahunan)\b/i.test(text) ? 'yearly' : 'monthly';
  const income = /\b(gaji|salary|income|pendapatan|elaun|allowance|terima|receive)\b/i.test(text);
  const title = nameFrom(text, [/\b(setiap|tiap|tiap-tiap|every|monthly|bulanan|weekly|yearly|tahunan|minggu|week|tahun|year|langganan|subscription)\b/gi]) || t('ai.b.act.billName');
  const dayMatch = text.match(/\b(?:hb|haribulan|on the|pada)\s*(\d{1,2})\b|\b(\d{1,2})\s*(?:hb|haribulan|th|st|nd|rd)\b/i);
  const day = dayMatch ? Number(dayMatch[1] ?? dayMatch[2]) : undefined;
  // First time: the next date with that day (or one period from today), so a bill paid today is not counted twice.
  let start = frequency === 'weekly' ? addDays(d.todayKey, 7) : frequency === 'yearly' ? nextMonth(d.todayKey, 12) : nextMonth(d.todayKey);
  if (day && day >= 1 && day <= 28 && frequency === 'monthly') {
    const thisMonth = `${d.todayKey.slice(0, 8)}${String(day).padStart(2, '0')}`;
    start = thisMonth > d.todayKey ? thisMonth : nextMonth(thisMonth);
  }
  const cat = income
    ? d.categories.find((c) => c.kind === 'income')
    : d.categories.find((c) => c.id === (categoryFor(title, d).categoryId ?? 'bills'));
  if (!cat) return null;
  const sub = income ? (cat.subcategories[0] ?? '') : (categoryFor(title, d).subcategory ?? cat.subcategories[0] ?? '');
  const rule: Omit<RecurringRule, 'id'> = {
    title,
    amount: round2(hit.value),
    amountMode: 'fixed',
    type: income ? 'credit' : 'debit',
    categoryId: cat.id,
    subcategory: sub,
    accountId,
    frequency,
    startDate: start,
    nextDate: start,
    active: true,
  };
  return {
    kind: 'recurring',
    ref: ref(),
    title: t(income ? 'ai.b.act.recurringIncome' : 'ai.b.act.recurring'),
    rule,
    summary: [
      { label: t('ai.b.act.what'), value: title },
      { label: t('ai.b.act.amount'), value: rm(hit.value) },
      { label: t('ai.b.act.every'), value: t(frequency === 'weekly' ? 'ai.b.act.weekly' : frequency === 'yearly' ? 'ai.b.act.yearly' : 'ai.b.act.monthly') },
      { label: t('ai.b.act.starts'), value: start },
      { label: t('ai.b.act.category'), value: d.categoryLabel(cat) },
      { label: t('ai.b.act.account'), value: accName(d, accountId) },
    ],
    notes: [t('ai.b.act.recurringNote')],
  };
}

/* ---------------- breakdown for an existing record ---------------- */

const UPDATE_CUE = /\b(update|edit|kemaskini|ubah|tukar|tambah(?:kan)?|add|adding|masukkan|letak|isi)\b/i;
const BREAKDOWN_CUE = /\b(breakdown|break down|butiran|pecahan|details?|items?|line items?)\b/i;
/** Words around the record's name in "Help me to update souqa pasta by adding this breakdown". */
const HEAD_NOISE =
  /\b(help|me|to|please|pls|tolong|can|could|you|update|edit|kemaskini|ubah|tukar|add|adding|tambah|tambahkan|menambah|masukkan|letak|isi|by|with|dengan|this|ini|the|my|saya|breakdown|break|down|butiran|pecahan|details?|items?|line|below|bawah|berikut|following|record|rekod|transaction|transaksi|expense|belanja|perbelanjaan|for|untuk|on|pada|kat|di|in|dalam|ada)\b/gi;

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function lev(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}
/** Same word, or one typo apart in a word of 5+ letters ("souqa" / "souqah"). */
const sameWord = (a: string, b: string) => a === b || (Math.min(a.length, b.length) >= 5 && lev(a, b) <= 1);

/** "seafood gigi hadid spaghetti" / "SEAFOOD GIGI HADID" -> "Seafood Gigi Hadid". Text with its own mixed case is left alone. */
export function tidyCase(s: string): string {
  const clean = s.replace(/\s+/g, ' ').trim();
  if (clean !== clean.toLowerCase() && clean !== clean.toUpperCase()) return clean;
  return clean.toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
}

export type BreakdownResult = { action: ActionProposal } | { ask: true } | { notFound: string };

/**
 * "update souqa pasta by adding this breakdown" + one priced line per item -> a card that puts the items on the record
 * that is already saved. The name is matched ignoring capital / small letters, spacing and small typos.
 */
export function breakdownAction(t: Translate, d: AiData, text: string): BreakdownResult | null {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) return null;
  const head = lines[0];
  if (pickAmount(findAmounts(head), head) || !UPDATE_CUE.test(head) || !BREAKDOWN_CUE.test(head)) return null;
  const rows = lines
    .slice(1)
    .map((l) => ({ l, hit: pickAmount(findAmounts(l), l) }))
    .filter((r) => r.hit && r.hit.value > 0);
  if (rows.length < 2) return null;

  const items = rows.map((r, i) => {
    const raw = `${r.l.slice(0, r.hit!.start)} ${r.l.slice(r.hit!.end)}`.replace(/^[\s•*-]+/, '').trim();
    const q = raw.match(/^(\d+)\s*[x×]\s*/i);
    const body = tidyCase((q ? raw.slice(q[0].length) : raw).replace(/[\s:–-]+$/, ''));
    return { id: `ai${Date.now().toString(36)}${i}`, label: `${q ? `${q[1]}x ` : ''}${body}`.slice(0, 60), amount: round2(r.hit!.value) };
  });
  const total = round2(items.reduce((s, x) => s + x.amount, 0));

  const query = norm(head.replace(HEAD_NOISE, ' '));
  if (!query) return { ask: true };
  const qWords = query.split(' ');
  const scored = d.transactions
    .map((x) => {
      const tw = norm(x.title).split(' ');
      if (!qWords.every((w) => tw.some((v) => sameWord(w, v)))) return null;
      return { x, score: norm(x.title) === query ? 3 : tw.length === qWords.length ? 2 : 1 };
    })
    .filter((s): s is { x: (typeof d.transactions)[number]; score: number } => !!s);
  if (scored.length === 0) return { notFound: tidyCase(query) };
  scored.sort((a, b) => b.score - a.score || Math.abs(a.x.amount - total) - Math.abs(b.x.amount - total) || b.x.date.localeCompare(a.x.date));
  const best = scored[0].x;
  const same = Math.abs(best.amount - total) <= 0.05;
  const amount = same ? best.amount : total;

  const notes: string[] = [];
  if (!same) notes.push(t('ai.b.brk.differs', { old: rm(best.amount), total: rm(total) }));
  if (best.items?.length) notes.push(t('ai.b.brk.replaces', { n: best.items.length }));
  if (scored.filter((s) => s.score === scored[0].score).length > 1) notes.push(t('ai.b.brk.several', { date: best.date }));
  return {
    action: {
      kind: 'breakdown',
      ref: ref(),
      title: t('ai.b.brk.title'),
      txId: best.id,
      items,
      amount,
      previousItems: best.items,
      previousAmount: best.amount,
      summary: [
        { label: t('ai.b.brk.record'), value: best.title },
        { label: t('ai.b.brk.date'), value: best.date },
        { label: t('ai.b.brk.amount'), value: same ? rm(total) : `${rm(best.amount)} → ${rm(total)}` },
        ...items.map((x, i) => ({ label: `${i + 1}. ${x.label}`, value: rm(x.amount) })),
      ],
      notes,
    },
  };
}

/** Basic sanity check before a card is shown or saved. */
export function validAction(a: ActionProposal): boolean {
  const pos = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && x > 0 && x < 10_000_000;
  switch (a.kind) {
    case 'breakdown':
      return !!a.txId && pos(a.amount) && a.items.length >= 2 && a.items.every((x) => !!x.label && pos(x.amount));
    case 'instalment':
      return pos(a.input.principal) && a.input.months >= 1 && a.input.months <= 60 && !!a.input.payFromAccountId;
    case 'iou':
      return pos(a.input.amount) && a.input.person.length > 0;
    case 'budget':
      return pos(a.limit) && !!a.categoryId;
    case 'goal':
      return pos(a.input.target) && a.input.name.length > 0;
    case 'recurring':
      return pos(a.rule.amount) && !!a.rule.accountId && !!a.rule.categoryId;
    default:
      return false;
  }
}
