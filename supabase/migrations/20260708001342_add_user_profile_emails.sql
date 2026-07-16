alter table public.user_profiles
add column if not exists email text;

create unique index if not exists user_profiles_lower_email_idx
on public.user_profiles (lower(email))
where email is not null;
