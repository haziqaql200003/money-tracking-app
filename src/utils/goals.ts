import { cycleOf } from '@/utils/cycle';

/**
 * Savings goals.
 *
 * A goal is money you have MENTALLY set aside. Adding to a goal does not move money between accounts and does
 * not count as spending, so balances, income and spending stay exactly as they are.
 */

export type SavingsGoal = {
  id: string;
  name: string;
  target: number;
  /** YYYY-MM-DD, optional. */
  deadline?: string;
  icon: string;
  color: string;
  /** YYYY-MM-DD the goal was created (start of the "on track" line). */
  createdAt: string;
  /** What you plan to put aside every month; 0 or missing = no monthly plan. */
  monthly?: number;
  /** Paused goals stay in the list but are left out of monthly plans, reminders and commitments. */
  paused?: boolean;
  /** The savings account the money normally goes to. */
  accountId?: string;
  /** Count the whole balance of the linked account as saved for this goal (use on one goal per account). */
  useBalance?: boolean;
  /** Already in the account when the goal was made; counts as saved from the start. */
  startAmount?: number;
  /** Optional reason or note. */
  note?: string;
  /** Recurring transfer rule made for "save automatically". */
  recurringId?: string;
};

export type GoalEntry = {
  id: string;
  goalId: string;
  /** Positive = added to the goal, negative = taken out. */
  amount: number;
  date: string;
  note?: string;
  /** True for entries worked out from transfers made to this goal. They cannot be deleted here. */
  fromTransfer?: boolean;
};

export type GoalStatus = 'done' | 'overdue' | 'behind' | 'on_track' | 'open';

export type GoalProgress = {
  saved: number;
  remaining: number;
  /** 0-100, capped at 100. */
  percent: number;
  status: GoalStatus;
  /** Days until the deadline (negative once passed); null without a deadline. */
  daysLeft: number | null;
  /** Amount to set aside per month to still hit the deadline; null without a deadline or once done. */
  perMonth: number | null;
};

const DAY = 86400000;
const round2 = (n: number) => Math.round(n * 100) / 100;

function dayNumber(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY);
}

export function goalSaved(entries: GoalEntry[], goalId: string) {
  let sum = 0;
  for (const e of entries) if (e.goalId === goalId) sum += e.amount;
  return round2(Math.max(0, sum));
}

export function goalProgress(goal: SavingsGoal, entries: GoalEntry[], todayKey: string): GoalProgress {
  const saved = goalSaved(entries, goal.id);
  const remaining = round2(Math.max(0, goal.target - saved));
  const percent = goal.target > 0 ? Math.min(100, Math.floor((saved / goal.target) * 100)) : 0;
  const done = goal.target > 0 && saved >= goal.target;

  if (!goal.deadline) {
    return { saved, remaining, percent, status: done ? 'done' : 'open', daysLeft: null, perMonth: null };
  }

  const daysLeft = dayNumber(goal.deadline) - dayNumber(todayKey);
  if (done) return { saved, remaining, percent, status: 'done', daysLeft, perMonth: null };
  if (daysLeft < 0) return { saved, remaining, percent, status: 'overdue', daysLeft, perMonth: null };

  const months = Math.max(1, daysLeft / 30.4375);
  const perMonth = round2(remaining / months);

  // Compare with a straight line from creation day to the deadline.
  const total = Math.max(1, dayNumber(goal.deadline) - dayNumber(goal.createdAt));
  const elapsed = Math.min(total, Math.max(0, dayNumber(todayKey) - dayNumber(goal.createdAt)));
  const expected = goal.target * (elapsed / total);
  const status: GoalStatus = saved + 0.005 >= expected ? 'on_track' : 'behind';

  return { saved, remaining, percent, status, daysLeft, perMonth };
}


/* ---------------- transfers, monthly plan, milestones, projection ---------------- */

/** Money moved to a goal through a transfer counts as saved for that goal. */
export function transferEntries(transfers: { id: string; goalId?: string; amount: number; date: string; note?: string }[]): GoalEntry[] {
  return transfers
    .filter((t) => !!t.goalId)
    .map((t) => ({ id: `tr:${t.id}`, goalId: t.goalId as string, amount: t.amount, date: t.date, note: t.note, fromTransfer: true }));
}

/** Net amount put toward a goal in one 'YYYY-MM' month. */
export function goalMonthSaved(entries: GoalEntry[], goalId: string, monthKey: string) {
  let sum = 0;
  for (const e of entries) if (e.goalId === goalId && cycleOf(e.date) === monthKey) sum += e.amount;
  return round2(sum);
}

export const MILESTONES = [25, 50, 75, 100] as const;

/** The highest milestone reached and the next one to aim for (null once at 100). */
export function milestoneState(percent: number): { reached: number | null; next: number | null } {
  let reached: number | null = null;
  for (const m of MILESTONES) if (percent >= m) reached = m;
  const next = MILESTONES.find((m) => percent < m) ?? null;
  return { reached, next };
}

function addMonthsToKey(key: string, months: number) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

export type GoalProjection = {
  /** Average net saving per month over the recent past. */
  perMonth: number;
  /** When the goal is reached if you keep this pace; null if the pace is zero or there is nothing left to do. */
  finishDate: string | null;
  /** Days the projected finish is after the deadline (negative = before it). null without both. */
  daysVsDeadline: number | null;
};

/** Pace over the last 3 months (or since the goal began, if newer), projected forward. */
export function goalProjection(goal: SavingsGoal, entries: GoalEntry[], todayKey: string): GoalProjection {
  const mine = entries.filter((e) => e.goalId === goal.id);
  const saved = goalSaved(entries, goal.id);
  const remaining = Math.max(0, goal.target - saved);
  const from = addMonthsToKey(todayKey, -3);
  const first = mine.reduce((min, e) => (e.date < min ? e.date : min), goal.createdAt);
  const start = first > from ? first : from;
  const spanMonths = Math.max(1, (dayNumber(todayKey) - dayNumber(start)) / 30.4375);
  const recent = mine.filter((e) => e.date >= start && e.date <= todayKey).reduce((s, e) => s + e.amount, 0);
  const perMonth = round2(Math.max(0, recent / spanMonths));
  if (remaining <= 0 || perMonth <= 0) return { perMonth, finishDate: null, daysVsDeadline: null };
  const days = Math.ceil((remaining / perMonth) * 30.4375);
  const [y, m, d] = todayKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const finishDate = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  return { perMonth, finishDate, daysVsDeadline: goal.deadline ? dayNumber(finishDate) - dayNumber(goal.deadline) : null };
}

/** Goals that count for monthly plans: not paused, not finished. */
export function activeGoals(goals: SavingsGoal[], entries: GoalEntry[]) {
  return goals.filter((g) => !g.paused && goalSaved(entries, g.id) < g.target);
}

/* ---------------- how the goal is doing, and the deposit calendar ---------------- */

export type GoalOutlook = 'done' | 'on' | 'late' | 'off' | 'none';

/**
 * How the goal looks if the current pace carries on.
 * on = finishes by the due date, late = up to 90 days after it, off = further than that or no pace at all,
 * none = no due date to compare with.
 */
export function goalOutlook(goal: SavingsGoal, status: GoalStatus, proj: GoalProjection): GoalOutlook {
  if (status === 'done') return 'done';
  if (!goal.deadline) return 'none';
  if (proj.daysVsDeadline === null) return 'off';
  if (proj.daysVsDeadline <= 0) return 'on';
  return proj.daysVsDeadline <= 90 ? 'late' : 'off';
}

export type DepositState = 'deposited' | 'missed' | 'current' | 'upcoming' | 'before';

/**
 * One state per month of `year` (index 0 = January).
 * Past months since the goal began are deposited (met the monthly plan, or any amount when there is no plan) or missed.
 */
export function depositCalendar(goal: SavingsGoal, entries: GoalEntry[], todayKey: string, year: number): { state: DepositState; saved: number }[] {
  const startKey = cycleOf(goal.createdAt.slice(0, 10));
  const nowKey = cycleOf(todayKey);
  const plan = goal.monthly && goal.monthly > 0 ? goal.monthly : 0;
  return Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    const saved = goalMonthSaved(entries, goal.id, key);
    const met = plan > 0 ? saved + 0.005 >= plan : saved > 0;
    let state: DepositState;
    if (key < startKey) state = 'before';
    else if (key > nowKey) state = 'upcoming';
    else if (key === nowKey) state = met ? 'deposited' : 'current';
    else state = met ? 'deposited' : 'missed';
    return { state, saved };
  });
}

/* ---------------- one savings account, many goals ---------------- */

/**
 * How a savings account's balance is divided between the goals that point at it.
 * `free` is what is not earmarked; it goes negative when goals claim more than the account holds.
 */
export function allocationOf(accountId: string, balance: number, goals: SavingsGoal[], entries: GoalEntry[]) {
  const parts = goals
    .filter((g) => g.accountId === accountId)
    .map((g) => ({ id: g.id, name: g.name, color: g.color, amount: Math.max(0, goalSaved(entries, g.id)) }));
  const used = round2(parts.reduce((s, p) => s + p.amount, 0));
  return { balance: round2(Math.max(0, balance)), parts, used, free: round2(Math.max(0, balance) - used) };
}
