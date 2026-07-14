-- Resolve linked-account usernames for a batch of player rows.
--
-- The app names every person by their account `username` when registered, and
-- by first name only when not. `user_profiles` RLS only lets a user read their
-- OWN row, so this narrow `security definer` function is the sanctioned way to
-- read OTHER players' usernames. It exposes ONLY the username — never
-- `full_name`, email, or any other profile field — and is granted to
-- authenticated callers only, so nothing leaks to signed-out visitors.
create or replace function public.get_player_usernames(p_player_ids uuid[])
returns table (player_id uuid, username text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id as player_id, up.username
  from public.players p
  join public.user_profiles up on up.user_id = p.linked_user_id
  where p.id = any(p_player_ids)
    and up.username is not null
    and up.username <> '';
$$;

-- anon is intentionally NOT granted; usernames are only ever shown to signed-in
-- users.
revoke all on function public.get_player_usernames(uuid[]) from public;
grant execute on function public.get_player_usernames(uuid[]) to authenticated;
