# Canonical Analytics Definitions

## Status and authority

Phase 2, Step 2.4 completed this registry and its pure calculation utilities on
2026-07-17. This document records only definitions approved by the Step 2.4
assignment, `DECISIONS.md`, and the Phase 2 plan. It does not approve a query,
schema change, historical backfill, page integration, or any later analytics
formula.

The executable registry is `src/lib/analytics/canonical-definitions.ts`; pure
utilities are in `src/lib/analytics/calculations/`. Each definition has a
stable ID, code, and formula version. Version `1` is the current approved
meaning. A semantic formula change must add a new version rather than silently
reinterpreting an existing ID/version pair.

## Recorded card-acquisition facts

The following are separate recorded concepts. None may be substituted for, or
inferred from, another one:

| Metric ID | Recorded fact | Current capability requirement |
| --- | --- | --- |
| `metric:cards-purchased` | Cards purchased | `cards-purchased-recorded` |
| `metric:cards-seen` | Cards seen | `cards-seen-recorded` |
| `metric:cards-played` | Cards played | `cards-played-recorded` |
| `metric:cards-remaining` | Cards remaining in hand at game end | `cards-remaining-recorded` |
| `metric:total-hand-acquisitions` | Total cards entering hand | `total-hand-acquisitions-recorded` |

Existing persisted records do not yet establish the required card opportunity
and acquisition facts or their coverage. The registry and utilities therefore
express meaning only; a future capability and repository layer must return an
unavailable or partial state where those facts are absent or incompletely
recorded.

## Approved card-acquisition rates

Every rate is calculated per eligible player-game before aggregate summaries.
All operands are nonnegative integer counts. A recorded numerator of zero is an
observed zero. A missing numerator is missing; a missing, unavailable, partial,
or zero denominator cannot yield an exact rate.

| Rate | Formula | Ratio-of-totals definition | Median definition |
| --- | --- | --- | --- |
| Purchase Conversion | `Cards Purchased / Cards Seen` | `sum(Cards Purchased) / sum(Cards Seen)` | Median of eligible player-game conversion rates |
| Purchased Hand Share | `Cards Purchased / Total Cards Entering Hand` | `sum(Cards Purchased) / sum(Total Cards Entering Hand)` | Median of eligible player-game share rates |
| Hand Utilization | `Cards Played / Total Cards Entering Hand` | `sum(Cards Played) / sum(Total Cards Entering Hand)` | Median of eligible player-game utilization rates |
| End-Hand Carryover | `Cards Remaining / Total Cards Entering Hand` | `sum(Cards Remaining) / sum(Total Cards Entering Hand)` | Median of eligible player-game carryover rates |

The two aggregation variants are separately versioned metric definitions. The
median is not an average of percentages, and neither variant may be silently
substituted for the other. Both retain the exact included player-game IDs,
sample ledger, coverage evaluation, and numerator/denominator totals used to
form the result.

## Win-point differential

For a sole winner with complete final-score facts, Win Point Differential is:

```text
winner final score - highest non-winning final score
```

The comparison is against every non-winner, not merely the next placement. A
zero result remains an observed zero when a sole winner was decided by a
tiebreaker. A tied-first result is `indeterminate` with reason
`tied-first-policy-unresolved` and has no numeric value; this utility does not
emit the legacy zero. The metric is not applicable to non-winners. Overall
point differential, ranking, placements, and tie ranking policy are separate
unapproved work.

## Merger Prelude availability

The Merger always-available Prelude variant has three separately reported,
versioned definitions. They are computed from each game's saved Merger-rule
snapshot, canonical Merger identity, and reviewable player attribution; they do
not infer an offer from a missing event or from player order, corporation,
score, or partial logs.

| Metric | Formula | Required interpretation |
| --- | --- | --- |
| Merger usage rate | `confirmed Merger selections / eligible player-game observations` | A confirmed manual selection or high-confidence resolved event is a selection observation. It does not, by itself, establish a guaranteed offer. |
| Merger availability rate | `known Merger-offered observations / eligible player-game observations` | A saved `guaranteed_merger_offer = true` snapshot establishes the additional offer. `false` establishes no guaranteed offer. A null or `unknown` snapshot is never coerced to Off; unresolved unknown snapshots make the aggregate partial rather than 0%. |
| Merger selection given availability | `confirmed Merger selections / observations with known Merger availability` | Guaranteed-variant selections are reported separately from unknown-source selections. The random-offer denominator remains unavailable when no independently captured random offer exists. |

The game snapshot is the source of denominator policy: a `true` snapshot makes
the additional Merger offer available to every eligible player-game observation,
while a `false` snapshot does not. A selected Merger in an unknown snapshot is
counted as a selection and records that availability is known, but its offer
source remains unknown rather than being labeled guaranteed or random. Explicit
zero, unknown, partial import coverage, unresolved actors, and conflicting
evidence remain distinct reconciliation states.

## Eligibility, coverage, samples, and value states

Utilities accept the Step 2.3 `AnalyticsEligibilityResult`,
`AnalyticsCoverageEvaluation`, and `AnalyticsSample` contracts instead of
creating parallel state or threshold systems.

- Exact rates require complete coverage for their specific numerator and
  denominator facts. Partial aggregate count totals remain `partial`, while
  their rate stays `unavailable` rather than being presented as exact.
- No recorded coverage produces `missing`; no eligible observation produces a
  `not-applicable` eligibility result; unknown, unavailable-capability, and
  invalid coverage remain distinct non-exact states.
- Aggregates require a reconciled player-game sample with candidate, eligible,
  included, and excluded counts plus structured exclusions. Included count must
  equal the eligible calculated observation count.
- There is no global minimum-sample threshold in these definitions. Any future
  threshold must be separately approved and carried through the existing
  metric-specific policy contract.
- Outputs use `MetricValue` directly: observed, partial, missing, and
  unavailable stay distinct. Utilities return raw numeric values only; rounding,
  percent formatting, display labels, and UI policy belong outside this layer.

## Read-only legacy formula audit

The current formula-bearing paths were inspected as evidence only. No existing
query, SQL, view, repository, component, or production page was changed by Step
2.4.

| Location | Existing behavior | Step 2.4 classification |
| --- | --- | --- |
| `src/lib/db/analytics-repo.ts` | Coerces some null/invalid numeric values to zero and contains local averages, weights, sorting, and display-oriented helpers | Legacy behavior; not a canonical source |
| `supabase/migrations/20260703130000_create_analytics_views.sql` | Uses next-placement scoring and tied-first zero for one win-differential view; includes fixed leaderboard weights | Different/unapproved semantics; deferred |
| Persisted analytics snapshot migrations | Uses a different all-other-player margin expression and score/efficiency summaries | Different/unapproved semantics; deferred |
| Corporation, pairing, style, score-source, final-action, and insight components | Contain local rate, average, confidence, weighting, delta, and heuristic calculations | Legacy/UI calculations; deferred, not migrated |

The inspection was performed under the Supabase safety guidance as a read-only
contract audit. No SQL was run and no Supabase state was accessed or mutated.

## Explicit exclusions

This step does not define or migrate: tied-first numeric win margin, overall
point differential, ranking/leaderboard/strength algorithms, sample or coverage
thresholds, corporation or pairing weighting, final-action metrics,
expected-score/efficiency/style/award calculations, source capture, repository
queries, SQL/views, migrations, schemas, page routes, navigation, dependencies,
or production data.

### Reconciliation note (owner rulings, 2026-07-23)

The "Explicit exclusions" paragraph above is **retained as written**. This note records
where an owner ruling has since overtaken **one** item in that list, and where two other
items are deliberately **left in force** pending an unruled question. Authority:
`docs/redesign/DECISIONS.md` → "Phase 2 / analytics — owner rulings R-13–R-17". The
paragraph's wording is unchanged, and no definition is added here — reconciling the
registry itself is separate, unauthorized work.

- **expected-score** (within "expected-score/efficiency/style/award calculations") —
  **SUPERSEDED by R-13.** The 2026-07-21 seasonal-ELO decision (`DECISIONS.md` → its
  three "Phase 7 — Leaderboard" sections: "rating color bands", "eligibility and
  Confidence marker", and "opponent-adjustment boundary, tie-breaking, and default scope")
  stands and supplies the expected-score basis this Step 2.4 registry excluded; the
  exclusion lagged that decision, and the decision governs. Only the **expected-score**
  item is superseded — "efficiency", "style", and the remaining items are unaffected.
- **corporation or pairing weighting** and **award calculations** (also in this list) —
  **NOT superseded; the exclusions stand.** Whether excluding them is a considered design
  decision or an unrevisited placeholder is **open analytics question Q-7**
  (`DECISIONS.md` → "Q-7 (analytics)"), which weighs Award Funding ROI (Phase 18) and
  Corporation Adjusted Win Rate (Phase 14) against this exclusion and is explicitly
  **unruled**. Nothing here changes those exclusions; this note only records that the
  question about them is open.
