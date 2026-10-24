-- WaKira 3.3.2: peti masuk pembangun (staf) untuk membaca dan membalas maklum balas dalam app.
-- Jalankan SEKALI di Supabase -> SQL Editor -> New query -> tampal semua -> Run. Selamat dijalankan semula.
--
-- Prinsip: pengguna biasa TIDAK boleh melihat apa-apa tentang staf atau laporan orang lain.
-- Peranan staf hanya boleh ditetapkan di sini (SQL Editor), tidak dari dalam app.

create table if not exists public.staff (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin', 'superadmin')),
  created_at timestamptz not null default now()
);

alter table public.staff enable row level security;

-- Seseorang hanya boleh melihat baris peranannya sendiri (supaya app tahu sama ada menu peti masuk dipaparkan).
drop policy if exists staff_select_own on public.staff;
create policy staff_select_own on public.staff for select to authenticated using (auth.uid() = user_id);

revoke insert, update, delete on public.staff from anon, authenticated;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

-- Senarai semua laporan (hanya staf). Nama pelapor = nama paparan sahaja, bukan e-mel.
create or replace function public.staff_feedback_list()
returns table (
  id uuid, kind text, title text, body text, status text, dev_note text, fixed_in text,
  created_at timestamptz, updated_at timestamptz,
  app_version text, platform text, os_version text, language text, reporter text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  return query
    select f.id, f.kind, f.title, f.body, f.status, f.dev_note, f.fixed_in,
           f.created_at, f.updated_at, f.app_version, f.platform, f.os_version, f.language,
           coalesce(nullif(p.display_name, ''), 'Pengguna')
    from public.feedback f
    left join public.profiles p on p.id = f.user_id
    order by f.created_at desc
    limit 500;
end $$;

-- Tukar status / nota / versi pembetulan. Pencetus feedback_after_update menambah langkah dalam garis masa pengguna.
create or replace function public.staff_feedback_update(p_id uuid, p_status text, p_note text, p_fixed_in text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  if p_status not in ('received', 'reviewing', 'planned', 'in_progress', 'done', 'declined') then
    raise exception 'bad status';
  end if;
  update public.feedback
     set status = p_status,
         dev_note = nullif(left(trim(coalesce(p_note, '')), 1000), ''),
         fixed_in = nullif(left(trim(coalesce(p_fixed_in, '')), 20), '')
   where id = p_id;
end $$;

revoke all on function public.staff_feedback_list() from public, anon;
revoke all on function public.staff_feedback_update(uuid, text, text, text) from public, anon;
grant execute on function public.staff_feedback_list() to authenticated;
grant execute on function public.staff_feedback_update(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Menjadikan akaun pembangun sebagai superadmin (ganti e-mel DUMMY ini dengan e-mel sebenar akaun anda, jalankan SELEPAS akaun itu didaftar dalam app):
--
--   insert into public.staff (user_id, role)
--   select id, 'superadmin' from auth.users where email = 'john.doe.dev@example.com'
--   on conflict (user_id) do update set role = excluded.role;
--
-- Untuk menarik balik:  delete from public.staff where user_id = (select id from auth.users where email = '...');
