import type { Transaction, Transfer } from '@/context/TransactionsContext';

/**
 * A transfer can be marked "count in budget" (money put aside into a savings account).
 * It is then shown in Transactions and counted against its category's budget, but it is never income,
 * never part of the month's spending total, and still moves money between the two accounts.
 * These helpers turn such transfers into spending-shaped entries so budget code can treat them alike.
 */
export const SAVED_PREFIX = 'sv:';
/** Debt payments and loan payouts: listed in Transactions so you can see where the money went, never counted as spending. */
export const DEBT_PREFIX = 'db:';
/** Money put toward a goal without counting in the budget: listed, never counted. */
export const GOAL_PREFIX = 'gl:';

export const isSavedEntry = (t: Pick<Transaction, 'id'>) => t.id.startsWith(SAVED_PREFIX);
export const isDebtEntry = (t: Pick<Transaction, 'id'>) => t.id.startsWith(DEBT_PREFIX);
/** Either kind of transfer shown as a row in Transactions. */
export const isGoalEntry = (t: Pick<Transaction, 'id'>) => t.id.startsWith(GOAL_PREFIX);
export const isLinkedEntry = (t: Pick<Transaction, 'id'>) => isSavedEntry(t) || isDebtEntry(t) || isGoalEntry(t);
/** True for rows that open the transfer editor (savings and goal transfers). */
export const isEditableTransferEntry = (t: Pick<Transaction, 'id'>) => isSavedEntry(t) || isGoalEntry(t);
export const savedTransferId = (t: Pick<Transaction, 'id'>) => t.id.slice(SAVED_PREFIX.length);

export function savedEntries(transfers: Transfer[]): Transaction[] {
  return transfers
    .filter((tr) => !!tr.budgetCategoryId)
    .map((tr) => ({
      id: `${SAVED_PREFIX}${tr.id}`,
      title: tr.note?.trim() ?? '',
      date: tr.date,
      categoryId: tr.budgetCategoryId as string,
      subcategory: tr.budgetSub ?? '',
      amount: tr.amount,
      type: 'debit' as const,
      accountId: tr.fromAccountId,
    }));
}

export function goalEntriesOnly(transfers: Transfer[]): Transaction[] {
  return transfers
    .filter((tr) => !!tr.goalId && !tr.budgetCategoryId && !tr.debtId)
    .map((tr) => ({
      id: `${GOAL_PREFIX}${tr.id}`,
      title: tr.note?.trim() ?? '',
      date: tr.date,
      categoryId: 'financial',
      subcategory: 'Savings',
      amount: tr.amount,
      type: 'debit' as const,
      accountId: tr.fromAccountId,
    }));
}

/** Transfers that belong to a debt (instalment payment, loan payout, credit-line repayment). `hiddenIds` = internal debt accounts. */
export function debtEntries(transfers: Transfer[], hiddenIds: ReadonlySet<string>): Transaction[] {
  return transfers
    .filter((tr) => !!tr.debtId)
    .map((tr) => ({
      id: `${DEBT_PREFIX}${tr.id}`,
      title: tr.note?.trim() ?? '',
      date: tr.date,
      categoryId: 'financial',
      subcategory: hiddenIds.has(tr.fromAccountId) ? 'Personal Loan' : 'Loan Payment',
      amount: tr.amount,
      type: 'debit' as const,
      accountId: tr.fromAccountId,
    }));
}

/** Guess whether an account is meant for saving, from its name or type label. */
export function looksLikeSavings(a: { name: string; typeLabel?: string; type?: string } | undefined): boolean {
  if (!a) return false;
  if (a.type === 'savings') return true;
  return /sav|simpan|tabung|asb|fixed dep|\bfd\b|emergency|kecemasan/i.test(`${a.name} ${a.typeLabel ?? ''}`);
}
