# Executable verification — `20260720223000_fix_event_card_tag_snapshot_correction.sql`

Not part of `npm test` / CI: this exercises the migration against a real,
disposable local PostgreSQL instance, which the vitest suite doesn't provision.
Committed so the exact fixtures, stubs, and results are reviewable and
reproducible rather than only described in prose.

## History

This harness has caught two real defects in earlier drafts of this migration,
not just confirmed a correct one on the first attempt:

- **Gap 2** (closed earlier): the original total-tag-count comparison
  `inner join`ed persisted snapshots to a root rollup, silently dropping any
  game_player whose root-derived expected total was zero.
- **Signal (a) tag-code-proxy** (closed this round): target selection for the
  per-tag `event` row was `tag_code = 'event' and tag_count <> 0` — treating
  *any* nonzero count as proof of staleness, rather than comparing it against
  root. A legitimate nonzero `event` tag (a recognized non-Event card
  genuinely carrying a literal `event` gameplay tag — see
  `countable-card-tags.test.ts`) was selected and rewritten on **every**
  run, breaking repeat-safety, not just over-scoping.
- **Zero-root total mismatch, revisited**: the fix for Gap 2 still missed the
  case where root has *zero* tag rows at all for a player (not just a
  low/zero rollup) and the case where the persisted
  `game_player_metric_snapshots` row is entirely absent (never snapshotted).

The current fixtures (`02-seed-fixtures.sql`) and migration both reflect the
corrected semantics: every comparison is root-value versus snapshot-value —
never "is the snapshot value nonzero" — over the union of every
`game_player_id` either side has evidence for, so absence on either side
compares as zero via `coalesce(...)` rather than being silently dropped.

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
    failure.
13. Root `game_log_tag_summaries` → byte-identical before and after every
    run in this harness.

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
- `refresh_game_metric_snapshots_internal` — **simplified stub**, strengthened
  this round to **delete-then-insert** `game_player_metric_snapshots` (not a
  plain `UPDATE`), so a game whose players have never been snapshotted before
  (Game I) gets a correct row created rather than silently doing nothing —
  matching production's actual unconditional per-game-player INSERT. Also
  now checks `games.status = 'finalized'` before writing, matching
  production's early-return for non-finalized games. Faithfully reimplements
  the identity resolution (`game_player_id` when root already carries it,
  name/alias fallback when it doesn't) and the tag-count columns this
  correction actually depends on. Does **not** implement milestone/award/
  scoring-share snapshot rebuilding — out of scope for this correction and
  untouched by it. This is the one place a production-only function had to
  be stubbed rather than run verbatim; noted here as the limitation.
- `rebuild_metric_summaries` — stub that records a call in a marker table
  (`_rebuild_marker`), to prove *whether* it ran, without reimplementing the
  global aggregate rebuild it performs in production (also out of scope).

## Reproduction

```sh
# 1. Disposable cluster (adjust the PostgreSQL 18 bin path if different)
initdb -D /tmp/pg-event-tag-verify -U postgres --auth=trust
pg_ctl -D /tmp/pg-event-tag-verify -o "-p 55433" -l /tmp/pg-event-tag-verify.log start

# 2. Schema, stubs, fixtures
psql -h localhost -p 55433 -U postgres -v ON_ERROR_STOP=1 -f 01-schema-and-stubs.sql
psql -h localhost -p 55433 -U postgres -v ON_ERROR_STOP=1 -f 02-seed-fixtures.sql

# 3. Run the REAL migration file (first pass)
psql -h localhost -p 55433 -U postgres -v ON_ERROR_STOP=1 \
  -f ../../20260720223000_fix_event_card_tag_snapshot_correction.sql
psql -h localhost -p 55433 -U postgres -f dump-state.sql   # inspect

# 4. Idempotency: run it again, diff against the post-first-run dump — expect
#    zero differences, including Game F's row.
psql -h localhost -p 55433 -U postgres -v ON_ERROR_STOP=1 \
  -f ../../20260720223000_fix_event_card_tag_snapshot_correction.sql
psql -h localhost -p 55433 -U postgres -f dump-state.sql

# 5. Rollback: re-stale game B, add a poison game whose refresh throws, then
#    run the real migration file again — expect a nonzero exit and a
#    byte-identical dump before/after (including game B, unresolved).
psql -h localhost -p 55433 -U postgres -v ON_ERROR_STOP=1 -f 03-rollback-test-setup.sql
psql -h localhost -p 55433 -U postgres -v ON_ERROR_STOP=1 \
  -f ../../20260720223000_fix_event_card_tag_snapshot_correction.sql   # expect ERROR, exit 3

# 6. Tear down
pg_ctl -D /tmp/pg-event-tag-verify stop
```

## Actual results (this run, PostgreSQL 18.4, 2026-07-20)

- First pass: `DO` (success). Games A/D: no row changes, `updated_at`
  unchanged. Game B: `event` `1 → 0`, total `2 → 1`. Game C: total `5 → 3`,
  `building` value unchanged. **Game F: no row changes, `updated_at`
  unchanged — correctly left alone.** **Game G: total `7 → 0`.** Game H:
  `event` row created (`tag_count=2`), matching root. **Game I:
  `game_player_metric_snapshots` row created from nothing (`total_tag_count=3`)**.
  `_rebuild_marker` count `0 → 1`. Root `game_log_tag_summaries`: identical
  before/after, including every row's `updated_at` — confirmed never
  written.
- Second pass: `DO` (success). Full state dump byte-identical to the
  post-first-pass dump — zero writes, `_rebuild_marker` count unchanged at
  `1`. **Game F's row specifically confirmed not re-touched.**
- Rollback: re-staled game B and added a poison game whose stubbed refresh
  raises. Running the real migration file produced
  `ERROR: simulated refresh failure for poison game …`, psql exit code `3`.
  Post-failure dump is byte-identical to the pre-run dump — game B's write
  was rolled back along with the poison game's. `_rebuild_marker` count
  unchanged (Step 3 never reached).
- Defect reproduction (pre-correction migration text): Game F selected and
  rewritten on both the first and second run (repeat-safety violated); Game
  G, H, and I all left stale/incomplete (silently missed). See "Defect
  reproduction" above.

## Limitations

- `refresh_game_metric_snapshots_internal` is stubbed, not executed verbatim
  (see above) — the *migration file itself* is real and unmodified; only the
  production function it calls is a simplified stand-in, because replicating
  the full `games`/`game_players`/`milestones`/`awards`/scoring-share schema
  graph was judged disproportionate to what this correction needs to prove
  (the tag/total_tag_count columns and per-game-player row creation).
- Runs against a local, empty, purpose-built schema, not a copy of
  production. Row counts and the specific 39-game/109-row production
  inventory are separately verified via the read-only production queries in
  the correction-package doc, not reproduced here. That inventory has not
  been re-read against production during any gap-closure round after the
  original review; re-confirm with the doc's §3 queries before deploy.
- Not wired into `npm test` or CI — requires a local PostgreSQL 18 install.
  Re-run manually per the reproduction steps above when the migration
  changes.
