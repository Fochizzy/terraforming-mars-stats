alter table public.game_player_metric_snapshots
  add column if not exists expected_win_probability numeric(12, 4),
  add column if not exists win_conversion_over_expected numeric(12, 4);
alter table public.player_metric_summaries
  add column if not exists average_expected_win_probability numeric(12, 4) not null default 0,
  add column if not exists win_conversion_over_expected numeric(12, 4) not null default 0,
  add column if not exists score_delta_stddev numeric(12, 4) not null default 0,
  add column if not exists consistency_index numeric(12, 4) not null default 1,
  add column if not exists clutch_close_rate numeric(12, 4) not null default 0;
alter table public.player_map_metric_summaries
  add column if not exists win_conversion_over_expected numeric(12, 4) not null default 0,
  add column if not exists score_delta_stddev numeric(12, 4) not null default 0,
  add column if not exists consistency_index numeric(12, 4) not null default 1,
  add column if not exists clutch_close_rate numeric(12, 4) not null default 0;
alter table public.global_map_metric_summaries
  add column if not exists win_conversion_over_expected numeric(12, 4) not null default 0,
  add column if not exists score_delta_stddev numeric(12, 4) not null default 0,
  add column if not exists consistency_index numeric(12, 4) not null default 1,
  add column if not exists clutch_close_rate numeric(12, 4) not null default 0;
alter table public.global_corporation_metric_summaries
  add column if not exists win_conversion_over_expected numeric(12, 4) not null default 0,
  add column if not exists score_delta_stddev numeric(12, 4) not null default 0,
  add column if not exists consistency_index numeric(12, 4) not null default 1,
  add column if not exists clutch_close_rate numeric(12, 4) not null default 0;
alter table public.global_style_metric_summaries
  add column if not exists win_conversion_over_expected numeric(12, 4) not null default 0,
  add column if not exists score_delta_stddev numeric(12, 4) not null default 0,
  add column if not exists consistency_index numeric(12, 4) not null default 1,
  add column if not exists clutch_close_rate numeric(12, 4) not null default 0;
alter table public.global_tag_metric_summaries
  add column if not exists win_conversion_over_expected numeric(12, 4) not null default 0,
  add column if not exists score_delta_stddev numeric(12, 4) not null default 0,
  add column if not exists consistency_index numeric(12, 4) not null default 1,
  add column if not exists clutch_close_rate numeric(12, 4) not null default 0;
alter table public.global_milestone_metric_summaries
  add column if not exists winner_win_conversion_over_expected numeric(12, 4) not null default 0,
  add column if not exists winner_score_delta_stddev numeric(12, 4) not null default 0,
  add column if not exists winner_consistency_index numeric(12, 4) not null default 1,
  add column if not exists winner_clutch_close_rate numeric(12, 4) not null default 0;
alter table public.global_award_metric_summaries
  add column if not exists award_winner_win_conversion_over_expected numeric(12, 4) not null default 0,
  add column if not exists award_winner_score_delta_stddev numeric(12, 4) not null default 0,
  add column if not exists award_winner_consistency_index numeric(12, 4) not null default 1,
  add column if not exists award_winner_clutch_close_rate numeric(12, 4) not null default 0,
  add column if not exists funder_win_conversion_over_expected numeric(12, 4) not null default 0,
  add column if not exists funder_score_delta_stddev numeric(12, 4) not null default 0,
  add column if not exists funder_consistency_index numeric(12, 4) not null default 1,
  add column if not exists funder_clutch_close_rate numeric(12, 4) not null default 0;
alter table public.global_player_count_metric_summaries
  add column if not exists win_conversion_over_expected numeric(12, 4) not null default 0,
  add column if not exists score_delta_stddev numeric(12, 4) not null default 0,
  add column if not exists consistency_index numeric(12, 4) not null default 1,
  add column if not exists clutch_close_rate numeric(12, 4) not null default 0;
alter table public.global_generation_metric_summaries
  add column if not exists win_conversion_over_expected numeric(12, 4) not null default 0,
  add column if not exists score_delta_stddev numeric(12, 4) not null default 0,
  add column if not exists consistency_index numeric(12, 4) not null default 1,
  add column if not exists clutch_close_rate numeric(12, 4) not null default 0;
create or replace function public.metric_consistency_index(p_score_delta_stddev numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when p_score_delta_stddev is null then 1
    else round(
      1 / (1 + (greatest(p_score_delta_stddev, 0)::numeric / 10)),
      4
    )
  end;
$$;
create or replace function public.rebuild_additional_metric_summaries()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  with game_expected_totals as (
    select
      game_id,
      sum(expected_score) as expected_score_total
    from public.game_player_metric_snapshots
    group by game_id
  ),
  probabilities as (
    select
      gps.id,
      case
        when totals.expected_score_total > 0
        then coalesce(gps.expected_score, 0) / totals.expected_score_total
        when gps.player_count > 0
        then 1::numeric / gps.player_count
        else null
      end as expected_win_probability,
      (case when gps.is_winner then 1 else 0 end)::numeric as actual_win
    from public.game_player_metric_snapshots gps
    join game_expected_totals totals
      on totals.game_id = gps.game_id
  )
  update public.game_player_metric_snapshots gps
  set
    expected_win_probability = round(probabilities.expected_win_probability, 4),
    win_conversion_over_expected = round(
      probabilities.actual_win - probabilities.expected_win_probability,
      4
    ),
    updated_at = now()
  from probabilities
  where probabilities.id = gps.id;

  with aggregate_rows as (
    select
      gps.group_id,
      gps.player_id,
      round(avg(gps.expected_win_probability), 4) as average_expected_win_probability,
      round(avg(gps.win_conversion_over_expected), 4) as win_conversion_over_expected,
      round(stddev_pop(gps.score_delta_vs_expected), 4) as score_delta_stddev,
      public.metric_consistency_index(stddev_pop(gps.score_delta_vs_expected)) as consistency_index,
      round(
        count(*) filter (where gps.close_game and gps.is_winner)::numeric
          / nullif(count(*) filter (where gps.close_game), 0),
        4
      ) as clutch_close_rate
    from public.game_player_metric_snapshots gps
    group by gps.group_id, gps.player_id
  )
  update public.player_metric_summaries summaries
  set
    average_expected_win_probability = coalesce(aggregate_rows.average_expected_win_probability, 0),
    win_conversion_over_expected = coalesce(aggregate_rows.win_conversion_over_expected, 0),
    score_delta_stddev = coalesce(aggregate_rows.score_delta_stddev, 0),
    consistency_index = coalesce(aggregate_rows.consistency_index, 1),
    clutch_close_rate = coalesce(aggregate_rows.clutch_close_rate, 0),
    updated_at = now()
  from aggregate_rows
  where aggregate_rows.group_id = summaries.group_id
    and aggregate_rows.player_id = summaries.player_id;

  with aggregate_rows as (
    select
      gps.group_id,
      gps.player_id,
      gps.map_id,
      round(avg(gps.win_conversion_over_expected), 4) as win_conversion_over_expected,
      round(stddev_pop(gps.score_delta_vs_expected), 4) as score_delta_stddev,
      public.metric_consistency_index(stddev_pop(gps.score_delta_vs_expected)) as consistency_index,
      round(
        count(*) filter (where gps.close_game and gps.is_winner)::numeric
          / nullif(count(*) filter (where gps.close_game), 0),
        4
      ) as clutch_close_rate
    from public.game_player_metric_snapshots gps
    where gps.map_id is not null
    group by gps.group_id, gps.player_id, gps.map_id
  )
  update public.player_map_metric_summaries summaries
  set
    win_conversion_over_expected = coalesce(aggregate_rows.win_conversion_over_expected, 0),
    score_delta_stddev = coalesce(aggregate_rows.score_delta_stddev, 0),
    consistency_index = coalesce(aggregate_rows.consistency_index, 1),
    clutch_close_rate = coalesce(aggregate_rows.clutch_close_rate, 0),
    updated_at = now()
  from aggregate_rows
  where aggregate_rows.group_id = summaries.group_id
    and aggregate_rows.player_id = summaries.player_id
    and aggregate_rows.map_id = summaries.map_id;

  with aggregate_rows as (
    select
      gps.map_id,
      gps.player_count,
      round(avg(gps.win_conversion_over_expected), 4) as win_conversion_over_expected,
      round(stddev_pop(gps.score_delta_vs_expected), 4) as score_delta_stddev,
      public.metric_consistency_index(stddev_pop(gps.score_delta_vs_expected)) as consistency_index,
      round(
        count(*) filter (where gps.close_game and gps.is_winner)::numeric
          / nullif(count(*) filter (where gps.close_game), 0),
        4
      ) as clutch_close_rate
    from public.game_player_metric_snapshots gps
    join public.group_settings gs
      on gs.group_id = gps.group_id
     and gs.global_analytics_enabled = true
    where gps.map_id is not null
    group by gps.map_id, gps.player_count
  )
  update public.global_map_metric_summaries summaries
  set
    win_conversion_over_expected = coalesce(aggregate_rows.win_conversion_over_expected, 0),
    score_delta_stddev = coalesce(aggregate_rows.score_delta_stddev, 0),
    consistency_index = coalesce(aggregate_rows.consistency_index, 1),
    clutch_close_rate = coalesce(aggregate_rows.clutch_close_rate, 0),
    updated_at = now()
  from aggregate_rows
  where aggregate_rows.map_id = summaries.map_id
    and aggregate_rows.player_count = summaries.player_count;

  with aggregate_rows as (
    select
      gps.corporation_id,
      gps.map_id,
      gps.player_count,
      round(avg(gps.win_conversion_over_expected), 4) as win_conversion_over_expected,
      round(stddev_pop(gps.score_delta_vs_expected), 4) as score_delta_stddev,
      public.metric_consistency_index(stddev_pop(gps.score_delta_vs_expected)) as consistency_index,
      round(
        count(*) filter (where gps.close_game and gps.is_winner)::numeric
          / nullif(count(*) filter (where gps.close_game), 0),
        4
      ) as clutch_close_rate
    from public.game_player_metric_snapshots gps
    join public.group_settings gs
      on gs.group_id = gps.group_id
     and gs.global_analytics_enabled = true
    where gps.corporation_id is not null
    group by gps.corporation_id, gps.map_id, gps.player_count
  )
  update public.global_corporation_metric_summaries summaries
  set
    win_conversion_over_expected = coalesce(aggregate_rows.win_conversion_over_expected, 0),
    score_delta_stddev = coalesce(aggregate_rows.score_delta_stddev, 0),
    consistency_index = coalesce(aggregate_rows.consistency_index, 1),
    clutch_close_rate = coalesce(aggregate_rows.clutch_close_rate, 0),
    updated_at = now()
  from aggregate_rows
  where aggregate_rows.corporation_id = summaries.corporation_id
    and aggregate_rows.map_id is not distinct from summaries.map_id
    and aggregate_rows.player_count = summaries.player_count;

  with style_rows as (
    select gps.*, sd.code as style_code
    from public.game_player_metric_snapshots gps
    join public.group_settings gs
      on gs.group_id = gps.group_id
     and gs.global_analytics_enabled = true
    join public.game_player_inferred_styles gpis
      on gpis.game_player_id = gps.game_player_id
     and gpis.is_primary
    join public.style_definitions sd on sd.id = gpis.style_definition_id

    union all

    select gps.*, sd.code as style_code
    from public.game_player_metric_snapshots gps
    join public.group_settings gs
      on gs.group_id = gps.group_id
     and gs.global_analytics_enabled = true
    join public.game_player_declared_styles gpds
      on gpds.game_player_id = gps.game_player_id
     and gpds.is_primary
    join public.style_definitions sd on sd.id = gpds.style_definition_id
    where not exists (
      select 1
      from public.game_player_inferred_styles gpis
      where gpis.game_player_id = gps.game_player_id
        and gpis.is_primary
    )
  ),
  aggregate_rows as (
    select
      style_rows.style_code,
      style_rows.map_id,
      style_rows.player_count,
      round(avg(style_rows.win_conversion_over_expected), 4) as win_conversion_over_expected,
      round(stddev_pop(style_rows.score_delta_vs_expected), 4) as score_delta_stddev,
      public.metric_consistency_index(stddev_pop(style_rows.score_delta_vs_expected)) as consistency_index,
      round(
        count(*) filter (where style_rows.close_game and style_rows.is_winner)::numeric
          / nullif(count(*) filter (where style_rows.close_game), 0),
        4
      ) as clutch_close_rate
    from style_rows
    group by style_rows.style_code, style_rows.map_id, style_rows.player_count
  )
  update public.global_style_metric_summaries summaries
  set
    win_conversion_over_expected = coalesce(aggregate_rows.win_conversion_over_expected, 0),
    score_delta_stddev = coalesce(aggregate_rows.score_delta_stddev, 0),
    consistency_index = coalesce(aggregate_rows.consistency_index, 1),
    clutch_close_rate = coalesce(aggregate_rows.clutch_close_rate, 0),
    updated_at = now()
  from aggregate_rows
  where aggregate_rows.style_code = summaries.style_code
    and aggregate_rows.map_id is not distinct from summaries.map_id
    and aggregate_rows.player_count = summaries.player_count;

  with aggregate_rows as (
    select
      tags.tag_code,
      tags.map_id,
      gps.player_count,
      round(avg(gps.win_conversion_over_expected), 4) as win_conversion_over_expected,
      round(stddev_pop(gps.score_delta_vs_expected), 4) as score_delta_stddev,
      public.metric_consistency_index(stddev_pop(gps.score_delta_vs_expected)) as consistency_index,
      round(
        count(*) filter (where gps.close_game and gps.is_winner)::numeric
          / nullif(count(*) filter (where gps.close_game), 0),
        4
      ) as clutch_close_rate
    from public.game_player_tag_metric_snapshots tags
    join public.group_settings gs
      on gs.group_id = tags.group_id
     and gs.global_analytics_enabled = true
    join public.game_player_metric_snapshots gps
      on gps.game_player_id = tags.game_player_id
    group by tags.tag_code, tags.map_id, gps.player_count
  )
  update public.global_tag_metric_summaries summaries
  set
    win_conversion_over_expected = coalesce(aggregate_rows.win_conversion_over_expected, 0),
    score_delta_stddev = coalesce(aggregate_rows.score_delta_stddev, 0),
    consistency_index = coalesce(aggregate_rows.consistency_index, 1),
    clutch_close_rate = coalesce(aggregate_rows.clutch_close_rate, 0),
    updated_at = now()
  from aggregate_rows
  where aggregate_rows.tag_code = summaries.tag_code
    and aggregate_rows.map_id is not distinct from summaries.map_id
    and aggregate_rows.player_count = summaries.player_count;

  with aggregate_rows as (
    select
      ms.milestone_id,
      ms.map_id,
      ms.player_count,
      round(avg(winner_snapshot.win_conversion_over_expected), 4) as winner_win_conversion_over_expected,
      round(stddev_pop(winner_snapshot.score_delta_vs_expected), 4) as winner_score_delta_stddev,
      public.metric_consistency_index(stddev_pop(winner_snapshot.score_delta_vs_expected)) as winner_consistency_index,
      round(
        count(*) filter (
          where winner_snapshot.close_game and winner_snapshot.is_winner
        )::numeric / nullif(
          count(*) filter (where winner_snapshot.close_game),
          0
        ),
        4
      ) as winner_clutch_close_rate
    from public.game_milestone_metric_snapshots ms
    join public.group_settings gs
      on gs.group_id = ms.group_id
     and gs.global_analytics_enabled = true
    join public.game_player_metric_snapshots winner_snapshot
      on winner_snapshot.game_player_id = ms.winner_game_player_id
    group by ms.milestone_id, ms.map_id, ms.player_count
  )
  update public.global_milestone_metric_summaries summaries
  set
    winner_win_conversion_over_expected = coalesce(aggregate_rows.winner_win_conversion_over_expected, 0),
    winner_score_delta_stddev = coalesce(aggregate_rows.winner_score_delta_stddev, 0),
    winner_consistency_index = coalesce(aggregate_rows.winner_consistency_index, 1),
    winner_clutch_close_rate = coalesce(aggregate_rows.winner_clutch_close_rate, 0),
    updated_at = now()
  from aggregate_rows
  where aggregate_rows.milestone_id = summaries.milestone_id
    and aggregate_rows.map_id is not distinct from summaries.map_id
    and aggregate_rows.player_count = summaries.player_count;

  with aggregate_rows as (
    select
      awards.award_id,
      awards.map_id,
      awards.player_count,
      round(avg(winner_snapshot.win_conversion_over_expected), 4) as award_winner_win_conversion_over_expected,
      round(stddev_pop(winner_snapshot.score_delta_vs_expected), 4) as award_winner_score_delta_stddev,
      public.metric_consistency_index(stddev_pop(winner_snapshot.score_delta_vs_expected)) as award_winner_consistency_index,
      round(
        count(*) filter (
          where winner_snapshot.close_game and winner_snapshot.is_winner
        )::numeric / nullif(
          count(*) filter (where winner_snapshot.close_game),
          0
        ),
        4
      ) as award_winner_clutch_close_rate,
      round(avg(funder_snapshot.win_conversion_over_expected), 4) as funder_win_conversion_over_expected,
      round(stddev_pop(funder_snapshot.score_delta_vs_expected), 4) as funder_score_delta_stddev,
      public.metric_consistency_index(stddev_pop(funder_snapshot.score_delta_vs_expected)) as funder_consistency_index,
      round(
        count(*) filter (
          where funder_snapshot.close_game and funder_snapshot.is_winner
        )::numeric / nullif(
          count(*) filter (where funder_snapshot.close_game),
          0
        ),
        4
      ) as funder_clutch_close_rate
    from public.game_award_metric_snapshots awards
    join public.group_settings gs
      on gs.group_id = awards.group_id
     and gs.global_analytics_enabled = true
    join public.game_player_metric_snapshots winner_snapshot
      on winner_snapshot.game_player_id = awards.winner_game_player_id
    join public.game_player_metric_snapshots funder_snapshot
      on funder_snapshot.game_player_id = awards.funded_by_game_player_id
    group by awards.award_id, awards.map_id, awards.player_count
  )
  update public.global_award_metric_summaries summaries
  set
    award_winner_win_conversion_over_expected = coalesce(aggregate_rows.award_winner_win_conversion_over_expected, 0),
    award_winner_score_delta_stddev = coalesce(aggregate_rows.award_winner_score_delta_stddev, 0),
    award_winner_consistency_index = coalesce(aggregate_rows.award_winner_consistency_index, 1),
    award_winner_clutch_close_rate = coalesce(aggregate_rows.award_winner_clutch_close_rate, 0),
    funder_win_conversion_over_expected = coalesce(aggregate_rows.funder_win_conversion_over_expected, 0),
    funder_score_delta_stddev = coalesce(aggregate_rows.funder_score_delta_stddev, 0),
    funder_consistency_index = coalesce(aggregate_rows.funder_consistency_index, 1),
    funder_clutch_close_rate = coalesce(aggregate_rows.funder_clutch_close_rate, 0),
    updated_at = now()
  from aggregate_rows
  where aggregate_rows.award_id = summaries.award_id
    and aggregate_rows.map_id is not distinct from summaries.map_id
    and aggregate_rows.player_count = summaries.player_count;

  with aggregate_rows as (
    select
      gps.player_count,
      round(avg(gps.win_conversion_over_expected), 4) as win_conversion_over_expected,
      round(stddev_pop(gps.score_delta_vs_expected), 4) as score_delta_stddev,
      public.metric_consistency_index(stddev_pop(gps.score_delta_vs_expected)) as consistency_index,
      round(
        count(*) filter (where gps.close_game and gps.is_winner)::numeric
          / nullif(count(*) filter (where gps.close_game), 0),
        4
      ) as clutch_close_rate
    from public.game_player_metric_snapshots gps
    join public.group_settings gs
      on gs.group_id = gps.group_id
     and gs.global_analytics_enabled = true
    group by gps.player_count
  )
  update public.global_player_count_metric_summaries summaries
  set
    win_conversion_over_expected = coalesce(aggregate_rows.win_conversion_over_expected, 0),
    score_delta_stddev = coalesce(aggregate_rows.score_delta_stddev, 0),
    consistency_index = coalesce(aggregate_rows.consistency_index, 1),
    clutch_close_rate = coalesce(aggregate_rows.clutch_close_rate, 0),
    updated_at = now()
  from aggregate_rows
  where aggregate_rows.player_count = summaries.player_count;

  with aggregate_rows as (
    select
      gps.generation_count,
      round(avg(gps.win_conversion_over_expected), 4) as win_conversion_over_expected,
      round(stddev_pop(gps.score_delta_vs_expected), 4) as score_delta_stddev,
      public.metric_consistency_index(stddev_pop(gps.score_delta_vs_expected)) as consistency_index,
      round(
        count(*) filter (where gps.close_game and gps.is_winner)::numeric
          / nullif(count(*) filter (where gps.close_game), 0),
        4
      ) as clutch_close_rate
    from public.game_player_metric_snapshots gps
    join public.group_settings gs
      on gs.group_id = gps.group_id
     and gs.global_analytics_enabled = true
    group by gps.generation_count
  )
  update public.global_generation_metric_summaries summaries
  set
    win_conversion_over_expected = coalesce(aggregate_rows.win_conversion_over_expected, 0),
    score_delta_stddev = coalesce(aggregate_rows.score_delta_stddev, 0),
    consistency_index = coalesce(aggregate_rows.consistency_index, 1),
    clutch_close_rate = coalesce(aggregate_rows.clutch_close_rate, 0),
    updated_at = now()
  from aggregate_rows
  where aggregate_rows.generation_count = summaries.generation_count;
end;
$$;
do $$
begin
  if to_regprocedure('public.rebuild_metric_summaries_base()') is null
     and to_regprocedure('public.rebuild_metric_summaries()') is not null then
    alter function public.rebuild_metric_summaries() rename to rebuild_metric_summaries_base;
  end if;
end $$;
create or replace function public.rebuild_metric_summaries()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if to_regprocedure('public.rebuild_metric_summaries_base()') is null then
    raise exception 'rebuild_metric_summaries_base() is required before rebuilding metric summaries'
      using errcode = '42883';
  end if;

  perform public.rebuild_metric_summaries_base();
  perform public.rebuild_additional_metric_summaries();
end;
$$;
revoke execute on function public.metric_consistency_index(numeric) from public;
revoke execute on function public.metric_consistency_index(numeric) from anon;
revoke execute on function public.metric_consistency_index(numeric) from authenticated;
revoke execute on function public.metric_consistency_index(numeric) from service_role;
revoke execute on function public.rebuild_additional_metric_summaries() from public;
revoke execute on function public.rebuild_additional_metric_summaries() from anon;
revoke execute on function public.rebuild_additional_metric_summaries() from authenticated;
revoke execute on function public.rebuild_additional_metric_summaries() from service_role;
revoke execute on function public.rebuild_metric_summaries_base() from public;
revoke execute on function public.rebuild_metric_summaries_base() from anon;
revoke execute on function public.rebuild_metric_summaries_base() from authenticated;
revoke execute on function public.rebuild_metric_summaries_base() from service_role;
revoke execute on function public.rebuild_metric_summaries() from public;
revoke execute on function public.rebuild_metric_summaries() from anon;
revoke execute on function public.rebuild_metric_summaries() from authenticated;
revoke execute on function public.rebuild_metric_summaries() from service_role;
select public.rebuild_metric_summaries();
