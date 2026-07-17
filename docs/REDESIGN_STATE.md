# TM Stats Redesign State

## Current phase

Phase 2 — Analytics Foundation

## Current substep

Step 2.3 — Metric, Sample, Coverage, and Eligibility Contracts

## Status

Completed. Step 2.3 added client-safe metric identity and definition contracts,
metric result envelopes, analytical samples, denominators, minimum-sample
evaluation, structured eligibility/exclusion reasons, and measured/unknown/
capability-unavailable coverage evaluation under `src/lib/analytics/`. Ready
metric results preserve observed zero, nonzero, missing, unavailable, and
partial Phase 1 `MetricValue` states without coercion. Samples distinguish
candidate, eligible, included, and excluded observations; comparison selection
does not narrow a sample unless expressed as a Step 2.2 filter. Coverage now
distinguishes complete, partial, none, no-eligible-records, invalid, unknown,
and capability-unavailable states. Five focused analytics test files cover 61
tests. Full validation passes at 95 test files / 490 tests, with typecheck
clean, the same four baseline lint warnings, and 23/23 build pages. No Step 2.4
formulas, repositories, schema, Supabase state, dependencies, routes,
navigation, deployment, or production pages changed.

## Branch

redesign/tm-stats-dashboard-rebuild

## Current owner

Codex — metric, sample, coverage, and eligibility contracts

## Last completed commit

Step 2.3 focused completion commit (hash recorded in the completion report)

## Next action

Begin Step 2.4 — Canonical Analytics Definitions and Calculation Utilities only
when explicitly assigned with an approved formula list. Do not begin repository
changes, schema work, production page integration, navigation, route migration,
deployment, or Supabase mutation with that assignment.

## Active blockers

No blocker prevents a separately assigned Step 2.4 formula-definition substep
when the assignment provides an approved formula list. Later Phase 2 work
remains blocked, where applicable, by undecided tied-first win-margin behavior;
overall point-differential baseline; leaderboard and opponent-strength
methodology; metric-specific sample, coverage, and range thresholds; approval
of current weighting/efficiency/style/award/final-action formulas;
final-action RPC source/security verification; card opportunity/acquisition
identity and coverage; TR, duration, production/engine, and board capture
contracts; role/global-opt-in semantics; generated database types; and
acceptance of live-only schema, RPC, and Storage contracts. Current repository
and UI heuristics that coerce null to zero or hard-code confidence thresholds
remain deferred migration work.

## Database migration status

No Phase 2 migrations created. Step 2.3 changed client-safe TypeScript
contracts, tests, and documentation only and did not query or change database
or Storage state.

## Latest handoff

docs/agent-handoffs/PHASE-02-STEP-03-metric-sample-coverage-eligibility-contracts.md
