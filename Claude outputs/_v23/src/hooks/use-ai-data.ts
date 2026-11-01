import { useMemo } from 'react';

import { useCategories } from '@/context/CategoriesContext';
import { useDebts } from '@/context/DebtsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useHealthScore } from '@/hooks/use-health-score';
import { t } from '@/i18n';
import { accountName, categoryName } from '@/i18n/data';
import { trainCategoryModel } from '@/services/ai/category-model';
import type { AiData } from '@/services/ai/engine';
import { formatMoney } from '@/utils/currency';
import { buildFeed } from '@/utils/insight-feed';
import { looksLikeSavings } from '@/utils/saved';

/** Everything the assistant's on-device tools work from, gathered from the app's own state. */
export function useAiData(todayKey: string): AiData {
  const { transactions, transfers, selectableAccounts, accountBalance, recurringRules } = useTransactions();
  const { categories, getCategory } = useCategories();
  const health = useHealthScore(todayKey);
  const { debts, ious } = useDebts();

  // Retrained only when the records change.
  const model = useMemo(() => trainCategoryModel(transactions), [transactions]);

  const feed = useMemo(
    () =>
      buildFeed({
        transactions,
        todayKey,
        categoryName: (id) => {
          const c = getCategory(id);
          return c ? categoryName(c) : t('cat.other');
        },
        money: (n) => formatMoney(n),
        fixedMonthly: health.fixedMonthly,
        debtMonthly: health.debtMonthly,
        budget: health.totalBudget,
        savingsBalance: health.savingsBalance,
        goals: health.goalFacts,
      }),
    [transactions, todayKey, getCategory, health.fixedMonthly, health.debtMonthly, health.totalBudget, health.savingsBalance, health.goalFacts],
  );

  const accounts = useMemo(
    () => selectableAccounts.map((a) => ({ ...a, balance: accountBalance(a.id), savings: looksLikeSavings(a) })),
    [selectableAccounts, accountBalance],
  );

  return useMemo<AiData>(
    () => ({
      todayKey,
      transactions,
      transfers,
      accounts,
      categories,
      recurringRules,
      categoryLabel: categoryName,
      accountLabel: accountName,
      fixedMonthly: health.fixedMonthly,
      debtMonthly: health.debtMonthly,
      savingsBalance: health.savingsBalance,
      totalBudget: health.totalBudget,
      goals: health.goalFacts,
      score: health.score,
      feed,
      model,
      debts,
      ious,
    }),
    [todayKey, transactions, transfers, accounts, categories, recurringRules, health, feed, model, debts, ious],
  );
}
