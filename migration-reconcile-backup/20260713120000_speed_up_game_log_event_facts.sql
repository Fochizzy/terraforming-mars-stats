-- Speed up the log-derived extended-analytics views (card/tag outcomes, tile
-- placements, generation pace) that render blank on /insights.
--
-- Root cause: analytics.game_log_event_facts is a security_invoker view, so the
-- per-event actor resolution re-evaluates the RLS helper functions
-- (is_group_member / can_read_game / can_read_player) once PER ROW — thousands of
-- times per query. Under the authenticated role that pushes the query past the
-- 8s statement_timeout (57014), so getExtendedGroupAnalytics / getOverallAnalytics
-- throw and every dependent section falls back to its empty state.
--
-- Fix: back the view with a SECURITY DEFINER function that scopes the visible
-- games ONCE (per-game membership check, ~tens of games) and then resolves actors
-- with RLS bypassed. Same visibility semantics (an event is visible iff its game
-- is visible via is_group_member OR can_read_game), same 11 output columns, so the
-- four dependent views and the application query layer are unchanged.

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
    -- Scope to the caller's visible games ONCE (per game, not per event). Mirrors
    -- the SELECT policy on public.games that the invoker view relied on.
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

-- Redefine the view as a thin wrapper over the definer function. Identical column
-- list keeps the dependent views (player_card_outcomes, game_tile_placements,
-- game_generation_pace, and the tag outcomes derived from them) valid.
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
