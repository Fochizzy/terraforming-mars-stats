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

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;;
