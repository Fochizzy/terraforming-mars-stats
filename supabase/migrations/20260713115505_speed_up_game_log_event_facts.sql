
create or replace function analytics.game_log_event_facts_for_caller()
returns table (
  group_id uuid,
  game_id uuid,
  played_on date,
  map_id uuid,
  event_type text,
  tile_type text,
  board_space text,
  card_id uuid,
  generation_number integer,
  player_id uuid,
  player_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    g.group_id,
    g.id as game_id,
    g.played_on,
    g.map_id,
    e.event_type,
    e.tile_type,
    e.board_space,
    e.card_id,
    coalesce(
      max(e.generation_number) over (
        partition by e.game_log_import_id
        order by e.event_order
        rows between unbounded preceding and current row
      ),
      1
    ) as generation_number,
    resolved.player_id,
    resolved.player_name
  from public.game_log_events e
  join public.game_log_imports gli on gli.id = e.game_log_import_id
  join public.games g
    on g.id = gli.game_id
    and g.status = 'finalized'
    and (public.is_group_member(g.group_id) or public.can_read_game(g.id))
  left join lateral (
    select candidates.player_id, candidates.player_name
    from (
      select p.id as player_id, p.display_name as player_name, 1 as preference
      from public.players p
      where p.group_id = g.group_id
        and p.normalized_display_name = btrim(
          regexp_replace(lower(coalesce(e.payload->>'actor', '')), '[^a-z0-9]+', ' ', 'g')
        )
      union all
      select alias_player.id, alias_player.display_name, 2 as preference
      from public.player_import_aliases pia
      join public.players alias_player on alias_player.id = pia.player_id
      where pia.group_id = g.group_id
        and pia.source_type = 'game_log'
        and pia.normalized_alias = btrim(
          regexp_replace(lower(coalesce(e.payload->>'actor', '')), '[^a-z0-9]+', ' ', 'g')
        )
    ) candidates
    order by candidates.preference
    limit 1
  ) resolved on true;
$$;

grant execute on function analytics.game_log_event_facts_for_caller() to authenticated;

create or replace view analytics.game_log_event_facts
with (security_invoker = true) as
select
  group_id,
  game_id,
  played_on,
  map_id,
  event_type,
  tile_type,
  board_space,
  card_id,
  generation_number,
  player_id,
  player_name
from analytics.game_log_event_facts_for_caller();

grant select on analytics.game_log_event_facts to authenticated;
;
