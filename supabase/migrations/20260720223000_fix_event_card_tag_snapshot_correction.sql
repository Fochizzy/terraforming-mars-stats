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
-- Execution-strategy correction (prior round): every game selected above is
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
-- more write volume and lock time than this correction needs. Fixed by an
-- exactly-once rebuild, regardless of how many games this migration touches,
-- via a migration-scoped neutralize/restore of rebuild_metric_summaries()
-- (Step 2 below) — no permanent change to any function's signature, ACL,
-- owner, or behavior for any caller other than this migration's own
-- transaction.
--
-- Exact-restoration correction (this round, independent review): the prior
-- round's restore step reproduced rebuild_metric_summaries()'s real body
-- inside an EXECUTE string that was itself nested inside this DO block's own
-- indentation, which added six spaces of stray leading whitespace to every
-- line of the restored body relative to the function's true, pre-migration
-- stored `prosrc` — confirmed against a disposable local copy of this exact
-- harness: pre-migration `pg_get_functiondef` was 513 bytes, the prior
-- round's post-migration result was 577 bytes, identical apart from that
-- indentation. Semantically inert (the extra whitespace is outside any
-- string literal in the function body, so behavior was unchanged), but it
-- defeated a simple pre/post `pg_get_functiondef` textual-equality check as
-- a drift guard, and the prior round's documentation and comments claimed
-- byte-identical restoration that the implementation did not actually
-- deliver. Fixed below by holding the exact expected body as a single
-- `constant text` literal (`v_expected_body`, declared once, with its own
-- indentation controlled independently of this DO block's nesting — every
-- line inside it starts at column zero, matching the real function's stored
-- `prosrc` exactly) and using `format(..., %L, v_expected_body)` to splice it
-- into the restore statement's `AS %L` clause. `%L` (`quote_literal`)
-- reproduces the variable's contents exactly as a SQL string literal — no
-- reformatting, re-indentation, or reliance on how this migration file's own
-- source happens to be laid out — so the function's stored `prosrc` after a
-- successful run is guaranteed textually identical to `v_expected_body`,
-- which is itself the same verbatim `pg_get_functiondef` read used
-- previously, not a hand-retyped or re-indented copy of it. The same
-- `v_expected_body` constant is also the comparison value the new fail-closed
-- guard below checks the *current* function against, so the guard's
-- "expected" and the restore's "actual new body" can never independently
-- drift from each other, even under a future edit.
--
-- Fail-closed identity guard (this round, independent review): the prior
-- round's migration hardcoded its belief about rebuild_metric_summaries()'s
-- current definition (to build the no-op and restore bodies) but never
-- actually checked, inside the migration transaction, that the live function
-- still matched that belief at the moment the migration runs. That is a
-- time-of-check/time-of-use gap: an external preflight read (this file's own
-- comments, and the correction-package doc) can go stale between review and
-- application if anything changes rebuild_metric_summaries() in the interim
-- — the migration would silently neutralize the changed function, run the
-- per-game loop against the old hardcoded copy's behavior, and permanently
-- restore that stale copy, discarding whatever changed it, with no error.
-- Step 1.5 below closes this gap by verifying, inside this same migration
-- transaction, immediately before the first `CREATE OR REPLACE FUNCTION` and
-- before any snapshot or summary write, that the function currently in place
-- is exactly what this migration was reviewed against: exact zero-argument
-- signature, full body (`prosrc`, compared to the same `v_expected_body` the
-- restore step uses), owner, language, `SECURITY DEFINER` status,
-- `search_path`, volatility, parallel-safety, strictness, leakproofness,
-- return type, ACL (owner-only — no PUBLIC, anon, authenticated, or
-- service_role EXECUTE grant), and comment state (this function is expected
-- to have none). Every check is evaluated and any failures are collected
-- before raising, so a mismatch report names every property that differs,
-- not just the first one found. On any mismatch, this raises an exception
-- immediately — before neutralizing anything, before refreshing any game,
-- before rebuilding any summary, before touching any ACL — so the single
-- top-level statement fails atomically and production is left completely
-- unmodified; the pre-existing (drifted) function is never touched, and this
-- migration's own hardcoded expected copy is never written over it. This
-- guard only runs when at least one game matched Step 1's target predicate
-- (i.e. inside the existing `if v_target_game_ids is not null` guard) — when
-- no game matches, Step 2/3 already did not touch
-- rebuild_metric_summaries() at all (no neutralize, no restore, no rebuild),
-- so there is nothing for an identity guard to protect and it does not run,
-- preserving that no-target no-op behavior exactly as it was.
--
-- This does not replace the external preflight in the correction-package
-- doc's §9 deployment order — re-confirming the target *inventory*
-- (which games/players match Step 1's predicate) immediately before
-- application remains necessary, since that is data-dependent and cannot be
-- baked into a guard. What this guard removes is reliance on that preflight
-- for the separate, narrower claim that rebuild_metric_summaries()'s
-- *definition* still matches what this migration's execution strategy was
-- reviewed against — that claim is now verified inside the migration's own
-- transaction, every time it runs.
--
-- Exact ACL identity correction (this round, second independent review):
-- the prior round's ACL check counted aclexplode() rows whose grantee
-- differed from the function owner and separately spot-checked
-- anon/authenticated/service_role/PUBLIC via has_function_privilege(). That
-- proves "no other role can execute this function" but not "the ACL is
-- exactly the reviewed one" — a function whose ACL is empty-but-non-null,
-- whose owner entry is missing outright (proacl present but with zero rows,
-- which coalesce(v_proacl, acldefault(...)) never reaches because it only
-- substitutes on NULL, not on an empty-but-non-null array), whose sole
-- entry's grantor is not the owner, whose sole entry's privilege_type is not
-- EXECUTE, or whose sole entry's grantability does not match the reviewed
-- production state, all had a grantee equal to the owner and so passed the
-- old `grantee <> v_owner_oid` count as zero — the exact defect the
-- supervising review flagged. Fixed below by reading the exploded ACL
-- structurally (`aclexplode(v_proacl)`, one row per grantor/grantee/
-- privilege/grantability tuple) rather than trusting `v_proacl`'s text
-- rendering (aclitem array element order is not a stable, comparable
-- contract) and requiring, in order: `v_proacl` is not null (a null proacl
-- means unrevoked default privileges, under which PostgreSQL grants PUBLIC
-- EXECUTE to functions); exactly one exploded row; that row's grantee is the
-- function owner; that row's grantor is the function owner; that row's
-- privilege_type is exactly `EXECUTE`; that row's is_grantable is exactly
-- the reviewed value (`false` — the reviewed production ACL,
-- `{postgres=X/postgres}`, carries no `*`/WITH GRANT OPTION marker). Any
-- second entry fails closed by the row-count check alone, regardless of
-- which role it names, including a role this guard does not otherwise
-- hardcode anywhere. The previous round's named-role
-- has_function_privilege() checks are retained immediately below the
-- structural check, unchanged in behavior, purely as readable diagnostics —
-- every drift shape they name was already independently fail-closed by the
-- structural check first (a grant to any of those roles is necessarily
-- either the sole entry's grantee failing the owner-equality check, or a
-- second ACL entry failing the row-count check), so they never gate
-- anything the structural check does not already gate; they exist only so a
-- mismatch message can also name the specific role, when applicable.
-- Named outer dollar-quote tag ($migration_body$, not the usual anonymous
-- $$) deliberately: this block's own comments need to reference the
-- `do $$ ... $$;` pattern and other functions' `$$`-delimited bodies in
-- prose, and PostgreSQL's dollar-quote lexer matches its tag anywhere in the
-- quoted text -- including inside a `--` comment -- so an anonymous outer
-- `$$` would be prematurely closed by the first such mention. A named tag
-- that does not otherwise appear in this file's prose does not have that
-- problem.
do $migration_body$
declare
  v_target_game_ids uuid[];
  v_game_id uuid;

  -- Exact expected body of public.rebuild_metric_summaries(), reproduced
  -- verbatim from pg_get_functiondef('public.rebuild_metric_summaries')
  -- read directly against the live tm-stats database for this correction —
  -- not retyped, reflowed, or reindented. Every line below starts at column
  -- zero regardless of this DO block's own indentation, because this text
  -- becomes the function's literal stored `prosrc` byte-for-byte (see the
  -- "Exact-restoration correction" comment above). Declared once and reused
  -- for both the fail-closed guard's comparison (Step 1.5) and the restore
  -- step's actual new body (Step 2), so the two can never disagree with each
  -- other.
  v_expected_body constant text := $body$
begin
  if to_regprocedure('public.rebuild_metric_summaries_base()') is null then
    raise exception 'rebuild_metric_summaries_base() is required before rebuilding metric summaries'
      using errcode = '42883';
  end if;

  perform public.rebuild_metric_summaries_base();
  perform public.rebuild_additional_metric_summaries();
end;
$body$;

  -- Fields read from the live pg_proc / pg_language / pg_description rows
  -- for public.rebuild_metric_summaries(), for the Step 1.5 identity guard.
  v_fn_oid oid;
  v_owner_oid oid;
  v_owner_name text;
  v_lang_name text;
  v_is_secdef boolean;
  v_volatility text;
  v_parallel text;
  v_is_strict boolean;
  v_is_leakproof boolean;
  v_rettype_ok boolean;
  v_nargs int;
  v_prosrc text;
  v_proconfig text[];
  v_proacl aclitem[];
  v_comment text;
  v_search_path_ok boolean;
  v_acl_row_count int;
  v_acl_grantor oid;
  v_acl_grantee oid;
  v_acl_privilege text;
  v_acl_grantable boolean;
  v_mismatches text[] := '{}';
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

  -- Step 1.5 / Step 2: refresh each affected game's snapshots from current
  -- source data via the existing, unmodified refresh function.
  -- p_require_editor is false because this runs administratively, not as an
  -- authenticated edit.
  --
  -- rebuild_metric_summaries() is temporarily neutralized to a no-op for the
  -- duration of the loop below, so refresh_game_metric_snapshots_internal's
  -- own internal call to it does no work on every iteration, then restored
  -- to its exact real body (v_expected_body, declared above) before Step 3's
  -- single real call. Neither refresh_game_metric_snapshots_internal (its
  -- existing two-argument contract, callers, and authorization behavior) nor
  -- rebuild_metric_summaries_base() / rebuild_additional_metric_summaries()
  -- (the functions the real body delegates to) are modified in any way —
  -- only rebuild_metric_summaries()'s body is touched, and only transiently.
  --
  -- If anything below raises before the restore step runs (including the
  -- guard itself, or a failure inside the loop), the whole migration
  -- transaction rolls back, which undoes the neutralization along with every
  -- other write here — CREATE OR REPLACE FUNCTION is ordinary transactional
  -- DDL, so there is no separate cleanup path that can be skipped or get out
  -- of sync. On success, the restore runs before Step 3, so by the time this
  -- transaction commits, rebuild_metric_summaries()'s definition, owner,
  -- SECURITY DEFINER status, search_path, and EXECUTE grants are all back to
  -- exactly what they were before this migration ran, and its `prosrc` is
  -- textually identical to its pre-migration value (see the
  -- "Exact-restoration correction" comment above; verified directly in the
  -- harness). Its EXECUTE grant today is owner-only (`{postgres=X/postgres}`
  -- — no authenticated, no anon, no PUBLIC) — the Step 1.5 guard below
  -- verifies this holds *before* any mutation, and CREATE OR REPLACE
  -- FUNCTION on an existing function preserves its ACL whenever the argument
  -- list is unchanged, which it is here (zero arguments throughout), so
  -- neither redefinition below needs to touch any GRANT for that reason
  -- alone — the explicit REVOKE after the restore is defense-in-depth on top
  -- of a pre-condition Step 1.5 has already established, not a response to
  -- any ACL change this migration makes.
  --
  -- EXECUTE (dynamic SQL) is required for both redefinitions solely because
  -- PL/pgSQL cannot run CREATE OR REPLACE FUNCTION as a direct statement
  -- inside a DO block — there is no non-dynamic way to do this from inside a
  -- single top-level statement. Every EXECUTE/format() string below is
  -- either fully static and hardcoded, or splices in only v_expected_body
  -- (a `constant` declared once above, never built from any query result —
  -- not the target game ids from Step 1, not anything read from pg_catalog
  -- by the guard), via `%L`/`quote_literal`, which quotes it safely as a
  -- literal — there is no injection surface. Keeping the whole migration as
  -- one top-level statement (as it already was before this correction) is
  -- deliberate: it guarantees the migration is atomic under plain
  -- autocommit-per-statement execution, without depending on the migration
  -- runner wrapping the file in its own transaction.
  if v_target_game_ids is not null then
    -- Step 1.5: fail-closed identity guard. See the "Fail-closed identity
    -- guard" comment above the `do $$` for the full rationale. Every
    -- property is checked and collected into v_mismatches before raising,
    -- so a failure names every property that differs, not just the first.
    select
      p.oid, p.proowner, pg_get_userbyid(p.proowner), l.lanname, p.prosecdef,
      p.provolatile::text, p.proparallel::text, p.proisstrict, p.proleakproof,
      (p.prorettype = 'void'::regtype), p.pronargs, p.prosrc, p.proconfig,
      p.proacl, obj_description(p.oid, 'pg_proc')
    into
      v_fn_oid, v_owner_oid, v_owner_name, v_lang_name, v_is_secdef,
      v_volatility, v_parallel, v_is_strict, v_is_leakproof, v_rettype_ok,
      v_nargs, v_prosrc, v_proconfig, v_proacl, v_comment
    from pg_proc p
    join pg_language l on l.oid = p.prolang
    where p.oid = to_regprocedure('public.rebuild_metric_summaries()');

    if v_fn_oid is null then
      raise exception 'pre-migration guard (20260720223000): public.rebuild_metric_summaries() with an exact zero-argument signature was not found -- refusing to run; production is unmodified'
        using errcode = 'P0001';
    end if;

    if v_nargs <> 0 then
      v_mismatches := v_mismatches || format('signature: expected 0 arguments, found %s', v_nargs);
    end if;

    if v_owner_name is distinct from 'postgres' then
      v_mismatches := v_mismatches || format('owner: expected postgres, found %s', v_owner_name);
    end if;

    if v_lang_name is distinct from 'plpgsql' then
      v_mismatches := v_mismatches || format('language: expected plpgsql, found %s', v_lang_name);
    end if;

    if v_is_secdef is distinct from true then
      v_mismatches := v_mismatches || 'security: expected SECURITY DEFINER, found SECURITY INVOKER'::text;
    end if;

    -- SET search_path TO '' is stored as a single proconfig element whose
    -- text is exactly `search_path=""` (Postgres quotes the empty GUC value)
    -- -- confirmed empirically against this exact stub in the disposable
    -- verification cluster for this correction, not assumed.
    v_search_path_ok := (
      v_proconfig is not null
      and array_length(v_proconfig, 1) = 1
      and v_proconfig[1] = 'search_path=""'
    );
    if not v_search_path_ok then
      v_mismatches := v_mismatches || format(
        'search_path: expected exactly one config entry, search_path=\"\" (i.e. SET search_path TO %L), found %s',
        '', coalesce(v_proconfig::text, 'NULL')
      );
    end if;

    if v_volatility is distinct from 'v' then
      v_mismatches := v_mismatches || format('volatility: expected VOLATILE (v), found %s', v_volatility);
    end if;

    if v_parallel is distinct from 'u' then
      v_mismatches := v_mismatches || format('parallel safety: expected PARALLEL UNSAFE (u), found %s', v_parallel);
    end if;

    if v_is_strict is distinct from false then
      v_mismatches := v_mismatches || 'strictness: expected not STRICT, found STRICT'::text;
    end if;

    if v_is_leakproof is distinct from false then
      v_mismatches := v_mismatches || 'leakproof: expected not LEAKPROOF, found LEAKPROOF'::text;
    end if;

    if v_rettype_ok is distinct from true then
      v_mismatches := v_mismatches || 'return type: expected void'::text;
    end if;

    if v_comment is not null then
      v_mismatches := v_mismatches || format('comment: expected no comment on this function, found %L', v_comment);
    end if;

    if v_prosrc is distinct from v_expected_body then
      v_mismatches := v_mismatches || format(
        'body: prosrc does not match the exact reviewed definition (expected %s bytes, found %s bytes)',
        octet_length(v_expected_body), octet_length(coalesce(v_prosrc, ''))
      );
    end if;

    -- ACL: exact reviewed identity (see "Exact ACL identity correction"
    -- above the `do $$`) -- not merely "no non-owner grantee". The reviewed
    -- production ACL is exactly one aclexplode() row: grantor = owner,
    -- grantee = owner, privilege_type = EXECUTE, is_grantable = false
    -- (textually `{postgres=X/postgres}`, no `*`). Checked structurally via
    -- aclexplode(), not via v_proacl's text rendering (aclitem array element
    -- order is not a stable, comparable contract). This establishes the ACL
    -- precondition the post-restore `revoke ... from public, anon` below
    -- then re-affirms as defense-in-depth, not the other way around.
    if v_proacl is null then
      -- A null proacl means default privileges apply, and PostgreSQL grants
      -- PUBLIC EXECUTE to functions by default -- fail closed rather than
      -- substituting acldefault() and continuing, so this branch is named
      -- explicitly in the mismatch report instead of being folded into the
      -- row-count branch below.
      v_mismatches := v_mismatches || 'acl: proacl is null -- unrevoked default privileges (PostgreSQL grants PUBLIC EXECUTE to functions by default)'::text;
    else
      select count(*) into v_acl_row_count from aclexplode(v_proacl) a;

      if v_acl_row_count <> 1 then
        v_mismatches := v_mismatches || format(
          'acl: expected exactly 1 ACL entry (owner-only EXECUTE), found %s: %s',
          v_acl_row_count, v_proacl::text
        );
      else
        select a.grantor, a.grantee, a.privilege_type, a.is_grantable
        into v_acl_grantor, v_acl_grantee, v_acl_privilege, v_acl_grantable
        from aclexplode(v_proacl) a;

        if v_acl_grantee is distinct from v_owner_oid then
          v_mismatches := v_mismatches || format(
            'acl: sole entry''s grantee is not the function owner (grantee oid %s, owner oid %s, owner %s): %s',
            v_acl_grantee, v_owner_oid, v_owner_name, v_proacl::text
          );
        end if;

        if v_acl_grantor is distinct from v_owner_oid then
          v_mismatches := v_mismatches || format(
            'acl: sole entry''s grantor is not the function owner (grantor oid %s, owner oid %s, owner %s): %s',
            v_acl_grantor, v_owner_oid, v_owner_name, v_proacl::text
          );
        end if;

        if v_acl_privilege is distinct from 'EXECUTE' then
          v_mismatches := v_mismatches || format(
            'acl: sole entry''s privilege_type expected EXECUTE, found %s: %s',
            coalesce(v_acl_privilege, 'NULL'), v_proacl::text
          );
        end if;

        if v_acl_grantable is distinct from false then
          v_mismatches := v_mismatches || format(
            'acl: sole entry''s is_grantable expected false, found %s: %s',
            coalesce(v_acl_grantable::text, 'NULL'), v_proacl::text
          );
        end if;
      end if;
    end if;

    -- Named-role diagnostics only, retained unchanged from the prior round:
    -- every case these catch is already fail-closed by the structural check
    -- above (a grant to any of these roles is necessarily either the
    -- not-null proacl's sole entry failing the grantee=owner check, or a
    -- second ACL entry failing the row-count check, including a second
    -- entry naming a role not hardcoded anywhere in this guard) -- these
    -- exist so a mismatch message can also name the specific role, not to
    -- independently gate anything the structural check does not already
    -- gate.
    if to_regrole('anon') is not null and has_function_privilege('anon', v_fn_oid, 'EXECUTE') then
      v_mismatches := v_mismatches || 'acl: unexpected EXECUTE grant to anon'::text;
    end if;
    if to_regrole('authenticated') is not null and has_function_privilege('authenticated', v_fn_oid, 'EXECUTE') then
      v_mismatches := v_mismatches || 'acl: unexpected EXECUTE grant to authenticated'::text;
    end if;
    if to_regrole('service_role') is not null and has_function_privilege('service_role', v_fn_oid, 'EXECUTE') then
      v_mismatches := v_mismatches || 'acl: unexpected EXECUTE grant to service_role'::text;
    end if;
    if has_function_privilege('public', v_fn_oid, 'EXECUTE') then
      v_mismatches := v_mismatches || 'acl: unexpected EXECUTE grant to PUBLIC'::text;
    end if;

    if array_length(v_mismatches, 1) is not null then
      raise exception 'pre-migration guard (20260720223000) failed for public.rebuild_metric_summaries(): % -- refusing to neutralize, refresh any game, rebuild any summary, or touch any ACL; production is unmodified',
        array_to_string(v_mismatches, ' | ')
        using errcode = 'P0001',
              hint = 'production no longer matches the definition this migration was reviewed against -- reconcile and re-review before reapplying';
    end if;

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
        -- body, byte-identical, before this migration's own single explicit
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

    -- Restore rebuild_metric_summaries() to its real, production body, using
    -- the exact same v_expected_body the Step 1.5 guard above just verified
    -- was already in place (byte-identical, since the guard's body check
    -- passed). format()'s %L guarantees the stored `prosrc` after this
    -- statement is textually identical to v_expected_body -- no
    -- reformatting or re-indentation from this statement's own surrounding
    -- layout in this file (see the "Exact-restoration correction" comment
    -- above the `do $$`).
    execute format(
      $exec_restore$create or replace function public.rebuild_metric_summaries()
returns void
language plpgsql
security definer
set search_path to ''
as %L$exec_restore$,
      v_expected_body
    );

    -- Defense-in-depth, re-affirming a precondition Step 1.5 already
    -- verified rather than responding to any ACL change made above (see the
    -- comment block before Step 1.5/2): rebuild_metric_summaries() already
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
$migration_body$;
