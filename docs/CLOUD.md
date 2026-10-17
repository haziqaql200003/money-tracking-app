# WaKira 1.1.0: akaun dan data dalam cloud (Supabase)

Ringkasnya: user daftar/log masuk dengan e-mel + kata laluan (Supabase Auth). Data (transaksi, akaun, bajet, matlamat, tetapan...) kekal disimpan dalam phone dahulu (jadi app laju dan boleh guna tanpa internet), kemudian disalin ke Supabase di belakang tabir. Log masuk di phone lain, semua data ada semula.

**Kalau `.env.local` tiada URL/key Supabase, app jalan dalam mod lama (akaun dalam phone sahaja).** Jadi tiada apa yang pecah sebelum anda siap setup.

## 1. Setup Supabase (sekali sahaja, ~15 minit)

1. https://supabase.com -> New project. Pilih region **Singapore (ap-southeast-1)** (paling dekat dengan Malaysia). Simpan database password.
2. **SQL Editor** -> New query -> tampal seluruh `supabase/001_wakira_init.sql` -> Run.
   Ia mencipta jadual `profiles` dan `user_data`, peraturan keselamatan (RLS: setiap user hanya nampak datanya sendiri), fungsi padam akaun dan paparan admin.
3. **Authentication -> Sign In / Providers -> Email**:
   - Enable email provider (sudah ON secara default).
   - **Minimum password length = 8**.
   - **Confirm email**: OFF semasa uji (daftar terus masuk). Hidupkan (ON) bila nak lancar. App sudah sedia untuk dua-dua.
4. **Authentication -> Email Templates** (wajib kalau Confirm email ON, dan wajib untuk Lupa kata laluan): app guna **kod 6 digit**, bukan pautan. Tukar templat **Confirm signup** dan **Reset password** supaya mengandungi `{{ .Token }}`:

   Confirm signup (Subject: `Kod pengesahan WaKira / WaKira confirmation code`)
   ```html
   <h2>Selamat datang ke WaKira / Welcome to WaKira</h2>
   <p>Kod pengesahan anda / Your confirmation code:</p>
   <h1 style="letter-spacing:6px">{{ .Token }}</h1>
   <p>Kod ini sah untuk masa yang singkat. Abaikan e-mel ini jika bukan anda. / This code is short-lived. Ignore this email if it was not you.</p>
   ```
   Reset password (Subject: `Tetapkan semula kata laluan WaKira / Reset your WaKira password`)
   ```html
   <h2>Tetapkan semula kata laluan / Reset your password</h2>
   <p>Kod anda / Your code:</p>
   <h1 style="letter-spacing:6px">{{ .Token }}</h1>
   <p>Abaikan e-mel ini jika bukan anda. / Ignore this email if it was not you.</p>
   ```
5. **Project Settings -> API**: salin *Project URL* dan kunci *anon / publishable*.
6. Dalam folder projek, salin `.env.example` jadi `.env.local` dan isi kedua-duanya. Restart `npx expo start -c`.

> Had e-mel: menurut dokumentasi Supabase (semak semula, ia boleh berubah) e-mel terbina dalam dihadkan kepada **2 e-mel sejam** untuk semua tindakan yang menghantar e-mel (daftar, kod sahkan, lupa kata laluan). Cukup untuk uji sendiri, tidak cukup untuk user sebenar. Sebelum lancar, sambung SMTP sendiri (Authentication -> SMTP Settings; contoh Resend, Brevo, SendGrid). Buat ini sebelum R6.

## 2. Cara sync berfungsi

- Setiap jenis data ialah satu "dokumen" JSON per user (`user_data`: `user_id`, `key`, `value`, `updated_at`).
- Phone sentiasa sumber pertama. Bila anda ubah sesuatu: disimpan dalam phone serta-merta, dihantar ke cloud selepas ~1.5 saat. Tiada internet? Ia menunggu dan dihantar bila online semula (juga bila app dibuka semula / sebelum log keluar).
- `updated_at` ditetapkan oleh **pelayan**, bukan jam phone, jadi jam phone yang salah tidak mengelirukan sync.
- Bila app dibuka atau kembali ke depan, phone semak cloud: kalau phone lain sudah ubah dokumen itu dan phone ini tiada perubahan belum dihantar, versi cloud diambil.
- **Konflik** (dua peranti ubah dokumen yang sama sebelum sempat sync), sejak 3.1.0:
  - Senarai rekod yang ada `id` (transaksi, akaun, pindahan, hutang, matlamat, kategori, berulang...) **digabung rekod demi rekod** berbanding salinan terakhir yang kedua-duanya setuju (disimpan dalam phone sebagai `<key>.base`). Rekod baharu di mana-mana pihak dikekalkan; rekod yang diubah di satu pihak mengambil perubahan itu; rekod yang dipadam di satu pihak (dan tidak diubah di pihak lain) dipadam.
  - Hanya rekod yang diubah di **kedua-dua** pihak ikut "suntingan lebih baru menang". Rekod yang dipadam di satu pihak tetapi diubah di pihak lain dikekalkan (lebih selamat daripada hilang).
  - Nilai lain (objek tetapan, nombor) masih "suntingan lebih baru menang" secara keseluruhan.
  - Hantar ke cloud hanya berjaya jika cloud masih memegang salinan yang phone terakhir lihat (`update ... where updated_at = <base>`). Jika peranti lain sudah simpan dahulu, phone gabung dahulu, kemudian hantar. Jadi satu peranti tidak lagi boleh menimpa peranti lain tanpa sedar.
  - Phone yang dikemas kini dari 3.0.x belum ada `.base`: gabungan pertama tidak memadam apa-apa (hanya tambah dan kemas kini), kemudian `.base` direkod.
- Ujian automatik untuk peraturan ini: `npm run sync:test`.

## 3. Akaun lama (dalam phone) -> akaun cloud

Selepas log masuk cloud pertama, jika phone masih ada akaun lama dan akaun cloud itu kosong, app tawarkan skrin "Bawa data lama anda" (perlu kata laluan akaun lama). Data disalin ke akaun cloud dan akaun lama dibuang daripada phone. Pilih "Langkau" = akaun lama kekal dalam phone tetapi tidak disegerakkan, dan tidak ditanya lagi.

## 4. Pantau dari sisi admin

Jalankan dalam **Supabase Dashboard -> SQL Editor** (atau Table Editor; paparan ini tidak boleh dicapai dari app):

```sql
select * from admin_overview;        -- jumlah user, baharu 7/30 hari, selesai onboarding, aktif 7/30 hari
select * from admin_language_stats;  -- berapa ramai pilih Bahasa Melayu vs English
select * from admin_goal_stats;      -- matlamat yang dipilih
select * from admin_signups_daily;   -- pendaftaran harian
```
Semua ini nombor agregat; ia tidak menunjukkan transaksi sesiapa. **Auth -> Users** dalam dashboard menyenaraikan e-mel dan masa log masuk terakhir.

Jujurnya: sebagai pemilik projek Supabase anda *secara teknikal* boleh membaca jadual `user_data`. Notis Privasi dalam app sudah menyatakan ini. Kalau suatu hari anda mahu "zero-knowledge" (anda pun tak boleh baca), data perlu disulitkan dalam phone sebelum dihantar; itu kerja berasingan.

Teks hilang/terjemahan: tetap `npm run i18n:audit` (lihat `docs/I18N.md`).

## 5. Build sebenar (EAS)

`.env.local` **tidak** dihantar ke server EAS. Tanpa langkah ini APK/IPA dibina tanpa URL Supabase, dan log masuk memberi "Tiada sambungan internet" (app cuba sambung tetapi tiada alamat yang betul).

Tambah pembolehubah sekali bagi setiap environment yang anda bina (`preview` untuk APK ujian, `production` untuk kedai):
```
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://xxxx.supabase.co --environment preview --visibility plaintext
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon key> --environment preview --visibility plaintext
eas env:list --environment preview
```
Ulang dengan `--environment production` (dan `development` jika guna dev build). Versi EAS CLI lama guna `eas env:set`; yang semasa guna `eas env:create`.

Semak: URL mesti bermula `https://`, tiada ruang atau tanda petikan. Selepas menukar nilai, **bina semula**; build lama tidak berubah.

Kunci anon memang direka untuk berada dalam app; keselamatan datang daripada RLS dalam SQL, bukan daripada merahsiakan kunci. Jangan sekali-kali guna `service_role`.

## 6. Seterusnya (selepas R6)

- Log masuk Google / Apple: perlu dev build + OAuth. Struktur `useAuth()` sedia untuk ditambah.
- Simpanan sandaran dalam Google Drive pengguna (folder tersembunyi `appDataFolder`): juga perlu Google OAuth, jadi datang bersama log masuk Google.
- Realtime antara phone (sekarang sync berlaku bila app dibuka/kembali ke depan dan ~1.5 saat selepas setiap ubahan).

## 7. Maklum balas (pepijat & cadangan) dengan jejak status (3.2.0)

Pengguna boleh hantar laporan dari **Lagi → Maklum balas** dan menjejaknya seperti bungkusan: Diterima → Sedang disemak → Dirancang → Sedang dibuat → Selesai (atau Tidak dirancang), lengkap dengan nota anda dan versi pembetulan.

**Setup (sekali sahaja):**
1. Supabase → SQL Editor → New query → tampal seluruh `supabase/003_feedback.sql` → Run. Ia mencipta jadual `feedback` dan `feedback_events` dengan RLS (pengguna hanya nampak dan hantar laporan sendiri; mereka **tidak boleh** ubah status).
2. Laporan tanpa Supabase (mod setempat) kekal dalam telefon dan boleh dihantar melalui e-mel.

**Cara anda membalas:** Table Editor → `feedback` → ubah lajur `status` (`reviewing`, `planned`, `in_progress`, `done`, `declined`), dan isi `dev_note` (nota untuk pengguna) serta `fixed_in` (cth. `3.2.1`) bila siap. Setiap perubahan automatik menambah satu langkah dalam garis masa pengguna. Pengguna nampak kemas kini bila mereka buka app (ada titik di Maklum balas).

**E-mel:** isi `EXPO_PUBLIC_FEEDBACK_EMAIL=alamat@anda.com` dalam `.env.local` (dan dalam EAS: `eas env:create`). Butang "Hantar melalui e-mel" membuka app e-mel pengguna dengan laporan yang sudah siap ditulis. Kalau mahu **e-mel automatik ke anda setiap kali ada laporan baharu**, di Supabase → Database → Webhooks → buat webhook pada jadual `feedback` (INSERT) ke Edge Function atau perkhidmatan e-mel seperti Resend. Itu tetapan Supabase di luar app, dan belum disediakan.
