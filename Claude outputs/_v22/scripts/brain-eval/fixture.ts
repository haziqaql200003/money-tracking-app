/**
 * Fake but realistic records for testing the brain without a phone: 7 months of a salaried pengguna in KL.
 * Deterministic (no Math.random), so test results are repeatable.
 */
import { DEFAULT_CATEGORIES } from '@/constants/categories';
import type { Transaction, Transfer } from '@/context/TransactionsContext';
import { trainCategoryModel } from '@/services/ai/category-model';
import type { AiAccount, AiData } from '@/services/ai/engine';

export const TODAY = '2026-10-29';

const accounts = [
  { id: 'a1', name: 'Maybank', provider: 'Maybank', type: 'bank', icon: 'card', initialBalance: 2000, balance: 2450.5, savings: false },
  { id: 'a2', name: 'Cash', type: 'cash', icon: 'cash', initialBalance: 100, balance: 120, savings: false },
  { id: 'a3', name: 'TNG eWallet', provider: 'TNG eWallet', type: 'other', icon: 'wallet', initialBalance: 50, balance: 63.2, savings: false },
  { id: 'a4', name: 'ASB', provider: 'ASB', type: 'savings', icon: 'trending-up', initialBalance: 1000, balance: 5200, savings: true },
] as unknown as AiAccount[];

function key(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function makeData(opts: { empty?: boolean } = {}): AiData {
  const tx: Transaction[] = [];
  const transfers: Transfer[] = [];
  if (!opts.empty) {
    const end = new Date(`${TODAY}T00:00:00Z`);
    let n = 0;
    const add = (date: string, title: string, amount: number, categoryId: string, subcategory: string, accountId: string, type: 'debit' | 'credit' = 'debit') =>
      tx.push({ id: `t${n++}`, title, amount, type, date, categoryId, subcategory, accountId } as Transaction);
    for (let i = 0; i < 210; i++) {
      const d = new Date(end.getTime() - i * 86_400_000);
      const k = key(d);
      const day = d.getUTCDate();
      const dow = d.getUTCDay();
      // Spending grows a bit in the latest month (dining out), so "why did it go up" has an answer.
      const recent = i < 29;
      add(k, 'Nasi lemak', 6 + (i % 3), 'food', 'Breakfast', 'a2');
      if (i % 2 === 0) add(k, recent ? 'Restoran Pelita' : 'Nasi campur', recent ? 22 + (i % 5) : 12 + (i % 4), 'food', recent ? 'Restaurant / Dining' : 'Lunch', 'a1');
      if (i % 3 === 0) add(k, 'Grab', 9 + (i % 7), 'transport', 'Grab / E-hailing', 'a3');
      if (dow === 6 || dow === 0) add(k, 'Kopi Starbucks', 15.9, 'food', 'Coffee / Tea', 'a1');
      if (i % 7 === 3) add(k, 'Petronas', 60, 'transport', 'Petrol / Fuel', 'a1');
      if (day === 25) add(k, 'Gaji', 4200, 'income', 'Salary', 'a1', 'credit');
      if (day === 1) add(k, 'Sewa bilik', 650, 'bills', 'Rent', 'a1');
      if (day === 5) add(k, 'TNB', 85 + (i % 20), 'bills', 'Electricity', 'a1');
      if (day === 8) add(k, 'Netflix', 17, 'subscriptions', 'Netflix', 'a1');
      if (day === 9) add(k, 'Spotify', 15.9, 'subscriptions', 'Spotify', 'a1');
      if (day === 12) add(k, 'Shopee', recent ? 180 : 70, 'shopping', 'Online Shopping', 'a1');
      if (day === 26) transfers.push({ id: `x${i}`, fromAccountId: 'a1', toAccountId: 'a4', amount: 300, date: k } as Transfer);
    }
  }
  return {
    todayKey: TODAY,
    transactions: tx,
    transfers,
    accounts,
    categories: DEFAULT_CATEGORIES,
    recurringRules: [],
    categoryLabel: (c) => c.name,
    accountLabel: (a) => a.name,
    fixedMonthly: 735,
    debtMonthly: 0,
    savingsBalance: 5200,
    totalBudget: 2100,
    goals: [],
    score: null,
    feed: opts.empty ? [] : [{ id: 'spike', tone: 'warn', title: 'Spending this week is higher than usual', body: 'This week you spent RM330.80, more than your usual RM250.00. Most of it went to Food & Drinks.' }],
    model: trainCategoryModel(tx),
  };
}
