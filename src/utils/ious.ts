import { addMonths } from '@/utils/debts';
import { addDays } from '@/utils/bills';

/**
 * Money between you and people (a friend, family): who owes whom, how much is left, and when to nudge.
 * Pure functions. This is a reminder list: it does not touch any account balance.
 */

export type IouDirection = 'owe' | 'owed';
/** How often to nudge again once it is overdue (or, with no due date, from the day it was added). */
export type IouRepeat = 'none' | 'weekly' | 'monthly';
export type IouPayment = { date: string; amount: number };

export type Iou = {
  id: string;
  person: string;
  /** 'owe' = you owe them. 'owed' = they owe you. */
  direction: IouDirection;
  amount: number;
  payments: IouPayment[];
  dueDate?: string;
  repeat: IouRepeat;
  note?: string;
  createdAt: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const iouPaid = (i: Iou) => round2(i.payments.reduce((s, p) => s + p.amount, 0));
export const iouLeft = (i: Iou) => Math.max(0, round2(i.amount - iouPaid(i)));
export const iouDone = (i: Iou) => iouLeft(i) <= 0;
export const iouOverdue = (i: Iou, todayKey: string) => !iouDone(i) && !!i.dueDate && i.dueDate < todayKey;

export function iouTotals(ious: Iou[]): { owe: number; owed: number } {
  let owe = 0;
  let owed = 0;
  for (const i of ious) {
    if (iouDone(i)) continue;
    if (i.direction === 'owe') owe += iouLeft(i);
    else owed += iouLeft(i);
  }
  return { owe: round2(owe), owed: round2(owed) };
}

export type IouNudge = { date: string; kind: 'before' | 'due' | 'again' };

/**
 * The days to remind about one open IOU, from today up to `horizonDays` ahead.
 *  - `before`: `daysBefore` days ahead of the due date (skipped when that is 0)
 *  - `due`: the due date itself
 *  - `again`: repeating after the due date (or, without a due date, from the day it was added), weekly or monthly
 */
export function iouNudges(iou: Iou, todayKey: string, daysBefore: number, horizonDays: number): IouNudge[] {
  if (iouDone(iou)) return [];
  const last = addDays(todayKey, horizonDays);
  const out: IouNudge[] = [];
  const due = iou.dueDate;
  if (due) {
    if (daysBefore > 0) {
      const d = addDays(due, -daysBefore);
      if (d >= todayKey && d <= last) out.push({ date: d, kind: 'before' });
    }
    if (due >= todayKey && due <= last) out.push({ date: due, kind: 'due' });
  }
  if (iou.repeat !== 'none') {
    const anchor = due ?? iou.createdAt;
    for (let k = 1; k <= 120; k++) {
      const d = iou.repeat === 'weekly' ? addDays(anchor, 7 * k) : addMonths(anchor, k);
      if (d > last) break;
      if (d >= todayKey) out.push({ date: d, kind: 'again' });
    }
  }
  return out;
}
