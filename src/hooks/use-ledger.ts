import { useMemo } from 'react';

import { useTransactions } from '@/context/TransactionsContext';
import { buildLedger, type Ledger } from '@/utils/ledger';

/**
 * The records as Faham analyses them (see utils/ledger.ts), built once per change to the transaction list.
 * Use `ledger.entries` for income, spending, categories, insights and the score.
 * Keep using `useTransactions().transactions` for anything that shows a BALANCE.
 */
export function useLedger(): Ledger {
  const { transactions } = useTransactions();
  return useMemo(() => buildLedger(transactions), [transactions]);
}
