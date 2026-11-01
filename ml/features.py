"""
Turns a message into features. The SAME steps are written again in TypeScript
(src/services/ai/brain/featurize.ts); `node scripts/brain-check.mjs` checks that both give identical features (using parity.json).

Steps: lowercase -> money becomes <amt> -> dates become <date> -> other numbers become <num>
       -> only a-z 0-9 and the markers stay -> words, word pairs, and 3-4 letter chunks inside each word
       (the chunks make typing like "mkn" or "mkan" still look like "makan").
"""
import re

# Money. Same patterns in TypeScript (src/services/ai/brain/patterns.ts).
RE_AMT = [
    re.compile(r"(?:rm|myr)\s*\d[\d,]*(?:\.\d+)?k?"),
    re.compile(r"\d[\d,]*(?:\.\d+)?\s*(?:ringgit|rm|myr)\b"),
    re.compile(r"\d+\s*sen\b"),
    re.compile(r"\d+(?:\.\d+)?k\b"),
]
RE_DATE = re.compile(r"\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b")
RE_NUM = re.compile(r"\d+(?:[.,]\d+)*")
RE_KEEP = re.compile(r"[^a-z0-9<>]+")


def normalize(text: str) -> str:
    t = text.lower()
    for r in RE_AMT:
        t = r.sub(" <amt> ", t)
    t = RE_DATE.sub(" <date> ", t)
    t = RE_NUM.sub(" <num> ", t)
    t = RE_KEEP.sub(" ", t)
    return " ".join(t.split())


def featurize(text: str) -> list:
    toks = normalize(text).split(" ") if normalize(text) else []
    feats = set()
    for i, w in enumerate(toks):
        feats.add("w:" + w)
        if i + 1 < len(toks):
            feats.add("b:" + w + "_" + toks[i + 1])
        if not w.startswith("<") and len(w) >= 3:
            s = "^" + w + "$"
            for n in (3, 4):
                for j in range(len(s) - n + 1):
                    feats.add("c:" + s[j : j + n])
    return sorted(feats)
