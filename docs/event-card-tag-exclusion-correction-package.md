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
one tag (`event`) instead of zero. Both derivation call sites
(`derive-player-tag-summaries.ts`, `derive-card-score-evidence.ts`) inherited
the bug. The prospective fix (this branch) makes `countableCardTags` take
`cardType` explicitly and return `[]` whenever `cardType === 'Event'`.

## 2. Migration

| File | Role | Applies to production? |
| --- | --- | --- |
| `supabase/migrations/20260720223000_fix_event_card_tag_snapshot_correction.sql` | Zeroes any remaining root-level `event` tag_count rows, recomputes their sibling `total_tag_count`, then refreshes every affected game's persisted metric snapshots via the existing `refresh_game_metric_snapshots_internal` / `rebuild_metric_summaries` functions. | **Not yet — unapplied.** |

No existing migration is edited or amended.

## 3. Dry-run query (read-only; run this first against production)

```sql
-- Root-level rows the bug wrote directly (forward-looking; see §4 for why
-- this is currently 0 rows in production).
select count(*)                                   as affected_event_rows,
       count(distinct game_log_import_id)         as affected_imports
from public.game_log_tag_summaries
where tag_code = 'event' and tag_count <> 0;

-- Snapshot rows stale relative to (already-clean) root data — this is where
-- the current production anomaly actually lives.
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
currently already clean for every game — the 109/39 anomaly is entirely
*stale, persisted metric snapshots* that were computed from the bug at some
earlier point and never refreshed afterward. The migration's step 1–2 (root
fix) is therefore a defensive no-op today, guarding only against imports made
by the not-yet-fixed live code between now and deploy. The real fix today is
steps 3–5 (targeted refresh of the 39 stale games + one global rebuild).

No player names, aliases, usernames, or raw log text were retrieved to
produce this table — every query above is a `count(*)` / `count(distinct …)`
aggregate.

## 5. Verification (local, executable — no production writes)

The root-level SQL logic (migration steps 1–2) was verified against a
disposable local PostgreSQL 18 cluster (`initdb` + a standalone table
matching the `game_log_tag_summaries` columns actually touched), seeded with:

- a "bugged" import (`event` tag_count=1, `total_tag_count` inflated by 1),
- an "already clean" import (`event` tag_count=0),
- an unrelated control import with no `event` row at all.

Confirmed by direct assertion:

- the bugged import's `event` row is zeroed, its `total_tag_count` recomputes
  to the correct value, and its *other* tag rows (`building`, `space`) are
  untouched at the exact `tag_count` value they started with;
- the clean import and the unrelated control import are **not written at
  all** (row-level no-op, not just value-preserving);
- `played_card_count` / `matched_card_count` / `unresolved_card_count` are
  never modified by any step;
- re-running the identical steps a second time finds zero rows to touch
  (idempotency proof — a full before/after row diff over every column shows
  0 changed rows on the second pass);
- running against an empty table is a safe no-op.

Steps 3–5 (`refresh_game_metric_snapshots_internal`,
`rebuild_metric_summaries`) were **not** re-derived or re-tested here: they
are pre-existing, unmodified, already-in-production functions being invoked
through their existing designed interface (`p_require_editor => false` for
administrative use), not new logic authored by this change. Their current
production definition was read and confirmed unchanged in the relevant
respect (still sourced solely from `game_log_tag_summaries`). Replicating the
full `games` / `game_players` / `milestones` / `awards` schema graph locally
to re-verify them was judged disproportionate to this fix's scope.

## 6. Rollback / restoration evidence

- **Root table**: every row this migration could touch already has its
  pre-image recoverable — `tag_code='event'` rows are only ever set to 0
  from a previously-nonzero value; if a rollback is ever needed, restore from
  the most recent database backup/PITR predating the migration's `updated_at`
  timestamp. No row is deleted at any step.
- **Snapshot tables**: `game_player_tag_metric_snapshots` and
  `game_player_metric_snapshots` are fully regenerated (delete + insert) by
  `refresh_game_metric_snapshots_internal` for exactly the affected game
  every time it already runs today (e.g., on finalize) — a rollback is simply
  "the state before this migration's run," recoverable from PITR/backup, or
  forward-fixable by re-running the migration again (idempotent).
- **Forward-only preference**: as with `data-capture-hardening-v2`, the
  intended remedy for any discrepancy discovered later is a forward re-run of
  this same migration (safe — see idempotency proof), not a destructive
  rollback.

## 7. Idempotency proof

See §5. Second-run assertion explicitly checked: `v_affected_import_ids` is
`NULL` on the second pass (zero rows matched), and a full row-level diff
between the pre-second-run snapshot and post-second-run state shows 0 rows
with a changed `tag_count` or `total_tag_count`.

## 8. What this migration will NOT do

- Will not touch any `tag_code` other than `event` (`tag_count` column).
- Will not touch `played_card_count`, `matched_card_count`, or
  `unresolved_card_count` anywhere.
- Will not touch any game that isn't in the affected set (root-nonzero-event
  ∪ stale-snapshot-event).
- Will not run automatically — it is a prepared, unapplied `.sql` file only.

## 9. Deployment/backfill order (for the record — not executed here)

1. Deploy the code fix (this branch, once reviewed/merged) to `tm-stats.com`.
2. Re-run §3's dry-run queries immediately before applying, in case new
   imports landed between this report and deploy.
3. Apply `20260720223000_fix_event_card_tag_snapshot_correction.sql` through
   the approved production-change process.
4. Re-run §3's queries and confirm both return 0.
5. Spot-check `player_metric_summaries.best_tag_lane = 'event'` returns 0.
