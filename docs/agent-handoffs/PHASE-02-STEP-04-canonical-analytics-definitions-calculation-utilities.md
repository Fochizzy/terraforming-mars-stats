# Phase 2, Step 2.4 — Canonical Analytics Definitions and Calculation Utilities Handoff

## Status

Completed on 2026-07-17. This handoff covers only the explicitly assigned
canonical-definition and pure-calculation substep. Step 2.5 was not started.

## Scope completed

- Added a public, client-safe canonical analytics registry at formula version
  `1` with stable metric IDs/codes and calculation-version evidence metadata.
- Registered five distinct recorded card-acquisition concepts: Cards Purchased,
  Cards Seen, Cards Played, Cards Remaining, and Total Cards Entering Hand.
- Added pure per-player-game utilities for Purchase Conversion, Purchased Hand
  Share, Hand Utilization, and End-Hand Carryover.
- Added distinct aggregate outputs for exact ratio-of-totals and median
  per-player-game rate. Both use the same explicitly recorded included
  player-game observations, reconciled sample, coverage, and denominator facts.
- Added the sole-winner Win Point Differential utility: winner final score minus
  the highest non-winning final score. Tied first remains indeterminate with no
  numeric result; non-winners are not applicable.
- Corrected the Step 2.3 metric-definition validator so
  `per-observation-value` is not incorrectly treated as a rate-only
  aggregation. This permits recorded counts and score values to retain their
  actual per-observation meaning without bypassing validation.
- Kept all calculations raw and presentation-free. They return `MetricValue`,
  eligibility, coverage, sample, and denominator context; no display strings,
  rounding, implicit threshold, query, or client/server data access was added.

## Files changed

### Source and tests

- `src/lib/analytics/canonical-definitions.ts`
- `src/lib/analytics/canonical-definitions.test.ts`
- `src/lib/analytics/calculations/card-acquisition.ts`
- `src/lib/analytics/calculations/card-acquisition.test.ts`
- `src/lib/analytics/calculations/win-point-differential.ts`
- `src/lib/analytics/calculations/win-point-differential.test.ts`
- `src/lib/analytics/calculations/index.ts`
- `src/lib/analytics/index.ts`
- `src/lib/analytics/metric-contracts.ts`
- `src/lib/analytics/metric-contracts.test.ts`

### Documentation

- `docs/redesign/CANONICAL-ANALYTICS-DEFINITIONS.md`
- `docs/redesign/phases/02-analytics-foundation.md`
- `docs/redesign/DECISIONS.md`
- `docs/redesign/DATA-CAPABILITIES.md`
- `docs/redesign/ANALYTICS-INVENTORY.md`
- `docs/redesign/MASTER-PLAN.md`
- `docs/REDESIGN_STATE.md`
- this handoff

## Definition and calculation contract

- A semantic change must create a new formula version; it must not reinterpret
  a stable metric ID/version pair.
- Each rate consumes its own approved operands. Cards Seen is never inferred
  from purchases, and total hand acquisitions is never replaced by a hand-size
  snapshot.
- Observed zero numerators remain zero. Missing operands, unavailable
  capabilities, partial data, non-finite values, and zero denominators remain
  distinct non-exact outcomes with structured eligibility reasons.
- Aggregate totals are observed only with complete coverage; partial aggregate
  totals remain lower-bound `partial` values and do not produce an exact rate.
- No universal minimum sample threshold was introduced. The caller-provided
  sample ledger must reconcile candidate, eligible, included, and excluded
  player-game observations.
- Tied-first handling intentionally has no numeric policy. Existing legacy zero
  semantics were not reused.

## Formula audit and deferred work

The following were inspected read-only and intentionally left unchanged:

- `src/lib/db/analytics-repo.ts` numeric coercion, local averages, weights,
  sorters, and presentation helpers;
- analytics SQL/view and persisted snapshot margin expressions, including
  differing tied-first and opponent-baseline behavior;
- corporation, pairing, style, score-source, final-action, and insight
  component formulas and confidence/weighting heuristics.

No existing consumer has a directly tested parity path for the new definitions,
so no legacy consumer was migrated or removed. The remaining unapproved work
includes tied-first numeric policy, overall point differential, ranking,
leaderboard, opponent-strength, threshold, weighting, expected-score,
efficiency, style, award, and final-action formulas, plus the card-capture and
coverage sources required for any real card-acquisition result.

## Tests and validation run

- Focused Vitest: `npx.cmd vitest run src/lib/analytics/metric-contracts.test.ts src/lib/analytics/canonical-definitions.test.ts src/lib/analytics/calculations/card-acquisition.test.ts src/lib/analytics/calculations/win-point-differential.test.ts` — 4 files, 27 tests passed.
- Full test suite: `npm.cmd test` — 98 files, 510 tests passed.
- Type check: `npx.cmd tsc --noEmit` — passed.
- Lint: `npm.cmd run lint` — passed with the pre-existing four warnings: three `no-img-element` warnings in `src/features/insights/score-profile-panel.tsx` and one unused `normalizeProfileHeadToHeadRow` warning in `src/lib/db/analytics-repo.ts`.
- Production build: `npm.cmd run build` — passed; 23/23 pages generated.

## Assumptions and limitations

- The registry represents approved calculation semantics, not a claim that
  current persisted history can supply the facts. Capability and repository work
  must verify source coverage before exposing any live result.
- The current formula version is `1`; the missing tied-first policy has not been
  guessed or encoded as zero.
- Supabase guidance affected this work only by keeping the formula/SQL audit
  read-only. No SQL was run and no Supabase data, Storage, schema, migration,
  view, or environment was changed.

## Repository state

- Branch: `redesign/tm-stats-dashboard-rebuild`
- Commit: reported in the completion report because a commit cannot contain its
  own final hash without changing that hash.
- Worktree: expected clean after the focused Step 2.4 commit.
- Push/deploy: none requested or performed.

## Next approved action

Only an explicit assignment may begin Phase 2, Step 2.5 — Analytics Repository
and Query Contracts. Do not infer authorization for a repository query, SQL,
schema, migration, page integration, navigation, deployment, or Supabase
mutation from this completed calculation substep.
