-- Rollback for 20260721194500_fold_player_card_outcome_context_into_definer
-- (production ledger version 20260721193508).
--
-- This is the exact pre-fold definition, captured from
-- pg_get_viewdef('analytics.player_card_outcomes', true) against production on
-- 2026-07-21 immediately before the fold was applied. It is recorded here
-- rather than referenced by migration filename on purpose: the live definition
-- did NOT match 20260714134000_extend_player_card_outcome_context.sql in this
-- repository -- the live one carries an extra `when pgr.game_id is null then
-- 'unclassified_method'` branch that arrived through the known repo/production
-- migration-history drift. Reverting to the repo file would silently change
-- behaviour for rows where the caller cannot see the player_game_results row.
--
-- Running this file restores the slow-but-identical pre-fold behaviour
-- (11.8s for the Insights Overall `where group_id = any(...)` shape, i.e. it
-- re-introduces the 57014 statement timeout). No data is mutated either way.

create or replace view analytics.player_card_outcomes
with (security_invoker = true) as
select distinct
  base.group_id,
  base.game_id,
  base.played_on,
  base.player_id,
  base.player_name,
  base.card_id,
  base.card_name,
  base.is_winner,
  base.thumbnail_url,
  base.full_image_url,
  corporations.corporation_name,
  coalesce(pgr.declared_primary_style_code, pgr.inferred_primary_style_code, 'unclassified') as style_code,
  case
  when pgr.game_id is null then 'unclassified_method'
  when greatest(
    pgr.tr_points,
    pgr.cities_points + pgr.greenery_points,
    pgr.card_points_total,
    pgr.milestone_points + pgr.award_points
  ) <= 0 then 'unclassified_method'
  else case greatest(
    pgr.tr_points,
    pgr.cities_points + pgr.greenery_points,
    pgr.card_points_total,
    pgr.milestone_points + pgr.award_points
  )
    when pgr.tr_points then 'terraforming'
    when pgr.cities_points + pgr.greenery_points then 'board_position'
    when pgr.card_points_total then 'card_engine'
    else 'objectives'
  end
  end as outcome_method,
  case
  when pgr.generation_count is null then 'unknown_pace'
  when pgr.generation_count <= 9 then 'fast_pace'
  when pgr.generation_count <= 11 then 'standard_pace'
  else 'long_pace'
  end as pace_bucket,
  pgr.player_count,
  coalesce(m.name, 'Unknown map') as map_name
from analytics.player_card_outcomes_for_caller() base
  left join analytics.player_game_results pgr
    on pgr.game_id = base.game_id and pgr.player_id = base.player_id
  left join maps m on m.id = pgr.map_id
  left join game_players gp
    on gp.game_id = base.game_id and gp.player_id = base.player_id
  left join lateral (
    select string_agg(selected.name, ' + ' order by selected.name) as corporation_name
    from (
      select corporation.name
      from game_player_corporations selection
      join corporations corporation on corporation.id = selection.corporation_id
      where selection.game_player_id = gp.id
      union all
      select corporation.name
      from corporations corporation
      where corporation.id = gp.corporation_id
        and not exists (
          select 1 from game_player_corporations selection
          where selection.game_player_id = gp.id
        )
    ) selected
  ) corporations on true;

grant select on analytics.player_card_outcomes to authenticated;

drop function if exists analytics.player_card_outcomes_detailed_for_caller();
