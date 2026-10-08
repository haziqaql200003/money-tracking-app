# WaKira 1.9.0: log masuk dengan Google dan Apple

Ringkasnya:
- **Google** (iPhone dan Android): buka pelayar sistem, user pilih akaun Google, kembali ke app melalui `wakira://auth-callback`.
- **Apple** (iPhone sahaja): dialog Sign in with Apple asli. Tiada pelayar, tiada rahsia untuk diperbaharui.
- **Akaun sedia ada** boleh disambung dalam **Profil > Keselamatan > Cara log masuk**, dan boleh diputuskan semula.
- Pengguna baharu yang masuk melalui Google/Apple melalui skrin **persetujuan Notis Privasi** sekali sebelum masuk app.

Tiada data tambahan dihantar ke mana-mana pelayan kita. Google/Apple hanya memberi Supabase e-mel dan nama.

## 0. Sebelum mula
1. Jalankan `supabase/002_social_login.sql` (SQL Editor). Ia membolehkan nama dari Google/Apple dan fungsi `record_consent()`.
2. Tentukan **Bundle ID / package** sebenar dalam `app.json` (`ios.bundleIdentifier`, `android.package`). Nilai sementara ialah `com.haziqaql.wakira`. Selepas didaftarkan di Apple/Google, **jangan tukar lagi**. Semua langkah di bawah mesti guna nilai yang sama.
3. Perlu **development build / EAS build** baharu (pakej native `expo-apple-authentication`). Expo Go tidak cukup.

## 1. Supabase: URL panggil balik
Authentication -> **URL Configuration** -> **Redirect URLs** -> tambah:
```
wakira://auth-callback
```
(Untuk dev build mungkin Expo guna `wakira://auth-callback` juga. Jika log masuk tidak kembali ke app, cetak `OAUTH_REDIRECT` dari `src/services/social-auth.ts` dan tambah nilai itu.)

## 2. Google
1. https://console.cloud.google.com -> pilih/buat projek -> **APIs & Services -> OAuth consent screen**: External, isi nama app WaKira, e-mel sokongan, dan tambah Privacy Policy URL bila ada. Skop cukup `email`, `profile`, `openid` (tidak perlu semakan Google).
2. **Credentials -> Create credentials -> OAuth client ID -> Web application**.
   - Authorized redirect URI: `https://<PROJECT-REF>.supabase.co/auth/v1/callback` (salin dari Supabase: Authentication -> Providers -> Google).
3. Salin **Client ID** dan **Client secret** ke Supabase: Authentication -> Providers -> **Google** -> Enable -> Save.
4. Selagi consent screen berstatus *Testing*, hanya "Test users" yang boleh log masuk. Tekan **Publish app** bila bersedia.

Hanya satu client "Web" diperlukan kerana app guna pelayar, bukan SDK Google asli. Tiada SHA-1 atau client iOS/Android.

## 3. Apple (iPhone)
Perlu **Apple Developer Program** (berbayar). Tanpanya, butang Apple tidak akan berfungsi dan App Store menolak app yang menawarkan Google tanpa Apple (garis panduan 4.8).
1. developer.apple.com -> Certificates, Identifiers & Profiles -> **Identifiers** -> App ID untuk bundle ID anda -> hidupkan **Sign In with Apple**.
2. Supabase -> Authentication -> Providers -> **Apple** -> Enable. Di ruang **Client IDs** letak bundle ID anda (contoh `com.haziqaql.wakira`). Itu sahaja untuk log masuk asli, tiada secret.
3. Bina semula app (`app.json` sudah ada `usesAppleSignIn` dan plugin).

### Sambung akaun Apple dari dalam app (pilihan)
Butang "Sambung Apple" dalam Keselamatan guna aliran web, yang perlukan tambahan:
- Cipta **Services ID** (Identifiers -> Services IDs), hidupkan Sign In with Apple, Return URL = `https://<PROJECT-REF>.supabase.co/auth/v1/callback`.
- Cipta **Key** (Keys -> Sign in with Apple), muat turun fail `.p8`, catat Key ID dan Team ID.
- Jana **client secret (JWT)** daripada kunci itu dan letak dalam Supabase Apple provider bersama Services ID. **JWT ini tamat dalam maksimum 6 bulan, mesti dijana semula.** Letak peringatan kalendar.
Jika anda tidak mahu urusan ini, abaikan: log masuk Apple asli tetap jalan, hanya butang "Sambung Apple" dalam Keselamatan akan beri mesej ralat.

## 4. Sambung akaun sedia ada
- **Automatik:** jika user sudah ada akaun e-mel dan log masuk dengan Google/Apple yang e-mel sama dan telah disahkan, Supabase menggabungkannya sendiri (tetapan lalai).
- **Apple "Hide My Email":** e-mel yang berbeza (relay) tidak dapat digabung secara automatik. User perlu log masuk dengan e-mel dulu, kemudian Sambung Apple dalam Keselamatan.
- **Manual:** Supabase -> Authentication -> Sign In / Providers -> hidupkan **Allow manual linking**. Tanpa ini, butang Sambung memberi mesej ralat.
- Putuskan hanya dibenarkan jika masih ada sekurang-kurangnya satu cara log masuk lain.

## 5. Akaun tanpa kata laluan
Akaun yang hanya pernah guna Google/Apple tiada kata laluan. Dalam Keselamatan > Tukar kata laluan, ia berubah menjadi **Tetapkan kata laluan** (tanpa kata laluan semasa) supaya boleh log masuk e-mel juga.

## 6. Ujian cepat
1. Log masuk Google pada akaun baharu: skrin persetujuan muncul, selepas itu onboarding.
2. Log masuk Google dengan e-mel akaun sedia ada: masuk akaun lama (data ada).
3. Keselamatan: Sambung Google, Putuskan Google (ditolak jika itu satu-satunya cara log masuk).
4. iPhone: Continue with Apple, tutup dialog, tiada mesej ralat muncul.
