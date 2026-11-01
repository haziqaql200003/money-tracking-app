"""
Builds training sentences for WaKira's router (what does the pengguna want?) from templates + word lists.

Every template belongs to ONE intent. To measure honestly, some templates are kept out of training completely
(see split_templates) so the test shows how the model copes with phrasing it has never seen.
"""
import hashlib
import random

from lexicon import (
    ACCOUNTS, AMOUNTS_BIG, AMOUNTS_SMALL, CATEGORY_LEXICON, CATEGORY_WORDS, EXPENSE_CATEGORY_IDS,
    INCOME_CATEGORY_IDS, MERCHANTS, PERIODS, WHEN,
)

INTENTS = [
    "expense", "income", "transfer", "where", "find", "balance", "forecast", "habits",
    "budget", "compare", "transfers_list", "help", "greet", "thanks", "other",
]

# ---------------------------------------------------------------- templates
# {amt} amount  {item} expense word  {inc} income word  {a} / {b} accounts  {when} date  {period}  {merchant}  {cat}  {n}
T = {
"expense": [
    "{item} {amt}", "{amt} {item}", "beli {item} {amt}", "bayar {item} {amt}", "belanja {item} {amt}", "{when} {item} {amt}",
    "{item} {amt} {when}", "{item} {amt} guna {a}", "{item} {amt} {a}", "{item} {amt} pakai {a}", "{item} {amt} dari {a}",
    "tadi beli {item} {amt} kat {merchant}", "rekod {item} {amt}", "rekod belanja {item} {amt}", "catat {item} {amt}",
    "tambah perbelanjaan {amt} {item}", "tambah belanja {item}", "spent {amt} on {item}", "paid {amt} for {item}",
    "bought {item} for {amt}", "{item} - {amt}", "i spent {amt} on {item} {when}", "add expense {amt} {item}",
    "record expense {item} {amt}", "log {item} {amt}", "{item} {amt} kat {merchant}", "baru je bayar {item} {amt}",
    "dah bayar {item} {amt}", "bayar {item}", "beli {item}", "makan {item} {amt} {when}", "{when} aku belanja {amt} untuk {item}",
    "aku beli {item} rm{amt_plain}", "kena bayar {item} {amt}", "keluar {amt} untuk {item}", "duit keluar {amt} {item}",
    "{merchant} {amt}", "{amt} {merchant}", "{merchant} {amt} {a}", "belanja kat {merchant} {amt}", "topup {merchant} {amt}",
    "paid {merchant} {amt} with {a}", "{when} {merchant} {amt}", "dah beli {item}", "tolong rekod {item} {amt}",
    "boleh tolong catat {item} {amt}", "tambah {item} {amt} dalam {a}", "i bought {item}", "just paid {amt} for {item}",
    "expense {amt} {item} {when}", "belanja: {item} {amt}", "{item} {amt} ya", "{item} {amt} je", "ok {item} {amt}",
    "wakira rekod {item} {amt}", "wakira tambah {item} {amt}", "pls add {item} {amt}", "nak rekod {item} {amt}",
    "kos {item} {amt}", "harga {item} {amt}", "{item} berharga {amt}", "{item} costs {amt}", "{item} cost me {amt}",
],
"income": [
    "gaji masuk {amt}", "terima {inc} {amt}", "dapat {inc} {amt}", "{inc} {amt}", "received {amt} {inc}", "got paid {amt}",
    "income {amt} {inc}", "{inc} {amt} masuk {a}", "duit masuk {amt} dari {inc}", "tambah pendapatan {amt}", "salary credited {amt} to {a}",
    "{when} dapat {inc} {amt}", "{when} terima {inc} {amt}", "{inc} {amt} {when}", "rekod pendapatan {inc} {amt}", "catat {inc} {amt}",
    "dapat duit {amt} {inc}", "{inc} dah masuk {amt}", "{inc} masuk {amt} dalam {a}", "{amt} {inc} masuk", "i got {amt} {inc}",
    "got {inc} {amt}", "received {inc} {amt} {when}", "add income {amt} {inc}", "record income {inc} {amt}", "log income {amt}",
    "bank masuk {amt} {inc}", "ada duit masuk {amt}", "tambah income {inc} {amt}", "wakira dapat {inc} {amt}", "terima {amt} daripada {inc}",
    "{inc} bulan ni {amt}", "baru dapat {inc} {amt}", "{inc} sampai {amt}", "{inc} sudah masuk {a} {amt}", "pay day {amt}", "payday {inc} {amt}",
    "dah dapat {inc} {amt}", "dapat {amt} {inc} {when}", "income: {inc} {amt}", "{inc} diterima {amt}", "dibayar {amt} {inc}",
],
"transfer": [
    "pindah {amt} dari {a} ke {b}", "transfer {amt} {a} ke {b}", "topup {b} {amt} dari {a}", "top up {b} {amt}", "move {amt} from {a} to {b}",
    "{a} ke {b} {amt}", "masuk {amt} ke {b} dari {a}", "simpan {amt} dalam {b}", "tarik duit {amt} dari {a}", "withdraw {amt} from {a}",
    "keluarkan {amt} dari {a}", "pindah duit {a} ke {b} {amt}", "transfer {a} to {b} {amt}", "transfer {amt} to {b}", "pindahkan {amt} ke {b}",
    "{when} pindah {amt} dari {a} ke {b}", "top up {b} dengan {a} {amt}", "topup {b} guna {a} {amt}", "reload {b} {amt} dari {a}", "isi {b} {amt} dari {a}",
    "masukkan {amt} ke {b}", "masukkan {amt} dalam {b} dari {a}", "alih {amt} dari {a} ke {b}", "tukar {amt} dari {a} ke {b}", "send {amt} from {a} to {b}",
    "i moved {amt} from {a} to {b}", "i transferred {amt} to {b}", "bank ke tunai {amt}", "tunai ke bank {amt}", "{a} to {b} {amt}",
    "tarik {amt} atm", "tarik tunai {amt}", "ambil duit {amt} kat atm", "deposit {amt} ke {b}", "deposit tunai {amt} ke {b}", "simpan {amt} ke {b}",
    "tabung {amt} dari {a}", "masuk tabung {amt} dari {a}", "pindah {amt} ke {b}", "transfer ke {b} {amt}", "move money to {b} {amt}",
    "wakira pindah {amt} dari {a} ke {b}", "tolong pindah {amt} dari {a} ke {b}", "boleh pindah {amt} ke {b}", "pindah {amt} {a} {b}",
],
"where": [
    "duit saya pergi mana {period}", "{period} habis duit kat mana", "berapa belanja {period}", "belanja {cat} {period} berapa",
    "where did my money go {period}", "how much did i spend on {cat} {period}", "spending breakdown {period}", "top spending {period}",
    "paling banyak belanja kat mana", "berapa dah habis {period}", "how much have i spent {period}", "tunjuk belanja ikut kategori",
    "belanja ikut kedai", "belanja ikut akaun", "berapa total belanja {period}", "total spending {period}", "kategori mana paling banyak {period}",
    "what did i spend on {period}", "what am i spending the most on", "breakdown belanja {period}", "ringkasan belanja {period}", "spending summary {period}",
    "berapa aku dah belanja {cat} {period}", "berapa belanja kat {merchant} {period}", "how much on {merchant} {period}", "berapa habis {cat}",
    "kat mana duit aku habis", "duit habis kat mana {period}", "ke mana perginya duit saya {period}", "belanja apa je {period}", "spending by category {period}",
    "spending by day {period}", "belanja ikut hari {period}", "hari mana paling banyak belanja {period}", "which category costs the most {period}",
    "expenses {period}", "perbelanjaan {period}", "senarai kategori belanja {period}", "tunjuk breakdown {period}", "berapa pendapatan {period}",
    "berapa income {period}", "how much did i earn {period}", "my income {period}", "wakira, berapa belanja {period}", "berapa saya belanja untuk {cat} {period}",
    "makan berapa {period}", "habis berapa {period}", "berapa dah keluar {period}", "total keluar {period}",
],
"find": [
    "cari transaksi {merchant}", "senarai {merchant} {period}", "show my {merchant} transactions", "berapa kali beli {merchant}", "transaksi terbesar {period}",
    "biggest expense {period}", "list my expenses {period}", "tunjuk rekod {item}", "last {merchant} purchase", "bila last aku {item}",
    "cari {merchant}", "search {merchant}", "find {merchant} {period}", "transaksi {merchant} {period}", "senarai transaksi {period}",
    "list transactions {period}", "show transactions {period}", "tunjuk transaksi {period}", "rekod terakhir saya", "recent transactions",
    "transaksi terkini", "latest records", "belanja paling besar {period}", "largest purchase {period}", "apa yang aku beli kat {merchant}",
    "what did i buy at {merchant}", "ada tak transaksi {merchant}", "ada rekod {item} tak", "tunjuk semua {item}", "senarai belanja {item} {period}",
    "semua rekod {merchant}", "carikan {merchant} {period}", "list {item} {period}", "show me {item} purchases", "rekod {merchant} bulan lepas",
    "transaksi lebih dari rm100 {period}", "transactions above {amt} {period}", "belanja lebih {amt} {period}", "yang paling mahal {period}",
    "most expensive {period}", "tunjuk belanja {merchant}", "berapa kali aku pergi {merchant}", "how many times {merchant}",
],
"balance": [
    "baki saya berapa", "berapa duit ada", "what's my balance", "baki {a}", "total balance", "how much money do i have", "duit dalam {a} berapa",
    "check balance", "tengok baki", "ringkasan", "overview", "summary bulan ni", "net worth", "baki akaun", "baki semua akaun", "account balances",
    "berapa baki {a}", "balance {a}", "how much in {a}", "berapa duit dalam {a}", "duit aku ada berapa", "jumlah duit saya", "total duit saya",
    "tunjuk baki", "show my balance", "my accounts", "senarai akaun", "list accounts", "baki semasa", "current balance", "berapa lagi duit ada",
    "berapa tinggal duit", "duit tinggal berapa", "ada berapa dalam {a}", "kira baki", "wakira baki", "baki bulan ni", "baki hujung bulan",
    "how much left this month", "tinggal berapa bulan ni", "boleh belanja berapa lagi", "how much can i still spend", "duit boleh guna berapa",
    "ringkasan kewangan", "financial summary", "dashboard", "kedudukan kewangan", "status duit", "my money status",
],
"forecast": [
    "ramalan bulan depan", "forecast {n} months", "macam mana baki {n} bulan lagi", "will i have enough next month", "cukup tak duit bulan depan",
    "ramal belanja", "projection", "anggaran belanja hujung bulan", "jangkaan simpanan", "apa bil akan datang", "upcoming bills", "bil yang akan datang",
    "next month spending", "ramalan {n} bulan", "forecast", "predict my spending", "ramal baki akhir bulan", "berapa baki hujung bulan nanti",
    "how much will i spend this month", "anggaran belanja bulan ni", "projected spending", "bulan depan belanja berapa", "next month forecast",
    "bil minggu depan", "bills due this week", "bil nak kena bayar", "ada bil apa bulan ni", "upcoming payments", "bayaran akan datang",
    "dalam {n} bulan nanti duit aku berapa", "macam mana kewangan {n} bulan akan datang", "future balance", "baki masa depan", "simpanan {n} bulan lagi",
    "boleh cukup sampai gaji tak", "will i last until payday", "cukup ke sampai gaji", "adakah duit cukup sampai hujung bulan", "berapa lama simpanan boleh tahan",
    "how long will my savings last", "runway simpanan", "ramalan pendapatan", "income forecast", "ramalkan belanja {n} bulan",
],
"habits": [
    "tabiat belanja saya", "my spending habits", "habit belanja", "hari apa paling banyak belanja", "weekend vs weekday", "adakah aku boros",
    "am i overspending", "analyse spending", "analisis perbelanjaan", "corak belanja", "spending patterns", "kenapa duit cepat habis", "tips jimat",
    "how can i save", "insight", "bagi insight", "bagi nasihat kewangan", "financial advice", "boros ke aku", "am i wasteful", "aku boros tak",
    "analisis tabiat belanja", "analyse my spending habits", "apa pattern belanja aku", "trend belanja", "spending trend", "belanja naik atau turun",
    "bagi tips jimat duit", "ways to save money", "macam mana nak jimat", "how to spend less", "mana yang boleh dikurangkan", "where can i cut back",
    "belanja kecil banyak ke", "banyak belanja kecil tak", "wakira insight", "skor kewangan saya", "my score", "wakira score", "health score",
    "kesihatan kewangan", "financial health", "apa yang pelik dalam belanja aku", "any unusual spending", "belanja luar biasa", "ada belanja pelik tak",
    "kedai mana aku selalu pergi", "top merchants", "kedai paling kerap", "adakah belanja aku sihat", "is my spending healthy", "review belanja aku",
],
"budget": [
    "bajet macam mana", "budget status", "dah lebih bajet tak", "am i over budget", "baki bajet {cat}", "bajet {cat} tinggal berapa", "how much budget left",
    "bajet {cat}", "budget {cat}", "status bajet", "bajet bulan ni", "this month budget", "dah habis bajet ke", "bajet dah lebih ke", "over budget ke",
    "bajet {cat} lebih tak", "bajet makan macam mana", "my budgets", "senarai bajet", "bajet saya", "bajet masih ada", "tinggal berapa bajet {cat}",
    "budget left for {cat}", "can i still spend on {cat}", "boleh lagi belanja {cat} tak", "dah melebihi bajet", "did i exceed my budget",
    "kategori mana lebih bajet", "which budgets are over", "bajet mana nak habis", "budget almost used", "bajet hampir habis", "bajet kategori",
    "limit belanja {cat}", "had belanja {cat}", "spending limit {cat}", "wakira bajet", "tengok bajet", "check budget",
],
"compare": [
    "banding dengan bulan lepas", "compare to last month", "lebih dari bulan lepas", "belanja naik atau turun", "did i spend more than last month",
    "bulan ni vs bulan lepas", "berapa beza", "compare this month and last month", "bandingkan bulan ni dan bulan lepas", "banding belanja {n} bulan",
    "compare last {n} months", "lebih banyak ke dari bulan lepas", "lebih sikit dari bulan lepas", "naik berapa peratus", "turun berapa peratus",
    "perbezaan belanja bulan ni", "difference from last month", "vs last month", "vs bulan lepas", "bulan ni lebih ke bulan lepas",
    "kategori mana naik", "which category went up", "which category increased", "kategori mana turun", "what changed from last month", "apa yang berubah dari bulan lepas",
    "month over month", "bulan ke bulan", "banding belanja {period} dengan sebelum ni", "compare spending {period} with before", "trend vs bulan lepas",
    "belanja bulan ni lebih tinggi ke", "is spending higher than last month", "kurang tak dari bulan lepas", "adakah belanja meningkat", "did my spending increase",
],
"transfers_list": [
    "senarai pindahan", "show my transfers", "berapa pindahan {period}", "transfer history", "sejarah pindahan", "list transfers {period}", "pindahan {period}",
    "senarai pindahan {period}", "tunjuk pindahan", "semua pindahan akaun", "pindahan antara akaun", "transfers between accounts", "berapa banyak duit dipindah {period}",
    "how much did i move {period}", "pindahan terakhir", "last transfer", "recent transfers", "transfer terkini", "rekod pindahan", "transfer records",
    "berapa kali pindah {period}", "how many transfers {period}", "pindahan dari {a}", "transfers from {a}", "pindahan ke {b}", "transfers to {b}", "pindahan masuk {b}",
    "tunjuk semua transfer", "show all transfers", "tengok pindahan {period}", "duit yang aku pindah {period}", "money i moved {period}",
],
"help": [
    "boleh buat apa", "help", "tolong", "apa awak boleh buat", "what can you do", "macam mana nak guna", "cara guna", "tunjuk contoh", "contoh arahan",
    "apa yang wakira boleh buat", "boleh tolong apa", "what can wakira do", "how do i use this", "bantuan", "bantu saya", "senarai arahan", "list of commands",
    "examples", "give me examples", "apa fungsi awak", "fungsi wakira", "macam mana nak rekod", "how to record expense", "macam mana nak pindah duit", "how do i transfer",
    "wakira boleh buat apa", "apa boleh tanya", "what can i ask", "ajar saya guna", "teach me how to use", "menu", "arahan", "commands", "?", "tolong saya", "need help",
    "nak tanya", "boleh tanya sesuatu", "can i ask something", "apa yang boleh aku cakap", "cara nak tambah belanja",
],
"greet": [
    "hi", "hai", "hello", "assalamualaikum", "salam", "selamat pagi", "good morning", "hey wakira", "yo", "apa khabar", "wakira", "hi wakira", "hello wakira",
    "hey", "hai wakira", "selamat petang", "selamat malam", "good evening", "good afternoon", "hola", "waalaikumsalam", "salam wakira", "assalamualaikum wakira",
    "pagi", "malam", "hi there", "hello there", "ada orang", "boleh tolong", "kau ada", "awak ada", "morning", "evening", "hye", "heyyy", "hiii", "hai hai",
],
"thanks": [
    "terima kasih", "tq", "thanks", "thank you", "ok thanks", "tqvm", "bagus", "ok", "okay", "noted", "baik", "ok terima kasih", "thanks wakira", "tq wakira",
    "mantap", "best", "syabas", "good job", "nice", "cantik", "ok baik", "faham", "ok faham", "alright", "sip", "ok sip", "thx", "tengkiu", "makasih",
    "ok la", "ok lah", "ok boleh", "cool", "great", "terima kasih banyak", "thanks a lot", "many thanks", "ok done", "dah faham", "ok clear",
],
"other": [
    "cuaca hari ni macam mana", "ceritakan jenaka", "who is the prime minister", "translate this to english", "write a poem", "berapa 25 darab 4", "what is the price of bitcoin",
    "resipi nasi goreng", "main game apa best", "lagu apa best", "how to fix my car", "siapa presiden amerika", "tolong buat assignment", "asdfgh", "lorem ipsum",
    "should i invest in asb or fd", "macam mana nak apply loan rumah", "explain compound interest", "apa itu zakat pendapatan", "how to save for a house",
    "apa maksud inflasi", "what is inflation", "bagaimana cara melabur saham", "is gold a good investment", "emas naik ke turun", "adakah crypto selamat",
    "explain epf withdrawal", "macam mana nak keluarkan kwsp", "what is the best credit card in malaysia", "kad kredit mana paling best", "how does zakat work",
    "bagaimana nak buat bajet yang baik", "how do i make a good budget plan", "ceritakan tentang diri awak", "who made you", "siapa buat awak", "kau siapa", "what are you",
    "tell me a story", "sing a song", "what time is it", "pukul berapa sekarang", "berapa tarikh hari ni", "what is the date", "good restaurant near me", "kedai makan best dekat sini",
    "football score", "keputusan bola semalam", "news today", "berita terkini", "how to lose weight", "macam mana nak kurus", "bagi saya idea hadiah", "gift ideas for mum",
    "tolong tulis email", "write an email to my boss", "ringkaskan teks ni", "summarize this text", "apa kata kau pasal politik", "what do you think about politics",
    "boleh bagi nasihat cinta", "relationship advice", "mengapa langit biru", "why is the sky blue", "kod python untuk sort", "python code to sort a list", "kenapa app ni lambat",
    "my app is slow", "bagaimana nak buka akaun bank", "how to open a bank account", "apa itu etf", "what is an etf", "bandingkan asb dan tabung haji", "compare asb and tabung haji",
    "apa beza takaful dan insurans", "difference between takaful and insurance", "bila hari raya tahun ni", "when is hari raya", "hello world", "test test", "123", "???",
],
}

# ---------------------------------------------------------------- helpers
def _amount_text(rng, big=False):
    v = rng.choice(AMOUNTS_BIG if big else AMOUNTS_SMALL)
    if rng.random() < 0.12 and not big:
        v = round(v + rng.choice([0.1, 0.2, 0.3, 0.4, 0.5, 0.7, 0.9]), 2)
    s = ("%g" % v)
    if isinstance(v, float) and rng.random() < 0.5 and round(v * 100) % 10 == 0:
        s = "%.2f" % v
    k = rng.random()
    if k < 0.34:
        return "rm" + s
    if k < 0.46:
        return "RM " + s
    if k < 0.56:
        return "RM" + s
    if k < 0.66:
        return s + " ringgit"
    if k < 0.74:
        return s + "rm"
    if k < 0.78 and v >= 1000:
        return ("%g" % (v / 1000)) + "k"
    if k < 0.82 and v < 1:
        return "%d sen" % round(v * 100)
    if k < 0.9:
        return s
    return "rm" + s


def _expense_words():
    out = []
    for cid in EXPENSE_CATEGORY_IDS:
        for sub, words in CATEGORY_LEXICON[cid].items():
            out += words
    return out


def _income_words():
    out = []
    for cid in INCOME_CATEGORY_IDS:
        for sub, words in CATEGORY_LEXICON[cid].items():
            out += words
    return out


EXPENSE_WORDS = _expense_words()
INCOME_WORDS = _income_words()
PAD_LEFT = ["", "", "", "", "wakira ", "wakira, ", "tolong ", "pls ", "boleh ", "eh ", "oi ", "hey "]
PAD_RIGHT = ["", "", "", "", "", " la", " lah", " je", " pls", " ya", " please", " dulu", " tau", " kot", " eh", " 😊", " 🙏"]


def _typo(rng, text):
    """Typing habits: dropped vowels (makan -> mkn), doubled letters, swapped letters, shortened words."""
    words = text.split(" ")
    out = []
    for w in words:
        if len(w) >= 4 and w[0].isalpha() and rng.random() < 0.12:
            r = rng.random()
            if r < 0.5:
                w = w[0] + "".join(c for c in w[1:] if c not in "aeiou")
            elif r < 0.7:
                i = rng.randrange(1, len(w) - 1)
                w = w[:i] + w[i + 1] + w[i] + w[i + 2 :]
            elif r < 0.85:
                i = rng.randrange(1, len(w))
                w = w[:i] + w[i] + w[i:]
            else:
                w = w[: max(3, len(w) - 2)]
        out.append(w)
    return " ".join(out)


def fill(rng, template):
    m = {
        "amt": lambda: _amount_text(rng, big=rng.random() < 0.08),
        "amt_plain": lambda: "%g" % rng.choice(AMOUNTS_SMALL),
        "item": lambda: rng.choice(EXPENSE_WORDS),
        "inc": lambda: rng.choice(INCOME_WORDS),
        "a": lambda: rng.choice(ACCOUNTS),
        "b": lambda: rng.choice(ACCOUNTS),
        "when": lambda: rng.choice(WHEN),
        "period": lambda: rng.choice(PERIODS),
        "merchant": lambda: rng.choice(MERCHANTS),
        "cat": lambda: rng.choice(CATEGORY_WORDS),
        "n": lambda: str(rng.choice([2, 3, 4, 6, 12])),
    }
    s = template
    for k, f in m.items():
        while "{" + k + "}" in s:
            s = s.replace("{" + k + "}", f(), 1)
    return s


def decorate(rng, s):
    s = rng.choice(PAD_LEFT) + s + rng.choice(PAD_RIGHT)
    r = rng.random()
    if r < 0.18:
        s = s.upper() if rng.random() < 0.2 else s.capitalize()
    if rng.random() < 0.3:
        s = _typo(rng, s)
    return s.strip()


def split_templates(templates, holdout=0.2):
    """Deterministic: a template always lands in the same side, whatever the random seed."""
    train, test = [], []
    for t in templates:
        h = int(hashlib.md5(t.encode()).hexdigest(), 16) % 1000 / 1000
        (test if h < holdout else train).append(t)
    return train, test


def generate(seed=7, per_intent=1800, holdout=0.2):
    rng = random.Random(seed)
    train, test = [], []
    for intent, temps in T.items():
        tr, te = split_templates(temps, holdout)
        if not te:  # tiny intents: keep at least one unseen template
            te, tr = tr[-1:], tr[:-1]
        for _ in range(per_intent):
            train.append((decorate(rng, fill(rng, rng.choice(tr))), intent))
        for _ in range(per_intent // 5):
            test.append((decorate(rng, fill(rng, rng.choice(te))), intent))
    rng.shuffle(train)
    rng.shuffle(test)
    return train, test


def generate_full(seed=11, per_intent=2200):
    """For the final model: ALL templates are used."""
    rng = random.Random(seed)
    data = []
    for intent, temps in T.items():
        for _ in range(per_intent):
            data.append((decorate(rng, fill(rng, rng.choice(temps))), intent))
    rng.shuffle(data)
    return data


if __name__ == "__main__":
    tr, te = generate()
    print(len(tr), len(te))
    for x in tr[:25]:
        print(x)
