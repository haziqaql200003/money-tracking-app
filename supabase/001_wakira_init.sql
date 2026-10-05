-- WaKira 1.1.0: Supabase schema.
-- Run once: Supabase dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
-- Safe to run again (uses IF NOT EXISTS / OR REPLACE where possible).

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  display_name   text        not null default '',
  avatar_color   text,
  language       text        not null default 'ms' check (language in ('ms', 'en')),
  goal           text        check (goal in ('save', 'debt', 'budget', 'track')),
  has_onboarded  boolean     not null default false,
  consent_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- The app may change only these columns (never id, consent_at, created_at).
revoke update on public.profiles from authenticated;
grant  update (display_name, avatar_color, language, goal, has_onboarded) on public.profiles to authenticated;

-- Create the profile row automatically when someone signs up (values come from the sign-up form).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, language, consent_at)
  values (
    new.id,
    coalesce(left(new.raw_user_meta_data ->> 'display_name', 24), ''),
    case when new.raw_user_meta_data ->> 'language' in ('ms', 'en') then new.raw_user_meta_data ->> 'language' else 'ms' end,
    nullif(new.raw_user_meta_data ->> 'consent_at', '')::timestamptz
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- user_data
-- One JSON document per user per key (transactions, accounts, plan_goals, ...).
create table if not exists public.user_data (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  key         text        not null check (char_length(key) between 1 and 64),
  value       jsonb       not null check (octet_length(value::text) <= 4000000),
  updated_at  timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_data enable row level security;

drop policy if exists "user_data: read own"   on public.user_data;
drop policy if exists "user_data: insert own" on public.user_data;
drop policy if exists "user_data: update own" on public.user_data;
drop policy if exists "user_data: delete own" on public.user_data;
create policy "user_data: read own"   on public.user_data for select to authenticated using (auth.uid() = user_id);
create policy "user_data: insert own" on public.user_data for insert to authenticated with check (auth.uid() = user_id);
create policy "user_data: update own" on public.user_data for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_data: delete own" on public.user_data for delete to authenticated using (auth.uid() = user_id);

-- The server decides updated_at (never the phone's clock). The app relies on this.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;

drop trigger if exists user_data_touch on public.user_data;
create trigger user_data_touch before insert or update on public.user_data
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- delete my account
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();   -- profiles + user_data go too (on delete cascade)
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------- admin views (aggregate numbers only)
-- Open these in the dashboard (Table Editor / SQL Editor). They are NOT reachable from the app:
-- access is revoked from the app's roles below.
create or replace view public.admin_overview as
select
  (select count(*) from public.profiles)                                              as total_users,
  (select count(*) from public.profiles where created_at > now() - interval '7 days')  as new_7d,
  (select count(*) from public.profiles where created_at > now() - interval '30 days') as new_30d,
  (select count(*) from public.profiles where has_onboarded)                          as finished_onboarding,
  (select count(distinct user_id) from public.user_data where updated_at > now() - interval '7 days')  as active_7d,
  (select count(distinct user_id) from public.user_data where updated_at > now() - interval '30 days') as active_30d;

create or replace view public.admin_language_stats as
select language, count(*) as users,
       round(100.0 * count(*) / nullif(sum(count(*)) over (), 0), 1) as percent
from public.profiles group by language order by users desc;

create or replace view public.admin_goal_stats as
select coalesce(goal, 'not chosen') as goal, count(*) as users
from public.profiles group by goal order by users desc;

create or replace view public.admin_signups_daily as
select date_trunc('day', created_at)::date as day, count(*) as signups
from public.profiles group by 1 order by 1 desc;

revoke all on public.admin_overview, public.admin_language_stats, public.admin_goal_stats, public.admin_signups_daily
  from anon, authenticated;
