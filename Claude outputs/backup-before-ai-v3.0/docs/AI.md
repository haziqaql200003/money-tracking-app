# Ask WaKira: the AI assistant

The chat answers questions about the pengguna's money, records spending, and explains things simply. **It runs on the phone with no AI service.**
The only exception is photos / PDFs and the few questions it does not know. Those go to the optional AI server (Layer 2), and only when the pengguna is signed in.

Stack this was built and tested against (from `package.json`): WaKira 3.5.0, Expo SDK 58.0.21, React 19.3.0, React Native 0.88.1, Expo Router 58.0.28, TypeScript 6.0.3, React Compiler on (`app.json` `experiments.reactCompiler: true`). **No dependency was added or changed.**

---

## 1. Audit (October 2026, before this round)

What the code actually was, from the source, not from `package.json`:

| Question | Answer from the code |
| --- | --- |
| Local AI model | **No LLM.** A logistic-regression router (`brain/intent-model.json`, about 12k features, 15 intents) and a Naive Bayes category model (`brain/category-model.json`), both trained by `ml/train.py`. |
| Inference runtime | Plain TypeScript (`brain/intent.ts`, `brain/cold-category.ts`): add up weights, softmax. No native module, works in Expo Go. |
| Model loading | `import ... from './intent-model.json'` (Metro bundles it; about 1.3 MB + 0.6 MB). |
| System prompt | None on the phone. The server AI (`supabase/functions/wakira-ai/index.ts`, `PROMPT`) had one, but it is only used for fallback. |
| Financial data | `src/hooks/use-ai-data.ts` gathers records from the app contexts; `src/services/ai/engine.ts` computes everything (breakdown, search, compare, habits, forecast, budgets, proposals). |
| Response generation | Fixed templates (`brain/reply.ts`) that printed the tool's numbers. |
| Visualisations | **None.** Text only. |
| Conversation context | Only a `pending` slot ("How much was it?"). No memory of the last topic. |
| Tests | Python accuracy report and a feature parity check only. No end-to-end conversation tests. |

### Root causes of the three problems the developer found

1. **"Talks like a computer."** The templates printed numbers with no meaning: "You spent RM308.00 this month (28 records). • Food: RM198.00 (64.3%)". There was no plain-language line, no "so what", and no way to ask it again more simply.
2. **"Compare / explain gives only text."** Nothing in the brain or the chat screen could describe or draw a chart, even though the app already had `Donut` and `LineChart`.
3. **"Mcm mana saya nak boost saving saya" got the help list.** There was no advice intent. Saving phrases sat inside `habits`, and "macam mana nak ..." matched `help`. Even with the right intent, nothing could build a saving plan.

Other limits found: no follow-ups ("kenapa?", "bulan lepas pula?"); no trend, cash-flow, two-month, what-if or affordability answers; and long answers with no next step.

### Which kind of fix each problem needed

| Problem | Fixed by |
| --- | --- |
| Wrong intent for advice / explain | Retraining the router (new intents and data) |
| Robotic wording, no plain mode | Better templates (deterministic writing) |
| No saving plan, trend, what-if, affordability, cash flow | Deterministic analytics (new TypeScript) |
| No charts | UI rendering of a validated chart spec |
| No follow-ups | Conversation memory |
| Free-form chat about anything | A stronger model. **Not solved on the phone**; goes to the server AI when signed in. |

---

## 2. Architecture now

```
message
  -> 1. follow-up?        brain/index.ts: answer to a question it asked (pending), "bulan lepas pula?", "kenapa?"
  -> 2. deep question?    brain/analysis.ts rules: trend, cash flow, two named months, what-if %, can I afford RMx
  -> 3. router            brain/intent.ts (ml/train.py): 17 intents, confidence
  -> 4. details           brain/slots.ts: amount, date, account, period, category, merchant, min/max
  -> 5. analytics         engine.ts tools + advice.ts + analysis.ts   (all numbers come from here)
  -> 6. answer            reply.ts / advice.ts / analysis.ts -> { text, visuals[], chips[], proposals[] }
  -> 7. render            src/app/(app)/more/ai.tsx + src/components/ai/ai-visual.tsx (validated first)
not sure / not trained ->  server AI (if signed in) or "I'm not sure" (offline)
```

- **Allowlist of operations.** The brain can only call `runTool` names in `engine.ts` (get_overview, spending_breakdown, find_transactions, list_transfers, compare_periods, spending_habits, forecast, budget_status, propose_transactions, propose_transfer) plus the pure functions in `advice.ts` and `analysis.ts`. There is no eval, no generated code and no SQL.
- **Nothing is saved without a tap.** Records and transfers are proposals (cards with Save / Change / Skip / Undo).
- **Memory** (`brain/types.ts` `Memory`): `pending` (a half-finished record) and `last` (the topic: intent, period, category, months). It is saved with the chat on the phone (`u:<id>:ai:chat`, or `ai:chat:local` when not signed in).

### Response schema (`brain/types.ts`)

```ts
type BrainAnswer = {
  handled: true;
  text: string;               // plain sentence first, then key numbers
  visuals: Visual[];          // 0-4 chart specs (data only)
  chips: string[];            // follow-up questions; every one is understood by the brain itself
  proposals: Proposal[];      // records / transfers waiting for Save
  checked: boolean;           // numbers came from the pengguna's records
  memory: Memory;
  intent: Intent; p: number;  // what the router decided, with confidence
};
type Visual =
  | { kind: 'donut';   title; center; centerSub?; parts: { label; value; color }[] }
  | { kind: 'bars';    title; rows: { label; value; color?; note? }[] }
  | { kind: 'compare'; title; aLabel; bLabel; rows: { label; a; b }[] }
  | { kind: 'trend';   title; labels: string[]; series: { name; values: (number|null)[]; tone; dashed? }[]; splitAt? }
  | { kind: 'stats';   items: { label; value; tone? }[] }
  | { kind: 'meter';   title; rows: { label; used; limit; status }[] };
```

`validateVisuals()` runs before anything is drawn, including charts from an old saved chat. It drops:
- unknown kinds;
- NaN / Infinity, and negative values where they make no sense;
- empty or oversized data, and series whose length doesn't match the labels.

If a chart is dropped, the text still shows.

### Which chart for which question

| Question | Charts |
| --- | --- |
| Where did my money go | donut (categories) or bars (inside one category) |
| Compare with last month | stats (this / last / change) + compare bars per category |
| Two named months | compare bars |
| Trend for N months | line (spending, and income) |
| Am I spending more than I earn | stats + line (income vs spending) |
| Forecast | line: past months solid, coming months dashed |
| Budgets | meter (green / amber / red) |
| Saving advice | stats (income, spending, saving rate) + bars (saving per idea) |
| What if I cut X by N% | stats (per month / per year) + compare (now vs after) |
| Can I afford RMx | stats (price, free money, kept per month) |
| Balances, habits, transfers | bars |

---

## 3. Capability matrix

| Capability | Status | How |
| --- | --- | --- |
| Record expense / income, several items in one message, ask for a missing amount | Works offline | router + slots + proposals |
| Transfer between accounts, ask for a missing account | Works offline | slots `transferDirection` |
| Where did money go (period, category, merchant, account) | Works offline, donut | spending_breakdown |
| Compare with last month, "kenapa?" (drivers) | Works offline, charts | compare_periods |
| Compare two named months ("September vs October") | Works offline | analysis.ts |
| Trend for 2-12 months | Works offline, line | analysis.ts |
| Spending more than earning (cash flow) | Works offline | analysis.ts |
| Budgets, per-day amount left | Works offline, meter | budget_status |
| Forecast, bills in 30 days, savings runway | Works offline, line | forecast |
| Saving plan with ringgit per idea | Works offline | advice.ts |
| What-if "cut food by 20%" | Works offline | analysis.ts |
| Can I afford RMx | Works offline | analysis.ts |
| Explain simply / why, period and category follow-ups | Works offline | memory + simple / why modes |
| Find records (words, more than / less than RMx, biggest) | Works offline | find_transactions |
| Questions outside these topics, free chat | **Not on the phone** | server AI when signed in; offline: "I'm not sure" |
| Read photos / PDFs | **Not on the phone** | server AI (Gemini / Claude) |
| Custom ranges: "past 14 days", "2 minggu lepas"; narrow / correct the last search ("only past 14 days", "sorry, not weeks but days") | Works offline | slots `findRange`, memory `find` |
| "Save RM100 this month": gap, per-day cuts, what to avoid, spending path chart | Works offline | analysis.ts `saveTargetSay` |
| Set up an instalment / BNPL plan (asks for months if missing) | Works offline, card -> Hutang | actions.ts -> `createInstalment` |
| IOU between people ("Ali hutang saya RM50", "I owe Siti 30") | Works offline, card -> Hutang | actions.ts -> `addIou` |
| Set a category budget ("set bajet makan RM600") | Works offline, card, Undo | actions.ts -> `updateCategory` |
| Savings goal ("simpan RM5000 untuk kahwin sebelum Dis 2027") | Works offline, card, Undo | actions.ts -> `addGoal` |
| Recurring bill / income ("bayar Unifi RM129 setiap bulan") | Works offline, card, Undo | actions.ts -> `addRecurring` |
| Debt questions ("berapa hutang saya") | Works offline, bars | analysis.ts `debtsSay` |
| Paying an instalment, editing a debt, assets, tax relief | Not yet | open those screens |

---

## 4. Should WaKira add an on-device LLM?

Not now. Here is the assessment.

- **What it would take.** Libraries such as `react-native-executorch` or `llama.rn` are native modules. They need a development build (not Expo Go), the New Architecture, and recent OS versions; react-native-executorch lists iOS 17 / Android 13.
  - They must be verified against React Native 0.88 / Expo SDK 58 before use. This was not done in this round.
  - A useful model (1-3B parameters, 4-bit) is roughly a 0.7-2 GB download and needs 1-3 GB of RAM while running. It writes perhaps 5-20 words a second on mid-range phones. Small models are weak in Malay, and their tool-calling / JSON output is unreliable.
- **What it would add.** Freer wording, and understanding of phrasings outside the 17 intents.
- **What it would risk.** App size, crashes from running out of memory on older phones, slow first answers, and wrong numbers if it is ever allowed to write figures.
- **Recommended path if wanted later.** Keep everything above as is. Use a small LLM only to (a) pick the intent and slots when the router is unsure, emitting one JSON action from the allowlist (validated like `validateVisuals`), and (b) rephrase the already-computed text. Never let it produce numbers. Ship it as an optional download behind a setting.

---

## 5. Tests and results

```
node scripts/brain-eval.mjs           # 45 conversation steps, fake 7-month records (scripts/brain-eval/fixture.ts)
node scripts/brain-eval.mjs --show    # same, printing every answer
node scripts/brain-check.mjs          # TypeScript model == Python model
python ml/train.py                    # retrain + accuracy report
```

Results on 30 Oct 2026:
- **Conversation tests:** 64 / 64 passed (after the 30 Oct evening round, including the developer's own messages). They cover simple questions, categories, monthly comparison, budgets, trends, saving advice, scenarios, affordability, missing data, out-of-scope questions, Malay and English, follow-ups and every follow-up button.
  - Time per message: median 1-2 ms, slowest about 35 ms (on a laptop CPU; phones are slower, but these are small loops).
- **Router:** 94.5% on 146 hand-written messages, 78.8% on unseen synthetic sentence shapes (both measured before the final training).
- **Parity check:** TypeScript and Python agree.
- **Type check, lint, i18n audit:** `npx tsc --noEmit` clean, eslint clean, i18n audit clean.
- **Charts:** drawn in a browser (react-native-web) with the real `AiVisual`, `Donut` and `LineChart` components and checked by eye. Not yet checked on a real phone.

Acceptance criteria used:
- every number in an answer equals the engine's figure;
- no `{placeholders}`, NaN or `undefined` in the text;
- every chart passes `validateVisuals`;
- every follow-up button is understood by the brain;
- out-of-scope questions are handed off, never guessed.

---

## 6. Limitations (honest)

- The router is not a language model. It knows 17 intents and was trained on generated sentences, so real messages will score lower than the test numbers. Add misses to `ml/eval_cases.py`, then retrain.
- Rule-spotted questions (trend, what-if, afford, two months) need their key words. For example, what-if needs a percent ("20%" or "separuh"), and afford needs a price.
- Money is rounded to sen at each step (`round2` in engine.ts and utils), not integer-cent arithmetic end to end. This is fine for display and estimates, but the engine was not rewritten to integer cents in this round.
- Forecasts and saving ideas are estimates from past months. The wording says so.
- Category names come from the pengguna's categories. Month names follow the app language.
- Not built from the spec yet: streaming text (answers are instant, so not needed offline), copy / regenerate buttons, debt and goal projections.

## 7. Layer 2 (optional server AI)

`supabase/functions/wakira-ai/` is only used for photos / PDFs and unknown questions when signed in. It has a provider chain (Gemini, Mistral, Groq, ..., Claude), limits (`AI_MONTHLY_LIMIT`) and consent on first use. See `providers.ts` for secrets. The prompt now asks for the same plain, friendly style.

## Files

| File | What |
| --- | --- |
| `src/services/ai/brain/index.ts` | think(): follow-ups, rules, router, answers |
| `src/services/ai/brain/types.ts` | Answer / Visual / Memory types, `validateVisuals` |
| `src/services/ai/brain/reply.ts` | Plain-language answers + charts for each topic |
| `src/services/ai/brain/advice.ts` | Saving plan |
| `src/services/ai/brain/analysis.ts` | Trend, cash flow, two months, what-if, afford |
| `src/services/ai/brain/slots.ts` | Amount, date, account, period, category rules |
| `src/services/ai/brain/intent.ts`, `featurize.ts`, `cold-category.ts` | Model inference |
| `src/components/ai/ai-visual.tsx` | Draws the chart specs with the app's chart components |
| `src/app/(app)/more/ai.tsx` | Chat screen (charts, follow-up buttons, memory) |
| `ml/` | Training data and training script |
| `scripts/brain-eval*`, `scripts/brain-check.mjs` | Tests |
