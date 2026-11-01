# Tanya WaKira (AI assistant), 3.6.0

The assistant combines the Insight tab with a chat. The pengguna can ask where their money went, ask about transfers, habits, budgets and forecasts, record income, expenses and transfers in plain words, and send a receipt or a bank / e-wallet statement (photo or PDF).

## How it works (privacy first)

```
Phone (WaKira app)                              Server (Supabase Edge Function)       Google Gemini
-------------------                             -------------------------------       -------------
message + names of accounts/categories  ----->  wakira-ai: adds system prompt   ----->  decides which
                                                and tool list, checks login,           tool it needs
                                                daily limit
engine.ts works the answer out from     <-----  tool call (e.g. forecast)       <-----
the local records (no AI maths)
small answer (totals, matching rows)    ----->  passes it on                    ----->  writes reply
reply + cards (Save / Change / Skip)    <-----                                  <-----
```

- Records stay on the phone. Gemini only gets what a tool returns for that question.
- Every number comes from `src/services/ai/engine.ts`, never from the AI's own arithmetic.
- Nothing is saved until the pengguna taps **Save** on a card (and there is Undo).
- The conversation is kept on the phone only (AsyncStorage, `u:<id>:ai:chat`). Photos and PDFs are sent once and never kept.
- The server keeps one usage line per message in `ai_usage` (who, when, had a file). No content.

## WaKira's own model (on the phone)

`src/services/ai/category-model.ts` learns from the pengguna's own records which category a title belongs to (exact titles first, then Naive Bayes over the words). When the AI suggests a category but the pengguna's habit is clear (60%+ and 2+ past records), the habit wins and the card says "Category taken from your past records". It retrains whenever the records change, costs nothing and sends nothing.

## Files

| File | What it does |
| --- | --- |
| `supabase/functions/wakira-ai/index.ts` | Edge Function: prompt, tool list, Gemini call, daily limit |
| `supabase/007_ai_usage.sql` | Usage log table for the daily limit |
| `src/services/ai/engine.ts` | The tools (overview, breakdown, search, transfers, compare, habits, forecast, budgets, proposals) |
| `src/services/ai/category-model.ts` | On-device category model |
| `src/services/ai/client.ts` | Tool loop between the phone and the Edge Function |
| `src/hooks/use-ai-data.ts` | Gathers the app data the tools use |
| `src/app/(app)/more/ai.tsx` | Chat screen |
| `src/components/ai/proposal-card.tsx` | Save / Change / Skip card |
| `src/components/ai/ask-card.tsx` | Entry card at the top of Analyse > Insight |
| `src/i18n/en/ai.ts`, `src/i18n/ms/ai.ts` | Wording |

Tool names and arguments must stay the same in `engine.ts` (`runTool`) and in the `TOOLS` list of the Edge Function.

## Setup (once)

1. Supabase > SQL Editor > run `supabase/007_ai_usage.sql`.
2. Deploy the function (same Gemini key as receipt scanning):
   ```
   npx supabase functions deploy wakira-ai
   ```
3. Optional secrets:
   ```
   npx supabase secrets set AI_DAILY_LIMIT=30
   npx supabase secrets set AI_MODEL=gemini-3.8-flash
   ```
   If Google renames the model, the function falls back to `gemini-flash-latest` automatically.
4. Errors show in Supabase > Edge Functions > wakira-ai > Logs (lines start with `[ai]`).

## Free-tier notes

- One pengguna message usually takes 2 to 3 Gemini calls (ask for a tool, then answer). Only the first counts towards `AI_DAILY_LIMIT`.
- History sent to Gemini is cut to the last 8 pengguna turns, and files are replaced by a short note after the first send.
- Good next step for a Pro version: a higher `AI_DAILY_LIMIT` for Pro pengguna (read their plan in the function before checking the limit).
