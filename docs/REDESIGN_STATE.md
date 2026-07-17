# TM Stats Redesign State

## Current phase

Phase 2 — Analytics Foundation

## Current substep

Step 2.2 — Shared Filter and URL-State Contracts

## Status

Completed. Step 2.2 added the client-safe shared filter registry, typed
filter/scope compatibility, sample-filter and durable-selection contracts,
canonical parsing, deterministic normalization/serialization, explicit alias
handling, identity-resolution states, canonicalization, reset/partial-reset,
and Phase 1 selection reconciliation under `src/lib/analytics/`. Stable UUIDs,
codes, score-source keys, and typed subject tokens remain separate from display
metadata. Game range and imported/data-source semantics are deferred with no
URL fields; game length is explicitly unavailable. 49 focused tests across
three files were added. Full validation passes at 91 test files / 448 tests,
with typecheck clean, the same four baseline lint warnings, and 23/23 build
pages. No Step 2.3 result contracts, formulas, repositories, schema, Supabase
state, dependencies, routes, or production pages changed.

## Branch

redesign/tm-stats-dashboard-rebuild

## Current owner

Codex — shared filter and URL-state contracts

## Last completed commit

Step 2.2 focused completion commit (hash recorded in the completion report)

## Next action

Begin Step 2.3 — Metric, Sample, Coverage, and Eligibility Contracts only when
explicitly assigned. Do not begin formulas, repository changes, schema work,
production page integration, navigation, or route migration with that
assignment.

## Active blockers

No blocker prevents a separately assigned Step 2.3 contract substep. Later
Phase 2 work remains blocked, where applicable, by undecided tied-first win-margin
behavior; overall point-differential baseline; leaderboard and
opponent-strength methodology; metric-specific sample, coverage, and range
rules; approval of current weighting/efficiency/style/award/final-action
formulas; final-action RPC source/security verification; card
opportunity/acquisition identity and coverage; TR, duration,
production/engine, and board capture contracts; role/global-opt-in semantics;
generated database types; and acceptance of live-only schema, RPC, and
Storage contracts. Step 2.2 additionally leaves game-range, game-length, and
imported/data-source semantics deferred or unavailable rather than inventing
them.

## Database migration status

No Phase 2 migrations created. Step 2.2 changed client-safe TypeScript
contracts, tests, and documentation only and did not query or change database
or Storage state.

## Latest handoff

docs/agent-handoffs/PHASE-02-STEP-02-shared-filter-url-state-contracts.md
