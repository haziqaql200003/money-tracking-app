import { useMemo } from 'react';

import { useCategories } from '@/context/CategoriesContext';
import { useDebts } from '@/context/DebtsContext';
import { usePlan } from '@/context/PlanContext';
import { useSettings } from '@/context/SettingsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useLedger } from '@/hooks/use-ledger';
import { instalmentAmount, isFinished, nextInstalment } from '@/utils/debts';
import { goalOutlook, goalProgress, goalProjection } from '@/utils/goals';
import { computeHealth, scoreOf } from '@/utils/health';
import type { BudgetLimit, GoalFacts } from '@/utils/insight-feed';
import { isEnded, isTransfer, monthlyEquivalent } from '@/utils/recurring';
import { looksLikeSavings } from '@/utils/saved';

/**
 * Financial health (utils/health.ts: five areas, each with its method and the numbers behind it) and
 * the facts the health score and the insight feed both need (bills, debt payments, savings, goals) and the score itself.
 * Shared by the Overview, the Insights tab and Ask WaKira so all of them always show the same number.
 * The score reads ledger entries: corrections and moved money are not income or spending, refunds lower spending.
 */
export function useHealthScore(todayKey: string) {
  const { transactions, transfers, accounts, recurringRules, accountBalance } = useTransactions();
  const { entries, moved } = useLedger();
  const { totalBudget, expenseCategories } = useCategories();
  const { debts } = useDebts();
  const { goals, goalEntries } = usePlan();
  const { savingsTarget } = useSettings();

  // `accountBalance` is a new function on every render, so the balance is keyed on the data it reads instead.
  const savingsBalance = useMemo(
    () => accounts.filter((a) => !a.hidden && looksLikeSavings(a)).reduce((s, a) => s + Math.max(0, accountBalance(a.id)), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accounts, transactions, transfers],
  );

  const budgets = useMemo<BudgetLimit[]>(
    () => expenseCategories.filter((c) => c.monthlyLimit > 0).map((c) => ({ categoryId: c.id, limit: c.monthlyLimit })),
    [expenseCategories],
  );

  const inputs = useMemo(() => {
    const fixedMonthly = recurringRules
      .filter((r) => r.active && !isEnded(r) && !isTransfer(r) && r.type === 'debit')
      .reduce((s, r) => s + monthlyEquivalent(r), 0);
    const debtMonthly = debts
      .filter((d) => d.kind !== 'credit' && !isFinished(d))
      .reduce((s, d) => {
        const n = nextInstalment(d);
        return s + (n ? instalmentAmount(n) : 0);
      }, 0);
    const goalFacts: GoalFacts[] = goals
      .filter((g) => !g.paused)
      .map((g) => {
        const p = goalProgress(g, goalEntries, todayKey);
        const proj = goalProjection(g, goalEntries, todayKey);
        return { name: g.name, outlook: goalOutlook(g, p.status, proj), need: p.perMonth, pace: proj.perMonth };
      });
    return { fixedMonthly, debtMonthly, savingsBalance, goalFacts };
  }, [recurringRules, debts, savingsBalance, goals, goalEntries, todayKey]);

  // Credit lines (PayLater-style accounts): money used is the negative balance.
  const credit = useMemo(() => {
    let used = 0;
    let limit = 0;
    for (const a of accounts) {
      if (!a.creditLimit || a.creditLimit <= 0) continue;
      limit += a.creditLimit;
      used += Math.max(0, -accountBalance(a.id));
    }
    return { used, limit };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, transactions, transfers]);

  const health = useMemo(() => {
    const savingIds = new Set(accounts.filter((a) => looksLikeSavings(a)).map((a) => a.id));
    return computeHealth({
      entries,
      moved,
      transfers,
      isSavingsAccount: (id) => savingIds.has(id),
      todayKey,
      savingsTarget,
      savingsBalance: inputs.savingsBalance,
      hasSavingsPlace: accounts.some((a) => !a.hidden && looksLikeSavings(a)) || goals.length > 0,
      debtMonthly: inputs.debtMonthly,
      debtCount: debts.filter((d) => d.kind !== 'credit' && !isFinished(d)).length,
      creditUsed: credit.used,
      creditLimit: credit.limit,
      budgets,
    });
  }, [entries, moved, transfers, accounts, todayKey, savingsTarget, inputs, goals, debts, credit, budgets]);

  const score = useMemo(() => scoreOf(health), [health]);

  return { ...inputs, health, score, savingsTarget, totalBudget, budgets };
}
