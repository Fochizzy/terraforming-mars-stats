alter table public.user_profiles
add column if not exists credential_reset_required boolean not null default false;

update public.user_profiles
set credential_reset_required = true,
    updated_at = now();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
