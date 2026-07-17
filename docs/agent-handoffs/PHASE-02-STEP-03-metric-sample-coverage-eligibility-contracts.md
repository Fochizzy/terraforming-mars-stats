# Phase 2, Step 2.3 Handoff — Metric, Sample, Coverage, and Eligibility Contracts

## Status

Completed on 2026-07-17.

## Assignment

Complete only **Phase 2, Step 2.3 — Metric, Sample, Coverage, and Eligibility
Contracts** in `C:\Users\izzyh\Documents\Terraforming Mars Redesign` on
`redesign/tm-stats-dashboard-rebuild`; create one focused commit; do not push;
do not begin Step 2.4; do not change routes, production pages, repositories,
formulas, dependencies, migrations, schema, or Supabase state.

## Prerequisites verified

- The required branch was active and initial porcelain status was clean.
- Step 2.2 was committed at `898ad9535` and its handoff existed.
- `docs/REDESIGN_STATE.md` marked Step 2.2 complete and Step 2.3 next.
- `docs/redesign/MASTER-PLAN.md` existed and remained tracked.
- The Step 2.1 and Step 2.2 commits remained in history.
- Inspection of the relevant prior commits found no premature Step 2.3/2.4
  work, migration, repository query, production page, route, or Supabase change.
- The original `C:\Users\izzyh\Documents\Terraforming Mars` worktree was not
  accessed or modified.

## Documents reviewed

The explicit assignment; `AGENTS.md`; `CLAUDE.md`; `docs/REDESIGN_STATE.md`;
`docs/redesign/MASTER-PLAN.md`;
`docs/redesign/phases/02-analytics-foundation.md`;
`docs/redesign/DECISIONS.md`; `docs/redesign/MASTER-RULES.md`;
`docs/redesign/DATA-CAPABILITIES.md`;
`docs/redesign/ANALYTICS-INVENTORY.md`;
`docs/redesign/PAGE-ARCHITECTURE.md`;
`docs/redesign/MIGRATION-MATRIX.md`;
`docs/redesign/COMPONENT-MIGRATION-MATRIX.md`; and the Step 2.0, 2.1, and 2.2
handoffs. The Word guide was not needed because the higher-authority documents
and repository code resolved the Step 2.3 questions.

## Repository findings

- Phase 1 already provides `MetricValue`, `metricFromNullable`,
  `CoverageObservation`, sample display primitives, low-sample notices, and
  partial-coverage notices. Step 2.3 composes with those instead of replacing
  them.
- Step 2.1 already provides scope, subject, capability, evidence, and
  structural coverage contracts.
- Step 2.2 already provides filter state and durable selection state; Step 2.3
  keeps selection context out of sample construction unless represented as an
  actual filter.
- Current repository mappers and UI surfaces still contain deferred heuristics:
  nullable values can be coerced to zero, several confidence/sample thresholds
  are hard-coded locally, and existing persisted summaries expose ambiguous
  `games_played` denominators without the Step 2.3 sample ledger.
- Imported-game and finalization flows have ad hoc coverage behavior that later
  schema/repository work must reconcile.
- The actual scripts are `npm.cmd test`, `npx.cmd tsc --noEmit`,
  `npm.cmd run lint`, and `npm.cmd run build`.

## Files changed

### Client-safe contracts and barrel

- `src/lib/analytics/coverage.ts`
- `src/lib/analytics/eligibility.ts`
- `src/lib/analytics/metric-contracts.ts`
- `src/lib/analytics/metric-result.ts`
- `src/lib/analytics/sample.ts`
- `src/lib/analytics/index.ts`

### Focused tests

- `src/lib/analytics/coverage.test.ts`
- `src/lib/analytics/eligibility.test.ts`
- `src/lib/analytics/metric-contracts.test.ts`
- `src/lib/analytics/metric-result.test.ts`
- `src/lib/analytics/sample.test.ts`

### Documentation

- `docs/redesign/METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md`
- `docs/redesign/DECISIONS.md`
- `docs/redesign/phases/02-analytics-foundation.md`
- `docs/redesign/ANALYTICS-INVENTORY.md`
- `docs/redesign/DATA-CAPABILITIES.md`
- `docs/redesign/MASTER-PLAN.md`
- `docs/REDESIGN_STATE.md`
- `docs/agent-handoffs/PHASE-02-STEP-03-metric-sample-coverage-eligibility-contracts.md`

No other source, test, documentation, dependency, environment, migration,
route, page, repository, generated file, database, or Storage state changed.

## Contracts introduced

- Stable metric identity and definition metadata:
  `AnalyticsMetricIdentity`, `AnalyticsMetricDefinition`, metric value kinds,
  aggregation kinds, units, capability requirements, supported scopes/filters,
  explicit-zero policy, partial-coverage policy, provenance requirement, and
  observational interpretation metadata.
- Complete metric result envelopes:
  `loading`, `load-error`, `capability-unavailable`, `insufficient-evidence`,
  and `ready`.
- Ready metric results carry Phase 1 `MetricValue` without coercing observed
  zero, nonzero, missing, unavailable-for-subject, or partial/lower-bound values.
- Analytical sample contracts:
  candidate, eligible, included, and excluded counts; structured exclusion
  reasons; observation units; denominator state; selection context that cannot
  narrow samples; and deterministic normalization.
- Minimum-sample policy and evaluation:
  `none`, `metric-specific`, and `caller-provided` policies with
  `no-threshold`, `met`, `not-met`, `cannot-evaluate`, and
  `insufficient-evidence` outcomes.
- Eligibility contracts:
  `eligible`, `ineligible`, `indeterminate`, `unavailable`, and
  `not-applicable`, with typed reason codes for missing operands, unsupported
  scope/source, unavailable capability, unfinalized games, imported missing
  fields, absent/unresolved entities, invalid filters, incomplete coverage,
  insufficient evidence, authorization, and tied-first policy.
- Coverage evaluation extensions:
  measured complete/partial/none/no-eligible/invalid states plus `unknown` and
  `capability-unavailable`; optional available/unavailable eligible record
  counts; and validation that covered records do not exceed available records.

## Validation behavior

The validators reject:

- blank metric identity, duplicate scopes/filters/capability requirements, blank
  capability keys, blank custom units, invalid minimum-sample policies, silent
  averages of percentages/rates, and rate aggregations on non-rate values;
- invalid sample counts, missing exclusion reasons, exclusion mismatch, blank
  metric-specific units, blank denominator metric/unit IDs, invalid
  denominators, and denominator/count mismatches;
- invalid coverage counts, availability mismatches, covered-above-available,
  duplicate/blank coverage reason codes, and invalid source dimensions;
- non-eligible results without reasons, blank eligibility explanations, and
  executable capabilities attached to unavailable eligibility;
- ready metric results with non-finite values, disallowed zeroes, partial values
  without partial coverage, unavailable values without reasons, missing or
  non-executable required capabilities, eligible results with unavailable
  required capabilities, rate-like observed values with zero metric-value
  denominators, missing required provenance, invalid evidence, and mismatched
  minimum-sample evaluation.

## Tests added

Five files / 61 focused tests cover observed zero, nonzero, missing,
unavailable, partial, loading, query error, insufficient evidence, coverage
complete/partial/none/unknown/capability-unavailable, availability counts,
no-threshold/met/not-met/cannot-evaluate minimum-sample states, metric-specific
and caller thresholds, candidate/eligible/included/excluded counts, different
observation units, denominator state, structured eligibility/exclusion reasons,
unsupported scope, non-executable capability, finalized versus draft games,
imported missing fields, tied-first policy, invalid combinations, display-label
type rejection, explicit zero JSON round-trip, missing-not-zero behavior,
silent percentage average rejection, selection versus sample separation,
deterministic normalization, and serializable client-safe values.

## Validation results

- Focused: `npx.cmd vitest run src/lib/analytics/sample.test.ts
  src/lib/analytics/eligibility.test.ts
  src/lib/analytics/metric-contracts.test.ts
  src/lib/analytics/metric-result.test.ts src/lib/analytics/coverage.test.ts`
  — 5 files / 61 tests passed.
- Full: `npm.cmd test` — 95 files / 490 tests passed.
- Typecheck: `npx.cmd tsc --noEmit` — passed with no errors.
- Lint: `npm.cmd run lint` — exit 0 with the four unchanged baseline warnings.
- Build: `npm.cmd run build` — passed; 23/23 pages generated, with the same four
  baseline warnings.

## Known warnings

Unchanged from the Step 2.2 baseline: three `@next/next/no-img-element`
warnings in `src/features/insights/score-profile-panel.tsx`, one unused
`normalizeProfileHeadToHeadRow` warning in `src/lib/db/analytics-repo.ts`, and
the `next lint` deprecation notice. No unrelated warning was fixed and no audit
fix was run.

## Decisions made

- Metric identity is stable ID/code/version; display metadata is never identity.
- Metric results keep loading, query error, capability unavailable,
  insufficient evidence, and ready states separate.
- Ready metric values reuse Phase 1 `MetricValue` and preserve observed zero.
- Samples record candidate, eligible, included, and excluded counts; exclusions
  require structured reasons.
- Durable comparison/highlight/focus selection is not sample membership.
- Minimum-sample absence is represented explicitly and is not a pass.
- Coverage separates eligible denominator, measured source completeness, unknown
  coverage, and unavailable capability.
- Eligibility is distinct from missing observation, unavailable capability, and
  insufficient evidence.
- No metric formula, query, schema, migration, page, route, navigation, or
  production integration was authorized or added.

## Deferred work

- Step 2.4 formula definitions and calculation utilities for explicitly
  approved formulas only.
- Step 2.5 repository/query contracts and adapters that return these result
  shapes.
- Migration of existing repository mappers that coerce missing values to zero.
- Replacement of local UI confidence/sample heuristics with Step 2.3 contracts
  once the owning formulas and repositories are approved.
- Coverage-aware treatment of imports, finalization, persisted snapshots,
  Cards Seen, card acquisition, TR, duration, production/engine, and board data.
- Production route/page integration.

## Limitations and risks

- A valid contract shape does not prove that a metric formula is approved or
  that production data exists.
- A supported filter or scope does not imply metric support; each metric must
  declare support and capability requirements.
- Existing production consumers still use old DTOs and heuristics until later
  approved migration steps.
- No production row, remote RPC, database, or Storage verification was performed
  because Step 2.3 is a pure contract substep.

## Commit hash

The focused Step 2.3 commit is
`feat(analytics): define metric sample and eligibility contracts`; its hash is
reported in the completion report because a commit cannot contain its own hash.

## Exact next action

Begin **Phase 2, Step 2.4 — Canonical Analytics Definitions and Calculation
Utilities** only when explicitly assigned with an approved formula list. Do not
begin repository queries, schema/migrations, Supabase mutation, production page
integration, routes, navigation, deployment, or Step 2.5+ with that assignment.

## Confirmations

- Step 2.4 was not started.
- No analytics formula or repository query was added.
- No page, route, navigation, middleware, dependency, environment file, schema,
  migration, database view/RPC, Supabase data, Storage object, deployment, or
  production asset changed.
- The Step 2.1, Step 2.2, and corporation-logo policy commits remain intact.
- Nothing was pushed.
