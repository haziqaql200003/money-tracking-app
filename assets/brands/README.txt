LOGO SYARIKAT UNTUK WAKIRA

Folder ini untuk logo pembekal, bank dan e-dompet. Selagi tiada logo, WaKira papar
huruf syarikat (contoh 'S' oren untuk SPayLater), jadi tiada yang kosong.

CARA TAMBAH SATU LOGO
1. Dapatkan fail logo RASMI daripada syarikat itu (lihat 'Di mana dapatkan' di bawah).
2. Simpan sebagai PNG segi empat sama, sekurang-kurangnya 128x128 piksel,
   latar telus (transparent), nama fail tepat seperti senarai di bawah.
   Contoh: assets/brands/spaylater.png
3. Buka src/constants/brand-logos.ts dan buang // di depan baris logo itu.
   Contoh:  // 'spaylater': require(...)   jadi   'spaylater': require(...)
4. Mulakan semula: npx expo start -c
5. Untuk telefon: eas update (logo baru ialah fail JS/aset, tidak perlu APK baru).

PENTING
- Jangan buang // untuk logo yang belum ada failnya: app gagal dibina.
- Guna logo hanya untuk mengenal pasti syarikat. Jangan ubah warna/bentuk logo dan
  jangan buat seolah-olah syarikat itu menyokong WaKira.
- Sebelum terbit di App Store/Play Store, semak syarat penggunaan logo setiap syarikat
  (biasanya di halaman 'Media', 'Press', 'Newsroom' atau 'Brand guidelines').
- Logo yang paling kerap dilihat pengguna: SPayLater, TikTok PayLater, Atome, Grab PayLater,
  Maybank, CIMB, Touch 'n Go eWallet. Mulakan dengan ini.

DI MANA DAPATKAN
- Laman rasmi syarikat: cari 'press kit', 'media kit', 'brand assets' atau 'newsroom'.
- Jika tiada, e-mel jabatan media/pemasaran mereka dan minta kebenaran.
- Elak ambil dari carian imej rawak: kualiti rendah dan mungkin bukan versi terkini.

SENARAI FAIL (nama fail -> syarikat)

[PAYLATER]
  spaylater.png             SPayLater
  tiktok-paylater.png       TikTok PayLater
  atome.png                 Atome
  grab-paylater.png         Grab PayLater
  lazada-paylater.png       Lazada PayLater
  boost-payflex.png         Boost PayFlex
  ryt-paylater.png          Ryt PayLater
  rhb-paylater.png          RHB PayLater

[PINJAMAN]
  sloan.png                 SLoan
  tiktok-financing.png      TikTok Financing
  aeon-credit.png           AEON Credit

[BANK]
  maybank.png               Maybank
  cimb.png                  CIMB
  public-bank.png           Public Bank
  rhb.png                   RHB
  hong-leong.png            Hong Leong Bank
  ambank.png                AmBank
  bank-islam.png            Bank Islam
  bank-rakyat.png           Bank Rakyat
  bsn.png                   BSN
  affin.png                 Affin Bank
  alliance.png              Alliance Bank
  bank-muamalat.png         Bank Muamalat
  mbsb.png                  MBSB Bank
  agrobank.png              Agrobank
  ocbc.png                  OCBC
  hsbc.png                  HSBC
  uob.png                   UOB
  standard-chartered.png    Standard Chartered
  gxbank.png                GXBank
  aeon-bank.png             AEON Bank
  boost-bank.png            Boost Bank
  ryt-bank.png              Ryt Bank

[E-DOMPET]
  tng.png                   Touch 'n Go eWallet
  grabpay.png               GrabPay
  boost.png                 Boost
  shopeepay.png             ShopeePay
  bigpay.png                BigPay
  setel.png                 Setel
  mae.png                   MAE

Mahu tambah syarikat baru? Tambah satu baris dalam src/constants/brands.ts
(id, nama, jenis, huruf, warna, nama lain) dan satu baris dalam brand-logos.ts.
