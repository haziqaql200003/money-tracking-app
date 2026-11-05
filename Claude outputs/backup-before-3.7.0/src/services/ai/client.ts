/**
 * Talks to the `wakira-ai` Edge Function (an AI provider such as Gemini, keys kept on the server) and runs the tool loop on the phone.
 *
 * One pengguna message can take a few round trips: the AI asks for numbers (tool calls), the phone works them out
 * with engine.ts and sends back only the answers, and the AI then writes its reply. Nothing is stored on the server
 * except one usage line per message (for the daily limit).
 */
import { supabase } from '@/services/supabase';

import { aiContext, runTool, type AiData, type Proposal } from './engine';

export type Part = {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  functionCall?: { name: string; args?: Record<string, unknown>; id?: string };
  functionResponse?: { name: string; response: Record<string, unknown>; id?: string };
  thoughtSignature?: string;
  thought?: boolean;
};
export type Content = { role: 'user' | 'model'; parts: Part[] };

export type AiErrorCode = 'unavailable' | 'limit' | 'setup' | 'busy' | 'server' | 'cannotRead' | 'tooLarge' | 'network' | 'empty';

export class AiError extends Error {
  constructor(public code: AiErrorCode, public detail?: string) {
    super(code);
  }
}

const MAX_STEPS = 6;
/** One round trip to the AI server. Photos and PDFs take longer to read. */
const SERVER_TIMEOUT_MS = 30_000;
/** Real pengguna turns kept in the history sent to the AI (older ones are dropped to save the free quota). */
const KEEP_TURNS = 8;

const isRealUserTurn = (c: Content) => c.role === 'user' && c.parts.some((p) => typeof p.text === 'string' || p.inlineData);

/** Pictures and PDFs are sent once. Afterwards the history only says that one was read. */
export function withoutFiles(history: Content[]): Content[] {
  return history.map((c) =>
    c.parts.some((p) => p.inlineData)
      ? { ...c, parts: c.parts.map((p) => (p.inlineData ? { text: `[The pengguna attached a ${p.inlineData.mimeType === 'application/pdf' ? 'PDF' : 'picture'} here. It was already read.]` } : p)) }
      : c,
  );
}

/** The last few turns, always starting at a real pengguna message so a tool call is never cut from its answer. */
export function trimHistory(history: Content[]): Content[] {
  const starts = history.map((c, i) => (isRealUserTurn(c) ? i : -1)).filter((i) => i >= 0);
  if (starts.length <= KEEP_TURNS) return history;
  return history.slice(starts[starts.length - KEEP_TURNS]);
}

async function callServer(contents: Content[], context: unknown, turnStart: boolean): Promise<Content> {
  if (!supabase) throw new AiError('unavailable');
  // Never leave the pengguna waiting forever: a slow or broken server gives up after SERVER_TIMEOUT_MS.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AiError('server', 'timeout')), SERVER_TIMEOUT_MS);
  });
  const { data, error } = await Promise.race([supabase.functions.invoke('wakira-ai', { body: { contents, context, turnStart } }), timeout]).finally(() => clearTimeout(timer));
  if (error) {
    const ctx = (error as { context?: unknown }).context;
    const status = ctx instanceof Response ? ctx.status : (ctx as { status?: number } | undefined)?.status;
    let reason = '';
    try {
      if (ctx instanceof Response) reason = String(((await ctx.json()) as { error?: unknown })?.error ?? '');
    } catch {
      // not JSON
    }
    const detail = `${status ?? '-'}${reason ? ` ${reason}` : ''}`;
    if (!status) throw new AiError('network');
    if (status === 401) throw new AiError('unavailable', detail);
    if (status === 404) throw new AiError('setup', detail);
    if (status === 413) throw new AiError('tooLarge', detail);
    if (status === 429 && reason === 'limit') throw new AiError('limit', detail);
    if (reason === 'not_configured' || reason === 'bad_key' || reason === 'bad_model') throw new AiError('setup', detail);
    if (status === 422 && reason === 'cannot_read') throw new AiError('cannotRead', detail);
    if (reason === 'busy' || reason === 'quota' || reason === 'upstream') throw new AiError('busy', detail); // every provider was busy or out of free quota
    if (status >= 500) throw new AiError('server', detail); // includes 546: the function ran out of time or memory
    throw new AiError('busy', detail);
  }
  const content = (data as { content?: Content } | null)?.content;
  if (!content || !Array.isArray(content.parts)) throw new AiError('empty');
  return { role: 'model', parts: content.parts };
}

export type AskResult = {
  /** Everything to add to the history: the pengguna turn, tool calls and answers, and the final reply. */
  added: Content[];
  text: string;
  proposals: Proposal[];
  /** Tools the AI used, for the small "checked: ..." line under a reply. */
  toolsUsed: string[];
};

export async function askWakira(args: {
  history: Content[];
  text: string;
  file?: { data: string; mediaType: string } | null;
  data: AiData;
  lang: 'ms' | 'en';
}): Promise<AskResult> {
  const { data, lang } = args;
  const userParts: Part[] = [];
  if (args.file) userParts.push({ inlineData: { mimeType: args.file.mediaType, data: args.file.data } });
  userParts.push({ text: args.text.trim() || (lang === 'ms' ? 'Sila baca fail ini dan rekodkan transaksinya.' : 'Please read this file and record its transactions.') });

  const base = trimHistory(withoutFiles(args.history));
  const added: Content[] = [{ role: 'user', parts: userParts }];
  const proposals: Proposal[] = [];
  const toolsUsed: string[] = [];
  const context = aiContext(data, lang);

  for (let step = 0; step < MAX_STEPS; step++) {
    const reply = await callServer([...base, ...added], context, step === 0);
    added.push(reply);
    const calls = reply.parts.filter((p) => p.functionCall);
    if (calls.length === 0) {
      const text = reply.parts
        .filter((p) => typeof p.text === 'string' && !p.thought)
        .map((p) => p.text)
        .join('')
        .trim();
      return { added, text, proposals, toolsUsed };
    }
    // All answers go back together in one turn, in the same order as the calls.
    const responses: Part[] = calls.map((p) => {
      const call = p.functionCall!;
      toolsUsed.push(call.name);
      const res = runTool(call.name, call.args, data);
      if (res.proposals) proposals.push(...res.proposals);
      return { functionResponse: { name: call.name, response: res.response, ...(call.id ? { id: call.id } : {}) } };
    });
    added.push({ role: 'user', parts: responses });
  }
  // Ran out of steps: close the turn so the history stays valid, and show whatever was proposed.
  added.push({ role: 'model', parts: [{ text: '(stopped after too many steps)' }] }); // i18n-ignore: for the AI, not shown
  return { added, text: '', proposals, toolsUsed };
}
