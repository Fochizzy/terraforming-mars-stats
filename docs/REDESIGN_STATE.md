# TM Stats Redesign State

## Current substep

Glossary and Card Database Preservation and Cross-Linking

## Current owner

Codex - Glossary and Card Database preservation

## Status

Completed in the repository. The assigned preservation task restored the
authenticated `/glossary` route with 125 historical compatibility identities,
current-contract wording, accessible fragments, and safe centralized
cross-linking. It restored `/cards` as the full server-repository Card Database,
with real catalog records, stable IDs, metadata search, composed filters,
responsive browsing, real-art fallback, and a metadata detail dialog. Promo-only
browsing is no longer the canonical Card Database.

Full validation passes at 117 test files / 590 tests; `npx.cmd tsc --noEmit`
passes; lint and build pass with the same four baseline lint warnings; and the
build generates 24/24 pages. No production database, schema, migration, Storage,
deployment, push, dependency, or original-repository mutation occurred. Card
outcome statistics and acquisition metrics remain explicitly unavailable where
their reader/evidence contract is not approved.

Phase 2 remains formally complete. This separately assigned preservation task is
also complete in the repository; production execution remains separately gated.

## Last completed commit

Glossary and Card Database Preservation and Cross-Linking focused completion
commit (hash recorded in its dedicated handoff and completion report).

## Current phase

Phase 2 — Analytics Foundation (repository complete)

## Prior completed substep

Step 2.5 — Analytics Repository and Query Contracts

## Prior Step 2.5 status

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

## Prior owner

Codex — analytics repository and query contracts

## Prior Step 2.5 completed commit

Step 2.5 focused completion commit (hash recorded in the completion report)

## Prior next action

Begin Step 2.6 — Analytics Foundation Integration Validation only when
explicitly assigned. Do not begin SQL, schema, production page integration,
navigation, route migration, deployment, or Supabase mutation with that
assignment unless separately authorized.

## Next action

**Await a new explicit assignment.** Do not begin card-outcome statistics,
card-acquisition capture, broader cross-linking, schema work, production work,
or another redesign phase without that assignment.

## Active blockers

No repository blocker remains for Phase 2. The separately gated production
package needs an owner-approved target group UUID, a read-only dry run with no
catalog or conflicting-record stop condition, and explicit production execution
authorization. It must not be applied by a future unrelated task.

Separately, later analytics and consumer work remains blocked, where applicable,
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

One unapplied Phase 2 migration is prepared:
`20260717190000_add_merger_offer_rule_snapshots.sql`. Its verification SQL,
group-scoped dry run, idempotent historical policy backfill, and rollback are
reviewable locally. No migration, schema query, or data backfill was applied to
a linked or production database.

## Latest handoff

- docs/agent-handoffs/GLOSSARY-CARD-DATABASE-PRESERVATION-AND-CROSS-LINKING.md
- docs/agent-handoffs/PHASE-02-VALIDATION-REMEDIATION-AND-CLOSURE.md
- docs/agent-handoffs/PHASE-02-STEP-06-analytics-foundation-integration-validation.md
- docs/agent-handoffs/CORPORATION-LOGO-ASSET-REPLACEMENT-AND-REMAPPING.md
  (separately authorized production asset task, post-2.5)
- docs/agent-handoffs/PHASE-02-STEP-05-analytics-repository-query-contracts.md

## Production Supabase mutation record

The corporation-logo task applied production Storage uploads and
`public.corporations.logo_path` updates under separate explicit authorization.
These are not represented by Git; their verified results and rollback are in the
handoff and `docs/redesign/assets/corporation-logos/`. No Phase 2 migration, view,
RPC, schema, Storage, or other Supabase state was applied or changed.
