/**
 * Shapes shared by the brain and the chat screen.
 *
 * A Visual is DATA, not code: the brain says "a donut of these parts" and the chat draws it with the app's own
 * chart components (src/components/ai/ai-visual.tsx). Every number in it comes from engine.ts.
 */
import type { InstalmentInput, IouInput } from '@/context/DebtsContext';
import type { RecurringRule, TransactionItem } from '@/context/TransactionsContext';

import type { Proposal } from '../engine';
import type { Intent } from './intent';
import type { PeriodName, Range } from './slots';

export type Tone = 'good' | 'bad' | 'neutral';

export type Visual =
  /** Parts of a whole (where the money went). Colors are the category colors. */
  | { kind: 'donut'; title: string; center: string; centerSub?: string; parts: { label: string; value: number; color: string }[] }
  /** A ranking: one bar per row, longest first. */
  | { kind: 'bars'; title: string; rows: { label: string; value: number; color?: string; note?: string }[] }
  /** Two values per row, e.g. this month (a) against last month (b). */
  | { kind: 'compare'; title: string; aLabel: string; bLabel: string; rows: { label: string; a: number; b: number }[] }
  /** Months along the bottom. `splitAt` = index where the forecast starts. */
  | { kind: 'trend'; title: string; labels: string[]; series: { name: string; values: (number | null)[]; tone: 'expense' | 'income' | 'accent'; dashed?: boolean }[]; splitAt?: number }
  /** Big numbers in small tiles. Values are already formatted. */
  | { kind: 'stats'; items: { label: string; value: string; tone?: Tone }[] }
  /** Budget style progress bars. */
  | { kind: 'meter'; title: string; rows: { label: string; used: number; limit: number; status: 'ok' | 'warn' | 'over' }[] };

/** A half-finished request waiting for one more answer ("How much was it?"). */
export type Pending =
  | { kind: 'tx'; type: 'expense' | 'income'; title: string; amount?: number; accountId?: string; date?: string }
  | { kind: 'transfer'; amount?: number; from?: string; to?: string; date?: string }
  | { kind: 'instalment'; draft: { name: string; provider: string; amount?: number; perMonth: boolean; months?: number; payFrom?: string; firstDue?: string; interest?: boolean } };

/** Something to set up in another part of WaKira (Hutang, budgets, goals, recurring). Saved only when the pengguna taps Save. */
type ActionBase = { ref: string; title: string; summary: { label: string; value: string }[]; notes: string[] };
export type ActionProposal = ActionBase &
  (
    | { kind: 'instalment'; input: InstalmentInput }
    | { kind: 'iou'; input: IouInput }
    | { kind: 'budget'; categoryId: string; limit: number; previous: number }
    | { kind: 'goal'; input: { name: string; target: number; deadline?: string; monthly?: number; icon: string; color: string } }
    | { kind: 'recurring'; rule: Omit<RecurringRule, 'id'> }
    /** Line items for a record that already exists ("update Souqa Pasta with this breakdown"). */
    | { kind: 'breakdown'; txId: string; items: TransactionItem[]; amount: number; previousItems?: TransactionItem[]; previousAmount: number }
  );

/** What the last answer was about, so "kenapa?", "terangkan mudah" or "bulan lepas pula?" make sense. */
export type Topic = { intent: Intent; period?: PeriodName; range?: Range; categoryId?: string; months?: number; /** A saving target in RM ("save RM500 this month"). */ target?: number };

/** The brain's short-term memory for one chat. Kept by the chat screen and saved with the chat. */
export type Memory = {
  pending: Pending | null;
  last: Topic | null;
  /** The last search, right after it was shown, so "only the past 14 days" can narrow it. */
  find?: Record<string, unknown>;
};
export const EMPTY_MEMORY: Memory = { pending: null, last: null };

export type BrainAnswer = {
  handled: true;
  text: string;
  visuals: Visual[];
  /** Ready follow-up questions shown as buttons under the answer. Each one is something the brain understands. */
  chips: string[];
  proposals: Proposal[];
  /** Set-ups for other parts of the app (instalment, IOU, budget, goal, recurring bill). */
  actions: ActionProposal[];
  /** True when the numbers were worked out from the pengguna's records (shows the small "worked out on your phone" line). */
  checked: boolean;
  memory: Memory;
  intent: Intent;
  p: number;
};

export type BrainResult = BrainAnswer | { handled: false; intent: Intent; p: number; reason: 'empty' | 'low' | 'other'; memory: Memory };

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const str = (s: unknown): s is string => typeof s === 'string' && s.length > 0 && s.length <= 80;
const MAX_ROWS = 12;

/**
 * Keeps only chart specs that are safe to draw: a known kind, real numbers (no NaN / Infinity), labels that are
 * short strings, and at least something to show. Used before showing any chart, including charts loaded from a
 * saved chat. A chart that fails is dropped; the text answer still shows.
 */
export function validateVisuals(list: unknown): Visual[] {
  if (!Array.isArray(list)) return [];
  const out: Visual[] = [];
  for (const raw of list.slice(0, 4)) {
    const v = raw as Visual;
    if (!v || typeof v !== 'object') continue;
    switch (v.kind) {
      case 'donut':
        if (str(v.title) && typeof v.center === 'string' && Array.isArray(v.parts) && v.parts.length >= 2 && v.parts.every((p) => str(p.label) && fin(p.value) && p.value >= 0 && typeof p.color === 'string'))
          out.push({ ...v, parts: v.parts.slice(0, 8) });
        break;
      case 'bars':
        if (str(v.title) && Array.isArray(v.rows) && v.rows.length >= 1 && v.rows.every((r) => str(r.label) && fin(r.value))) out.push({ ...v, rows: v.rows.slice(0, MAX_ROWS) });
        break;
      case 'compare':
        if (str(v.title) && str(v.aLabel) && str(v.bLabel) && Array.isArray(v.rows) && v.rows.length >= 1 && v.rows.every((r) => str(r.label) && fin(r.a) && fin(r.b) && r.a >= 0 && r.b >= 0))
          out.push({ ...v, rows: v.rows.slice(0, MAX_ROWS) });
        break;
      case 'trend':
        if (
          str(v.title) &&
          Array.isArray(v.labels) &&
          v.labels.length >= 2 &&
          v.labels.length <= 40 &&
          Array.isArray(v.series) &&
          v.series.length >= 1 &&
          v.series.length <= 4 &&
          v.series.every((s) => str(s.name) && Array.isArray(s.values) && s.values.length === v.labels.length && s.values.every((x) => x === null || fin(x)))
        )
          out.push(v);
        break;
      case 'stats':
        if (Array.isArray(v.items) && v.items.length >= 1 && v.items.every((i) => str(i.label) && typeof i.value === 'string')) out.push({ ...v, items: v.items.slice(0, 3) });
        break;
      case 'meter':
        if (str(v.title) && Array.isArray(v.rows) && v.rows.length >= 1 && v.rows.every((r) => str(r.label) && fin(r.used) && fin(r.limit) && r.limit > 0)) out.push({ ...v, rows: v.rows.slice(0, MAX_ROWS) });
        break;
      default:
        break; // unknown kind: never drawn
    }
  }
  return out;
}
