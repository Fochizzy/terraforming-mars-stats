-- Let new users find out at sign-up time that a username is already taken,
-- instead of hitting the user_profiles.username unique constraint only after
-- they confirm their email (which currently throws during profile creation).
--
-- Sign-up runs unauthenticated (anon key), and RLS restricts user_profiles
-- reads to the owning account, so availability has to be resolved through a
-- security-definer function that returns ONLY a boolean -- never any row data,
-- names, or ids of other accounts.

-- Shared normalization so the availability check matches the same value the app
-- stores. Existing rows predate normalization and can be mixed-case, so both
-- sides are normalized: "Fochizzy" and "fochizzy" collide as intended.
create or replace function public.normalize_username(p_username text)
returns text
language sql
immutable
as $$
  select btrim(
    regexp_replace(lower(coalesce(p_username, '')), '[^a-z0-9]+', '-', 'g'),
    '-'
  );
$$;

create or replace function public.is_username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.normalize_username(p_username) <> ''
    and not exists (
      select 1
      from public.user_profiles up
      where public.normalize_username(up.username)
        = public.normalize_username(p_username)
    );
$$;

-- Anon is granted intentionally: the check must run before an account exists.
-- The function leaks nothing beyond "is this name free".
revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;
