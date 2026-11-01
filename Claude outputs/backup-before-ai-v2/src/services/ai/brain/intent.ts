import intentJson from './intent-model.json';
import { featurize } from './featurize';

/** What the pengguna wants. Order and names come from ml/make_data.py (INTENTS). */
export type Intent =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'where'
  | 'find'
  | 'balance'
  | 'forecast'
  | 'habits'
  | 'budget'
  | 'compare'
  | 'transfers_list'
  | 'help'
  | 'greet'
  | 'thanks'
  | 'other';

type IntentModel = { v: number; classes: string[]; bias: number[]; features: Record<string, number[]> };
const model = intentJson as unknown as IntentModel;

export type IntentGuess = { intent: Intent; p: number; ranked: { intent: Intent; p: number }[] };

/** Logistic regression trained by ml/train.py: add up the weights of the features in the message, then softmax. */
export function classifyIntent(text: string): IntentGuess {
  const logits = model.bias.slice();
  for (const f of featurize(text)) {
    const w = model.features[f];
    if (!w) continue;
    for (let i = 0; i < logits.length; i++) logits[i] += w[i];
  }
  const max = Math.max(...logits);
  const ex = logits.map((x) => Math.exp(x - max));
  const z = ex.reduce((s, x) => s + x, 0);
  const ranked = ex.map((x, i) => ({ intent: model.classes[i] as Intent, p: x / z })).sort((a, b) => b.p - a.p);
  return { intent: ranked[0].intent, p: ranked[0].p, ranked };
}
