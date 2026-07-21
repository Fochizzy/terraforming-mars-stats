# Executable verification — `20260720223000_fix_event_card_tag_snapshot_correction.sql`

Not part of `npm test` / CI: this exercises the migration against a real,
disposable local PostgreSQL instance, which the vitest suite doesn't provision.
Committed so the exact fixtures, stubs, and results are reviewable and
reproducible rather than only described in prose.

## This round: exact ACL identity + all eight failure windows

Supervising review of the previous round's commit (`fix(db): exact
restoration + fail-closed identity guard for the Event-card snapshot
migration`) classified it CORRECTION INCOMPLETE on three specific,
narrowly-scoped points — all three closed this round, in the migration file
and this harness:

1. **The ACL guard counted non-owner grantees, not exact ACL identity.** The
   prior guard's ACL check was `select count(*) from
   aclexplode(coalesce(v_proacl, acldefault(...))) where grantee <>
   v_owner_oid` — this proves "no role other than the owner can execute this
   function," but not "the ACL is exactly the reviewed one." A function
   whose ACL is empty-but-non-null (owner entry missing), whose sole entry's
   grantor differs from the owner, whose sole entry's privilege_type is not
   EXECUTE, or whose sole entry's grantability (`WITH GRANT OPTION`) differs
   from the reviewed value all have a grantee equal to the owner and so
   passed the old check with zero non-owner grants counted — exactly the
   defect the supervising review named. Fixed by reading the exploded ACL
   structurally and requiring, in order: `v_proacl` is not null; exactly one
   `aclexplode()` row; that row's grantee is the owner; that row's grantor is
   the owner; that row's `privilege_type` is exactly `EXECUTE`; that row's
   `is_grantable` is exactly the reviewed value (`false`). See the
   migration's own "Exact ACL identity correction" comment block for the
   full rationale, and "Exact-ACL-identity drift tests" below for all 5
   required drift proofs (4 new, 1 carried over).
   **Empirical finding this round, worth flagging explicitly:** an "empty
   ACL" fixture built via a raw catalog literal (`update pg_proc set proacl
   = '{}'::aclitem[]`, or `ARRAY[]::aclitem[]`) produces a genuinely
   zero-dimensional array that `aclexplode()` itself rejects with `ERROR:
   ACL arrays must be one-dimensional` — still fail-closed (aborts before
   any mutation, like every other guard rejection), but via a raw Postgres
   error rather than this guard's own named `acl: ...` message, and **not
   reachable via any GRANT/REVOKE sequence** — only via directly editing
   `pg_catalog.pg_proc`. The empty-ACL drift fixture below instead reaches a
   real, DDL-reachable empty ACL (`revoke all ... from postgres`, the sole
   remaining grantee after the baseline's `revoke ... from public/anon/
   authenticated`), which `aclexplode()` handles correctly (0 rows, no
   error) — confirmed empirically against this exact cluster, not assumed.
2. **Search-path and other metadata drift tests were described but not
   executed.** The prior round's fixtures file (`05-guard-drift-fixtures.sql`)
   documented a `search_path` drift alternative in prose but
   `run-verification.sh` only ever ran the SECURITY INVOKER variant; an
   extra-GUC case and a comment-drift case did not exist at all. All four
   required, previously-unexecuted cases now run for real, every time
   `run-verification.sh` runs: search_path changed to a nonempty value,
   proconfig missing entirely (confirmed empirically this round: `RESET`
   makes `proconfig` `NULL`, not an empty array — a different drift shape
   from "changed to a different value," which the guard's `is not null`
   check catches specifically), an extra GUC alongside the expected
   `search_path=""` entry (confirmed empirically: this appends a second
   `proconfig` array element, caught by the guard's `array_length(...) = 1`
   check), and a function comment where none is expected.
3. **Only one of the eight required failure windows had ever been exercised
   against this migration.** The prior round's own README explicitly flagged
   this gap rather than asserting undocumented coverage ("this claim could
   not be independently confirmed... and should be reconciled by the
   supervising reviewer"). All eight now run, every time
   `run-verification.sh` runs — see "Eight required failure windows" below
   for the full 8/8 table and the two distinct techniques used (instrumented
   migration copies for windows that sit at a stable point in the migration's
   own text; disposable stub-function swaps for windows that sit inside a
   function the migration calls but does not define).

This round's harness additions: `06-failure-window-generator.sh` (generates
disposable, test-only instrumented copies of the *real* migration file for
failure windows 1/2/5/8, verifying the source file's sha256 first and
requiring each insertion anchor to occur exactly once — never modifies the
tracked migration file, never writes inside this tracked verification
directory), `07-failure-window-stubs.sql` (documents the stub swaps for
failure windows 3/4/6/7, reproducible by hand or via `run-verification.sh`),
and 8 new sections in `05-guard-drift-fixtures.sql` (the exact-ACL-identity
and metadata drift fixtures). `run-verification.sh` now runs all of the
above plus everything the prior round already ran, in one pass, and prints an
explicit 8/8 failure-window table plus a hard `26/26 expected checks ran`
gate — see that script's own top-of-file comment for the exit-nonzero-if-
anything-is-skipped contract.

## Previous round: exact restoration + fail-closed identity guard

Independent review of the previous round's commit (`fix(db): bound the
Event-card snapshot migration to one global rebuild`) passed the core
execution strategy but raised two required corrections, both now reflected
in the migration file and this harness:

1. **Exact restoration was claimed but not delivered.** The previous round's
   restore step reproduced `rebuild_metric_summaries()`'s real body inside an
   `EXECUTE` string nested inside the `DO` block's own indentation, which
   added six spaces of stray leading whitespace to every line of the
   restored body relative to the function's true stored `prosrc`. Confirmed
   against this exact harness: pre-migration `pg_get_functiondef` is **513
   bytes**; the *previous* round's post-migration result was **577
   bytes** — semantically identical (the extra whitespace is outside any
   string literal, so behavior was unchanged), but not textually identical,
   which defeated a simple pre/post `pg_get_functiondef` diff as a drift
   check and contradicted this document's own byte-identical-restoration
   claim. Fixed by declaring the exact expected body once, as a `constant
   text` (`v_expected_body`) whose own indentation is independent of the
   `DO` block's nesting (every line starts at column zero, matching the real
   function's stored `prosrc`), and using `format(..., %L, v_expected_body)`
   to splice it into the restore statement — `%L` (`quote_literal`)
   reproduces the variable's contents exactly, with no reformatting from the
   surrounding file layout. **Verified this round: pre/post
   `pg_get_functiondef` diff is empty, and pre/post `oid` is identical** (see
   "Actual results" below) — not merely "semantically equivalent."
2. **No in-migration guard against the hardcoded body going stale.** The
   previous round's migration hardcoded its belief about
   `rebuild_metric_summaries()`'s current definition (to build the
   neutralize/restore bodies) but never checked, inside the migration
   transaction, that the live function still matched that belief when the
   migration actually runs — a time-of-check/time-of-use gap between an
   external preflight read and application. Fixed by a fail-closed identity
   guard (migration Step 1.5, immediately before the first `CREATE OR
   REPLACE FUNCTION` and before any snapshot/summary write): it reads the
   live `pg_proc`/`pg_language`/`pg_description` rows for
   `rebuild_metric_summaries()` and compares, against the *same*
   `v_expected_body` constant the restore step uses (so guard and restore
   can never disagree with each other): exact zero-argument signature, full
   body (`prosrc`), owner, language, `SECURITY DEFINER` status,
   `search_path`, volatility, parallel-safety, strictness, leakproofness,
   return type, ACL (owner-only — no PUBLIC/anon/authenticated/service_role
   grant), and comment state (none expected). Every check runs and any
   failures are collected before raising, so one exception message names
   every property that differs. On any mismatch, the exception is raised
   *before* the neutralize step, before any game is refreshed, before any
   summary is rebuilt, and before any ACL is touched — the drifted function
   is left exactly as drifted (not silently overwritten by the migration's
   hardcoded expected copy), and the single top-level statement fails
   atomically, so production is left completely unmodified. This does not
   replace the external preflight in the correction-package doc's §9
   deployment order (the target *inventory* — which games/players match Step
   1's predicate — is data-dependent and cannot be baked into a guard); it
   means the narrower claim "the function this migration was reviewed
   against is still the live function" is no longer trusted on the strength
   of that preflight alone, every time this migration runs.
   **Concurrency note (unchanged from before this round, restated because
   the guard now depends on it too):** the guard's read and the neutralize
   step both execute inside this migration's own transaction, before commit
   — ordinary PostgreSQL MVCC/catalog visibility means no concurrent session
   can observe the transient neutralized (no-op) body, or a partially
   evaluated guard state, at any point; other sessions see either the
   pre-migration definition or the fully-restored post-migration one, never
   an intermediate state. This is a property of PostgreSQL's transactional
   DDL, not something this migration implements itself.
   **This correction round does not re-read or refresh the production
   target inventory** (§4 of the correction-package doc); it is a
   local-only, disposable-database change to the migration file and this
   harness. No production database was read, connected to, or modified to
   produce any evidence in this document.

New fixtures/tooling this round: `05-guard-drift-fixtures.sql` (the four
guard-mismatch drift statements, one section each, commented out by default
— see its own header for exact reproduction) and `run-verification.sh` (an
orchestration script that runs every case in this README end-to-end against
a disposable cluster and prints PASS/FAIL per case — not a replacement for
the manual steps below, which it runs in the same order).

## History

This harness has caught three real defects in earlier drafts of this
migration, not just confirmed a correct one on the first attempt:

- **Gap 2** (closed earlier): the original total-tag-count comparison
  `inner join`ed persisted snapshots to a root rollup, silently dropping any
  game_player whose root-derived expected total was zero.
- **Signal (a) tag-code-proxy** (closed earlier): target selection for the
  per-tag `event` row was `tag_code = 'event' and tag_count <> 0` — treating
  *any* nonzero count as proof of staleness, rather than comparing it against
  root. A legitimate nonzero `event` tag (a recognized non-Event card
  genuinely carrying a literal `event` gameplay tag — see
  `countable-card-tags.test.ts`) was selected and rewritten on **every**
  run, breaking repeat-safety, not just over-scoping.
- **Zero-root total mismatch, revisited** (closed earlier): the fix for Gap 2
  still missed the case where root has *zero* tag rows at all for a player
  (not just a low/zero rollup) and the case where the persisted
  `game_player_metric_snapshots` row is entirely absent (never snapshotted).
- **Once-per-game global rebuild** (closed this round): the migration's Step
  2 called `refresh_game_metric_snapshots_internal()` once per target game
  and then Step 3 called `rebuild_metric_summaries()` once more, explicitly.
  `refresh_game_metric_snapshots_internal()` itself unconditionally calls
  `rebuild_metric_summaries()` at the end of *every* invocation (confirmed by
  reading its live production definition, not assumed), and
  `rebuild_metric_summaries()` unconditionally rebuilds
  `player_metric_summaries`, `player_map_metric_summaries`, and eight
  `global_*` summary tables from scratch on *every* call, for every group —
  so N target games meant N+1 complete global rebuilds, not one. This was
  invisible to the *previous* version of this harness because its
  `refresh_game_metric_snapshots_internal` stub never called
  `rebuild_metric_summaries()` internally at all — the stub only proved "one
  rebuild call happened," not "how many." Closed by rebuilding the stub
  topology to match production's real call graph one level deeper (see
  "Stubs" below) and by bounding the migration itself (see the migration
  file's own comments around its Step 2) to neutralize
  `rebuild_metric_summaries()` for the duration of the per-game loop and
  restore it, byte-identical to its pre-migration body, before a single real
  rebuild call.

The current fixtures (`02-seed-fixtures.sql`) and migration both reflect the
corrected semantics: every comparison is root-value versus snapshot-value —
never "is the snapshot value nonzero" — over the union of every
`game_player_id` either side has evidence for, so absence on either side
compares as zero via `coalesce(...)` rather than being silently dropped. And
the migration performs the corrected rebuild cascade exactly once, regardless
of how many games it refreshes.

## What this proves

Runs the **actual repository migration file** (`\i ../../20260720223000_fix_event_card_tag_snapshot_correction.sql`,
not a reimplementation of its predicates) against eight seeded fixture games,
proving:

1. Zero matching games → zero writes, no aggregate rebuild (proven by the
   idempotent second pass — see below).
2. A game with a stale nonzero `event` snapshot row, root already `0` →
   refreshed (Game B).
3. A game whose `total_tag_count` disagrees with root but has **no** `event`
   row in root at all → refreshed via the total signal alone (Game C).
4. Already-correct games → remain fully untouched (Games A, D).
5. **A legitimate nonzero `event` tag — root and snapshot agreeing, both
   nonzero — is never selected** (Game F). **Mandatory case.** Confirmed to
   fail under the pre-correction migration (selected and rewritten every
   run — see "Defect reproduction" below) and pass after.
6. **A game with zero root tag rows at all, and a stale nonzero persisted
   `total_tag_count`** → the root-derived expected total is `0`; selected and
   corrected to `0` (Game G). **Mandatory case.** Confirmed to fail under the
   pre-correction migration (silently missed by its inner join) and pass
   after.
7. Root `event` tag nonzero, but the snapshot has no `event` row at all
   (present for other tags, absent for `event`) → selected, `event` row
   created fresh (Game H).
8. Root total nonzero, but `game_player_metric_snapshots` has **no row at
   all** for that game_player (never snapshotted) → selected, the row is
   created from scratch, not silently skipped (Game I).
9. Unrelated tag rows (on games that *are* refreshed) → values unchanged.
10. Card-play counts (`played_card_count`/`matched_card_count`/`unresolved_card_count`)
    → unchanged everywhere.
11. A second execution → performs no corrective work — byte-identical state
    including every `updated_at`, **and specifically confirms Game F is not
    re-touched** (the repeat-safety property the old signal (a) violated).
12. A failure partway through the refresh loop → rolls back atomically, even
    for a game that would have succeeded had it processed before the
    failure — **including** `rebuild_metric_summaries()` itself, which ends
    the failed run back in its real, restored body rather than stuck
    neutralized, because the neutralize step is part of the same rolled-back
    transaction.
13. Root `game_log_tag_summaries` → byte-identical before and after every
    run in this harness.
14. **The global rebuild cascade runs exactly once per migration run that
    touches at least one game — never once per game.** Proven by an exact
    count, not an "it ran at least once" marker: `_rebuild_marker` carries a
    `kind` column (`base`/`additional`) so the harness can distinguish
    `rebuild_metric_summaries_base()` from `rebuild_additional_metric_
    summaries()` and assert both ran exactly once each, even though five
    games (B, C, G, H, I) were refreshed in the same run. Confirmed against
    the *pre-bounding* migration text too (`04-defect-reproduction-pre-
    correction-rebuild-count.sql`), run against this same corrected harness:
    it produces **six** of each marker kind (five implicit + one explicit)
    for the identical five-game target set — the concrete before/after
    contrast this round's fix is verified against.
15. **`game_milestone_metric_snapshots` and `game_award_metric_snapshots`
    are represented and correctly scoped**, not just the two tag-related
    tables: Game B (a target) has its milestone snapshot deleted and
    reinserted (fresh `updated_at`) when refreshed; Game A (never a target)
    has an award snapshot that remains byte-identical (unchanged
    `updated_at`) across every run, proving the migration does not
    over-reach into non-target games' milestone/award state.
16. **`rebuild_metric_summaries()`'s live definition and ACL are
    byte-identical before and after a successful migration run** —
    `pg_get_functiondef` and `pg_proc.proacl` both confirmed unchanged
    (owner-only execute: `{postgres=X/postgres}`, no authenticated, no anon,
    no PUBLIC), and `refresh_game_metric_snapshots_internal(uuid,boolean)`'s
    ACL (`{postgres=X/postgres,authenticated=X/postgres}`) is untouched by
    this migration in every run, confirming the two-argument contract's
    authorization surface is unaffected.
17. **`rebuild_metric_summaries()`'s `oid` is identical before and after a
    successful run** — `CREATE OR REPLACE FUNCTION` on an unchanged
    zero-argument signature never reassigns the function's `oid`; confirmed
    directly (not merely assumed from the "unchanged signature" rule), this
    round.
18. **Exact restoration is real, not just claimed**: `pg_get_functiondef`
    diff between immediately-pre-migration and immediately-post-migration is
    empty (zero-byte, zero-line) on a successful run — not merely
    "semantically equivalent" (see "This round" above for the 513-vs-577-byte
    defect this replaces).
19. **The fail-closed identity guard (Step 1.5) catches each of twelve
    independent drift categories before any mutation**, each proven with its
    own fixture in `05-guard-drift-fixtures.sql` and run automatically by
    `run-verification.sh`: a one-statement body drift, an owner drift, a
    security-mode drift (`SECURITY INVOKER` in place of `SECURITY DEFINER`),
    and — this round — the ACL check rebuilt to validate *exact* identity
    (not just "no non-owner grantee"), proven against **5 distinct ACL drift
    shapes**: an added `authenticated` grant, an added `PUBLIC` grant, a real
    DDL-reachable empty ACL (owner entry revoked), an owner entry with
    unexpected grantability (`WITH GRANT OPTION`), and a second entry naming
    a role the migration does not otherwise hardcode anywhere — plus **4
    metadata/search-path drift shapes**, all newly executed this round: search
    path changed to a nonempty value, proconfig missing entirely, an extra GUC
    alongside the expected `search_path=""` entry, and a function comment
    where none is expected. In every case: the migration raises a
    `pre-migration guard (20260720223000) failed for
    public.rebuild_metric_summaries(): <property>: ...` exception naming the
    specific drifted propert(y/ies), no snapshot/summary table is written, no
    rebuild marker is inserted, no ACL is changed, and — specifically
    distinct from correction 1's success-path restoration — the *drifted*
    function definition is left exactly as drifted, not reverted to the
    migration's own hardcoded expected copy. A full `dump-state.sql` diff
    (including the function's own full identity section — owner, ACL,
    language, security, search_path, volatility, parallel-safety,
    strictness, leakproofness, return type, comment, `prosrc` length and md5,
    and `oid`) is byte-identical immediately before and immediately after
    each guard-rejected run.
20. **The no-target case still does not inspect or replace
    `rebuild_metric_summaries()` at all**: with zero rows in every source
    table, the migration's `DO` succeeds, `pg_get_functiondef` is unchanged,
    and `_rebuild_marker` has zero rows — the Step 1.5 guard sits inside the
    same `if v_target_game_ids is not null` block Step 2/3 already used, so
    it is skipped entirely on this path, matching the pre-existing no-target
    no-op behavior exactly (this correction round did not weaken or bypass
    that property to add the guard).
21. **The single pre-existing forced-failure (rollback) scenario in this
    harness — a poison game injected mid-`FOREACH`-loop — still rolls back
    atomically under the corrected migration**, including the new Step 1.5
    guard read and the new `format()`-based restore: post-failure,
    `rebuild_metric_summaries()` is back in its real, restored,
    byte-identical-to-pre-migration body (not stuck neutralized), because
    the guard's read, the neutralize step, and the (never-reached) restore
    step are all part of the same transaction that rolls back.
22. **All eight required failure windows now roll back atomically**, each
    proven independently — see "Eight required failure windows" below for
    the full 8/8 table, the injection technique used for each, and what each
    one specifically proves that the others don't (in particular: window 4
    proves rollback undoes 3 games' worth of *real*, already-written
    snapshot rows, not just an empty/no-op first attempt; window 5 proves
    rollback undoes the entire per-game loop's writes even after
    `rebuild_metric_summaries()` has already been restored to its real body;
    window 7 proves rollback undoes a successful sibling call's write from
    earlier in the very same statement).

## Eight required failure windows

Every window below is injected into a fresh, freshly-seeded database (same
5-target-game fixture set — B, C, G, H, I — as every other case in this
harness), and every window proves the same four things: (a) migration
execution fails with a nonzero psql exit code; (b) all four per-game
snapshot tables (`game_player_tag_metric_snapshots`,
`game_player_metric_snapshots`, `game_milestone_metric_snapshots`,
`game_award_metric_snapshots`), root `game_log_tag_summaries`, and
`_rebuild_marker` counts are byte-identical immediately before vs.
immediately after (via `dump-state.sql`); (c) `rebuild_metric_summaries()`'s
own full identity — `oid`, owner, language, `SECURITY DEFINER`, search_path,
volatility, parallel safety, strictness, leakproofness, return type, comment,
`prosrc` length + md5 (all in that same `dump-state.sql` output) — is
byte-identical too, so it ended the failed run in its real, restored body,
never stuck neutralized; (d) no generated database object (a temporary
helper, a partial rebuild, anything the *migration itself* created) survives
— windows 3/4/6/7's own stub-swap scaffolding (a renamed function, a counter
table) is test harness setup created *before* the migration runs, not
something the migration creates, and is destroyed along with the whole
disposable database at the end of that case regardless.

| # | Window | Technique | What it specifically proves beyond the others |
| --- | --- | --- | --- |
| 1 | After target selection (Step 1), before neutralization (Step 2) | Instrumented migration copy (`06-failure-window-generator.sh`) | Failure with *zero* prior writes of any kind in this run — the guard already passed, but nothing has been touched yet |
| 2 | Immediately after neutralization, before the per-game loop | Instrumented migration copy | Rollback undoes the neutralize `CREATE OR REPLACE FUNCTION` itself — `rebuild_metric_summaries()` ends up back in its real body, not stuck as the no-op |
| 3 | During the first per-game refresh | Disposable stub swap (unconditional raise) | Failure on literally the first loop iteration, regardless of target-game iteration order |
| 4 | After several per-game refreshes | Disposable stub swap (call-counted wrapper around the real stub logic, raises on the 4th of 5 calls) | Rollback undoes 3 games' worth of **real**, already-written snapshot rows (confirmed: the raised error message names call `#4`, proving 3 prior calls really ran the real logic) |
| 5 | After restoration, before the final real rebuild | Instrumented migration copy | Rollback undoes the *entire* per-game loop's real writes even after `rebuild_metric_summaries()` has already been fully restored to its real body and re-affirmed via the defense-in-depth `REVOKE` |
| 6 | Inside `rebuild_metric_summaries_base()` | Disposable stub swap | Failure inside the first of the two functions the restored `rebuild_metric_summaries()` delegates to, at the very end of a run where every earlier step already succeeded |
| 7 | Inside `rebuild_additional_metric_summaries()` | Disposable stub swap (base stub left as its normal marker-inserting self) | Rollback undoes a *successful* sibling call's write (the `base` marker row) from earlier in the very same top-level statement |
| 8 | After the final rebuild, before the top-level statement completes | Instrumented migration copy | The latest possible injection point — even the `base`/`additional` marker rows from a fully successful rebuild are rolled back |

**Actual results, this round (PostgreSQL 18.4, two independently-`initdb`'d
disposable clusters, 2026-07-21):** all 8 windows PASS on both clusters. See
"Actual results, this round's corrections" below for the full
`run-verification.sh` output, including the automated 8/8 table it prints.

Windows 1, 2, 5, 8 run via `06-failure-window-generator.sh`, which verifies
the *real* migration file's sha256 before generating anything (refuses to
generate if the file has been edited since the hash below was last
recorded) and requires each insertion anchor to occur in the file exactly
once (refuses to generate, rather than guessing, if an anchor is missing or
duplicated):

```
sha256(20260720223000_fix_event_card_tag_snapshot_correction.sql) =
  2eba01204cff08c7220d1b7c2f78c02e45b1332a7f621e28c1606e9d800d48f4
```

Windows 3, 4, 6, 7 run the real, unmodified migration file against a
database where one call-graph dependency has been swapped for a disposable
stub — see `07-failure-window-stubs.sql` for the exact, reviewable SQL for
each.

## Fixtures (`02-seed-fixtures.sql`)

Eight games, one group, eight players. UUIDs use plain hex only: group
prefix `a`, players `b1..b9`, games `c1..c9`, game_players `d1..d9`, imports
`e1..e9` (digit `N` identifies the scenario; `5` is reserved for the
rollback-test poison game, added separately by `03-rollback-test-setup.sql`).

| # | Label | Root (`game_log_tag_summaries`) | Snapshot before | Expected after |
| --- | --- | --- | --- | --- |
| 1 | A | `space=2, building=1`, total=`3` (consistent) | matches root | **untouched** |
| 2 | B | `space=1, event=0`, total=`1` (root already clean) | `event=1` (stale), total=`2` (stale) | `event → 0`, total `→ 1` |
| 3 | C | `building=3`, total=`3`; **no `event` row** | `building=3` (correct), total=`5` (stale) | total `→ 3` — total signal alone |
| 4 | D | `microbe=4`, total=`4` (consistent) | matches root | **untouched** |
| 6 | F | `event=1` (**legitimate** — a real non-Event card carrying a literal `event` tag), total=`1` | `event=1`, total=`1` (already correct) | **untouched** — mandatory case |
| 7 | G | **no tag rows at all** | total=`7` (stale; expected root total is `0`, not "no opinion") | total `→ 0` — mandatory case |
| 8 | H | `event=2`, total=`2` | total=`2` (correct); **no `event` row in snapshot at all** | `event` row created, `tag_count=2` |
| 9 | I | `space=3`, total=`3` | **no `game_player_metric_snapshots` row at all** | row created, total=`3` |

Milestone/award fixtures (new this round, added after game I's rows in
`02-seed-fixtures.sql`): one milestone claimed by Game B (a target, via both
tag signals) and one award funded-and-won by Game A (never a target). Proves
the per-game refresh loop correctly reaches
`game_milestone_metric_snapshots`/`game_award_metric_snapshots` for target
games and leaves them alone for non-target games — see "What this proves"
items 14–16 above.

## Defect reproduction (before the Signal-(a) correction)

Run against the pre-correction migration text (the version with
`where tag_code = 'event' and tag_count <> 0` as the sole event signal, and
the plain `inner join` total comparison from the earlier Gap-2-only fix):

- **Game F** (mandatory case 5): selected and rewritten on the *first* run
  despite root and snapshot already agreeing (`event=1` both sides). Its
  `game_player_tag_metric_snapshots.event.updated_at` changed even though
  the value didn't. Run the migration a **second** time: Game F's row is
  rewritten *again* (`updated_at` advances a second time) — repeat-safety is
  false for any game with a legitimate nonzero `event` tag.
- **Game G** (mandatory case 6): never selected. `total_tag_count` remains
  stale at `7` after the migration runs, because the old total-signal's
  `inner join` requires a matching root rollup row to exist, and Game G has
  none.
- **Games H and I**: also silently missed by the pre-correction migration,
  for the same class of reason (signal (a) requires an existing nonzero
  snapshot row to select from; signal (b)'s inner join requires an existing
  snapshot row to join against).

Reproduced by loading `02-seed-fixtures.sql` against the pre-correction
migration text and observing the above; the corrected migration (current
repository state) resolves all four.

## Stubs (`01-schema-and-stubs.sql`)

- `metric_normalized_label` — copied verbatim from
  `20260708142459_add_persisted_metric_snapshots.sql`.
- `anon` / `authenticated` / `service_role` — minimal stub roles (created
  only if absent), so the migration's `revoke ... from public, anon`
  statement, and this file's own baseline ACL setup, have real roles to
  target — matching production, where these roles always exist.
- `refresh_game_metric_snapshots_internal` — **simplified stub**, faithfully
  reimplements the identity resolution (`game_player_id` when root already
  carries it, name/alias fallback when it doesn't) and the tag-count columns
  this correction depends on, using **delete-then-insert** for
  `game_player_metric_snapshots` (not a plain `UPDATE`), so a game whose
  players have never been snapshotted before (Game I) gets a correct row
  created rather than silently doing nothing. Checks
  `games.status = 'finalized'` before writing, matching production's
  early-return for non-finalized games. **New this round:** also
  deletes/reinserts `game_milestone_metric_snapshots` and
  `game_award_metric_snapshots` for the game (all four per-game snapshot
  tables are now represented, not two), and **calls
  `public.rebuild_metric_summaries()` unconditionally at the end of every
  invocation, on both the finalized and early-return paths** — this is the
  specific fidelity gap this round closes; the previous stub never made this
  call at all, so it could not have caught the once-per-game rebuild defect
  this round's migration correction fixes. Does **not** implement
  scoring-share/normalized-efficiency/win-margin columns or
  timing-bucket/ROI computation for milestones/awards — out of scope for
  this correction and untouched by it.
- `rebuild_metric_summaries_base` / `rebuild_additional_metric_summaries` —
  **new this round**. Stubs standing in for the two functions production's
  `rebuild_metric_summaries()` delegates to; each records a marker row
  (`_rebuild_marker`, `kind` = `'base'`/`'additional'`) instead of
  reimplementing the real global-aggregate SQL (out of scope, untouched).
  Exist so the migration's own restored `rebuild_metric_summaries()` body —
  which literally checks `to_regprocedure('public.rebuild_metric_summaries_
  base()')` and calls both — has something real to call in this harness too,
  not just in production.
- `rebuild_metric_summaries` — **baseline body reproduced verbatim** from
  `pg_get_functiondef('public.rebuild_metric_summaries')` read directly
  against the live tm-stats database for this correction (the
  `to_regprocedure` guard plus two `perform` calls), not a flattened
  marker-only fake as in the previous round. This is deliberate: the
  migration's own neutralize/restore steps operate on this exact function
  during its run, and the harness needs to start from — and end at — the
  same real definition production does, for the byte-identical
  before/after comparison in `dump-state.sql` to mean anything.

## Reproduction

```sh
# 1. Disposable cluster (adjust the PostgreSQL 18 bin path if different)
initdb -D /tmp/pg-event-tag-verify -U postgres --auth=trust
pg_ctl -D /tmp/pg-event-tag-verify -o "-p 55491" -l /tmp/pg-event-tag-verify.log start

# 2. Schema, stubs, fixtures
psql -h 127.0.0.1 -p 55491 -U postgres -v ON_ERROR_STOP=1 -f 01-schema-and-stubs.sql
psql -h 127.0.0.1 -p 55491 -U postgres -v ON_ERROR_STOP=1 -f 02-seed-fixtures.sql

# 3. Run the REAL migration file (first pass)
psql -h 127.0.0.1 -p 55491 -U postgres -v ON_ERROR_STOP=1 \
  -f ../../20260720223000_fix_event_card_tag_snapshot_correction.sql
psql -h 127.0.0.1 -p 55491 -U postgres -f dump-state.sql   # inspect

# 4. Idempotency: run it again, diff against the post-first-run dump — expect
#    zero differences, including Game F's row and the rebuild_marker counts.
psql -h 127.0.0.1 -p 55491 -U postgres -v ON_ERROR_STOP=1 \
  -f ../../20260720223000_fix_event_card_tag_snapshot_correction.sql
psql -h 127.0.0.1 -p 55491 -U postgres -f dump-state.sql

# 5. Rollback: re-stale game B, add a poison game whose refresh throws, then
#    run the real migration file again — expect a nonzero exit and a
#    byte-identical dump before/after (including game B, unresolved, and
#    rebuild_metric_summaries() back to its real, restored body).
psql -h 127.0.0.1 -p 55491 -U postgres -v ON_ERROR_STOP=1 -f 03-rollback-test-setup.sql
psql -h 127.0.0.1 -p 55491 -U postgres -v ON_ERROR_STOP=1 \
  -f ../../20260720223000_fix_event_card_tag_snapshot_correction.sql   # expect ERROR, exit 3

# 6. Rebuild-count defect reproduction: fresh database, same schema/fixtures,
#    run the PRE-bounding migration text instead of the real file — expect
#    six of each rebuild_marker kind (five implicit + one explicit), not one.
createdb -h 127.0.0.1 -p 55491 -U postgres defect_repro
psql -h 127.0.0.1 -p 55491 -U postgres -d defect_repro -v ON_ERROR_STOP=1 -f 01-schema-and-stubs.sql
psql -h 127.0.0.1 -p 55491 -U postgres -d defect_repro -v ON_ERROR_STOP=1 -f 02-seed-fixtures.sql
psql -h 127.0.0.1 -p 55491 -U postgres -d defect_repro -v ON_ERROR_STOP=1 \
  -f 04-defect-reproduction-pre-correction-rebuild-count.sql
psql -h 127.0.0.1 -p 55491 -U postgres -d defect_repro \
  -c "select kind, count(*) from public._rebuild_marker group by kind order by kind;"
dropdb -h 127.0.0.1 -p 55491 -U postgres defect_repro

# 7. Guard-mismatch fixtures (12 total: body/owner/security-mode/4×ACL/
#    4×search-path-and-metadata/comment): one section per disposable
#    database, uncommenting exactly one drift statement from
#    05-guard-drift-fixtures.sql between steps 2 and 3 above. See that
#    file's header for the exact statements and expected error substrings.

# 8. Eight required failure windows (this round):
#    a. Generate the instrumented copies for windows 1/2/5/8 (never written
#       to this tracked directory or the tracked migration file):
OUT_DIR=/tmp/tm-event-tag-failure-windows ./06-failure-window-generator.sh
#    b. Windows 1, 2, 5, 8: run the generated copy from a fresh seeded
#       database in place of the real migration file in step 3 above (e.g.
#       `-f /tmp/tm-event-tag-failure-windows/window1.sql`) — expect ERROR
#       containing `INJECTED_FAILURE_WINDOW_<n>`, and a dump-state.sql diff
#       (including the function's own identity section) that is empty.
#    c. Windows 3, 4, 6, 7: apply the corresponding stub swap from
#       07-failure-window-stubs.sql (via `psql -c`) to a fresh seeded
#       database, then run the REAL unmodified migration file — same
#       expectations as (b).
#    d. Tear down each disposable database and /tmp/tm-event-tag-failure-windows
#       after use.

# 9. Tear down
pg_ctl -D /tmp/pg-event-tag-verify stop
```

Or, equivalently, run every case above (including all 12 guard-drift
fixtures and all 8 failure windows) in one pass:

```sh
PGBIN="/path/to/postgresql/18/bin" PGHOST=127.0.0.1 PGPORT=55491 PGUSER=postgres \
  ./run-verification.sh
```

## Actual results (this run, PostgreSQL 18.4, 2026-07-21)

- First pass: `DO` (success). Games A/D: no row changes, `updated_at`
  unchanged. Game B: `event` `1 → 0`, total `2 → 1`. Game C: total `5 → 3`,
  `building` value unchanged. **Game F: no row changes, `updated_at`
  unchanged — correctly left alone.** **Game G: total `7 → 0`.** Game H:
  `event` row created (`tag_count=2`), matching root. **Game I:
  `game_player_metric_snapshots` row created from nothing
  (`total_tag_count=3`)**. Game B's milestone snapshot refreshed (fresh
  `updated_at`); Game A's award snapshot **untouched** (`updated_at`
  unchanged, despite Game A having real award activity). `_rebuild_marker`:
  **exactly one `base` row and one `additional` row**, even though five
  games (B, C, G, H, I) were refreshed. `rebuild_metric_summaries()`'s live
  definition after the run is byte-identical to its pre-migration baseline
  (`pg_get_functiondef` diff: none); its ACL is unchanged
  (`{postgres=X/postgres}`); `refresh_game_metric_snapshots_internal(uuid,
  boolean)`'s ACL is unchanged (`{postgres=X/postgres,authenticated=X/
  postgres}`). Root `game_log_tag_summaries`: identical before/after,
  including every row's `updated_at` — confirmed never written.
- Second pass: `DO` (success). Full state dump byte-identical to the
  post-first-pass dump (`diff` exit 0, zero output) — zero writes,
  `_rebuild_marker` counts unchanged at one `base` / one `additional`.
  **Game F's row specifically confirmed not re-touched.**
- Rollback: re-staled game B and added a poison game whose stubbed refresh
  raises. Running the real migration file produced `ERROR: simulated
  refresh failure for poison game …`, psql exit code `3`. Post-failure
  state: game B back to its re-staled values (`event=1`, `total=2`,
  unresolved); `_rebuild_marker` counts unchanged at one `base` / one
  `additional` — no new rebuild occurred; `rebuild_metric_summaries()`'s
  live definition is the real, restored body (not stuck neutralized),
  because the neutralize step is part of the same transaction that rolled
  back.
- Rebuild-count defect reproduction (pre-bounding migration text, run
  against a fresh copy of *this round's* corrected harness — i.e., a
  `refresh_game_metric_snapshots_internal` stub that really does call
  `rebuild_metric_summaries()` internally): produced **six** `base` markers
  and **six** `additional` markers for the same five-game target set (B, C,
  G, H, I) — five implicit (one per game) plus one explicit. This is the
  concrete before/after contrast for this round's fix: same target
  predicate, same five games, 6× the rebuild work under the pre-bounding
  Step 2/3 shape versus exactly 1× under the corrected one.
- Target-predicate defect reproduction (pre-correction migration text, an
  earlier round): Game F selected and rewritten on both the first and
  second run (repeat-safety violated); Game G, H, and I all left
  stale/incomplete (silently missed). See "Defect reproduction" above.

## Actual results, this round's corrections (`run-verification.sh`, PostgreSQL 18.4, 2026-07-21)

All 26 automated checks below passed on a fresh disposable cluster
(`initdb -E UTF8 --locale=C`), and again, independently, on a second,
freshly-`initdb`'d cluster on a different port — full command output for
both runs is reproduced in this round's supervising report; both end with
`=== SUMMARY: 26 passed, 0 failed, 26/26 expected checks ran ===` and the
8/8 failure-window table below.

Checks 1–10 (ordinary first pass, exactly-one-rebuild, idempotent second
pass, no-target, pre-existing rollback, body/owner/security-mode drift, the
`authenticated`-grant ACL drift, and the pre-bounding rebuild-count defect
reproduction) are unchanged in behavior from the previous round — see that
round's results above. New this round:

11. **Guard — ACL drift, PUBLIC grant**: raised `... acl: expected exactly 1
    ACL entry (owner-only EXECUTE), found 2: {postgres=X/postgres,=X/
    postgres} | acl: unexpected EXECUTE grant to anon | ... authenticated |
    ... service_role | ... PUBLIC` (the structural row-count check and every
    named-role check that applies all fire in one message — PUBLIC's
    implicit membership means the anon/authenticated/service_role checks
    also see it as having EXECUTE via PUBLIC).
12. **Guard — ACL drift, empty ACL**: raised `... acl: expected exactly 1
    ACL entry (owner-only EXECUTE), found 0: {}` — reached via
    `revoke all ... from postgres` (the real, DDL-reachable empty-ACL path;
    see the "This round" section above for the raw-catalog-literal variant
    that instead makes `aclexplode()` itself error, not exercised as a
    fixture here).
13. **Guard — ACL drift, grantability**: raised `... acl: sole entry's
    is_grantable expected false, found true: {postgres=X*/postgres}` — the
    grantee is still the owner (this is exactly the drift shape the
    *previous* round's `grantee <> owner` check could not have caught).
14. **Guard — ACL drift, second entry naming a non-hardcoded role**: raised
    `... acl: expected exactly 1 ACL entry (owner-only EXECUTE), found 2:
    {postgres=X/postgres,drift_other_role=X/postgres}` — no
    anon/authenticated/service_role/PUBLIC diagnostic fires (correctly: none
    of those roles are involved), proving the structural row-count check,
    not a named check, is what gates this.
15. **Guard — search_path changed to `public`**: raised `... search_path:
    expected exactly one config entry, search_path="" (i.e. SET search_path
    TO ''), found {search_path=public}`.
16. **Guard — proconfig missing entirely** (`RESET search_path`): raised
    `... search_path: ... found NULL` — confirmed empirically this round
    that `RESET` (unlike `SET` to a different value) makes `proconfig` `NULL`
    outright, a materially different catalog state from check 15's.
17. **Guard — extra GUC alongside the expected empty search_path**: raised
    `... search_path: ... found {"search_path=\"\"",statement_timeout=5000}`
    — `search_path` itself is exactly right; the array-length check is what
    catches this.
18. **Guard — function comment drift**: raised `... comment: expected no
    comment on this function, found 'drift: this function should have no
    comment'`.
19–26. **Eight required failure windows**: all 8 PASS — see "Eight required
    failure windows" above for the table and `run-verification.sh`'s own
    printed 8/8 breakdown, reproduced here verbatim from an actual run:
    ```
    === 8/8 failure-window table ===
      window 1: PASS
      window 2: PASS
      window 3: PASS
      window 4: PASS
      window 5: PASS
      window 6: PASS
      window 7: PASS
      window 8: PASS
    ```

`run-verification.sh` output: `=== SUMMARY: 26 passed, 0 failed, 26/26
expected checks ran ===` (both clusters). The script also hard-fails (exits
nonzero with an explicit `HARNESS INCOMPLETE` message) if the number of
checks that actually ran does not equal the expected 26 — for example if an
earlier `set -e` failure had short-circuited a later section — so an
incomplete run cannot silently present as a clean pass.

## Limitations

- `refresh_game_metric_snapshots_internal`, `rebuild_metric_summaries_base`,
  and `rebuild_additional_metric_summaries` are stubbed, not executed
  verbatim — the *migration file itself* is real and unmodified, and (new
  this round) `rebuild_metric_summaries` itself now runs as a **verbatim
  copy** of its live production body, calling the stubbed base/additional
  functions exactly as production's real `rebuild_metric_summaries` calls
  its real base/additional functions. Only the innermost aggregation logic
  (global summary table contents) remains a marker-only stand-in — out of
  scope for this correction, which never reads or depends on those tables'
  contents, only on how many times the cascade that rebuilds them runs.
- Milestone/award snapshot columns are a deliberately reduced subset of
  production's real schema (no timing buckets, ROI, placement, or
  points-per-generation) — enough to prove delete+reinsert-per-target-game
  and byte-identical-for-non-target-games, not a full reimplementation of
  production's milestone/award snapshot logic, which this correction's
  target predicate never depends on.
- Runs against a local, empty, purpose-built schema, not a copy of
  production. Row counts and the specific production inventory (43
  games / 118 players at last read, up from 42/116 due to one newly
  finalized two-player game — see the correction-package doc) are
  separately verified via the read-only production queries in that doc, not
  reproduced here, and are not hardcoded into the migration's predicate or
  into this harness's fixtures. That inventory is point-in-time evidence;
  re-confirm with the doc's §4.3 queries immediately before any future
  authorization to apply.
- Not wired into `npm test` or CI — requires a local PostgreSQL 18 install.
  Re-run manually per the reproduction steps above when the migration
  changes.
- The Step 1.5 guard's `search_path` check compares `proconfig[1]` against
  the literal string `search_path=""`, which is how PostgreSQL 18.4
  represents a single `SET search_path TO ''` config entry in
  `pg_proc.proconfig` — confirmed empirically against this harness's own
  stub, not assumed from documentation. The guard's owner check compares
  against the literal string `'postgres'`, matching both this harness's
  bootstrap superuser and the live tm-stats database's function owner (per
  the correction-package doc) — this is specific to what this migration was
  actually reviewed against, not a generic "any owner is fine" check, by
  design (an owner change is exactly one of the drift categories the guard
  must catch).
- **The exact-ACL-identity guard's `aclexplode()` call is not itself wrapped
  in an exception handler.** For every ACL state reachable via normal
  GRANT/REVOKE DDL (confirmed empirically this round — see "This round"
  above), `aclexplode()` behaves as documented and the guard produces its
  own named `acl: ...` mismatch message. A genuinely zero-dimensional
  `aclitem[]` value — only constructible by directly writing to
  `pg_catalog.pg_proc.proacl` with a raw array literal or `ARRAY[]`
  constructor, never by any sequence of GRANT/REVOKE statements — makes
  `aclexplode()` itself raise `ERROR: ACL arrays must be one-dimensional`
  before the guard's own comparison logic runs. This is still fail-closed
  (the exception still aborts the migration before any mutation, exactly
  like every other guard rejection, because it happens during the guard's
  own read step), but it surfaces as a raw Postgres error rather than this
  guard's own `pre-migration guard (20260720223000) failed for
  public.rebuild_metric_summaries(): acl: ...` message. Not treated as a gap
  requiring a fix: the guard's job is to fail closed on drift, which it
  does here too, just with a less-branded error string, and only for a
  catalog state normal privilege administration cannot produce.
- The exact-ACL-identity guard's required test list (5 cases) includes
  "grantor or grantability" for the owner-entry-with-unexpected-property
  case; this round's fixture exercises grantability
  (`WITH GRANT OPTION`, directly constructible via plain `GRANT`) but not
  grantor (which would require a second role with delegated grant authority
  and a `SET ROLE`-based grant sequence to construct via DDL, not attempted
  this round). The guard code itself checks both grantor and grantability
  independently (see the migration's "Exact ACL identity correction"
  comment and Step 1.5's ACL block) — only the grantor branch lacks its own
  live-executed drift fixture in this harness.
