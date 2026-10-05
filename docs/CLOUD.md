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
- **Konflik** (dua phone ubah dokumen yang sama sebelum sempat sync): suntingan yang lebih baru menang untuk keseluruhan dokumen itu. Contoh: phone A dan phone B kedua-duanya tambah transaksi semasa offline; yang disunting lebih lewat akan menggantikan dokumen `transactions` yang satu lagi, jadi satu transaksi boleh hilang. Ini had model "satu dokumen"; untuk satu user dengan satu phone utama ia jarang berlaku. Jika perlu, kita boleh upgrade `transactions` kepada gabungan ikut id.
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

`.env.local` tidak ikut ke server EAS. Tambah pembolehubah untuk build:
```
eas env:set --name EXPO_PUBLIC_SUPABASE_URL --value https://xxxx.supabase.co --environment production --visibility plaintext
eas env:set --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon key> --environment production --visibility plaintext
```
(ulang untuk `preview` / `development`). Kunci anon memang direka untuk berada dalam app; keselamatan datang daripada RLS dalam SQL, bukan daripada merahsiakan kunci.

## 6. Seterusnya (selepas R6)

- Log masuk Google / Apple: perlu dev build + OAuth. Struktur `useAuth()` sedia untuk ditambah.
- Simpanan sandaran dalam Google Drive pengguna (folder tersembunyi `appDataFolder`): juga perlu Google OAuth, jadi datang bersama log masuk Google.
- Realtime antara phone (sekarang sync berlaku bila app dibuka/kembali ke depan dan ~1.5 saat selepas setiap ubahan).
