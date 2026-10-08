-- WaKira 1.9.0: sign in with Google / Apple.
-- Run once: Supabase dashboard -> SQL Editor -> New query -> paste -> Run. Safe to run again.

-- 1) A new profile takes the name Google / Apple provides when the sign-up form did not.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, language, consent_at)
  values (
    new.id,
    coalesce(left(nullif(trim(coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name', '')), ''), 24), ''),
    case when new.raw_user_meta_data ->> 'language' in ('ms', 'en') then new.raw_user_meta_data ->> 'language' else 'ms' end,
    nullif(new.raw_user_meta_data ->> 'consent_at', '')::timestamptz
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- 2) The app may not write consent_at directly (see 001). This is the one safe way to record it:
--    only for the signed-in person, only once, always with the server's clock.
create or replace function public.record_consent()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update public.profiles set consent_at = now() where id = auth.uid() and consent_at is null;
end $$;

revoke all on function public.record_consent() from public, anon;
grant execute on function public.record_consent() to authenticated;
