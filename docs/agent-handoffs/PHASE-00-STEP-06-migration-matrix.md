# Phase 0, Step 0.6 Handoff — Final Migration Matrix

## Status

Completed on 2026-07-17. Phase 0 is complete.

## Branch and baseline

- Target branch: `redesign/tm-stats-dashboard-rebuild`
- Dedicated redesign worktree baseline: `90d67b546`
- Baseline working tree before Step 0.6: clean
- Step 0.6 changes: documentation only
- Production application code changes: none
- Database migration created or run: none
- Supabase data, schema, policy, function, bucket, or Storage object changes: none
- Phase 1 implementation: not begun

The primary checkout was on another branch with unrelated tracked and untracked
application work. It was not switched, cleaned, staged, or modified. Step 0.6 was
prepared from the clean redesign branch in an isolated worktree, then committed as
one documentation-only change.

## Files inspected

### Required repository and redesign documents

- `AGENTS.md`
- `CLAUDE.md`
- `docs/REDESIGN_STATE.md`
- `docs/redesign/README.md`
- `docs/redesign/MASTER-RULES.md`
- `docs/redesign/PAGE-ARCHITECTURE.md`
- `docs/redesign/DECISIONS.md`
- `docs/redesign/ANALYTICS-INVENTORY.md`
- `docs/redesign/CURRENT-ROUTE-MAP.md`
- `docs/redesign/COMPONENT-MIGRATION-MATRIX.md`
- `docs/redesign/DATA-CAPABILITIES.md`
- `docs/redesign/ASSET-INVENTORY.md`
- `docs/redesign/BASELINE-VALIDATION.md`
- `docs/redesign/phases/00-repository-audit.md`

### All Phase 0 handoffs

- `docs/agent-handoffs/PHASE-00-STEP-01-route-inventory.md`
- `docs/agent-handoffs/PHASE-00-STEP-02-component-inventory.md`
- `docs/agent-handoffs/PHASE-00-STEP-03-data-capability-audit.md`
- `docs/agent-handoffs/PHASE-00-STEP-04-asset-inventory.md`
- `docs/agent-handoffs/PHASE-00-STEP-05-baseline-validation.md`

The Phase 0 source inventories already contain the exact application, repository,
schema, migration, test, asset, and live-read evidence inspected in their owning
steps. Step 0.6 consolidated those findings and did not repeat live Supabase reads
or mutate production state.

## Files changed

- Created `docs/redesign/MIGRATION-MATRIX.md`.
- Updated `docs/REDESIGN_STATE.md` to mark Step 0.6 and Phase 0 complete and set
  the next action to Phase 1, Step 1.1 — Shared Design Foundations.
- Created `docs/agent-handoffs/PHASE-00-STEP-06-migration-matrix.md`.

`docs/redesign/DECISIONS.md` was not changed. The matrix assigns unresolved
decisions to later phase gates but does not approve new product, route, formula,
schema, authorization, or asset choices.

## Route migrations

- Consolidated all 19 current route records: 14 page routes, four route handlers,
  and the favicon metadata route.
- Mapped current ownership to the target primary/supporting routes with source,
  responsibility, compatibility alias, auth/group requirements, affected
  components, data dependencies, phase, retirement condition, and risk.
- Explicitly records new target routes with no current source:
  `/games/[gameId]`, `/games/[gameId]/replay`, `/insights/global`,
  `/insights/individual`, `/insights/group`, `/compare`, `/improvement`, and
  `/leaderboard`.
- Keeps `/saved-games`, `/insights`, `/group`, and `/reset-pin` compatible until
  their target routes pass their stated parity and E2E retirement gates.
- Defers supporting URLs for Players, Groups, Group Members, and Group Settings,
  and records the no-group onboarding loop as a Phase 3 decision.

## Component migrations

- Consolidated all 59 meaningful components from Step 0.2.
- Every component row includes name, source, current owner, responsibility,
  retain/refactor/move/merge/split/replace/retire action, target, dependencies,
  existing tests, required tests, phase, retirement condition, and risk.
- Highest-risk component work remains `AppShell`, `ChartFrame`/text-parsing
  head-to-head behavior, log-game/import orchestration, `InsightsDashboard`,
  `GroupDashboard`, `ProfilePage`/`ProfileDashboard`, score profile, corporation
  analytics, replay, and final-action analysis.
- Legacy composite retirement is section-by-section; no page or component may be
  removed because a target route merely exists.

## Analytics migration

- Mapped formal ranking, placement, differentials, score sources, efficiency,
  scoring DNA, styles, corporation/Prelude, maps, tags, objectives, head-to-head,
  lineups, trends, replay, final actions, opponent adjustment, recommendation
  prose, and improvement persistence.
- Separately mapped all eight required card metrics: Cards Purchased, Cards Seen,
  Purchase Conversion, Purchased Hand Share, Hand Utilization, End-Hand
  Carryover, Purchase Pace, and Seen Pace.
- Each card metric explicitly includes its future relationships with win rate,
  final score, placement, canonical win-point differential, and approved overall
  point differential.
- None of the eight card metrics works from current persisted data. All need new
  facts and query work and cannot be backfilled for historical games. Hand
  Utilization additionally depends on repairing/verifying Cards Played events.
- Future cross-game rates must show ratio of totals and median per-game rate,
  denominators, eligible games/player-games, coverage, sample status, range/formula
  version, and non-causal wording.

## Schema and query dependencies

Highest-impact dependencies are:

1. shared missing/observed-zero/partial/error/sample types and null-preserving
   score-source queries;
2. canonical tied-first win margin and defined overall differential;
3. card opportunity/acquisition/hand-entry taxonomy, stable identities,
   provenance, coverage, reconciliation, and drafting/final-hand semantics;
4. verified event writer, actor linkage, source-event IDs, dedupe, generation and
   coverage for replay/cards/tags/board;
5. explicit per-generation/final TR, duration, production/engine and canonical
   board facts before their analytics;
6. versioned opponent/player-strength model and minimum history;
7. verified final-action RPC source/security;
8. recommendation/goal evidence, ownership, lifecycle, metric version and RLS;
9. generated Supabase database types, accepted live-schema contracts, snapshot
   freshness, global opt-in enforcement, and role-policy verification.

No schema work belongs to Phase 1. Phase 2 is the decision/contract gate; Phase 4
is the earliest approved capture phase after separately authorized implementation
and migrations.

## Asset dependencies

- All 16 asset families are mapped to current truth, current resolver/consumer,
  target shared resolver, work, gaps, phase, and risk.
- Phase 1 needs a typed shared asset descriptor/rendering primitive, brand metadata,
  family-aware fallbacks, and public/static/private separation.
- Later domain work remains gated by tag vocabulary gaps, score-icon variants,
  live-only corporation paths/buckets, card mapping conflicts, Terra Cimmeria Nova,
  private evidence signing, cache/version policy, and unavailable licensed Prelude,
  milestone, and award art.
- Text/initials remain the fallback; no display name may be converted into an
  object path by inference.

## Highest-risk work

1. Broad dashboard/repository decomposition without losing content or changing
   formulas.
2. Card/event schema and capture where no trustworthy historical facts exist.
3. Missing-versus-zero preservation across current default/coercion paths.
4. Log-game/import/finalization/refresh changes and partial-failure behavior.
5. Auth/group/route compatibility, especially no-group onboarding and safe `next`.
6. Live schema/Storage drift, private evidence, RLS/global opt-in, and handwritten
   database types.
7. Asset identity conflicts and long/mixed cache behavior.

## Changed implementation order

No top-level reorder was required. Phase 0 evidence supports the requested order:
shared foundations, analytics foundations, route compatibility, capture, games,
profile, leaderboard, global, individual, group, compare, improvement, specialized
analytics, and hardening.

Two dependency refinements are now mandatory:

- Phase 1 includes shared coverage/sample/error and asset primitives, not only
  visual shell pieces.
- Phase 2 data/formula contracts must be approved before Phase 4 captures card,
  event, TR, duration, production, or board facts. Specialized analytics cannot
  bypass this gate.

## Unresolved blockers

No blocker prevents Phase 1, Step 1.1. The final matrix documents and phase-assigns
21 later blocking questions covering card identity/coverage, differentials,
temporal facts, strength, samples/ranges, final-action RPC, production parity,
roles, goals, supporting URLs, no-group onboarding, Cards ownership, leaderboard,
lineups, pairing context, asset drift/identity/licensing/private evidence/cache,
and local archive retention.

These questions must be resolved in `DECISIONS.md` by the phase that depends on
them; they were not resolved by assumption in Step 0.6.

## Phase 0 exit status

All ten required exit criteria are met on the Step 0.6 completion commit:

- route inventory complete;
- component inventory complete;
- data capability audit complete;
- asset inventory complete;
- baseline validation complete;
- migration matrix complete;
- no undocumented blockers;
- working tree clean after commit;
- all Phase 0 work committed;
- no production behavior changed.

Phase 0 is complete. The next action is exactly:

**Phase 1, Step 1.1 — Shared Design Foundations.**

Do not begin it without explicit assignment.

## Validation

Step 0.6 validation is documentation-focused because Step 0.5 already reran the
full application baseline at the post-audit code revision:

- verified all required sections are present;
- verified 19 current route rows and 59 component rows;
- verified all eight named card metrics and all five required outcome
  relationships are explicit;
- verified data, assets, dependency map, exit criteria, Phase 1 entry criteria,
  compatibility/retirement rules and blocking questions are present;
- verified only the three Step 0.6 documentation files changed;
- ran whitespace and documentation integrity checks;
- verified no migration, Supabase or production application file changed;
- verified the redesign worktree is clean after the documentation-only commit.

The Step 0.5 baseline remains: 55 test files and 137 tests passed; typecheck
passed; lint and build passed with the four recorded baseline warnings.

## Commit

The completion commit is the documentation-only Step 0.6 commit containing this
handoff, the final matrix, and the state update.
