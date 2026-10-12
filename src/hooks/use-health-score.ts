import { useMemo } from 'react';

import { useCategories } from '@/context/CategoriesContext';
import { useDebts } from '@/context/DebtsContext';
import { usePlan } from '@/context/PlanContext';
import { useSettings } from '@/context/SettingsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { instalmentAmount, isFinished, nextInstalment } from '@/utils/debts';
import { goalOutlook, goalProgress, goalProjection } from '@/utils/goals';
import { wakiraScore, type GoalFacts } from '@/utils/insight-feed';
import { isEnded, isTransfer, monthlyEquivalent } from '@/utils/recurring';
import { looksLikeSavings } from '@/utils/saved';

/**
 * The facts the health score and the insight feed both need (bills, debt payments, savings, goals) and the score itself.
 * Shared by the Overview and the Insights tab so both always show the same number.
 */
export function useHealthScore(todayKey: string) {
  const { transactions, accounts, recurringRules, accountBalance } = useTransactions();
  const { totalBudget } = useCategories();
  const { debts } = useDebts();
  const { goals, goalEntries } = usePlan();
  const { savingsTarget } = useSettings();

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
    const savingsBalance = accounts.filter((a) => !a.hidden && looksLikeSavings(a)).reduce((s, a) => s + Math.max(0, accountBalance(a.id)), 0);
    const goalFacts: GoalFacts[] = goals
      .filter((g) => !g.paused)
      .map((g) => {
        const p = goalProgress(g, goalEntries, todayKey);
        const proj = goalProjection(g, goalEntries, todayKey);
        return { name: g.name, outlook: goalOutlook(g, p.status, proj), need: p.perMonth, pace: proj.perMonth };
      });
    return { fixedMonthly, debtMonthly, savingsBalance, goalFacts };
  }, [recurringRules, debts, accounts, accountBalance, goals, goalEntries, todayKey]);

  const score = useMemo(
    () =>
      wakiraScore({
        transactions,
        todayKey,
        budget: totalBudget,
        debtMonthly: inputs.debtMonthly,
        savingsBalance: inputs.savingsBalance,
        fixedMonthly: inputs.fixedMonthly,
        savingsTarget,
      }),
    [transactions, todayKey, totalBudget, inputs, savingsTarget],
  );

  return { ...inputs, score, savingsTarget, totalBudget };
}
