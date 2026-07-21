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
--
-- Execution-strategy correction (this round): every game selected above is
-- refreshed via a call to refresh_game_metric_snapshots_internal(), which is
-- correct and remains entirely unmodified below — but that function
-- unconditionally calls rebuild_metric_summaries() itself at the end of
-- every invocation (read directly from its live definition via
-- pg_get_functiondef, not assumed), on both the finalized and the early-
-- return non-finalized code paths. rebuild_metric_summaries() in turn
-- unconditionally deletes and reinserts every row of player_metric_summaries,
-- player_map_metric_summaries, and eight global_* summary tables on every
-- single call, for every group, not just rows relevant to one game (also
-- read directly from its live definition). Calling that function once per
-- target game inside the loop below, on top of this migration's own explicit
-- rebuild afterward, meant one implicit full global rebuild per game plus
-- one final explicit one — correct in outcome, but dozens of complete global
-- rebuilds in a single migration at the current inventory size, which is far
-- more write volume and lock time than this correction needs. This was not
-- caught earlier because the harness's previous stub recorded a rebuild call
-- without modeling that refresh_game_metric_snapshots_internal triggers one
-- internally on every call too, so the harness could not distinguish "one
-- rebuild" from "one rebuild per game." See Step 2 below for the fix: an
-- exactly-once rebuild, regardless of how many games this migration touches,
-- via a migration-scoped neutralize/restore of rebuild_metric_summaries()
-- that leaves its committed definition byte-identical to today's — no
-- permanent change to any function's signature, ACL, owner, or behavior for
-- any caller other than this migration's own transaction.
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
  --
  -- rebuild_metric_summaries() is temporarily neutralized to a no-op for the
  -- duration of the loop below, so refresh_game_metric_snapshots_internal's
  -- own internal call to it does no work on every iteration, then restored
  -- to its exact real body (reproduced verbatim from the live definition
  -- read for this correction) before Step 3's single real call. Neither
  -- refresh_game_metric_snapshots_internal (its existing two-argument
  -- contract, callers, and authorization behavior) nor
  -- rebuild_metric_summaries_base() / rebuild_additional_metric_summaries()
  -- (the functions the real body delegates to) are modified in any way —
  -- only rebuild_metric_summaries()'s body is touched, and only transiently.
  --
  -- If anything below raises before the restore step runs (including a
  -- failure inside the loop), the whole migration transaction rolls back,
  -- which undoes the neutralization along with every other write here —
  -- CREATE OR REPLACE FUNCTION is ordinary transactional DDL, so there is no
  -- separate cleanup path that can be skipped or get out of sync. On
  -- success, the restore runs before Step 3, so by the time this transaction
  -- commits, rebuild_metric_summaries()'s definition, owner, SECURITY
  -- DEFINER status, search_path, and EXECUTE grants are all back to exactly
  -- what they were before this migration ran — this migration leaves no
  -- permanent trace on that function. Its EXECUTE grant today is owner-only
  -- (`{postgres=X/postgres}` — no authenticated, no anon, no PUBLIC),
  -- confirmed by reading pg_proc.proacl directly; CREATE OR REPLACE FUNCTION
  -- on an existing function preserves its ACL whenever the argument list is
  -- unchanged, which it is here (zero arguments throughout), so neither
  -- redefinition below needs to touch any GRANT for that reason alone — the
  -- explicit REVOKE after the restore is defense-in-depth, not a response to
  -- any ACL change this migration makes.
  --
  -- EXECUTE (dynamic SQL) is required for both redefinitions solely because
  -- PL/pgSQL cannot run CREATE OR REPLACE FUNCTION as a direct statement
  -- inside a DO block — there is no non-dynamic way to do this from inside a
  -- single top-level statement. Every EXECUTE below runs a fully static,
  -- hardcoded command string with no interpolated or concatenated values of
  -- any kind (not even the game ids from Step 1), so there is no injection
  -- surface. Keeping the whole migration as one top-level statement (as it
  -- already was before this correction) is deliberate: it guarantees the
  -- migration is atomic under plain autocommit-per-statement execution,
  -- without depending on the migration runner wrapping the file in its own
  -- transaction.
  if v_target_game_ids is not null then
    execute $exec_neutralize$
      create or replace function public.rebuild_metric_summaries()
      returns void
      language plpgsql
      security definer
      set search_path to ''
      as $neutralize_body$
      begin
        -- Migration-scoped no-op (20260720223000): temporarily disables the
        -- global-aggregate rebuild that refresh_game_metric_snapshots_internal
        -- triggers internally, so the per-game loop this correction runs
        -- does not perform one full rebuild per game. Restored to its real
        -- body, verbatim, before this migration's own single explicit
        -- rebuild call. If you are reading this as the function's live,
        -- committed definition outside of that migration's own transaction,
        -- something has gone wrong -- this body must never survive a commit.
        null;
      end;
      $neutralize_body$;
    $exec_neutralize$;

    foreach v_game_id in array v_target_game_ids loop
      perform public.refresh_game_metric_snapshots_internal(v_game_id, false);
    end loop;

    -- Restore rebuild_metric_summaries() to its real, production body,
    -- verbatim (reproduced from pg_get_functiondef() read for this
    -- correction), before Step 3's single real rebuild call.
    execute $exec_restore$
      create or replace function public.rebuild_metric_summaries()
      returns void
      language plpgsql
      security definer
      set search_path to ''
      as $restore_body$
      begin
        if to_regprocedure('public.rebuild_metric_summaries_base()') is null then
          raise exception 'rebuild_metric_summaries_base() is required before rebuilding metric summaries'
            using errcode = '42883';
        end if;

        perform public.rebuild_metric_summaries_base();
        perform public.rebuild_additional_metric_summaries();
      end;
      $restore_body$;
    $exec_restore$;

    -- Defense-in-depth, not a response to any ACL change made above (see
    -- the comment block before Step 2): rebuild_metric_summaries() already
    -- has no PUBLIC/anon/authenticated grant, and CREATE OR REPLACE on an
    -- unchanged zero-argument signature preserves whatever ACL already
    -- existed, so this is expected to be a no-op in every environment where
    -- it runs.
    execute $exec_restore_acl$
      revoke all on function public.rebuild_metric_summaries() from public, anon
    $exec_restore_acl$;

    -- Step 3: rebuild the global/player aggregate tables (best_tag_lane,
    -- global_tag_metric_summaries, etc.) from the now-corrected per-game
    -- snapshots. Runs exactly once for the whole migration, regardless of
    -- how many games were refreshed above -- not once per game -- because
    -- rebuild_metric_summaries() has just been restored to its real body,
    -- and every call to it during the loop above was neutralized.
    perform public.rebuild_metric_summaries();
  end if;
end;
$$;
