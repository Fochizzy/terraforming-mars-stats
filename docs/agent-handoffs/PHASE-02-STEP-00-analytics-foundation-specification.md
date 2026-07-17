# Phase 2, Step 2.0 Handoff — Analytics Foundation Specification and Acceptance Criteria

## Status

Completed on 2026-07-17.

## Explicit approval source

The user explicitly assigned **Phase 2, Step 2.0 — Analytics Foundation
Specification and Acceptance Criteria** in the 2026-07-17 prompt beginning:
“This prompt is explicit user approval to begin Phase 2.” The assignment is
documentation-only and explicitly prohibits Phase 2 production-code work.

## Objective

Write the authoritative Phase 2 execution plan and acceptance criteria for
analytics scope, filters, capability modeling, and shared analytics state and
data rules so later implementation assignments do not invent formulas,
repository contracts, URL semantics, or missing-data behavior.

## Working directory and branch

- Working directory: `C:\Users\izzyh\Documents\Terraforming Mars Redesign`
- Branch: `redesign/tm-stats-dashboard-rebuild`
- Base commit: `4283e826f881eb116befbe3285c3de426fb25c6c`
- Final commit: this Step 2.0 completion commit,
  `docs(redesign): define phase 2 analytics foundation plan`; its hash is
  reported in the completion report because a commit cannot contain its own hash

## Prerequisites verified

- The required working directory and branch matched exactly.
- `HEAD` matched the required full base commit.
- Porcelain status was empty; Git emitted only the recorded user-level ignore
  permission warning.
- Phase 1 was complete through Step 1.3.
- The Phase 1 Step 1.3 commit, stat, and file list were inspected.
- The user assignment explicitly resolved the previous “Phase 2 unassigned”
  stop condition.

## Documents inspected

- `AGENTS.md`
- `CLAUDE.md`
- `docs/REDESIGN_STATE.md`
- `docs/redesign/README.md`
- `docs/redesign/MASTER-RULES.md`
- `docs/redesign/PAGE-ARCHITECTURE.md`
- `docs/redesign/DECISIONS.md`
- `docs/redesign/MIGRATION-MATRIX.md`
- `docs/redesign/COMPONENT-MIGRATION-MATRIX.md`
- `docs/redesign/DATA-CAPABILITIES.md`
- `docs/redesign/ANALYTICS-INVENTORY.md`
- `docs/redesign/ASSET-INVENTORY.md`
- `docs/redesign/BASELINE-VALIDATION.md`
- `docs/redesign/phases/01-shared-components.md`
- the previously empty `docs/redesign/phases/02-analytics-foundation.md`
- all three Phase 1 handoffs, especially
  `docs/agent-handoffs/PHASE-01-STEP-03-combined-dashboard-foundation.md`
- `docs/redesign/COMBINED-DASHBOARD-FOUNDATION.md`
- `docs/redesign/SHARED-ASSET-FOUNDATIONS.md`

## Source-code areas inspected

Read-only source inspection verified realistic boundaries and existing contracts:

- `src/lib/metrics/metric-value.ts` and tests;
- `src/components/foundations/`, especially data states, KPI, chart/table,
  filter, tooltip, and coverage/sample behavior and tests;
- `src/lib/assets/`, `src/components/assets/`, and their tests;
- `src/lib/dashboard/selection.ts`, `url-state.ts`, barrels, and tests;
- `src/components/dashboard/`, including coordination, controls, evidence table,
  insight rail, layout, detail surface, and tests;
- `src/features/dev/combined-dashboard-fixture.tsx` and tests;
- current analytics/repository responsibilities recorded in
  `src/lib/db/analytics-repo.ts`, current feature components, and the migration
  matrix; and
- relevant Supabase migration/view names as read-only documented contract
  evidence.

No production source was modified.

## Files created

- `docs/agent-handoffs/PHASE-02-STEP-00-analytics-foundation-specification.md`

## Files modified

- `docs/redesign/phases/02-analytics-foundation.md`
- `docs/redesign/DECISIONS.md`
- `docs/REDESIGN_STATE.md`

## Files intentionally untouched

- all files under `src/` and `tests/`;
- `package.json`, lockfiles, dependencies, and configuration;
- environment files;
- all Supabase migrations, schema, data, functions, policies, and Storage;
- production routes, pages, navigation, middleware, and auth/group behavior;
- deployment configuration and generated artifacts; and
- the original `C:\Users\izzyh\Documents\Terraforming Mars` worktree.

## Final Phase 2 substep structure

1. Step 2.0 — Analytics Foundation Specification and Acceptance Criteria
2. Step 2.1 — Analytics Scope and Capability Model
3. Step 2.2 — Shared Filter and URL-State Contracts
4. Step 2.3 — Metric, Sample, Coverage, and Eligibility Contracts
5. Step 2.4 — Canonical Analytics Definitions and Calculation Utilities
6. Step 2.5 — Analytics Repository and Query Contracts
7. Step 2.6 — Analytics Foundation Integration Validation

Every substep has prerequisites, likely file boundaries, runtime/server-client
boundaries, test expectations, migration policy, acceptance criteria, and an
explicit stop condition in the phase plan. One completed substep does not
authorize the next.

## Scope model planned

The plan defines typed `global`, `individual`, `group`, `comparison`, `game`,
and `domain` scopes. Each requires stable identity and authorized context. A
metric must declare supported scopes; unsupported scope is a capability result,
not a valid empty result. Global queries must enforce analytics opt-in at the
source. Route ownership determines scope; no shared canonical `scope` parameter
is introduced.

## Capability model planned

The public discriminated status vocabulary is:

- `supported`
- `partially-supported`
- `unavailable`
- `requires-query-work`
- `requires-view`
- `requires-new-fields`
- `insufficient-evidence`

Capability results expose typed reasons, required facts, available/source
coverage, supported scopes/filters, calculation version when relevant, and
evidence/source verification metadata. Capability, metric-value, query error,
and empty-data state remain separate.

## Filter model planned

The plan defines canonical categories for player, authorized group, ISO date
range, map, table size, generation count, approved game-length categories,
expansion, corporation, Prelude, card, tag, score source, style, explicit
minimum-sample exclusion, and game status. Each filter declares scope
compatibility. Unsupported filters return a typed incompatibility instead of
silently producing no rows.

Defaults do not invent identities or thresholds. Analytics defaults to finalized
games except where a game-specific contract explicitly supports another status.
No date range means the full authorized eligible history, not an implicit recent
window.

## URL-state model planned

Canonical filter parameters are `player`, `group`, `from`, `to`, `map`,
`playerCount`, `generationCount`, `gameLength`, `expansion`, `corporation`,
`prelude`, `card`, `tag`, `scoreSource`, `style`, `minSample`, and `status`.

Durable selection uses `entity`, `metric`, `point`, `series`, and `detail` when
supported. Hover is never serialized, and evidence-row focus mirrors `point`.
Multi-values use repeated parameters with deduplication and stable registry/value
ordering. Invalid and stale values are cleared through typed normalization and
Phase 1 availability reconciliation. Explicit compatibility aliases may parse
legacy fields, but serialization emits canonical names. URL identity never
authorizes access.

## Metric-result model planned

The shared result can carry stable metric/version identity, Phase 1
`MetricValue`, unit/formatting metadata, capability/scope, numerator and
denominator, eligible/excluded counts and reasons, sample/threshold metadata,
coverage/source completeness, evidence/freshness, and methodology. Formatting
is separate from calculations.

Explicit zero, missing, unavailable, partial, empty, error, stale, and
insufficient sample remain distinct. Unavailable values require reasons.

## Sample and coverage rules

- No universal sample threshold is approved.
- Thresholds are metric-specific and approved, or caller-provided.
- No threshold is a distinct policy state, not a passing sample.
- Low-sample categories remain visible unless explicitly filtered.
- `minSample` exclusion is separate from display-threshold metadata.
- Eligible denominators, excluded counts/reasons, and source coverage remain
  visible where they affect interpretation.
- Zero coverage with a positive denominator remains explicit zero coverage;
  an invalid/missing denominator is unavailable.
- Partial event coverage does not become full coverage.

## Approved formula policies

- Step 2.0 approves no new formula.
- Step 2.4 implements only definitions already approved in `DECISIONS.md` or
  separately approved later.
- Calculations are centralized, pure where possible, versioned, documented, and
  directly tested outside React.
- Ratio of totals and median per-game rate are separate labeled outputs where
  supported; percentages are not silently averaged.
- Tie, exclusion, zero denominator, missing input, partial data, eligibility, and
  deterministic tie-breaking behavior are explicit.
- Relationships remain observational and non-causal.

The plan preserves the approved Cards Purchased, Cards Seen, Purchase Conversion,
Total Hand Acquisitions, Purchased Hand Share, Hand Utilization, End-Hand
Carryover, repeated-exposure, and win-point-differential distinctions.

## Undecided formulas and policies

- tied-first canonical win-margin numeric/exclusion behavior;
- overall point-differential baseline;
- leaderboard methodology and eligibility;
- opponent/player-strength model;
- per-metric sample/coverage thresholds and range construction;
- whether current corporation weighting, expected-score, efficiency, style,
  award-ROI, and final-action implementations are canonical;
- verified final-action RPC source, security, and formula;
- card opportunity/acquisition persistence and identity model;
- authoritative TR, duration, production/engine, and board capture; and
- accepted live-only schema/RPC/Storage and generated-type contracts.

These are explicit blockers for the later work that depends on them, not
permissions to copy existing UI or SQL behavior.

## Repository and query boundaries

- Supabase access remains server-only under `src/lib/db/`.
- DTOs/contracts and calculations are client-safe and do not import Supabase or
  React.
- Repositories accept typed scope/filter inputs and return capability-aware,
  narrow DTOs.
- Error, empty, partial transport success, partial metric coverage, stale, and
  unavailable remain distinct.
- Global opt-in and group/game/player authorization are enforced server-side.
- Stable IDs replace display-label parsing.
- References/assets are batched; N+1 database, Storage, and signed-URL calls are
  prohibited.
- Remote-only contracts remain insufficient evidence until SQL, RLS/grants, and
  population are verified.

## Schema and migration boundaries

No Phase 2 migration was created or authorized. Phase 2 may document prospective
facts or query contracts, but schema, view, RPC, generated-type adoption,
backfill, production data, and Storage changes require a separate explicit
assignment. Historical facts that cannot be reconstructed honestly remain
unavailable.

## Testing expectations by substep

- **2.1:** exhaustive scope/capability/evidence/coverage type and guard tests.
- **2.2:** canonical filter parsing, compatibility, normalization, stable URL
  round-trip, stale/reset, alias, and selection synchronization tests.
- **2.3:** zero/missing/unavailable/partial, denominator, eligibility/exclusion,
  sample/no-threshold, coverage, and Phase 1 consumption tests.
- **2.4:** direct approved-formula tests for all operands, zero denominator,
  empty cohorts, ratio/median, ties, exclusions, ordering, version, and consumer
  parity.
- **2.5:** typed input/output, auth/opt-in assumptions, null/zero,
  empty/error/partial, batching/query count, ordering, capability, freshness,
  remote-failure, and backward-compatibility tests.
- **2.6:** end-to-end contract integration from filters/URL through repository,
  calculations, metric metadata, Phase 1 coordination/presentation, and
  accessibility.

Implementation substeps require focused tests followed by full tests, typecheck,
lint, and build with baseline comparison.

## Phase-level acceptance criteria

Phase 2 completes only after Steps 2.0–2.6 are individually assigned, validated,
documented, and committed; all public contracts and approved calculations are
typed/versioned/tested; value/capability/query states remain distinct end to end;
URL and repository behavior is deterministic and authorized; representative
Phase 1 consumption has integration proof; full validation passes; and no
production destination page, route, navigation, or unapproved Supabase change is
included.

Phase 2 completion does not itself authorize Phase 3.

## Step 2.0 validation results

- Documentation-only scope review: passed. The Phase 2 file is 46,268 bytes
  rather than empty, contains all required policy/architecture/validation
  sections, and defines seven substeps with seven acceptance-criteria sections.
- Step 2.1 implementable-scope check: passed. Its exact scope, prerequisites,
  existing/new/modified/untouched file boundaries, runtime boundary, migration
  rule, tests, and acceptance criteria are present.
- `git diff --check`: passed with no whitespace error. Git reported expected
  LF-to-CRLF working-copy normalization notices for modified tracked Markdown.
- Approved file-scope check: passed. Porcelain status contained exactly the four
  approved documentation files and no production source, test, dependency,
  environment, migration, or generated file.
- Full diff review: passed for the three tracked files; the new handoff was read
  in full separately because untracked files are not included in `git diff`.
- Full application tests/typecheck/lint/build: not required because only Markdown
  files changed. The Step 1.3 baseline of 81 files / 297 tests, four ESLint
  warnings, the `next lint` deprecation notice, and a passing 23/23-page build
  was not rerun or changed by Step 2.0.

The environment-specific user-level Git ignore permission warning remained
present on status commands and did not represent a worktree change.

## Blockers

No blocker prevents Step 2.1. The undecided formulas, thresholds, source facts,
schema contracts, and remote verification listed above gate only the later
substeps that require them.

## Next approved action

Begin Step 2.1 — Analytics Scope and Capability Model only when explicitly
assigned. Do not begin Step 2.2, formulas, repositories, schema work, production
page integration, navigation, routes, deployment, or Supabase mutation.

## Confirmations

- No production code changed.
- No test file changed.
- No dependency, environment file, route, navigation, or deployment file changed.
- No database migration was created or run.
- No Supabase data or Storage object was read, written, or modified.
- The original `C:\Users\izzyh\Documents\Terraforming Mars` worktree was not
  accessed or modified.
