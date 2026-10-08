import type { Lang } from '@/i18n';

export type ChangeKind = 'new' | 'improved' | 'fixed';
export type ChangeEntry = { kind: ChangeKind; text: string; ms: string };
export type Release = { version: string; date: string; title: string; titleMs: string; changes: ChangeEntry[] };

export const CURRENT_VERSION = '1.9.1';

export const CHANGELOG: Release[] = [
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
