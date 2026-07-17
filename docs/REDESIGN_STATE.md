# TM Stats Redesign State

## Current phase

Phase 2 — Analytics Foundation

## Current substep

Step 2.5 — Analytics Repository and Query Contracts

## Status

Completed. Step 2.5 added client-safe typed operation/result contracts,
normalized finalized-game source records, and authenticated server readers for
a bounded group page and one RLS-readable game. The operations reuse Step 2.2
filters, keep selection out of the sample, report Step 2.3 coverage/evidence,
preserve zero/missing/native/imported/tied-first facts, and feed the Step 2.4
Win Point Differential utility without duplicating its formula. Inputs are
validated before broad reads; ordering is stable; child rows are batched; raw
errors are redacted; and empty, partial, unavailable, unauthorized, and failed
results remain distinct. Full validation passes at 101 test files / 540 tests,
with typecheck clean, the same four baseline lint warnings, and 23/23 build
pages. No SQL, migration, view, RPC, schema, Supabase state, Storage,
dependency, route, navigation, deployment, production page, or legacy consumer
changed.

## Corporation logo asset replacement (separately authorized, post-2.5)

Completed. A separately approved production task replaced every corporation logo
and remapped `public.corporations.logo_path`. All 116 corporations now resolve to
uniform 800×800 content-addressed tiles (`corporation-logo-<sha256>.png`) on
white/black/orange (`#f06a32`) backgrounds; 112 distinct objects (4 shared
cross-edition pairs). Matching used verified `id`+`code` identity (16 user-supplied
replacements, 4 near-miss adjudications, 96 name matches; 0 unmatched/ambiguous).
Production reconciliation: 116 resolvable, 0 broken, 228 objects (116 prior
retained for rollback + 112 new), all referenced new objects `image/png`.
Only `logo_path` and `tm-corporation-logos` objects changed — no corporation
identity field, schema, RLS, bucket config, unrelated asset, or deployment.
Repository validation at commit: asset suite 48/48, typecheck clean; full
`vitest`/`lint`/`build` recorded in the commit. Rollback:
`docs/redesign/assets/corporation-logos/ROLLBACK.md`. This task did **not** begin
Step 2.6.

## Branch

redesign/tm-stats-dashboard-rebuild

## Current owner

Codex — analytics repository and query contracts

## Last completed commit

Step 2.5 focused completion commit (hash recorded in the completion report)

## Next action

Begin Step 2.6 — Analytics Foundation Integration Validation only when
explicitly assigned. Do not begin SQL, schema, production page integration,
navigation, route migration, deployment, or Supabase mutation with that
assignment unless separately authorized.

## Active blockers

No blocker prevents a separately assigned Step 2.6 integration-validation
substep. Later analytics and consumer work remains blocked, where applicable,
by undecided tied-first numeric win-margin behavior;
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

No Phase 2 migrations created. Step 2.5 changed client-safe TypeScript
contracts/records, an authenticated server read repository, tests, and
documentation only. It did not query or change production database or Storage
state.

## Latest handoff

- docs/agent-handoffs/CORPORATION-LOGO-ASSET-REPLACEMENT-AND-REMAPPING.md
  (separately authorized production asset task, post-2.5)
- docs/agent-handoffs/PHASE-02-STEP-05-analytics-repository-query-contracts.md

## Production Supabase mutation record

The corporation-logo task applied production Storage uploads and
`public.corporations.logo_path` updates under separate explicit authorization.
These are not represented by Git; their verified results and rollback are in the
handoff and `docs/redesign/assets/corporation-logos/`. No Phase 2 migration, view,
RPC, schema, or other Supabase state was created or changed.
