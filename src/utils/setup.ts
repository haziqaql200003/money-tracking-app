/** Helpers for the first-time setup. Pure, so the date rules can be tested without the app. */

const pad = (n: number) => String(n).padStart(2, '0');
const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/** Whole number 1-31, or null when the text is not a valid day of the month. */
export function parsePayDay(text: string): number | null {
  const t = text.trim();
  if (!/^\d{1,2}$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 && n <= 31 ? n : null;
}

/**
 * The first pay date AFTER today for a salary paid on `day` of every month.
 * Only months that really have that day are used, so "the 31st" stays the 31st (shorter months are then handled by
 * the recurring engine, which moves it to the last day). Today itself is skipped: nothing is recorded for a day
 * that may already have been recorded by hand.
 */
export function nextPayDate(day: number, todayKey: string): string {
  const [y, m, d] = todayKey.split('-').map(Number);
  for (let i = 0; i < 14; i++) {
    const total = y * 12 + (m - 1) + i;
    const ny = Math.floor(total / 12);
    const nm = total % 12;
    if (daysIn(ny, nm) < day) continue;
    if (i === 0 && day <= d) continue;
    return `${ny}-${pad(nm + 1)}-${pad(day)}`;
  }
  return todayKey; // unreachable for day <= 31
}

export type SalaryPlan = {
  /** Something was typed but cannot be used (e.g. a salary without a valid pay day). Block "Next" and show a hint. */
  invalid: boolean;
  /** What to create, or null when the person skipped this part. */
  plan: { amount: number; ask: boolean; startDate: string } | null;
};

const num = (t: string) => {
  const n = parseFloat(t.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
};

/**
 * Turns the salary fields of the setup into a recurring rule plan.
 *  - nothing typed                       -> skipped
 *  - fixed salary + valid pay day        -> fixed rule
 *  - "varies" + valid pay day            -> ask rule (amount optional, used only as an estimate)
 *  - a salary or pay day typed, but the rest unusable -> invalid
 */
export function salaryPlan(input: { salary: string; payDay: string; varies: boolean }, todayKey: string): SalaryPlan {
  const amount = num(input.salary);
  const day = parsePayDay(input.payDay);
  const typedSomething = input.salary.trim() !== '' || input.payDay.trim() !== '';

  if (!typedSomething) return { invalid: false, plan: null };
  if (day === null) return { invalid: true, plan: null };
  if (amount === 0 && !input.varies) return { invalid: input.salary.trim() !== '', plan: null };
  return { invalid: false, plan: { amount, ask: input.varies, startDate: nextPayDate(day, todayKey) } };
}
