// AI providers for wakira-ai. The app speaks one format (Gemini-shaped "contents" with functionCall / functionResponse);
// each provider below translates it to its own API and translates the answer back.
//
// A provider is used only when its API key secret is set. The order comes from the AI_PROVIDERS secret
// (default: gemini,mistral,groq,cerebras,openrouter,openai,anthropic). If one is busy, out of quota or broken,
// the next one answers.
//
// Secrets (set the ones you want):
//   GEMINI_API_KEY      AI_MODEL (default gemini-3.8-flash)
//   MISTRAL_API_KEY     MISTRAL_MODEL    (default mistral-small-latest)
//   GROQ_API_KEY        GROQ_MODEL       (default llama-3.3-70b-versatile)
//   CEREBRAS_API_KEY    CEREBRAS_MODEL   (default llama-3.3-70b)
//   OPENROUTER_API_KEY  OPENROUTER_MODEL (default meta-llama/llama-3.3-70b-instruct:free)
//   OPENAI_API_KEY      OPENAI_MODEL     (default gpt-4o-mini)
//   ANTHROPIC_API_KEY   ANTHROPIC_MODEL  (default claude-haiku-5-5)
//   AI_COMPAT_URL + AI_COMPAT_KEY + AI_COMPAT_MODEL   any other OpenAI-compatible service
// Model names change often: if a provider answers "bad_model" in the logs, set its *_MODEL secret to a current name.

// deno-lint-ignore-file no-explicit-any
export type Part = Record<string, any>;
export type Content = { role: 'user' | 'model'; parts: Part[] };
export type Tool = { name: string; description: string; parameters?: any };

export type Req = {
  system: string;
  contents: Content[];
  tools: Tool[];
  /** Kinds of attached file in this request (only the latest user turn carries one). */
  files: Set<'image' | 'pdf'>;
  /** Epoch ms after which no new provider call may start. */
  deadline: number;
};
export type Fail = 'bad_key' | 'quota' | 'busy' | 'bad_model' | 'upstream';
export type Result = { ok: true; parts: Part[]; finishReason?: string } | { ok: false; fail: Fail };
export type Provider = { name: string; images: boolean; pdf: boolean; call(req: Req): Promise<Result> };

const PER_CALL_MS = 25_000;
const timeoutFor = (req: Req) => AbortSignal.timeout(Math.max(1500, Math.min(PER_CALL_MS, req.deadline - Date.now())));

function failFromStatus(status: number): Fail {
  if (status === 401 || status === 403) return 'bad_key';
  if (status === 404) return 'bad_model';
  if (status === 429) return 'quota';
  if (status >= 500) return 'busy';
  return 'upstream';
}

/* ---------------- shared: read the Gemini-shaped history ---------------- */

type NCall = { id: string; name: string; args: any };
type NResult = { id: string; name: string; response: any };
type NTurn = { role: 'user' | 'model'; text: string; files: { mime: string; data: string }[]; calls: NCall[]; results: NResult[] };

const safeId = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 60);

/** One flat, provider-neutral shape. Tool calls get ids, and each tool answer is matched to its call. */
function normalize(contents: Content[]): NTurn[] {
  const turns: NTurn[] = [];
  let open: NCall[] = [];
  let n = 0;
  for (const c of contents) {
    const turn: NTurn = { role: c.role, text: '', files: [], calls: [], results: [] };
    for (const p of c.parts) {
      if (typeof p.text === 'string' && p.text) turn.text += (turn.text ? '\n' : '') + p.text;
      if (p.inlineData?.data) turn.files.push({ mime: p.inlineData.mimeType, data: p.inlineData.data });
      if (p.functionCall) {
        const call = { id: safeId(String(p.functionCall.id ?? '')) || `call_${n}`, name: String(p.functionCall.name), args: p.functionCall.args ?? {} };
        n++;
        turn.calls.push(call);
      }
      if (p.functionResponse) {
        const i = open.findIndex((x) => x.name === p.functionResponse.name);
        const call = i >= 0 ? open.splice(i, 1)[0] : open.shift();
        if (call) turn.results.push({ id: call.id, name: call.name, response: p.functionResponse.response ?? {} });
      }
    }
    if (c.role === 'model') open = [...turn.calls];
    turns.push(turn);
  }
  return turns;
}

/** Gemini writes types in capitals ("OBJECT"); everyone else wants JSON Schema ("object"). */
function jsonSchema(v: any): any {
  if (Array.isArray(v)) return v.map(jsonSchema);
  if (v && typeof v === 'object') {
    const out: any = {};
    for (const [k, x] of Object.entries(v)) out[k] = k === 'type' && typeof x === 'string' ? x.toLowerCase() : jsonSchema(x);
    return out;
  }
  return v;
}
const schemaOf = (t: Tool) => (t.parameters ? jsonSchema(t.parameters) : { type: 'object', properties: {} });

/* ---------------- Gemini ---------------- */

function gemini(env: (k: string) => string | undefined): Provider | null {
  const key = env('GEMINI_API_KEY');
  if (!key) return null;
  // The pengguna can switch model with: supabase secrets set AI_MODEL=<current model name from Google AI Studio>
  const models = [...new Set([env('AI_MODEL') || 'gemini-3.8-flash', 'gemini-flash-latest'])];
  return {
    name: 'gemini',
    images: true,
    pdf: true,
    async call(req) {
      // Gemini 3 wants a thought signature on tool calls. Calls made by another provider have none: use the documented dummy.
      const contents = req.contents.map((c) => {
        if (c.role !== 'model') return c;
        const hasCall = c.parts.some((p) => p.functionCall);
        const hasSig = c.parts.some((p) => p.thoughtSignature);
        if (!hasCall || hasSig) return c;
        let done = false;
        return { ...c, parts: c.parts.map((p) => (p.functionCall && !done ? ((done = true), { ...p, thoughtSignature: 'skip_thought_signature_validator' }) : p)) };
      });
      const body = JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents,
        tools: [{ functionDeclarations: req.tools }],
        generationConfig: { temperature: 0.3 },
      });
      let fail: Fail = 'upstream';
      for (const model of models) {
        for (let attempt = 0; attempt < 2; attempt++) {
          if (Date.now() > req.deadline) return { ok: false, fail: 'busy' };
          let res: Response;
          try {
            res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
              method: 'POST',
              headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
              body,
              signal: timeoutFor(req),
            });
          } catch (e) {
            console.error('[ai] gemini fetch failed', model, String(e));
            fail = 'busy';
            continue;
          }
          if (!res.ok) {
            const detail = (await res.text()).slice(0, 400);
            console.error('[ai] gemini', model, res.status, detail);
            fail = res.status === 400 && /API_KEY|api key/i.test(detail) ? 'bad_key' : failFromStatus(res.status);
            if (fail === 'bad_key' || fail === 'quota') return { ok: false, fail };
            if (fail === 'bad_model') break; // try the next model name
            if (fail === 'busy') continue; // try again once
            return { ok: false, fail };
          }
          const out = await res.json();
          const cand = out?.candidates?.[0];
          // "thought" parts are not sent to the app; thoughtSignature on a functionCall is kept (needed by Gemini 3+).
          const parts = ((cand?.content?.parts ?? []) as Part[]).filter((p) => !p.thought);
          if (parts.length === 0) {
            console.error('[ai] gemini empty reply', model, cand?.finishReason);
            return { ok: true, parts: [{ text: '' }], finishReason: cand?.finishReason ?? 'EMPTY' };
          }
          return { ok: true, parts, finishReason: cand?.finishReason };
        }
      }
      return { ok: false, fail };
    },
  };
}

/* ---------------- OpenAI-compatible (Mistral, Groq, Cerebras, OpenRouter, OpenAI, others) ---------------- */

function openAiMessages(req: Req, vision: boolean) {
  const messages: any[] = [{ role: 'system', content: req.system }];
  for (const t of normalize(req.contents)) {
    if (t.role === 'user') {
      for (const r of t.results) messages.push({ role: 'tool', tool_call_id: r.id, content: JSON.stringify(r.response).slice(0, 30_000) });
      const imgs = vision ? t.files.filter((f) => f.mime.startsWith('image/')) : [];
      if (imgs.length) {
        const content: any[] = imgs.map((f) => ({ type: 'image_url', image_url: { url: `data:${f.mime};base64,${f.data}` } }));
        if (t.text) content.unshift({ type: 'text', text: t.text });
        messages.push({ role: 'user', content });
      } else if (t.text) messages.push({ role: 'user', content: t.text });
    } else {
      const m: any = { role: 'assistant', content: t.text || null };
      if (t.calls.length) m.tool_calls = t.calls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.args) } }));
      if (m.content || m.tool_calls) messages.push(m);
    }
  }
  return messages;
}

function openAiCompat(cfg: { name: string; url: string; key?: string; model: string; images: boolean }): Provider | null {
  if (!cfg.key) return null;
  return {
    name: cfg.name,
    images: cfg.images,
    pdf: false,
    async call(req) {
      const body = JSON.stringify({
        model: cfg.model,
        messages: openAiMessages(req, cfg.images),
        tools: req.tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: schemaOf(t) } })),
        tool_choice: 'auto',
        temperature: 0.3,
        max_tokens: 1200,
      });
      for (let attempt = 0; attempt < 2; attempt++) {
        if (Date.now() > req.deadline) return { ok: false, fail: 'busy' };
        let res: Response;
        try {
          res = await fetch(cfg.url, { method: 'POST', headers: { authorization: `Bearer ${cfg.key}`, 'content-type': 'application/json' }, body, signal: timeoutFor(req) });
        } catch (e) {
          console.error(`[ai] ${cfg.name} fetch failed`, String(e));
          return { ok: false, fail: 'busy' };
        }
        if (!res.ok) {
          const detail = (await res.text()).slice(0, 400);
          console.error(`[ai] ${cfg.name}`, cfg.model, res.status, detail);
          const fail = failFromStatus(res.status);
          if (fail === 'busy' && attempt === 0) continue;
          return { ok: false, fail };
        }
        const out = await res.json();
        const choice = out?.choices?.[0];
        const msg = choice?.message;
        if (!msg) return { ok: false, fail: 'upstream' };
        const parts: Part[] = [];
        if (typeof msg.content === 'string' && msg.content.trim()) parts.push({ text: msg.content });
        for (const c of (msg.tool_calls ?? []) as any[]) {
          let args: any = {};
          try {
            args = c?.function?.arguments ? JSON.parse(c.function.arguments) : {};
          } catch {
            console.error(`[ai] ${cfg.name} bad tool arguments`);
            return { ok: false, fail: 'upstream' };
          }
          parts.push({ functionCall: { name: String(c?.function?.name ?? ''), args, id: String(c?.id ?? '') } });
        }
        return { ok: true, parts: parts.length ? parts : [{ text: '' }], finishReason: choice?.finish_reason };
      }
      return { ok: false, fail: 'busy' };
    },
  };
}

/* ---------------- Anthropic (Claude) ---------------- */

function anthropic(env: (k: string) => string | undefined): Provider | null {
  const key = env('ANTHROPIC_API_KEY');
  if (!key) return null;
  const model = env('ANTHROPIC_MODEL') || 'claude-haiku-5-5';
  return {
    name: 'anthropic',
    images: true,
    pdf: true,
    async call(req) {
      const messages: { role: 'user' | 'assistant'; content: any[] }[] = [];
      const push = (role: 'user' | 'assistant', blocks: any[]) => {
        if (!blocks.length) return;
        const last = messages[messages.length - 1];
        if (last && last.role === role) last.content.push(...blocks); // the API wants strictly alternating roles
        else messages.push({ role, content: blocks });
      };
      for (const t of normalize(req.contents)) {
        if (t.role === 'user') {
          const blocks: any[] = t.results.map((r) => ({ type: 'tool_result', tool_use_id: r.id, content: JSON.stringify(r.response).slice(0, 30_000) }));
          for (const f of t.files) {
            blocks.push(f.mime === 'application/pdf' ? { type: 'document', source: { type: 'base64', media_type: f.mime, data: f.data } } : { type: 'image', source: { type: 'base64', media_type: f.mime, data: f.data } });
          }
          if (t.text) blocks.push({ type: 'text', text: t.text });
          push('user', blocks);
        } else {
          const blocks: any[] = [];
          if (t.text) blocks.push({ type: 'text', text: t.text });
          for (const c of t.calls) blocks.push({ type: 'tool_use', id: c.id, name: c.name, input: c.args });
          push('assistant', blocks);
        }
      }
      const body = JSON.stringify({
        model,
        max_tokens: 1200,
        temperature: 0.3,
        system: req.system,
        messages,
        tools: req.tools.map((t) => ({ name: t.name, description: t.description, input_schema: schemaOf(t) })),
      });
      for (let attempt = 0; attempt < 2; attempt++) {
        if (Date.now() > req.deadline) return { ok: false, fail: 'busy' };
        let res: Response;
        try {
          res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
            body,
            signal: timeoutFor(req),
          });
        } catch (e) {
          console.error('[ai] anthropic fetch failed', String(e));
          return { ok: false, fail: 'busy' };
        }
        if (!res.ok) {
          const detail = (await res.text()).slice(0, 400);
          console.error('[ai] anthropic', model, res.status, detail);
          const fail = res.status === 529 ? 'busy' : failFromStatus(res.status);
          if (fail === 'busy' && attempt === 0) continue;
          return { ok: false, fail };
        }
        const out = await res.json();
        const parts: Part[] = [];
        for (const b of (out?.content ?? []) as any[]) {
          if (b.type === 'text' && b.text) parts.push({ text: b.text });
          else if (b.type === 'tool_use') parts.push({ functionCall: { name: String(b.name), args: b.input ?? {}, id: String(b.id ?? '') } });
        }
        return { ok: true, parts: parts.length ? parts : [{ text: '' }], finishReason: out?.stop_reason };
      }
      return { ok: false, fail: 'busy' };
    },
  };
}

/* ---------------- the chain ---------------- */

export function buildProviders(env: (k: string) => string | undefined): Provider[] {
  const all: Record<string, Provider | null> = {
    gemini: gemini(env),
    mistral: openAiCompat({ name: 'mistral', url: 'https://api.mistral.ai/v1/chat/completions', key: env('MISTRAL_API_KEY'), model: env('MISTRAL_MODEL') || 'mistral-small-latest', images: true }),
    groq: openAiCompat({ name: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions', key: env('GROQ_API_KEY'), model: env('GROQ_MODEL') || 'llama-3.3-70b-versatile', images: false }),
    cerebras: openAiCompat({ name: 'cerebras', url: 'https://api.cerebras.ai/v1/chat/completions', key: env('CEREBRAS_API_KEY'), model: env('CEREBRAS_MODEL') || 'llama-3.3-70b', images: false }),
    openrouter: openAiCompat({ name: 'openrouter', url: 'https://openrouter.ai/api/v1/chat/completions', key: env('OPENROUTER_API_KEY'), model: env('OPENROUTER_MODEL') || 'meta-llama/llama-3.3-70b-instruct:free', images: false }),
    openai: openAiCompat({ name: 'openai', url: 'https://api.openai.com/v1/chat/completions', key: env('OPENAI_API_KEY'), model: env('OPENAI_MODEL') || 'gpt-4o-mini', images: true }),
    anthropic: anthropic(env),
    compat: openAiCompat({ name: 'compat', url: env('AI_COMPAT_URL') || '', key: env('AI_COMPAT_URL') ? env('AI_COMPAT_KEY') : undefined, model: env('AI_COMPAT_MODEL') || '', images: env('AI_COMPAT_VISION') === '1' }),
  };
  const order = (env('AI_PROVIDERS') || 'gemini,mistral,groq,cerebras,openrouter,openai,anthropic,compat').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return [...new Set(order)].map((n) => all[n]).filter((p): p is Provider => !!p);
}

/** Can this provider read what is attached? (Providers that cannot are skipped, not failed.) */
export const canRead = (p: Provider, files: Set<'image' | 'pdf'>) => (!files.has('image') || p.images) && (!files.has('pdf') || p.pdf);

/**
 * Try the providers in order until one answers. If none can, say why:
 * `busy` (every provider is busy or out of quota) or `bad_key` (nothing usable is set up).
 */
export async function askProviders(providers: Provider[], req: Req): Promise<{ ok: true; parts: Part[]; finishReason?: string; provider: string } | { ok: false; error: 'busy' | 'bad_key' | 'cannot_read' | 'not_configured' }> {
  if (providers.length === 0) return { ok: false, error: 'not_configured' };
  const usable = providers.filter((p) => canRead(p, req.files));
  if (usable.length === 0) return { ok: false, error: 'cannot_read' };
  let sawBusy = false;
  for (const p of usable) {
    if (Date.now() > req.deadline) break;
    const r = await p.call(req);
    if (r.ok) return { ...r, provider: p.name };
    console.error('[ai] provider failed:', p.name, r.fail);
    if (r.fail !== 'bad_key') sawBusy = true; // a wrong key is a setup problem; anything else means "try again later"
  }
  return { ok: false, error: sawBusy ? 'busy' : 'bad_key' };
}

// Exported for tests.
export const _internal = { normalize, openAiMessages, jsonSchema };
