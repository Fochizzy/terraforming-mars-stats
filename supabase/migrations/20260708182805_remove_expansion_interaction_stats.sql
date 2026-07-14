-- Expansion setup is no longer a stats surface. Keep corporation/prelude
-- interaction analytics, but stop producing map + expansion mix rows.

create or replace view analytics.group_interactions
with (security_invoker = true) as
with interaction_rows as (
  select
    pgr.group_id,
    'corporation_prelude_pair'::text as interaction_type,
    concat_ws(
      ' | ',
      coalesce(c.name, 'Unknown corporation'),
      coalesce(prelude_sets.prelude_label, 'No Prelude')
    ) as label,
    pgr.is_winner,
    pgr.placement,
    pgr.total_points
  from analytics.player_game_results pgr
  join public.game_players gp on gp.id = pgr.game_player_id
  left join public.corporations c on c.id = gp.corporation_id
  left join lateral (
    select string_agg(pr.name, ' + ' order by pr.name) as prelude_label
    from public.game_player_preludes gpp
    join public.preludes pr on pr.id = gpp.prelude_id
    where gpp.game_player_id = pgr.game_player_id
  ) prelude_sets on true
)
select
  interaction_rows.group_id,
  interaction_rows.interaction_type,
  interaction_rows.label,
  count(*)::int as games_played,
  (count(*) filter (where interaction_rows.is_winner))::int as wins,
  round(
    (count(*) filter (where interaction_rows.is_winner))::numeric / count(*),
    4
  ) as win_rate,
  round(avg(interaction_rows.placement::numeric), 3) as average_placement,
  round(avg(interaction_rows.total_points::numeric), 3) as average_score
from interaction_rows
group by
  interaction_rows.group_id,
  interaction_rows.interaction_type,
  interaction_rows.label;

create or replace view analytics.player_interactions
with (security_invoker = true) as
with interaction_rows as (
  select
    pgr.group_id,
    pgr.player_id,
    pgr.player_name,
    'corporation_prelude_pair'::text as interaction_type,
    concat_ws(
      ' | ',
      coalesce(c.name, 'Unknown corporation'),
      coalesce(prelude_sets.prelude_label, 'No Prelude')
    ) as label,
    pgr.is_winner,
    pgr.placement,
    pgr.total_points
  from analytics.player_game_results pgr
  join public.game_players gp on gp.id = pgr.game_player_id
  left join public.corporations c on c.id = gp.corporation_id
  left join lateral (
    select string_agg(pr.name, ' + ' order by pr.name) as prelude_label
    from public.game_player_preludes gpp
    join public.preludes pr on pr.id = gpp.prelude_id
    where gpp.game_player_id = pgr.game_player_id
  ) prelude_sets on true
)
select
  interaction_rows.group_id,
  interaction_rows.player_id,
  interaction_rows.player_name,
  interaction_rows.interaction_type,
  interaction_rows.label,
  count(*)::int as games_played,
  (count(*) filter (where interaction_rows.is_winner))::int as wins,
  round(
    (count(*) filter (where interaction_rows.is_winner))::numeric / count(*),
    4
  ) as win_rate,
  round(avg(interaction_rows.placement::numeric), 3) as average_placement,
  round(avg(interaction_rows.total_points::numeric), 3) as average_score
from interaction_rows
group by
  interaction_rows.group_id,
  interaction_rows.player_id,
  interaction_rows.player_name,
  interaction_rows.interaction_type,
  interaction_rows.label;

grant select on analytics.group_interactions to authenticated;
grant select on analytics.player_interactions to authenticated;;
