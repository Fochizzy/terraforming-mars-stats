-- Follow-up to 20260713120000: the game_log_event_facts wrapper fixed the simple
-- aggregation views (tile placements, generation pace) but regressed
-- player_card_outcomes — as a black-box function the planner can no longer push
-- the event_type / group filters into it, so it materialised every event then
-- joined + DISTINCT'd (~5s). player_tag_outcomes never read the facts view and was
-- already ~1.3s from per-row RLS on its own joins.
--
-- Fix both by giving each join-heavy leaf view its own SECURITY DEFINER function
-- that applies the card_played filter / group scope EARLY and joins with RLS
-- bypassed, then redefining the view as a thin passthrough. Column lists match the
-- current views exactly (card: + thumbnail_url/full_image_url; tag: +
-- corporation_id/corporation_name), so the app and downstream aggregators are
-- unchanged.

-- --- Card outcomes -------------------------------------------------------------
create or replace function analytics.player_card_outcomes_for_caller()
returns table (
  group_id uuid,
  game_id uuid,
  played_on date,
  player_id uuid,
  player_name text,
  card_id uuid,
  card_name text,
  is_winner boolean,
  thumbnail_url text,
  full_image_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct
    g.group_id,
    g.id as game_id,
    g.played_on,
    resolved.player_id,
    resolved.player_name,
    e.card_id,
    c.card_name,
    gp.is_winner,
    coalesce(c.thumbnail_path, c.full_image_path, c.image_url) as thumbnail_url,
    coalesce(c.full_image_path, c.image_url) as full_image_url
  from public.game_log_events e
  join public.game_log_imports gli on gli.id = e.game_log_import_id
  join public.games g
    on g.id = gli.game_id
    and g.status = 'finalized'
    and (public.is_group_member(g.group_id) or public.can_read_game(g.id))
  join public.cards c on c.id = e.card_id
  join lateral (
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
  ) resolved on true
  join public.game_players gp on gp.game_id = g.id and gp.player_id = resolved.player_id
  where e.event_type = 'card_played'
    and e.card_id is not null;
$$;

grant execute on function analytics.player_card_outcomes_for_caller() to authenticated;

create or replace view analytics.player_card_outcomes
with (security_invoker = true) as
select
  group_id,
  game_id,
  played_on,
  player_id,
  player_name,
  card_id,
  card_name,
  is_winner,
  thumbnail_url,
  full_image_url
from analytics.player_card_outcomes_for_caller();

grant select on analytics.player_card_outcomes to authenticated;

-- --- Tag outcomes --------------------------------------------------------------
create or replace function analytics.player_tag_outcomes_for_caller()
returns table (
  group_id uuid,
  game_id uuid,
  played_on date,
  player_id uuid,
  player_name text,
  tag_code text,
  tag_count integer,
  total_points integer,
  is_winner boolean,
  corporation_id uuid,
  corporation_name text
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
    resolved.player_id,
    resolved.player_name,
    ts.tag_code,
    ts.tag_count,
    gp.total_points,
    gp.is_winner,
    corporation_selections.corporation_id,
    coalesce(c.name, 'Unknown Corporation') as corporation_name
  from public.game_log_tag_summaries ts
  join public.game_log_imports gli on gli.id = ts.game_log_import_id
  join public.games g
    on g.id = gli.game_id
    and g.status = 'finalized'
    and (public.is_group_member(g.group_id) or public.can_read_game(g.id))
  join lateral (
    select candidates.player_id, candidates.player_name
    from (
      select alias_player.id as player_id, alias_player.display_name as player_name, 1 as preference
      from public.player_import_aliases pia
      join public.players alias_player
        on alias_player.id = pia.player_id and alias_player.group_id = pia.group_id
      where pia.group_id = g.group_id
        and pia.source_type = 'game_log'
        and pia.normalized_alias = ts.normalized_player_name
      union all
      select p.id, p.display_name, 2 as preference
      from public.players p
      where p.group_id = g.group_id
        and p.normalized_display_name = ts.normalized_player_name
    ) candidates
    order by candidates.preference, candidates.player_name
    limit 1
  ) resolved on true
  join public.game_players gp on gp.game_id = g.id and gp.player_id = resolved.player_id
  left join lateral (
    select gpc.corporation_id
    from public.game_player_corporations gpc
    where gpc.game_player_id = gp.id
    union all
    select gp.corporation_id
    where gp.corporation_id is not null
      and not exists (
        select 1 from public.game_player_corporations gpc where gpc.game_player_id = gp.id
      )
  ) corporation_selections on true
  left join public.corporations c on c.id = corporation_selections.corporation_id;
$$;

grant execute on function analytics.player_tag_outcomes_for_caller() to authenticated;

create or replace view analytics.player_tag_outcomes
with (security_invoker = true) as
select
  group_id,
  game_id,
  played_on,
  player_id,
  player_name,
  tag_code,
  tag_count,
  total_points,
  is_winner,
  corporation_id,
  corporation_name
from analytics.player_tag_outcomes_for_caller();

grant select on analytics.player_tag_outcomes to authenticated;
