alter table public.user_profiles
add column if not exists credential_reset_required boolean not null default false;

-- This migration is applied after the original accounts already exist, so it
-- marks only those existing profiles. New profiles keep the column default.
update public.user_profiles
set credential_reset_required = true,
    updated_at = now();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (
    user_id,
    username,
    full_name,
    credential_reset_required
  )
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))),
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Terraforming Mars Player'),
    false
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
