-- Fold the context joins of analytics.player_card_outcomes into a SECURITY
-- DEFINER function so membership is checked once instead of once per card row.
--
-- The view is security_invoker. Its base rows already come from the definer
-- function player_card_outcomes_for_caller(), which is fast (~230ms for 4,510
-- rows), but the view then joined player_game_results, game_players, maps and a
-- lateral over game_player_corporations as the *caller*, so can_read_game_player
-- / can_read_game / is_group_member were re-evaluated per row.
--
-- Unfiltered, the planner hid this behind a Memoize node keyed on the game
-- player, collapsing 4,510 loops to 117 and finishing in ~550ms. The Insights
-- Overall scope does not read the view unfiltered: extended-analytics-repo's
-- listView issues `where group_id = any(...)`, and with that qualifier the
-- planner abandons Memoize and pays the RLS calls per row -- 11.8s against the
-- 8s statement_timeout on the authenticated role, so PostgREST returned 500
-- (57014) and every card-outcome Insights section rendered empty. Indexing
-- game_player_id on the style tables does not help; the cost is the function
-- calls, not the scans.
--
-- Folding the joins into a definer function removes both the per-row RLS cost
-- and the dependency on the planner picking Memoize: the enrichment is computed
-- once per distinct game player (117, not 4,510) inside the function, and the
-- caller's `group_id` filter now applies to the function's result rather than
-- rewriting its plan. Same shape as get_award_economics / get_selection_stats /
-- get_public_landing_stats.
--
-- Output is byte-identical. Verified across all four production users plus a
-- non-member: same row counts and same md5 over every column, filtered and
-- unfiltered. For the Overall (filtered) shape: 11,789ms -> 301ms.

create or replace function analytics.player_card_outcomes_detailed_for_caller()
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
  full_image_url text,
  corporation_name text,
  style_code text,
  outcome_method text,
  pace_bucket text,
  player_count integer,
  map_name text
)
language sql
stable
security definer
rows 5000
set search_path to ''
as $function$
  with base as (
    select * from analytics.player_card_outcomes_for_caller()
  ),
  -- Thousands of card rows collapse to ~117 distinct game players, so each
  -- join below runs once per game player instead of once per card played.
  subjects as (
    select distinct b.game_id, b.player_id from base b
  ),
  subject_facts as (
    select
      s.game_id,
      s.player_id,
      gp.id as game_player_id,
      gp.corporation_id,
      -- Before the fold these columns were reached through
      -- analytics.player_game_results, a security_invoker view whose inner join
      -- to public.players is filtered by that table's RLS. Running as definer
      -- bypasses that filter, so re-apply the same predicate here to keep the
      -- output identical: it withholds results for a game the caller created
      -- but whose group they are not a member of, where can_read_game passes
      -- and the players row is still invisible.
      (public.is_group_member(p.group_id) or public.can_read_player(p.id)) as results_visible,
      g.player_count,
      g.generation_count,
      g.map_id,
      gp.tr_points,
      gp.cities_points,
      gp.greenery_points,
      gp.card_points_total,
      gp.milestone_points,
      gp.award_points
    from subjects s
    join public.games g on g.id = s.game_id and g.status = 'finalized'
    join public.game_players gp on gp.game_id = s.game_id and gp.player_id = s.player_id
    join public.players p on p.id = gp.player_id
  ),
  subject_enrichment as (
    select
      f.game_id,
      f.player_id,
      corporations.corporation_name,
      case
      when not f.results_visible then 'unclassified'
      else coalesce(
        declared_styles.primary_style_code,
        inferred_styles.primary_style_code,
        'unclassified'
      )
      end as style_code,
      case
      when not f.results_visible then 'unclassified_method'
      when greatest(
        f.tr_points,
        f.cities_points + f.greenery_points,
        f.card_points_total,
        f.milestone_points + f.award_points
      ) <= 0 then 'unclassified_method'
      else case greatest(
        f.tr_points,
        f.cities_points + f.greenery_points,
        f.card_points_total,
        f.milestone_points + f.award_points
      )
        when f.tr_points then 'terraforming'
        when f.cities_points + f.greenery_points then 'board_position'
        when f.card_points_total then 'card_engine'
        else 'objectives'
      end
      end as outcome_method,
      case
      when not f.results_visible then 'unknown_pace'
      when f.generation_count is null then 'unknown_pace'
      when f.generation_count <= 9 then 'fast_pace'
      when f.generation_count <= 11 then 'standard_pace'
      else 'long_pace'
      end as pace_bucket,
      case when f.results_visible then f.player_count end as player_count,
      case
      when f.results_visible then coalesce(m.name, 'Unknown map')
      else 'Unknown map'
      end as map_name
    from subject_facts f
    left join public.maps m on m.id = f.map_id
    left join lateral (
      select max(sd.code) filter (where gpds.is_primary) as primary_style_code
      from public.game_player_declared_styles gpds
      join public.style_definitions sd on sd.id = gpds.style_definition_id
      where gpds.game_player_id = f.game_player_id
    ) declared_styles on true
    left join lateral (
      select max(sd.code) filter (where gpis.is_primary) as primary_style_code
      from public.game_player_inferred_styles gpis
      join public.style_definitions sd on sd.id = gpis.style_definition_id
      where gpis.game_player_id = f.game_player_id
    ) inferred_styles on true
    left join lateral (
      select string_agg(selected.name, ' + ' order by selected.name) as corporation_name
      from (
        select corporation.name
        from public.game_player_corporations selection
        join public.corporations corporation on corporation.id = selection.corporation_id
        where selection.game_player_id = f.game_player_id
        union all
        select corporation.name
        from public.corporations corporation
        where corporation.id = f.corporation_id
          and not exists (
            select 1
            from public.game_player_corporations selection
            where selection.game_player_id = f.game_player_id
          )
      ) selected
    ) corporations on true
  )
  select distinct
    b.group_id,
    b.game_id,
    b.played_on,
    b.player_id,
    b.player_name,
    b.card_id,
    b.card_name,
    b.is_winner,
    b.thumbnail_url,
    b.full_image_url,
    e.corporation_name,
    e.style_code,
    e.outcome_method,
    e.pace_bucket,
    e.player_count,
    e.map_name
  from base b
  left join subject_enrichment e
    on e.game_id = b.game_id and e.player_id = b.player_id;
$function$;

revoke all on function analytics.player_card_outcomes_detailed_for_caller() from public;
grant execute on function analytics.player_card_outcomes_detailed_for_caller() to authenticated;

-- The view keeps security_invoker semantics: it is a thin projection over the
-- definer function, exactly as it was over player_card_outcomes_for_caller().
create or replace view analytics.player_card_outcomes
with (security_invoker = true) as
select
  d.group_id,
  d.game_id,
  d.played_on,
  d.player_id,
  d.player_name,
  d.card_id,
  d.card_name,
  d.is_winner,
  d.thumbnail_url,
  d.full_image_url,
  d.corporation_name,
  d.style_code,
  d.outcome_method,
  d.pace_bucket,
  d.player_count,
  d.map_name
from analytics.player_card_outcomes_detailed_for_caller() d;

grant select on analytics.player_card_outcomes to authenticated;
