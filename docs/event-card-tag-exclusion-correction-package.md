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

**Important, load-bearing fact for §2 below**: a *recognized non-Event* card
can legitimately carry a literal `event` gameplay tag and it counts normally
— `countableCardTags` decides purely on `card_type`, never on whether a tag
happens to be spelled `event`. Confirmed by
`countable-card-tags.test.ts` ("decides on canonical card type rather than
tag-code presence") and the identical case in
`derive-player-tag-summaries.test.ts`. This means **a nonzero `event` tag
count, anywhere — root or snapshot — is never by itself evidence of a bug or
of staleness.** Two earlier drafts of the migration in §2 got this wrong at
two different layers before it was fully corrected; both are described below
so the history is legible to a reviewer.

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
migration**, in every draft described below.

### History of this migration's target-selection logic (for review legibility)

This migration went through three shapes before reaching its current one.
Each mistake was the same class of error — treating a tag-code or a nonzero
count as a proxy for "this needs fixing" instead of comparing against root —
recurring one layer down each time it was caught:

1. **Original draft**: zeroed any `game_log_tag_summaries` (root) row with
   `tag_code = 'event' and tag_count <> 0` directly. Wrong for the reason in
   §1's callout box: a nonzero `event` tag can be entirely legitimate, so
   this could have zeroed real evidence. Removed — root is not written by
   this migration at all, in any later draft.
2. **Second draft**: root was made read-only, but the *snapshot*-level
   Signal (a) repeated the identical mistake one level up: it selected any
   `game_player_tag_metric_snapshots` row matching
   `tag_code = 'event' and tag_count <> 0`, again treating nonzero as proof
   of staleness rather than comparing it to root. A legitimate nonzero
   `event` tag (root and snapshot agreeing, both nonzero) was selected and
   rewritten — not corrupted, since a refresh from matching root reproduces
   the same value, but selected and rewritten on **every single run**,
   which is false repeat-safety, not just unnecessary work. This draft's
   Signal (b) (total-tag-count comparison) also `inner join`ed persisted
   snapshots to a root rollup, silently dropping any game_player whose
   root-derived expected total was zero (no root tag rows at all) or whose
   persisted snapshot row was entirely absent.
3. **Current draft** (this file): every comparison is root-value versus
   snapshot-value, never presence/nonzero-ness alone, over the union of
   every `game_player_id` either side has evidence for, with
   `coalesce(..., 0)` on both sides so absence compares as zero instead of
   being silently dropped or causing a null-comparison no-op.

Every one of these mistakes was caught by extending the same executable
Postgres harness (§6), not by inspection alone — see its `README.md` for the
exact fixtures that reproduce each one against the earlier drafts' actual
SQL text.

### Migration target: exact conditions (current draft)

Target-game selection is the union of two independent root-versus-snapshot
comparisons, computed over every `game_player_id` either root or either
snapshot table has any evidence about (a `union` of four id sources, not an
`inner join`, so absence on one side never silently drops a comparison):

1. **Event-tag signal**: the player's root-derived expected `event`
   tag_count (`0` if root has no `event` row for them at all) differs from
   their current `game_player_tag_metric_snapshots` `event` row's
   `tag_count` (`0` if that row is absent). A legitimate nonzero `event` tag
   where root and snapshot already agree does **not** appear here — proven
   with a dedicated fixture (§6).
2. **Total-tag-count signal**: the player's root-derived expected
   `total_tag_count` (`0` if root has no tag rows for them at all) differs
   from their current `game_player_metric_snapshots.total_tag_count` (`0` if
   that row is absent entirely). Proven for both the "root has zero rows"
   and "snapshot row entirely absent" sub-cases with dedicated fixtures
   (§6).

Both root-derived expected values are computed via a read-only copy of
`refresh_game_metric_snapshots_internal`'s own identity resolution (root's
own `game_player_id` when populated, name/alias resolution as fallback when
it isn't), so target selection can never disagree with the refresh function
about which player a root row belongs to.

Neither signal inspects or assumes *why* root and the snapshot disagree, and
neither treats a value's mere presence or nonzero-ness as meaningful on its
own — both simply ask "does the snapshot currently match what refreshing
from root would produce," which is exactly the condition a snapshot-refresh
migration should target.

## 3. Dry-run query (read-only; run this first against production)

The exact target predicate is no longer expressible as a short, simple
`select` — it requires the same identity-resolution CTE the migration itself
uses (see §2). The queries below remain useful **coarse, informational**
signals only; they are not what the migration executes, and in particular
the first query below is *not* a safe proxy for "does this game need a
refresh" (a nonzero count here can be entirely legitimate — see §1). For an
exact answer, read the migration file's target-selection CTE directly, or
adapt it into a standalone `select` before running it read-only against
production.

```sql
-- Coarse signal only — NOT the migration's actual predicate, and a nonzero
-- result here is not proof of a bug (see §1: a nonzero `event` tag can be
-- entirely legitimate). Informational count of how many snapshot rows
-- currently show a nonzero `event` tag_count, for a first-glance sense of
-- scale before running the migration's real (root-comparing) logic.
select count(*)                    as event_tag_nonzero_snapshot_rows,
       count(distinct game_id)     as games_with_nonzero_event_snapshot
from public.game_player_tag_metric_snapshots
where tag_code = 'event' and tag_count <> 0;

-- Root-level rows the old bug could have written directly. Informational
-- only — this migration does not act on this table, and (per §1) a nonzero
-- result here is not evidence of a bug either.
select count(*)                                   as root_event_nonzero_rows,
       count(distinct game_log_import_id)         as affected_imports
from public.game_log_tag_summaries
where tag_code = 'event' and tag_count <> 0;
```

Both queries are idempotent to re-run at any time.

## 4. Affected-row inventory (production)

### 4.1 Historical coarse inventory (read 2026-07-20, aggregates only)

**39/109 was never the complete final migration target count. It was always
a historical coarse Event-snapshot inventory** — derived from the §3 proxy
queries, not from the migration's own target-selection CTE (§2). See §4.2 for
the exact migration-target count, obtained during independent rereview.

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

This table was read once, on 2026-07-20, against the production database, as
part of the original review. Two things follow from that:

- The 109 rows counted here were, at read time, all confirmed stale (root
  already clean for all 39 games, per the "39/39" row above) — i.e. every
  one of them is a legitimate target under the *current* migration's
  Event-tag signal too, not just the earlier nonzero-based one. This
  specific historical reading is not invalidated by the Signal-(a)
  correction in §2, and §4.2 confirms it exactly (109 event-signal players,
  no drift).
- What this table **could not** confirm — whether production has any game
  matching the other two cases the current migration additionally covers and
  the earlier drafts missed — is now answered in §4.2: **yes**, production has
  3 such games.

No player names, aliases, usernames, or raw log text were retrieved to
produce this table — every query above is a `count(*)` / `count(distinct …)`
aggregate.

### 4.2 Exact migration-target inventory (independent rereview, current as of read time)

An independent rereview of this branch (`fix/event-card-tag-exclusion` @
`46b8bbfcccab1cd36368fc1bf32bfa8141f4cc21`) closed the gap §4.1 flagged, by
extracting the migration's actual target-selection CTE (§2) into a
standalone, read-only, aggregate-only `select` (§4.3) and running it directly
against production — not the coarse proxy queries in §3.

| Metric | Value |
| --- | --- |
| Exact target games (union of both §2 signals) | **42** |
| Exact target game players (union of both §2 signals) | **116** |
| Of those, matched by the Event-tag signal | 109 (identical to §4.1's coarse count — no drift) |
| Of those, matched by the Total-tag-count signal | 93 |

The additional scope beyond §4.1's coarse reading:

| Metric | Value |
| --- | --- |
| Additional target game players not counted in §4.1 | **7** |
| Additional target games not counted in §4.1 | **3** |
| Of those 7: `game_player_metric_snapshots` row absent entirely | 7 / 7 |
| Of those 7: root-derived expected `total_tag_count` nonzero | 7 / 7 |
| Of those 7: root-derived expected `event` tag_count nonzero | 0 / 7 |
| Of those 7: game `status = 'finalized'` | 7 / 7 |

**These 7 game players across 3 finalized games are expected, valid migration
targets — not evidence of a new defect.** Each is a finalized game whose
`game_player_metric_snapshots` row was never created at all (a pre-existing
"never snapshotted" gap, independent of the Event-card tag bug this package
otherwise addresses); root has real, nonzero `total_tag_count` evidence for
each. They are detected exclusively through the Total-tag-count signal's
zero-aware missing-row comparison (§2, signal 2) — none of the 7 have a
nonzero root-derived `event` tag_count, so none are matched by the Event-tag
signal, and none were visible in §4.1's old nonzero-Event-row proxy query,
which only ever looked at existing `game_player_tag_metric_snapshots` rows.

This is exactly the class of case the executable harness's **Game I**
fixture directly covers
(`supabase/migrations/verification/20260720223000_fix_event_card_tag_snapshot_correction/`,
harness README §6 item 8: "root total nonzero, `game_player_metric_snapshots`
row entirely absent → refreshed, row created from scratch") — independently
confirmed during rereview to behave correctly against this fixture before
this production reading was taken.

**Timestamp**: the exact UTC timestamp of the original 42/116 discovery
queries (run earlier in the same independent-rereview session, before this
documentation update began) was not separately captured and cannot be
precisely reconstructed — stated explicitly here rather than invented. The
aggregate-only confirmation query in §4.3 that reproduces the 7-player/
3-game breakdown was run at approximately **2026-07-21 01:37 UTC**. Both
reads occurred within one continuous review session spanning 2026-07-20 into
2026-07-21 UTC, with no known intervening write activity against the
affected tables between them.

**Like §4.1, this reading is a point-in-time snapshot, not a live guarantee,
and must be reconfirmed immediately before migration application (§9) —
production data can change between this reading and deploy.**

### 4.3 Query record (aggregate-only, read-only)

Both queries below were run read-only against production. Neither retrieves
player names, aliases, usernames, game IDs, player IDs, group IDs, or raw log
text — every result is a `count(*)` / `count(distinct …)` aggregate. **No
migration, refresh function, or rebuild function was executed** in producing
either result.

Primary query — adapts the migration's §2 target-selection CTE verbatim,
replacing the migration's `perform`/write steps with a `count` in place of
`array_agg`, to get the exact target-game and target-player counts (§4.2's
first table):

```sql
with root_resolved as (
  select
    coalesce(glts.game_player_id, resolved_player.game_player_id) as game_player_id,
    glts.game_log_import_id, glts.tag_code, glts.tag_count, glts.total_tag_count
  from public.game_log_tag_summaries glts
  join public.game_log_imports gli on gli.id = glts.game_log_import_id
  left join lateral (
    select gp_resolved.id as game_player_id
    from public.game_players gp_resolved
    join public.players p_resolved on p_resolved.id = gp_resolved.player_id
    where gp_resolved.game_id = gli.game_id
      and (
        public.metric_normalized_label(p_resolved.display_name) = glts.normalized_player_name
        or exists (select 1 from public.player_import_aliases pia
          where pia.player_id = p_resolved.id and pia.source_type = 'game_log'
            and pia.normalized_alias = glts.normalized_player_name)
      )
    order by gp_resolved.id limit 1
  ) resolved_player on glts.game_player_id is null
  where coalesce(glts.game_player_id, resolved_player.game_player_id) is not null
),
root_event_totals as (
  select game_player_id, sum(tag_count)::integer as expected_event_tag_count
  from (select game_player_id, game_log_import_id, max(tag_count) as tag_count
        from root_resolved where tag_code = 'event' group by game_player_id, game_log_import_id) per_import
  group by game_player_id
),
root_player_totals as (
  select game_player_id, sum(per_import_total)::integer as expected_total_tag_count
  from (select game_player_id, game_log_import_id, max(total_tag_count) as per_import_total
        from root_resolved group by game_player_id, game_log_import_id) per_import
  group by game_player_id
),
all_game_player_ids as (
  select game_player_id from root_event_totals
  union select game_player_id from root_player_totals
  union select game_player_id from public.game_player_tag_metric_snapshots where tag_code = 'event'
  union select game_player_id from public.game_player_metric_snapshots
),
event_signal as (
  select gpi.game_player_id from all_game_player_ids gpi
  left join root_event_totals ret on ret.game_player_id = gpi.game_player_id
  left join public.game_player_tag_metric_snapshots snap_event
    on snap_event.game_player_id = gpi.game_player_id and snap_event.tag_code = 'event'
  where coalesce(ret.expected_event_tag_count, 0) <> coalesce(snap_event.tag_count, 0)
),
total_signal as (
  select gpi.game_player_id from all_game_player_ids gpi
  left join root_player_totals rpt on rpt.game_player_id = gpi.game_player_id
  left join public.game_player_metric_snapshots snap_total on snap_total.game_player_id = gpi.game_player_id
  where coalesce(rpt.expected_total_tag_count, 0) <> coalesce(snap_total.total_tag_count, 0)
),
target_game_players as (
  select game_player_id, 'event' as via from event_signal
  union
  select game_player_id, 'total' as via from total_signal
)
select
  count(distinct gp.game_id) as target_game_count,
  count(distinct gp.id) filter (where tgp.via = 'event') as event_signal_players,
  count(distinct gp.id) filter (where tgp.via = 'total') as total_signal_players,
  count(distinct gp.id) as target_player_count
from target_game_players tgp
join public.game_players gp on gp.id = tgp.game_player_id;

-- Result at read time: target_game_count=42, event_signal_players=109,
-- total_signal_players=93, target_player_count=116.
```

Follow-up query — same CTEs, restricted to targets not already counted by the
§4.1/§3 nonzero-event-snapshot proxy, to confirm the additional-scope
breakdown (§4.2's second table) in aggregate-only form:

```sql
-- ...same root_resolved / root_event_totals / root_player_totals /
-- all_game_player_ids / event_signal / total_signal CTEs as above, plus:
extra as (
  select tgp.game_player_id
  from (
    select game_player_id from event_signal
    union
    select game_player_id from total_signal
  ) tgp
  where tgp.game_player_id not in (
    select game_player_id from public.game_player_tag_metric_snapshots
    where tag_code = 'event' and tag_count <> 0
  )
)
select
  count(*) as extra_target_player_count,
  count(distinct gp.game_id) as extra_target_game_count,
  count(*) filter (where snap_total.game_player_id is null) as extra_with_snapshot_row_absent,
  count(*) filter (where coalesce(rpt.expected_total_tag_count, 0) <> 0) as extra_with_nonzero_root_total,
  count(*) filter (where coalesce(ret.expected_event_tag_count, 0) <> 0) as extra_with_nonzero_root_event,
  count(*) filter (where g.status = 'finalized') as extra_finalized_count
from extra e
join public.game_players gp on gp.id = e.game_player_id
join public.games g on g.id = gp.game_id
left join root_event_totals ret on ret.game_player_id = e.game_player_id
left join root_player_totals rpt on rpt.game_player_id = e.game_player_id
left join public.game_player_metric_snapshots snap_total on snap_total.game_player_id = e.game_player_id;

-- Result at read time (~2026-07-21 01:37 UTC): extra_target_player_count=7,
-- extra_target_game_count=3, extra_with_snapshot_row_absent=7,
-- extra_with_nonzero_root_total=7, extra_with_nonzero_root_event=0,
-- extra_finalized_count=7.
```

Both queries are idempotent to re-run at any time; re-running is expected
immediately before migration application (§9), since production data can
change after this reading.

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
reproduction steps, defect-reproduction evidence, and results).

Eight fixture games proved, against the real file:

1. **Zero matching → zero writes, no rebuild**: proven by the second-pass
   run — after the first pass, no game matches either signal, and a full
   state dump before/after the second run is byte-identical.
2. **Stale nonzero Event-tag snapshot, root already `0` → refreshed**: game
   B — corrected to `0`, `total_tag_count` corrected `2 → 1`.
3. **Total-tag-count mismatch, no `event` row in root at all → refreshed**:
   game C — corrected to `3` via the total signal alone.
4. **Already-correct game untouched**: games A and D.
5. **Legitimate nonzero `event` tag (root and snapshot agree, both
   nonzero) → NOT selected**: game F. **Mandatory case.** Independently
   confirmed to fail under both earlier migration drafts (selected and
   rewritten on *every* run, including the second — repeat-safety is false
   for this case under those drafts) and pass under the current one — see
   the harness README's "Defect reproduction" section.
6. **Zero root tag rows at all, stale nonzero persisted total → refreshed to
   `0`**: game G. **Mandatory case.** Root-derived expected total is `0` (no
   rows, not "no opinion"); independently confirmed to be silently missed
   under both earlier drafts (their `inner join` requires a matching root
   rollup row) and caught under the current one.
7. **Root `event` nonzero, snapshot's `event` row entirely absent →
   refreshed, row created**: game H.
8. **Root total nonzero, `game_player_metric_snapshots` row entirely absent
   → refreshed, row created from scratch**: game I — proves the migration
   does not require a pre-existing snapshot row to detect and correct
   staleness.
9. **Unrelated tag rows unchanged**: values on games that *are* refreshed
   kept their correct values.
10. **Card-play counts unchanged**: `played_card_count` /
    `matched_card_count` / `unresolved_card_count` identical before and
    after for every row.
11. **Second execution is a no-op**: full state dump byte-identical to the
    post-first-run dump, including every `updated_at`, the rebuild-marker
    count, **and specifically game F's row (not re-touched)** — the
    property the earlier Signal-(a) draft violated.
12. **Atomic rollback on failure**: re-staled game B, added a poison game
    whose (stubbed) refresh deliberately raises, then re-ran the real
    migration file. It exited nonzero with the raised error; the
    post-failure state dump was byte-identical to the pre-run dump — game
    B's would-be correction was rolled back along with the poison game's.
13. **Root never written**: `game_log_tag_summaries` — identical before and
    after every run in the harness, including every row's `updated_at`.

`refresh_game_metric_snapshots_internal` / `rebuild_metric_summaries` were
invoked through a **simplified stub**, not the real production functions —
documented as the harness's limitation (see its README). The stub was
strengthened this round to delete-then-insert `game_player_metric_snapshots`
(matching production's actual unconditional per-game-player insert) instead
of only updating existing rows, specifically so game I's "row entirely
absent" case could be faithfully proven rather than assumed. It still does
not implement milestone/award/scoring-share snapshot rebuilding — out of
scope for this correction and untouched by it. Production's real definitions
were separately read directly via `pg_get_functiondef` (not assumed) during
the original review and confirmed to source
`game_player_tag_metric_snapshots`/`total_tag_count` purely from
`game_log_tag_summaries`, consistent with what the stub reproduces; that
read has not been repeated since. The migration file itself, and its
target-selection query, ran unmodified and verbatim in every step above.

## 7. Rollback / restoration evidence

- **Root table**: not written by this migration — nothing to roll back.
- **Snapshot tables**: `game_player_tag_metric_snapshots` and
  `game_player_metric_snapshots` are fully regenerated (delete + insert) by
  `refresh_game_metric_snapshots_internal` for exactly the affected game,
  the same way it already runs today (e.g., on finalize) — a rollback is
  simply "the state before this migration's run," recoverable from
  PITR/backup, or forward-fixable by re-running the migration again
  (idempotent — see §6 item 11).
- **Forward-only preference**: as with `data-capture-hardening-v2`, the
  intended remedy for any discrepancy discovered later is a forward re-run of
  this same migration (safe — see §6), not a destructive rollback.

## 8. What this migration will NOT do

- Will not write to `game_log_tag_summaries` (root) at all — read-only
  input to both target-selection comparisons in §2.
- Will not touch `played_card_count`, `matched_card_count`, or
  `unresolved_card_count` anywhere.
- Will not select a game solely because a tag_code or count happens to be
  nonzero — every selection is a root-versus-snapshot comparison (§2).
- Will not touch any game outside the union of the two signals in §2.
- Will not run automatically — it is a prepared, unapplied `.sql` file only.

## 9. Deployment/backfill order (for the record — not executed here)

1. Deploy the code fix (this branch, once reviewed/merged) to `tm-stats.com`.
   This includes the `analytics-repo.ts`/`extended-analytics-repo.ts` fixes
   and the shared vocabulary module, which take effect immediately on
   deploy with no migration dependency.
2. Immediately before applying, re-run §4.3's exact target-selection queries
   again and reconfirm the counts. §4.2's 42-game/116-player reading is from
   independent rereview (see §4.2's timestamp note) and is a point-in-time
   snapshot, not a live guarantee — production data can change before
   deploy. Re-running the coarse §3 proxy queries alone is not a substitute
   for §4.3's exact, root-comparing logic.
3. Apply `20260720223000_fix_event_card_tag_snapshot_correction.sql` through
   the approved production-change process.
4. Re-run §3's second query and confirm it returns 0. (The first §3 query
   returning nonzero is not itself a problem — see §1/§3 — but should trend
   toward matching root's already-clean state.)
5. Spot-check `player_metric_summaries.best_tag_lane = 'event'` returns 0.
