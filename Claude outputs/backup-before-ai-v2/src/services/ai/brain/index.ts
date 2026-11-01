/**
 * WaKira's own brain. It runs on the phone: no server, no quota, works offline.
 *
 *   message -> router (ml/train.py model: what does the pengguna want?)
 *           -> rules (amount, date, account, period, title)
 *           -> the right specialist (engine.ts maths, category models)
 *           -> reply written from templates, in the pengguna's language.
 *
 * It only knows the things it was trained for (record, transfer, where, find, balance, forecast, habits, budget,
 * compare, transfers, help). Anything else, or anything it is not sure about, is handed back as `handled: false`
 * so the caller can ask a bigger AI on the server.
 */
import { runTool, type AiData, type Proposal } from '../engine';
import { coldCategory } from './cold-category';
import { classifyIntent, type Intent } from './intent';
import { balanceReply, budgetReply, compareReply, findReply, forecastReply, habitsReply, rm, transfersReply, whereReply, type Translate } from './reply';
import {
  cleanTitle,
  findAccounts,
  findAmounts,
  findCategoryHint,
  findCount,
  findDate,
  findMerchant,
  findMinAmount,
  findMonths,
  findPeriod,
  pickAmount,
  splitItems,
  transferDirection,
  wantsBiggest,
  type PeriodName,
} from './slots';

/** A half-finished request waiting for one more answer ("How much was it?"). */
export type Pending =
  | { kind: 'tx'; type: 'expense' | 'income'; title: string; amount?: number; accountId?: string; date?: string }
  | { kind: 'transfer'; amount?: number; from?: string; to?: string; date?: string };

export type BrainResult =
  | { handled: true; text: string; proposals: Proposal[]; checked: boolean; pending: Pending | null; intent: Intent; p: number }
  | { handled: false; intent: Intent; p: number; reason: 'empty' | 'low' | 'other' };

/** Below this the router is guessing: better to ask a bigger AI (or say "I did not understand"). */
export const MIN_CONFIDENCE = 0.55;

/** Words that clearly mean "move money". "topup" and "isi" only count when an account is named (topup prepaid is a purchase). */
const TRANSFER_CUE = /\b(pindah|pindahkan|transfer|withdraw|deposit|tarik (?:duit|wang|tunai|cash|rm|\d))/i;
const TOPUP_CUE = /\b(topup|top up|top-up|isi)\b/i;
const ASKING = /\b(berapa|tunjuk|tunjukkan|senarai|show|list|history|sejarah|how|what|bila|when|semua|all)\b/i;

const say = (text: string, extra: Partial<Extract<BrainResult, { handled: true }>> & { intent: Intent; p: number }): BrainResult => ({
  handled: true,
  text,
  proposals: [],
  checked: false,
  pending: null,
  ...extra,
});

export function think(input: { text: string; data: AiData; t: Translate; pending?: Pending | null }): BrainResult {
  const { data, t } = input;
  const text = input.text.trim().slice(0, 1000);
  if (!text) return { handled: false, intent: 'other', p: 0, reason: 'empty' };

  // 1. Is this the answer to a question I just asked?
  if (input.pending) {
    const done = continuePending(text, input.pending, data, t);
    if (done) return done;
  }

  // 2. What does the pengguna want?
  const guess = classifyIntent(text);
  let { intent, p } = guess;
  const amounts = findAmounts(text);
  const moveCue = TRANSFER_CUE.test(text) || (TOPUP_CUE.test(text) && findAccounts(text, data).length > 0);
  if (moveCue && amounts.length > 0 && !ASKING.test(text) && intent !== 'transfer') {
    intent = 'transfer';
    p = Math.max(p, 0.7);
  }
  if (intent === 'other') return { handled: false, intent, p, reason: 'other' };
  if (p < MIN_CONFIDENCE) {
    // A bare item ("netflix", "kopi o"): if it clearly looks like something bought, ask how much.
    const words = text.split(/\s+/).length;
    const cold = amounts.length === 0 && words <= 4 ? coldCategory(text, 'expense') : null;
    if (cold && cold.p >= 0.7 && data.accounts.length > 0) {
      const title = cleanTitle(text, []);
      if (title) return say(t('ai.b.askAmount', { title }), { intent: 'expense', p, pending: { kind: 'tx', type: 'expense', title } });
    }
    return { handled: false, intent, p, reason: 'low' };
  }

  switch (intent) {
    case 'greet':
      return say(t('ai.b.greet'), { intent, p });
    case 'thanks':
      return say(t('ai.b.thanks'), { intent, p });
    case 'help':
      return say(t('ai.b.help'), { intent, p });
    case 'expense':
    case 'income':
      return recordItems(text, intent, p, data, t);
    case 'transfer':
      return recordTransfer(text, p, data, t, { kind: 'transfer' });
    default:
      return answer(text, intent, p, data, t);
  }
}

/* ---------------- recording ---------------- */

function category(title: string, kind: 'expense' | 'income', data: AiData) {
  const g = title ? coldCategory(title, kind) : null;
  if (!g || g.p < 0.35) return {};
  const c = data.categories.find((x) => x.id === g.categoryId && x.kind === kind);
  return c ? { category_id: c.id, subcategory: g.subcategory } : {};
}

function recordItems(text: string, intent: 'expense' | 'income', p: number, data: AiData, t: Translate): BrainResult {
  if (data.accounts.length === 0) return say(t('ai.b.noAccount'), { intent, p });
  const date = findDate(text, data.todayKey);
  const allAccounts = [...new Set(findAccounts(text, data).map((a) => a.id))];
  const parts = splitItems(text).map((seg) => ({ seg, amounts: findAmounts(seg) }));
  const priced = parts.filter((x) => x.amounts.length > 0);
  // "beli ayam dan sayur 32" is ONE item with two words, not two items.
  const pieces = priced.length <= 1 ? [{ seg: text, amounts: findAmounts(text) }] : priced;

  const items: Record<string, unknown>[] = [];
  for (const piece of pieces) {
    const hit = pickAmount(piece.amounts, piece.seg);
    if (!hit) continue;
    const own = findAccounts(piece.seg, data);
    const title = cleanTitle(piece.seg, [hit, ...own]);
    if (!title && pieces.length === 1) {
      const acc = own[0]?.id ?? (allAccounts.length === 1 ? allAccounts[0] : undefined);
      return say(t('ai.b.askTitle', { amount: rm(hit.value) }), { intent, p, pending: { kind: 'tx', type: intent, title: '', amount: hit.value, accountId: acc, date } });
    }
    items.push({
      title,
      amount: hit.value,
      type: intent,
      account_id: own[0]?.id ?? (allAccounts.length === 1 ? allAccounts[0] : undefined),
      date,
      ...category(title, intent, data),
    });
  }

  if (items.length === 0) {
    // No amount: ask for it.
    const title = cleanTitle(text, findAccounts(text, data));
    const acc = allAccounts.length === 1 ? allAccounts[0] : undefined;
    return say(title ? t('ai.b.askAmount', { title }) : t('ai.b.askAmountPlain'), { intent, p, pending: { kind: 'tx', type: intent, title, accountId: acc, date } });
  }
  const res = runTool('propose_transactions', { items }, data);
  const proposals = res.proposals ?? [];
  if (proposals.length === 0) return say(t('ai.b.unknown'), { intent, p });
  return say(proposals.length === 1 ? t('ai.b.cards.single') : t('ai.b.cards.multi', { n: proposals.length }), { intent, p, proposals });
}

function recordTransfer(text: string, p: number, data: AiData, t: Translate, carry: { kind: 'transfer'; amount?: number; from?: string; to?: string; date?: string }): BrainResult {
  const intent: Intent = 'transfer';
  if (data.accounts.length < 2) return say(t('ai.b.needTwoAccounts'), { intent, p });
  const low = text.toLowerCase();
  const hits = findAccounts(text, data);
  const dir = transferDirection(text, hits);
  const amount = pickAmount(findAmounts(text), text)?.value ?? carry.amount;
  let from = dir.from ?? carry.from;
  let to = dir.to ?? carry.to;
  const cash = data.accounts.filter((a) => a.type === 'cash');
  if (/\b(tarik|withdraw|keluarkan)\b/.test(low) && !to && cash.length === 1 && from !== cash[0].id) to = cash[0].id;
  const date = findDate(text, data.todayKey) ?? carry.date;

  const name = (id?: string) => (id ? data.accountLabel(data.accounts.find((a) => a.id === id)!) : '');
  const pending: Pending = { kind: 'transfer', amount, from, to, date };
  if (from && to && from === to) return say(t('ai.b.sameAccount'), { intent, p });
  if (!amount) {
    if (from && to) return say(t('ai.b.askTransferAmount', { from: name(from), to: name(to) }), { intent, p, pending });
    return say(t('ai.b.askTransferBoth'), { intent, p, pending });
  }
  if (!from && !to) return say(t('ai.b.askBoth', { amount: rm(amount) }), { intent, p, pending });
  if (!from) return say(t('ai.b.askFrom', { amount: rm(amount), to: name(to) }), { intent, p, pending });
  if (!to) return say(t('ai.b.askTo', { amount: rm(amount), from: name(from) }), { intent, p, pending });
  const res = runTool('propose_transfer', { amount, from_account_id: from, to_account_id: to, date }, data);
  if (!res.proposals?.length) return say(t('ai.b.unknown'), { intent, p });
  return say(t('ai.b.cards.single'), { intent, p, proposals: res.proposals });
}

/* ---------------- follow-up answers ---------------- */

function continuePending(text: string, pending: Pending, data: AiData, t: Translate): BrainResult | null {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (pending.kind === 'tx') {
    const hit = pickAmount(findAmounts(text), text);
    if (pending.amount && !hit && words.length >= 1 && words.length <= 5) {
      const own = findAccounts(text, data);
      const title = cleanTitle(text, own);
      if (!title) return null;
      const item = { title, amount: pending.amount, type: pending.type, account_id: own[0]?.id ?? pending.accountId, date: pending.date, ...category(title, pending.type, data) };
      const res = runTool('propose_transactions', { items: [item] }, data);
      return res.proposals?.length ? say(t('ai.b.cards.single'), { intent: pending.type, p: 1, proposals: res.proposals }) : null;
    }
    if (!hit || words.length > 4) return null;
    const own = findAccounts(text, data);
    const title = pending.title || cleanTitle(text, [hit, ...own]);
    const item = {
      title,
      amount: hit.value,
      type: pending.type,
      account_id: own[0]?.id ?? pending.accountId,
      date: findDate(text, data.todayKey) ?? pending.date,
      ...category(title, pending.type, data),
    };
    const res = runTool('propose_transactions', { items: [item] }, data);
    if (!res.proposals?.length) return null;
    return say(t('ai.b.cards.single'), { intent: pending.type, p: 1, proposals: res.proposals });
  }
  // transfer: an amount, an account, or both
  const hasAmount = pickAmount(findAmounts(text), text) !== null;
  const hasAccount = findAccounts(text, data).length > 0;
  if (!hasAmount && !hasAccount) return null;
  if (words.length > 4) return null;
  // A bare account name ("cash") answers the missing side.
  const hits = findAccounts(text, data);
  const dir = transferDirection(text, hits);
  const merged = { ...pending };
  if (!dir.from && !dir.to && hits.length === 1) {
    if (!merged.from && merged.to !== hits[0].id) merged.from = hits[0].id;
    else if (!merged.to && merged.from !== hits[0].id) merged.to = hits[0].id;
  }
  return recordTransfer(text, 1, data, t, merged);
}

/* ---------------- questions ---------------- */

const FIND_STOP = new Set(
  (
    'cari carikan semua transaksi tunjuk tunjukkan show me all list senarai bila last aku saya ada tak ke bayar beli belanja berapa what was my biggest largest expense expenses purchases rekod terkini terakhir terbesar ' +
    'paling mahal besar banyak yang is the a of did i buy paid pay when find search for lebih rm bulan ni ini lepas minggu tahun this month week year records record kali dah dan and di kat dekat at on'
  ).split(' '),
);

function answer(text: string, intent: Intent, p: number, data: AiData, t: Translate): BrainResult {
  const period = findPeriod(text);
  const out = (reply: string, tool?: boolean): BrainResult => say(reply, { intent, p, checked: tool !== false });

  switch (intent) {
    case 'where': {
      const merchant = findMerchant(text);
      const hint = findCategoryHint(text);
      if (merchant && !hint) return findAnswer(text, p, data, t, period ?? 'this_month');
      const cat = hint ? data.categories.find((c) => c.id === hint && c.kind === 'expense') : undefined;
      const income = /\b(pendapatan|income|earned|terima|dapat)\b/i.test(text);
      const groupBy = /\b(akaun|account)\b/i.test(text) ? 'account' : cat ? 'subcategory' : 'category';
      const r = runTool('spending_breakdown', { period: period ?? 'this_month', group_by: groupBy, category_id: cat?.id, type: income ? 'income' : 'expense' }, data).response;
      return out(whereReply(t, r, period ?? 'this_month', cat ? data.categoryLabel(cat) : undefined));
    }
    case 'find':
      return findAnswer(text, p, data, t, period);
    case 'balance': {
      const acc = findAccounts(text, data)[0]?.id;
      return out(balanceReply(t, runTool('get_overview', {}, data).response, acc));
    }
    case 'forecast':
      return out(forecastReply(t, runTool('forecast', { months: findMonths(text) ?? 3 }, data).response));
    case 'habits':
      return out(habitsReply(t, runTool('spending_habits', { period: period ?? 'last_3_months' }, data).response, data));
    case 'budget':
    {
      const hint = findCategoryHint(text);
      return out(budgetReply(t, runTool('budget_status', {}, data).response, hint ? data.categories.find((c) => c.id === hint)?.id : undefined));
    }
    case 'compare':
      return out(compareReply(t, runTool('compare_periods', { months: 1 }, data).response));
    case 'transfers_list':
      return out(transfersReply(t, runTool('list_transfers', { period: period ?? 'last_3_months' }, data).response, period ?? 'last_3_months'));
    default:
      return { handled: false, intent, p, reason: 'low' };
  }
}

function findAnswer(text: string, p: number, data: AiData, t: Translate, period?: PeriodName): BrainResult {
  const hint = findCategoryHint(text);
  const cat = hint ? data.categories.find((c) => c.id === hint) : undefined;
  const merchant = findMerchant(text);
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !FIND_STOP.has(w) && !/^\d+$/.test(w));
  const query = merchant ?? (cat ? '' : words.join(' '));
  const biggest = wantsBiggest(text);
  const args: Record<string, unknown> = {
    query: query.slice(0, 60),
    period: period ?? 'last_3_months',
    category_id: cat?.id,
    type: /\b(pendapatan|income|gaji|salary)\b/i.test(text) ? 'income' : 'expense',
    min_amount: findMinAmount(text),
    sort: biggest ? 'amount' : 'date',
    limit: findCount(text) ?? (biggest ? 5 : /\bbila\b|\bwhen\b/i.test(text) ? 3 : 8),
  };
  const r = runTool('find_transactions', args, data).response;
  return say(findReply(t, r), { intent: 'find', p, checked: true });
}

export type { Intent };
