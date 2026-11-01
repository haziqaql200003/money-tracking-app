-- WaKira 3.6.0: log penggunaan "Tanya WaKira" (untuk had harian dan kawalan kos).
-- Jalankan SEKALI di Supabase -> SQL Editor -> New query -> tampal semua -> Run.
-- Selamat dijalankan semula (guna "if not exists").
-- Perbualan, gambar dan PDF TIDAK disimpan; hanya satu baris log bagi setiap mesej (siapa, bila, ada fail atau tidak).

create table if not exists public.ai_usage (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  has_file   boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_user_day on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;

-- Pengguna boleh lihat log sendiri sahaja. Tulis dibuat oleh Edge Function (service role), bukan app.
drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own" on public.ai_usage
  for select using (auth.uid() = user_id);
