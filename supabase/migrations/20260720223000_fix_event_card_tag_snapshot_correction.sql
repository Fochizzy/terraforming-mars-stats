-- Historical correction: an Event card's tags — including the synthetic
-- `event` tag itself — must never count toward any tag total (see
-- countableCardTags / derivePlayerTagSummaries / deriveCardScoreEvidence).
-- The prior import-time bug counted exactly one `event` tag per played Event
-- card instead of zero tags. This migration recomputes already-persisted
-- rows so existing games agree with the corrected code.
--
-- Repeat-safe: every step is guarded by a row-count/array check, so a
-- second run over an already-corrected database performs zero writes.
-- Narrowly scoped: only `game_log_tag_summaries.tag_code = 'event'` rows
-- ever have `tag_count` changed; sibling rows only ever have their
-- denormalized `total_tag_count` column recomputed, never `tag_code` or
-- `tag_count`. Card-play counts (`played_card_count`, `matched_card_count`,
-- `unresolved_card_count`) are never written by this migration.
--
-- Downstream propagation reuses the existing, unmodified
-- `refresh_game_metric_snapshots_internal` / `rebuild_metric_summaries`
-- functions (added in 20260708142459_add_persisted_metric_snapshots.sql)
-- rather than re-deriving their logic, so the fix cannot drift from the
-- canonical computation.
do $$
declare
  v_affected_import_ids uuid[];
  v_target_game_ids uuid[];
  v_game_id uuid;
begin
  -- Step 1: zero any root-level `event` tag_count rows. Defensive/forward
  -- looking — protects against imports made by the pre-fix code between now
  -- and deploy. As of writing, production already has zero such rows.
  with zeroed as (
    update public.game_log_tag_summaries
    set tag_count = 0,
        updated_at = now()
    where tag_code = 'event'
      and tag_count <> 0
    returning game_log_import_id
  )
  select array_agg(distinct game_log_import_id)
  into v_affected_import_ids
  from zeroed;

  -- Step 2: recompute the denormalized total_tag_count for every sibling row
  -- of an import actually touched in step 1. Scoped to only those imports so
  -- untouched imports are never written.
  if v_affected_import_ids is not null then
    with corrected_totals as (
      select
        game_log_import_id,
        normalized_player_name,
        coalesce(sum(tag_count) filter (where tag_code <> 'event'), 0) as corrected_total
      from public.game_log_tag_summaries
      where game_log_import_id = any(v_affected_import_ids)
      group by game_log_import_id, normalized_player_name
    )
    update public.game_log_tag_summaries glts
    set total_tag_count = corrected_totals.corrected_total,
        updated_at = now()
    from corrected_totals
    where glts.game_log_import_id = corrected_totals.game_log_import_id
      and glts.normalized_player_name = corrected_totals.normalized_player_name
      and glts.total_tag_count <> corrected_totals.corrected_total;
  end if;

  -- Step 3: find every game whose persisted metric snapshots are stale with
  -- respect to the (now-corrected) root data. This covers both:
  --   a) games touched by step 1 above, and
  --   b) games where game_log_tag_summaries was already clean but the
  --      derived game_player_tag_metric_snapshots row was never refreshed
  --      afterward (the observed state of production as of this writing:
  --      109 stale rows across 39 finalized games).
  select array_agg(distinct game_id)
  into v_target_game_ids
  from (
    select gli.game_id
    from public.game_log_imports gli
    where v_affected_import_ids is not null
      and gli.id = any(v_affected_import_ids)

    union

    select gpts.game_id
    from public.game_player_tag_metric_snapshots gpts
    where gpts.tag_code = 'event'
      and gpts.tag_count <> 0
  ) affected_games;

  -- Step 4: refresh each affected game's snapshots from current source data
  -- via the existing, unmodified refresh function. p_require_editor is
  -- false because this runs administratively, not as an authenticated edit.
  if v_target_game_ids is not null then
    foreach v_game_id in array v_target_game_ids loop
      perform public.refresh_game_metric_snapshots_internal(v_game_id, false);
    end loop;

    -- Step 5: rebuild the global/player aggregate tables (best_tag_lane,
    -- global_tag_metric_summaries, etc.) from the now-corrected per-game
    -- snapshots. Only runs when at least one game was actually touched.
    perform public.rebuild_metric_summaries();
  end if;
end;
$$;
