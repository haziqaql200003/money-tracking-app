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
};

export type GoalEntry = {
  id: string;
  goalId: string;
  /** Positive = added to the goal, negative = taken out. */
  amount: number;
  date: string;
  note?: string;
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
