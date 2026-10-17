-- WaKira 3.2.0: pepijat & cadangan dengan jejak status (macam jejak bungkusan).
-- Jalankan SEKALI di Supabase -> SQL Editor -> New query -> tampal semua -> Run.
-- Selamat dijalankan semula (guna "if not exists").
--
-- Cara anda (pemaju) membalas: Table Editor -> feedback -> ubah lajur `status` (dan `dev_note` / `fixed_in`).
-- Setiap perubahan itu automatik menambah satu langkah dalam garis masa yang pengguna nampak dalam app.
-- Status: received -> reviewing -> planned -> in_progress -> done   (atau declined)

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('bug', 'suggestion')),
  title       text not null check (char_length(title) between 3 and 120),
  body        text not null default '' check (char_length(body) <= 4000),
  app_version text,
  platform    text,
  os_version  text,
  language    text,
  status      text not null default 'received' check (status in ('received', 'reviewing', 'planned', 'in_progress', 'done', 'declined')),
  dev_note    text,
  fixed_in    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.feedback_events (
  id          bigint generated always as identity primary key,
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  status      text not null,
  note        text,
  fixed_in    text,
  created_at  timestamptz not null default now()
);

create index if not exists feedback_user_idx on public.feedback (user_id, created_at desc);
create index if not exists feedback_events_idx on public.feedback_events (feedback_id, created_at);

alter table public.feedback enable row level security;
alter table public.feedback_events enable row level security;

-- Pengguna: hanya baca dan hantar milik sendiri. Tiada kemas kini / padam, jadi status tidak boleh diubah oleh pengguna.
drop policy if exists feedback_select_own on public.feedback;
create policy feedback_select_own on public.feedback for select to authenticated using (auth.uid() = user_id);

drop policy if exists feedback_insert_own on public.feedback;
create policy feedback_insert_own on public.feedback for insert to authenticated
  with check (auth.uid() = user_id and status = 'received' and dev_note is null and fixed_in is null);

drop policy if exists feedback_events_select_own on public.feedback_events;
create policy feedback_events_select_own on public.feedback_events for select to authenticated
  using (exists (select 1 from public.feedback f where f.id = feedback_id and f.user_id = auth.uid()));

-- Setiap tiket baharu = langkah pertama "received".
create or replace function public.feedback_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.feedback_events (feedback_id, status) values (new.id, 'received');
  return new;
end $$;

drop trigger if exists feedback_after_insert on public.feedback;
create trigger feedback_after_insert after insert on public.feedback
  for each row execute function public.feedback_after_insert();

-- Bila anda tukar status / nota / versi pembetulan, satu langkah baharu ditambah dan updated_at dikemas kini.
create or replace function public.feedback_before_update()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists feedback_before_update on public.feedback;
create trigger feedback_before_update before update on public.feedback
  for each row execute function public.feedback_before_update();

create or replace function public.feedback_after_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status
     or new.dev_note is distinct from old.dev_note
     or new.fixed_in is distinct from old.fixed_in then
    insert into public.feedback_events (feedback_id, status, note, fixed_in)
    values (new.id, new.status, new.dev_note, new.fixed_in);
  end if;
  return new;
end $$;

drop trigger if exists feedback_after_update on public.feedback;
create trigger feedback_after_update after update on public.feedback
  for each row execute function public.feedback_after_update();

-- Hanya anda (service role / Table Editor) boleh ubah; peranan app tidak boleh.
revoke update, delete on public.feedback from anon, authenticated;
revoke insert, update, delete on public.feedback_events from anon, authenticated;
