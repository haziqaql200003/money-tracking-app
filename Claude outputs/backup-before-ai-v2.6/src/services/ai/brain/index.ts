/**
 * WaKira's own brain. It runs on the phone: no server, no quota, works offline.
 *
 *   message -> follow-up? ("kenapa?", "terangkan mudah", "bulan lepas pula?", the answer to a question it asked)
 *           -> router (ml/train.py model: what does the pengguna want?)
 *           -> rules (amount, date, account, period, title)
 *           -> the right specialist (engine.ts maths, advice.ts plan, category models)
 *           -> an answer: plain sentence + chart spec + follow-up buttons, in the pengguna's language.
 *
 * It knows 17 things (record, transfer, where, find, balance, forecast, habits, budget, compare, transfers, advice,
 * explain, help, greet, thanks). Anything else, or anything it is not sure about, comes back `handled: false` so the
 * chat can ask the server AI (when signed in) or say it did not understand.
 */
import { runTool, type AiData } from '../engine';
import { budgetAction, detectBudgetSet, detectGoal, detectInstalment, detectRecurring, goalAction, instalmentAction, instalmentDraft, iouAction, monthsIn, recurringAction, validAction } from './actions';
import { adviceSay } from './advice';
import { affordSay, cashflowSay, debtsSay, detectAfford, detectCashflow, detectDebtQuestion, detectSaveTarget, detectScenario, detectTrend, monthsAsked, namedMonths, percentAsked, saveTargetSay, scenarioSay, trendSay, twoMonthsSay } from './analysis';
import { coldCategory } from './cold-category';
import { classifyIntent, type Intent } from './intent';
import { balanceSay, budgetSay, compareSay, findSay, forecastSay, habitsSay, rm, transfersSay, whenArgs, whereSay, type Say, type Translate, type When } from './reply';
import {
  cleanTitle,
  findAccounts,
  findAmounts,
  findCategoryHint,
  findCount,
  findDate,
  findMaxAmount,
  findMerchant,
  findMinAmount,
  findMonths,
  findPeriod,
  findRange,
  pickAmount,
  splitItems,
  transferDirection,
  wantsBiggest,
  type PeriodName,
  type Range,
} from './slots';
import { EMPTY_MEMORY, type BrainAnswer, type BrainResult, type Memory, type Pending, type Topic } from './types';

export type { ActionProposal, BrainAnswer, BrainResult, Memory, Pending, Visual } from './types';
export { EMPTY_MEMORY } from './types';

/** Below this the router is guessing: better to ask a bigger AI (or say "I did not understand"). */
export const MIN_CONFIDENCE = 0.55;

/** Words that clearly mean "move money". "topup" and "isi" only count when an account is named (topup prepaid is a purchase). */
const TRANSFER_CUE = /\b(pindah|pindahkan|transfer|withdraw|deposit|tarik (?:duit|wang|tunai|cash|rm|\d))/i;
const TOPUP_CUE = /\b(topup|top up|top-up|isi)\b/i;
const ASKING = /\b(berapa|tunjuk|tunjukkan|senarai|show|list|history|sejarah|how|what|bila|when|semua|all)\b/i;
/** "bulan lepas pula?", "what about last month", "makan pulak?" */
const FOLLOW = /\b(pula|pulak|what about|how about|and for|macam mana dengan|camne dengan|bagaimana dengan|kalau)\b/i;
/** "only the past 14 days", "sorry, not weeks but days", "actually last month" */
const REFINE = /^\s*(only|just|hanya|cuma|not|bukan|sorry|maaf|i'?m sorry|im sorry|actually|sebenarnya|tapi|but|no|instead)\b/i;
const WHY = /\b(kenapa|mengapa|apasal|asal|why|how come|macam mana boleh|camne boleh|mcm mana boleh|sebab|caused|punca)\b/i;
/** A question about the last answer: "apasal ada short RM18,230?", "why is it so high?" */
const WHY_START = /^\s*(kenapa|mengapa|apasal|asal|why|how come|macam mana boleh|camne boleh|mcm mana boleh|apa sebab)\b/i;
/** Questions about the pengguna's money that the brain answers again for a new period or category. */
const REPEATABLE: Intent[] = ['where', 'compare', 'habits', 'budget', 'transfers_list', 'advice'];

/** Internal answer before memory is attached. */
type Out = { text: string; visuals?: Say['visuals']; chips?: string[]; proposals?: BrainAnswer['proposals']; actions?: BrainAnswer['actions']; checked?: boolean; pending?: Pending | null; topic?: Topic | null; find?: Record<string, unknown>; intent: Intent; p: number };

function say(text: string, extra: Omit<Out, 'text'>): BrainAnswer {
  return {
    handled: true,
    text,
    visuals: extra.visuals ?? [],
    chips: extra.chips ?? [],
    proposals: extra.proposals ?? [],
    actions: extra.actions ?? [],
    checked: extra.checked ?? false,
    // `topic` undefined = keep what the chat was about; null = forget it.
    memory: { pending: extra.pending ?? null, last: extra.topic === undefined ? KEEP : extra.topic, find: extra.find },
    intent: extra.intent,
    p: extra.p,
  };
}
/** Marker replaced by the previous topic in think(). */
const KEEP = { intent: 'other' } as Topic;

export function think(input: { text: string; data: AiData; t: Translate; memory?: Memory | null }): BrainResult {
  const memory = input.memory ?? EMPTY_MEMORY;
  const r = decide(input.text, input.data, input.t, memory);
  if (r.handled && r.memory.last === KEEP) r.memory = { ...r.memory, last: memory.last };
  if (!r.handled) r.memory = { pending: null, last: memory.last };
  return r;
}

function decide(raw: string, data: AiData, t: Translate, memory: Memory): BrainResult {
  const text = raw.trim().slice(0, 1000);
  if (!text) return { handled: false, intent: 'other', p: 0, reason: 'empty', memory };

  // 1. Is this the answer to a question I just asked?
  if (memory.pending) {
    const done = continuePending(text, memory.pending, data, t);
    if (done) return done;
  }

  // A receipt typed line by line: one expense with its items.
  if (text.includes('\n')) {
    const receipt = receiptRecord(text, data, t);
    if (receipt) return receipt;
  }

  // 2. A short follow-up about the last answer: "bulan lepas pula?", "makan pulak?", "only the past 14 days".
  const words = text.split(/\s+/).length;
  const last = memory.last;
  const range = findRange(text, data.todayKey);
  const period = findPeriod(text);
  // Narrow (or correct) the search just shown.
  const newCommand = /^\s*(show|tunjuk|tunjukkan|cari|carikan|find|list|senarai)\b/i.test(text);
  if (memory.find && words <= 14 && (REFINE.test(text) || ((range || period) && words <= 8 && !newCommand))) {
    const args: Record<string, unknown> = { ...memory.find };
    if (range) Object.assign(args, { from: range.from, to: range.to, period: undefined });
    else if (period) Object.assign(args, { period, from: undefined, to: undefined });
    const max = findMaxAmount(text);
    const min = findMinAmount(text);
    if (max !== undefined) args.max_amount = max;
    if (min !== undefined) args.min_amount = min;
    const s2 = findSay(t, runTool('find_transactions', args, data).response, args.sort === 'amount');
    return say(s2.text, { ...s2, intent: 'find', p: 1, checked: true, find: args });
  }
  if (last && REPEATABLE.includes(last.intent) && words <= 12 && (FOLLOW.test(text) || REFINE.test(text))) {
    const hint = findCategoryHint(text);
    if (period || hint || range) {
      const cat = hint ? data.categories.find((c) => c.id === hint) : undefined;
      const keep = !hint;
      return runTopic(
        {
          intent: last.intent === 'compare' && hint ? 'where' : last.intent,
          period: range ? undefined : (period ?? last.period),
          range: range ?? (period ? undefined : last.range),
          categoryId: cat?.id ?? (keep ? last.categoryId : undefined),
          months: last.months,
        },
        data,
        t,
        {},
      );
    }
  }

  // "Explain: <card title>" for a card that is no longer in the feed: answer the rest as a question.
  const stripped = text.replace(/^\s*(?:explain|terangkan|jelaskan)\s*:\s*/i, '');
  if (stripped !== text && !explainInsight(text, data, t) && stripped.length > 3) return decide(stripped, data, t, memory);

  // 3. Deeper questions spotted by rules (they work for phrasings the router never saw).
  const deep = deepQuestion(text, data, t);
  if (deep) return deep;

  // 4. What does the pengguna want?
  const guess = classifyIntent(text);
  let { intent, p } = guess;
  const amounts = findAmounts(text);
  const moveCue = TRANSFER_CUE.test(text) || (TOPUP_CUE.test(text) && findAccounts(text, data).length > 0);
  // "tunjuk belanja bawah RM20" is a search, not a purchase of RM20.
  if (/^(tunjuk|tunjukkan|show|senarai|list|cari|carikan|find)\b/i.test(text) && (findMaxAmount(text) !== undefined || findMinAmount(text) !== undefined)) {
    intent = 'find';
    p = Math.max(p, 0.8);
  }
  if (moveCue && amounts.length > 0 && !ASKING.test(text) && intent !== 'transfer') {
    intent = 'transfer';
    p = Math.max(p, 0.7);
  }
  // "kenapa?" alone right after an answer is about that answer.
  if (last && (words <= 3 || WHY_START.test(text)) && WHY.test(text) && !TRANSFER_CUE.test(text)) {
    intent = 'explain';
    p = Math.max(p, 0.9);
  }
  if (intent === 'other') return { handled: false, intent, p, reason: 'other', memory };
  if (p < MIN_CONFIDENCE) {
    // A bare item ("netflix", "kopi o"): if it clearly looks like something bought, ask how much.
    const cold = amounts.length === 0 && words <= 4 ? coldCategory(text, 'expense') : null;
    if (cold && cold.p >= 0.7 && data.accounts.length > 0) {
      const title = cleanTitle(text, []);
      if (title) return say(t('ai.b.askAmount', { title }), { intent: 'expense', p, pending: { kind: 'tx', type: 'expense', title } });
    }
    return { handled: false, intent, p, reason: 'low', memory };
  }

  switch (intent) {
    case 'greet':
      return say(t('ai.b.greet'), { intent, p, chips: [t('ai.b.chip.where'), t('ai.b.chip.save'), t('ai.b.chip.forecast')] });
    case 'thanks':
      return say(t('ai.b.thanks'), { intent, p });
    case 'help':
      return say(t('ai.b.help'), { intent, p, chips: [t('ai.b.chip.where'), t('ai.b.chip.compare'), t('ai.b.chip.save')] });
    case 'expense':
    case 'income':
      return recordItems(text, intent, p, data, t);
    case 'transfer':
      return recordTransfer(text, p, data, t, { kind: 'transfer' });
    case 'explain': {
      // Explain the last answer again, simpler (or why it is so). Nothing to explain -> let the server AI try.
      if (!last || !REPEATABLE.concat(['balance', 'forecast']).includes(last.intent)) return { handled: false, intent: 'other', p, reason: 'other', memory };
      return runTopic(last, data, t, { simple: !WHY.test(text), why: WHY.test(text) }, p, 'explain');
    }
    default:
      return answerQuestion(text, intent, p, data, t);
  }
}

/* ---------------- recording ---------------- */

function category(title: string, kind: 'expense' | 'income', data: AiData) {
  const g = title ? coldCategory(title, kind) : null;
  if (!g || g.p < 0.35) return {};
  const c = data.categories.find((x) => x.id === g.categoryId && x.kind === kind);
  return c ? { category_id: c.id, subcategory: g.subcategory } : {};
}

/** Words in a receipt's first line that are not the shop name ("Track expenses yesterday X with details below:"). */
const HEADER_NOISE =
  /\b(track|tracking|record|rekod|catat|add|tambah|log|expenses?|perbelanjaan|belanja|yesterday|semalam|today|hari ini|tadi|with|dengan|the|details?|butiran|below|bawah|berikut|seperti|as follows|like this|macam ni|kat|at|di|for|untuk|item|items|receipt|resit)\b/gi;
const DEBT_LINE = /\b(hutang|debt|owe|owes|pinjam|belanja dia|for him|for her|untuk dia)\b/i;

/**
 * A receipt typed over several lines: a first line naming the shop, then one line per item with its price.
 *   Track expenses yesterday Nasi Kerabu Pokdie with details below:
 *   2x Nasi Kerabu Daging RM 10
 *   2x Telur Masin RM2
 *   From maybank
 * becomes ONE expense (the total) with its line items, not one record per line.
 */
function receiptRecord(text: string, data: AiData, t: Translate): BrainAnswer | null {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3 || data.accounts.length === 0) return null;
  const rows = lines.map((l) => ({ l, hit: pickAmount(findAmounts(l), l) }));
  const head = rows[0];
  if (head.hit) return null;
  const items = rows.slice(1).filter((r) => r.hit && r.hit.value > 0 && !DEBT_LINE.test(r.l));
  if (items.length < 2 && !(items.length === 1 && /[:：]\s*$/.test(head.l))) return null;
  const title = cleanTitle(head.l.replace(HEADER_NOISE, ' ').replace(/[:：]/g, ' '), []) || cleanTitle(items[0].l, [items[0].hit!]);
  const lineItems = items.map((r) => {
    const label = `${r.l.slice(0, r.hit!.start)} ${r.l.slice(r.hit!.end)}`.replace(/^[\s•*-]+/, '').replace(/\s+/g, ' ').trim();
    return { label: label || title, amount: r.hit!.value };
  });
  const total = Math.round(lineItems.reduce((sum, x) => sum + x.amount, 0) * 100) / 100;
  const accounts = findAccounts(text, data);
  const res = runTool(
    'propose_transactions',
    { items: [{ title, amount: total, type: 'expense', account_id: accounts[0]?.id, date: findDate(text, data.todayKey), line_items: lineItems, ...category(title, 'expense', data) }] },
    data,
  );
  if (!res.proposals?.length) return null;
  // A line about someone else's share ("bayar sekali hutang Ahmad RM20"): an IOU card when it has an amount.
  const notes: string[] = [];
  const actions: BrainAnswer['actions'] = [];
  for (const r of rows.slice(1).filter((x) => DEBT_LINE.test(x.l))) {
    if (!r.hit || r.hit.value <= 0) {
      notes.push(t('ai.b.rcpt.debtSkipped', { line: r.l }));
      continue;
    }
    const person = r.l.match(/\b(?:dengan|untuk|for|kat|dekat|with)\s+([A-Za-z][\w'-]{1,20})/)?.[1];
    const iou = iouAction(t, data, r.l) ?? (person ? iouAction(t, data, `${person} hutang saya rm${r.hit.value}`) : null);
    if (iou && validAction(iou)) actions.push(iou);
    else notes.push(t('ai.b.rcpt.debtSkipped', { line: r.l }));
  }
  const text2 = [t('ai.b.rcpt.single', { title, n: lineItems.length, total: rm(total) }), ...notes].join('\n');
  return say(text2, { intent: 'expense', p: 1, proposals: res.proposals, actions });
}

function recordItems(text: string, intent: 'expense' | 'income', p: number, data: AiData, t: Translate): BrainAnswer {
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

function recordTransfer(text: string, p: number, data: AiData, t: Translate, carry: { kind: 'transfer'; amount?: number; from?: string; to?: string; date?: string }): BrainAnswer {
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

function continuePending(text: string, pending: Pending, data: AiData, t: Translate): BrainAnswer | null {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (pending.kind === 'instalment') {
    const months = monthsIn(text) ?? (/^\s*\d{1,2}\s*$/.test(text) ? Number(text.trim()) : undefined);
    if (!months) return null;
    const a = instalmentAction(t, data, { ...pending.draft, months });
    return a && validAction(a) ? say(t('ai.b.act.check'), { intent: 'expense', p: 1, actions: [a] }) : null;
  }
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

/* ---------------- deeper questions (analysis.ts) ---------------- */

const COMPARE_CUE = /\b(compare|banding|bandingkan|vs|versus|beza|difference|antara|between)\b/i;
const SPEND_CUE = /\b(belanja|spend|spending|spent|perbelanjaan|expenses?)\b/i;

/** Which numbers explain each Insight card (ids from src/utils/insight-feed.ts). */
const FEED_TOPIC: Record<string, Topic> = {
  spike: { intent: 'where', period: 'last_7_days' },
  streak: { intent: 'where', period: 'last_7_days' },
  payday: { intent: 'where', period: 'last_7_days' },
  why: { intent: 'compare' },
  less: { intent: 'compare' },
  improved: { intent: 'compare' },
  creep: { intent: 'compare' },
  topcat: { intent: 'where', period: 'this_month' },
  misc: { intent: 'where', period: 'this_month' },
  split: { intent: 'where', period: 'this_month' },
  bigone: { intent: 'where', period: 'this_month' },
  weekend: { intent: 'habits' },
  habit: { intent: 'habits' },
  small: { intent: 'advice' },
  nospend: { intent: 'habits' },
  budget: { intent: 'budget' },
  subs: { intent: 'where', period: 'this_month', categoryId: 'subscriptions' },
  rate: { intent: 'advice' },
  income: { intent: 'compare' },
  runway: { intent: 'forecast' },
  fixed: { intent: 'advice' },
};

/**
 * "Explain: Spending this week is higher than usual" (the buttons made from Insight cards).
 * Says what the card means in plain words, then shows the numbers behind it.
 */
function explainInsight(text: string, data: AiData, t: Translate): BrainAnswer | null {
  const m = text.match(/^\s*(?:explain|terangkan|jelaskan|terang)\s*:\s*(.+)$/i);
  if (!m) return null;
  const title = m[1].trim().toLowerCase();
  const item = data.feed.find((f) => f.title.trim().toLowerCase() === title) ?? data.feed.find((f) => title.includes(f.title.trim().toLowerCase().slice(0, 25)));
  if (!item) return null;
  const topic = FEED_TOPIC[item.id] ?? { intent: 'where', period: 'this_month' };
  const detail = runTopic(topic, data, t, {});
  const text2 = [t('ai.b.feed.means', { body: item.body }), item.action ? t('ai.b.feed.todo', { action: item.action }) : null, t('ai.b.feed.numbers'), detail.text]
    .filter(Boolean)
    .join('\n');
  return say(text2, { visuals: detail.visuals, chips: [t('ai.b.chip.simple'), t('ai.b.chip.save')], intent: 'explain', p: 1, checked: true, topic });
}

function deepQuestion(text: string, data: AiData, t: Translate): BrainAnswer | null {
  const out = (s: Say, intent: Intent, topic?: Topic | null) => say(s.text, { ...s, intent, p: 1, checked: true, topic });
  const insight = explainInsight(text, data, t);
  if (insight) return insight;

  // Set-ups in other modules (cards the pengguna confirms). Only with an amount and clear words.
  const act = (a: ReturnType<typeof iouAction>, intent: Intent) => (a && validAction(a) ? say(t('ai.b.act.check'), { intent, p: 1, actions: [a] }) : null);
  const hasAmount = findAmounts(text).length > 0;
  const asking = /\b(berapa|how much|bila|when|senarai|list|tunjuk|show|what|apa|semua|all)\b/i.test(text) && !/\b(record|rekod|catat|add|tambah|set|tetapkan)\b/i.test(text);
  if (detectInstalment(text) && hasAmount && !asking) {
    const draft = instalmentDraft(text, data);
    if (!draft.payFrom) return say(t('ai.b.noAccount'), { intent: 'expense', p: 1 });
    if (!draft.months) return say(t('ai.b.act.askMonths', { name: draft.name || draft.provider || '', amount: rm(draft.amount ?? 0) }), { intent: 'expense', p: 1, pending: { kind: 'instalment', draft } });
    const a = act(instalmentAction(t, data, draft), 'expense');
    if (a) return a;
  }
  if (detectDebtQuestion(text) && !hasAmount) return out(debtsSay(t, data), 'balance', { intent: 'balance' });
  if (hasAmount && !asking) {
    const iou = act(iouAction(t, data, text), 'expense');
    if (iou) return iou;
    if (detectBudgetSet(text)) {
      const b = budgetAction(t, data, text);
      if (b && 'ask' in b) return say(b.ask, { intent: 'budget', p: 1 });
      const a = act(b, 'budget');
      if (a) return a;
    }
  }
  if (detectSaveTarget(text) && hasAmount && !detectGoal(text.replace(/\btarget\b/gi, ''))) {
    const target = pickAmount(findAmounts(text), text)?.value;
    if (target) return out(saveTargetSay(t, data, target), 'advice', { intent: 'advice', target });
  }
  if (hasAmount && !asking && detectGoal(text)) {
    const a = act(goalAction(t, data, text), 'advice');
    if (a) return a;
  }
  if (hasAmount && detectRecurring(text)) {
    const a = act(recurringAction(t, data, text), 'expense');
    if (a) return a;
  }
  const hint = findCategoryHint(text);
  const cat = hint ? data.categories.find((c) => c.id === hint && c.kind === 'expense') : undefined;
  if (detectAfford(text)) {
    const price = pickAmount(findAmounts(text), text)?.value;
    if (price) return out(affordSay(t, data, price), 'forecast', { intent: 'forecast' });
  }
  if (detectScenario(text)) return out(scenarioSay(t, data, percentAsked(text) ?? 20, cat?.id), 'advice', { intent: 'advice', categoryId: cat?.id });
  if (detectCashflow(text)) return out(cashflowSay(t, data), 'compare', { intent: 'compare' });
  const named = namedMonths(text, data.todayKey);
  if (named.length >= 2 && named[0] !== named[1] && (COMPARE_CUE.test(text) || /\b(dan|and|dengan|with)\b/i.test(text))) return out(twoMonthsSay(t, data, named[0], named[1]), 'compare', { intent: 'compare' });
  const n = monthsAsked(text);
  if (detectTrend(text) || (n !== undefined && n >= 3 && COMPARE_CUE.test(text) && SPEND_CUE.test(text))) return out(trendSay(t, data, n ?? 6, cat?.id), 'where', { intent: 'where', period: 'last_6_months', categoryId: cat?.id });
  return null;
}

/* ---------------- questions ---------------- */

const FIND_STOP = new Set(
  (
    'cari carikan semua transaksi tunjuk tunjukkan show me all list senarai bila last aku saya ada tak ke bayar beli belanja berapa what was my biggest largest expense expenses purchases rekod terkini terakhir terbesar ' +
    'paling mahal besar banyak yang is the a of did i buy paid pay when find search for lebih rm bulan ni ini lepas minggu tahun this month week year records record kali dah dan and di kat dekat at on ' +
    'bawah below under kurang dari than less small kecil only just hanya cuma past days day weeks week hari minggu purchase spending ' +
    'sorry maaf not bukan but tapi im i\'m me records'
  ).split(' '),
);

/** Turns the message into a Topic (what, which period, which category), then answers it. */
function answerQuestion(text: string, intent: Intent, p: number, data: AiData, t: Translate): BrainAnswer {
  const period = findPeriod(text);
  const hint = findCategoryHint(text);
  const cat = hint ? data.categories.find((c) => c.id === hint) : undefined;
  if (intent === 'find' || (intent === 'where' && findMerchant(text) && !hint)) return findAnswer(text, p, data, t, period, undefined, findRange(text, data.todayKey));
  if (intent === 'balance') {
    const acc = findAccounts(text, data)[0]?.id;
    const s = balanceSay(t, data, runTool('get_overview', {}, data).response, acc);
    return say(s.text, { ...s, intent, p, checked: true, topic: { intent: 'balance' } });
  }
  const range = findRange(text, data.todayKey);
  const topic: Topic = { intent, period: range ? undefined : period, range, categoryId: cat?.id, months: intent === 'forecast' ? findMonths(text) : undefined };
  return runTopic(topic, data, t, { income: /\b(pendapatan|income|earned|terima|dapat)\b/i.test(text), byAccount: /\b(akaun|account)\b/i.test(text) }, p);
}

/**
 * Answers a topic. Used for a fresh question, for "bulan lepas pula?" (same topic, new period),
 * and for "terangkan mudah" / "kenapa?" (same topic, simple or why mode).
 */
function runTopic(
  topic: Topic,
  data: AiData,
  t: Translate,
  mode: { simple?: boolean; why?: boolean; income?: boolean; byAccount?: boolean },
  p = 1,
  asIntent?: Intent,
): BrainAnswer {
  const intent = asIntent ?? topic.intent;
  const cat = topic.categoryId ? data.categories.find((c) => c.id === topic.categoryId) : undefined;
  const done = (s: Say, keep: Topic) => say(s.text, { ...s, intent, p, checked: true, topic: keep });
  switch (topic.intent) {
    case 'where': {
      const when: When = topic.range ?? topic.period ?? 'this_month';
      const groupBy = mode.byAccount ? 'account' : cat ? 'subcategory' : 'category';
      const r = runTool('spending_breakdown', { ...whenArgs(when), group_by: groupBy, category_id: cat?.id, type: mode.income ? 'income' : 'expense' }, data).response;
      const top = (r.rows as { id?: string }[] | undefined)?.[0];
      const why = mode.why && top?.id && !cat ? runTool('spending_breakdown', { ...whenArgs(when), group_by: 'merchant', category_id: top.id, limit: 3 }, data).response : null;
      return done(whereSay(t, data, r, when, { catName: cat ? data.categoryLabel(cat) : undefined, simple: mode.simple, why }), topic.range ? topic : { ...topic, period: topic.period ?? 'this_month' });
    }
    case 'compare':
      return done(compareSay(t, data, runTool('compare_periods', { months: topic.months ?? 1 }, data).response, { simple: mode.simple, why: mode.why }), topic);
    case 'balance':
      return done(balanceSay(t, data, runTool('get_overview', {}, data).response, undefined, mode.simple || mode.why), topic);
    case 'forecast':
      return done(forecastSay(t, runTool('forecast', { months: topic.months ?? 3 }, data).response, mode.simple || mode.why), topic);
    case 'habits':
      return done(habitsSay(t, runTool('spending_habits', whenArgs(topic.range ?? topic.period ?? 'last_3_months'), data).response, mode.simple || mode.why), topic);
    case 'budget':
      return done(budgetSay(t, runTool('budget_status', {}, data).response, cat?.id, mode.simple || mode.why), topic);
    case 'transfers_list': {
      const when: When = topic.range ?? topic.period ?? 'last_3_months';
      return done(transfersSay(t, runTool('list_transfers', whenArgs(when), data).response, when), topic);
    }
    case 'advice':
      if (topic.target) return done(saveTargetSay(t, data, topic.target, { why: mode.why, simple: mode.simple }), topic);
      return done(adviceSay(t, data, { simple: mode.simple || mode.why, categoryId: cat?.id }), topic);
    default:
      return say(t('ai.b.unknown'), { intent, p });
  }
}

function findAnswer(text: string, p: number, data: AiData, t: Translate, period?: PeriodName, categoryId?: string, range?: Range): BrainAnswer {
  const hint = categoryId ?? findCategoryHint(text);
  const cat = hint ? data.categories.find((c) => c.id === hint) : undefined;
  const merchant = findMerchant(text);
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !FIND_STOP.has(w) && !/^(rm|myr)?\d[\d.,]*$/.test(w));
  const query = merchant ?? (cat ? '' : words.join(' '));
  const biggest = wantsBiggest(text);
  const args: Record<string, unknown> = {
    query: query.slice(0, 60),
    ...(range ? { from: range.from, to: range.to } : { period: period ?? 'last_3_months' }),
    category_id: cat?.id,
    type: /\b(pendapatan|income|gaji|salary)\b/i.test(text) ? 'income' : 'expense',
    min_amount: findMinAmount(text),
    max_amount: findMaxAmount(text),
    sort: biggest ? 'amount' : 'date',
    limit: findCount(text) ?? (biggest ? 5 : /\bbila\b|\bwhen\b/i.test(text) ? 3 : 8),
  };
  const s = findSay(t, runTool('find_transactions', args, data).response, biggest);
  // A list is not something to "explain simply": keep the previous topic for follow-ups.
  return say(s.text, { ...s, intent: 'find', p, checked: true, find: args });
}

export type { Intent };
