import type { Lang } from '@/i18n';

export type ChangeKind = 'new' | 'improved' | 'fixed';
export type ChangeEntry = { kind: ChangeKind; text: string; ms: string };
export type Release = { version: string; date: string; title: string; titleMs: string; changes: ChangeEntry[] };

export const CURRENT_VERSION = '1.1.0';

export const CHANGELOG: Release[] = [
  {
    version: '1.1.0',
    date: '2026-10-06',
    title: 'Your money, on every phone', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Wang anda, di setiap telefon',
    changes: [
      { kind: 'new', text: 'Real accounts in the cloud: sign in on a new or replacement phone and all your records are there, with nothing to key in again.', ms: 'Akaun sebenar dalam awan: log masuk di telefon baharu atau ganti dan semua rekod anda ada, tanpa perlu menaip semula.' }, // i18n-ignore
      { kind: 'new', text: 'Confirm your email with a 6-digit code, and reset a forgotten password the same way.', ms: 'Sahkan e-mel anda dengan kod 6 digit, dan tetapkan semula kata laluan yang terlupa dengan cara yang sama.' }, // i18n-ignore
      { kind: 'new', text: 'Moving from an old account that lived only on your phone? You can bring its records across once, right after you sign in.', ms: 'Datang dari akaun lama yang hanya ada pada telefon anda? Anda boleh membawa rekodnya sekali sahaja, sebaik sahaja log masuk.' }, // i18n-ignore
      { kind: 'improved', text: 'The app still works without internet. Changes upload by themselves when you are back online, and More > Settings shows the sync status with a Sync now button.', ms: 'Aplikasi masih berfungsi tanpa internet. Perubahan dimuat naik sendiri apabila anda kembali dalam talian, dan Lagi > Tetapan menunjukkan status penyegerakan dengan butang Segerakkan sekarang.' }, // i18n-ignore
    ],
  },
  {
    version: '1.0.12',
    date: '2026-10-06',
    title: 'Fully in your language', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Sepenuhnya dalam bahasa anda',
    changes: [
      { kind: 'new', text: 'Choose English or Bahasa Melayu in More > Settings > Language. The whole app follows your choice, with no mixing of the two.', ms: 'Pilih Bahasa Melayu atau English di Lagi > Tetapan > Bahasa. Seluruh aplikasi mengikut pilihan anda, tanpa campur aduk dua bahasa.' }, // i18n-ignore
      { kind: 'improved', text: 'Months, weekdays, charts, reminders, insights and the starter categories and accounts now speak your language too.', ms: 'Bulan, hari, carta, peringatan, pandangan dan kategori serta akaun permulaan kini juga mengikut bahasa anda.' }, // i18n-ignore
    ],
  },
  {
    version: '1.0.11',
    date: '2026-10-05',
    title: 'Songket Diraja, Batik, Titanium & a new Glass', // i18n-ignore: bilingual data, see titleMs
    titleMs: "Songket Diraja, Batik, Titanium & Glass baharu",
    changes: [
      { kind: 'new', text: 'Songket Diraja card — royal merah hati songket woven with gold: bunga tabur across the cloth, a kepala kain edged with pucuk rebung, gold threads that glint and a gold shimmer.', ms: "Kad Songket Diraja — songket merah hati diraja bertenun emas: bunga tabur di seluruh kain, kepala kain bertepi pucuk rebung, benang emas yang berkilau dan kilauan emas." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Batik card — a hand-drawn Malaysian batik: a large bunga raya that sways gently, leaves and awan larat outlined in wax, colours that bleed like dye and a silk sheen.', ms: "Kad Batik — batik Malaysia lukisan tangan: bunga raya besar yang beralun perlahan, daun dan awan larat berlakar lilin, warna yang meresap seperti pewarna dan kilauan sutera." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Titanium card — a black titanium card with brushed-metal grain, a fine engraved wave pattern, a metal chip, a chamfered edge and a soft band of light that glides across. Find it under Premium when you add or edit an account.', ms: "Kad Titanium — kad titanium hitam dengan butiran logam berus, corak ombak halus yang terukir, cip logam, tepi serong dan jalur cahaya lembut yang meluncur melintasinya. Anda boleh menemuinya di bawah Premium apabila menambah atau mengubah akaun." }, // i18n-ignore: bilingual, see ms
      { kind: 'improved', text: 'Aurora card reimagined — northern lights dancing over snowy peaks, a still lake that mirrors them, pines on the shore and a cabin with a warm light on. Stars twinkle and a shooting star crosses the sky now and then.', ms: "Kad Aurora direka semula — cahaya utara menari di atas puncak bersalji, tasik tenang yang memantulkannya, pokok pain di tepi tasik dan sebuah pondok dengan lampu yang hangat. Bintang berkelip dan sesekali bintang jatuh melintasi langit." }, // i18n-ignore: bilingual, see ms
      { kind: 'improved', text: 'Glass card redesigned — coloured light inside polished glass, a bright reflection across the surface, bevelled edges and a rainbow glint along the bottom edge.', ms: "Kad Glass direka semula — cahaya berwarna di dalam kaca berkilat, pantulan terang pada permukaan, tepi bersegi dan kilau pelangi di sepanjang tepi bawah." }, // i18n-ignore: bilingual, see ms
      { kind: 'improved', text: 'The Premium design picker now has six cards in two rows: Songket, Glass, Aurora, Titanium, Diraja and Batik.', ms: "Pemilih reka bentuk Premium kini mempunyai enam kad dalam dua baris: Songket, Glass, Aurora, Titanium, Diraja dan Batik." }, // i18n-ignore: bilingual, see ms
      { kind: 'improved', text: 'Fresh look for the free card designs — Aurora gets a soft mesh of light, Gradient gets glowing rings, Stripes gets bold bands and Solid gets a gentle sheen. All of them have a polished edge and work with any colour.', ms: "Rupa baharu untuk reka bentuk kad percuma — Aurora mendapat jalinan cahaya lembut, Gradien mendapat gelang bercahaya, Jalur mendapat jalur tebal dan Pepejal mendapat kilau lembut. Kesemuanya bertepi licin dan sesuai dengan sebarang warna." }, // i18n-ignore: bilingual, see ms
    ],
  },
  {
    version: '1.0.10',
    date: '2026-10-05',
    title: 'Your settings are remembered', // i18n-ignore: bilingual data, see titleMs
    titleMs: "Tetapan anda diingati",
    changes: [
      { kind: 'fixed', text: 'Light / dark / system theme is now remembered, so the app opens the way you left it.', ms: "Tema cerah / gelap / sistem kini diingati, jadi aplikasi dibuka seperti yang anda tinggalkan." }, // i18n-ignore: bilingual, see ms
      { kind: 'fixed', text: 'The warning percentage and daily spending guideline are saved per account instead of resetting every time you open the app.', ms: "Peratusan amaran dan garis panduan perbelanjaan harian kini disimpan bagi setiap akaun dan tidak lagi ditetapkan semula setiap kali anda membuka aplikasi." }, // i18n-ignore: bilingual, see ms
      { kind: 'fixed', text: 'The "hide amounts" eye stays on or off between visits.', ms: "Ikon mata “sembunyikan jumlah” kekal dihidupkan atau dimatikan antara lawatan." }, // i18n-ignore: bilingual, see ms
    ],
  },
  {
    version: '1.0.9',
    date: '2026-10-05',
    title: 'Flip cards & a clearer Glass design', // i18n-ignore: bilingual data, see titleMs
    titleMs: "Kad boleh dibalikkan & reka bentuk Glass yang lebih jelas",
    changes: [
      { kind: 'new', text: 'Flip your premium card — tap the flip button next to the eye to turn it over and see your income and spending for the month. Tap it again to flip back.', ms: "Balikkan kad premium anda — ketik butang balik di sebelah ikon mata untuk memusingkannya dan lihat pendapatan serta perbelanjaan anda bulan ini. Ketik sekali lagi untuk membalikkannya semula." }, // i18n-ignore: bilingual, see ms
      { kind: 'improved', text: 'Glass card redesigned — a frosted glass plate over soft colour, with light rings that blur where the glass covers them.', ms: "Kad Glass direka semula — kepingan kaca berkabus di atas warna lembut, dengan gelang cahaya yang kabur di tempat kaca menutupinya." }, // i18n-ignore: bilingual, see ms
      { kind: 'improved', text: 'Aurora card redesigned — northern lights over a starry sky and hills, with slow-moving light curtains and twinkling stars.', ms: "Kad Aurora direka semula — cahaya utara di atas langit berbintang dan bukit, dengan tirai cahaya yang bergerak perlahan dan bintang yang berkelip." }, // i18n-ignore: bilingual, see ms
      { kind: 'fixed', text: 'Removed a stray horizontal line that cut across the premium cards.', ms: "Membuang garisan mendatar sesat yang memotong kad premium." }, // i18n-ignore: bilingual, see ms
    ],
  },
  {
    version: '1.0.8',
    date: '2026-10-01',
    title: 'Liquid glass', // i18n-ignore: bilingual data, see titleMs
    titleMs: "Kaca cecair",
    changes: [
      { kind: 'new', text: 'Liquid Glass on iPhone with iOS 26 or later: a floating glass tab bar, glass cards and a soft colour glow behind Home.', ms: "Liquid Glass pada iPhone dengan iOS 26 atau lebih baharu: bar tab kaca terapung, kad kaca dan cahaya warna lembut di belakang Utama." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'A glass lens that swells when you touch it, glides under the tab you pick, stretches with your speed, and follows your finger when you drag. Sideways drags no longer wobble the screen up and down. Same lens on the switches for Expense / Income, periods and filters.', ms: "Kanta kaca yang mengembang apabila anda menyentuhnya, meluncur di bawah tab yang anda pilih, memanjang mengikut kelajuan anda dan mengikut jari anda apabila diseret. Seretan ke tepi tidak lagi menggoyangkan skrin ke atas dan ke bawah. Kanta yang sama digunakan pada suis Perbelanjaan / Pendapatan, tempoh dan penapis." }, // i18n-ignore: bilingual, see ms
      { kind: 'improved', text: 'Older iPhones and Android phones get a real frosted-glass blur that follows the same design (the tab bar blurs what scrolls behind it on Android 12 and newer).', ms: "iPhone lama dan telefon Android mendapat kabur kaca berkabus yang sebenar mengikut reka bentuk yang sama (bar tab mengaburkan apa yang digulung di belakangnya pada Android 12 dan lebih baharu)." }, // i18n-ignore: bilingual, see ms
    ],
  },
  {
    version: '1.0.7',
    date: '2026-10-01',
    title: 'A fresh look for WaKira', // i18n-ignore: bilingual data, see titleMs
    titleMs: "Wajah baharu untuk WaKira",
    changes: [
      { kind: 'improved', text: 'New colour palette: ink indigo, pandan green and a touch of songket gold, in both light and dark mode.', ms: "Palet warna baharu: indigo dakwat, hijau pandan dan sedikit emas songket, dalam mod cerah dan gelap." }, // i18n-ignore: bilingual, see ms
      { kind: 'improved', text: 'Cleaner foundations under the hood: shared buttons, chips, forms and sheets so every screen looks and behaves the same.', ms: "Asas yang lebih kemas di sebalik tabir: butang, cip, borang dan helaian yang dikongsi supaya setiap skrin kelihatan dan berfungsi sama." }, // i18n-ignore: bilingual, see ms
    ],
  },
  {
    version: '1.0.6',
    date: '2026-10-01',
    title: 'Premium card designs: Songket, Glass & Aurora', // i18n-ignore: bilingual data, see titleMs
    titleMs: "Reka bentuk kad premium: Songket, Glass & Aurora",
    changes: [
      { kind: 'new', text: 'Songket card — black and gold with a woven songket pattern, a pucuk rebung border and a gold shimmer that sweeps across the card.', ms: "Kad Songket — hitam dan emas dengan corak songket tenunan, sempadan pucuk rebung dan kilauan emas yang menyapu kad." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Glass card — frosted glass with soft, slowly moving colours behind it.', ms: "Kad Glass — kaca berkabus dengan warna lembut yang bergerak perlahan di belakangnya." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Aurora card — a dark card with slow-moving northern lights.', ms: "Kad Aurora — kad gelap dengan cahaya utara yang bergerak perlahan." }, // i18n-ignore: bilingual, see ms
      { kind: 'improved', text: 'The new cards follow the hide-amounts setting, just like your other account cards.', ms: "Kad baharu mengikut tetapan sembunyikan jumlah, sama seperti kad akaun anda yang lain." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Premium cards tilt in 3D under your finger, with a light sheen that follows. Turn on “Tilt with phone” in Settings to let them lean as you move your phone.', ms: "Kad premium condong dalam 3D di bawah jari anda, disertai kilauan cahaya yang mengikut. Hidupkan “Condong dengan telefon” dalam Tetapan supaya kad condong apabila anda menggerakkan telefon." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Pick a premium design when you add or edit an account — it shows on your Home cards.', ms: "Pilih reka bentuk premium apabila anda menambah atau mengubah akaun — ia dipaparkan pada kad Utama anda." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Add your own account types with the + button, e.g. Savings, ASB or Crypto.', ms: "Tambah jenis akaun anda sendiri dengan butang +, cth. Simpanan, ASB atau Kripto." }, // i18n-ignore: bilingual, see ms
      { kind: 'improved', text: 'Add/edit account: the design picker now sits right under the card preview.', ms: "Tambah/ubah akaun: pemilih reka bentuk kini terletak betul-betul di bawah pratonton kad." }, // i18n-ignore: bilingual, see ms
      { kind: 'improved', text: 'Add/edit account: pick the card design right under the preview, and add your own account types with +.', ms: "Tambah/ubah akaun: pilih reka bentuk kad terus di bawah pratonton, dan tambah jenis akaun anda sendiri dengan +." }, // i18n-ignore: bilingual, see ms
    ],
  },
  {
    version: '1.0.5',
    date: '2026-10-01',
    title: 'Smarter set-up & refreshed tutorial', // i18n-ignore: bilingual data, see titleMs
    titleMs: "Persediaan lebih bijak & tutorial yang disegarkan",
    changes: [
      { kind: 'new', text: 'New accounts can now add their net salary (fixed or "confirm each time") and a first savings goal while setting up. Both are optional.', ms: "Akaun baharu kini boleh menambah gaji bersih (tetap atau “sahkan setiap kali”) dan matlamat simpanan pertama semasa persediaan. Kedua-duanya pilihan." }, // i18n-ignore: bilingual, see ms
      { kind: 'improved', text: 'The tutorial now covers Analyse, Rancang, Recurring, transfers, Assets under More and reminders.', ms: "Tutorial kini merangkumi Faham, Rancang, Berulang, pindahan, Aset di bawah Lagi dan peringatan." }, // i18n-ignore: bilingual, see ms
    ],
  },
  {
    version: '1.0.4',
    date: '2026-10-01',
    title: 'Rancang: savings goals, upcoming bills & reminders', // i18n-ignore: bilingual data, see titleMs
    titleMs: "Rancang: matlamat simpanan, bil akan datang & peringatan",
    changes: [
      { kind: 'new', text: 'Rancang — a new planning hub under More: savings goals, upcoming bills, your budget at a glance and reminders in one place.', ms: "Rancang — hab perancangan baharu di bawah Lagi: matlamat simpanan, bil akan datang, ringkasan bajet anda dan peringatan di satu tempat." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Savings goals — set a target and an optional deadline, add or take out money, and see how much to set aside each month and whether you are on track. Goals never change your account balances.', ms: "Matlamat simpanan — tetapkan sasaran dan tarikh akhir pilihan, tambah atau keluarkan wang, dan lihat berapa banyak yang perlu diketepikan setiap bulan serta sama ada anda berada di landasan yang betul. Matlamat tidak pernah mengubah baki akaun anda." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Upcoming bills — what is due in the next 30 days, taken from your Recurring items.', ms: "Bil akan datang — apa yang perlu dibayar dalam 30 hari akan datang, diambil daripada item Berulang anda." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Reminders — optional notifications before bills are due, a nudge to enter your real pay, and budget alerts when a category nears or passes its limit.', ms: "Peringatan — pemberitahuan pilihan sebelum bil perlu dibayar, peringatan untuk memasukkan gaji sebenar anda, dan amaran bajet apabila sesuatu kategori menghampiri atau melepasi hadnya." }, // i18n-ignore: bilingual, see ms
      { kind: 'fixed', text: 'Fixed the menu link type for Assets under More.', ms: "Membetulkan jenis pautan menu untuk Aset di bawah Lagi." }, // i18n-ignore: bilingual, see ms
    ],
  },
  {
    version: '1.0.3',
    date: '2026-10-01',
    title: 'Analyse tab & Assets moved to More', // i18n-ignore: bilingual data, see titleMs
    titleMs: "Tab Faham & Aset dipindahkan ke Lagi",
    changes: [
      { kind: 'improved', text: 'The Faham insights now live in the new Analyse tab, right where Assets used to be.', ms: "Pandangan Faham kini berada dalam tab Faham yang baharu, di tempat Aset dahulu." }, // i18n-ignore: bilingual, see ms
      { kind: 'improved', text: 'Assets moved to More → Assets (accounts, net worth and transfers work exactly as before).', ms: "Aset dipindahkan ke Lagi → Aset (akaun, nilai bersih dan pindahan berfungsi seperti biasa)." }, // i18n-ignore: bilingual, see ms
    ],
  },
  {
    version: '1.0.2',
    date: '2026-09-30',
    title: 'Faham tab, transfers & recurring', // i18n-ignore: bilingual data, see titleMs
    titleMs: "Tab Faham, pindahan & transaksi berulang",
    changes: [
      { kind: 'new', text: 'Faham tab — income vs spending month by month, where your money goes (with subcategories and change vs before), your priciest weekday, biggest expense and a few plain-language insights.', ms: "Tab Faham — pendapatan berbanding perbelanjaan bulan demi bulan, ke mana wang anda pergi (dengan subkategori dan perubahan berbanding sebelum ini), hari paling mahal, perbelanjaan terbesar dan beberapa pandangan dalam bahasa yang mudah." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Transfers — move money between your own accounts (Bank → Cash, top up an e-wallet) from the + button or the Assets tab. Balances update, but transfers never count as income or spending.', ms: "Pindahan — pindahkan wang antara akaun anda sendiri (Bank → Tunai, tambah nilai e-dompet) daripada butang + atau tab Aset. Baki dikemas kini, tetapi pindahan tidak pernah dikira sebagai pendapatan atau perbelanjaan." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Recurring transactions — schedule rent, salary or subscriptions (daily, weekly, monthly or yearly) under More → Recurring. They are recorded automatically when the date arrives.', ms: "Transaksi berulang — jadualkan sewa, gaji atau langganan (harian, mingguan, bulanan atau tahunan) di bawah Lagi → Berulang. Ia direkodkan secara automatik apabila tarikhnya tiba." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Recurring "Confirm each time" — for pay that changes or bills like electricity. On each date you enter the real amount (e.g. your net pay) and only then is it recorded. A banner on Home reminds you.', ms: "Berulang “Sahkan setiap kali” — untuk gaji yang berubah atau bil seperti elektrik. Pada setiap tarikh anda memasukkan jumlah sebenar (cth. gaji bersih anda) dan barulah ia direkodkan. Sepanduk di Utama akan mengingatkan anda." }, // i18n-ignore: bilingual, see ms
    ],
  },
  {
    version: '1.0.1',
    date: '2026-09-29',
    title: 'WaKira, budgets, custom categories & itemised transactions', // i18n-ignore: bilingual data, see titleMs
    titleMs: "WaKira, bajet, kategori tersuai & transaksi terperinci",
    changes: [
      { kind: 'new', text: 'Money Tracker is now WaKira — Kira. Faham. Rancang. (Track, understand, plan.)', ms: "Money Tracker kini WaKira — Kira. Faham. Rancang." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Budgeting — set a monthly limit per category and track pace, projections and status under More → Budgets.', ms: "Bajet — tetapkan had bulanan bagi setiap kategori dan jejaki kadar, unjuran dan status di bawah Lagi → Bajet." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Custom categories — add your own expense or income categories with icons, colours and subcategories under More → Categories.', ms: "Kategori tersuai — tambah kategori perbelanjaan atau pendapatan anda sendiri dengan ikon, warna dan subkategori di bawah Lagi → Kategori." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Itemised transactions — break a purchase into line items (food, drinks, service charge, SST, etc.) and the total adds up automatically.', ms: "Transaksi terperinci — pecahkan sesuatu pembelian kepada item baris (makanan, minuman, caj perkhidmatan, SST dan sebagainya) dan jumlahnya dikira secara automatik." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Vector icons replace emoji on accounts and categories, with a searchable icon picker.', ms: "Ikon vektor menggantikan emoji pada akaun dan kategori, dengan pemilih ikon yang boleh dicari." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Assets now shows a donut chart of your accounts, switchable between "By account" and "By type".', ms: "Aset kini menunjukkan carta donat akaun anda, boleh ditukar antara “Mengikut akaun” dan “Mengikut jenis”." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Edit and delete transactions and accounts by tapping them.', ms: "Ubah dan padam transaksi serta akaun dengan mengetik padanya." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Settings screen — theme (System/Light/Dark), hide-amounts, budget warning threshold, export & reset.', ms: "Skrin Tetapan — tema (Sistem/Cerah/Gelap), sembunyikan jumlah, ambang amaran bajet, eksport & tetapan semula." }, // i18n-ignore: bilingual, see ms
      { kind: 'improved', text: 'Transactions screen redesigned with month switching, search, category breakdown and CSV export.', ms: "Skrin Transaksi direka semula dengan penukaran bulan, carian, pecahan kategori dan eksport CSV." }, // i18n-ignore: bilingual, see ms
      { kind: 'improved', text: 'Home screen groups recent transactions by day with quick filters.', ms: "Skrin Utama mengumpulkan transaksi terkini mengikut hari dengan penapis pantas." }, // i18n-ignore: bilingual, see ms
      { kind: 'fixed', text: 'Removed a leftover startup pop-up that referenced settings which no longer exist.', ms: "Membuang pop-up permulaan yang tertinggal yang merujuk tetapan yang tidak lagi wujud." }, // i18n-ignore: bilingual, see ms
    ],
  },
  {
    version: '1.0.0',
    date: '2026-09-28',
    title: 'Initial release', // i18n-ignore: bilingual data, see titleMs
    titleMs: "Keluaran awal",
    changes: [
      { kind: 'new', text: 'Track spending and income across bank, cash and other accounts.', ms: "Jejaki perbelanjaan dan pendapatan merentas akaun bank, tunai dan akaun lain." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Home dashboard with a balance carousel and spending chart.', ms: "Papan pemuka Utama dengan karusel baki dan carta perbelanjaan." }, // i18n-ignore: bilingual, see ms
      { kind: 'new', text: 'Basic categories with monthly limits.', ms: "Kategori asas dengan had bulanan." }, // i18n-ignore: bilingual, see ms
    ],
  },
];


export const releaseTitle = (r: Release, lang: Lang) => (lang === 'ms' ? r.titleMs : r.title);
export const entryText = (e: ChangeEntry, lang: Lang) => (lang === 'ms' ? e.ms : e.text);
