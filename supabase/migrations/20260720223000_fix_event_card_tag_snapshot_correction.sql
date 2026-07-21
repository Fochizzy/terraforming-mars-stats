-- Historical correction: an Event card's tags — including the synthetic
-- `event` tag itself — must never count toward any tag total (see
-- countableCardTags / derivePlayerTagSummaries / deriveCardScoreEvidence).
-- The prior import-time bug counted exactly one `event` tag per played Event
-- card instead of zero tags. This migration refreshes already-persisted
-- snapshot rows so existing games agree with the corrected code.
--
-- Root-level (`game_log_tag_summaries`) is NOT touched here. An earlier
-- version of this migration zeroed any `tag_code = 'event'` root row
-- directly, using `tag_code = 'event'` alone as the "this was an Event play"
-- signal. That step was removed: it is not the actual contract — a
-- recognized non-Event card can legitimately carry a literal `event`
-- gameplay tag and keep it (see `countable-card-tags.test.ts`, "decides on
-- canonical card type rather than tag-code presence"). If a stray bad root
-- row is ever found, the safe correction is a card-type-aware rederivation
-- via `scripts/backfill/recompute-tag-summaries.ts`, not a blanket zero on
-- a tag-code proxy.
--
-- A subsequent draft of the *snapshot* targeting itself repeated the same
-- mistake one level up: it selected any `game_player_tag_metric_snapshots`
-- row with `tag_code = 'event' and tag_count <> 0`, again treating a nonzero
-- count as proof of staleness rather than comparing it against root. A
-- legitimate nonzero Event-tag snapshot (root and snapshot agreeing, both
-- nonzero) was therefore selected and rewritten on every single run — not
-- wrong-valued, but genuinely not repeat-safe, and not narrowly scoped.
-- That version also inner-joined snapshot rows to a root rollup, which
-- silently drops any player whose root-derived expected total is zero
-- because they have no root tag rows at all (an absent root row is not the
-- same as "nothing to compare" — it is evidence the expected value is zero).
--
-- Both are corrected below: every comparison is root-value versus
-- snapshot-value, over the union of every game_player_id either side has
-- evidence for, with `coalesce(..., 0)` on both sides so an absent row on
-- either side compares as zero rather than being dropped or crashing on
-- null. A merely nonzero value, on its own, is never sufficient evidence of
-- staleness.
do $$
declare
  v_target_game_ids uuid[];
  v_game_id uuid;
begin
  -- Step 1: find every game whose persisted metric snapshots are stale with
  -- respect to root data.
  with root_resolved as (
    -- Read-only copy of refresh_game_metric_snapshots_internal's own
    -- tag_summary_matches identity resolution (root's own game_player_id
    -- when populated, name/alias resolution as fallback when it isn't),
    -- scanning every game at once rather than one game at a time — target
    -- selection needs to consider every game, unlike the refresh function
    -- itself, which is parameterized per game.
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
  -- Root-derived expected `event` tag_count per game_player_id. Absent from
  -- this CTE entirely (not a zero row) when root has no `event` row for that
  -- player at all — handled by coalescing to 0 at comparison time below, not
  -- here, so "no root row" and "root row with tag_count=0" are treated
  -- identically, as they should be.
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
  -- Root-derived expected total_tag_count per game_player_id (sum across a
  -- player's imports of root's own per-import total_tag_count column,
  -- de-duplicated per import via max() since it is denormalized identically
  -- across that import's tag_code rows).
  root_player_totals as (
    select game_player_id, sum(per_import_total)::integer as expected_total_tag_count
    from (
      select game_player_id, game_log_import_id, max(total_tag_count) as per_import_total
      from root_resolved
      group by game_player_id, game_log_import_id
    ) per_import
    group by game_player_id
  ),
  -- Every game_player_id that either side of either comparison has ANY
  -- evidence about. A plain inner join between root and snapshot data would
  -- silently drop a game_player present on only one side — exactly the
  -- defect this rewrite fixes — so every source is unioned first and each
  -- comparison below left-joins against this complete set.
  all_game_player_ids as (
    select game_player_id from root_event_totals
    union
    select game_player_id from root_player_totals
    union
    select game_player_id from public.game_player_tag_metric_snapshots where tag_code = 'event'
    union
    select game_player_id from public.game_player_metric_snapshots
  ),
  -- Signal (a): the player's persisted `event` tag_count differs from what
  -- root currently supports — not merely "is nonzero". A legitimate
  -- nonzero-and-matching event tag (root=snapshot, both nonzero) does not
  -- appear here.
  event_signal as (
    select gpi.game_player_id
    from all_game_player_ids gpi
    left join root_event_totals ret on ret.game_player_id = gpi.game_player_id
    left join public.game_player_tag_metric_snapshots snap_event
      on snap_event.game_player_id = gpi.game_player_id
      and snap_event.tag_code = 'event'
    where coalesce(ret.expected_event_tag_count, 0) <> coalesce(snap_event.tag_count, 0)
  ),
  -- Signal (b): the player's persisted total_tag_count differs from a fresh
  -- recomputation from root — independent of whether the event-specific row
  -- looks wrong. Zero-aware: a player with zero root tag rows at all has an
  -- expected total of 0, not "no opinion".
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
