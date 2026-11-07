"""
Trains WaKira's own models and writes them as small JSON files the app reads (no server, no Gemini).

  python train.py            -> evaluate honestly (unseen templates + hand-written cases), then write the final models

Outputs (into src/services/ai/brain/):
  intent-model.json     the router: what does the pengguna want?
  category-model.json   cold-start model: which category does a title belong to? (before the pengguna has any history)
  parity.json           a few messages with their features, so the TypeScript copy can be checked against this one
"""
import json
import math
import os
import sys
from collections import Counter, defaultdict

import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.linear_model import LogisticRegression

from eval_cases import CASES
from features import featurize
from lexicon import CATEGORY_LEXICON, EXPENSE_CATEGORY_IDS, INCOME_CATEGORY_IDS
from make_data import INTENTS, decorate, fill, generate, generate_full

import random

OUT = os.path.join(os.path.dirname(__file__), "..", "src", "services", "ai", "brain")
os.makedirs(OUT, exist_ok=True)


def lexicon_examples(rng, n_per=1):
    """Short 'item amount' messages (e.g. 'netflix 17'): every word in the category lexicon becomes an expense or income example."""
    shapes = ["{w} {a}", "{w} rm{a}", "rm{a} {w}", "{w} {a} cash", "beli {w} {a}", "bayar {w} {a}", "{w} {a} guna tng"]
    out = []
    for kind, ids in (("expense", EXPENSE_CATEGORY_IDS), ("income", INCOME_CATEGORY_IDS)):
        for cid in ids:
            for words in CATEGORY_LEXICON[cid].values():
                for w in words:
                    for _ in range(n_per):
                        a = "%g" % rng.choice([2, 3.5, 5, 8, 12, 17, 23.9, 30, 45, 60, 100, 150, 250, 800, 1500, 3500])
                        t = rng.choice(shapes).replace("{w}", w).replace("{a}", a)
                        if rng.random() < 0.25:
                            t = decorate(rng, t)
                        out.append((t, kind))
    return out


OTHER_Q = ["how do i invest {a}k", "should i buy {w} stocks", "tell me about {w}", "explain {w}", "cuaca {w} hujan tak", "ceritakan pasal {w}", "macam mana nak {w}", "what is {w}",
           "write a poem about {w}", "tulis surat untuk {w}", "tell me a joke", "cerita lawak", "who is the prime minister", "translate {w} to english", "kenapa {w} naik harga", "is {w} halal",
           "how to cook {w}", "resepi {w}", "recommend a movie", "apa itu {w}", "how much is {w} worth in the world", "bila hari raya tahun depan", "what time is it in japan", "nak belajar {w}"]
TOPICS = ["asb", "epf", "kwsp", "bitcoin", "gold", "emas", "zakat", "cukai", "insurance", "takaful", "python", "football", "bola", "kereta", "rumah", "saham", "ringgit", "dollar", "tabung haji", "pelaburan", "loan", "umrah"]


def other_examples(rng, n=700):
    out = []
    for _ in range(n):
        t = rng.choice(OTHER_Q).replace("{w}", rng.choice(TOPICS)).replace("{a}", str(rng.choice([5, 10, 20, 50])))
        out.append((decorate(rng, t) if rng.random() < 0.3 else t, "other"))
    return out


def fit_intent(data, C=6.0):
    texts = [t for t, _ in data]
    y = np.array([INTENTS.index(i) for _, i in data])
    vec = CountVectorizer(analyzer=featurize, binary=True, min_df=3, dtype=np.float32)
    X = vec.fit_transform(texts)
    clf = LogisticRegression(C=C, max_iter=400, class_weight="balanced")
    clf.fit(X, y)
    return vec, clf


def predict(vec, clf, texts):
    return clf.predict_proba(vec.transform(texts))


def report(name, vec, clf, data):
    P = predict(vec, clf, [t for t, _ in data])
    pred = P.argmax(1)
    truth = np.array([INTENTS.index(i) for _, i in data])
    acc = (pred == truth).mean()
    print(f"\n{name}: accuracy {acc:.1%} on {len(data)} messages")
    # accuracy if we only trust confident answers (the app falls back to another AI when not confident)
    for th in (0.5, 0.6, 0.7):
        sure = P.max(1) >= th
        ok = ((pred == truth) & sure).sum()
        print(f"   trust only if confidence >= {th}: answers {sure.mean():.0%} of messages, {ok / max(1, sure.sum()):.1%} of those right")
    bad = [(data[i][0], INTENTS[truth[i]], INTENTS[pred[i]], float(P[i].max())) for i in range(len(data)) if pred[i] != truth[i]]
    return acc, bad


def export_intent(vec, clf, path, keep=0.05):
    vocab = vec.vocabulary_
    inv = {i: f for f, i in vocab.items()}
    W = clf.coef_.astype(np.float64)  # classes x features
    feats = {}
    for j in range(W.shape[1]):
        col = W[:, j]
        if np.max(np.abs(col)) < keep:
            continue
        feats[inv[j]] = [round(float(x), 2) for x in col]
    model = {"v": 1, "classes": INTENTS, "bias": [round(float(x), 3) for x in clf.intercept_], "features": feats}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(model, f, ensure_ascii=False, separators=(",", ":"))
    return len(feats), os.path.getsize(path)


# ---------------------------------------------------------------- category model (Naive Bayes, sparse export)
def category_docs(rng, ids):
    """Training phrases: each word on its own, and inside the phrases people actually type."""
    wraps = ["{w}", "{w}", "{w}", "beli {w}", "bayar {w}", "{w} rm", "bayar {w} bulan ni", "{w} semalam", "kat {w}", "paid {w}", "bought {w}", "{w} lah", "belanja {w}", "nak {w}"]
    docs = []
    for cid in ids:
        for sub, words in CATEGORY_LEXICON[cid].items():
            for w in words:
                for _ in range(6):
                    s = rng.choice(wraps).replace("{w}", w).replace("rm", "").strip()
                    if rng.random() < 0.3:
                        s = decorate(rng, s)
                    docs.append((s, f"{cid}|{sub}"))
    return docs


def train_nb(docs, alpha=0.3):
    classes = sorted({l for _, l in docs})
    ci = {c: i for i, c in enumerate(classes)}
    count = defaultdict(Counter)  # feature -> class -> n
    total = np.zeros(len(classes))
    prior = np.zeros(len(classes))
    vocab = set()
    for text, label in docs:
        c = ci[label]
        prior[c] += 1
        for f in featurize(text):
            count[f][c] += 1
            total[c] += 1
            vocab.add(f)
    # features seen only once in the whole corpus are noise
    vocab = {f for f in vocab if sum(count[f].values()) >= 2}
    V = len(vocab)
    total = np.zeros(len(classes))
    for f in vocab:
        for c, n in count[f].items():
            total[c] += n
    d = np.log(alpha / (total + alpha * V))  # log-likelihood of a feature the class never saw
    feats = {}
    for f in sorted(vocab):
        row = []
        for c, n in sorted(count[f].items()):
            ll = math.log((n + alpha) / (total[c] + alpha * V))
            row.append([c, round(ll - d[c], 3)])
        feats[f] = row
    return {
        "classes": classes,
        "prior": [round(float(math.log(p / prior.sum())), 3) for p in prior],
        "d": [round(float(x), 4) for x in d],
        "features": feats,
    }


def nb_predict(m, text):
    feats = [f for f in featurize(text) if f in m["features"]]
    if not feats:
        return None
    score = [m["prior"][c] + len(feats) * m["d"][c] for c in range(len(m["classes"]))]
    for f in feats:
        for c, delta in m["features"][f]:
            score[c] += delta
    mx = max(score)
    ex = [math.exp(s - mx) for s in score]
    z = sum(ex)
    k = max(range(len(score)), key=lambda i: score[i])
    return m["classes"][k], ex[k] / z


def main():
    # ---- 1. honest evaluation of the router
    train, test = generate()
    train = train + lexicon_examples(random.Random(5), 2) + other_examples(random.Random(8))
    vec, clf = fit_intent(train)
    acc_t, bad_t = report("Unseen templates (made by the same generator, different sentence shapes)", vec, clf, test)
    hand = [(t, i) for t, i in CASES]
    acc_h, bad_h = report("Hand-written messages (closest to real use)", vec, clf, hand)
    print("\nWrong on hand-written messages:")
    for t, want, got, p in bad_h:
        print(f"   {t!r}: wanted {want}, got {got} ({p:.2f})")

    # ---- 2. final router: every template, plus the hand-written messages seen a few times
    data = generate_full() + lexicon_examples(random.Random(6), 3) + other_examples(random.Random(9), 900)
    if "--no-hand" not in sys.argv:
        data = data + [(t, i) for t, i in CASES for _ in range(3)]
    vec, clf = fit_intent(data)
    n, size = export_intent(vec, clf, os.path.join(OUT, "intent-model.json"))
    print(f"\nWrote intent-model.json: {n} features, {size / 1024:.0f} KB")

    # ---- 3. category cold-start models
    rng = random.Random(3)
    out = {"v": 1}
    for kind, ids in (("expense", EXPENSE_CATEGORY_IDS), ("income", INCOME_CATEGORY_IDS)):
        docs = category_docs(rng, ids)
        m = train_nb(docs)
        out[kind] = m
        # quick check on phrases not used verbatim
        probe = {"expense": [("nasi lemak kak ros", "food"), ("shell bangi", "transport"), ("bil tnb", "bills"), ("klinik dr ali", "health"), ("tiket wayang tgv", "entertainment"), ("grab ke klcc", "transport"), ("duit raya adik", "gifts")],
                 "income": [("gaji ogos", "income"), ("bonus tahunan", "income"), ("client bayar", "freelance"), ("dividen asb", "investment"), ("cashback tng", "otherincome")]}[kind]
        ok = 0
        for text, want in probe:
            r = nb_predict(m, text)
            got = r[0].split("|")[0] if r else None
            ok += got == want
            print(f"   [{kind}] {text!r} -> {r[0] if r else None} ({r[1]:.2f})" if r else f"   [{kind}] {text!r} -> none")
        print(f"   {kind}: {ok}/{len(probe)} probe phrases right, {len(m['features'])} features")
    p = os.path.join(OUT, "category-model.json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote category-model.json ({os.path.getsize(p) / 1024:.0f} KB)")

    # ---- 4. parity fixtures for the TypeScript copy
    samples = ["Nasi lemak RM6.50 tadi", "pindah 200 dari maybank ke tunai", "mkn tghari 14.", "rm1,200.50 gaji 12/10", "berapa 3 ringgit 50 sen", "Topup TNG 30", "1.2k bonus", "Baki saya?", "  KFC  rm 23.5  "]
    from features import normalize
    fx = [{"text": s, "normalized": normalize(s), "features": featurize(s)} for s in samples]
    with open(os.path.join(OUT, "parity.json"), "w", encoding="utf-8") as f:
        json.dump(fx, f, ensure_ascii=False)
    # also keep intent probabilities for a few messages, to compare with TypeScript's result
    P = predict(vec, clf, samples)
    with open(os.path.join(OUT, "parity-intent.json"), "w", encoding="utf-8") as f:
        json.dump([{"text": s, "best": INTENTS[int(P[i].argmax())], "p": round(float(P[i].max()), 3)} for i, s in enumerate(samples)], f)


if __name__ == "__main__":
    main()
