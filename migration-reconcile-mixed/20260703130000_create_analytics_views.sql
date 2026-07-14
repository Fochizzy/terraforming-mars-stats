create schema if not exists analytics;
create or replace view analytics.player_game_results
with (security_invoker = true) as
select
  g.group_id,
  g.id as game_id,
  g.played_on,
  g.map_id,
  g.player_count,
  g.generation_count,
  gp.id as game_player_id,
  p.id as player_id,
  p.display_name as player_name,
  gp.placement,
  gp.is_winner,
  gp.total_points,
  gp.final_megacredits,
  gp.cities_points,
  gp.greenery_points,
  gp.card_points_total,
  gp.card_points_microbes,
  gp.card_points_animals,
  gp.card_points_jovian,
  gp.other_card_points,
  gp.tr_points,
  gp.milestone_points,
  gp.award_points,
  same_place.same_place_count,
  case
    when gp.card_points_microbes is not null
      and gp.card_points_animals is not null
      and gp.card_points_jovian is not null
    then true
    else false
  end as has_full_card_breakdown,
  declared_styles.primary_style_code as declared_primary_style_code,
  declared_styles.modifier_style_codes as declared_modifier_style_codes,
  (declared_styles.primary_style_code is not null) as has_declared_style,
  inferred_styles.primary_style_code as inferred_primary_style_code,
  inferred_styles.primary_confidence as inferred_style_confidence,
  coalesce(key_cards.key_card_count, 0) as key_card_count,
  lineups.lineup_key,
  lineups.lineup_label,
  lineups.opponent_count,
  case
    when gp.placement = 1 and same_place.same_place_count > 1 then 0
    when gp.placement = 1 then gp.total_points - coalesce(comparison.comparison_points, gp.total_points)
    else null
  end as win_differential_points,
  case
    when gp.placement = 1 then null
    else coalesce(comparison.comparison_points, gp.total_points) - gp.total_points
  end as loss_gap_points,
  case
    when gp.placement = 1 and same_place.same_place_count > 1 then 0
    when gp.placement = 1 then gp.total_points - coalesce(comparison.comparison_points, gp.total_points)
    else -1 * (coalesce(comparison.comparison_points, gp.total_points) - gp.total_points)
  end as signed_differential_points,
  1 - ((gp.placement - 1)::numeric / greatest(g.player_count - 1, 1)) as placement_score
from public.games g
join public.game_players gp on gp.game_id = g.id
join public.players p on p.id = gp.player_id
left join lateral (
  select count(*)::int as same_place_count
  from public.game_players gp_same
  where gp_same.game_id = g.id
    and gp_same.placement = gp.placement
) same_place on true
left join lateral (
  select
    case
      when gp.placement = 1 then min(gp_other.placement)
      else max(gp_other.placement)
    end as comparison_placement
  from public.game_players gp_other
  where gp_other.game_id = g.id
    and (
      (gp.placement = 1 and gp_other.placement > gp.placement)
      or
      (gp.placement > 1 and gp_other.placement < gp.placement)
    )
) comparison_target on true
left join lateral (
  select gp_other.total_points as comparison_points
  from public.game_players gp_other
  where gp_other.game_id = g.id
    and gp_other.placement = comparison_target.comparison_placement
  order by gp_other.total_points desc, gp_other.final_megacredits desc
  limit 1
) comparison on true
left join lateral (
  select
    max(sd.code) filter (where gpds.is_primary) as primary_style_code,
    coalesce(
      array_agg(sd.code order by sd.name) filter (where not gpds.is_primary),
      array[]::text[]
    ) as modifier_style_codes
  from public.game_player_declared_styles gpds
  join public.style_definitions sd on sd.id = gpds.style_definition_id
  where gpds.game_player_id = gp.id
) declared_styles on true
left join lateral (
  select
    max(sd.code) filter (where gpis.is_primary) as primary_style_code,
    max(gpis.confidence) filter (where gpis.is_primary) as primary_confidence
  from public.game_player_inferred_styles gpis
  join public.style_definitions sd on sd.id = gpis.style_definition_id
  where gpis.game_player_id = gp.id
) inferred_styles on true
left join lateral (
  select count(*)::int as key_card_count
  from public.game_player_key_cards gpk
  where gpk.game_player_id = gp.id
) key_cards on true
left join lateral (
  select
    string_agg(op.id::text, ',' order by op.id::text) as lineup_key,
    string_agg(op.display_name, ', ' order by op.display_name) as lineup_label,
    count(*)::int as opponent_count
  from public.game_players gp_other
  join public.players op on op.id = gp_other.player_id
  where gp_other.game_id = g.id
    and gp_other.player_id <> gp.player_id
) lineups on true
where g.status = 'finalized';
create or replace view analytics.group_leaderboard
with (security_invoker = true) as
select
  pgr.group_id,
  pgr.player_id,
  pgr.player_name,
  count(*)::int as games_played,
  (count(*) filter (where pgr.is_winner))::int as wins,
  round((count(*) filter (where pgr.is_winner))::numeric / count(*), 4) as win_rate,
  round(avg(pgr.placement::numeric), 3) as average_placement,
  round(avg(pgr.total_points::numeric), 3) as average_score,
  round(avg(pgr.win_differential_points::numeric), 3) as average_win_margin,
  round(avg(pgr.loss_gap_points::numeric), 3) as average_loss_gap,
  round(avg((case when pgr.is_winner then 1 else 0 end)::numeric) * 0.5, 4) as win_rate_component,
  round(avg(pgr.placement_score) * 0.3, 4) as placement_component,
  round(
    greatest(least(avg(pgr.signed_differential_points::numeric) / 20.0, 1), -1) * 0.2,
    4
  ) as differential_component,
  round(
    (avg((case when pgr.is_winner then 1 else 0 end)::numeric) * 0.5) +
    (avg(pgr.placement_score) * 0.3) +
    (greatest(least(avg(pgr.signed_differential_points::numeric) / 20.0, 1), -1) * 0.2),
    4
  ) as weighted_score
from analytics.player_game_results pgr
group by pgr.group_id, pgr.player_id, pgr.player_name;
create or replace view analytics.group_score_source_averages
with (security_invoker = true) as
select
  pgr.group_id,
  round(avg(pgr.cities_points::numeric), 3) as average_cities_points,
  round(avg(pgr.greenery_points::numeric), 3) as average_greenery_points,
  round(avg(pgr.card_points_total::numeric), 3) as average_card_points,
  round(avg(coalesce(pgr.card_points_microbes, 0)::numeric), 3) as average_microbe_points,
  round(avg(coalesce(pgr.card_points_animals, 0)::numeric), 3) as average_animal_points,
  round(avg(coalesce(pgr.card_points_jovian, 0)::numeric), 3) as average_jovian_points,
  round(avg(coalesce(pgr.other_card_points, 0)::numeric), 3) as average_other_card_points,
  round(avg(pgr.tr_points::numeric), 3) as average_tr_points,
  round(avg(pgr.milestone_points::numeric), 3) as average_milestone_points,
  round(avg(pgr.award_points::numeric), 3) as average_award_points
from analytics.player_game_results pgr
group by pgr.group_id;
create or replace view analytics.player_score_source_averages
with (security_invoker = true) as
select
  pgr.group_id,
  pgr.player_id,
  pgr.player_name,
  round(avg(pgr.cities_points::numeric), 3) as average_cities_points,
  round(avg(pgr.greenery_points::numeric), 3) as average_greenery_points,
  round(avg(pgr.card_points_total::numeric), 3) as average_card_points,
  round(avg(coalesce(pgr.card_points_microbes, 0)::numeric), 3) as average_microbe_points,
  round(avg(coalesce(pgr.card_points_animals, 0)::numeric), 3) as average_animal_points,
  round(avg(coalesce(pgr.card_points_jovian, 0)::numeric), 3) as average_jovian_points,
  round(avg(coalesce(pgr.other_card_points, 0)::numeric), 3) as average_other_card_points,
  round(avg(pgr.tr_points::numeric), 3) as average_tr_points,
  round(avg(pgr.milestone_points::numeric), 3) as average_milestone_points,
  round(avg(pgr.award_points::numeric), 3) as average_award_points
from analytics.player_game_results pgr
group by pgr.group_id, pgr.player_id, pgr.player_name;
create or replace view analytics.head_to_head
with (security_invoker = true) as
select
  left_results.group_id,
  left_results.player_id as left_player_id,
  left_results.player_name as left_player_name,
  right_results.player_id as right_player_id,
  right_results.player_name as right_player_name,
  count(*)::int as games_played,
  (count(*) filter (where left_results.placement < right_results.placement))::int as left_wins,
  (count(*) filter (where right_results.placement < left_results.placement))::int as right_wins,
  (count(*) filter (where right_results.placement = left_results.placement))::int as ties,
  round(avg((left_results.total_points - right_results.total_points)::numeric), 3) as average_score_differential,
  round(avg((right_results.placement - left_results.placement)::numeric), 3) as average_placement_edge
from analytics.player_game_results left_results
join analytics.player_game_results right_results
  on right_results.game_id = left_results.game_id
 and right_results.player_id::text > left_results.player_id::text
group by
  left_results.group_id,
  left_results.player_id,
  left_results.player_name,
  right_results.player_id,
  right_results.player_name;
create or replace view analytics.group_style_performance
with (security_invoker = true) as
select
  pgr.group_id,
  pgr.inferred_primary_style_code as style_code,
  count(*)::int as games_played,
  (count(*) filter (where pgr.is_winner))::int as wins,
  round((count(*) filter (where pgr.is_winner))::numeric / count(*), 4) as win_rate,
  round(avg(pgr.placement::numeric), 3) as average_placement,
  round(avg(pgr.total_points::numeric), 3) as average_score,
  round(avg(pgr.generation_count::numeric), 3) as average_generation_count
from analytics.player_game_results pgr
where pgr.inferred_primary_style_code is not null
group by pgr.group_id, pgr.inferred_primary_style_code;
create or replace view analytics.player_style_performance
with (security_invoker = true) as
select
  pgr.group_id,
  pgr.player_id,
  pgr.player_name,
  pgr.inferred_primary_style_code as style_code,
  count(*)::int as games_played,
  (count(*) filter (where pgr.is_winner))::int as wins,
  round((count(*) filter (where pgr.is_winner))::numeric / count(*), 4) as win_rate,
  round(avg(pgr.placement::numeric), 3) as average_placement,
  round(avg(pgr.total_points::numeric), 3) as average_score,
  round(avg(pgr.generation_count::numeric), 3) as average_generation_count
from analytics.player_game_results pgr
where pgr.inferred_primary_style_code is not null
group by
  pgr.group_id,
  pgr.player_id,
  pgr.player_name,
  pgr.inferred_primary_style_code;
create or replace view analytics.group_interactions
with (security_invoker = true) as
with interaction_rows as (
  select
    pgr.group_id,
    'map_expansion_mix'::text as interaction_type,
    concat_ws(
      ' | ',
      coalesce(m.name, 'Unknown Map'),
      coalesce(expansion_sets.expansion_label, 'Base only')
    ) as label,
    pgr.is_winner,
    pgr.placement,
    pgr.total_points
  from analytics.player_game_results pgr
  left join public.maps m on m.id = pgr.map_id
  left join lateral (
    select string_agg(e.name, ' + ' order by e.name) as expansion_label
    from public.game_expansions ge
    join public.expansions e on e.id = ge.expansion_id
    where ge.game_id = pgr.game_id
  ) expansion_sets on true

  union all

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
    'map_expansion_mix'::text as interaction_type,
    concat_ws(
      ' | ',
      coalesce(m.name, 'Unknown Map'),
      coalesce(expansion_sets.expansion_label, 'Base only')
    ) as label,
    pgr.is_winner,
    pgr.placement,
    pgr.total_points
  from analytics.player_game_results pgr
  left join public.maps m on m.id = pgr.map_id
  left join lateral (
    select string_agg(e.name, ' + ' order by e.name) as expansion_label
    from public.game_expansions ge
    join public.expansions e on e.id = ge.expansion_id
    where ge.game_id = pgr.game_id
  ) expansion_sets on true

  union all

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
create or replace view analytics.lineup_effects
with (security_invoker = true) as
select
  pgr.group_id,
  pgr.player_id,
  pgr.player_name,
  pgr.lineup_key,
  pgr.lineup_label,
  count(*)::int as games_played,
  round(avg((case when pgr.is_winner then 1 else 0 end)::numeric), 4) as win_rate,
  round(avg(pgr.placement::numeric), 3) as average_placement,
  round(avg(pgr.total_points::numeric), 3) as average_score,
  round(avg(pgr.generation_count::numeric), 3) as average_generation_count
from analytics.player_game_results pgr
group by
  pgr.group_id,
  pgr.player_id,
  pgr.player_name,
  pgr.lineup_key,
  pgr.lineup_label;
create or replace view analytics.player_trends
with (security_invoker = true) as
select
  pgr.group_id,
  pgr.game_id,
  pgr.played_on,
  pgr.player_id,
  pgr.player_name,
  pgr.placement,
  pgr.is_winner,
  pgr.total_points,
  pgr.generation_count,
  pgr.inferred_primary_style_code
from analytics.player_game_results pgr;
create or replace view analytics.style_agreement
with (security_invoker = true) as
select
  agreement.group_id,
  agreement.player_id,
  agreement.player_name,
  agreement.compared_games,
  round(agreement.exact_match_games::numeric / nullif(agreement.compared_games, 0), 4) as exact_match_rate,
  round(agreement.partial_match_games::numeric / nullif(agreement.compared_games, 0), 4) as partial_match_rate,
  round(agreement.mismatch_games::numeric / nullif(agreement.compared_games, 0), 4) as mismatch_rate,
  round(agreement.average_inferred_confidence, 3) as average_inferred_confidence
from (
  select
    pgr.group_id,
    pgr.player_id,
    pgr.player_name,
    (count(*) filter (
      where pgr.declared_primary_style_code is not null
        and pgr.inferred_primary_style_code is not null
    ))::int as compared_games,
    (count(*) filter (
      where pgr.declared_primary_style_code is not null
        and pgr.inferred_primary_style_code is not null
        and pgr.declared_primary_style_code = pgr.inferred_primary_style_code
    ))::int as exact_match_games,
    (count(*) filter (
      where pgr.declared_primary_style_code is not null
        and pgr.inferred_primary_style_code is not null
        and pgr.declared_primary_style_code <> pgr.inferred_primary_style_code
        and pgr.inferred_primary_style_code = any(pgr.declared_modifier_style_codes)
    ))::int as partial_match_games,
    (count(*) filter (
      where pgr.declared_primary_style_code is not null
        and pgr.inferred_primary_style_code is not null
        and pgr.declared_primary_style_code <> pgr.inferred_primary_style_code
        and not (pgr.inferred_primary_style_code = any(pgr.declared_modifier_style_codes))
    ))::int as mismatch_games,
    avg(pgr.inferred_style_confidence) filter (
      where pgr.declared_primary_style_code is not null
        and pgr.inferred_primary_style_code is not null
    ) as average_inferred_confidence
  from analytics.player_game_results pgr
  group by pgr.group_id, pgr.player_id, pgr.player_name
) agreement;
create or replace view analytics.data_coverage
with (security_invoker = true) as
select
  pgr.group_id,
  count(distinct pgr.game_id)::int as finalized_games,
  count(*)::int as finalized_player_results,
  round(avg((pgr.card_points_microbes is not null)::int::numeric), 4) as microbe_coverage,
  round(avg((pgr.card_points_animals is not null)::int::numeric), 4) as animal_coverage,
  round(avg((pgr.card_points_jovian is not null)::int::numeric), 4) as jovian_coverage,
  round(avg((pgr.has_full_card_breakdown)::int::numeric), 4) as card_breakdown_coverage,
  round(avg((pgr.has_declared_style)::int::numeric), 4) as declared_style_coverage,
  round(avg((pgr.key_card_count > 0)::int::numeric), 4) as key_card_coverage
from analytics.player_game_results pgr
group by pgr.group_id;
create or replace view analytics.player_data_coverage
with (security_invoker = true) as
select
  pgr.group_id,
  pgr.player_id,
  pgr.player_name,
  count(distinct pgr.game_id)::int as finalized_games,
  count(*)::int as finalized_player_results,
  round(avg((pgr.card_points_microbes is not null)::int::numeric), 4) as microbe_coverage,
  round(avg((pgr.card_points_animals is not null)::int::numeric), 4) as animal_coverage,
  round(avg((pgr.card_points_jovian is not null)::int::numeric), 4) as jovian_coverage,
  round(avg((pgr.has_full_card_breakdown)::int::numeric), 4) as card_breakdown_coverage,
  round(avg((pgr.has_declared_style)::int::numeric), 4) as declared_style_coverage,
  round(avg((pgr.key_card_count > 0)::int::numeric), 4) as key_card_coverage
from analytics.player_game_results pgr
group by pgr.group_id, pgr.player_id, pgr.player_name;
create or replace view analytics.global_corporation_performance
with (security_invoker = true) as
select
  pgr.group_id,
  c.id as corporation_id,
  c.name as corporation_name,
  count(*)::int as games_played,
  (count(*) filter (where pgr.is_winner))::int as wins,
  round((count(*) filter (where pgr.is_winner))::numeric / count(*), 4) as win_rate,
  round(avg(pgr.total_points::numeric), 3) as average_score
from analytics.player_game_results pgr
join public.group_settings gs on gs.group_id = pgr.group_id
join public.game_players gp on gp.id = pgr.game_player_id
join public.corporations c on c.id = gp.corporation_id
where gs.global_analytics_enabled = true
group by pgr.group_id, c.id, c.name;
grant usage on schema analytics to authenticated;
grant select on all tables in schema analytics to authenticated;
