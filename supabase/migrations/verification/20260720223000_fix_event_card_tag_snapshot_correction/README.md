# Executable verification — `20260720223000_fix_event_card_tag_snapshot_correction.sql`

Not part of `npm test` / CI: this exercises the migration against a real,
disposable local PostgreSQL instance, which the vitest suite doesn't provision.
Committed so the exact fixtures, stubs, and results are reviewable and
reproducible rather than only described in prose.

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

# 7. Tear down
pg_ctl -D /tmp/pg-event-tag-verify stop
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
