"""
Word lists used to teach WaKira's own models. Malaysian Malay + English + the way people actually type.

CATEGORY_LEXICON: category id -> subcategory -> typical words / shops / phrases.
The ids and subcategory names must match DEFAULT_CATEGORIES in src/constants/categories.ts.
Pengguna who renamed or deleted a category keep working: the app falls back to "Other" when an id no longer exists.
"""

CATEGORY_LEXICON = {
    "food": {
        "Breakfast": ["nasi lemak", "roti canai", "roti telur", "sarapan", "breakfast", "tosei", "capati", "bubur", "bubur ayam", "kuih pagi", "nasi lemak bungkus", "roti bakar", "telur separuh masak", "mee goreng pagi"],
        "Lunch": ["makan tengah hari", "lunch", "nasi campur", "nasi ayam", "nasi kandar", "mee rebus", "laksa", "ayam penyet", "nasi goreng", "char kuey teow", "mixed rice", "economy rice", "bihun sup", "mee sup", "nasi kerabu", "asam pedas", "lontong", "kuey teow", "ayam gepuk", "set ayam gepuk", "nasi kuah", "telur mata", "nasi ayam gepuk", "ayam penyet set", "set lunch", "nasi berlauk", "lunch tadi", "lunch set", "beli lunch", "lunch bungkus", "lunch kat mamak", "makan lunch", "lunch hari ni", "lunch rm", "lunch cash", "nasi bungkus lunch"],
        "Dinner": ["makan malam", "dinner", "tomyam", "steamboat", "bbq", "sup tulang", "makan malam keluarga", "nasi arab", "mandi", "ikan bakar", "ayam golek"],
        "Snacks": ["keropok", "snek", "snack", "popia", "cekodok", "pisang goreng", "ais krim", "ice cream", "coklat", "cucur", "jajan", "kacang", "biskut", "gula-gula", "7-eleven", "7e", "kk mart", "mamee"],
        "Coffee / Tea": ["kopi", "teh tarik", "teh o", "coffee", "starbucks", "zus coffee", "tealive", "chatime", "boba", "bubble tea", "milo", "kopitiam", "kopi o", "latte", "americano", "gigi coffee", "san francisco coffee", "the alley", "teh ais", "air tebu", "air kelapa", "juice", "jus", "air suam", "air kosong", "ais kosong", "air mineral", "mineral water", "air sirap", "sirap ais", "air a&w", "root beer", "coke", "pepsi", "100plus", "soft drink", "minuman", "drink", "drinks", "milo ais", "teh o ais", "neslo", "horlicks", "air mangga", "tower mango", "medium coke"],
        "Fast Food": ["mcd", "mcdonalds", "mcdonald's", "kfc", "burger king", "pizza hut", "dominos", "a&w", "texas chicken", "subway", "marrybrown", "wingstop", "fast food", "burger", "ayam goreng kfc", "mcd drive thru", "mcchicken", "mcdeluxe", "spicy mcchicken", "spicy chicken mcdeluxe", "big mac", "mcnuggets", "nugget", "french fries", "fries", "kentang goreng", "zinger", "kfc set", "mcd set", "happy meal", "filet o fish", "mcflurry", "ayam goreng spicy", "chicken burger", "beef burger", "onion ring"],
        "Restaurant / Dining": ["restoran", "restaurant", "dining", "makan kat restoran", "sushi king", "sushi", "nandos", "fine dining", "buffet", "kedai makan", "genki sushi", "pizza", "western food", "japanese food", "korean bbq", "hotpot", "soru station", "soru", "dosirak", "korean food", "kimchi", "ramyeon", "tteokbokki", "chicken chop", "chicken chop crispy", "lamb chop", "meatball", "chicken wing", "korean chicken wing", "chicken grill", "creamy mushroom chicken", "nasi lemak ayam berempah", "nasi goreng chicken grill", "dodo korea", "pasta", "spaghetti", "aglio olio", "carbonara", "steak", "mee bandung"],
        "Food Delivery": ["grabfood", "grab food", "foodpanda", "shopeefood", "shopee food", "deliveroo", "food delivery", "delivery makanan", "order makanan", "tapau delivery"],
        "Groceries": ["pasar", "pasar malam", "pasar tani", "mydin", "giant", "aeon", "tesco", "lotuss", "lotus's", "jaya grocer", "99 speedmart", "99 mart", "groceries", "barang dapur", "barang basah", "sayur", "ikan", "ayam", "daging", "beras", "minyak masak", "telur", "econsave", "nsk", "barang runcit", "kedai runcit", "bahan masak", "susu", "roti", "t-mart", "tmart", "kk super mart", "mart", "pasaraya", "supermarket", "hypermarket", "fresh market"],
        "Eating Out": ["makan luar", "makan kat luar", "makan dengan kawan", "lepak makan", "makan bersama", "makan sedap", "tapau", "belanja makan", "dating makan", "makan2", "makan"],
    },
    "transport": {
        "Petrol / Fuel": ["minyak", "petrol", "isi minyak", "petronas", "shell", "petron", "caltex", "bhp", "ron95", "ron97", "diesel", "fuel", "isi petrol", "tank minyak", "minyak motor", "minyak kereta", "petrol kereta"],
        "Toll": ["tol", "toll", "plus tol", "bayar tol", "tol lebuhraya", "tol plus", "smarttag", "rfid tol"],
        "Parking": ["parking", "parkir", "letak kereta", "bayar parking", "parking mall", "saman parking", "seasonal parking", "parking hospital"],
        "Public Transport": ["lrt", "mrt", "bas", "rapidkl", "ktm", "komuter", "monorail", "brt", "public transport", "tren", "ets", "tambang", "bas ekspres", "bas rapid", "tambang bas", "tambang lrt"],
        "Grab / E-hailing": ["grab", "grabcar", "bolt", "indrive", "e-hailing", "ehailing", "maxim", "grab ride", "grab ke office", "grab balik", "grab pergi kerja", "grab pagi"],
        "Taxi": ["teksi", "taxi", "naik teksi", "teksi airport"],
        "Car Maintenance": ["servis kereta", "service kereta", "tukar minyak hitam", "tayar kereta", "bateri kereta", "bengkel", "car service", "brake pad", "alignment", "tukar tayar", "baiki kereta", "aircond kereta"],
        "Motorcycle Maintenance": ["servis motor", "motor service", "tukar tayar motor", "baiki motor", "minyak hitam motor", "rantai motor", "motor kapcai"],
        "Car Insurance / Road Tax": ["road tax", "cukai jalan", "insurans kereta", "car insurance", "puspakom", "renew road tax", "renew insurans kereta", "insurans motor"],
        "Car Wash": ["cuci kereta", "car wash", "cuci motor", "basuh kereta", "kereta cuci"],
        "Public Transport Pass": ["my50", "monthly pass", "pas bulanan", "mylrt pass", "my30", "weekly pass", "pas lrt"],
    },
    "bills": {
        "Rent": ["sewa", "rent", "sewa rumah", "sewa bilik", "bayar sewa", "sewa bulanan", "deposit sewa", "sewa kondo", "sewa apartment"],
        "Mortgage / Housing Loan": ["loan rumah", "housing loan", "ansuran rumah", "mortgage", "bayaran rumah", "pinjaman rumah", "hutang rumah"],
        "Electricity": ["tnb", "bil elektrik", "electric bill", "letrik", "sesb", "bil api", "elektrik", "bil tnb", "bayar tnb", "electricity"],
        "Water": ["syabas", "bil air", "water bill", "pba", "indah water", "iwk", "saj", "sain", "air selangor", "bayar air", "bil air bulanan"],
        "Internet": ["unifi", "wifi", "internet", "time fibre", "maxis fibre", "streamyx", "broadband", "bil unifi", "bil wifi", "fibre", "celcom home"],
        "Mobile Phone": ["prepaid", "topup prepaid", "top up prepaid", "reload", "postpaid", "maxis", "celcom", "digi", "umobile", "u mobile", "hotlink", "yoodo", "tune talk", "redone", "bil telefon", "kredit telefon", "reload digi", "reload maxis", "bil postpaid", "bil phone", "phone bill", "data plan"],
        "Gas": ["gas", "gas memasak", "tong gas", "petronas gas", "tukar tong gas", "gas dapur"],
        "Maintenance Fee": ["maintenance", "yuran penyelenggaraan", "sinking fund", "management fee", "yuran kondo", "maintenance fee", "yuran bulanan kondo", "caj penyelenggaraan"],
        "Household Supplies": ["sabun", "detergen", "tisu", "barang rumah", "plastik sampah", "pencuci", "sabun basuh", "pencuci lantai", "tisu tandas", "sabun pinggan", "barang kebersihan", "kain lap", "pewangi"],
        "Home Repairs": ["baiki rumah", "repair rumah", "tukang paip", "plumber", "tukang elektrik", "cat rumah", "baiki paip", "tukang", "renovate", "ubah suai rumah", "baiki bumbung"],
        "Home Appliances": ["peti sejuk", "mesin basuh", "aircond", "kipas", "tv", "periuk nasi", "rice cooker", "microwave", "vacuum", "penyedut hampagas", "air fryer", "dapur gas", "kettle", "cerek"],
    },
    "shopping": {
        "Clothing": ["baju", "seluar", "tudung", "baju raya", "kemeja", "t-shirt", "uniqlo", "h&m", "jubah", "baju kurung", "cotton on", "padini", "baju melayu", "dress", "jeans", "baju sejuk", "tshirt", "sut", "blouse", "shawl", "seluar jeans", "pakaian"],
        "Shoes": ["kasut", "shoes", "sandal", "nike", "adidas", "vincci", "kasut sekolah", "kasut sukan", "selipar", "kasut raya", "sneakers", "skechers", "puma"],
        "Accessories": ["jam tangan", "beg", "bag", "tali pinggang", "topi", "dompet", "wallet", "gelang", "rantai", "cincin", "beg tangan", "beg sandang", "kerongsang", "cermin mata hitam"],
        "Electronics": ["telefon", "handphone", "laptop", "earbuds", "charger", "kabel", "power bank", "mouse", "keyboard", "monitor", "iphone", "samsung", "tablet", "ipad", "airpods", "kamera", "speaker", "hard disk", "ssd", "casing phone", "screen protector"],
        "Gadgets": ["gadget", "smartwatch", "drone", "gopro", "smart band", "alat elektronik", "smart home", "bluetooth tracker"],
        "Beauty": ["skincare", "solek", "lipstik", "bedak", "sunscreen", "serum", "sephora", "moisturizer", "pencuci muka", "facial", "toner", "mask muka", "perfume", "minyak wangi", "pewangi badan"],
        "Cosmetics": ["makeup", "foundation", "maskara", "eyeliner", "blusher", "cosmetics", "kosmetik", "pensel kening", "lip tint"],
        "Personal Care": ["shampoo", "syampu", "ubat gigi", "deodoran", "gunting rambut", "salon", "barber", "potong rambut", "watsons", "guardian", "sabun mandi", "pad", "tuala wanita", "pencukur", "mandi", "rawatan rambut", "urut", "spa"],
        "Household Items": ["langsir", "cadar", "bantal", "ikea", "mr diy", "mr dollar", "bekas", "rak", "tilam", "selimut", "hiasan rumah", "pasu", "kerusi", "meja", "almari"],
        "Gifts": ["hadiah", "gift", "kado", "beli hadiah", "bunga", "teddy bear", "coklat hadiah"],
        "Online Shopping": ["shopee", "lazada", "tiktok shop", "temu", "zalora", "amazon", "online shopping", "beli online", "order shopee", "order lazada", "cod shopee", "pos laju", "poslaju", "j&t", "caj pos", "shipping", "aliexpress", "shein"],
        "Hobbies": ["hobi", "lego", "pancing", "model kit", "mancing", "joran", "cat air", "craft", "tanaman", "pokok hiasan", "gundam", "koleksi", "figure", "kad pokemon"],
    },
    "health": {
        "Doctor": ["klinik", "doktor", "clinic", "doctor", "konsultasi", "jumpa doktor", "klinik panel", "klinik kesihatan", "bayar klinik", "klinik swasta"],
        "Hospital": ["hospital", "wad", "kecemasan", "bayar hospital", "bil hospital", "emergency room", "caj wad", "pembedahan"],
        "Medicine": ["ubat", "farmasi", "pharmacy", "panadol", "ubat batuk", "ubat demam", "ubat selsema", "plaster", "ubat gastrik", "ubat sakit kepala", "caring pharmacy", "big pharmacy"],
        "Dental": ["gigi", "dentist", "doktor gigi", "scaling", "klinik gigi", "cabut gigi", "tampal gigi", "braces", "pendakap gigi", "dental"],
        "Eye Care": ["cermin mata", "lens", "optometrist", "kanta", "kanta lekap", "contact lens", "kedai cermin mata", "ujian mata", "optik"],
        "Health Check-up": ["medical check up", "ujian darah", "x-ray", "health screening", "saringan kesihatan", "ujian kesihatan", "scan", "mri", "pap smear", "medical checkup"],
        "Health Insurance": ["insurans kesihatan", "medical card", "kad perubatan", "health insurance", "premium kesihatan"],
        "Supplements": ["suplemen", "vitamin", "whey", "protein", "vitamin c", "collagen", "omega 3", "supplement", "minyak ikan", "multivitamin"],
        "Fitness / Gym": ["gym", "fitness", "yoga", "anytime fitness", "yuran gym", "pilates", "pt gym", "personal trainer", "kelas yoga", "member gym", "celebrity fitness", "zumba"],
    },
    "education": {
        "Tuition / Courses": ["tuisyen", "tuition", "kelas", "kursus", "kelas tambahan", "yuran tuisyen", "kelas mengaji", "kelas muzik", "kelas renang", "kelas tuisyen anak"],
        "Books": ["buku", "book", "kedai buku", "popular", "mph", "kinokuniya", "buku teks", "buku latihan", "novel", "buku cerita", "buku rujukan"],
        "Stationery": ["alat tulis", "pen", "pensel", "kertas", "buku nota", "stationery", "kertas a4", "highlighter", "marker", "fail", "pemadam", "pembaris", "gam"],
        "Online Courses": ["udemy", "coursera", "kursus online", "online course", "skillshare", "linkedin learning", "datacamp", "kelas online"],
        "Certification": ["sijil", "exam", "peperiksaan", "ielts", "toefl", "pensijilan", "yuran exam", "cert", "muet", "yuran peperiksaan", "pmp"],
        "Training": ["latihan", "training", "bootcamp", "workshop", "seminar", "yuran latihan", "bengkel latihan", "webinar"],
        "Education Fees": ["yuran", "fees", "yuran sekolah", "yuran universiti", "yuran kolej", "yuran pengajian", "yuran semester", "yuran pta", "yuran tadika", "pendaftaran sekolah"],
        "Student Loan": ["ptptn", "pinjaman pelajar", "student loan", "bayar ptptn", "ptptn bulanan"],
    },
    "entertainment": {
        "Movies": ["wayang", "tgv", "gsc", "movie", "tiket wayang", "lfs", "mbo", "cinema", "tengok wayang", "popcorn wayang", "golden screen"],
        "Games": ["game", "steam", "top up game", "mobile legends", "genshin", "ps5", "playstation", "topup game", "diamond ml", "valorant points", "roblox", "nintendo", "robux", "pubg uc", "free fire diamond"],
        "Concerts": ["konsert", "concert", "tiket konsert", "fan meeting", "tiket konsert coldplay"],
        "Events": ["tiket event", "festival", "pameran", "expo", "tiket festival", "event", "tiket pertunjukan", "teater", "pesta"],
        "Music": ["muzik", "lagu", "alat muzik", "gitar", "piano", "kelas gitar", "dawai gitar"],
        "Sports": ["futsal", "badminton", "sewa gelanggang", "golf", "bowling", "sewa padang", "tenis", "gelanggang badminton", "sewa court", "berenang", "renang", "kayak", "hiking", "mendaki", "larian", "yuran larian", "race marathon"],
        "Recreation": ["karaoke", "lepak", "escape room", "arked", "mini golf", "paintball", "trampoline", "pantai", "kelab malam", "bercuti", "rekreasi", "lepak kafe", "board game cafe"],
        "Theme Parks": ["genting", "sunway lagoon", "legoland", "theme park", "taman tema", "zoo", "aquaria", "bukit merah laketown", "a famosa", "taman air", "water park"],
    },
    "financial": {
        "Credit Card Payment": ["bayar kad kredit", "credit card payment", "bil kad kredit", "bayar credit card", "bayaran kad kredit", "minimum payment kad"],
        "Loan Payment": ["bayar loan", "ansuran", "installment", "ansuran bulanan", "bayar ansuran", "loan kereta", "ansuran kereta", "bayar hutang", "hutang", "bayaran loan", "car loan"],
        "Personal Loan": ["personal loan", "pinjaman peribadi", "loan peribadi", "bayar pinjaman peribadi"],
        "BNPL": ["spaylater", "atome", "grab paylater", "paylater", "bnpl", "shopee paylater", "bayar paylater", "split pay"],
        "Bank Fees": ["caj bank", "bank charge", "yuran tahunan kad", "caj perkhidmatan", "annual fee", "caj transfer", "caj atm", "caj penalti", "service charge bank", "caj lewat"],
        "Interest": ["faedah", "interest", "faedah kad kredit", "bunga pinjaman", "kadar faedah", "interest loan"],
        "Investment": ["saham", "unit trust", "asnb", "asb", "stashaway", "versa", "etf", "emas", "gold", "crypto", "pelaburan", "laburan", "invest", "beli saham", "beli emas", "bitcoin", "forex", "kwsp tambahan", "tabung haji", "ts invest", "wahed", "robo advisor", "reits"],
        "Savings": ["simpanan", "tabung", "savings", "simpan duit", "masuk tabung", "simpanan bulanan", "tabung anak", "tabung kecemasan", "tabung haji simpan", "fd", "fixed deposit"],
        "Emergency Fund": ["dana kecemasan", "emergency fund", "simpanan kecemasan", "tabung kecemasan"],
        "Insurance": ["insurans", "takaful", "prudential", "great eastern", "aia", "premium insurans", "premium takaful", "allianz", "etiqa", "insurans hayat", "bayar takaful"],
        "Taxes": ["cukai", "lhdn", "cukai pendapatan", "income tax", "cukai tanah", "cukai pintu", "cukai taksiran", "bayar lhdn", "cukai harta", "sst"],
    },
    "family": {
        "Parents": ["bagi mak", "bagi ayah", "bagi emak", "duit mak", "belanja mak", "mak ayah", "parents", "bagi mak ayah", "duit ayah", "bagi umi", "bagi abah", "hantar duit kampung", "duit kampung", "bagi ibu"],
        "Children": ["anak", "belanja anak", "duit belanja anak", "sekolah anak", "duit belanja sekolah", "barang anak", "baju anak", "mainan anak", "mainan", "toys"],
        "Spouse / Partner": ["isteri", "suami", "pasangan", "girlfriend", "boyfriend", "belanja isteri", "belanja suami", "belanja pasangan", "bagi isteri", "bagi suami", "date night", "dating"],
        "Allowance": ["duit poket", "allowance", "bagi duit poket", "elaun adik", "duit belanja adik", "pocket money", "duit saku"],
        "Family Expenses": ["keluarga", "adik", "kakak", "abang", "belanja keluarga", "bagi adik", "bagi kakak", "bagi abang", "family", "saudara", "mak long", "pak long", "nenek", "atuk", "bagi nenek"],
        "Baby / Childcare": ["lampin", "pampers", "susu bayi", "tadika", "taska", "nursery", "susu formula", "baby", "bayi", "pengasuh", "yuran taska", "barang bayi", "stroller", "mamypoko"],
        "Pet": ["kucing", "makanan kucing", "cat food", "vet", "anjing", "pasir kucing", "klinik haiwan", "haiwan peliharaan", "pet shop", "makanan anjing", "pet", "vaksin kucing", "ikan hiasan"],
        "Personal Spending": ["belanja diri", "me time", "treat diri", "self care", "hadiah untuk diri", "reward diri"],
        "Charity / Donation": ["sedekah keluarga", "bantu keluarga", "tolong kawan", "bantuan kawan"],
    },
    "travel": {
        "Flight": ["tiket flight", "penerbangan", "airasia", "mas", "batik air", "flight", "tiket kapal terbang", "tiket penerbangan", "firefly", "scoot", "malaysia airlines", "tiket flight balik kampung"],
        "Hotel": ["hotel", "agoda", "booking.com", "airbnb", "homestay", "bayar hotel", "tempahan hotel", "resort", "inap hotel", "bilik hotel", "traveloka"],
        "Accommodation": ["penginapan", "chalet", "hostel", "accommodation", "inap", "sewa chalet", "villa", "guesthouse"],
        "Transport": ["sewa kereta", "car rental", "grab oversea", "bas ke singapore", "tiket bas", "tiket tren", "feri", "ferry", "tiket feri", "sewa motor", "teksi airport"],
        "Food": ["makan bercuti", "makan holiday", "makan travel", "makan semasa cuti", "makanan cuti", "street food"],
        "Activities": ["tiket masuk", "tour", "snorkeling", "diving", "aktiviti", "pakej tour", "kayaking", "island hopping", "tiket tarikan", "guide", "pakej percutian"],
        "Travel Insurance": ["insurans perjalanan", "travel insurance", "insurans travel"],
        "Travel Shopping": ["cenderahati", "souvenir", "oleh-oleh", "duty free", "beli buah tangan", "buah tangan", "shopping cuti"],
        "Visa / Passport": ["visa", "pasport", "passport", "renew pasport", "permohonan visa", "visa jepun", "gambar pasport"],
    },
    "work": {
        "Work Meals": ["lunch meeting", "makan pejabat", "makan dengan client", "makan office", "belanja client makan", "makan team", "team lunch", "makan kerja"],
        "Work Transport": ["grab kerja", "transport kerja", "parking pejabat", "tol kerja", "tol office", "grab client", "claim transport", "parking office", "perjalanan kerja"],
        "Work Equipment": ["peralatan kerja", "monitor kerja", "kerusi pejabat", "laptop kerja", "peralatan office", "alat kerja", "headset kerja"],
        "Office Supplies": ["alat pejabat", "kertas office", "toner", "printer", "tinta printer", "office supplies", "stapler", "dakwat printer", "fail office"],
        "Business Expenses": ["belanja bisnes", "modal bisnes", "kos bisnes", "stok barang", "bahan jualan", "stok jualan", "business expense", "sewa kedai", "sewa gerai", "bungkusan jualan", "upah pekerja"],
        "Freelance Expenses": ["kos freelance", "belanja freelance", "software freelance", "domain", "hosting", "ads facebook", "iklan fb", "boost ads", "kos projek"],
        "Professional Membership": ["yuran ahli", "membership profesional", "yuran persatuan", "yuran lembaga", "yuran mia", "yuran ahli persatuan", "yuran profesional"],
        "Work Clothing": ["baju kerja", "uniform", "kasut kerja", "pakaian kerja", "blazer", "baju korporat", "tali leher"],
    },
    "subscriptions": {
        "Netflix": ["netflix", "langganan netflix", "bil netflix"],
        "Spotify": ["spotify", "langganan spotify", "spotify premium", "apple music", "joox", "youtube music"],
        "YouTube": ["youtube", "youtube premium", "youtube tv"],
        "Cloud Storage": ["icloud", "google one", "dropbox", "cloud storage", "onedrive", "storan awan", "google drive storage"],
        "Software": ["adobe", "microsoft 365", "office 365", "canva", "notion", "software", "figma", "langganan software", "jetbrains", "antivirus", "vpn", "nordvpn", "1password", "langganan app"],
        "AI Tools": ["chatgpt", "claude", "copilot", "ai tools", "midjourney", "perplexity", "gemini", "ai subscription", "chatgpt plus", "claude pro", "cursor"],
        "Gaming": ["xbox game pass", "ps plus", "playstation plus", "nintendo online", "game pass", "steam wallet", "epic games", "ea play"],
        "News / Publications": ["berita", "akhbar", "majalah", "news subscription", "the star", "malaysiakini", "langganan akhbar", "medium", "substack", "langganan berita", "nst"],
        "Memberships": ["disney+", "disney plus", "viu", "iqiyi", "hbo", "astro", "ahli bulanan", "membership", "langganan", "astro njoi", "apple tv", "wetv", "prime video", "amazon prime", "tonton", "unifi tv", "bayar langganan", "membership bulanan"],
    },
    "gifts": {
        "Birthday": ["hadiah hari jadi", "birthday", "hari lahir", "kek hari jadi", "hadiah birthday", "surprise birthday", "belanja birthday", "party birthday", "kek birthday"],
        "Wedding": ["kahwin", "sumbangan kahwin", "kad kahwin", "duit kahwin", "salam kahwin", "hadiah kahwin", "majlis kahwin", "duit sumbangan kenduri", "kenduri", "wedding gift", "pemberian kahwin", "bagi kahwin"],
        "Anniversary": ["anniversary", "ulang tahun perkahwinan", "hadiah anniversary", "ulang tahun", "makan anniversary"],
        "Festive / Raya": ["duit raya", "sampul raya", "kuih raya", "ang pau", "angpow", "hamper raya", "raya", "juadah raya", "bagi duit raya", "angpau", "chinese new year", "hari raya", "deepavali", "cny", "kuih bahulu", "ketupat", "lemang"],
        "Christmas": ["christmas", "krismas", "hadiah christmas", "secret santa", "kad christmas"],
        "Valentine's Day": ["valentine", "valentines", "bunga valentine", "hadiah valentine", "dinner valentine"],
        "Graduation": ["konvokesyen", "graduation", "hadiah graduation", "jubah konvo", "hadiah konvo", "gambar konvo", "bunga konvo"],
        "Other Gifts": ["hadiah kawan", "hadiah cikgu", "hadiah rakan", "hadiah baby", "gift rakan sekerja", "hadiah ibu", "hadiah ayah", "hadiah mak", "hadiah teacher", "cenderahati kawan"],
    },
    "religious": {
        "Zakat": ["zakat", "zakat fitrah", "zakat pendapatan", "zakat harta", "bayar zakat", "zakat emas", "zakat perniagaan", "zakat simpanan"],
        "Donation": ["derma", "sedekah", "donation", "derma masjid", "derma anak yatim", "derma bencana", "sedekah subuh", "sedekah jumaat", "derma tabung", "sumbangan"],
        "Mosque / Surau": ["masjid", "surau", "tabung masjid", "tabung surau", "derma surau", "tabung jumaat", "tabung musolla"],
        "Religious Activities": ["kelas agama", "umrah", "haji", "kuliah", "kelas fardhu ain", "korban", "qurban", "aqiqah", "bayar umrah", "tabung haji bayar", "kursus haji", "ustaz", "yuran kelas agama", "ceramah", "maulidur rasul"],
        "Community Activities": ["gotong-royong", "kutipan", "sumbangan kejiranan", "kutipan taman", "kenduri kampung", "sumbangan kampung", "yuran kariah", "yuran jawatankuasa", "persatuan penduduk", "yuran rt"],
        "Charity": ["wakaf", "amal", "charity", "badan kebajikan", "tabung amal", "wakaf al-quran", "tabung kebajikan", "infaq", "sumbangan amal", "kutipan amal"],
    },
    "other": {
        "Uncategorized": ["lain-lain", "misc", "entah", "tak tahu", "belanja lain", "lain2", "tak ingat", "miscellaneous", "belanja entah apa", "something"],
        "Other": ["lain", "other", "belanja lain-lain", "perbelanjaan lain", "pelbagai", "others"],
        "Unexpected Expense": ["tak sangka", "emergency", "denda", "saman", "perbelanjaan tak dijangka", "kemalangan", "kena saman", "kena denda", "saman trafik", "saman jpj", "hilang barang", "rosak", "barang rosak", "kecurian"],
    },
    # income categories
    "income": {
        "Salary": ["gaji", "salary", "gaji bulan ni", "pay", "gaji masuk", "payslip", "gaji kerja", "gaji pokok", "gaji bulan lepas", "gaji ke bank", "salary credited", "gaji bonus"],
        "Overtime": ["overtime", "ot", "kerja lebih masa", "bayaran ot", "ot bulan ni", "kerja lebih", "overtime pay", "elaun ot"],
        "Bonus": ["bonus", "bonus tahunan", "bonus raya", "bonus prestasi", "annual bonus", "angpau bonus", "bonus syarikat", "bonus kpi"],
        "Commission": ["komisen", "commission", "komisyen jualan", "sales commission", "komisen jualan", "komisen agen", "commission bulan ni"],
        "Allowance": ["elaun", "allowance", "elaun perjalanan", "elaun makan", "elaun tetap", "elaun kerja", "elaun telefon", "elaun biasiswa", "biasiswa", "elaun latihan"],
    },
    "freelance": {
        "Freelance": ["freelance", "projek", "side income", "kerja freelance", "bayaran projek", "invoice dibayar", "bayaran client", "client bayar", "gig", "kerja part time", "part time", "upah", "upah projek", "kerja sampingan"],
        "Business": ["jual", "business", "untung", "untung jualan", "hasil jualan", "jualan", "hasil bisnes", "untung bisnes", "bisnes", "jualan online", "jual barang", "jual kuih", "jual baju", "jual kereta lama", "hasil kedai", "sales"],
    },
    "investment": {
        "Dividend": ["dividen", "dividend", "dividen asb", "dividen saham", "dividen kwsp", "agihan pendapatan", "dividen unit trust", "agihan asnb"],
        "Interest": ["faedah simpanan", "interest simpanan", "bunga simpanan", "interest bank", "interest fd", "profit fd", "keuntungan simpanan", "keuntungan tabung haji", "profit akaun"],
        "Rental Income": ["terima sewa", "sewa rumah masuk", "rental income", "sewa diterima", "sewa bilik masuk", "pendapatan sewa", "sewa kedai masuk", "tenant bayar", "penyewa bayar", "sewa masuk"],
        "Investment Return": ["untung saham", "keuntungan pelaburan", "profit trading", "untung emas", "untung crypto", "return pelaburan", "hasil pelaburan", "jual saham", "untung forex", "profit saham", "keuntungan modal"],
        "Royalties": ["royalti", "royalty", "hasil royalti", "bayaran royalti", "royalti buku", "royalti lagu", "royalti app"],
    },
    "otherincome": {
        "Cashback": ["cashback", "cash back", "cashback kad", "cashback grab", "rebate", "tng cashback", "cashback shopee", "cashback maybank", "rebat"],
        "Refund": ["refund", "bayaran balik", "pulangan wang", "duit dipulangkan", "refund shopee", "pulangan duit", "refund tiket", "balik duit", "refund lazada", "wang dikembalikan"],
        "Reimbursement": ["reimbursement", "claim", "tuntutan", "claim kerja", "tuntutan perubatan", "claim office", "claim dibayar", "bayar balik syarikat", "tuntutan perjalanan"],
        "Gift Received": ["hadiah terima", "duit raya terima", "dapat duit raya", "hadiah duit", "angpau terima", "bagi duit", "diberi duit", "mak bagi", "ayah bagi", "orang bagi duit", "kawan bagi", "dapat hadiah duit", "duit pemberian", "sumbangan kawan"],
        "Government Assistance": ["bantuan", "str", "sumbangan tunai rahmah", "bsh", "bantuan kerajaan", "sara hidup", "bantuan sara hidup", "bpr", "bantuan prihatin", "zakat terima", "bantuan zakat", "jkm", "bantuan jkm", "bantuan pelajar", "sumbangan asas rahmah", "sara", "madani"],
        "Other Income": ["pendapatan lain", "income lain", "lain-lain pendapatan", "duit masuk", "duit lebih", "other income", "pendapatan tambahan", "dapat duit", "jumpa duit", "menang cabutan", "menang hadiah"],
    },
}

EXPENSE_CATEGORY_IDS = ["food", "transport", "bills", "shopping", "health", "education", "entertainment", "financial", "family", "travel", "work", "subscriptions", "gifts", "religious", "other"]
INCOME_CATEGORY_IDS = ["income", "freelance", "investment", "otherincome"]

# --- slots used by the intent templates ---

ACCOUNTS = [
    "tunai", "cash", "duit tunai", "bank", "maybank", "cimb", "public bank", "rhb", "bank islam", "hong leong", "ambank", "bsn", "uob", "ocbc", "hsbc", "affin", "bank rakyat", "agrobank", "mbsb",
    "tng", "touch n go", "tng ewallet", "touch 'n go", "grabpay", "boost", "shopee pay", "shopeepay", "bigpay", "mae", "ewallet", "e-wallet", "dompet digital",
    "savings", "simpanan", "tabung", "akaun simpanan", "kad kredit", "credit card", "debit card", "kad debit", "akaun semasa", "akaun bank", "akaun utama", "akaun gaji", "tabung haji", "asb", "wise", "gxbank", "aeon bank", "boost bank",
]

WHEN = [
    "hari ni", "hari ini", "semalam", "tadi", "kelmarin", "pagi tadi", "malam tadi", "petang tadi", "tengah hari tadi", "today", "yesterday", "last night", "this morning",
    "isnin lepas", "jumaat lepas", "sabtu lepas", "ahad lepas", "last monday", "last friday", "3 hari lepas", "2 hari lepas", "5 hari lepas", "3 days ago", "2 days ago", "minggu lepas", "semalam petang",
]

PERIODS = [
    "bulan ni", "bulan ini", "bulan lepas", "bulan sudah", "minggu ni", "minggu ini", "minggu lepas", "tahun ni", "tahun ini", "3 bulan lepas", "6 bulan lepas", "sebulan lepas", "hari ni", "semalam",
    "this month", "last month", "this week", "last week", "this year", "last 3 months", "last 6 months", "past 3 months", "past month", "today", "yesterday", "sepanjang tahun", "sejak awal tahun", "12 bulan lepas", "setahun lepas", "30 hari lepas", "7 hari lepas",
]

MERCHANTS = [
    "grab", "shopee", "lazada", "mcd", "kfc", "petronas", "shell", "starbucks", "tng", "mydin", "aeon", "giant", "tesco", "99 speedmart", "watsons", "guardian", "uniqlo", "tealive", "zus coffee", "7-eleven", "kk mart", "foodpanda", "grabfood", "netflix", "spotify", "unifi", "maxis", "tnb", "syabas", "boost", "tiktok shop", "mr diy", "ikea", "popular", "tgv", "gsc", "klinik",
]

CATEGORY_WORDS = [
    "makan", "makanan", "food", "minyak", "petrol", "transport", "pengangkutan", "shopping", "beli belah", "bil", "bills", "hiburan", "entertainment", "kesihatan", "health", "pendidikan", "education", "langganan", "subscription", "kopi", "grab", "belanja online", "runcit", "groceries", "pakaian", "travel", "percutian", "hadiah", "gifts", "zakat", "derma", "keluarga", "family", "kereta", "rumah", "sewa", "internet", "telefon", "tol", "parking",
]

AMOUNTS_SMALL = [1, 2, 2.5, 3, 3.5, 4, 5, 5.5, 6, 7, 8, 8.5, 9, 10, 12, 12.5, 13, 15, 16, 18, 20, 22, 25, 28, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 120, 150, 200, 250, 300, 350, 500]
AMOUNTS_BIG = [800, 1000, 1200, 1500, 1800, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6500, 8000]
