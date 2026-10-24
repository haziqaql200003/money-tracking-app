-- WaKira: DATA LAPORAN DUMMY untuk mencuba Peti masuk (Lagi > Peti masuk). TIDAK wajib; untuk ujian sahaja.
-- Jalankan di Supabase -> SQL Editor (selepas 003 dan 005). Semua tajuk bermula "[DUMMY]" supaya mudah dipadam.
-- Ganti e-mel di bawah dengan e-mel akaun anda (laporan dummy akan dikaitkan dengan akaun itu).

with me as (select id from auth.users where email = 'john.doe.dev@example.com')
insert into public.feedback (user_id, kind, title, body, app_version, platform, os_version, language, status, dev_note, fixed_in, created_at)
select me.id, v.kind, v.title, v.body, v.app_version, v.platform, v.os_version, v.language, v.status, v.dev_note, v.fixed_in, now() - v.ago
from me, (values
  ('bug',        '[DUMMY] Skrin putih bila buka Hutang',        'Tekan menu Hutang, skrin jadi putih dan app tutup sendiri.',              '3.3.1', 'android', '14', 'ms', 'received',    null,                                   null,    interval '2 hours'),
  ('bug',        '[DUMMY] Imbas resit tidak jumpa jumlah',      'Resit Mydin, jumlah tidak dikesan walaupun gambar jelas.',                 '3.3.1', 'ios',     '18', 'ms', 'received',    null,                                   null,    interval '1 day'),
  ('suggestion', '[DUMMY] Tambah mod gelap automatik',          'Ikut tetapan telefon bila malam.',                                         '3.3.0', 'android', '13', 'ms', 'reviewing',   'Sedang disemak, nampak munasabah.',    null,    interval '3 days'),
  ('suggestion', '[DUMMY] Export laporan ke Excel',             'Boleh tak eksport transaksi bulanan sebagai fail Excel?',                  '3.2.1', 'ios',     '17', 'ms', 'planned',     'Dirancang untuk versi akan datang.',   null,    interval '6 days'),
  ('bug',        '[DUMMY] Baki akaun salah selepas pindahan',   'Pindah RM100 antara akaun, baki akaun asal tak berkurang.',                '3.2.0', 'android', '14', 'ms', 'in_progress', 'Dapat ulang, sedang dibaiki.',         null,    interval '8 days'),
  ('bug',        '[DUMMY] Notification bil lewat sehari',       'Peringatan bil sampai selepas tarikh akhir.',                              '3.1.0', 'android', '12', 'en', 'done',        'Dah dibetulkan, terima kasih!',        '3.2.1', interval '14 days'),
  ('suggestion', '[DUMMY] Widget baki di skrin utama telefon',  'Widget kecil untuk tengok baki tanpa buka app.',                           '3.1.0', 'ios',     '18', 'en', 'declined',    'Belum sesuai buat masa ini.',          null,    interval '20 days')
) as v(kind, title, body, app_version, platform, os_version, language, status, dev_note, fixed_in, ago);

-- Padam semua data dummy bila sudah selesai mencuba:
--   delete from public.feedback where title like '[DUMMY]%';
