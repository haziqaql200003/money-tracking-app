/**
 * Shortcuts for Ask WaKira: ready templates ("Expense", "Transfer", "Can I afford...") and the pengguna's own saved ones
 * ("Lunch mamak RM10 cash" in one tap).
 *
 * A template is a message with slots, written the way the brain is tested to understand it:
 *   "Record expense {title} {amount}[ from {account}][ {date}]"
 * {slot} must be filled; a part in [ ] is left out when its slot is empty. Filling a template makes a normal chat
 * message, so a shortcut goes through exactly the same brain (and the same Save / Skip cards) as typing it.
 *
 * No React Native here: scripts/brain-eval runs every template through the brain in both languages.
 */
import type { TKey } from '@/i18n';

export type SlotName = 'title' | 'amount' | 'account' | 'from' | 'to' | 'date' | 'deadline' | 'details' | 'months' | 'provider' | 'person' | 'category';
export type SlotValues = Partial<Record<SlotName, string>>;
export type TemplateGroup = 'record' | 'plan' | 'ask';

export type Template = {
  id: string;
  group: TemplateGroup;
  /** Ionicons name. */
  icon: string;
  /** Short name shown on the tile. */
  labelKey: TKey;
  /** The message with slots, in the app's language (a key, so English and Malay each have their own wording). */
  msgKey: TKey;
};

/** One the pengguna saved. `text` keeps the slots; `values` are the answers baked in (the rest is asked each time). */
export type Shortcut = {
  id: string;
  name: string;
  icon: string;
  text: string;
  values: SlotValues;
  /** The template it came from (for the form's field order and icon). */
  template?: string;
  /** Saved from a sent message: sent exactly as typed, with no slots. */
  literal?: boolean;
  created: number;
};

export const TEMPLATES: Template[] = [
  { id: 'expense', group: 'record', icon: 'cart-outline', labelKey: 'ai.sc.t.expense', msgKey: 'ai.sc.x.expense' },
  { id: 'receipt', group: 'record', icon: 'receipt-outline', labelKey: 'ai.sc.t.receipt', msgKey: 'ai.sc.x.receipt' },
  { id: 'income', group: 'record', icon: 'arrow-down-circle-outline', labelKey: 'ai.sc.t.income', msgKey: 'ai.sc.x.income' },
  { id: 'transfer', group: 'record', icon: 'swap-horizontal', labelKey: 'ai.sc.t.transfer', msgKey: 'ai.sc.x.transfer' },
  { id: 'instalment', group: 'plan', icon: 'card-outline', labelKey: 'ai.sc.t.instalment', msgKey: 'ai.sc.x.instalment' },
  { id: 'owedToMe', group: 'plan', icon: 'person-add-outline', labelKey: 'ai.sc.t.owedToMe', msgKey: 'ai.sc.x.owedToMe' },
  { id: 'iOwe', group: 'plan', icon: 'person-remove-outline', labelKey: 'ai.sc.t.iOwe', msgKey: 'ai.sc.x.iOwe' },
  { id: 'budget', group: 'plan', icon: 'speedometer-outline', labelKey: 'ai.sc.t.budget', msgKey: 'ai.sc.x.budget' },
  { id: 'goal', group: 'plan', icon: 'flag-outline', labelKey: 'ai.sc.t.goal', msgKey: 'ai.sc.x.goal' },
  { id: 'recurring', group: 'plan', icon: 'repeat-outline', labelKey: 'ai.sc.t.recurring', msgKey: 'ai.sc.x.recurring' },
  { id: 'where', group: 'ask', icon: 'pie-chart-outline', labelKey: 'ai.sc.t.where', msgKey: 'ai.sc.x.where' },
  { id: 'afford', group: 'ask', icon: 'help-circle-outline', labelKey: 'ai.sc.t.afford', msgKey: 'ai.sc.x.afford' },
  { id: 'saveTarget', group: 'ask', icon: 'trending-up-outline', labelKey: 'ai.sc.t.saveTarget', msgKey: 'ai.sc.x.saveTarget' },
  { id: 'compare', group: 'ask', icon: 'stats-chart-outline', labelKey: 'ai.sc.t.compare', msgKey: 'ai.sc.x.compare' },
  { id: 'bills', group: 'ask', icon: 'calendar-outline', labelKey: 'ai.sc.t.bills', msgKey: 'ai.sc.x.bills' },
  { id: 'balance', group: 'ask', icon: 'wallet-outline', labelKey: 'ai.sc.t.balance', msgKey: 'ai.sc.x.balance' },
  { id: 'biggest', group: 'ask', icon: 'podium-outline', labelKey: 'ai.sc.t.biggest', msgKey: 'ai.sc.x.biggest' },
  { id: 'saveMore', group: 'ask', icon: 'bulb-outline', labelKey: 'ai.sc.t.saveMore', msgKey: 'ai.sc.x.saveMore' },
];

export const templateById = (id: string | undefined) => TEMPLATES.find((x) => x.id === id);

const SLOT_RE = /\{(\w+)\}/g;
const OPTIONAL_RE = /\[([^\]]*)\]/g;

/** Every slot in a message, in order, and whether it must be filled. */
export function slotsOf(text: string): { name: SlotName; required: boolean }[] {
  const out: { name: SlotName; required: boolean }[] = [];
  const optional = new Set<string>();
  for (const m of text.matchAll(OPTIONAL_RE)) for (const s of m[1].matchAll(SLOT_RE)) optional.add(s[1]);
  for (const m of text.matchAll(SLOT_RE)) {
    const name = m[1] as SlotName;
    if (!out.some((x) => x.name === name)) out.push({ name, required: !optional.has(name) });
  }
  return out;
}

/** Slots a run still has to ask for: required, not baked in, and not one that has a sensible default (the date is today). */
export function missingSlots(text: string, values: SlotValues, literal?: boolean): SlotName[] {
  if (literal) return [];
  return slotsOf(text)
    .filter((s) => s.required && !values[s.name]?.trim() && s.name !== 'date')
    .map((s) => s.name);
}

export type FillContext = {
  lang: 'en' | 'ms';
  todayKey: string;
  accountName: (id: string) => string | undefined;
  categoryName: (id: string) => string | undefined;
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/** A slot's value as words the brain reads: "RM12.90", "Maybank", "today", "3 nov 2026". */
export function slotText(name: SlotName, raw: string | undefined, ctx: FillContext): string {
  const v = (raw ?? '').trim();
  if (!v) return '';
  switch (name) {
    case 'amount': {
      const n = Number(v.replace(/,/g, ''));
      return Number.isFinite(n) && n > 0 ? `RM${n.toFixed(2)}` : '';
    }
    case 'account':
    case 'from':
    case 'to':
      return ctx.accountName(v) ?? '';
    case 'category':
      return ctx.categoryName(v) ?? '';
    case 'date':
    case 'deadline': {
      const key = v === 'today' ? ctx.todayKey : v === 'yesterday' ? addDays(ctx.todayKey, -1) : v;
      if (name === 'date' && key === ctx.todayKey) return ctx.lang === 'ms' ? 'hari ini' : 'today';
      if (name === 'date' && key === addDays(ctx.todayKey, -1)) return ctx.lang === 'ms' ? 'semalam' : 'yesterday';
      const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '';
    }
    case 'months': {
      const n = Math.round(Number(v));
      return Number.isFinite(n) && n >= 1 && n <= 120 ? String(n) : '';
    }
    case 'details':
      return v
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .join('\n');
    default:
      return v.replace(/\s+/g, ' ').slice(0, 60);
  }
}

/**
 * The message to send: optional parts with an empty slot are dropped, the rest filled in. Returns null when a
 * required slot is still empty (the form shows which one).
 */
export function fillTemplate(text: string, values: SlotValues, ctx: FillContext): string | null {
  const word = (name: string) => slotText(name as SlotName, name === 'date' && !values.date ? 'today' : values[name as SlotName], ctx);
  const withOptional = text.replace(OPTIONAL_RE, (_, part: string) => {
    const inner = [...part.matchAll(SLOT_RE)].map((m) => m[1]);
    // The date is optional in a sentence: "today" is what the brain assumes anyway, so it is only written when picked.
    if (inner.some((n) => !(n === 'date' ? values.date : word(n)))) return '';
    return part.replace(SLOT_RE, (_m, n: string) => word(n));
  });
  let missing = false;
  const out = withOptional.replace(SLOT_RE, (_m, n: string) => {
    const w = word(n);
    if (!w) missing = true;
    return w;
  });
  if (missing) return null;
  return out
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .trim();
}

/** The message for a list or a preview: empty required slots show as "…", empty optional parts are left out. */
export function previewText(text: string, values: SlotValues, ctx: FillContext, literal?: boolean): string {
  if (literal) return text;
  const filled: SlotValues = { ...values };
  for (const s of slotsOf(text)) if (s.required && !slotText(s.name, filled[s.name], ctx) && s.name !== 'date') filled[s.name] = '\u2026';
  const word = (name: string) => (filled[name as SlotName] === '\u2026' ? '\u2026' : slotText(name as SlotName, filled[name as SlotName], ctx));
  return text
    .replace(OPTIONAL_RE, (_, part: string) => {
      const inner = [...part.matchAll(SLOT_RE)].map((m) => m[1]);
      return inner.some((n) => !(n === 'date' ? values.date : word(n))) ? '' : part.replace(SLOT_RE, (_m, n: string) => word(n));
    })
    .replace(SLOT_RE, (_m, n: string) => word(n) || '\u2026')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/** The message a shortcut sends now, or null when something still has to be asked. */
export function runText(sc: Shortcut, ctx: FillContext): string | null {
  return sc.literal ? sc.text : fillTemplate(sc.text, sc.values, ctx);
}

/** What a saved shortcut keeps: the answers the pengguna gave, except today's date (a shortcut always means "today"). */
export function bakeValues(values: SlotValues, todayKey: string): SlotValues {
  const out: SlotValues = {};
  for (const [k, v] of Object.entries(values) as [SlotName, string | undefined][]) {
    if (!v?.trim()) continue;
    if (k === 'date' && (v === 'today' || v === todayKey)) continue;
    out[k] = v.trim();
  }
  return out;
}

let counter = 0;
export const shortcutId = () => `sc${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Keeps only shortcuts with the right shape (a saved list could be from an older version). */
export function validShortcuts(list: unknown): Shortcut[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter(
      (s): s is Shortcut =>
        !!s &&
        typeof s === 'object' &&
        typeof (s as Shortcut).id === 'string' &&
        typeof (s as Shortcut).name === 'string' &&
        typeof (s as Shortcut).text === 'string' &&
        (s as Shortcut).text.length > 0 &&
        (s as Shortcut).text.length <= 1000,
    )
    .map((s) => ({ ...s, icon: typeof s.icon === 'string' ? s.icon : 'flash-outline', values: s.values && typeof s.values === 'object' ? s.values : {}, literal: s.literal === true }))
    .slice(0, 40);
}

export const MAX_SHORTCUTS = 40;
