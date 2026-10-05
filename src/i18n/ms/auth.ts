import type { enAuth } from '../en/auth';

// Malay wording: every key in en/auth.ts must exist here (TypeScript enforces it).
export const msAuth: Record<keyof typeof enAuth, string> = {
  // brand
  'auth.brand.slogan': 'Kira Duit. Faham Corak. Rancang Masa Depan.',
  'auth.pillar.kira.label': 'Kira',
  'auth.pillar.kira.hint': 'Rekod pendapatan dan perbelanjaan',
  'auth.pillar.faham.label': 'Faham',
  'auth.pillar.faham.hint': 'Fahami corak wang anda',
  'auth.pillar.rancang.label': 'Rancang',
  'auth.pillar.rancang.hint': 'Bajet dan matlamat simpanan',

  // shared fields
  'auth.field.email': 'E-mel',
  'auth.field.emailPlaceholder': 'nama@contoh.com',
  'auth.field.password': 'Kata laluan',
  'auth.field.toggleHint': 'Tunjuk/sembunyi kata laluan',

  // errors (returned by sign-up / sign-in)
  'auth.error.emailInvalid': 'Format e-mel tidak sah.',
  'auth.error.nameRequired': 'Sila masukkan nama paparan.',
  'auth.error.passwordWeak': 'Kata laluan mesti sekurang-kurangnya 8 aksara, ada huruf dan nombor.',
  'auth.error.consentRequired': 'Sila setuju dengan Notis Privasi untuk teruskan.',
  'auth.error.emailTaken': 'E-mel ini sudah didaftarkan.',
  'auth.error.badCredentials': 'E-mel atau kata laluan tidak betul.',

  // login
  'auth.login.passwordPlaceholder': 'Kata laluan anda',
  'auth.login.forgotTitle': 'Lupa kata laluan',
  'auth.login.forgotMessage': 'Menetapkan semula kata laluan memerlukan akaun awan. Ia tidak tersedia dalam mod luar talian ini.',
  'auth.login.forgotLink': 'Lupa kata laluan?',
  'auth.login.wait': 'Sila tunggu...',
  'auth.login.submit': 'Log masuk',
  'auth.login.noAccount': 'Belum ada akaun?',
  'auth.login.register': 'Daftar',
  'auth.login.simulation': 'Mod simulasi: akaun disimpan pada peranti ini sahaja.',

  // register
  'auth.register.title': 'Daftar akaun',
  'auth.register.displayName': 'Nama paparan',
  'auth.register.displayNamePlaceholder': 'Cth: Aqil',
  'auth.register.passwordLabel': 'Kata laluan (min 8 aksara, ada huruf dan nombor)',
  'auth.register.confirmPassword': 'Sahkan kata laluan',
  'auth.register.mismatch': 'Kata laluan tidak sepadan',
  'auth.register.language': 'Bahasa',
  'auth.register.consentBefore': 'Saya telah membaca dan bersetuju dengan ',
  'auth.register.consentLink': 'Notis Privasi',
  'auth.register.consentAfter': ' dan membenarkan data saya diproses seperti dinyatakan.',
  'auth.register.wait': 'Sila tunggu...',
  'auth.register.submit': 'Daftar',

  // onboarding: goals
  'auth.onboarding.goal.track': 'Jejak perbelanjaan',
  'auth.onboarding.goal.budget': 'Urus bajet',
  'auth.onboarding.goal.save': 'Kumpul simpanan',
  'auth.onboarding.goal.debt': 'Kurangkan hutang',

  // onboarding: tips
  'auth.onboarding.tip.add.title': 'Tambah rekod',
  'auth.onboarding.tip.add.body': 'Tekan butang + di tengah bar bawah untuk merekod perbelanjaan, pendapatan atau pindahan antara akaun. Boleh dipecahkan kepada item (cth. nasi lemak, SST).',
  'auth.onboarding.tip.cards.title': 'Kad akaun',
  'auth.onboarding.tip.cards.body': 'Di Utama, leret kad ke tepi untuk menukar akaun. Carta dan senarai di bawah akan mengikut akaun yang dipilih.',
  'auth.onboarding.tip.analyse.title': 'Faham',
  'auth.onboarding.tip.analyse.body': 'Tab Faham menunjukkan pendapatan berbanding perbelanjaan setiap bulan, ke mana wang pergi, hari paling boros dan beberapa ringkasan pantas.',
  'auth.onboarding.tip.plan.title': 'Rancang',
  'auth.onboarding.tip.plan.body': 'Lagi > Rancang: sasaran simpanan, bil akan datang dan peringatan di satu tempat. Bajet juga boleh dilihat dari sini.',
  'auth.onboarding.tip.recurring.title': 'Berulang',
  'auth.onboarding.tip.recurring.body': 'Lagi > Berulang: gaji, sewa atau langganan direkod sendiri pada tarikhnya. Pilih "Sahkan setiap kali" jika jumlahnya berubah-ubah (cth. bil elektrik).',
  'auth.onboarding.tip.assets.title': 'Aset dan pindahan',
  'auth.onboarding.tip.assets.body': 'Lagi > Aset: semua akaun dan jumlah nilai bersih. Memindahkan wang antara akaun tidak dikira sebagai perbelanjaan atau pendapatan.',
  'auth.onboarding.tip.budgets.title': 'Bajet',
  'auth.onboarding.tip.budgets.body': 'Lagi > Bajet: tetapkan had bulanan bagi setiap kategori dan lihat berapa selamat dibelanjakan sehari.',
  'auth.onboarding.tip.reminders.title': 'Peringatan',
  'auth.onboarding.tip.reminders.body': 'Lagi > Rancang > Peringatan: hidupkan pemberitahuan untuk bil yang hampir tiba dan amaran bila bajet hampir habis. Anda yang memilih, dan boleh dimatikan bila-bila masa.',
  'auth.onboarding.tip.privacy.title': 'Privasi',
  'auth.onboarding.tip.privacy.body': 'Tekan ikon mata untuk menyembunyikan semua jumlah apabila berada di tempat awam.',
  'auth.onboarding.tip.data.title': 'Data anda',
  'auth.onboarding.tip.data.body': 'Lagi > Tetapan: eksport CSV, ulang tutorial, atau padam akaun dan semua data anda.',

  // onboarding: welcome
  'auth.onboarding.hello': 'Hai, {name}!',
  'auth.onboarding.welcomeBody': '{app} membantu anda mencatat, memahami dan merancang wang anda. Persediaan mengambil masa kurang 2 minit dan semua langkah adalah pilihan.',

  // onboarding: setup
  'auth.onboarding.goalTitle': 'Apa matlamat anda?',
  'auth.onboarding.balanceTitle': 'Baki permulaan',
  'auth.onboarding.balanceBody': 'Anggaran baki hari ini. Boleh diubah kemudian di Lagi > Aset. Boleh dikosongkan.',
  'auth.onboarding.bank': 'Bank',
  'auth.onboarding.cash': 'Tunai',

  // onboarding: plan
  'auth.onboarding.salaryTitle': 'Gaji anda',
  'auth.onboarding.salaryBody': 'Pilihan. Isi gaji bersih (selepas KWSP dan PERKESO) dan kami akan merekodkannya sendiri setiap bulan, bermula pada tarikh gaji seterusnya. Boleh dilangkau dan ditambah kemudian di Lagi > Berulang.',
  'auth.onboarding.netSalary': 'Gaji bersih',
  'auth.onboarding.payDay': 'Tarikh gaji (hari dalam bulan)',
  'auth.onboarding.payDayInvalid': 'Masukkan tarikh gaji antara 1 dan 31, atau kosongkan gaji untuk melangkau.',
  'auth.onboarding.salaryVaries': 'Jumlah berubah-ubah',
  'auth.onboarding.salaryVariesHint': 'Kami tanya jumlah sebenar setiap bulan, bukan rekod sendiri.',
  'auth.onboarding.salaryRecurringTitle': 'Gaji',
  'auth.onboarding.goalSectionTitle': 'Sasaran simpanan pertama',
  'auth.onboarding.goalSectionBody': 'Pilihan. Contoh: Dana kecemasan, Umrah, Kereta. Tarikh akhir boleh ditetapkan kemudian di Lagi > Rancang.',
  'auth.onboarding.goalNamePlaceholder': 'Nama sasaran',
  'auth.onboarding.goalTarget': 'Sasaran',
  'auth.onboarding.hintBudget': 'Bajet bulanan bagi setiap kategori boleh ditetapkan di Lagi > Bajet.',
  'auth.onboarding.hintDebt': 'Letakkan bayaran hutang bulanan di Lagi > Berulang supaya ia sentiasa dalam jadual bil anda.',
  'auth.onboarding.hintDefault': 'Mulakan dengan menambah rekod pertama menggunakan butang + di bawah.',

  // onboarding: tips and buttons
  'auth.onboarding.tipsTitle': 'Cara guna',
  'auth.onboarding.start': 'Mula guna',
  'auth.onboarding.next': 'Seterusnya',

  // privacy
  'auth.privacy.title': 'Notis Privasi',
  'auth.privacy.collect.title': 'Data yang kami kumpul',
  'auth.privacy.collect.body': 'E-mel, nama paparan, warna avatar, bahasa, matlamat kewangan (pilihan), serta akaun, kategori, bajet dan transaksi yang anda masukkan sendiri. Kami tidak meminta no. IC, alamat atau nombor kad penuh (hanya 4 digit terakhir jika anda memilih).',
  'auth.privacy.purpose.title': 'Tujuan',
  'auth.privacy.purpose.body': 'Untuk menjalankan fungsi aplikasi: log masuk, menyimpan rekod kewangan anda dan memaparkan laporan. Data tidak dijual atau digunakan untuk iklan.',
  'auth.privacy.storage.title': 'Di mana data disimpan',
  'auth.privacy.storage.body': 'Dalam mod simulasi ini, data disimpan pada peranti anda sahaja. Apabila pelayan awan digunakan, kami akan menyatakan lokasi pelayan dan pemproses data di sini.',
  'auth.privacy.retention.title': 'Tempoh simpanan',
  'auth.privacy.retention.body': 'Selagi akaun anda aktif. Apabila anda memadam akaun, semua data anda dipadam.',
  'auth.privacy.rights.title': 'Hak anda',
  'auth.privacy.rights.body': 'Anda boleh mengakses, membetulkan, mengeksport (CSV) dan memadam data anda melalui menu Lagi > Tetapan.',
  'auth.privacy.contact.title': 'Hubungi kami',
  'auth.privacy.contact.body': '[Masukkan e-mel pegawai perlindungan data / hubungan anda di sini]',

  // cloud account errors
  'auth.error.network': 'Tiada sambungan internet. Sila cuba lagi.',
  'auth.error.generic': 'Sesuatu tidak kena. Sila cuba lagi.',
  'auth.error.codeInvalid': 'Kod salah atau telah tamat tempoh.',
  'auth.error.rateLimit': 'Terlalu banyak percubaan. Sila tunggu sebentar.',
  'auth.error.samePassword': 'Kata laluan baharu mesti berbeza daripada yang lama.',
  'auth.error.signupDisabled': 'Pendaftaran belum dibuka.',
  'auth.error.syncFailed': 'Tidak dapat memuat turun data anda. Semak sambungan internet dan cuba lagi.',

  // forgot password
  'auth.forgot.title': 'Lupa kata laluan',
  'auth.forgot.intro': 'Masukkan e-mel akaun anda. Kami akan menghantar kod 6 digit untuk menetapkan semula kata laluan anda.',
  'auth.forgot.send': 'Hantar kod',
  'auth.forgot.sending': 'Menghantar...',

  // email code (confirm account / reset password)
  'auth.verify.titleSignup': 'Sahkan e-mel anda',
  'auth.verify.titleReset': 'Tetapkan semula kata laluan',
  'auth.verify.introSignup': 'Kami telah menghantar kod 6 digit ke {email}. Masukkan kod itu di bawah untuk mengaktifkan akaun anda.',
  'auth.verify.introReset': 'Kami telah menghantar kod 6 digit ke {email}. Masukkan kod itu dan pilih kata laluan baharu.',
  'auth.verify.code': 'Kod',
  'auth.verify.codePlaceholder': '123456',
  'auth.verify.newPassword': 'Kata laluan baharu (min 8 aksara, ada huruf dan nombor)',
  'auth.verify.submitSignup': 'Sahkan',
  'auth.verify.submitReset': 'Tukar kata laluan',
  'auth.verify.resend': 'Hantar kod baharu',
  'auth.verify.resent': 'Kod baharu sedang dihantar.',
  'auth.verify.spamHint': 'Tidak jumpa? Semak juga ruangan e-mel sampah (spam).',

  // bring an old on-phone account into the cloud account
  'auth.migrate.title': 'Bawa data lama anda',
  'auth.migrate.intro': 'Kami jumpa akaun yang disimpan pada telefon ini sahaja. Pindahkan rekodnya ke akaun baharu anda supaya selamat disimpan dalam talian?',
  'auth.migrate.account': 'Akaun lama',
  'auth.migrate.password': 'Kata laluan akaun lama',
  'auth.migrate.wrongPassword': 'Kata laluan akaun lama tidak betul.',
  'auth.migrate.submit': 'Pindahkan data saya',
  'auth.migrate.wait': 'Memindahkan...',
  'auth.migrate.skip': 'Langkau',
  'auth.migrate.skipHint': 'Jika dilangkau, akaun lama kekal pada telefon ini tetapi tidak akan disandarkan atau disegerakkan, dan kami tidak akan bertanya lagi.',

  // privacy: storage text when cloud accounts are on
  'auth.privacy.storage.bodyCloud': 'Rekod anda disimpan pada telefon anda dan disalin ke pangkalan data dalam talian yang selamat (Supabase) supaya ia ada apabila anda log masuk di telefon lain. Hanya anda yang boleh membacanya melalui aplikasi, tetapi pihak yang mengendalikan pangkalan data secara teknikal boleh mengaksesnya. [Masukkan lokasi pelayan dan butiran pemproses data di sini sebelum pelancaran]',
};
