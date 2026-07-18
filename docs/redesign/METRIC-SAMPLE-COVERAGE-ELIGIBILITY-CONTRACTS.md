# Metric, Sample, Coverage, and Eligibility Contracts

Phase 2, Step 2.3 was completed on 2026-07-17. This document records the
client-safe contracts added for metric identity, result state, sample
construction, denominators, minimum-sample evaluation, coverage evaluation, and
eligibility/exclusion reasons.

The contracts live under `src/lib/analytics/` and do not query Supabase, define
formulas, migrate schema, or change production pages.

## Source Modules

- `metric-contracts.ts` defines metric identity, value kind, aggregation kind,
  unit, supported scope/filter declarations, capability requirements,
  provenance requirements, and observational interpretation metadata.
- `metric-result.ts` composes metric definitions with Phase 1 `MetricValue`,
  samples, coverage, eligibility, capability, evidence, query-error, loading,
  and insufficient-evidence state.
- `sample.ts` defines analytical sample definitions, observation units,
  candidate/eligible/included/excluded counts, structured exclusions,
  denominators, and minimum-sample policy evaluation.
- `eligibility.ts` defines eligibility statuses, structured reason codes, and a
  pure caller-driven evaluator for finalized status, imported field coverage,
  required observations, entity presence, tied-first policy, scope support, and
  capability availability.
- `coverage.ts` now also represents measured coverage, unknown coverage, and
  capability-unavailable coverage. Measured coverage can track independently
  available and unavailable eligible records.

## Metric Identity and Definition Rules

Metric identity is stable and separate from presentation:

- `identity.id`, `identity.code`, and `identity.version` are contract identity.
- `displayMetadataRef` may point to labels or localization, but display copy is
  never metric identity.
- Supported scopes and filters use the Step 2.1/2.2 stable vocabularies.
- Capability requirements name stable capability keys and can declare required
  or optional necessity.
- Metrics declare whether explicit zero is valid, whether partial coverage is
  allowed, whether insufficient evidence applies, whether provenance is
  required, and whether included observations are required.
- Interpretations are observational by construction:
  `causalClaimsAllowed` is always `false`.

Validation rejects blank identity, duplicate scopes/filters/capability
requirements, blank capability keys, blank custom units, invalid
minimum-sample policies, silent averages of rate-like values, and rate
aggregations on non-rate values.

## Result States

`AnalyticsMetricResult` has five top-level states:

- `loading`: the metric request is still in flight.
- `load-error`: the request failed; this is not missing data.
- `capability-unavailable`: a non-executable capability prevents the metric
  from being produced.
- `insufficient-evidence`: the metric has a documented evidence blocker, such
  as an unverified population or unmet sample policy.
- `ready`: evaluation completed and carries a Phase 1 `MetricValue`.

Inside a `ready` result, `MetricValue` preserves:

- observed zero,
- observed nonzero,
- missing,
- unavailable-for-subject with a reason, and
- partial/lower-bound values.

The result validator rejects invalid combinations such as observed non-finite
values, partial values without partial coverage, partial values on metrics that
do not allow partial coverage, unavailable values without a reason, observed
rate-like values with a zero metric-value denominator, missing required
capabilities, eligible results with unavailable required capabilities, invalid
samples, invalid coverage, invalid eligibility, invalid evidence, and missing
required provenance.

## Sample and Denominator Rules

A sample records four counts:

- `candidate`: observations before eligibility and inclusion rules;
- `eligible`: observations that can legally contribute to the metric;
- `included`: eligible observations actually included in the result; and
- `excluded`: candidate minus included observations.

Every excluded observation requires structured exclusion reasons. Comparison,
highlight, and focus selection can be carried as context, but it does not
change the sample unless it was first represented as a real Step 2.2 filter.

Denominators are explicit:

- `not-applicable`;
- observation count from `candidate`, `eligible`, `included`, or caller-supplied
  `available`; or
- another metric value with stable metric ID, numeric value, and unit code.

Explicit zero denominator values are preserved. They are not converted to
missing, but result validation can reject zero denominators for observed
rate-like values.

## Minimum-Sample Rules

There is no universal low-sample threshold. A policy is one of:

- `none`;
- `metric-specific` with an approved policy reference; or
- `caller-provided`.

Evaluation yields one of:

- `no-threshold`;
- `met`;
- `not-met`;
- `cannot-evaluate`; or
- `insufficient-evidence`.

An absent threshold is an explicit state, not proof that the sample is large
enough. Low-sample categories remain visible unless an explicit filter excludes
them.

## Coverage Rules

Measured coverage continues to distinguish:

- `complete`;
- `partial`;
- `none`;
- `no-eligible-records`; and
- `invalid`.

Step 2.3 adds evaluated states for:

- `unknown`, when coverage was not measured or the population/source is
  unverified; and
- `capability-unavailable`, when a non-executable capability prevents coverage
  measurement.

Measured coverage may include `availableRecords` and `unavailableRecords`.
When both are present, they must add up to `eligibleRecords`, and
`recordsWithRequiredData` cannot exceed `availableRecords`.

Zero coverage with a positive eligible denominator is a real measured zero.
A zero eligible denominator is not displayed as `0%`.

## Eligibility Rules

Eligibility is evaluated before aggregation and is separate from missing data,
coverage, and capability availability. The statuses are:

- `eligible`;
- `ineligible`;
- `indeterminate`;
- `unavailable`; and
- `not-applicable`.

Non-eligible states carry structured user-safe reasons. The reason vocabulary
includes missing required observations, missing numerator/denominator, zero
denominator, unsupported scope/source, unavailable capability, game not
finalized, imported records missing required fields, absent or unresolved
entities, invalid or stale filters, metric
requirements not met, incomplete required coverage, insufficient evidence,
authorization restriction, tie-policy exclusion, and unresolved tied-first
policy.

The evaluator is intentionally caller-driven. It does not contain metric
formulas, hidden sample thresholds, or global product defaults.

## Tests

Five focused analytics test files cover these contracts:

- `coverage.test.ts`
- `eligibility.test.ts`
- `metric-contracts.test.ts`
- `metric-result.test.ts`
- `sample.test.ts`

They cover observed zero, nonzero, missing, unavailable, partial, loading,
query error, insufficient evidence, invalid combinations, explicit zero
round-tripping, missing-not-zero behavior, no/met/not-met/cannot-evaluate
minimum-sample states, candidate/eligible/included/excluded counts, structured
reasons, unsupported scope, non-executable capability, finalized versus draft
games, imported missing fields, tied-first policy, deterministic normalization,
display-label type rejection, and silent-percentage-average rejection.

## Deferred Migration Notes

Current production analytics still contain heuristics that later steps must
address before page integration:

- some repository mappers coerce nullable or invalid numeric values to zero;
- some UI confidence/sample thresholds are hard-coded locally;
- current corporation, pairing, lineup, and insight surfaces use separate
  minimum-sample heuristics;
- current imports and finalization have ad hoc coverage behavior; and
- current persisted summaries expose `games_played`-style denominators without
  the full Step 2.3 sample ledger.

Step 2.3 only defines the contracts for correcting those behaviors. It does
not refactor repositories, formulas, routes, schema, migrations, or production
pages.
