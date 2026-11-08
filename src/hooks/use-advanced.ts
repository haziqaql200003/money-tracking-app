import { useMemo } from 'react';

import { useDebts } from '@/context/DebtsContext';
import { usePlan } from '@/context/PlanContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useHealthScore } from '@/hooks/use-health-score';
import { useLedger } from '@/hooks/use-ledger';
import { cycleOf } from '@/utils/cycle';
import { emergencyFund, lifestyleInflation, paydayBehaviour, recurringReview } from '@/utils/advanced';
import { debtBurden } from '@/utils/debt-burden';
import { activeGoals, goalProgress, goalProjection } from '@/utils/goals';
import { monthRows, trimmed } from '@/utils/insight-feed';
import { monthKeysEnding } from '@/utils/insights';
import { looksLikeSavings } from '@/utils/saved';
import { averageSaving, type WhatIfBase } from '@/utils/what-if';

/**
 * Everything Faham's deeper checks need (recurring commitments, lifestyle inflation, emergency fund, payday, debt
 * burden) and the What-If starting point, built once from the ledger and the user's plans.
 */
export function useAdvanced(todayKey: string) {
  const { entries, moved } = useLedger();
  const { transactions: raw, transfers, accounts, recurringRules, accountBalance } = useTransactions();
  const { debts } = useDebts();
  const { goals, goalEntries } = usePlan();
  const { savingsBalance } = useHealthScore(todayKey);

  // Balances: `accountBalance` is rebuilt every render, so these are keyed on the data they read.
  const balances = useMemo(() => {
    let available = 0;
    let creditUsed = 0;
    for (const a of accounts) {
      if (a.hidden) continue;
      if (a.creditLimit) creditUsed += Math.max(0, -accountBalance(a.id));
      else if (!a.debtId && !looksLikeSavings(a)) available += accountBalance(a.id);
    }
    return { available, creditUsed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, raw, transfers]);

  return useMemo(() => {
    const recent = trimmed(monthRows(entries, monthKeysEnding(todayKey, 7).slice(0, -1))).slice(-3);
    const keys = recent.map((r) => r.key);
    const n = Math.max(1, recent.length);
    const income = recent.reduce((s, r) => s + r.income, 0) / n;
    const spending = recent.reduce((s, r) => s + r.spending, 0) / n;
    const savingIds = new Set(accounts.filter((a) => looksLikeSavings(a)).map((a) => a.id));
    const burden = debtBurden(debts, balances.creditUsed, income);

    const cat = new Map<string, number>();
    const keySet = new Set(keys);
    for (const x of entries) {
      if (x.type !== 'debit' || x.amount <= 0) continue;
      if (!keySet.has(cycleOf(x.date))) continue;
      cat.set(x.categoryId, (cat.get(x.categoryId) ?? 0) + x.amount);
    }

    const whatIf: WhatIfBase | null =
      recent.length >= 2 && income > 0
        ? {
            income,
            spending,
            categories: [...cat.entries()].map(([categoryId, v]) => ({ categoryId, amount: v / n })).sort((a, b) => b.amount - a.amount),
            saving: averageSaving(transfers, moved, (id) => savingIds.has(id), keys),
            savingsBalance,
            available: balances.available,
            goals: activeGoals(goals, goalEntries).map((g) => {
              const p = goalProgress(g, goalEntries, todayKey);
              return { id: g.id, name: g.name, remaining: p.remaining, pace: goalProjection(g, goalEntries, todayKey).perMonth };
            }),
            debts: burden?.lines ?? [],
            months: recent.length,
          }
        : null;

    return {
      recurring: recurringReview(recurringRules, entries, todayKey),
      inflation: lifestyleInflation(entries, todayKey),
      emergency: emergencyFund(entries, savingsBalance, todayKey),
      payday: paydayBehaviour(entries, recurringRules, todayKey),
      burden,
      available: balances.available,
      whatIf,
    };
  }, [entries, moved, transfers, accounts, recurringRules, debts, goals, goalEntries, savingsBalance, balances, todayKey]);
}
