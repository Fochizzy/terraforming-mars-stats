alter table public.user_profiles
add column if not exists email text;

update public.user_profiles up
set
  email = lower(au.email),
  updated_at = now()
from auth.users au
where up.user_id = au.id
  and au.email is not null
  and (up.email is null or btrim(up.email) = '');

create unique index if not exists user_profiles_email_key
on public.user_profiles (email)
where email is not null;
