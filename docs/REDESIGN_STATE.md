# TM Stats Redesign State

## Current phase

Phase 2 — Analytics Foundation

## Current substep

Step 2.4 — Canonical Analytics Definitions and Calculation Utilities

## Status

Completed. Step 2.4 added a client-safe, versioned canonical definition registry
and pure calculation modules under `src/lib/analytics/` for only the approved
recorded card-acquisition facts; Purchase Conversion, Purchased Hand Share,
Hand Utilization, and End-Hand Carryover; their distinct ratio-of-totals and
median-per-player-game summaries; and sole-winner Win Point Differential against
the highest non-winner. Calculation outputs carry existing `MetricValue`,
eligibility, coverage, sample, and denominator contracts without coercing zero,
missing, unavailable, or partial values. Tied-first Win Point Differential is
indeterminate and emits no numeric result. Full validation passes at 98 test
files / 510 tests, with typecheck clean, the same four baseline lint warnings,
and 23/23 build pages. No repository, SQL, migration, schema, Supabase state,
dependency, route, navigation, deployment, production page, or legacy consumer
changed.

## Branch

redesign/tm-stats-dashboard-rebuild

## Current owner

Codex — canonical analytics definitions and calculation utilities

## Last completed commit

Step 2.4 focused completion commit (hash recorded in the completion report)

## Next action

Begin Step 2.5 — Analytics Repository and Query Contracts only when explicitly
assigned with a repository slice. Do not begin SQL, schema, production page
integration, navigation, route migration, deployment, or Supabase mutation with
that assignment unless separately authorized.

## Active blockers

No blocker prevents a separately assigned Step 2.5 repository-contract substep
when its source and authorization requirements are explicit. Later Phase 2 work
remains blocked, where applicable, by undecided tied-first numeric win-margin behavior;
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

No Phase 2 migrations created. Step 2.4 changed client-safe TypeScript
definitions, pure calculations, tests, and documentation only and did not query
or change database or Storage state.

## Latest handoff

docs/agent-handoffs/PHASE-02-STEP-04-canonical-analytics-definitions-calculation-utilities.md
