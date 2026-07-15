create or replace function public.get_player_usernames(p_player_ids uuid[])
returns table(player_id uuid, username text)
language sql
stable
security definer
set search_path = public
as $function$
  select
    requested.player_id,
    resolved.username
  from unnest(p_player_ids) as requested(player_id)
  join lateral (
    select coalesce(
      nullif(btrim(up.username), ''),
      nullif(btrim(p.username), '')
    ) as username
    from public.players p
    left join public.user_profiles up on up.user_id = p.linked_user_id
    where p.id = requested.player_id
       or p.linked_user_id = requested.player_id
    order by
      (p.linked_user_id = requested.player_id) desc,
      (nullif(btrim(up.username), '') is not null) desc,
      p.created_at,
      p.id
    limit 1
  ) resolved on resolved.username is not null;
$function$;
