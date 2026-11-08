import { addDays } from '@/utils/cycle';

/**
 * Insight engine v2: turns the raw findings of buildFeed (utils/insight-feed.ts) into a prioritised, explainable feed.
 *
 *   OBSERVATION  the finding's title and body
 *   EVIDENCE     the numbers it rests on, the period they cover, and how the figure was worked out
 *   EXPLANATION  `how` (one sentence on the method) plus the confidence level
 *   ACTION       `action` and the button to the module where it can be acted on
 *
 * Severity is NOT a fixed percentage. It weighs the tone of the finding, its money impact as a share of the user's
 * own income, and how much data it rests on (see severityOf). Everything here is pure arithmetic: no AI involved.
 */

export type Severity = 'critical' | 'attention' | 'opportunity' | 'positive';
export type InsightCategory = 'spending' | 'positive' | 'pattern' | 'risk' | 'opportunity' | 'goal';
export type Confidence = 'high' | 'medium' | 'low';
export type Evidence = { label: string; value: string };
export type FeedTone = 'good' | 'warn' | 'bad' | 'info';

/** What a rule reports. The optional fields are filled by every rule in buildFeed; older callers can ignore them. */
export type FeedItem = {
  id: string;
  tone: FeedTone;
  title: string;
  body: string;
  action?: string;
  category?: InsightCategory;
  confidence?: Confidence;
  /** Money involved, in RM per month (or the one-off amount). Used for ranking, never shown as is. */
  impact?: number;
  evidence?: Evidence[];
  /** The dates the evidence covers, already formatted. */
  period?: string;
  /** One sentence on how the figure was worked out. */
  how?: string;
  /** The category the finding is about, for the drill-down and for de-duplication. */
  subjectCategoryId?: string;
  /** The dates of the records behind the finding, so the drill-down shows exactly those records. */
  window?: { from: string; to: string };
};

export type Insight = FeedItem & {
  category: InsightCategory;
  confidence: Confidence;
  severity: Severity;
  /** Higher = shown first. */
  priority: number;
  /** Stable identity for dismissal and history: the rule plus its subject. */
  key: string;
};

const SEVERITY_BASE: Record<Severity, number> = { critical: 400, attention: 300, opportunity: 200, positive: 100 };
export const SEVERITY_RANK: Record<Severity, number> = { positive: 0, opportunity: 1, attention: 2, critical: 3 };
const CONFIDENCE_WEIGHT: Record<Confidence, number> = { high: 30, medium: 15, low: 0 };

/** How long a hidden insight stays hidden, by severity (days). Serious findings come back sooner. */
export const COOLDOWN_DAYS: Record<Severity, number> = { critical: 7, attention: 14, opportunity: 30, positive: 30 };

/**
 * Severity from tone, impact and confidence:
 *   good                                   -> positive
 *   bad, impact >= 10% of income, not low   -> critical (goals excepted: at most attention)
 *   bad otherwise, or warn                 -> attention, except a low-confidence warn under 2% of income -> opportunity
 *   info with a suggested action           -> opportunity
 *   info without one                       -> attention (a pattern worth watching)
 * Without a known income the impact share counts as 0, so nothing becomes critical on amount alone.
 */
export function severityOf(item: FeedItem, monthlyIncome: number, confidence: Confidence): Severity {
  const share = monthlyIncome > 0 ? Math.abs(item.impact ?? 0) / monthlyIncome : 0;
  switch (item.tone) {
    case 'good':
      return 'positive';
    case 'bad':
      // A goal running late is worth attention, never an emergency.
      return share >= 0.1 && confidence !== 'low' && item.category !== 'goal' ? 'critical' : 'attention';
    case 'warn':
      return confidence === 'low' && share < 0.02 ? 'opportunity' : 'attention';
    default:
      return item.action ? 'opportunity' : 'attention';
  }
}

export function keyOf(item: FeedItem): string {
  return item.subjectCategoryId ? `${item.id}:${item.subjectCategoryId}` : item.id;
}

/** Ranks, labels and de-duplicates: two findings about the same category keep only the more important one. */
export function rankInsights(items: FeedItem[], monthlyIncome: number): Insight[] {
  const ranked: Insight[] = items.map((it) => {
    const confidence = it.confidence ?? 'medium';
    const severity = severityOf(it, monthlyIncome, confidence);
    const share = monthlyIncome > 0 ? Math.min(1, Math.abs(it.impact ?? 0) / monthlyIncome) : 0;
    return {
      ...it,
      category: it.category ?? (it.tone === 'good' ? 'positive' : 'pattern'),
      confidence,
      severity,
      priority: SEVERITY_BASE[severity] + Math.round(share * 100) + CONFIDENCE_WEIGHT[confidence],
      key: keyOf(it),
    };
  });
  ranked.sort((a, b) => b.priority - a.priority);
  const seenKeys = new Set<string>();
  const seenSubjects = new Set<string>();
  const out: Insight[] = [];
  for (const it of ranked) {
    if (seenKeys.has(it.key)) continue;
    // One spending warning per category: "Food went up" and "a spike in Food" say the same thing.
    const subject = it.subjectCategoryId && it.severity !== 'positive' ? `${it.category}:${it.subjectCategoryId}` : null;
    if (subject && seenSubjects.has(subject)) continue;
    seenKeys.add(it.key);
    if (subject) seenSubjects.add(subject);
    out.push(it);
  }
  return out;
}

/* ---------------- dismissal, cooldown and history (persisted per user) ---------------- */

export type InsightState = {
  /** key -> hidden until this date (exclusive) and the severity it had when hidden. */
  dismissed: Record<string, { until: string; severity: Severity }>;
  /** key -> when it was first and last shown, with its latest title and severity. */
  history: Record<string, { first: string; last: string; title: string; severity: Severity }>;
};
export const EMPTY_INSIGHT_STATE: InsightState = { dismissed: {}, history: {} };
/** History older than this is dropped, and at most this many entries are kept. */
export const HISTORY_DAYS = 180;
export const HISTORY_MAX = 100;

/**
 * Splits the ranked feed into what to show and what is hidden. A hidden insight comes back when its cooldown ends,
 * or straight away if it has become more severe than it was when hidden (an escalation is never swallowed).
 */
export function applyState(items: Insight[], state: InsightState, todayKey: string): { shown: Insight[]; hidden: Insight[] } {
  const shown: Insight[] = [];
  const hidden: Insight[] = [];
  for (const it of items) {
    const d = state.dismissed[it.key];
    const active = d && todayKey < d.until && SEVERITY_RANK[it.severity] <= SEVERITY_RANK[d.severity];
    (active ? hidden : shown).push(it);
  }
  return { shown, hidden };
}

export function dismiss(state: InsightState, it: Insight, todayKey: string): InsightState {
  return { ...state, dismissed: { ...state.dismissed, [it.key]: { until: addDays(todayKey, COOLDOWN_DAYS[it.severity]), severity: it.severity } } };
}

export function restore(state: InsightState, key: string): InsightState {
  const dismissed = { ...state.dismissed };
  delete dismissed[key];
  return { ...state, dismissed };
}

/**
 * Records today's shown insights in the history and drops expired entries. Returns the SAME object when nothing
 * changed, so a caller saving it in an effect never loops.
 */
export function recordHistory(state: InsightState, shown: Insight[], todayKey: string): InsightState {
  let changed = false;
  const history = { ...state.history };
  for (const it of shown) {
    const h = history[it.key];
    if (h && h.last === todayKey && h.title === it.title && h.severity === it.severity) continue;
    history[it.key] = { first: h?.first ?? todayKey, last: todayKey, title: it.title, severity: it.severity };
    changed = true;
  }
  const cutoff = addDays(todayKey, -HISTORY_DAYS);
  for (const [k, h] of Object.entries(history)) {
    if (h.last < cutoff) {
      delete history[k];
      changed = true;
    }
  }
  const keys = Object.keys(history);
  if (keys.length > HISTORY_MAX) {
    keys.sort((a, b) => (history[a].last < history[b].last ? -1 : 1));
    for (const k of keys.slice(0, keys.length - HISTORY_MAX)) delete history[k];
    changed = true;
  }
  const dismissed = { ...state.dismissed };
  for (const [k, d] of Object.entries(dismissed)) {
    if (d.until <= todayKey) {
      delete dismissed[k];
      changed = true;
    }
  }
  return changed ? { dismissed, history } : state;
}
