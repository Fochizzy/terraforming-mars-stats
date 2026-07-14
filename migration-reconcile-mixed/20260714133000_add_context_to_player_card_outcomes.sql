-- Add corporation, play-style, and dominant scoring-method context to every
-- logged card outcome so profile card impact can compare like with like.
create or replace view analytics.player_card_outcomes
with (security_invoker = true) as
select distinct
  f.group_id,
  f.game_id,
  f.played_on,
  f.player_id,
  f.player_name,
  f.card_id,
  c.card_name,
  gp.is_winner,
  coalesce(c.thumbnail_path, c.full_image_path, c.image_url) as thumbnail_url,
  coalesce(c.full_image_path, c.image_url) as full_image_url,
  corporations.corporation_name,
  coalesce(
    pgr.declared_primary_style_code,
    pgr.inferred_primary_style_code,
    'unclassified'
  ) as style_code,
  case
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
  end as outcome_method
from analytics.game_log_event_facts f
join public.cards c on c.id = f.card_id
join public.game_players gp
  on gp.game_id = f.game_id
 and gp.player_id = f.player_id
join analytics.player_game_results pgr
  on pgr.game_id = f.game_id
 and pgr.player_id = f.player_id
left join lateral (
  select string_agg(selected.name, ' + ' order by selected.name) as corporation_name
  from (
    select corporation.name
    from public.game_player_corporations selection
    join public.corporations corporation on corporation.id = selection.corporation_id
    where selection.game_player_id = gp.id

    union all

    select corporation.name
    from public.corporations corporation
    where corporation.id = gp.corporation_id
      and not exists (
        select 1
        from public.game_player_corporations selection
        where selection.game_player_id = gp.id
      )
  ) selected
) corporations on true
where f.event_type = 'card_played'
  and f.card_id is not null
  and f.player_id is not null;
grant select on analytics.player_card_outcomes to authenticated;
