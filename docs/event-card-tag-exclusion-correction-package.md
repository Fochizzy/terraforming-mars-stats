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
`cardType` is on an explicit known-safe list (`Automated`, `Active`,
`Project`, `Corporation`, `Prelude`), and returns `[]` for `Event` **or any
other, unrecognized card type** — an unfamiliar type is never silently
assumed to be a safe non-Event card.

Three call sites inherited the underlying "is this an Event?" question and
are corrected by threading `card_type` through to `countableCardTags`:

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
  at all. Both now select `card_type` alongside `gameplay_tags` and gate
  through the same `countableCardTags` helper, rather than reimplementing the
  exclusion rule a third and fourth time. These are live, active code paths
  (player profile "Engine Shape" section and the imported-game analytics
  fallback), not dormant ones — unlike `deriveCardScoreEvidence`, they were
  producing wrong counts today for any Event card carrying a non-`event`
  printed tag (confirmed present in production, e.g. `space`, `crime`).

`countable-card-tags.ts`'s fail-closed known-safe set intentionally stays a
local, dependency-free constant rather than importing
`PLAYABLE_CARD_TYPES`/`PROJECT_CARD_TYPES` from `reference-repo.ts` (so it
stays usable from scripts and analytics modules without pulling in the
Supabase-server-client-only reference layer); it is documented to track that
source of truth, and reused (not reimplemented) at all four call sites above.

## 2. Migration

| File | Role | Applies to production? |
| --- | --- | --- |
| `supabase/migrations/20260720223000_fix_event_card_tag_snapshot_correction.sql` | Refreshes the persisted metric snapshots for every game whose `game_player_tag_metric_snapshots` still carries a stale nonzero `event` tag_count, via the existing `refresh_game_metric_snapshots_internal` / `rebuild_metric_summaries` functions, then rebuilds the global/player aggregates. | **Not yet — unapplied.** |

No existing migration is edited or amended.

**Root table (`game_log_tag_summaries`) is read, never written, by this
migration.** An earlier draft of this migration also included a step that
zeroed any `game_log_tag_summaries` row with `tag_code = 'event' and
tag_count <> 0` directly, as a defensive measure. That step was removed: it
used `tag_code = 'event'` alone as a proxy for "this was an Event card play,"
which is not the actual contract — a recognized non-Event card can
legitimately carry a literal `event` gameplay tag and keep it (see
`countable-card-tags.test.ts`, "decides on canonical card type rather than
tag-code presence," and the identical case in
`derive-player-tag-summaries.test.ts`). A tag-code-only predicate can zero
evidence the corrected code would have kept. `game_log_tag_summaries` is
written once, per import, directly by the now-corrected derivation, so it
does not need a defensive SQL-level rewrite going forward. If a stray bad
root row is ever found, the safe correction is a card-type-aware
rederivation via `scripts/backfill/recompute-tag-summaries.ts` (which reuses
`derivePlayerTagSummaries` against current catalog `card_type` data), not a
blanket zero on a tag-code proxy.

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

-- Snapshot rows stale relative to root data — this is what the migration
-- actually targets.
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

**Reading this**: the import-time root table (`game_log_tag_summaries`) is
already clean for every game — the 109/39 anomaly is entirely *stale,
persisted metric snapshots* that were computed from the bug at some earlier
point and never refreshed afterward. The migration's sole job is refreshing
those 39 stale games' snapshots plus one global rebuild; root is read as
input to that refresh, never written.

No player names, aliases, usernames, or raw log text were retrieved to
produce this table — every query above is a `count(*)` / `count(distinct …)`
aggregate.

## 5. Verification (local — no production writes)

- **Migration SQL**: verified by direct reading, not execution — the `do $$
  … $$` block contains no `update`/`insert`/`delete` targeting
  `game_log_tag_summaries` (root) at all; the only writes are the delete+
  insert performed inside the pre-existing, unmodified
  `refresh_game_metric_snapshots_internal` function for the target game set,
  plus `rebuild_metric_summaries()`. Target-game selection
  (`v_target_game_ids`) is a single, guarded `select … where tag_code =
  'event' and tag_count <> 0` against `game_player_tag_metric_snapshots`,
  identical in shape to the still-present §3 dry-run query — the same read
  that already confirmed the current 109/39 figures.
- **Idempotency**: by construction — a second run's `select` finds zero
  stale rows (since the first run already refreshed them), so
  `v_target_game_ids` is `null` and the `if` body (the only thing that
  writes anything) never executes. No row-count/array-diff assertion is
  needed to establish this; it follows directly from the guard.
- `refresh_game_metric_snapshots_internal` / `rebuild_metric_summaries` were
  **not** re-derived or re-tested here: they are pre-existing, unmodified,
  already-in-production functions being invoked through their existing
  designed interface (`p_require_editor => false` for administrative use),
  not new logic authored by this change. Their current production definition
  was read directly (`pg_get_functiondef`) and confirmed to source
  `game_player_tag_metric_snapshots` purely from `game_log_tag_summaries`
  with no independent tag-derivation logic — i.e. correcting/leaving-correct
  root is sufficient to make a refresh correct.
- **Code fix** (`countableCardTags` and its four call sites): covered by
  unit and integration tests — `countable-card-tags.test.ts`,
  `derive-player-tag-summaries.test.ts`,
  `derive-card-score-evidence.test.ts`, an added Event-card fixture in
  `analytics-repo.test.ts` (`getProfileAnalytics`, asserting both the
  `tagOutcomes` and `engine_shape` "Top Card Tag" outputs), and a new
  `extended-analytics-repo.test.ts` (`listImportedCardAndTagOutcomes`). Each
  of the four call-site tests was confirmed to fail (showing the exact
  pre-fix miscounting) when the corresponding fix line was temporarily
  reverted, and to pass once restored — i.e. each is a genuine regression
  check, not an incidental pass.

## 6. Rollback / restoration evidence

- **Root table**: not written by this migration — nothing to roll back.
- **Snapshot tables**: `game_player_tag_metric_snapshots` and
  `game_player_metric_snapshots` are fully regenerated (delete + insert) by
  `refresh_game_metric_snapshots_internal` for exactly the affected game,
  the same way it already runs today (e.g., on finalize) — a rollback is
  simply "the state before this migration's run," recoverable from
  PITR/backup, or forward-fixable by re-running the migration again
  (idempotent).
- **Forward-only preference**: as with `data-capture-hardening-v2`, the
  intended remedy for any discrepancy discovered later is a forward re-run of
  this same migration (safe — see §5), not a destructive rollback.

## 7. Idempotency proof

See §5. A second run's target-game query returns zero rows (the first run
already refreshed every game the query would select), so the `if
v_target_game_ids is not null` body — the only code that writes anything —
does not execute on a second pass.

## 8. What this migration will NOT do

- Will not write to `game_log_tag_summaries` (root) at all — read-only
  input to the refresh.
- Will not touch `played_card_count`, `matched_card_count`, or
  `unresolved_card_count` anywhere.
- Will not touch any game outside the stale-snapshot set
  (`game_player_tag_metric_snapshots.tag_code='event' and tag_count<>0`).
- Will not run automatically — it is a prepared, unapplied `.sql` file only.

## 9. Deployment/backfill order (for the record — not executed here)

1. Deploy the code fix (this branch, once reviewed/merged) to `tm-stats.com`.
   This includes the `analytics-repo.ts`/`extended-analytics-repo.ts` fixes,
   which take effect immediately on deploy with no migration dependency.
2. Re-run §3's second query immediately before applying, in case new stale
   snapshots appeared between this report and deploy.
3. Apply `20260720223000_fix_event_card_tag_snapshot_correction.sql` through
   the approved production-change process.
4. Re-run §3's second query and confirm it returns 0.
5. Spot-check `player_metric_summaries.best_tag_lane = 'event'` returns 0.
