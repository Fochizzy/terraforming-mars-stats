-- Historical correction: an Event card's tags — including the synthetic
-- `event` tag itself — must never count toward any tag total (see
-- countableCardTags / derivePlayerTagSummaries / deriveCardScoreEvidence).
-- The prior import-time bug counted exactly one `event` tag per played Event
-- card instead of zero tags. This migration refreshes already-persisted
-- snapshot rows so existing games agree with the corrected code.
--
-- Root-level (`game_log_tag_summaries`) is NOT touched here. An earlier
-- version of this migration also zeroed any `tag_code = 'event'` root row
-- directly, using `tag_code = 'event'` alone as the "this was an Event play"
-- signal. That is not the actual contract: a recognized non-Event card can
-- legitimately carry a literal `event` gameplay tag (see
-- `countable-card-tags.test.ts` — "decides on canonical card type rather
-- than tag-code presence"), so a tag-code-only predicate can zero evidence
-- the corrected code would have kept. `game_log_tag_summaries` is written
-- once, per import, directly from the corrected derivation, so it does not
-- need a defensive SQL-level rewrite; if a stray bad row is ever found there,
-- the safe correction is a card-type-aware rederivation
-- (`scripts/backfill/recompute-tag-summaries.ts`, which reuses
-- `derivePlayerTagSummaries` against current catalog `card_type` data), not
-- a blanket zero on a tag-code proxy.
--
-- Target selection is the union of two independent staleness signals:
--   (a) a persisted `game_player_tag_metric_snapshots` row still shows a
--       nonzero `event` tag_count that root no longer supports;
--   (b) a player's persisted `game_player_metric_snapshots.total_tag_count`
--       no longer matches what a fresh refresh would currently compute from
--       root — using the exact identity resolution
--       `refresh_game_metric_snapshots_internal` itself uses (root's own
--       `game_player_id` when populated, name/alias resolution as fallback
--       when it isn't), copied read-only for comparison so this can never
--       select a different player than the refresh would actually credit.
-- (b) exists because a stale total_tag_count is not guaranteed to coincide
-- with a currently-nonzero `event` snapshot row — e.g. if some earlier,
-- unrelated process already zeroed a snapshot's `event` row without
-- recomputing its sibling `total_tag_count`. Neither signal inspects or
-- assumes anything about *why* root and the snapshot disagree; both simply
-- ask "would a refresh change this game's data," which is exactly the
-- condition a snapshot-refresh migration should target.
--
-- Repeat-safe: every step is guarded by a row-count/array check, so a second
-- run over an already-corrected database performs zero writes. Narrowly
-- scoped: only games matching (a) or (b) above are touched, and only through
-- the existing, unmodified `refresh_game_metric_snapshots_internal` /
-- `rebuild_metric_summaries` functions (added in
-- 20260708142459_add_persisted_metric_snapshots.sql) — this migration
-- authors no tag-derivation *write* logic of its own, so the actual
-- correction cannot drift from the canonical computation. `game_log_tag_summaries`
-- itself (root) is read, never written, by this migration — including by the
-- read-only identity-resolution copy used for target selection below.
do $$
declare
  v_target_game_ids uuid[];
  v_game_id uuid;
begin
  -- Step 1: find every game whose persisted metric snapshots are stale with
  -- respect to root data.
  with root_player_totals as (
    -- Read-only copy of refresh_game_metric_snapshots_internal's own
    -- tag_summary_matches identity resolution, scoped to comparison rather
    -- than insertion. Not applied across all games in production today
    -- (this migration is unapplied); computed here as part of the guarded
    -- target-selection step only.
    select
      coalesce(glts.game_player_id, resolved_player.game_player_id) as game_player_id,
      glts.game_log_import_id,
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
  ),
  root_player_totals_rolled_up as (
    -- Mirrors player_tag_rollups: max() per import (total_tag_count is
    -- already denormalized identically across an import's tag_code rows),
    -- summed across a player's imports for one game.
    select
      game_player_id,
      sum(per_import_total)::integer as fresh_total_tag_count
    from (
      select
        game_player_id,
        game_log_import_id,
        max(total_tag_count) as per_import_total
      from root_player_totals
      where game_player_id is not null
      group by game_player_id, game_log_import_id
    ) per_import
    group by game_player_id
  )
  select array_agg(distinct affected.game_id)
  into v_target_game_ids
  from (
    -- Signal (a): stale nonzero Event-tag snapshot row.
    select gpts.game_id
    from public.game_player_tag_metric_snapshots gpts
    where gpts.tag_code = 'event'
      and gpts.tag_count <> 0

    union

    -- Signal (b): persisted total_tag_count disagrees with a fresh
    -- recomputation from root, at the game_player_id grain — independent of
    -- whether the event-specific snapshot row currently looks wrong.
    select gps.game_id
    from public.game_player_metric_snapshots gps
    join root_player_totals_rolled_up rollup
      on rollup.game_player_id = gps.game_player_id
    where gps.total_tag_count <> rollup.fresh_total_tag_count
  ) affected;

  -- Step 2: refresh each affected game's snapshots from current source data
  -- via the existing, unmodified refresh function. p_require_editor is
  -- false because this runs administratively, not as an authenticated edit.
  if v_target_game_ids is not null then
    foreach v_game_id in array v_target_game_ids loop
      perform public.refresh_game_metric_snapshots_internal(v_game_id, false);
    end loop;

    -- Step 3: rebuild the global/player aggregate tables (best_tag_lane,
    -- global_tag_metric_summaries, etc.) from the now-corrected per-game
    -- snapshots. Only runs when at least one game was actually touched.
    perform public.rebuild_metric_summaries();
  end if;
end;
$$;
