# Ask WaKira (the AI assistant)

One chat that records, answers and explains. It works in two layers, so most things never leave the phone.

```
pengguna message
      |
      v
 1. WaKira's OWN brain (on the phone, src/services/ai/brain)       no server, no quota, works offline
      router (trained model) -> rules for amount / date / account -> engine.ts maths -> template reply
      |
      |-- understood (confident)  -> answer + cards (Save / Change / Skip / Undo)
      |
      '-- not sure, or a photo / PDF
              |
              v
 2. AI server (Supabase Edge Function wakira-ai)                    needs sign-in + internet, limited per month
      tries providers in order: Gemini -> Mistral -> Groq -> ... -> Claude   (first one that answers wins)
      the AI asks for numbers through "tools"; the phone works them out and sends back only the answer
```

## Layer 1: the own brain

| Part | File | How it is made |
| --- | --- | --- |
| Router: what does the pengguna want? (15 intents: expense, income, transfer, where, find, balance, forecast, habits, budget, compare, transfers_list, help, greet, thanks, other) | `src/services/ai/brain/intent-model.json` | Logistic regression trained by `ml/train.py` on words, word pairs and letter chunks (so "mkn", "tghari" still work). Runs in `brain/intent.ts`. |
| Details: amount, date, account, period, title, several items in one message | `brain/slots.ts` | Plain rules (regex). |
| Category for a new title | `brain/category-model.json` (cold start) + `category-model.ts` (the pengguna's own habits, wins when it has enough records) | Naive Bayes. |
| The numbers | `src/services/ai/engine.ts` | Maths on the local records. The same tools the AI server uses. |
| The reply | `brain/reply.ts` + keys `ai.b.*` in `src/i18n/*/ai.ts` | Templates, Malay and English. |
| Follow-up ("How much was it?" then "12.50") | `Pending` in `brain/index.ts` | Kept in the chat screen. |

What it **cannot** do: understand anything outside those 15 intents (it hands those to the server AI), read photos / PDFs, or chat freely. It says "I did not understand" when offline.

### Training and improving it

```
pip install -r ml/requirements.txt
python ml/train.py            # prints accuracy, writes the JSON files into src/services/ai/brain/
node scripts/brain-check.mjs  # proves the TypeScript copy gives the same answers as Python
```

- Training data is **made** from templates and a Malaysian word list (`ml/make_data.py`, `ml/lexicon.py`). The score on unseen templates is about 81%; on 136 hand-written messages (`ml/eval_cases.py`) about 92%. Real messages will score lower until real examples are added.
- To improve: when the brain gets a message wrong, add it to `ml/eval_cases.py` with the intent you expected (and add words to `ml/lexicon.py` for new shops / items), retrain, run the check, commit the JSON files.
- If you change `ml/features.py`, change `brain/featurize.ts` the same way, retrain, and run the check.
- The app asks the server AI whenever confidence is below `MIN_CONFIDENCE` (0.55, `brain/index.ts`).

## Layer 2: the AI server

- `supabase/functions/wakira-ai/index.ts`: login check, limits, prompt and tool list.
- `supabase/functions/wakira-ai/providers.ts`: one adapter per provider; the app always speaks Gemini-shaped messages and the adapter translates.
- Providers are used only if their secret is set. Order: `AI_PROVIDERS` (default `gemini,mistral,groq,cerebras,openrouter,openai,anthropic,compat`).
- Photos need an image-capable provider; PDFs only Gemini and Claude. A provider that cannot read the file is skipped.
- Limits per pengguna, counted once per message that reaches the server and was answered: `AI_MONTHLY_LIMIT` (25), `AI_DAILY_LIMIT` (optional).

```
supabase secrets set GEMINI_API_KEY=...  AI_MONTHLY_LIMIT=25
supabase secrets set MISTRAL_API_KEY=...            # backup (free tier)
supabase secrets set GROQ_API_KEY=...               # backup (free tier, no photos)
supabase secrets set ANTHROPIC_API_KEY=...          # last resort, paid, reads PDFs
supabase secrets set AI_PROVIDERS=gemini,mistral,groq,anthropic
supabase functions deploy wakira-ai
```

Model names change often. Defaults are in `providers.ts`; if the logs say a provider returned 404 / `bad_model`, set its `*_MODEL` secret (`AI_MODEL`, `MISTRAL_MODEL`, `GROQ_MODEL`, `ANTHROPIC_MODEL`, ...) to a current name.

## Privacy

- Records stay on the phone. The server AI only gets the message, the names of accounts / categories, and what a tool returns for that one question.
- Messages the own brain understands never leave the phone.
- Nothing is saved until the pengguna taps **Save** (and there is Undo).
- The chat is kept on the phone only. Files are sent once and never kept.
- The server keeps one usage line per answered message in `ai_usage` (who, when, had a file). No content. Table: `supabase/007_ai_usage.sql`.
- The consent notice is shown the first time a message goes to the server.

## Not built yet

- Own OCR for photos / PDFs (today: Gemini or Claude on the server).
- Learning from the pengguna's corrections to the router (today only the category model learns).
