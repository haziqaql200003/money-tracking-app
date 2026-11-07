"""
Messages written by hand, the way a pengguna might really type. They are NOT made from the templates,
so the score on them is a more honest guide to how the router copes with real messages.
Add real messages here (with the intent you expected) whenever the brain gets one wrong, then retrain.
"""
CASES = [
    # expense
    ("nasi lemak telur 6.50", "expense"), ("mkn tghari 14", "expense"), ("petrol 50 cash", "expense"), ("rm8 teh tarik", "expense"),
    ("baru bayar tnb 134.20", "expense"), ("tadi grab ke office rm17", "expense"), ("beli baju kat uniqlo 89.90", "expense"),
    ("spent 25 on coffee", "expense"), ("bayar sewa bilik rm650 guna bank", "expense"), ("lunch with team 45 ringgit", "expense"),
    ("parking mall 3", "expense"), ("topup prepaid 30", "expense"), ("kena saman 150", "expense"), ("shopee 56.80 cod", "expense"),
    ("dinner kfc 23.5", "expense"), ("semalam beli ubat 18", "expense"), ("netflix 17", "expense"), ("derma masjid 10", "expense"),
    ("bought a book for 35", "expense"), ("bayar yuran tuisyen anak 120", "expense"), ("tol 5.40", "expense"), ("belanja mak 100", "expense"),
    ("mcd 12.90 pakai tng", "expense"), ("cuci kereta rm15", "expense"), ("makan malam kat restoran 68", "expense"), ("kopi starbucks rm19", "expense"),
    ("gym 99 sebulan", "expense"), ("paid 120 for electricity", "expense"), ("beli ayam dan sayur 32", "expense"), ("ptptn 100", "expense"),
    ("isi minyak", "expense"), ("beli kasut", "expense"),
    # income
    ("gaji dah masuk 3500", "income"), ("terima bonus rm2000", "income"), ("dapat duit raya 150", "income"), ("freelance project paid 800", "income"),
    ("cashback grab 2.50", "income"), ("masuk gaji rm4200 dalam maybank", "income"), ("got my salary 3000", "income"), ("dividen asb 120", "income"),
    ("refund shopee 25", "income"), ("terima sewa rumah 1200", "income"), ("ot bulan ni 350", "income"), ("client bayar 1500", "income"),
    ("dapat str 200", "income"), ("kawan bayar balik rm50", "income"), ("jual baju lama dapat 40", "income"),
    # transfer
    ("pindah 200 dari maybank ke tunai", "transfer"), ("topup tng 50 guna bank", "transfer"), ("tarik duit 100 kat atm", "transfer"), ("transfer 500 to savings", "transfer"),
    ("masuk 300 dalam tabung dari cimb", "transfer"), ("move rm1000 from bank to asb", "transfer"), ("isi grabpay 30 dari tng", "transfer"), ("simpan 200 ke simpanan", "transfer"),
    ("bank ke cash 80", "transfer"), ("withdraw 200", "transfer"), ("deposit tunai 500 ke maybank", "transfer"), ("top up boost 20 dari cimb", "transfer"),
    # where
    ("bulan ni duit aku pergi mana", "where"), ("berapa aku belanja makan bulan lepas", "where"), ("how much did i spend this week", "where"), ("belanja ikut kategori bulan ni", "where"),
    ("paling banyak habis kat mana", "where"), ("spending breakdown last month", "where"), ("berapa total belanja minggu ni", "where"), ("berapa dah keluar duit bulan ni", "where"),
    ("kategori mana paling mahal", "where"), ("how much did i spend on grab last month", "where"), ("belanja kat shopee berapa tahun ni", "where"), ("tunjuk belanja ikut akaun", "where"),
    # find
    ("cari semua transaksi grab", "find"), ("tunjuk 5 transaksi terakhir", "find"), ("what was my biggest expense this month", "find"), ("bila last aku beli minyak", "find"),
    ("show me all starbucks purchases", "find"), ("senarai belanja lebih rm100 bulan ni", "find"), ("ada tak aku bayar tnb bulan ni", "find"), ("rekod terkini", "find"),
    # balance
    ("baki aku berapa", "balance"), ("berapa duit dalam tng", "balance"), ("what's in my maybank", "balance"), ("tengok baki semua akaun", "balance"),
    ("total duit aku sekarang", "balance"), ("how much do i have left", "balance"), ("tinggal berapa duit bulan ni", "balance"), ("my balance", "balance"),
    # forecast
    ("cukup tak duit sampai gaji", "forecast"), ("ramalan belanja 3 bulan", "forecast"), ("what will my balance be in 3 months", "forecast"), ("bil apa nak bayar minggu ni", "forecast"),
    ("anggaran habis berapa hujung bulan", "forecast"), ("will i run out of money before payday", "forecast"), ("upcoming bills next 30 days", "forecast"), ("bulan depan aku boleh simpan berapa", "forecast"),
    # habits
    ("aku ni boros ke", "habits"), ("hari apa aku paling banyak belanja", "habits"), ("beri tips macam mana nak jimat", "advice"), ("analyse my spending habits", "habits"),
    ("any weird spending lately", "habits"), ("kedai mana aku selalu pergi", "habits"), ("apa skor wakira aku", "habits"), ("belanja weekend lebih ke weekday", "habits"),
    # budget
    ("bajet makan tinggal berapa", "budget"), ("am i over budget on shopping", "budget"), ("dah lebih bajet transport ke", "budget"), ("status bajet bulan ni", "budget"),
    # compare
    ("belanja bulan ni lebih ke bulan lepas", "compare"), ("compare with last month", "compare"), ("kategori mana naik dari bulan lepas", "compare"), ("did i spend less than last month", "compare"),
    # transfers_list
    ("tunjuk semua pindahan bulan ni", "transfers_list"), ("transfer history last month", "transfers_list"), ("berapa kali aku pindah duit", "transfers_list"),
    # help
    ("boleh buat apa je", "help"), ("how do i use wakira", "help"), ("macam mana nak tambah belanja", "help"), ("tolong", "help"),
    # greet / thanks
    ("hai wakira", "greet"), ("assalamualaikum", "greet"), ("selamat pagi", "greet"), ("hello", "greet"),
    ("tq wakira", "thanks"), ("terima kasih banyak", "thanks"), ("ok thanks", "thanks"), ("sip", "thanks"),
    # advice
    ("mcm mana saya nak boost saving saya", "advice"), ("how do i save more each month", "advice"), ("apa yang patut aku kurangkan", "advice"),
    ("bagi cadangan nak berjimat", "advice"), ("duit aku selalu habis awal, apa nak buat", "advice"),
    # explain (follow-ups)
    ("tak faham la", "explain"), ("boleh terangkan dalam bahasa mudah", "explain"), ("kenapa?", "explain"), ("what does that mean", "explain"), ("bagus ke tu", "explain"),
    # other
    ("ceritakan pasal asb", "other"), ("how do i invest 10k", "other"), ("cuaca esok hujan tak", "other"), ("what is the capital of france", "other"),
    ("macam mana nak bayar zakat pendapatan", "other"), ("explain what epf is", "other"), ("tulis surat rasmi untuk bos", "other"), ("tell me a joke", "other"),
    ("which is better asb or tabung haji", "other"), ("kenapa ringgit jatuh", "other"),
]

# Real messages typed in Ask WaKira (Oct-Nov 2026). When the brain gets a real message wrong, add it here with the intent you expected.
CASES += [
    ("Record expenses Lunch Rm3.50 with details nasi kuah dan telur mata today", "expense"),
    ("Record expenses with tajuk Transfer to Syafiq RM 28 with remarks duit bowling on 30 oct 2026", "expense"),
    ("Record expenses Transfer to Danisha RM 10 with details as follows", "expense"),
    ("Record expense T-Mart RM 3.50 with details as follows 1x Air A&W", "expense"),
    ("Record expense Dodo Korea RM 44.50 with details as follows", "expense"),
    ("Ayam Gepuk Shilla RM 15.45 pay with maybank yesterday with details as below", "expense"),
    ("Record McDonald's Rm12.90 pay with rytbank details as follows", "expense"),
    ("Track expenses yesterday Nasi Kerabu Pokdie with details below", "expense"),
    ("rekod belanja tajuk bayar hutang ali rm 15 catatan makan malam", "expense"),
    ("REKOD MAKAN TENGAH HARI rm 8 dengan butiran NASI AYAM, TEH AIS kat maybank", "expense"),
    ("lunch rm12 cash", "expense"), ("beli air suam rm1", "expense"), ("1x Medium Coke rm 3.90", "expense"),
    ("Saya nak saving 500 hujung bulan ini", "advice"), ("Maksud aku, aku nak save total rm 500 bukan everyday 500", "advice"),
    ("Mcm mana saya nak boost saving saya", "advice"),
    ("Apasal ada short rm 18,230 pula", "explain"), ("Terangkan dengan mudah", "explain"), ("Explain: Spending this week is higher than usual", "explain"),
    ("Apa benda ko merapu ni", "explain"),
    ("Show purchases under RM20", "find"), ("Show me records for the past 14 days", "find"), ("Show me expenses for the past 2 weeks", "where"),
    ("Only show me past 14 days", "find"),
]
CASES += [
    ("What bills are coming up?", "forecast"), ("any bills coming up next week", "forecast"), ("bills due this month", "forecast"), ("Bil apa yang akan datang?", "forecast"),
    ("Record income Freelance RM500 into Maybank today", "income"), ("Rekod pendapatan Freelance RM500 masuk Maybank hari ini", "income"),
    ("Record expense Lunch RM12 from Cash today", "expense"), ("Rekod belanja Lunch RM12 dari Cash hari ini", "expense"),
    ("Transfer RM50 from Maybank to Cash today", "transfer"), ("Pindah RM50 dari Maybank ke Cash hari ini", "transfer"),
    ("Can I afford RM300?", "forecast"), ("Mampu ke saya beli RM300?", "forecast"),
    ("Show my 5 biggest expenses this month", "find"), ("Tunjuk 5 belanja paling besar bulan ni", "find"),
]


# Messages from real use, reviewed by hand (scripts/brain-log-import.mjs adds them; you check the intent).
# Format: intent<TAB>message. Lines starting with "#" or "?" (not reviewed yet) are skipped.
def _real_messages():
    import os
    from make_data import INTENTS
    path = os.path.join(os.path.dirname(__file__), "real_messages.tsv")
    if not os.path.exists(path):
        return [], 0
    out, waiting = [], 0
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\r\n")
            if not line or line.startswith("#"):
                continue
            if line.startswith("?"):
                waiting += 1
                continue
            intent, _, text = line.partition("\t")
            intent = intent.strip()
            if intent in INTENTS and text.strip():
                out.append((text.replace("\\n", "\n"), intent))
    return out, waiting


REAL, REAL_WAITING = _real_messages()
CASES += REAL
