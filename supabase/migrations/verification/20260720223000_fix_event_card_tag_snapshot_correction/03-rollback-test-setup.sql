-- Re-stale Game B (undo the first pass's correction) and add a "poison"
-- Game E whose refresh will deliberately throw, to prove that a failure
-- partway through the FOREACH loop rolls back every write the migration's
-- single DO block made in that run — including Game B's, even if Game B
-- happens to be processed before the poison game.

update public.game_player_metric_snapshots
set total_tag_count = 2, updated_at = '2026-07-01 00:00:00+00'
where game_id = 'b0000000-0000-0000-0000-000000000000';

update public.game_player_tag_metric_snapshots
set tag_count = 1, updated_at = '2026-07-01 00:00:00+00'
where game_id = 'b0000000-0000-0000-0000-000000000000'
  and tag_code = 'event';

insert into public.groups (id) values ('10000000-0000-0000-0000-000000000000')
  on conflict (id) do nothing;

insert into public.players (id, group_id, display_name, normalized_display_name) values
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000000', 'Poison Player', 'poison player')
  on conflict (id) do nothing;

insert into public.games (id, group_id, status) values
  ('e0000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000000', 'finalized');

insert into public.game_players (id, game_id, player_id, placement, is_winner, total_points) values
  ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000009', 1, true, 50);

insert into public.game_log_imports (id, game_id) values
  ('e0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000000');

insert into public.game_log_tag_summaries (
  game_log_import_id, game_player_id, player_name, normalized_player_name,
  tag_code, tag_count, played_card_count, matched_card_count,
  unresolved_card_count, total_tag_count
) values
  ('e0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'Poison Player', 'poison player', 'event', 0, 1, 1, 0, 0);

insert into public.game_player_metric_snapshots (
  game_id, game_player_id, group_id, player_id, total_tag_count,
  played_card_count, matched_played_card_count, unresolved_played_card_count,
  created_at, updated_at
) values
  ('e0000000-0000-0000-0000-000000000000', 'e0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000009', 1, 1, 1, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00');

insert into public.game_player_tag_metric_snapshots (
  game_id, game_player_id, group_id, player_id, tag_code, tag_count,
  total_tag_count, played_card_count, matched_card_count, unresolved_card_count,
  created_at, updated_at
) values
  ('e0000000-0000-0000-0000-000000000000', 'e0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000009', 'event', 1, 1, 1, 1, 0, '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00');

-- Make the refresh stub throw specifically for the poison game, simulating
-- an unexpected failure mid-loop (e.g. a constraint violation on a column
-- this simplified stub doesn't model).
create or replace function public.refresh_game_metric_snapshots_internal(
  p_game_id uuid,
  p_require_editor boolean default true
)
returns void
language plpgsql
as $$
begin
  if p_game_id = 'e0000000-0000-0000-0000-000000000000' then
    raise exception 'simulated refresh failure for poison game %', p_game_id;
  end if;

  delete from public.game_player_tag_metric_snapshots where game_id = p_game_id;

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
    gp.id,
    p.group_id,
    p.id,
    tag_counts.tag_code,
    tag_counts.tag_count,
    coalesce(player_tag_rollups.total_tag_count, 0),
    coalesce(player_tag_rollups.played_card_count, 0),
    coalesce(player_tag_rollups.matched_card_count, 0),
    coalesce(player_tag_rollups.unresolved_card_count, 0)
  from tag_counts
  join public.game_players gp on gp.id = tag_counts.game_player_id
  join public.players p on p.id = gp.player_id
  left join player_tag_rollups on player_tag_rollups.game_player_id = tag_counts.game_player_id;

  with tag_summary_matches as (
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
  update public.game_player_metric_snapshots gps
  set played_card_count = coalesce(ptr.played_card_count, 0),
      matched_played_card_count = coalesce(ptr.matched_card_count, 0),
      unresolved_played_card_count = coalesce(ptr.unresolved_card_count, 0),
      total_tag_count = coalesce(ptr.total_tag_count, 0),
      updated_at = now()
  from player_tag_rollups ptr
  where gps.game_player_id = ptr.game_player_id
    and gps.game_id = p_game_id;
end;
$$;
