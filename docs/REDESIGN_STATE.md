# TM Stats Redesign State

## Current phase

Phase 2 — Analytics Foundation

## Current substep

Step 2.1 — Analytics Scope and Capability Model

## Status

Completed. Step 2.1 added the client-safe typed analytics contracts under
`src/lib/analytics/`: the six approved scopes with dataset/population context
and structural validation; thirteen stable-identity subject kinds with display
metadata kept separate from identity; the seven-status capability model with
typed reason codes, data requirements, scope-support declarations, and
remediation metadata; eight audit-traceable default capability declarations;
the ready/capability-unavailable/load-error value-availability envelope over
the Phase 1 `MetricValue`; the structural coverage ledger with
source-dimensional coverage and zero-denominator safety; and evidence/
provenance metadata with verification flags. 102 focused tests across seven
files were added, and full tests, typecheck, lint, and build pass against the
recorded baseline. No formulas, filters, URL state, repository queries,
schema, Supabase state, dependencies, or production pages changed.

## Branch

redesign/tm-stats-dashboard-rebuild

## Current owner

Claude — analytics scope and capability model

## Last completed commit

Step 2.1 commit

## Next action

Begin Step 2.2 — Shared Filter and URL-State Contracts only when explicitly
assigned. Do not begin metric-result contracts, formulas, repository changes,
schema work, production page integration, navigation, or route migration with
that assignment.

## Active blockers

No blocker prevents Step 2.2's filter and URL-state contracts. Later Phase 2
work remains blocked, where applicable, by undecided tied-first win-margin
behavior; overall point-differential baseline; leaderboard and
opponent-strength methodology; metric-specific sample, coverage, and range
rules; approval of current weighting/efficiency/style/award/final-action
formulas; final-action RPC source/security verification; card
opportunity/acquisition identity and coverage; TR, duration,
production/engine, and board capture contracts; role/global-opt-in semantics;
generated database types; and acceptance of live-only schema, RPC, and
Storage contracts. Step 2.1 resolved none of those decisions and encoded them
as typed capability limitations instead.

## Database migration status

No Phase 2 migrations created. Step 2.1 changed client-safe TypeScript
contracts, tests, and documentation only and did not query or change database
or Storage state.

## Latest handoff

docs/agent-handoffs/PHASE-02-STEP-01-analytics-scope-capability-model.md
