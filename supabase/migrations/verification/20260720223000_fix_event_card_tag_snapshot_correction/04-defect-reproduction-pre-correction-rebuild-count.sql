-- Defect reproduction for THIS round's fix (rebuild-count bounding), not to
-- be confused with the target-predicate defect reproduction already
-- described in README.md ("Defect reproduction" section, closed in an
-- earlier round). This file reproduces the *pre-bounding* migration text --
-- identical target-selection logic (Step 1, unchanged across this round),
-- but the original Step 2/3 shape: a plain per-game loop with no
-- neutralize/restore of rebuild_metric_summaries(), followed by one
-- explicit call. Saved verbatim from the repository migration file as it
-- stood immediately before this round's correction (see git history of
-- 20260720223000_fix_event_card_tag_snapshot_correction.sql on this
-- branch's parent commit for the byte-identical original).
--
-- Run this against a freshly seeded fixture set (01 + 02, optionally 03) to
-- demonstrate the defect this round fixes: under the *previous* harness
-- (whose refresh_game_metric_snapshots_internal stub never called
-- rebuild_metric_summaries() internally at all), this exact text would have
-- shown only the one explicit rebuild call -- hiding the defect entirely.
-- Under the harness as corrected this round (refresh_game_metric_snapshots_
-- internal now calls rebuild_metric_summaries() on every invocation, and
-- rebuild_metric_summaries_base()/rebuild_additional_metric_summaries() are
-- real, separately markable functions), this same pre-bounding text
-- produces one marker row of each kind ('base', 'additional') PER TARGET
-- GAME plus one more of each from the final explicit call -- with the five
-- target games in the standard fixture set (B, C, G, H, I), that is 6 of
-- each kind, not 1.
do $$
declare
  v_target_game_ids uuid[];
  v_game_id uuid;
begin
  with root_resolved as (
    select
      coalesce(glts.game_player_id, resolved_player.game_player_id) as game_player_id,
      glts.game_log_import_id,
      glts.tag_code,
      glts.tag_count,
      glts.total_tag_count
    from public.game_log_tag_summaries glts
    join public.game_log_imports gli on gli.id = glts.game_log_import_id
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
    where coalesce(glts.game_player_id, resolved_player.game_player_id) is not null
  ),
  root_event_totals as (
    select game_player_id, sum(tag_count)::integer as expected_event_tag_count
    from (
      select game_player_id, game_log_import_id, max(tag_count) as tag_count
      from root_resolved
      where tag_code = 'event'
      group by game_player_id, game_log_import_id
    ) per_import
    group by game_player_id
  ),
  root_player_totals as (
    select game_player_id, sum(per_import_total)::integer as expected_total_tag_count
    from (
      select game_player_id, game_log_import_id, max(total_tag_count) as per_import_total
      from root_resolved
      group by game_player_id, game_log_import_id
    ) per_import
    group by game_player_id
  ),
  all_game_player_ids as (
    select game_player_id from root_event_totals
    union
    select game_player_id from root_player_totals
    union
    select game_player_id from public.game_player_tag_metric_snapshots where tag_code = 'event'
    union
    select game_player_id from public.game_player_metric_snapshots
  ),
  event_signal as (
    select gpi.game_player_id
    from all_game_player_ids gpi
    left join root_event_totals ret on ret.game_player_id = gpi.game_player_id
    left join public.game_player_tag_metric_snapshots snap_event
      on snap_event.game_player_id = gpi.game_player_id
      and snap_event.tag_code = 'event'
    where coalesce(ret.expected_event_tag_count, 0) <> coalesce(snap_event.tag_count, 0)
  ),
  total_signal as (
    select gpi.game_player_id
    from all_game_player_ids gpi
    left join root_player_totals rpt on rpt.game_player_id = gpi.game_player_id
    left join public.game_player_metric_snapshots snap_total
      on snap_total.game_player_id = gpi.game_player_id
    where coalesce(rpt.expected_total_tag_count, 0) <> coalesce(snap_total.total_tag_count, 0)
  ),
  target_game_players as (
    select game_player_id from event_signal
    union
    select game_player_id from total_signal
  )
  select array_agg(distinct gp.game_id)
  into v_target_game_ids
  from target_game_players tgp
  join public.game_players gp on gp.id = tgp.game_player_id;

  -- Pre-bounding shape: one implicit rebuild per game, plus one explicit
  -- rebuild -- exactly the defect this round's correction removes.
  if v_target_game_ids is not null then
    foreach v_game_id in array v_target_game_ids loop
      perform public.refresh_game_metric_snapshots_internal(v_game_id, false);
    end loop;

    perform public.rebuild_metric_summaries();
  end if;
end;
$$;
