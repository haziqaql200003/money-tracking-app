/**
 * The monthly financial report as plain rows, so the same numbers become the text and the spreadsheet you share.
 * Pure: the screen passes in the names and the words.
 */
import type { Report } from '@/utils/report-data';

export type ReportRow = { section: string; label: string; amount?: number; note?: string };

export type ReportWords = {
  summary: string;
  budgets: string;
  categories: string;
  goals: string;
  debts: string;
  highlights: string;
  income: string;
  spend: string;
  saved: string;
  rate: string;
  vsLastMonth: string;
  paid: string;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function reportRows(r: Report, w: ReportWords, catName: (id: string) => string, budgetNote: (spent: number, limit: number) => string): ReportRow[] {
  const rows: ReportRow[] = [
    { section: w.summary, label: w.income, amount: r2(r.income) },
    { section: w.summary, label: w.spend, amount: r2(r.spend) },
    { section: w.summary, label: w.saved, amount: r2(r.net) },
  ];
  if (r.rate !== null) rows.push({ section: w.summary, label: w.rate, note: `${Math.round(r.rate)}%` });
  if (r.spendChange !== null) rows.push({ section: w.summary, label: w.vsLastMonth, note: `${r.spendChange > 0 ? '+' : ''}${Math.round(r.spendChange)}%` });
  for (const b of r.budgets) rows.push({ section: w.budgets, label: catName(b.categoryId), amount: r2(b.spent), note: budgetNote(b.spent, b.limit) });
  for (const c of r.categories.slice(0, 8)) rows.push({ section: w.categories, label: catName(c.id), amount: r2(c.amount), note: `${Math.round(c.share * 100)}%` });
  for (const g of r.goals) rows.push({ section: w.goals, label: g.name, amount: r2(g.inPeriod), note: `${Math.round(g.percent)}%` });
  if (r.debtPaid > 0) rows.push({ section: w.debts, label: w.paid, amount: r2(r.debtPaid) });
  for (const b of r.biggest.slice(0, 3)) rows.push({ section: w.highlights, label: b.title, amount: r2(b.amount), note: b.date });
  return rows;
}

const money = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function reportToText(title: string, rows: ReportRow[]): string {
  const out: string[] = [title];
  let section = '';
  for (const r of rows) {
    if (r.section !== section) {
      section = r.section;
      out.push('', section);
    }
    out.push(`- ${r.label}${r.amount !== undefined ? `: ${money(r.amount)}` : ''}${r.note ? ` (${r.note})` : ''}`);
  }
  return out.join('\n');
}

export function reportToCsv(header: string, rows: ReportRow[]): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = rows.map((r) => [r.section, r.label, r.amount === undefined ? '' : r.amount.toFixed(2), r.note ?? ''].map(esc).join(','));
  return [header, ...lines].join('\n');
}
