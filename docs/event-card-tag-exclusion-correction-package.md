# Historical correction package — Event-card tag exclusion

Status: **prepared and locally verified; production not mutated.** Awaiting
explicit authorization before any migration application, backfill, or metric
refresh against production.

Base: `origin/release/b05-auth-resilience-code-only` @
`341d0d23a94b5dc80e49da374a55b9690291f277`.
Candidate branch: `fix/event-card-tag-exclusion`.
Supabase project: `tm-stats` (`qjtwgrjjwnqafbvkkfex`, us-east-1, ACTIVE_HEALTHY).

## 1. Defect

`countableCardTags` (`src/lib/imports/countable-card-tags.ts`) decided
"is this an Event?" from `sourceTags.includes('event')` instead of the card's
canonical `card_type`, and even when it correctly detected an Event, it kept
one tag (`event`) instead of zero. The prospective fix makes `countableCardTags`
take `cardType` explicitly and fails closed: it returns `sourceTags` only when
`cardType` is on an explicit known-safe list, and returns `[]` for `Event`
**or any other, unrecognized card type** — an unfamiliar type is never
silently assumed to be a safe non-Event card.

Four call sites inherited the underlying "is this an Event?" question and are
all corrected by threading `card_type` through to `countableCardTags`, which
every one of them now imports and reuses rather than reimplementing:

- `derive-player-tag-summaries.ts` — the live import path that writes
  `game_log_tag_summaries` at import time.
- `derive-card-score-evidence.ts` — card-scoring VP evidence. Currently has
  no production caller (`calculateImportCardScores` is prepared but not yet
  wired into the import flow), so this fix is correct but presently inert.
- `analytics-repo.ts` (`listProfileCardCatalogRows` → the profile "engine"
  tag tally and `buildProfileTagStats`) and `extended-analytics-repo.ts`
  (`listImportedCardAndTagOutcomes`, the JS-side fallback used when the
  `player_card_outcomes`/`player_tag_outcomes` analytics views return no
  rows) — two **independent** tag-aggregation implementations that read
  `cards.gameplay_tags` directly and previously had no `card_type` awareness
  at all. Both now select `card_type` alongside `gameplay_tags`. These are
  live, active code paths (player profile "Engine Shape" section and the
  imported-game analytics fallback), not dormant ones — unlike
  `deriveCardScoreEvidence`, they were producing wrong counts today for any
  Event card carrying a non-`event` printed tag (confirmed present in
  production, e.g. `space`, `crime`).

### Canonical vocabulary — single source, not four copies

`countableCardTags`'s known-safe set previously duplicated
`PLAYABLE_CARD_TYPES`/`PROJECT_CARD_TYPES` from `reference-repo.ts` as a
hand-copied local `Set`, tied together only by a code comment. That could
silently drift: a future addition to the canonical vocabulary would not
automatically reach the tag-counting set, and nothing would fail to flag it.

Closed by moving the vocabulary itself into a new, genuinely dependency-free
module, `src/lib/cards/card-type-vocabulary.ts` (no Supabase client, no
Next.js runtime import — safe from `src/lib/db`, `src/lib/imports`, catalog
scripts, and tests alike):

- `PROJECT_CARD_TYPES` / `PLAYABLE_CARD_TYPES` / `EVENT_CARD_TYPE` — moved
  here verbatim from `reference-repo.ts`, which now imports and re-exports
  them (so every existing `import { PLAYABLE_CARD_TYPES } from
  '@/lib/db/reference-repo'` elsewhere in the codebase keeps working
  unchanged).
- `TAG_COUNTING_CARD_TYPES` — **derived**, not duplicated:
  `PLAYABLE_CARD_TYPES.filter((cardType) => cardType !== EVENT_CARD_TYPE)`.
  `countable-card-tags.ts` builds its `Set` from this constant. A type added
  to `PLAYABLE_CARD_TYPES` in the future is automatically tag-counting here
  too, with no second edit and no possibility of drift, because there is only
  one array to edit.
- `scripts/backfill/recompute-tag-summaries.ts` now imports
  `PLAYABLE_CARD_TYPES` from this same module directly, rather than via
  `reference-repo.ts` (which pulls in `next/headers` at import time — fine
  inside the Next.js server runtime, unnecessary risk for a plain `tsx`
  script).

Tests: `src/lib/cards/card-type-vocabulary.test.ts` asserts the current
vocabulary and the derivation; `countable-card-tags.test.ts` adds a test that
drives `countableCardTags` off the actual shared constants (iterating
`TAG_COUNTING_CARD_TYPES` and the complement) rather than literal strings, so
a mismatch between the vocabulary and the function's behavior — not just
between two copies of a list — fails the test.

## 2. Migration

| File | Role | Applies to production? |
| --- | --- | --- |
| `supabase/migrations/20260720223000_fix_event_card_tag_snapshot_correction.sql` | Refreshes persisted metric snapshots for every game matching either staleness signal below, via the existing `refresh_game_metric_snapshots_internal` / `rebuild_metric_summaries` functions, then rebuilds the global/player aggregates. | **Not yet — unapplied.** |

No existing migration is edited or amended.

**Root table (`game_log_tag_summaries`) is read, never written, by this
migration.** An earlier draft also included a step that zeroed any
`game_log_tag_summaries` row with `tag_code = 'event' and tag_count <> 0`
directly. That step was removed: it used `tag_code = 'event'` alone as a
proxy for "this was an Event card play," which is not the actual contract —
a recognized non-Event card can legitimately carry a literal `event`
gameplay tag and keep it (see `countable-card-tags.test.ts`, "decides on
canonical card type rather than tag-code presence," and the identical case
in `derive-player-tag-summaries.test.ts`). A tag-code-only predicate can zero
evidence the corrected code would have kept. `game_log_tag_summaries` is
written once, per import, directly by the now-corrected derivation, so it
does not need a defensive SQL-level rewrite; if a stray bad root row is ever
found, the safe correction is a card-type-aware rederivation via
`scripts/backfill/recompute-tag-summaries.ts`, not a blanket zero on a
tag-code proxy.

### Migration target: exact conditions

Target-game selection is the union of two independent staleness signals:

1. **Stale nonzero Event-tag snapshot row** — a
   `game_player_tag_metric_snapshots` row still shows `tag_code = 'event'
   and tag_count <> 0`, which root no longer supports.
2. **Total-tag-count mismatch** — a player's persisted
   `game_player_metric_snapshots.total_tag_count` no longer matches what a
   fresh refresh would currently compute from root, using the exact identity
   resolution `refresh_game_metric_snapshots_internal` itself uses (root's
   own `game_player_id` when populated, name/alias resolution as fallback
   when it isn't) — copied read-only into the migration's target-selection
   query for comparison purposes only, so it can never select a different
   player than the refresh would actually credit.

Signal 2 exists because a stale `total_tag_count` is not guaranteed to
coincide with a currently-nonzero `event` snapshot row — e.g. if some
earlier, unrelated process had already zeroed a snapshot's `event` row
without recomputing its sibling `total_tag_count`. Neither signal inspects
or assumes *why* root and the snapshot disagree; both simply ask "would a
refresh change this game's data," which is exactly the condition a
snapshot-refresh migration should target. Proven with an executable fixture
specifically for this case — see §6.

## 3. Dry-run query (read-only; run this first against production)

```sql
-- Root-level rows the old bug could have written directly. Informational
-- only — this migration does not act on this table. If this is ever nonzero,
-- do not blanket-zero it; rederive via recompute-tag-summaries.ts instead
-- (see §1/§2), since a nonzero row here is not proof the play was an Event.
select count(*)                                   as root_event_nonzero_rows,
       count(distinct game_log_import_id)         as affected_imports
from public.game_log_tag_summaries
where tag_code = 'event' and tag_count <> 0;

-- Snapshot rows stale relative to root data via signal 1 (see §2) — this is
-- one of the two conditions the migration targets. It does not by itself
-- cover signal 2 (total_tag_count mismatch with no nonzero event row); no
-- known production case currently requires signal 2 (see §4), so no
-- additional dry-run query for it is included here.
select count(*)                    as affected_tag_snapshot_rows,
       count(distinct game_id)     as affected_games
from public.game_player_tag_metric_snapshots
where tag_code = 'event' and tag_count <> 0;
```

Both queries are idempotent to re-run at any time and were the exact queries
used to produce §4.

## 4. Affected-row inventory (production, read as of 2026-07-20, aggregates only)

| Metric | Value |
| --- | --- |
| `game_log_tag_summaries` rows with `tag_code='event' and tag_count<>0` | **0** |
| `game_log_tag_summaries` total rows | 1,694 |
| `game_player_tag_metric_snapshots` rows with `tag_code='event' and tag_count<>0` | **109** |
| Distinct `game_id` behind those 109 rows | **39** (all `status = 'finalized'`) |
| Of those 39 games: root `game_log_tag_summaries` already has zero event-tag contribution | **39 / 39** |
| Of those 39 games: root import rows fully deleted (orphaned snapshot) | **0 / 39** |
| `game_player_metric_snapshots` rows among the 39 games whose `total_tag_count` disagrees with a fresh recomputation from root | **109 / 109** |
| `player_metric_summaries.best_tag_lane = 'event'` | **2** players |
| `player_map_metric_summaries.best_tag_lane_on_map = 'event'` | 0 |
| `global_map_metric_summaries.best_tag_lane = 'event'` | 0 |
| `global_tag_metric_summaries` rows with `tag_code = 'event'` | 3 |

**Reading this**: as last read, every `total_tag_count` mismatch in
production coincides 1:1 with a nonzero `event` snapshot row (109/109) — i.e.
signal 2 (§2) currently selects no *additional* games beyond signal 1 in
production. Signal 2 is included anyway because that 1:1 coincidence is a
property of the current data, not a structural guarantee (nothing prevents a
future case where they diverge, e.g. a partial fix to one but not the other)
— the same reasoning that removed the tag-code-proxy root step in §2. This
table was not re-read during the gap-closure pass (production was not
accessed this task); the underlying counts should be re-confirmed with §3
immediately before deploy per §9.

No player names, aliases, usernames, or raw log text were retrieved to
produce this table — every query above is a `count(*)` / `count(distinct …)`
aggregate.

## 5. Code-fix verification (local — no production writes)

Covered by unit and integration tests — `countable-card-tags.test.ts`,
`derive-player-tag-summaries.test.ts`, `derive-card-score-evidence.test.ts`,
an added Event-card fixture in `analytics-repo.test.ts`
(`getProfileAnalytics`, asserting both the `tagOutcomes` and `engine_shape`
"Top Card Tag" outputs), and `extended-analytics-repo.test.ts`
(`listImportedCardAndTagOutcomes`). Each of the four call-site tests was
confirmed to fail (showing the exact pre-fix miscounting) when the
corresponding fix line was temporarily reverted, and to pass once restored —
i.e. each is a genuine regression check, not an incidental pass. Vocabulary
synchronization is covered per §1.

## 6. Migration verification — executable, not just read

The migration was executed against a disposable local PostgreSQL 18
instance, running the **actual migration file** (not a reimplementation of
its predicates in a separate script). Harness committed at
`supabase/migrations/verification/20260720223000_fix_event_card_tag_snapshot_correction/`
(schema/stub SQL, fixtures, rollback-test setup, and a README with exact
reproduction steps and results).

Four fixture games proved, against the real file:

1. **Zero matching → zero writes, no rebuild**: proven by the second-pass
   run (see below) — after the first pass, no game matches either signal, and
   a full state dump before/after the second run is byte-identical.
2. **Stale nonzero Event-tag snapshot → refreshed**: game B (root already
   clean, snapshot `event` row stuck at `tag_count=1`) — corrected to `0`,
   `total_tag_count` corrected `2 → 1`.
3. **Total-tag-count mismatch, no nonzero Event row → refreshed**: game C
   (root consistent, no `event` row at all; snapshot's only per-tag row
   already correct, but `total_tag_count` stale at `5` vs. a fresh `3`) —
   corrected to `3`. This is the fixture that specifically exercises signal 2
   from §2 and would not have been caught by a signal-1-only query.
4. **Already-correct game untouched**: games A and D — zero row changes,
   `updated_at` unchanged.
5. **Unrelated tag rows unchanged**: game B's `space` row and game C's
   `building` row kept their correct values through the refresh.
6. **Card-play counts unchanged**: `played_card_count` /
   `matched_card_count` / `unresolved_card_count` identical before and after
   for every row.
7. **Second execution is a no-op**: full state dump byte-identical to the
   post-first-run dump, including every `updated_at` and the rebuild-marker
   count.
8. **Atomic rollback on failure**: re-staled game B, added a poison game
   whose (stubbed) refresh deliberately raises, then re-ran the real
   migration file. It exited nonzero with the raised error; the post-failure
   state dump was byte-identical to the pre-run dump — game B's would-be
   correction was rolled back along with the poison game's, even though B
   was part of the same batch.
9. **Root never written**: `game_log_tag_summaries` — identical before and
   after every run in the harness, including every row's `updated_at`.

`refresh_game_metric_snapshots_internal` / `rebuild_metric_summaries` were
invoked through a **simplified stub**, not the real production functions —
documented as the harness's limitation (see its README): the stub faithfully
reimplements the identity resolution and the tag/total_tag_count columns this
correction depends on, but not milestone/award/scoring-share snapshot
rebuilding, which is out of scope for this correction and untouched by it.
Their real production definitions were separately read directly via
`pg_get_functiondef` (not assumed) and confirmed to source
`game_player_tag_metric_snapshots`/`total_tag_count` purely from
`game_log_tag_summaries`, consistent with what the stub reproduces. The
migration file itself, and its target-selection query, ran unmodified and
verbatim in every step above.

## 7. Rollback / restoration evidence

- **Root table**: not written by this migration — nothing to roll back.
- **Snapshot tables**: `game_player_tag_metric_snapshots` and
  `game_player_metric_snapshots` are fully regenerated (delete + insert) by
  `refresh_game_metric_snapshots_internal` for exactly the affected game,
  the same way it already runs today (e.g., on finalize) — a rollback is
  simply "the state before this migration's run," recoverable from
  PITR/backup, or forward-fixable by re-running the migration again
  (idempotent — see §6 item 7).
- **Forward-only preference**: as with `data-capture-hardening-v2`, the
  intended remedy for any discrepancy discovered later is a forward re-run of
  this same migration (safe — see §6), not a destructive rollback.

## 8. What this migration will NOT do

- Will not write to `game_log_tag_summaries` (root) at all — read-only
  input to the refresh, including the read-only identity-resolution copy
  used for signal 2's target selection.
- Will not touch `played_card_count`, `matched_card_count`, or
  `unresolved_card_count` anywhere.
- Will not touch any game outside the union of the two staleness signals in
  §2.
- Will not run automatically — it is a prepared, unapplied `.sql` file only.

## 9. Deployment/backfill order (for the record — not executed here)

1. Deploy the code fix (this branch, once reviewed/merged) to `tm-stats.com`.
   This includes the `analytics-repo.ts`/`extended-analytics-repo.ts` fixes
   and the shared vocabulary module, which take effect immediately on
   deploy with no migration dependency.
2. Re-run §3's queries immediately before applying, in case new stale
   snapshots appeared between this report and deploy. §4's "no additional
   signal-2 games today" reading should be re-confirmed at the same time,
   since it was not re-checked during the gap-closure pass.
3. Apply `20260720223000_fix_event_card_tag_snapshot_correction.sql` through
   the approved production-change process.
4. Re-run §3's second query and confirm it returns 0.
5. Spot-check `player_metric_summaries.best_tag_lane = 'event'` returns 0.
