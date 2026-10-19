-- WaKira 3.3.0: log penggunaan imbas resit (untuk had harian dan kawalan kos).
-- Jalankan SEKALI di Supabase -> SQL Editor -> New query -> tampal semua -> Run.
-- Selamat dijalankan semula (guna "if not exists").
-- Imej resit TIDAK disimpan; hanya satu baris log (siapa, bila, berjaya atau tidak).

create table if not exists public.receipt_scans (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  ok         boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists receipt_scans_user_day on public.receipt_scans (user_id, created_at desc);

alter table public.receipt_scans enable row level security;

-- Pengguna boleh lihat log sendiri sahaja. Tulis dibuat oleh Edge Function (service role), bukan app.
drop policy if exists "receipt_scans_select_own" on public.receipt_scans;
create policy "receipt_scans_select_own" on public.receipt_scans
  for select using (auth.uid() = user_id);
