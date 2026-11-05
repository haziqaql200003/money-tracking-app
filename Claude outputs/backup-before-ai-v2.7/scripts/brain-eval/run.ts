/* Runs every case in cases.ts through the real brain with fixture data and prints what passed. */
import { en } from '@/i18n/en';
import { ms } from '@/i18n/ms';
import { EMPTY_MEMORY, think, type Memory } from '@/services/ai/brain';
import { validateVisuals } from '@/services/ai/brain/types';

import { CASES, type Expect } from './cases';
import { makeData } from './fixture';

declare const process: { argv: string[]; exit(code: number): never };

const dict = { en, ms } as const;
const verbose = process.argv.includes('--show');
let pass = 0;
let fail = 0;
const times: number[] = [];

for (const c of CASES) {
  const data = makeData({ empty: c.empty, bigSpend: c.bigSpend, souqa: c.souqa });
  const t = (k: string, p?: Record<string, string | number>) =>
    String((dict[c.lang] as Record<string, string>)[k] ?? k).replace(/\{(\w+)\}/g, (m, n: string) => (p && n in p ? String(p[n]) : m));
  let memory: Memory = EMPTY_MEMORY;
  for (const step of c.steps) {
    const t0 = Date.now();
    const r = think({ text: step.say, data, t: t as never, memory });
    times.push(Date.now() - t0);
    memory = r.memory;
    const e: Expect = step.expect;
    const problems: string[] = [];
    const handled = r.handled;
    if (e.handled !== undefined && e.handled !== handled) problems.push(`handled=${handled}`);
    if (e.handled !== false && !handled) problems.push(`not handled (${r.intent} ${r.p.toFixed(2)} ${r.reason})`);
    if (handled) {
      if (e.intent && r.intent !== e.intent) problems.push(`intent ${r.intent}`);
      const kinds = r.visuals.map((v) => v.kind);
      for (const k of e.visuals ?? []) if (!kinds.includes(k as never)) problems.push(`no ${k} chart (got ${kinds.join(',') || 'none'})`);
      if (validateVisuals(r.visuals).length !== r.visuals.length) problems.push('invalid chart data');
      for (const h of e.has ?? []) if (!(typeof h === 'string' ? `${r.text}\n${r.actions.map((a) => a.summary.map((x) => `${x.label} ${x.value}`).join('\n')).join('\n')}`.toLowerCase().includes(h.toLowerCase()) : h.test(r.text))) problems.push(`missing "${String(h)}"`);
      for (const h of e.not ?? []) if (typeof h === 'string' ? r.text.includes(h) : h.test(r.text)) problems.push(`should not say "${String(h)}"`);
      if (e.proposals !== undefined && r.proposals.length !== e.proposals) problems.push(`${r.proposals.length} cards`);
      if (e.chips && r.chips.length === 0) problems.push('no follow-up buttons');
      if (/set up|sediakan/.test(e.has?.join(' ') ?? '') && r.actions.length !== 1) problems.push(`${r.actions.length} set-up cards`);
      if (/\{\w+\}|NaN|undefined|Infinity/.test(r.text)) problems.push('broken text');
    }
    const ok = problems.length === 0;
    if (ok) pass++;
    else fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  [${c.lang}] ${c.name}: "${step.say}"${ok ? '' : `  -> ${problems.join('; ')}`}`);
    if (verbose || !ok) {
      if (handled) console.log(`      ${r.text.split('\n').join('\n      ')}\n      charts: ${r.visuals.map((v) => v.kind).join(', ') || '-'} | buttons: ${r.chips.join(' / ') || '-'}${r.actions.map((a) => `\n      SET-UP ${a.kind}: ${a.summary.map((x) => `${x.label}=${x.value}`).join('; ')}`).join('')}`);
    }
  }
}
times.sort((a, b) => a - b);
console.log(`\n${pass} passed, ${fail} failed. Time per message: median ${times[Math.floor(times.length / 2)].toFixed(1)} ms, slowest ${times[times.length - 1].toFixed(1)} ms (this computer).`);
process.exit(fail ? 1 : 0);
