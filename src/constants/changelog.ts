import type { Lang } from '@/i18n';

export type ChangeKind = 'new' | 'improved' | 'fixed';
export type ChangeEntry = { kind: ChangeKind; text: string; ms: string };
/** `silent`: no popup after the update, only the badge on More (used when the news should stay a surprise). */
/** `highlights`: two or three short points shown before the details are opened (and in the update popup). */
export type Release = {
  version: string;
  date: string;
  title: string;
  titleMs: string;
  highlights?: { text: string; ms: string }[];
  changes: ChangeEntry[];
  silent?: boolean;
};

export const CURRENT_VERSION = '3.4.0';

export const CHANGELOG: Release[] = [
  {
    version: '3.4.0',
    date: '2026-10-19',
    title: 'Sign in with a username', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Log masuk dengan nama pengguna',
    highlights: [
      { text: 'Pick a username and use it, or your email, to sign in', ms: 'Pilih nama pengguna dan guna ia, atau e-mel anda, untuk log masuk' }, // i18n-ignore: bilingual data
    ],
    changes: [
      { kind: 'new', text: 'Add an optional username when you sign up, or set one later in Profile. Then sign in with either your email or your username.', ms: 'Tambah nama pengguna (pilihan) semasa mendaftar, atau tetapkan kemudian di Profil. Selepas itu log masuk dengan e-mel atau nama pengguna.' }, // i18n-ignore: bilingual data
      { kind: 'new', text: 'SPayLater and other credit lines now show on Home when their bill is coming up: tap, pick the account and slide to pay.', ms: 'SPayLater dan kredit lain kini muncul di Skrin Utama bila bil hampir tiba: ketik, pilih akaun dan seret untuk bayar.' }, // i18n-ignore: bilingual data
      { kind: 'fixed', text: 'Money with people: who owes whom can no longer be switched after payments were recorded in your accounts, so those records stay correct.', ms: 'Hutang dengan orang: arah hutang tidak lagi boleh ditukar selepas bayaran direkod dalam akaun, supaya rekod kekal betul.' }, // i18n-ignore: bilingual data
      { kind: 'fixed', text: 'Overdue payments to people and instalments now stay in the Coming up list on Home (marked as overdue), so you can pay them from there and the payment is recorded in your transactions.', ms: 'Bayaran kepada orang dan ansuran yang lewat kini kekal dalam senarai Akan datang di Skrin Utama (ditanda lewat), supaya anda boleh bayar dari situ dan bayaran direkodkan dalam transaksi.' }, // i18n-ignore: bilingual data
    ],
  },
  {
    version: '3.3.2',
    date: '2026-10-19',
    title: 'Behind the scenes', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Kerja di belakang tabir',
    silent: true,
    changes: [
      { kind: 'improved', text: 'Faster replies to your feedback: the team now has a proper inbox to read and answer reports.', ms: 'Balasan maklum balas lebih pantas: pasukan kini ada peti masuk khas untuk membaca dan menjawab laporan.' }, // i18n-ignore: bilingual data
    ],
  },
  {
    version: '3.3.1',
    date: '2026-10-19',
    title: 'Pay debts from Home', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Bayar hutang dari Skrin Utama',
    highlights: [
      { text: 'Tap an upcoming payment on Home, pick the account and slide to complete', ms: 'Ketik bayaran yang akan datang di Skrin Utama, pilih akaun dan seret untuk selesai' }, // i18n-ignore
    ],
    changes: [
      { kind: 'new', text: 'Pay what is due right from Home: tap an upcoming payment (an instalment, SPayLater or money with a person), check the amount, pick the account and slide to complete.', ms: 'Bayar terus dari Skrin Utama: ketik bayaran yang akan datang (ansuran, SPayLater atau wang dengan seseorang), semak jumlah, pilih akaun dan seret untuk selesai.' }, // i18n-ignore
      { kind: 'improved', text: 'Money with people now moves your accounts: a payment you record with an account is added to (or taken from) that account and shows in your records. Paid instalments also show which account paid them.', ms: 'Wang dengan seseorang kini menggerakkan akaun anda: bayaran yang direkodkan dengan akaun ditambah ke (atau diambil daripada) akaun itu dan muncul dalam rekod anda. Ansuran yang dibayar juga menunjukkan akaun yang membayarnya.' }, // i18n-ignore
    ],
  },
  {
    version: '3.3.0',
    date: '2026-10-17',
    title: 'Scan a receipt', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Imbas resit',
    highlights: [
      { text: 'Add a transaction by scanning a receipt: take a photo, pick a screenshot or open a PDF', ms: 'Tambah transaksi dengan mengimbas resit: ambil gambar, pilih tangkap skrin atau buka PDF' }, // i18n-ignore
    ],
    changes: [
      { kind: 'new', text: 'New Scan receipt button when you add a transaction. The shop, date, total, category and (when they add up) the items are filled in for you, and you check everything before saving. Needs a signed-in account and an internet connection; the picture is not saved.', ms: 'Butang baharu Imbas resit semasa menambah transaksi. Kedai, tarikh, jumlah, kategori dan (jika jumlahnya sepadan) senarai item diisi untuk anda, dan anda menyemak semuanya sebelum menyimpan. Perlu akaun yang sudah log masuk dan sambungan internet; gambar tidak disimpan.' }, // i18n-ignore
    ],
  },
  {
    version: '3.2.1',
    date: '2026-10-15',
    title: 'Tag an expense for tax relief', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Tanda perbelanjaan untuk pelepasan cukai',
    highlights: [
      { text: 'Choose a tax relief when you add or edit an expense, or a recurring one', ms: 'Pilih pelepasan cukai semasa menambah atau mengubah perbelanjaan, atau yang berulang' }, // i18n-ignore
    ],
    changes: [
      { kind: 'new', text: 'New optional Tax relief choice on expenses and recurring expenses. The claim is made for you and follows the expense: change the amount or date, or delete it, and Tax relief updates by itself.', ms: 'Pilihan baharu Pelepasan cukai (pilihan) pada perbelanjaan dan perbelanjaan berulang. Tuntutan dibuat untuk anda dan mengikut perbelanjaan itu: ubah jumlah atau tarikh, atau padamkannya, dan Pelepasan cukai dikemas kini sendiri.' }, // i18n-ignore
      { kind: 'improved', text: 'Recurring expenses (for example PRS or insurance) tag every payment they make. Tagged expenses show Tax relief in the list, and picking from records no longer offers an expense that is already tagged.', ms: 'Perbelanjaan berulang (contohnya PRS atau insurans) menanda setiap bayaran yang dibuatnya. Perbelanjaan bertanda menunjukkan Pelepasan cukai dalam senarai, dan memilih daripada rekod tidak lagi menawarkan perbelanjaan yang sudah bertanda.' }, // i18n-ignore
    ],
  },
  {
    version: '3.2.0',
    date: '2026-10-15',
    title: 'Plan your salary, see your cash flow, claim your tax relief', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Rancang gaji, lihat aliran tunai, tuntut pelepasan cukai',
    highlights: [
      { text: 'Salary planner: give every ringgit a purpose before you spend', ms: 'Perancang gaji: beri setiap ringgit satu tujuan sebelum anda berbelanja' }, // i18n-ignore
      { text: 'Cash flow calendar: salary, bills and repayments by date, with a warning before your balance runs out', ms: 'Kalendar aliran tunai: gaji, bil dan bayaran mengikut tarikh, dengan amaran sebelum baki anda habis' }, // i18n-ignore
      { text: 'Monthly report you can share, and a tax relief tracker', ms: 'Laporan bulanan yang boleh dikongsi, dan penjejak pelepasan cukai' }, // i18n-ignore
      { text: 'Report a bug or suggestion and follow its progress like a parcel', ms: 'Lapor pepijat atau cadangan dan jejak perkembangannya seperti bungkusan' }, // i18n-ignore
    ],
    changes: [
      { kind: 'new', text: 'Salary planner (More): enter your income for the pay month, see what bills and instalments already take, then give the rest to goals, budgets or your own lines until nothing is left unassigned. Fill from budgets and goals, use 50/30/20, or copy last month.', ms: 'Perancang gaji (Lagi): masukkan pendapatan bulan gaji, lihat apa yang sudah diambil bil dan ansuran, kemudian agihkan baki kepada matlamat, bajet atau baris sendiri sehingga tiada yang tinggal. Isi daripada bajet dan matlamat, guna 50/30/20, atau salin bulan lepas.' }, // i18n-ignore
      { kind: 'new', text: 'Cash flow calendar (More): your financial month by day with what happened and what is expected (recurring bills and income, unpaid instalments, money owed, salary day), the balance at the end of each day, the lowest point and a warning if it may go below zero.', ms: 'Kalendar aliran tunai (Lagi): bulan kewangan anda mengikut hari dengan apa yang telah berlaku dan apa yang dijangka (bil dan pendapatan berulang, ansuran belum dibayar, wang pinjaman, hari gaji), baki akhir setiap hari, titik terendah dan amaran jika baki mungkin jatuh bawah sifar.' }, // i18n-ignore
      { kind: 'new', text: 'Monthly report (More): income, spending, savings rate, comparison with last month, budget performance, top categories, goals, debt payments and highlights. Share it as text or as a spreadsheet.', ms: 'Laporan bulanan (Lagi): pendapatan, perbelanjaan, kadar simpanan, perbandingan dengan bulan lepas, prestasi bajet, kategori teratas, matlamat, bayaran hutang dan sorotan. Kongsi sebagai teks atau hamparan.' }, // i18n-ignore
      { kind: 'new', text: 'Tax relief tracker (More): claims by relief with limits, what is left, your estimated tax saved at your tax rate, and a pick-from-records option. Limits are for YA2025 and can change: check LHDN before you file.', ms: 'Penjejak pelepasan cukai (Lagi): tuntutan mengikut pelepasan dengan had, baki, anggaran cukai dijimatkan pada kadar cukai anda, dan pilihan memilih daripada rekod. Had ialah untuk TA2025 dan boleh berubah: semak LHDN sebelum memfailkan.' }, // i18n-ignore
      { kind: 'new', text: 'Report a bug or suggest (More): send a report from the app and follow it through Received, Being looked at, Planned, Being worked on and Done, with the developer’s notes and the version it was fixed in.', ms: 'Lapor pepijat atau cadangan (Lagi): hantar laporan dari app dan jejaki melalui Diterima, Sedang disemak, Dirancang, Sedang dibuat dan Selesai, bersama nota pemaju dan versi pembetulan.' }, // i18n-ignore
    ],
  },
  {
    version: '3.1.3',
    date: '2026-10-13',
    title: 'Instalments count as spending when you pay', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Ansuran dikira belanja bila anda bayar',
    highlights: [
      { text: 'An instalment purchase is no longer spent in full on the day you buy it', ms: 'Pembelian ansuran tidak lagi dikira belanja penuh pada hari anda beli' }, // i18n-ignore
      { text: 'Each payment you make counts as spending on the day you pay it', ms: 'Setiap bayaran yang anda buat dikira belanja pada hari anda bayar' }, // i18n-ignore
    ],
    changes: [
      { kind: 'improved', text: 'Instalment debts: nothing is spent until you pay. Each payment counts as spending on its payment date, in the category of what you bought, with any fee. What you still owe is unchanged.', ms: 'Hutang ansuran: tiada belanja sehingga anda bayar. Setiap bayaran dikira belanja pada tarikh bayar, dalam kategori barang yang dibeli, bersama fi jika ada. Baki hutang tidak berubah.' }, // i18n-ignore
      { kind: 'improved', text: 'Your existing instalment debts are converted once when you open this version: the full price that was counted on the day of purchase is removed, and each payment already made is counted on its own date. Your account balances do not change, but spending in past months does.', ms: 'Hutang ansuran sedia ada ditukar sekali apabila anda buka versi ini: harga penuh yang dikira pada hari pembelian dibuang, dan setiap bayaran yang telah dibuat dikira pada tarikhnya sendiri. Baki akaun tidak berubah, tetapi belanja bulan-bulan lepas berubah.' }, // i18n-ignore
      { kind: 'improved', text: 'Loans are unchanged: money you receive is not income, and only interest and fees count as spending.', ms: 'Pinjaman tidak berubah: wang yang diterima bukan pendapatan, dan hanya faedah dan fi dikira sebagai belanja.' }, // i18n-ignore
    ],
  },
  {
    version: '3.1.2',
    date: '2026-10-13',
    title: 'Dates on the web, and a tidier Home', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Tarikh di web, dan Utama lebih kemas',
    changes: [
      { kind: 'fixed', text: 'Web: every date row (new record, debt, balance adjustment, payday history) could not be changed. It now opens the browser calendar.', ms: 'Web: semua baris tarikh (rekod baharu, hutang, pelarasan baki, sejarah hari gaji) tidak boleh diubah. Kini ia membuka kalendar pelayar.' }, // i18n-ignore
      { kind: 'improved', text: 'Web on a computer: the Coming up box on Home is as tall as the chart beside it, also when nothing is due.', ms: 'Web di komputer: kotak Akan datang di Utama setinggi carta di sebelahnya, walaupun tiada apa yang perlu dibayar.' }, // i18n-ignore
    ],
  },
  {
    version: '3.1.1',
    date: '2026-10-13',
    title: 'Analyse and Rancang on a wide screen', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Faham dan Rancang di skrin lebar',
    changes: [
      { kind: 'new', text: 'Web on a computer: Analyse shows what you kept and when the money moved on the left, and where it went on the right.', ms: 'Web di komputer: Faham menunjukkan baki simpanan dan masa wang bergerak di kiri, dan ke mana ia pergi di kanan.' }, // i18n-ignore
      { kind: 'new', text: 'Web on a computer: Rancang shows budgets and goals on the left, upcoming bills and reminders on the right.', ms: 'Web di komputer: Rancang menunjukkan bajet dan matlamat di kiri, bil akan datang dan peringatan di kanan.' }, // i18n-ignore
    ],
  },
  {
    version: '3.1.0',
    date: '2026-10-13',
    title: 'Your data safer, and WaKira for the desktop', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Data lebih selamat, dan WaKira untuk desktop',
    highlights: [
      { text: 'Phone and web no longer overwrite each other: records are combined', ms: 'Telefon dan web tidak lagi menimpa satu sama lain: rekod digabungkan' }, // i18n-ignore
      { text: 'Back up everything to one file and restore it any time', ms: 'Sandarkan semua data ke satu fail dan pulihkan bila-bila masa' }, // i18n-ignore
      { text: 'On a computer, WaKira has a side menu and a wide dashboard', ms: 'Di komputer, WaKira ada menu sisi dan papan pemuka lebar' }, // i18n-ignore
    ],
    changes: [
      { kind: 'improved', text: 'Sync: when two devices change your records before they sync, the changes are combined record by record instead of one device replacing the other. A record added, edited or deleted on either side is kept that way; only a record changed on both sides takes the newer change.', ms: 'Penyegerakan: bila dua peranti mengubah rekod anda sebelum sempat disegerakkan, perubahan digabungkan rekod demi rekod, bukan satu peranti menggantikan yang lain. Rekod yang ditambah, diubah atau dipadam di mana-mana pihak kekal begitu; hanya rekod yang diubah di kedua-dua pihak mengambil perubahan yang lebih baru.' }, // i18n-ignore
      { kind: 'fixed', text: 'Sync: a device that had been offline could overwrite newer changes made on another device as soon as it came back online. It now checks first and combines.', ms: 'Penyegerakan: peranti yang luar talian boleh menimpa perubahan lebih baru dari peranti lain sebaik sahaja ia kembali dalam talian. Kini ia menyemak dahulu dan menggabungkan.' }, // i18n-ignore
      { kind: 'new', text: 'More > Data & Privacy > Back up everything: one .wakira.json file with your accounts, records, transfers, budgets, debts, goals and settings. Restore from a backup file shows what is in it before replacing anything, and keeps a copy of your current data.', ms: 'Lagi > Data & Privasi > Sandarkan semua data: satu fail .wakira.json dengan akaun, rekod, pindahan, bajet, hutang, matlamat dan tetapan anda. Pulihkan daripada fail sandaran menunjukkan isinya sebelum menggantikan apa-apa, dan menyimpan salinan data semasa anda.' }, // i18n-ignore
      { kind: 'new', text: 'Web on a computer: a side menu with Home, Transactions, Analyse, Rancang and the things you manage; Home becomes a dashboard with four figures, the chart, what is coming up, budgets and recent records; Transactions shows the month summary beside the list; forms open as a panel on the right. Press N for a new record.', ms: 'Web di komputer: menu sisi dengan Utama, Transaksi, Faham, Rancang dan perkara yang anda urus; Utama menjadi papan pemuka dengan empat angka, carta, perkara akan datang, bajet dan rekod terkini; Transaksi menunjukkan ringkasan bulan di sebelah senarai; borang dibuka sebagai panel di kanan. Tekan N untuk rekod baharu.' }, // i18n-ignore
      { kind: 'new', text: 'More > About > Error log: if something goes wrong, the error is noted on this device (no amounts or names) so it can be shared with the developer. A screen that fails to draw now shows Try again instead of a blank app.', ms: 'Lagi > Perihal > Log ralat: jika berlaku masalah, ralat dicatat dalam peranti ini (tanpa jumlah atau nama) supaya boleh dikongsi dengan pembangun. Skrin yang gagal dipaparkan kini menunjukkan Cuba lagi, bukan aplikasi kosong.' }, // i18n-ignore
      { kind: 'improved', text: 'Small fixes can now reach the app without installing a new version, once this version is installed.', ms: 'Pembaikan kecil kini boleh sampai ke aplikasi tanpa memasang versi baharu, selepas versi ini dipasang.' }, // i18n-ignore
    ],
  },
  {
    version: '3.0.7',
    date: '2026-10-13',
    title: 'Works properly on the web', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Berfungsi dengan betul di web',
    highlights: [
      { text: 'Delete, reset and other confirmations now appear on the web', ms: 'Padam, set semula dan pengesahan lain kini muncul di web' }, // i18n-ignore
      { text: 'Export saves a real CSV file you can open in Excel', ms: 'Eksport menyimpan fail CSV sebenar yang boleh dibuka dalam Excel' }, // i18n-ignore
    ],
    changes: [
      { kind: 'fixed', text: 'Web: with cloud sign-in set up, opening WaKira in a browser no longer stops with a "window is not defined" error while the page is prepared.', ms: 'Web: dengan log masuk awan, membuka WaKira dalam pelayar tidak lagi terhenti dengan ralat "window is not defined" semasa halaman disediakan.' }, // i18n-ignore
      { kind: 'fixed', text: 'Web: questions such as "Delete this account?" or "Reset all data?" did not appear, so the button did nothing. They now open as a dialog in the app, and messages such as sign-in errors show too.', ms: 'Web: soalan seperti "Padam akaun ini?" atau "Set semula semua data?" tidak muncul, jadi butang tidak berbuat apa-apa. Kini ia dibuka sebagai dialog dalam aplikasi, dan mesej seperti ralat log masuk juga dipaparkan.' }, // i18n-ignore
      { kind: 'improved', text: 'Export to CSV and the import template are now real .csv files: downloaded on the web, and shared as a file on your phone so you can save them to Files or Drive or open them in Excel.', ms: 'Eksport ke CSV dan templat import kini fail .csv sebenar: dimuat turun di web, dan dikongsi sebagai fail di telefon supaya boleh disimpan ke Files atau Drive atau dibuka dalam Excel.' }, // i18n-ignore
      { kind: 'improved', text: 'Exported files keep Malay and special characters intact in Excel, and carry the date in their name.', ms: 'Fail eksport mengekalkan huruf khas dalam Excel, dan nama fail mengandungi tarikh.' }, // i18n-ignore
      { kind: 'improved', text: 'Web: sharing a story or the summary for an AI assistant copies the text when the browser has no share sheet.', ms: 'Web: berkongsi cerita atau ringkasan untuk pembantu AI akan menyalin teks jika pelayar tiada helaian kongsi.' }, // i18n-ignore
    ],
  },
  {
    version: '3.0.6',
    date: '2026-10-13',
    title: 'Ready for the web', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Sedia untuk web',
    highlights: [
      { text: 'On the web, Add to Home Screen opens WaKira like an app', ms: 'Di web, Tambah ke Skrin Utama membuka WaKira seperti aplikasi' }, // i18n-ignore
    ],
    changes: [
      { kind: 'new', text: 'Web: WaKira can be added to the home screen of a phone and opens full screen with its own icon and name, without the browser bar.', ms: 'Web: WaKira boleh ditambah ke skrin utama telefon dan dibuka skrin penuh dengan ikon dan nama sendiri, tanpa bar pelayar.' }, // i18n-ignore
    ],
  },
  {
    version: '3.0.5',
    date: '2026-10-12',
    title: 'Debts sorted by purchase date', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Hutang disusun ikut tarikh beli',
    highlights: [
      { text: 'Debts are listed by the date you bought or took them, newest first', ms: 'Hutang disusun ikut tarikh beli atau ambil, terbaru dahulu' }, // i18n-ignore
    ],
    changes: [
      { kind: 'improved', text: 'Debts: instalments, loans and credit lines are sorted by the date you bought or took them, newest first. This replaces the next-payment order of 3.0.4.', ms: 'Hutang: ansuran, pinjaman dan had kredit disusun ikut tarikh anda beli atau ambil, terbaru dahulu. Ini menggantikan susunan bayaran seterusnya dalam 3.0.4.' }, // i18n-ignore
    ],
  },
    {
    version: '3.0.4',
    date: '2026-10-12',
    title: 'Debts sorted by date', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Hutang disusun ikut tarikh',
    highlights: [
      { text: 'Debts are listed by the date the next payment is due', ms: 'Hutang disusun ikut tarikh bayaran seterusnya' }, // i18n-ignore
    ],
    changes: [
      { kind: 'improved', text: 'Debts: instalments, loans and credit lines are sorted by the date the next payment is due, soonest first. People you owe or who owe you are sorted by due date too; ones with no date come last.', ms: 'Hutang: ansuran, pinjaman dan had kredit disusun ikut tarikh bayaran seterusnya, yang paling hampir dahulu. Orang yang anda berhutang atau berhutang dengan anda juga disusun ikut tarikh akhir; yang tiada tarikh di bawah.' }, // i18n-ignore
    ],
  },
  {
    version: '3.0.3',
    date: '2026-10-11',
    title: 'Debts you can fix, clearer accounts and records', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Hutang boleh dibetulkan, akaun dan rekod lebih jelas',
    highlights: [
      { text: 'Edit an instalment or loan you keyed in wrong', ms: 'Sunting ansuran atau pinjaman yang tersilap masuk' }, // i18n-ignore
      { text: 'Debts in tabs and folding sections, newest first', ms: 'Hutang dalam tab dan bahagian boleh dilipat, terbaru dahulu' }, // i18n-ignore
      { text: 'Savings and assets kept apart from spendable money', ms: 'Simpanan dan aset diasingkan daripada wang boleh guna' }, // i18n-ignore
    ],
    changes:[
      { kind: 'new', text: 'Debts: Edit an instalment plan or loan. While no payment is recorded in WaKira you can change everything; after that, the name, provider, category and pay-from account.', ms: 'Hutang: Sunting pelan ansuran atau pinjaman. Selagi tiada bayaran direkod dalam WaKira anda boleh ubah semuanya; selepas itu, nama, penyedia, kategori dan akaun bayar.' }, // i18n-ignore
      { kind: 'improved', text: 'Debts: two tabs, My debts and With people, so neither list has to be scrolled past. Instalments, loans, credit lines and finished ones each fold into their own section, newest first.', ms: 'Hutang: dua tab, Hutang saya dan Dengan orang, supaya tiada senarai perlu ditatal melepasi yang lain. Ansuran, pinjaman, had kredit dan yang selesai masing-masing dalam bahagian boleh dilipat, terbaru dahulu.' }, // i18n-ignore
      { kind: 'improved', text: 'Transactions: the month is one card, with a donut of where the money went next to the net, income and spending. The biggest categories are chips you can tap to filter.', ms: 'Transaksi: bulan dalam satu kad, dengan donat ke mana wang pergi di sebelah bersih, pendapatan dan perbelanjaan. Kategori terbesar ialah cip yang boleh ditekan untuk menapis.' }, // i18n-ignore
      { kind: 'improved', text: 'Analyse: 1 month is shown by week; 3, 6 and 12 months by month.', ms: 'Analisis: 1 bulan dipaparkan ikut minggu; 3, 6 dan 12 bulan ikut bulan.' }, // i18n-ignore
      { kind: 'improved', text: 'Home: savings and asset accounts are one card of their own instead of sitting among your spending accounts.', ms: 'Utama: akaun simpanan dan aset menjadi satu kad sendiri, tidak lagi bercampur dengan akaun belanja.' }, // i18n-ignore
      { kind: 'improved', text: 'More > Accounts & assets: net worth with money to spend, savings & assets and what you owe, and the accounts listed in those groups.', ms: 'Lagi > Akaun & aset: nilai bersih dengan wang boleh guna, simpanan & aset dan hutang, dan akaun disenaraikan ikut kumpulan itu.' }, // i18n-ignore
    ],
  },
  {
    version: '3.0.2',
    date: '2026-10-11',
    title: 'Clearer Analyse, tidier records, bills on Home', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Analisis lebih jelas, rekod lebih kemas, bil di Utama',
    highlights: [
      { text: 'One month in Analyse now shows weeks or days', ms: 'Satu bulan dalam Analisis kini ikut minggu atau hari' }, // i18n-ignore
      { text: 'Insight cards with a tip and a button to act', ms: 'Kad Insight dengan tip dan butang untuk bertindak' }, // i18n-ignore
      { text: 'Bills and income coming up, right on Home', ms: 'Bil dan pendapatan akan datang, terus di Utama' }, // i18n-ignore
    ],
    changes:[
      { kind: 'improved', text: 'Analyse > Overview: 1 month is shown by week, or by day with one tap; 3 months by week; 6 and 12 months by month.', ms: 'Analisis > Gambaran: 1 bulan dipaparkan ikut minggu, atau ikut hari dengan satu tekan; 3 bulan ikut minggu; 6 dan 12 bulan ikut bulan.' }, // i18n-ignore
      { kind: 'improved', text: 'Overview is shorter: how much you kept and where your income went now sit in one card, and the health score is a single line that opens Insight.', ms: 'Gambaran lebih ringkas: berapa yang disimpan dan ke mana pendapatan pergi kini dalam satu kad, dan skor kesihatan hanya satu baris yang membuka Insight.' }, // i18n-ignore
      { kind: 'improved', text: 'Insight: a compact score you can open for details, and each finding has a tip and a button that takes you to budgets, Rancang, recurring bills or your records.', ms: 'Insight: skor ringkas yang boleh dibuka untuk butiran, dan setiap dapatan ada tip serta butang ke bajet, Rancang, bil berulang atau rekod anda.' }, // i18n-ignore
      { kind: 'improved', text: 'Transactions: search and filters come first in one row, the category breakdown starts folded, and each day shows how many records it has.', ms: 'Transaksi: carian dan penapis di atas dalam satu baris, pecahan kategori bermula dilipat, dan setiap hari menunjukkan bilangan rekodnya.' }, // i18n-ignore
      { kind: 'new', text: 'Home: a Coming up row shows bills, expected income and loan payments due in the next two weeks.', ms: 'Utama: baris Akan datang menunjukkan bil, pendapatan dijangka dan bayaran pinjaman dalam dua minggu akan datang.' }, // i18n-ignore
    ],
  },
  {
    version: '3.0.1',
    date: '2026-10-11',
    title: 'Fixes for amounts, More and Analyse', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Pembetulan untuk jumlah, Lagi dan Analisis',
    highlights: [
      { text: 'Amount fields work again on iPhone', ms: 'Medan jumlah berfungsi semula di iPhone' }, // i18n-ignore
      { text: 'More always opens on its main page', ms: 'Lagi sentiasa dibuka di halaman utamanya' }, // i18n-ignore
      { text: 'A shorter, tidier What is New', ms: 'Apa yang baharu lebih ringkas dan kemas' }, // i18n-ignore
    ],
    changes:[
      { kind: 'fixed', text: 'Tapping an amount field now opens the keyboard on iPhone, in every form: records, transfers, accounts, budgets, goals, debts, recurring and the tutorial.', ms: 'Menekan medan jumlah kini membuka papan kekunci di iPhone, dalam setiap borang: rekod, pindahan, akaun, bajet, matlamat, hutang, berulang dan tutorial.' }, // i18n-ignore
      { kind: 'fixed', text: 'Editing a saved amount keeps its value: typing after RM 15 no longer turns it into RM 1.51.', ms: 'Menyunting jumlah yang disimpan mengekalkan nilainya: menaip selepas RM 15 tidak lagi menjadikannya RM 1.51.' }, // i18n-ignore
      { kind: 'improved', text: 'Every ringgit field now types the same way: digits slide in from the right, with the thousands comma.', ms: 'Setiap medan ringgit kini ditaip dengan cara yang sama: digit masuk dari kanan, dengan koma ribuan.' }, // i18n-ignore
      { kind: 'fixed', text: 'After opening a page in More (such as What is New) and switching tabs, tapping More goes back to the main More page.', ms: 'Selepas membuka halaman dalam Lagi (seperti Apa yang baharu) dan bertukar tab, menekan Lagi kembali ke halaman utama Lagi.' }, // i18n-ignore
      { kind: 'fixed', text: 'Analyse > Overview: the income and spending figures are a readable size again.', ms: 'Analisis > Gambaran: angka pendapatan dan perbelanjaan kembali bersaiz mudah dibaca.' }, // i18n-ignore
      { kind: 'improved', text: 'What is New shows each version as a short card with its key points and date. Tap it to see every change.', ms: 'Apa yang baharu memaparkan setiap versi sebagai kad ringkas dengan perkara utama dan tarikh. Tekan untuk melihat semua perubahan.' }, // i18n-ignore
    ],
  },
  {
    version: '3.0.0',
    date: '2026-10-11',
    title: 'A fresh start: welcome, sign-up and a guided tour', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Permulaan baharu: sambutan, daftar dan tunjuk ajar',
    highlights: [
      { text: 'A new welcome and step-by-step sign-up', ms: 'Sambutan baharu dan daftar langkah demi langkah' }, // i18n-ignore
      { text: 'A tutorial to set up your profile, month, accounts and old records', ms: 'Tutorial untuk menyediakan profil, bulan, akaun dan rekod lama' }, // i18n-ignore
      { text: 'A guided tour of Home', ms: 'Tunjuk ajar di Utama' }, // i18n-ignore
    ],
    changes:[
      { kind: 'new', text: 'A new welcome: a short Kira, Faham, Rancang story, then just two buttons to start or sign in.', ms: 'Sambutan baharu: cerita ringkas Kira, Faham, Rancang, kemudian hanya dua butang untuk mula atau log masuk.' }, // i18n-ignore
      { kind: 'new', text: 'Sign up with e-mail one step at a time: first and last name, e-mail with quick @gmail, @yahoo and other endings, a password check that refuses easy ones like 12345678, a short privacy summary, then a 6-digit code.', ms: 'Daftar dengan e-mel satu langkah demi satu: nama pertama dan akhir, e-mel dengan hujung @gmail, @yahoo dan lain-lain yang boleh terus ditekan, semakan kata laluan yang menolak yang mudah seperti 12345678, ringkasan privasi, kemudian kod 6 digit.' }, // i18n-ignore
      { kind: 'new', text: 'Signing up with Apple or Google now shows what we received from them before you agree.', ms: 'Daftar dengan Apple atau Google kini menunjukkan maklumat yang kami terima sebelum anda bersetuju.' }, // i18n-ignore
      { kind: 'new', text: 'A new tutorial for new accounts: profile, goals, when your month starts (calendar, payday or end of month, with the weekend rule), salary, accounts and balances, bringing in old records from Excel or CSV, and reminders.', ms: 'Tutorial baharu untuk akaun baharu: profil, matlamat, bila bulan anda bermula (kalendar, hari gaji atau hujung bulan, dengan peraturan hujung minggu), gaji, akaun dan baki, membawa masuk rekod lama dari Excel atau CSV, dan peringatan.' }, // i18n-ignore
      { kind: 'new', text: 'A guided tour on Home shows the + button, your account cards, Analyse and Rancang, and a Start here card lists the first things to try.', ms: 'Tunjuk ajar di Utama menunjukkan butang +, kad akaun, Analisis dan Rancang, dan kad Mulakan di sini menyenaraikan perkara pertama untuk dicuba.' }, // i18n-ignore
      { kind: 'new', text: 'Signing in on a new phone or after reinstalling: your data comes back, and the tour is offered again.', ms: 'Log masuk di telefon baharu atau selepas pasang semula: data anda kembali, dan tunjuk ajar ditawarkan semula.' }, // i18n-ignore
      { kind: 'new', text: 'An evening reminder to record, at 9 pm on days with nothing recorded. Turn it on in Rancang > Reminders.', ms: 'Peringatan malam untuk merekod, pukul 9 malam pada hari yang belum ada rekod. Hidupkan di Rancang > Peringatan.' }, // i18n-ignore
      { kind: 'improved', text: 'Deleting your account now shows what will be removed, offers an export first, and asks you to confirm twice.', ms: 'Memadam akaun kini menunjukkan apa yang akan dipadam, menawarkan export dahulu, dan meminta pengesahan dua kali.' }, // i18n-ignore
      { kind: 'improved', text: 'What is New now opens by itself after an update: a short sheet for small updates, a highlight for big ones.', ms: 'Apa yang baharu kini terbuka sendiri selepas kemas kini: lembaran ringkas untuk kemas kini kecil, sorotan untuk yang besar.' }, // i18n-ignore
    ],
  },
  {
    version: '2.2.0',
    date: '2026-10-10',
    silent: true,
    title: 'Small touches', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Sentuhan kecil',
    changes:[
      { kind: 'improved', text: 'Small improvements here and there. Keep recording, something may be waiting for you.', ms: 'Penambahbaikan kecil di sana sini. Teruskan merekod, mungkin ada sesuatu yang menanti anda.' }, // i18n-ignore
    ],
  },
  {
    version: '2.1.9',
    date: '2026-10-10',
    title: 'Forecast amounts back in view', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Jumlah ramalan kembali kelihatan',
    changes:[
      { kind: 'fixed', text: 'In Deep dive, a long line such as "Everyday spending, 19 days left" no longer pushes its amount off the edge of the card.', ms: 'Dalam Terperinci, baris panjang seperti "Belanja harian, tinggal 19 hari" tidak lagi menolak jumlahnya keluar dari kad.' }, // i18n-ignore
    ],
  },
  {
    version: '2.1.8',
    date: '2026-10-10',
    title: 'Smoother amount typing', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Menaip jumlah lebih lancar',
    changes:[
      { kind: 'fixed', text: 'Typing an amount no longer flickers. The number you see is drawn separately from the keyboard field, so the phone never has to correct it after each key.', ms: 'Menaip jumlah tidak lagi berkelip. Nombor yang dipaparkan dilukis berasingan daripada medan papan kekunci, jadi telefon tidak perlu membetulkannya selepas setiap kekunci.' }, // i18n-ignore
      { kind: 'fixed', text: 'Itemised breakdown: the item name now lines up with RM and the amount on every row.', ms: 'Pecahan mengikut item: nama item kini sejajar dengan RM dan jumlah pada setiap baris.' }, // i18n-ignore
    ],
  },
  {
    version: '2.1.7',
    date: '2026-10-10',
    title: 'Tidier More, clearer amounts, easier entry', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Lagi lebih kemas, jumlah lebih jelas, rekod lebih mudah',
    changes:[
      { kind: 'new', text: 'Analyse now has a 1 month range for Overview and Deep dive. The Insights tab looks at fixed stretches, so it has no range.', ms: 'Analisis kini ada julat 1 bulan untuk Ringkasan dan Terperinci. Tab Insight melihat tempoh tetap, jadi ia tiada julat.' }, // i18n-ignore
      { kind: 'fixed', text: 'The income, spending and net figures under the Home chart no longer get cut off. Each now has its own line with the full amount.', ms: 'Angka pendapatan, perbelanjaan dan bersih di bawah carta Home tidak lagi terpotong. Setiap satu kini ada barisnya sendiri dengan jumlah penuh.' }, // i18n-ignore
      { kind: 'improved', text: 'The daily limit line on the chart is thinner and dashed, with a small Limit label above it.', ms: 'Garisan had harian pada carta lebih nipis dan putus-putus, dengan label kecil Had di atasnya.' }, // i18n-ignore
      { kind: 'improved', text: 'More is tidied into Features, Settings and About, with Security and Data one tap away.', ms: 'Lagi dikemas kepada Ciri, Tetapan dan Tentang, dengan Keselamatan dan Data hanya satu ketik.' }, // i18n-ignore
      { kind: 'improved', text: 'Add and edit transaction: itemised breakdown lines are aligned, subcategories are steady pills that no longer change height when you tap, and Save stays visible at the bottom.', ms: 'Tambah dan ubah transaksi: baris pecahan item sejajar, subkategori berbentuk pil yang tetap dan tidak berubah tinggi bila diketik, dan Simpan sentiasa kelihatan di bawah.' }, // i18n-ignore
    ],
  },
  {
    version: '2.1.6',
    date: '2026-10-09',
    title: 'Calendar by real month', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Kalendar ikut bulan sebenar',
    changes:[
      { kind: 'new', text: 'Choose how your month is counted: Calendar month (1st to the last day, like your phone) or By my payday. Calendar month is now one tap, and it makes budgets, totals, charts and the daily calendar all follow the real month.', ms: 'Pilih cara bulan anda dikira: Bulan kalendar (1hb hingga hari terakhir, seperti telefon) atau Ikut hari gaji. Bulan kalendar kini satu ketik, dan bajet, jumlah, carta serta kalendar harian semuanya mengikut bulan sebenar.' }, // i18n-ignore
      { kind: 'improved', text: 'With payday months, the daily calendar and its total now show the exact dates of the month (for example 31 Jul - 27 Aug), so nothing looks out of place.', ms: 'Bagi bulan ikut gaji, kalendar harian dan jumlahnya kini menunjukkan tarikh sebenar bulan itu (contoh 31 Jul - 27 Ogo), jadi tiada yang kelihatan pelik.' }, // i18n-ignore
    ],
  },
  {
    version: '2.1.5',
    date: '2026-10-08',
    title: 'Payday history and a calendar fix', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Sejarah gaji dan pembetulan kalendar',
    changes:[
      { kind: 'new', text: 'Payday history: when you change job or how you are paid, start a new payday rule from a date. Earlier months keep the rule they had, and the month in between is made shorter or longer to fit. No regular salary after leaving a job? Add that from your last day.', ms: 'Sejarah gaji: bila bertukar kerja atau cara dibayar, mulakan peraturan gaji baharu dari satu tarikh. Bulan lama kekal dengan peraturan yang ada ketika itu, dan bulan peralihan dipendekkan atau dipanjangkan supaya muat. Tiada gaji tetap selepas berhenti kerja? Tambah itu dari hari terakhir bekerja.' }, // i18n-ignore
      { kind: 'fixed', text: 'Deep dive no longer shows an error when a financial month runs across two calendar months (payday not on the 1st). The daily calendar now shows the right days.', ms: 'Terperinci tidak lagi menunjukkan ralat apabila bulan kewangan merentasi dua bulan kalendar (gaji bukan pada 1hb). Kalendar harian kini menunjukkan hari yang betul.' }, // i18n-ignore
    ],
  },
  {
    version: '2.1.4',
    date: '2026-10-08',
    title: 'Adjustments that count', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Pelarasan yang dikira',
    changes:[
      { kind: 'improved', text: 'A balance adjustment now counts as income when it adds money and as spending when it takes money off, so your totals and charts match your real balance.', ms: 'Pelarasan baki kini dikira sebagai pendapatan jika menambah wang dan sebagai perbelanjaan jika mengurangkan wang, jadi jumlah dan carta sepadan dengan baki sebenar anda.' }, // i18n-ignore
      { kind: 'new', text: 'Any adjustment can be changed at any time: amount, add or take off, date and note. Pick the month it belongs to.', ms: 'Mana-mana pelarasan boleh diubah bila-bila masa: jumlah, tambah atau kurang, tarikh dan nota. Pilih bulan yang betul.' }, // i18n-ignore
      { kind: 'improved', text: 'The 30 second lock is gone. Past adjustments are now counted in the months they belong to.', ms: 'Kunci 30 saat sudah dibuang. Pelarasan lama kini dikira dalam bulan masing-masing.' }, // i18n-ignore
    ],
  },
  {
    version: '2.1.3',
    date: '2026-10-08',
    title: 'Money to use, money to keep', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Wang guna dan wang simpan',
    changes:[
      { kind: 'improved', text: 'The first home card now shows only money you can use (bank, cash and other accounts). Savings are shown apart so the two never mix.', ms: 'Kad pertama di rumah kini hanya menunjukkan wang yang boleh digunakan (bank, tunai dan akaun lain). Simpanan dipaparkan berasingan supaya tidak bercampur.' }, // i18n-ignore
      { kind: 'improved', text: 'The balance and month-end charts in Deep dive now follow the money you can use. Savings stay in their own section.', ms: 'Carta baki dan hujung bulan dalam Terperinci kini mengikut wang yang boleh digunakan. Simpanan kekal dalam bahagiannya sendiri.' }, // i18n-ignore
    ],
  },
  {
    version: '2.1.2',
    date: '2026-10-08',
    title: 'Money with people', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Wang dengan orang',
    changes: [
      { kind: 'new', text: 'Debts now has a People section for money you owe a friend or that someone owes you, with partial payments and a settled list.', ms: 'Hutang kini ada bahagian Orang untuk wang yang anda hutang kepada kawan atau yang orang hutang kepada anda, dengan bayaran separa dan senarai selesai.' }, // i18n-ignore
      { kind: 'new', text: 'Reminders for those: before the due date, on the day, and again every week or month if you want.', ms: 'Peringatan untuknya: sebelum tarikh bayar, pada hari itu, dan lagi setiap minggu atau bulan jika anda mahu.' }, // i18n-ignore
      { kind: 'improved', text: 'Percentages now show one decimal place everywhere, for example 35.4%.', ms: 'Peratus kini dipaparkan dengan satu tempat perpuluhan di mana-mana, contohnya 35.4%.' }, // i18n-ignore
    ],
  },
  {
    version: '2.1.1',
    date: '2026-10-08',
    title: 'Charts you can feel', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Carta yang boleh dirasa',
    changes: [
      { kind: 'new', text: 'Press and drag along a chart to move through the months or days and read each value as you go.', ms: 'Tekan dan seret pada carta untuk bergerak melalui bulan atau hari dan baca setiap nilai semasa menggerakkannya.' }, // i18n-ignore
      { kind: 'improved', text: 'Forecast now lives inside Deep dive, so there are three tabs: Overview, Deep dive and Insight.', ms: 'Ramalan kini berada dalam Terperinci, jadi ada tiga tab: Ringkasan, Terperinci dan Insight.' }, // i18n-ignore
      { kind: 'new', text: 'Will your money last? A day-by-day line of your total money this month, with an estimate to month end and the day it could run out.', ms: 'Cukupkah wang anda? Garisan jumlah wang anda setiap hari bulan ini, dengan anggaran hingga hujung bulan dan hari ia mungkin habis.' }, // i18n-ignore
      { kind: 'improved', text: 'Your total money over time is now a line with an estimate for the month end.', ms: 'Jumlah wang anda dari semasa ke semasa kini berupa garisan dengan anggaran hujung bulan.' }, // i18n-ignore
      { kind: 'new', text: 'Category heat grid: see which categories rose or fell month by month.', ms: 'Grid haba kategori: lihat kategori mana yang naik atau turun dari bulan ke bulan.' }, // i18n-ignore
      { kind: 'new', text: 'How big your expenses are: small buys against big ones.', ms: 'Berapa besar belanja anda: pembelian kecil berbanding yang besar.' }, // i18n-ignore
    ],
  },
  {
    version: '2.1.0',
    date: '2026-10-08',
    title: 'A deeper Analyse', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Faham yang lebih mendalam',
    changes: [
      { kind: 'new', text: 'Pull a form down by its top bar to close it, as well as tapping Cancel.', ms: 'Tarik borang ke bawah melalui bahagian atasnya untuk menutupnya, selain menekan Batal.' }, // i18n-ignore
      { kind: 'new', text: 'Financial health score at the top of the Overview, with a ring and what drives it.', ms: 'Skor kesihatan kewangan di atas Ringkasan, dengan gelang dan apa yang mempengaruhinya.' }, // i18n-ignore
      { kind: 'new', text: 'Where your income went: a donut of fixed bills, everyday spending and what you kept, in percent of income.', ms: 'Ke mana pendapatan pergi: carta donut bil tetap, belanja harian dan yang disimpan, dalam peratus pendapatan.' }, // i18n-ignore
      { kind: 'improved', text: 'Income vs spending now has a line for the share of income kept each month.', ms: 'Pendapatan berbanding perbelanjaan kini ada garisan bahagian pendapatan yang disimpan setiap bulan.' }, // i18n-ignore
      { kind: 'new', text: 'Category donut, and a bubble chart that shows how often and how big you spend in each category.', ms: 'Donut kategori, dan carta gelembung yang menunjukkan berapa kerap dan berapa besar anda berbelanja bagi setiap kategori.' }, // i18n-ignore
      { kind: 'new', text: '11 new insights: income split, habits, small buys, Miscellaneous share, top category, improvements, subscriptions, no-spend days, payday pace, income change and big one-offs.', ms: '11 insight baharu: pembahagian pendapatan, tabiat, pembelian kecil, bahagian Pelbagai, kategori utama, penambahbaikan, langganan, hari tanpa belanja, kadar selepas gaji, perubahan pendapatan dan pembelian besar.' }, // i18n-ignore
      { kind: 'fixed', text: 'The calendar heatmap is easy to read in dark mode.', ms: 'Peta haba kalendar mudah dibaca dalam mod gelap.' }, // i18n-ignore
    ],
  },
  {
    version: '2.0.4',
    date: '2026-10-08',
    title: 'Balance adjustments you can see', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Pelarasan baki yang boleh dilihat',
    changes: [
      { kind: 'new', text: 'After you adjust a balance, a bar offers Undo or Change for 30 seconds. After that the adjustment is locked until you make a new one.', ms: 'Selepas melaraskan baki, satu bar menawarkan Buat asal atau Ubah selama 30 saat. Selepas itu pelarasan terkunci sehingga anda membuat yang baharu.' }, // i18n-ignore
      { kind: 'new', text: 'Adjustment history for each account, with the balance before and after and an optional note.', ms: 'Sejarah pelarasan bagi setiap akaun, dengan baki sebelum dan selepas serta nota pilihan.' }, // i18n-ignore
      { kind: 'new', text: 'Adjustments appear in Transactions as their own rows. They are never counted as income or spending, and a switch hides them.', ms: 'Pelarasan muncul dalam Transaksi sebagai baris tersendiri. Ia tidak pernah dikira sebagai pendapatan atau perbelanjaan, dan satu suis boleh menyembunyikannya.' }, // i18n-ignore
    ],
  },
  {
    version: '2.0.3a',
    date: '2026-10-08',
    title: 'Smarter category matching on import', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Padanan kategori import lebih bijak',
    changes: [
      { kind: 'improved', text: 'Import now matches names that are a letter off or only part of a name (for example "Utilitis", or "Restaurant" for Restaurant / Dining).', ms: 'Import kini memadankan nama yang salah satu huruf atau hanya sebahagian nama (contohnya "Utilitis", atau "Restaurant" untuk Restaurant / Dining).' }, // i18n-ignore
      { kind: 'improved', text: 'A clear subcategory wins over a loose category word: Income + Dividen goes to Investment > Dividend, not Salary.', ms: 'Subkategori yang jelas mengatasi perkataan kategori yang longgar: Income + Dividen masuk Investment > Dividend, bukan Salary.' }, // i18n-ignore
      { kind: 'new', text: 'Names WaKira cannot match get a suggested category on the review screen, and you can put them in an existing category instead of creating a new one.', ms: 'Nama yang tidak dapat dipadankan diberi cadangan kategori pada skrin semakan, dan anda boleh letak dalam kategori sedia ada dan bukan mencipta yang baharu.' }, // i18n-ignore
      { kind: 'improved', text: 'Subcategories from your file are added to the category, so they also show in More > Categories. Undo removes them again.', ms: 'Subkategori daripada fail anda ditambah pada kategori, jadi ia juga muncul dalam Lagi > Kategori. Buat asal akan membuangnya semula.' }, // i18n-ignore
    ],
  },
  {
    version: '2.0.3',
    date: '2026-10-08',
    title: 'Easier import', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Import lebih mudah',
    changes: [
      { kind: 'new', text: 'Import now has two clear options: use the WaKira template, or use your own file.', ms: 'Import kini ada dua pilihan jelas: guna template WaKira, atau guna fail sendiri.' }, // i18n-ignore
      { kind: 'new', text: 'The template is a real .csv file you can open in Excel or Google Sheets, fill in and choose again. It goes straight to the review with no column matching.', ms: 'Template ialah fail .csv sebenar yang boleh dibuka dalam Excel atau Google Sheets, diisi dan dipilih semula. Ia terus ke semakan tanpa padan lajur.' }, // i18n-ignore
    ],
  },
  {
    version: '2.0.2',
    date: '2026-10-08',
    title: 'A tidier Add account', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Tambah akaun yang lebih kemas',
    changes: [
      { kind: 'improved', text: 'Add / Edit account is tidied into Details, Balance and Look.', ms: 'Tambah / Edit akaun dikemaskan kepada Butiran, Baki dan Rupa.' }, // i18n-ignore
      { kind: 'improved', text: 'Premium card designs are now a swipeable slider.', ms: 'Reka bentuk kad premium kini slider yang boleh diswipe.' }, // i18n-ignore
      { kind: 'improved', text: 'Starting balance is for new accounts only. For an existing card, use Adjust balance: the difference is saved as an adjustment, not income or spending.', ms: 'Baki permulaan hanya untuk akaun baharu. Untuk kad sedia ada, guna Laraskan baki: perbezaannya disimpan sebagai pelarasan, bukan pendapatan atau perbelanjaan.' }, // i18n-ignore
      { kind: 'improved', text: 'Delete account is now a trash icon at the top right, like Edit transaction.', ms: 'Padam akaun kini ikon tong sampah di kanan atas, seperti Edit transaksi.' }, // i18n-ignore
      { kind: 'fixed', text: 'Account Type buttons no longer overlap or wrap ("Saving s").', ms: 'Butang Jenis akaun tidak lagi bertindih atau terpecah ("Saving s").' }, // i18n-ignore
    ],
  },
  {
    version: '2.0.1',
    date: '2026-10-08',
    title: 'Faster entry and tidier Home', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Catat lebih pantas dan Utama lebih kemas',
    changes: [
      { kind: 'improved', text: 'Typing an amount works like a card terminal: 1, 0, 0, 0, 0 reads 0.01, 0.10, 1.00, 10.00, 100.00, with a comma from 1,000.', ms: 'Menaip jumlah kini seperti mesin kad: 1, 0, 0, 0, 0 menjadi 0.01, 0.10, 1.00, 10.00, 100.00, dengan koma bermula 1,000.' }, // i18n-ignore
      { kind: 'new', text: 'Itemised breakdown: add Service charge, SST / Tax, Tip, Delivery and Discount once each, as a % (the app does the maths) or an amount.', ms: 'Pecahan mengikut item: tambah Caj perkhidmatan, SST / Cukai, Tip, Penghantaran dan Diskaun sekali sahaja, sebagai % (apl yang kira) atau jumlah.' }, // i18n-ignore
      { kind: 'new', text: 'Add your own category and subcategory right inside Record transaction. They also appear in More > Categories, where they can be deleted.', ms: 'Tambah kategori dan subkategori sendiri terus dalam Rekod transaksi. Ia juga muncul dalam Lagi > Kategori, tempat ia boleh dipadam.' }, // i18n-ignore
      { kind: 'improved', text: 'Record transaction order: amount, title, itemised breakdown, account, category, subcategory, date.', ms: 'Susunan Rekod transaksi: jumlah, tajuk, pecahan item, akaun, kategori, subkategori, tarikh.' }, // i18n-ignore
      { kind: 'improved', text: 'Home shows the latest 5 transactions with See all underneath.', ms: 'Utama menunjukkan 5 transaksi terkini dengan Lihat semua di bawahnya.' }, // i18n-ignore
      { kind: 'improved', text: 'The tab bar is icons only; press or hover a tab to see its name.', ms: 'Bar tab kini ikon sahaja; tekan atau hover pada tab untuk lihat namanya.' }, // i18n-ignore
      { kind: 'fixed', text: 'The balance on Home cards is no longer shrunk to a tiny size.', ms: 'Baki pada kad Utama tidak lagi mengecil sehingga terlalu halus.' }, // i18n-ignore
      { kind: 'fixed', text: 'Item 1 in the itemised breakdown lines up with the other items.', ms: 'Item 1 dalam pecahan item sejajar dengan item lain.' }, // i18n-ignore
    ],
  },
  {
    version: '2.0.0',
    date: '2026-10-08',
    title: 'A cleaner, more consistent look', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Rupa yang lebih kemas dan seragam',
    changes: [
      { kind: 'improved', text: 'One set of colours, text sizes and corner shapes across every screen, in light and dark mode.', ms: 'Satu set warna, saiz teks dan bentuk bucu pada setiap skrin, dalam mod cerah dan gelap.' }, // i18n-ignore
      { kind: 'improved', text: 'All switchers (Week/Month/Year, Faham tabs and ranges, reminders, budget alerts) now look and slide the same way.', ms: 'Semua pemilih (Minggu/Bulan/Tahun, tab dan julat Faham, peringatan, amaran bajet) kini sama rupa dan gelongsorannya.' }, // i18n-ignore
      { kind: 'improved', text: 'Transactions are grouped by day in rounded cards on Home and Transactions.', ms: 'Transaksi dikumpul ikut hari dalam kad bulat di Utama dan Transaksi.' }, // i18n-ignore
      { kind: 'improved', text: 'Profile now holds your account: email, Security and Log out. Settings keeps app preferences only.', ms: 'Profil kini memegang akaun anda: e-mel, Keselamatan dan Log keluar. Tetapan hanya untuk pilihan aplikasi.' }, // i18n-ignore
      { kind: 'improved', text: 'Pick your state from a list instead of a wall of buttons.', ms: 'Pilih negeri daripada senarai, bukan deretan butang.' }, // i18n-ignore
      { kind: 'fixed', text: 'Long category and goal names and amounts are no longer cut off with "…" in Faham, Budgets and Rancang.', ms: 'Nama kategori, matlamat dan jumlah yang panjang tidak lagi terpotong dengan "…" dalam Faham, Bajet dan Rancang.' }, // i18n-ignore
      { kind: 'fixed', text: 'The black avatar colour is visible in dark mode, and your name lines up under your avatar.', ms: 'Warna avatar hitam kelihatan dalam mod gelap, dan nama anda sejajar di bawah avatar.' }, // i18n-ignore
    ],
  },
  {
    version: '1.9.1',
    date: '2026-10-08',
    title: 'Fixes and tidy-up', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Pembetulan dan kemas',
    changes: [
      { kind: 'fixed', text: 'After signing in or registering you now land on the right screen instead of the Privacy Notice.', ms: 'Selepas log masuk atau daftar, anda kini terus ke skrin yang betul dan bukan Notis Privasi.' }, // i18n-ignore
      { kind: 'fixed', text: 'Percentage comparisons no longer show huge numbers like 3884% when last period was only a few ringgit. Very large changes are capped at 999%+.', ms: 'Perbandingan peratus tidak lagi memaparkan nombor melampau seperti 3884% apabila tempoh lepas cuma beberapa ringgit. Perubahan sangat besar dihadkan kepada 999%+.' }, // i18n-ignore
      { kind: 'fixed', text: 'A clear message when the sign-up email cannot be sent.', ms: 'Mesej yang jelas apabila e-mel pendaftaran tidak dapat dihantar.' }, // i18n-ignore
      { kind: 'improved', text: 'Updated the What\'s new banner, the Reset data wording and the version line in More.', ms: 'Kemas kini sepanduk Apa yang baharu, teks Set semula data dan baris versi dalam Lagi.' }, // i18n-ignore
    ],
  },
  {
    version: '1.9.0',
    date: '2026-10-08',
    title: 'Sign in with Google and Apple', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Log masuk dengan Google dan Apple',
    changes: [
      { kind: 'new', text: 'Continue with Google on the sign-in and sign-up screens, and Continue with Apple on iPhone.', ms: 'Teruskan dengan Google pada skrin log masuk dan daftar, dan Teruskan dengan Apple pada iPhone.' }, // i18n-ignore
      { kind: 'new', text: 'Connect or disconnect Google and Apple on your existing account in Profile > Security. Accounts with the same email are joined automatically.', ms: 'Sambung atau putuskan Google dan Apple pada akaun sedia ada dalam Profil > Keselamatan. Akaun dengan e-mel yang sama digabungkan secara automatik.' }, // i18n-ignore
      { kind: 'new', text: 'An account that started with Google or Apple can set a password later, so it can also sign in with email.', ms: 'Akaun yang bermula dengan Google atau Apple boleh menetapkan kata laluan kemudian, supaya boleh juga log masuk dengan e-mel.' }, // i18n-ignore
      { kind: 'fixed', text: 'The Privacy Notice now opens from Profile > Data and About while you are signed in.', ms: 'Notis Privasi kini dibuka dari Profil > Data dan Perihal semasa anda log masuk.' }, // i18n-ignore
    ],
  },
  {
    version: '1.8.0',
    date: '2026-10-08',
    title: 'Security', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Keselamatan',
    changes: [
      { kind: 'new', text: 'App lock: protect WaKira with a 6-digit PIN, and optionally fingerprint or Face ID. It locks when you open the app and after it has been in the background for the time you choose. Find it in Profile > Security.', ms: 'Kunci aplikasi: lindungi WaKira dengan PIN 6 digit, dan pilihan cap jari atau Face ID. Ia mengunci apabila anda membuka aplikasi dan selepas aplikasi berada di latar belakang mengikut masa pilihan anda. Ada dalam Profil > Keselamatan.' }, // i18n-ignore
      { kind: 'new', text: 'Change your password inside the app, with the option to sign out your other devices at the same time.', ms: 'Tukar kata laluan dalam aplikasi, dengan pilihan untuk log keluar peranti lain serentak.' }, // i18n-ignore
      { kind: 'new', text: 'Sign out other devices: end the sign-in on every other phone or tablet while keeping this one.', ms: 'Log keluar peranti lain: tamatkan log masuk pada setiap telefon atau tablet lain sambil mengekalkan yang ini.' }, // i18n-ignore
      { kind: 'improved', text: 'Your PIN never leaves this phone. It is stored hashed in secure storage, and repeated wrong tries make the keypad wait longer each time.', ms: 'PIN anda tidak pernah meninggalkan telefon ini. Ia disimpan dalam bentuk hash dalam storan selamat, dan percubaan salah berulang menjadikan papan kekunci menunggu lebih lama setiap kali.' }, // i18n-ignore
    ],
  },
  {
    version: '1.7.2',
    date: '2026-10-08',
    title: 'State holidays and weekends', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Cuti negeri dan hujung minggu',
    changes: [
      { kind: 'new', text: 'Choose your country and state in Profile. Payday that is moved to a working day now also skips your state public holidays.', ms: 'Pilih negara dan negeri anda dalam Profil. Hari gaji yang dialihkan ke hari bekerja kini turut melangkau cuti umum negeri anda.' }, // i18n-ignore
      { kind: 'new', text: 'Kedah, Kelantan and Terengganu use a Friday and Saturday weekend, so payday moves back from those days instead of Saturday and Sunday.', ms: 'Kedah, Kelantan dan Terengganu menggunakan hujung minggu Jumaat dan Sabtu, jadi hari gaji dialihkan ke belakang dari hari tersebut dan bukannya Sabtu dan Ahad.' }, // i18n-ignore
      { kind: 'improved', text: 'Choosing Other as country skips weekends only. Holiday dates cover 2026 and 2027 and depend on announcements, so check your own calendar.', ms: 'Memilih Lain-lain sebagai negara hanya melangkau hujung minggu. Tarikh cuti meliputi 2026 dan 2027 dan bergantung pada pengumuman, jadi semak kalendar anda sendiri.' }, // i18n-ignore
    ],
  },
  {
    version: '1.7.1',
    date: '2026-10-08',
    title: 'Payday at month end', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Gaji hujung bulan',
    changes: [
      { kind: 'new', text: 'Payday can now be the last day of the month (31 Jan, 28 Feb, 31 Mar and so on). Turn on Last day of the month in Profile.', ms: 'Hari gaji kini boleh ditetapkan pada hari terakhir bulan (31 Jan, 28 Feb, 31 Mac dan seterusnya). Hidupkan Hari terakhir bulan dalam Profil.' }, // i18n-ignore
      { kind: 'new', text: 'Working day before: if payday falls on a Saturday, Sunday or a Malaysian public holiday, WaKira uses the working day before it. For example, a 31 Jan that falls on a Sunday becomes Friday 29 Jan. A Friday stays a Friday. This also works with a fixed payday such as the 25th.', ms: 'Hari bekerja sebelumnya: jika hari gaji jatuh pada Sabtu, Ahad atau cuti umum Malaysia, WaKira guna hari bekerja sebelumnya. Contohnya 31 Jan yang jatuh pada hari Ahad menjadi Jumaat 29 Jan. Hari Jumaat kekal Jumaat. Ia juga berfungsi dengan hari gaji tetap seperti 25hb.' }, // i18n-ignore
      { kind: 'improved', text: 'Profile shows your next payday and why it moved. Public holidays are the national ones for 2026 and 2027; state holidays are not included, and for other years only weekends are skipped.', ms: 'Profil menunjukkan hari gaji seterusnya dan sebab ia dialihkan. Cuti umum ialah cuti kebangsaan bagi 2026 dan 2027; cuti negeri tidak termasuk, dan bagi tahun lain hanya hujung minggu dilangkau.' }, // i18n-ignore
    ],
  },
  {
    version: '1.7.0',
    date: '2026-10-08',
    title: 'Payday and financial month', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Hari gaji dan bulan kewangan',
    changes: [
      { kind: 'new', text: 'Set your payday in Profile. If you are paid on the 25th, your month now runs from the 25th to the 24th, and 25 Sep to 24 Oct counts as October. It starts as day 1, which keeps normal calendar months, so nothing changes until you choose a payday.', ms: 'Tetapkan hari gaji anda dalam Profil. Jika gaji masuk pada 25hb, bulan anda kini bermula 25hb hingga 24hb, dan 25 Sep hingga 24 Okt dikira sebagai Oktober. Ia bermula pada hari 1, iaitu bulan kalendar biasa, jadi tiada apa berubah sehingga anda memilih hari gaji.' }, // i18n-ignore
      { kind: 'improved', text: 'Budgets, the month switcher in Transactions, Home totals, charts, Faham, forecasts, insights, the WaKira score, goal monthly savings and budget alerts all follow your financial month. Under the month name you will see its dates, such as 25 Sep - 24 Oct.', ms: 'Bajet, penukar bulan dalam Transaksi, jumlah di Utama, carta, Faham, ramalan, insight, skor WaKira, simpanan bulanan matlamat dan amaran bajet semuanya mengikut bulan kewangan anda. Di bawah nama bulan anda akan nampak tarikhnya, seperti 25 Sep - 24 Okt.' }, // i18n-ignore
      { kind: 'improved', text: 'The budget card in More shows how many days are left until payday, and the month pace in Budgets counts the days of your own month.', ms: 'Kad bajet dalam Lagi menunjukkan berapa hari lagi ke hari gaji, dan kadar bulan dalam Bajet mengira hari dalam bulan anda sendiri.' }, // i18n-ignore
      { kind: 'improved', text: 'Your records are never changed. Switching payday only changes how they are grouped, and you can switch back at any time.', ms: 'Rekod anda tidak pernah diubah. Menukar hari gaji hanya mengubah cara ia dikumpulkan, dan anda boleh menukarnya semula pada bila-bila masa.' }, // i18n-ignore
    ],
  },
  {
    version: '1.6.0',
    date: '2026-10-08',
    title: 'Profile and trust', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Profil dan kepercayaan',
    changes: [
      { kind: 'new', text: 'A real Profile screen: your name, avatar colour and email, plus a financial snapshot worked out from your own records (average income, spending, saved per month, savings rate, active goals and budgets). It needs 3 full months of records, and nothing in it is typed in, so it can never disagree with your transactions.', ms: 'Skrin Profil sebenar: nama, warna avatar dan emel anda, serta ringkasan kewangan yang dikira daripada rekod anda sendiri (purata pendapatan, belanja, simpanan sebulan, kadar simpanan, matlamat dan bajet aktif). Ia perlukan 3 bulan penuh rekod, dan tiada apa di dalamnya ditaip, jadi ia tidak akan bercanggah dengan transaksi anda.' }, // i18n-ignore
      { kind: 'new', text: 'Set your own savings-rate target (default 20%). The WaKira score now judges your saving against it.', ms: 'Tetapkan sasaran kadar simpanan sendiri (asal 20%). Skor WaKira kini menilai simpanan anda berdasarkan sasaran itu.' }, // i18n-ignore
      { kind: 'new', text: 'Data & Privacy now has its own page: cloud sync, restore, hide amounts, export, import, policies, reset and delete account. New About page with version, help answers and how WaKira treats your data, plus a draft Terms of use.', ms: 'Data & Privasi kini ada halaman sendiri: penyegerakan awan, pulihkan, sembunyi jumlah, eksport, import, dasar, set semula dan padam akaun. Halaman Perihal baharu dengan versi, jawapan bantuan dan cara WaKira melayan data anda, serta draf Terma penggunaan.' }, // i18n-ignore
      { kind: 'new', text: 'New goal? Tap the emergency fund template. It fills in the name and a target of 6 months of your average spending.', ms: 'Matlamat baharu? Tekan templat dana kecemasan. Ia mengisi nama dan sasaran 6 bulan purata belanja anda.' }, // i18n-ignore
      { kind: 'improved', text: 'Settings is lighter: data and privacy moved to their own page, and the profile editor moved to Profile. Tapping your name on Home or More opens Profile.', ms: 'Tetapan lebih ringkas: data dan privasi dipindah ke halaman sendiri, dan penyunting profil dipindah ke Profil. Menekan nama anda di Utama atau Lagi membuka Profil.' }, // i18n-ignore
    ],
  },
  {
    version: '1.5.1',
    date: '2026-10-07',
    title: 'Swipe, reorder and safer goals', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Leret, susun dan matlamat lebih selamat',
    changes: [
      { kind: 'new', text: 'Swipe a record left for Edit and Delete, and all the way to delete it at once. A short Undo bar brings it back. Swipe right to copy it to today. Accounts and goals swipe left too; deleting an account still asks first, because its records go with it.', ms: 'Leret rekod ke kiri untuk Edit dan Padam, dan sampai habis untuk padam terus. Bar Buat asal pendek memulihkannya. Leret ke kanan untuk salin ke hari ini. Akaun dan matlamat juga boleh dileret ke kiri; memadam akaun tetap bertanya dahulu kerana rekodnya turut hilang.' }, // i18n-ignore
      { kind: 'new', text: 'In Assets, press and hold an account and drag to change the order. The card carousel on Home follows the same order.', ms: 'Dalam Aset, tekan dan tahan satu akaun dan seret untuk ubah susunan. Karusel kad di Utama mengikut susunan yang sama.' }, // i18n-ignore
      { kind: 'new', text: 'Goals can start with an amount already saved. A card in Plan shows how each savings account is divided between its goals and how much is not set aside for any goal.', ms: 'Matlamat boleh bermula dengan jumlah yang sudah disimpan. Kad dalam Rancang menunjukkan bagaimana setiap akaun simpanan dibahagikan antara matlamatnya dan berapa yang belum diperuntukkan.' }, // i18n-ignore
      { kind: 'improved', text: 'If a sync ever replaces data on your phone, the older copy is now kept aside and can be brought back from Settings.', ms: 'Jika penyegerakan menggantikan data dalam telefon anda, salinan lama kini diketepikan dan boleh dipulihkan dari Tetapan.' }, // i18n-ignore
    ],
  },
  {
    version: '1.5.0',
    date: '2026-10-07',
    title: 'Insights and a clearer goal screen', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Insight dan skrin matlamat lebih jelas',
    changes: [
      { kind: 'new', text: 'New Insights tab in Faham: a WaKira score out of 100 with five factors, then short findings that each end with what to do, such as why you spent more, weekend spending, committed income, savings cushion, budget risk and goals that are late.', ms: 'Tab Insight baharu dalam Faham: skor WaKira daripada 100 dengan lima faktor, kemudian penemuan ringkas yang setiap satunya berakhir dengan apa nak buat, seperti kenapa belanja naik, belanja hujung minggu, pendapatan terikat, kusyen simpanan, risiko bajet dan matlamat yang lewat.' }, // i18n-ignore
      { kind: 'new', text: 'Share summary: copies a short, anonymous summary of your numbers so you can ask any AI assistant you trust. WaKira sends nothing by itself.', ms: 'Kongsi ringkasan: menyalin ringkasan pendek tanpa nama angka anda supaya boleh ditanya kepada mana-mana pembantu AI yang anda percayai. WaKira tidak menghantar apa-apa sendiri.' }, // i18n-ignore
      { kind: 'improved', text: 'Goal screen now shows On track, A little late or Off track with a plain reason, a month-by-month deposit calendar for the year (deposited, missed, this month), a recurring deposit card with a suggested amount, and a Review goal button.', ms: 'Skrin matlamat kini menunjukkan Atas landasan, Sedikit lewat atau Lari landasan dengan sebab yang jelas, kalendar simpanan bulan demi bulan untuk tahun ini (dimasukkan, terlepas, bulan ini), kad simpanan berulang dengan jumlah cadangan, dan butang Semak matlamat.' }, // i18n-ignore
    ],
  },
  {
    version: '1.4.1',
    date: '2026-10-07',
    title: 'Forecast charts', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Carta ramalan',
    changes: [
      { kind: 'new', text: 'Goals have a Use this account balance switch: everything in the linked savings account counts as saved, so the goal follows the account by itself.', ms: 'Matlamat ada suis Guna baki akaun ini: semua wang dalam akaun simpanan yang dipaut dikira sebagai simpanan, jadi matlamat mengikut akaun dengan sendiri.' }, // i18n-ignore
      { kind: 'new', text: 'Forecast tab now has line charts. For each goal: saved so far, where your current pace leads, and what you must save each month to hit the due date. Plus charts for all savings and for spending, with a likely range.', ms: 'Tab Ramalan kini ada carta garisan. Untuk setiap matlamat: simpanan setakat ini, arah kadar semasa, dan jumlah yang perlu disimpan sebulan untuk capai tarikh akhir. Serta carta semua simpanan dan belanja, dengan julat berkemungkinan.' }, // i18n-ignore
    ],
  },
  {
    version: '1.4.0',
    date: '2026-10-07',
    title: 'Goals and forecast', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Matlamat dan ramalan',
    changes: [
      { kind: 'new', text: 'Savings goals now have a monthly amount, a purpose, a target and a due date. Pick a goal when you transfer to savings and the money counts toward it. Delete the transfer and the contribution goes too.', ms: 'Matlamat simpanan kini ada jumlah bulanan, tujuan, sasaran dan tarikh akhir. Pilih matlamat semasa memindahkan ke simpanan dan wang itu dikira. Padam pindahan dan sumbangan turut hilang.' }, // i18n-ignore
      { kind: 'new', text: 'New Tabung account type for savings. Goals can create an automatic monthly transfer, be paused, ranked by priority, and show 25, 50, 75 and 100% milestones and an estimated finish date.', ms: 'Jenis akaun Tabung baharu untuk simpanan. Matlamat boleh membuat pindahan bulanan automatik, dijeda, disusun mengikut keutamaan, dan menunjukkan pencapaian 25, 50, 75 dan 100% serta anggaran tarikh siap.' }, // i18n-ignore
      { kind: 'new', text: 'Goals now appear in Recurring as a monthly commitment, and you get a reminder when a goal is behind for the month.', ms: 'Matlamat kini muncul dalam Berulang sebagai komitmen bulanan, dan anda dapat peringatan apabila matlamat ketinggalan bulan itu.' }, // i18n-ignore
      { kind: 'new', text: 'Faham has a Forecast tab: this month so far, the next 3 months of spending, income, saving and what is left, savings rate, runway and when each goal will finish.', ms: 'Faham ada tab Ramalan: bulan ini setakat ini, 3 bulan akan datang untuk belanja, pendapatan, simpanan dan baki, kadar simpanan, tempoh tahan dan bila setiap matlamat siap.' }, // i18n-ignore
    ],
  },
  {
    version: '1.3.3',
    date: '2026-10-07',
    title: 'Debt payments you can see', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Bayaran hutang yang boleh dilihat',
    changes: [
      { kind: 'new', text: 'Every debt payment and loan payout now shows in Transactions as a row such as "Maybank to SLoan", so you can see where the money went. These rows are not counted as spending or income.', ms: 'Setiap bayaran hutang dan wang pinjaman kini muncul dalam Transaksi sebagai baris seperti "Maybank ke SLoan", supaya anda nampak ke mana wang pergi. Baris ini tidak dikira sebagai belanja atau pendapatan.' }, // i18n-ignore
      { kind: 'improved', text: 'Instalment plans now take interest as a percentage. Choose per month, or of the price, or type RM per month. Leave it empty for 0%. WaKira works out each payment and the total you pay.', ms: 'Pelan ansuran kini menerima faedah dalam peratus. Pilih sebulan, atau daripada harga, atau taip RM sebulan. Kosongkan untuk 0%. WaKira kira setiap bayaran dan jumlah yang anda bayar.' }, // i18n-ignore
    ],
  },
  {
    version: '1.3.2',
    date: '2026-10-07',
    title: 'Savings in your budget', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Simpanan dalam bajet',
    changes: [
      { kind: 'new', text: 'Transfers have a new Count in budget switch. Use it when you move money into a savings account: the transfer shows in Transactions and uses the budget of the category you pick, such as Financial.', ms: 'Pindahan ada suis baharu Kira dalam bajet. Gunakannya apabila anda memindahkan wang ke akaun simpanan: pindahan itu muncul dalam Transaksi dan menggunakan bajet kategori pilihan anda, seperti Kewangan.' }, // i18n-ignore
      { kind: 'improved', text: 'It is still not income and not part of your spending total. Transactions shows what you put aside this month on its own line. The switch turns on by itself when the destination looks like a savings account.', ms: 'Ia tetap bukan pendapatan dan bukan sebahagian jumlah belanja. Transaksi menunjukkan wang yang diketepikan bulan ini pada baris tersendiri. Suis hidup sendiri apabila akaun destinasi kelihatan seperti akaun simpanan.' }, // i18n-ignore
    ],
  },
  {
    version: '1.3.1',
    date: '2026-10-06',
    title: 'Smoother loading', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Pemuatan lebih lancar',
    changes: [
      { kind: 'improved', text: 'While your data loads from this phone or the server, screens now show grey placeholders instead of looking empty. This covers Home, Transactions, Assets, Analyse, Plan, Recurring, Budgets and Debts.', ms: 'Semasa data dimuat dari telefon ini atau pelayan, skrin kini menunjukkan ruang kelabu sementara, bukan kelihatan kosong. Ini meliputi Utama, Transaksi, Aset, Faham, Rancang, Berulang, Bajet dan Hutang.' }, // i18n-ignore
      { kind: 'new', text: 'A small note on Home shows when changes are being synced to the server, or are waiting for you to get back online.', ms: 'Nota kecil di Utama muncul apabila perubahan sedang diselaraskan ke pelayan, atau menunggu anda kembali dalam talian.' }, // i18n-ignore
      { kind: 'improved', text: 'Placeholders stay still if your phone has reduce motion turned on.', ms: 'Ruang sementara tidak bergerak jika telefon anda menghidupkan kurangkan gerakan.' }, // i18n-ignore
    ],
  },
  {
    version: '1.3.0',
    date: '2026-10-06',
    title: 'Debts & instalments', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Hutang & ansuran',
    changes: [
      { kind: 'new', text: 'Record PayLater purchases (SPayLater, Atome, TikTok PayLater) and loans (SLoan, TikTok Financing, personal or car loans) under More, Debts. WaKira builds the payment schedule and tracks what is left.', ms: 'Rekod pembelian PayLater (SPayLater, Atome, TikTok PayLater) dan pinjaman (SLoan, TikTok Financing, pinjaman peribadi atau kereta) di Lagi, Hutang. WaKira bina jadual bayaran dan jejak baki.' }, // i18n-ignore
      { kind: 'new', text: 'A purchase counts as spending on the day you bought it. Paying an instalment only moves money, and a loan you receive is not income. Only interest and fees count as spending.', ms: 'Pembelian dikira sebagai belanja pada hari anda beli. Membayar ansuran hanya memindahkan wang, dan pinjaman yang diterima bukan pendapatan. Hanya faedah dan fi dikira sebagai belanja.' }, // i18n-ignore
      { kind: 'new', text: 'See the total you owe, what is due this month and the date you will be debt-free. Pay off early, undo a payment, or add a debt you already started paying.', ms: 'Lihat jumlah hutang, bayaran bulan ini dan tarikh anda bebas hutang. Langsaikan awal, batalkan bayaran, atau tambah hutang yang sudah dibayar sebahagian.' }, // i18n-ignore
      { kind: 'new', text: 'Credit lines show your limit, what you used and what is left. Get a reminder before each payment or bill is due.', ms: 'Had kredit tunjuk had, jumlah digunakan dan baki. Dapatkan peringatan sebelum setiap bayaran atau bil jatuh tempo.' }, // i18n-ignore
    ],
  },
  {
    version: '1.2.1',
    date: '2026-10-06',
    title: 'Deeper analysis', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Analisis lebih mendalam',
    changes: [
      { kind: 'new', text: 'Faham has a new Deep dive tab: a month-end spending forecast that counts your recurring bills, a daily calendar heat map, fixed bills vs everyday spending, and your biggest spending items.', ms: 'Faham ada tab Terperinci yang baharu: ramalan perbelanjaan hujung bulan yang mengambil kira bil berulang, kalendar haba harian, bil tetap berbanding belanja harian, dan perkara paling banyak dibelanjakan.' }, // i18n-ignore
      { kind: 'new', text: 'See where your income comes from and how steady it is, records and averages, your longest no-spend run, a budget report card, and unusually large expenses.', ms: 'Lihat dari mana pendapatan anda datang dan betapa stabilnya, rekod dan purata, rentetan terpanjang tanpa belanja, kad laporan bajet, dan belanja luar biasa besar.' }, // i18n-ignore
      { kind: 'new', text: 'Follow one category month by month, see when in the month you spend, spending by account, and your total money over time.', ms: 'Ikuti satu kategori bulan demi bulan, lihat bila dalam bulan anda berbelanja, perbelanjaan mengikut akaun, dan jumlah wang anda dari semasa ke semasa.' }, // i18n-ignore
    ],
  },
  {
    version: '1.2.0',
    date: '2026-10-06',
    title: 'Import your old records', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Import rekod lama anda',
    changes: [
      { kind: 'new', text: 'Already tracking in Excel or Google Sheets? Import your records from an .xlsx or .csv file: Settings, then Import from Excel or CSV.', ms: 'Sudah mencatat dalam Excel atau Google Sheets? Import rekod anda daripada fail .xlsx atau .csv: Tetapan, kemudian Import dari Excel atau CSV.' }, // i18n-ignore
      { kind: 'new', text: 'WaKira guesses the columns, understands dates like 31/12/2026 or 5 Mac 2026, and handles separate money-out and money-in columns, as in bank statements.', ms: 'WaKira meneka lajur, memahami tarikh seperti 31/12/2026 atau 5 Mac 2026, dan menyokong lajur wang keluar dan wang masuk yang berasingan, seperti dalam penyata bank.' }, // i18n-ignore
      { kind: 'new', text: 'You review everything first: match new category and account names, skip records already in WaKira, and undo the whole import if it is not right.', ms: 'Anda semak semuanya dahulu: padankan nama kategori dan akaun baharu, langkau rekod yang sudah ada dalam WaKira, dan batalkan seluruh import jika tidak betul.' }, // i18n-ignore
    ],
  },
  {
    version: '1.1.2',
    date: '2026-10-06',
    title: 'Fuller categories', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Kategori lebih lengkap',
    changes: [
      { kind: 'new', text: 'New default categories: 15 for spending (Food & Drinks, Transport, Housing & Utilities, Health, Education, Travel, Subscriptions and more) and 4 for income (Salary, Business & Freelance, Investment, Other Income), each with ready-made subcategories in English and Malay.', ms: 'Kategori lalai baharu: 15 untuk perbelanjaan (Makanan & Minuman, Pengangkutan, Perumahan & Utiliti, Kesihatan, Pendidikan, Pelancongan, Langganan dan lain-lain) dan 4 untuk pendapatan (Gaji, Perniagaan & Kerja Bebas, Pelaburan, Pendapatan Lain), setiap satu dengan subkategori siap pakai dalam Bahasa Melayu dan Inggeris.' }, // i18n-ignore
      { kind: 'improved', text: 'Your existing categories, budgets and transactions stay exactly as they are. Only default names you never changed are updated, and new categories are added with no budget.', ms: 'Kategori, bajet dan transaksi sedia ada anda kekal sama. Hanya nama lalai yang tidak pernah anda ubah dikemas kini, dan kategori baharu ditambah tanpa bajet.' }, // i18n-ignore
      { kind: 'improved', text: 'Transfers between your accounts remain separate from spending and income, so moving money to savings never shows up as an expense.', ms: 'Pindahan antara akaun anda kekal berasingan daripada perbelanjaan dan pendapatan, jadi memindahkan wang ke simpanan tidak pernah dikira sebagai perbelanjaan.' }, // i18n-ignore
    ],
  },
  {
    version: '1.1.1',
    date: '2026-10-06',
    title: 'Recurring transfers', // i18n-ignore: bilingual data, see titleMs
    titleMs: 'Pindahan berulang',
    changes: [
      { kind: 'new', text: 'Recurring can now move money from one of your accounts to another on a schedule, for example a monthly savings top-up or a card payment. Choose Transfer when you add a recurring item.', ms: 'Berulang kini boleh memindahkan wang dari satu akaun anda ke akaun lain mengikut jadual, contohnya tambah simpanan bulanan atau bayaran kad. Pilih Pindahan semasa menambah item berulang.' }, // i18n-ignore
      { kind: 'new', text: 'A recurring transfer can be fixed (recorded automatically) or confirm each time, when the amount changes.', ms: 'Pindahan berulang boleh ditetapkan tetap (direkodkan secara automatik) atau disahkan setiap kali, apabila jumlahnya berubah.' }, // i18n-ignore
      { kind: 'improved', text: 'Transfers are never counted as spending or income, so they stay out of your monthly commitment, bills and reminders.', ms: 'Pindahan tidak pernah dikira sebagai perbelanjaan atau pendapatan, jadi ia tidak masuk dalam komitmen bulanan, bil dan peringatan anda.' }, // i18n-ignore
    ],
  },
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
