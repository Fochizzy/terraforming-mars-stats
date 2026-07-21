# Executable verification — `20260720223000_fix_event_card_tag_snapshot_correction.sql`

Not part of `npm test` / CI: this exercises the migration against a real,
disposable local PostgreSQL instance, which the vitest suite doesn't provision.
Committed so the exact fixtures, stubs, and results are reviewable and
reproducible rather than only described in prose.

## What this proves

Runs the **actual repository migration file** (`\i ../../20260720223000_fix_event_card_tag_snapshot_correction.sql`,
not a reimplementation of its predicates) against seeded fixtures, and proves
all eight properties required for this correction:

1. Zero matching games → zero writes, no aggregate rebuild.
2. A game with a stale nonzero `event` tag_count snapshot row → refreshed.
3. A game whose `total_tag_count` disagrees with root but has **no** nonzero
   `event` snapshot row → refreshed (the specific case Gap 2 added — a
   per-tag-only check would miss this game entirely).
4. An already-correct game → remains fully untouched.
5. Unrelated tag rows (non-`event` tag codes on games that *are* refreshed)
   → values unchanged.
6. Card-play counts (`played_card_count`/`matched_card_count`/`unresolved_card_count`)
   → unchanged everywhere.
7. A second execution → performs no corrective work (byte-identical state,
   including every `updated_at`).
8. A failure partway through the refresh loop → rolls back atomically, even
   for a game that would have succeeded had it processed before the failure.

## Fixtures (`02-seed-fixtures.sql`)

Four games, one group, three players:

| Game | Root (`game_log_tag_summaries`) | Snapshot before | Expected after migration |
| --- | --- | --- | --- |
| A | `space=2, building=1`, `total_tag_count=3` (consistent) | matches root | **untouched** |
| B | `space=1, event=0`, `total_tag_count=1` (root already clean) | `event=1` (stale), `total_tag_count=2` (stale) | `event` corrected to `0`, `total_tag_count` corrected to `1` |
| C | `building=3`, `total_tag_count=3` (consistent); **no `event` row at all** | `building=3` (already correct), `total_tag_count=5` (stale) | `total_tag_count` corrected to `3` — via the total-mismatch signal alone |
| D | `microbe=4`, `total_tag_count=4` (consistent) | matches root | **untouched** |

## Stubs (`01-schema-and-stubs.sql`)

- `metric_normalized_label` — copied verbatim from
  `20260708142459_add_persisted_metric_snapshots.sql`.
- `refresh_game_metric_snapshots_internal` — **simplified stub**. Faithfully
  reimplements the identity resolution (`game_player_id` when root already
  carries it, name/alias fallback when it doesn't) and the tag-count columns
  this correction actually depends on
  (`game_player_tag_metric_snapshots` in full,
  `game_player_metric_snapshots.total_tag_count`/played-card counts). Does
  **not** implement milestone/award/scoring-share snapshot rebuilding — out
  of scope for this correction and untouched by it. This is the one place a
  production-only function had to be stubbed rather than run verbatim; noted
  here as the limitation.
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
#    zero differences.
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

- First pass: `DO` (success). Game A/D: no row changes, `updated_at`
  unchanged. Game B: `event` snapshot `tag_count` `1 → 0`,
  `game_player_metric_snapshots.total_tag_count` `2 → 1`. Game C: no
  per-tag row changed value, `game_player_metric_snapshots.total_tag_count`
  `5 → 3` — refreshed via the total-mismatch signal with **zero** nonzero
  `event` row involved. `_rebuild_marker` count `0 → 1`. Root
  `game_log_tag_summaries`: identical before/after, including every
  `updated_at` — confirmed never written.
- Second pass: `DO` (success). Full state dump byte-identical to the
  post-first-pass dump — zero writes, `_rebuild_marker` count unchanged at
  `1`.
- Rollback: re-staled game B (`total_tag_count` back to `2`) and added a
  poison game whose stubbed refresh raises. Running the real migration file
  produced `ERROR: simulated refresh failure for poison game …`, psql exit
  code `3`. Post-failure dump is byte-identical to the pre-run dump — game
  B's write was rolled back along with the poison game's, even though B was
  part of the same batch. `_rebuild_marker` count unchanged (Step 3 never
  reached).

## Limitations

- `refresh_game_metric_snapshots_internal` is stubbed, not executed verbatim
  (see above) — the *migration file itself* is real and unmodified; only the
  production function it calls is a simplified stand-in, because replicating
  the full `games`/`game_players`/`milestones`/`awards`/scoring-share schema
  graph was judged disproportionate to what this correction needs to prove
  (the tag/total_tag_count columns).
- Runs against a local, empty, purpose-built schema, not a copy of
  production. Row counts and the specific 39-game/109-row production
  inventory are separately verified via the read-only production queries in
  the correction-package doc, not reproduced here.
- Not wired into `npm test` or CI — requires a local PostgreSQL 18 install.
  Re-run manually per the reproduction steps above when the migration
  changes.
