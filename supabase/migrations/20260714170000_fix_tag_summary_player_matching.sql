-- Tag summaries store only the short name used in the game log (e.g. "izzy"),
-- but metric_normalized_label(display_name) returns the full name
-- (e.g. "izzy hodnett"). The lateral join therefore never matched, leaving
-- game_player_tag_metric_snapshots empty for all existing games.
--
-- Fix: wrap the existing lateral in a UNION that also tries to resolve
-- the normalized_player_name through player_import_aliases (source_type =
-- 'game_log'), which always contains the short alias used during import.
-- The function signature and every other section are unchanged.

create or replace function public.refresh_game_metric_snapshots_internal(
  p_game_id uuid,
  p_require_editor boolean default true
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_game_status public.game_status;
begin
  if p_game_id is null then
    raise exception 'game id is required'
      using errcode = '22004';
  end if;

  if p_require_editor and not public.can_edit_game(p_game_id) then
    raise exception 'not authorized to refresh metric snapshots for game %', p_game_id
      using errcode = '42501';
  end if;

  select g.status
  into v_game_status
  from public.games g
  where g.id = p_game_id
  for update;

  if not found then
    raise exception 'game % does not exist', p_game_id
      using errcode = 'P0002';
  end if;

  delete from public.game_player_tag_metric_snapshots where game_id = p_game_id;
  delete from public.game_milestone_metric_snapshots    where game_id = p_game_id;
  delete from public.game_award_metric_snapshots        where game_id = p_game_id;
  delete from public.game_player_metric_snapshots       where game_id = p_game_id;

  if v_game_status <> 'finalized' then
    perform public.rebuild_metric_summaries();
    return;
  end if;

  insert into public.game_player_metric_snapshots (
    game_id, game_player_id, group_id, player_id, map_id, corporation_id,
    player_count, generation_count, placement, is_winner, total_points,
    points_per_generation, normalized_efficiency, expected_score,
    score_delta_vs_expected, cities_points_per_generation,
    greenery_points_per_generation, card_points_per_generation,
    tr_points_per_generation, milestone_points_per_generation,
    award_points_per_generation, card_points_per_played_card,
    played_card_count, matched_played_card_count, unresolved_played_card_count,
    total_tag_count, tr_score_share, card_score_share, cities_score_share,
    greenery_score_share, milestone_score_share, award_score_share,
    win_margin_points, loss_gap_points, close_game
  )
  with target_players as (
    select
      g.id as game_id,
      g.group_id,
      g.map_id,
      g.player_count,
      g.generation_count,
      gp.id as game_player_id,
      gp.player_id,
      gp.corporation_id,
      gp.placement,
      gp.is_winner,
      gp.total_points,
      gp.cities_points,
      gp.greenery_points,
      gp.card_points_total,
      gp.tr_points,
      gp.milestone_points,
      gp.award_points
    from public.games g
    join public.game_players gp on gp.game_id = g.id
    where g.id = p_game_id
      and g.status = 'finalized'
  ),
  score_totals as (
    select game_id, sum(total_points) as total, avg(total_points) as average, max(total_points) as maximum
    from public.game_players where game_id = p_game_id group by game_id
  ),
  tag_summary_matches as (
    select
      coalesce(glts.game_player_id, resolved_player.game_player_id) as game_player_id,
      glts.game_log_import_id,
      glts.played_card_count,
      glts.matched_card_count,
      glts.unresolved_card_count,
      glts.total_tag_count
    from public.game_log_imports gli
    join public.game_log_tag_summaries glts on glts.game_log_import_id = gli.id
    left join lateral (
      select gp_resolved.id as game_player_id
      from public.game_players gp_resolved
      join public.players p_resolved on p_resolved.id = gp_resolved.player_id
      where gp_resolved.game_id = gli.game_id
        and (
          public.metric_normalized_label(p_resolved.display_name) = glts.normalized_player_name
          or exists (
            select 1 from public.player_import_aliases pia
            where pia.player_id = p_resolved.id
              and pia.source_type = 'game_log'
              and pia.normalized_alias = glts.normalized_player_name
          )
        )
      order by gp_resolved.id
      limit 1
    ) resolved_player on glts.game_player_id is null
    where gli.game_id = p_game_id
  ),
  player_tag_rollups as (
    select
      import_rollups.game_player_id,
      sum(import_rollups.played_card_count)::integer        as played_card_count,
      sum(import_rollups.matched_card_count)::integer       as matched_played_card_count,
      sum(import_rollups.unresolved_card_count)::integer    as unresolved_played_card_count,
      sum(import_rollups.total_tag_count)::integer          as total_tag_count,
      round(
        sum(import_rollups.matched_card_count)::numeric
          / nullif(sum(import_rollups.played_card_count), 0),
        4
      ) as tag_evidence_coverage
    from (
      select
        tag_summary_matches.game_player_id,
        tag_summary_matches.game_log_import_id,
        max(tag_summary_matches.played_card_count)        as played_card_count,
        max(tag_summary_matches.matched_card_count)       as matched_card_count,
        max(tag_summary_matches.unresolved_card_count)    as unresolved_card_count,
        max(tag_summary_matches.total_tag_count)          as total_tag_count
      from tag_summary_matches
      where tag_summary_matches.game_player_id is not null
      group by tag_summary_matches.game_player_id, tag_summary_matches.game_log_import_id
    ) import_rollups
    group by import_rollups.game_player_id
  )
  select
    tp.game_id,
    tp.game_player_id,
    tp.group_id,
    tp.player_id,
    tp.map_id,
    tp.corporation_id,
    tp.player_count,
    tp.generation_count,
    tp.placement,
    tp.is_winner,
    tp.total_points,
    round(tp.total_points::numeric / nullif(tp.generation_count, 0), 4),
    round(tp.total_points::numeric / nullif(st.maximum, 0), 4),
    round(st.average, 4),
    round(tp.total_points::numeric - st.average, 4),
    round(tp.cities_points::numeric    / nullif(tp.generation_count, 0), 4),
    round(tp.greenery_points::numeric  / nullif(tp.generation_count, 0), 4),
    round(tp.card_points_total::numeric / nullif(tp.generation_count, 0), 4),
    round(tp.tr_points::numeric        / nullif(tp.generation_count, 0), 4),
    round(tp.milestone_points::numeric / nullif(tp.generation_count, 0), 4),
    round(tp.award_points::numeric     / nullif(tp.generation_count, 0), 4),
    round(tp.card_points_total::numeric / nullif(coalesce(ptr.played_card_count, 0), 0), 4),
    coalesce(ptr.played_card_count, 0),
    coalesce(ptr.matched_played_card_count, 0),
    coalesce(ptr.unresolved_played_card_count, 0),
    coalesce(ptr.total_tag_count, 0),
    round(tp.tr_points::numeric        / nullif(tp.total_points, 0), 4),
    round(tp.card_points_total::numeric / nullif(tp.total_points, 0), 4),
    round(tp.cities_points::numeric    / nullif(tp.total_points, 0), 4),
    round(tp.greenery_points::numeric  / nullif(tp.total_points, 0), 4),
    round(tp.milestone_points::numeric / nullif(tp.total_points, 0), 4),
    round(tp.award_points::numeric     / nullif(tp.total_points, 0), 4),
    greatest(tp.total_points - coalesce((
      select max(gp4.total_points) from public.game_players gp4
      where gp4.game_id = tp.game_id and gp4.id <> tp.game_player_id
    ), tp.total_points), 0),
    greatest(coalesce((
      select max(gp5.total_points) from public.game_players gp5
      where gp5.game_id = tp.game_id and gp5.id <> tp.game_player_id
    ), tp.total_points) - tp.total_points, 0),
    (select max(gp6.total_points) - min(gp6.total_points) from public.game_players gp6
     where gp6.game_id = tp.game_id) <= 10
  from target_players tp
  cross join score_totals st
  left join player_tag_rollups ptr on ptr.game_player_id = tp.game_player_id;

  -- game_player_tag_metric_snapshots
  insert into public.game_player_tag_metric_snapshots (
    game_id, game_player_id, group_id, player_id, tag_code, tag_count,
    tag_share, total_tag_count, played_card_count, matched_card_count,
    unresolved_card_count, tag_evidence_coverage, is_winner, total_points,
    points_per_generation
  )
  with tag_summary_matches as (
    select
      coalesce(glts.game_player_id, resolved_player.game_player_id) as game_player_id,
      glts.tag_code,
      glts.tag_count
    from public.game_log_imports gli
    join public.game_log_tag_summaries glts on glts.game_log_import_id = gli.id
    left join lateral (
      select gp_resolved.id as game_player_id
      from public.game_players gp_resolved
      join public.players p_resolved on p_resolved.id = gp_resolved.player_id
      where gp_resolved.game_id = gli.game_id
        and (
          public.metric_normalized_label(p_resolved.display_name) = glts.normalized_player_name
          or exists (
            select 1 from public.player_import_aliases pia
            where pia.player_id = p_resolved.id
              and pia.source_type = 'game_log'
              and pia.normalized_alias = glts.normalized_player_name
          )
        )
      order by gp_resolved.id
      limit 1
    ) resolved_player on glts.game_player_id is null
    where gli.game_id = p_game_id
  ),
  tag_counts as (
    select game_player_id, tag_code, sum(tag_count)::integer as tag_count
    from tag_summary_matches
    where game_player_id is not null
    group by game_player_id, tag_code
  ),
  player_tag_rollups as (
    select
      import_rollups.game_player_id,
      sum(import_rollups.played_card_count)::integer        as played_card_count,
      sum(import_rollups.matched_card_count)::integer       as matched_card_count,
      sum(import_rollups.unresolved_card_count)::integer    as unresolved_card_count,
      sum(import_rollups.total_tag_count)::integer          as total_tag_count,
      round(
        sum(import_rollups.matched_card_count)::numeric
          / nullif(sum(import_rollups.played_card_count), 0),
        4
      ) as tag_evidence_coverage
    from (
      select
        coalesce(glts2.game_player_id, rp2.game_player_id) as game_player_id,
        gli2.id as game_log_import_id,
        max(glts2.played_card_count)     as played_card_count,
        max(glts2.matched_card_count)    as matched_card_count,
        max(glts2.unresolved_card_count) as unresolved_card_count,
        max(glts2.total_tag_count)       as total_tag_count
      from public.game_log_imports gli2
      join public.game_log_tag_summaries glts2 on glts2.game_log_import_id = gli2.id
      left join lateral (
        select gp_r.id as game_player_id
        from public.game_players gp_r
        join public.players p_r on p_r.id = gp_r.player_id
        where gp_r.game_id = gli2.game_id
          and (
            public.metric_normalized_label(p_r.display_name) = glts2.normalized_player_name
            or exists (
              select 1 from public.player_import_aliases pia2
              where pia2.player_id = p_r.id
                and pia2.source_type = 'game_log'
                and pia2.normalized_alias = glts2.normalized_player_name
            )
          )
        order by gp_r.id limit 1
      ) rp2 on glts2.game_player_id is null
      where gli2.game_id = p_game_id
        and coalesce(glts2.game_player_id, rp2.game_player_id) is not null
      group by coalesce(glts2.game_player_id, rp2.game_player_id), gli2.id
    ) import_rollups
    group by import_rollups.game_player_id
  )
  select
    gps.game_id,
    gps.game_player_id,
    gps.group_id,
    gps.player_id,
    tag_counts.tag_code,
    tag_counts.tag_count,
    coalesce(round(tag_counts.tag_count::numeric / nullif(player_tag_rollups.total_tag_count, 0), 4), 0),
    player_tag_rollups.total_tag_count,
    coalesce(player_tag_rollups.played_card_count, 0),
    coalesce(player_tag_rollups.matched_card_count, 0),
    coalesce(player_tag_rollups.unresolved_card_count, 0),
    coalesce(player_tag_rollups.tag_evidence_coverage, 0),
    gps.is_winner,
    gps.total_points,
    gps.points_per_generation
  from tag_counts
  join public.game_player_metric_snapshots gps on gps.game_player_id = tag_counts.game_player_id
  join player_tag_rollups on player_tag_rollups.game_player_id = tag_counts.game_player_id
  where gps.game_id = p_game_id
    and tag_counts.tag_code is not null;

  -- game_milestone_metric_snapshots
  insert into public.game_milestone_metric_snapshots (
    game_id, game_milestone_id, group_id, map_id, milestone_id,
    winner_game_player_id, winner_player_id, winner_final_placement,
    winner_total_points, winner_points_per_generation, winner_won_game,
    claimed_generation_number, claimed_timing_bucket, player_count, generation_count
  )
  select
    gm.game_id,
    gm.id,
    gps.group_id,
    gps.map_id,
    gm.milestone_id,
    gm.winner_game_player_id,
    gps.player_id,
    gps.placement,
    gps.total_points,
    gps.points_per_generation,
    gps.is_winner,
    milestone_event.claimed_generation_number,
    public.metric_timing_bucket(milestone_event.claimed_generation_number, gps.generation_count),
    gps.player_count,
    gps.generation_count
  from public.game_milestones gm
  join public.game_player_metric_snapshots gps on gps.game_player_id = gm.winner_game_player_id
  join public.milestones m on m.id = gm.milestone_id
  left join lateral (
    select null::integer as claimed_generation_number
  ) milestone_event on true
  where gm.game_id = p_game_id;

  -- game_award_metric_snapshots
  insert into public.game_award_metric_snapshots (
    game_id, game_award_id, group_id, map_id, award_id, place,
    funded_by_game_player_id, funder_player_id, winner_game_player_id,
    winner_player_id, winner_final_placement, winner_total_points,
    winner_points_per_generation, winner_won_game, funder_final_placement,
    funder_won_game, funder_award_points, funder_award_roi,
    funded_generation_number, funded_timing_bucket, funder_got_first_place,
    funder_got_second_place, funder_missed_award, player_count, generation_count
  )
  select
    ga.game_id,
    ga.id,
    winner_snapshot.group_id,
    winner_snapshot.map_id,
    ga.award_id,
    ga.place,
    ga.funded_by_game_player_id,
    funder_snapshot.player_id,
    ga.winner_game_player_id,
    winner_snapshot.player_id,
    winner_snapshot.placement,
    winner_snapshot.total_points,
    winner_snapshot.points_per_generation,
    winner_snapshot.is_winner,
    funder_snapshot.placement,
    funder_snapshot.is_winner,
    case
      when ga.funded_by_game_player_id = ga.winner_game_player_id and ga.place = 1 then 5
      when ga.funded_by_game_player_id = ga.winner_game_player_id and ga.place = 2 then 2
      else 0
    end,
    case
      when ga.funded_by_game_player_id = ga.winner_game_player_id and ga.place = 1 then 5
      when ga.funded_by_game_player_id = ga.winner_game_player_id and ga.place = 2 then 2
      else 0
    end - 8,
    award_event.funded_generation_number,
    public.metric_timing_bucket(award_event.funded_generation_number, winner_snapshot.generation_count),
    ga.funded_by_game_player_id = ga.winner_game_player_id and ga.place = 1,
    ga.funded_by_game_player_id = ga.winner_game_player_id and ga.place = 2,
    ga.funded_by_game_player_id <> ga.winner_game_player_id,
    winner_snapshot.player_count,
    winner_snapshot.generation_count
  from public.game_awards ga
  join public.game_player_metric_snapshots winner_snapshot
    on winner_snapshot.game_player_id = ga.winner_game_player_id
  join public.game_player_metric_snapshots funder_snapshot
    on funder_snapshot.game_player_id = ga.funded_by_game_player_id
  join public.awards a on a.id = ga.award_id
  left join lateral (
    select null::integer as funded_generation_number
  ) award_event on true
  where ga.game_id = p_game_id;

  perform public.rebuild_metric_summaries();
end;
$function$;

revoke all on function public.refresh_game_metric_snapshots_internal(uuid, boolean) from public;
grant execute on function public.refresh_game_metric_snapshots_internal(uuid, boolean) to authenticated;
