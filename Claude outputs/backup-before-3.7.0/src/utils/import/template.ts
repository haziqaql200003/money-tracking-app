/**
 * The WaKira import template: a plain CSV that opens in Excel, Numbers and Google Sheets.
 * Files that start with exactly these column names skip the column-matching step.
 */
export const TEMPLATE_HEADERS = ['Date', 'Description', 'Category', 'Subcategory', 'Account', 'Type', 'Amount']; // i18n-ignore: spreadsheet column names

const SAMPLE_ROWS = [
  ['2026-01-03', 'Nasi lemak', 'Food & Drinks', 'Breakfast', 'Bank', 'Expense', '6.50'],
  ['2026-01-05', 'Monthly salary', 'Salary', 'Salary', 'Bank', 'Income', '4500.00'],
  ['2026-01-07', 'Petrol', 'Transport', 'Petrol / Fuel', 'Cash', 'Expense', '50.00'],
]; // i18n-ignore: sample data for a spreadsheet

/** Leading BOM so Excel reads the file as UTF-8. */
export const TEMPLATE_CSV = '﻿' + [TEMPLATE_HEADERS, ...SAMPLE_ROWS].map((r) => r.join(',')).join('\r\n') + '\r\n';

const norm = (s: string) => s.replace(/^﻿/, '').trim().toLowerCase();

/** True when the first row of the table is exactly the template header. */
export function isTemplateTable(rows: string[][]): boolean {
  const first = rows[0];
  if (!first) return false;
  return TEMPLATE_HEADERS.every((h, i) => norm(first[i] ?? '') === h.toLowerCase());
}
