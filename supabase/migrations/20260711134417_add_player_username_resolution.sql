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

revoke all on function public.get_player_usernames(uuid[]) from public;
grant execute on function public.get_player_usernames(uuid[]) to authenticated;;
