-- Re-stale Game B (game_player 2) and add a "poison" Game (prefix 5) whose
-- refresh will deliberately throw, to prove that a failure partway through
-- the FOREACH loop rolls back every write the migration's single DO block
-- made in that run -- including Game B's, even if Game B happens to be
-- processed before the poison game -- AND that rebuild_metric_summaries()
-- ends the run back in its real, restored, production-matching form (not
-- left neutralized) precisely because the whole transaction, including the
-- neutralize step, rolls back too.

update public.game_player_metric_snapshots
set total_tag_count = 2, updated_at = '2026-07-01 00:00:00+00'
where game_id = 'c0000000-0000-0000-0000-000000000002';

update public.game_player_tag_metric_snapshots
set tag_count = 1, updated_at = '2026-07-01 00:00:00+00'
where game_id = 'c0000000-0000-0000-0000-000000000002'
  and tag_code = 'event';

insert into public.players (id, group_id, display_name, normalized_display_name) values
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000000', 'Poison Player', 'poison player');

insert into public.games (id, group_id, status) values
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000000', 'finalized');

insert into public.game_players (id, game_id, player_id, placement, is_winner, total_points) values
  ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005', 1, true, 50);

insert into public.game_log_imports (id, game_id) values
  ('e0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005');

insert into public.game_log_tag_summaries (
  game_log_import_id, game_player_id, player_name, normalized_player_name,
  tag_code, tag_count, played_card_count, matched_card_count,
  unresolved_card_count, total_tag_count
) values
  ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', 'Poison Player', 'poison player', 'event', 3, 1, 1, 0, 3);

insert into public.game_player_metric_snapshots (
  game_id, game_player_id, group_id, player_id, total_tag_count,
  played_card_count, matched_played_card_count, unresolved_played_card_count,
  created_at, updated_at
) values
  ('c0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000005', 0, 1, 1, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00');
-- No matching event snapshot row -> definitely a target (root=3, snapshot
-- absent -> coalesced 0, mismatch).

-- Make the refresh stub throw specifically for the poison game. Otherwise
-- identical to the real 01-schema-and-stubs.sql stub (four-table delete/
-- insert, unconditional rebuild_metric_summaries() call on both exit
-- paths) -- kept in sync by hand since this is a deliberately separate,
-- narrowly-scoped copy for the failure-injection scenario only.
create or replace function public.refresh_game_metric_snapshots_internal(
  p_game_id uuid,
  p_require_editor boolean default true
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_status text;
begin
  if p_game_id = 'c0000000-0000-0000-0000-000000000005' then
    raise exception 'simulated refresh failure for poison game %', p_game_id;
  end if;

  if p_game_id is null then
    raise exception 'game id is required';
  end if;

  select status into v_status from public.games where id = p_game_id;

  if v_status is null then
    raise exception 'game % does not exist', p_game_id;
  end if;

  delete from public.game_player_tag_metric_snapshots where game_id = p_game_id;
  delete from public.game_milestone_metric_snapshots    where game_id = p_game_id;
  delete from public.game_award_metric_snapshots        where game_id = p_game_id;
  delete from public.game_player_metric_snapshots       where game_id = p_game_id;

  if v_status <> 'finalized' then
    perform public.rebuild_metric_summaries();
    return;
  end if;

  with tag_summary_matches as (
    select
      coalesce(glts.game_player_id, resolved_player.game_player_id) as game_player_id,
      glts.tag_code,
      glts.tag_count,
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
      sum(import_rollups.played_card_count)::integer as played_card_count,
      sum(import_rollups.matched_card_count)::integer as matched_card_count,
      sum(import_rollups.unresolved_card_count)::integer as unresolved_card_count,
      sum(import_rollups.total_tag_count)::integer as total_tag_count
    from (
      select
        game_player_id,
        game_log_import_id,
        max(played_card_count) as played_card_count,
        max(matched_card_count) as matched_card_count,
        max(unresolved_card_count) as unresolved_card_count,
        max(total_tag_count) as total_tag_count
      from tag_summary_matches
      where game_player_id is not null
      group by game_player_id, game_log_import_id
    ) import_rollups
    group by import_rollups.game_player_id
  )
  insert into public.game_player_metric_snapshots (
    game_id, game_player_id, group_id, player_id, total_tag_count,
    played_card_count, matched_played_card_count, unresolved_played_card_count
  )
  select
    p_game_id,
    gp.id,
    p.group_id,
    p.id,
    coalesce(ptr.total_tag_count, 0),
    coalesce(ptr.played_card_count, 0),
    coalesce(ptr.matched_card_count, 0),
    coalesce(ptr.unresolved_card_count, 0)
  from public.game_players gp
  join public.players p on p.id = gp.player_id
  left join player_tag_rollups ptr on ptr.game_player_id = gp.id
  where gp.game_id = p_game_id;

  with tag_summary_matches as (
    select
      coalesce(glts.game_player_id, resolved_player.game_player_id) as game_player_id,
      glts.tag_code,
      glts.tag_count,
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
  tag_counts as (
    select game_player_id, tag_code, sum(tag_count)::integer as tag_count
    from tag_summary_matches
    where game_player_id is not null
    group by game_player_id, tag_code
  ),
  player_tag_rollups as (
    select
      import_rollups.game_player_id,
      sum(import_rollups.played_card_count)::integer as played_card_count,
      sum(import_rollups.matched_card_count)::integer as matched_card_count,
      sum(import_rollups.unresolved_card_count)::integer as unresolved_card_count,
      sum(import_rollups.total_tag_count)::integer as total_tag_count
    from (
      select
        game_player_id,
        game_log_import_id,
        max(played_card_count) as played_card_count,
        max(matched_card_count) as matched_card_count,
        max(unresolved_card_count) as unresolved_card_count,
        max(total_tag_count) as total_tag_count
      from tag_summary_matches
      where game_player_id is not null
      group by game_player_id, game_log_import_id
    ) import_rollups
    group by import_rollups.game_player_id
  )
  insert into public.game_player_tag_metric_snapshots (
    game_id, game_player_id, group_id, player_id, tag_code, tag_count,
    total_tag_count, played_card_count, matched_card_count, unresolved_card_count
  )
  select
    p_game_id,
    gps.game_player_id,
    gps.group_id,
    gps.player_id,
    tag_counts.tag_code,
    tag_counts.tag_count,
    coalesce(player_tag_rollups.total_tag_count, 0),
    coalesce(player_tag_rollups.played_card_count, 0),
    coalesce(player_tag_rollups.matched_card_count, 0),
    coalesce(player_tag_rollups.unresolved_card_count, 0)
  from tag_counts
  join public.game_player_metric_snapshots gps on gps.game_player_id = tag_counts.game_player_id
  left join player_tag_rollups on player_tag_rollups.game_player_id = tag_counts.game_player_id
  where gps.game_id = p_game_id;

  insert into public.game_milestone_metric_snapshots (
    game_id, game_milestone_id, group_id, milestone_id, winner_game_player_id
  )
  select gm.game_id, gm.id, g.group_id, gm.milestone_id, gm.winner_game_player_id
  from public.game_milestones gm
  join public.games g on g.id = gm.game_id
  where gm.game_id = p_game_id;

  insert into public.game_award_metric_snapshots (
    game_id, game_award_id, group_id, award_id, funded_by_game_player_id, winner_game_player_id
  )
  select ga.game_id, ga.id, g.group_id, ga.award_id, ga.funded_by_game_player_id, ga.winner_game_player_id
  from public.game_awards ga
  join public.games g on g.id = ga.game_id
  where ga.game_id = p_game_id;

  perform public.rebuild_metric_summaries();
end;
$$;
