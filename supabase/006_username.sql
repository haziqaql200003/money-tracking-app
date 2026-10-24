-- WaKira 3.4.0: nama pengguna (username) sebagai cara log masuk selain e-mel.
-- Jalankan SEKALI di Supabase -> SQL Editor -> New query -> tampal semua -> Run. Selamat dijalankan semula.
--
-- Nama pengguna: 3-20 aksara, huruf kecil/nombor/titik/garis bawah, mula dengan huruf, unik (tidak peka huruf besar-kecil).
-- E-mel pengguna TIDAK didedahkan: carian nama pengguna -> akaun dibuat di Edge Function `login-username`.

alter table public.profiles add column if not exists username text;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z][a-z0-9_.]{2,19}$');

create unique index if not exists profiles_username_unique on public.profiles (lower(username)) where username is not null;

-- Nama yang tidak boleh diambil (menyerupai pasukan / sistem).
create or replace function public.username_reserved(p text)
returns boolean language sql immutable as $$
  select lower(p) = any (array['admin','administrator','superadmin','staff','support','help','wakira','owner','root','system','moderator','developer','dev','team','official','null','undefined']);
$$;

alter table public.profiles drop constraint if exists profiles_username_reserved;
alter table public.profiles add constraint profiles_username_reserved
  check (username is null or not public.username_reserved(username));

-- Pengguna boleh menukar nama penggunanya sendiri (lajur lain tetap seperti sebelumnya).
grant update (username) on public.profiles to authenticated;

-- Semak sama ada nama masih kosong (boleh dipanggil sebelum log masuk, semasa mendaftar). Hanya jawapan ya/tidak.
create or replace function public.username_available(p_username text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_username ~ '^[a-z][a-z0-9_.]{2,19}$'
     and not public.username_reserved(p_username)
     and not exists (select 1 from public.profiles where lower(username) = lower(p_username));
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- Pendaftaran: ambil nama pengguna daripada borang jika sah dan masih kosong (jika tidak, diabaikan senyap).
-- Nama paparan dikekalkan seperti 002 (borang, atau nama daripada Google / Apple).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  u text := lower(nullif(trim(coalesce(new.raw_user_meta_data ->> 'username', '')), ''));
begin
  if u is not null and not public.username_available(u) then u := null; end if;
  insert into public.profiles (id, display_name, language, consent_at, username)
  values (
    new.id,
    coalesce(left(nullif(trim(coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name', '')), ''), 24), ''),
    case when new.raw_user_meta_data ->> 'language' in ('ms', 'en') then new.raw_user_meta_data ->> 'language' else 'ms' end,
    nullif(new.raw_user_meta_data ->> 'consent_at', '')::timestamptz,
    u
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- Had cubaan log masuk dengan nama pengguna (dicatat oleh Edge Function `login-username`, bukan oleh app).
-- Selepas 5 cubaan gagal dalam 15 minit untuk nama yang sama, function menolak sementara.
create table if not exists public.login_attempts (
  id         bigint generated always as identity primary key,
  username   text not null,
  created_at timestamptz not null default now()
);
create index if not exists login_attempts_idx on public.login_attempts (username, created_at desc);
alter table public.login_attempts enable row level security;  -- tiada polisi: hanya service role (function) boleh baca/tulis
revoke all on public.login_attempts from anon, authenticated;
