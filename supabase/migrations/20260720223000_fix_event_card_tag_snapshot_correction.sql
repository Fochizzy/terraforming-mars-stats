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
-- Repeat-safe: every step is guarded by a row-count/array check, so a second
-- run over an already-corrected database performs zero writes. Narrowly
-- scoped: only games with a stale `event` snapshot row are touched, and only
-- through the existing, unmodified `refresh_game_metric_snapshots_internal`
-- / `rebuild_metric_summaries` functions (added in
-- 20260708142459_add_persisted_metric_snapshots.sql) — this migration
-- authors no tag-derivation logic of its own, so the fix cannot drift from
-- the canonical computation. `game_log_tag_summaries` itself (root) is read,
-- never written, by this migration.
do $$
declare
  v_target_game_ids uuid[];
  v_game_id uuid;
begin
  -- Step 1: find every game whose persisted metric snapshots are stale with
  -- respect to root data — i.e. `game_player_tag_metric_snapshots` still
  -- carries a nonzero `event` tag_count that a fresh refresh from
  -- `game_log_tag_summaries` would no longer produce (the observed state of
  -- production as of this writing: 109 stale rows across 39 finalized
  -- games).
  select array_agg(distinct gpts.game_id)
  into v_target_game_ids
  from public.game_player_tag_metric_snapshots gpts
  where gpts.tag_code = 'event'
    and gpts.tag_count <> 0;

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
