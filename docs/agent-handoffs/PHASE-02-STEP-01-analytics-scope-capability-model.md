# Phase 2, Step 2.1 Handoff — Analytics Scope and Capability Model

## Status

Completed on 2026-07-17.

## Explicit approval source

The user explicitly assigned **Phase 2, Step 2.1 — Analytics Scope and
Capability Model** in the 2026-07-17 prompt beginning "This prompt is explicit
user approval to complete: Phase 2, Step 2.1". A mid-task continuation prompt
added the separately approved documentation commit `9545f5899` (corporation
logo labeling rules) and directed that it become the Step 2.1 base revision.

## Objective

Create the shared typed analytics scope and capability model: reusable
client-safe contracts for analytics scope, subject identity, dataset context,
capability status and reasons, data requirements, coverage, evidence
metadata, and the distinct missing/unavailable/partial/supported and value
availability states — without implementing metric formulas, filters, URL
state, repository queries, database views, page migrations, or destination
dashboards.

## Working directory, branch, and commits

- Working directory: `C:\Users\izzyh\Documents\Terraforming Mars Redesign`
- Branch: `redesign/tm-stats-dashboard-rebuild`
- Base commit: `9545f589961fce4a0854ed1c6bcff8ba6c7c87d0`
  (`docs(redesign): define corporation logo labeling rules`), which sits on
  top of the Step 2.0 specification commit `73184cbdb`
- Final commit: the Step 2.1 completion commit,
  `feat(redesign): add phase 2 analytics scope and capability model`; its
  hash is reported in the completion report because a commit cannot contain
  its own hash

## Prerequisites verified

- Working directory, branch, and clean porcelain status matched exactly
  before editing began.
- Phase 1 was complete through Step 1.3 (`4283e826f`) and Step 2.0 was
  committed (`73184cbdb`) with a populated phase plan defining Step 2.1
  scope, prerequisites, boundaries, tests, and acceptance criteria.
- The mid-task base-revision change to `9545f5899` was verified with
  `git log`/`git show`: HEAD included the commit, only the two approved
  documentation files changed in it, and the in-progress Step 2.1 files were
  preserved untouched. Step 2.1 modifies neither
  `docs/redesign/DECISIONS.md` nor `docs/redesign/ASSET-INVENTORY.md`, so the
  corporation-logo policy is preserved verbatim.

## Documents inspected

`AGENTS.md`, `CLAUDE.md`, `docs/REDESIGN_STATE.md`, `docs/redesign/README.md`,
`MASTER-RULES.md`, `PAGE-ARCHITECTURE.md`, `DECISIONS.md` (including the new
corporation-logo section), `MIGRATION-MATRIX.md`,
`COMPONENT-MIGRATION-MATRIX.md`, `DATA-CAPABILITIES.md`,
`ANALYTICS-INVENTORY.md`, `BASELINE-VALIDATION.md`,
`phases/01-shared-components.md`, `phases/02-analytics-foundation.md`, all
three Phase 1 handoffs, and
`PHASE-02-STEP-00-analytics-foundation-specification.md`.

## Source code inspected (read-only)

- `src/lib/metrics/metric-value.ts` and its tests (Phase 1 `MetricValue`,
  `SampleSize`, `CoverageObservation` contracts and conventions);
- `src/lib/dashboard/selection.ts`, `url-state.ts`, `index.ts` (opaque-ID
  coordination and caller-named URL adapter boundary);
- `src/components/foundations/data-states.tsx` (`DataDisplayState` union);
- `src/lib/db/analytics-repo.ts` type declarations (stable-ID DTO
  conventions) and `src/lib/db/reference-repo.ts` (entity identity shapes);
- `src/lib/assets/asset-resolver.ts` and `src/lib/assets/index.ts`
  (`ScoreSourceKey`/`TagCode` registries);
- `vitest.config.ts` and existing colocated test conventions.

## Files created

### Contracts (`src/lib/analytics/`, all client-safe pure TypeScript)

- `subjects.ts` — subject kinds, references, identity keys, display types,
  validation
- `scopes.ts` — six approved scopes, domain kinds, dataset context,
  validation
- `coverage.ts` — structural coverage ledger, ratio/status helpers,
  normalization, Phase 1 adapter
- `evidence.ts` — evidence sources, verification flags, calculation-version
  metadata, validation
- `capabilities.ts` — seven-status capability union, reason codes, scope
  support, remediation, guards, validation
- `capability-declarations.ts` — eight audit-traceable default declarations
- `value-availability.ts` — ready/capability-unavailable/load-error envelope
- `index.ts` — documented barrel of the public contracts

### Tests (colocated)

- `subjects.test.ts`, `scopes.test.ts`, `coverage.test.ts`,
  `evidence.test.ts`, `capabilities.test.ts`,
  `capability-declarations.test.ts`, `value-availability.test.ts`
  (7 files / 102 tests)

### Documentation

- `docs/redesign/ANALYTICS-SCOPE-CAPABILITY-MODEL.md` — developer guide
- `docs/agent-handoffs/PHASE-02-STEP-01-analytics-scope-capability-model.md`
  (this handoff)

## Files modified

- `docs/REDESIGN_STATE.md` — Step 2.1 completion state
- `docs/redesign/phases/02-analytics-foundation.md` — status paragraph and
  the Step 2.1 substep table row only

No other file changed. `docs/redesign/DECISIONS.md` is intentionally
unchanged: Step 2.1 resolved no product decision, and the newly committed
corporation-logo section is preserved as-is.

## Existing contracts retained (unmodified)

- `MetricValue`, `metricFromNullable`, `SampleSize`, `CoverageObservation`,
  and every other Phase 1 metric/data-state primitive;
- the Phase 1 dashboard selection/URL adapter contracts;
- the Step 1.2 asset registries;
- all repository DTO types under `src/lib/db/`.

## Existing contracts adapted (additively, without modification)

- `MetricValue` is embedded as the value inside the new
  `ReadyAnalyticsValue` envelope rather than duplicated or extended.
- `CoverageObservation` is produced from the richer coverage ledger by
  `toCoverageObservation`, with a test proving Phase 1 `coverageFraction`
  and the new `analyticsCoverageRatio` agree, including the null
  zero-denominator case.
- The Step 1.2 `ScoreSourceKey` vocabulary is mirrored by
  `ANALYTICS_SCORE_SOURCE_KEYS`, pinned by a two-directional compile-time
  assignability test (the repo has no `expectTypeOf` convention and the asset
  module exports no runtime key list, so the type checker is the honest
  proof). No adapter to the component-level `DataDisplayState` was created,
  because `src/lib` must not import from `src/components`; that mapping
  belongs with later presentation-model work.

## Scope types implemented

`global`, `individual`, `group`, `comparison`, `game`, and `domain`, as a
discriminated union with per-scope stable identity fields;
`ANALYTICS_DOMAIN_KINDS` restricting domain analysis to the ten entity kinds;
`describeAnalyticsDatasetContext` deriving the population descriptor
(including `requiresGlobalOptIn: true` for the global population and for
domain scopes without a group context); and `validateAnalyticsScope` with
typed issues for missing/blank identities, too-few or duplicate comparison
subjects, invalid subject references, and domain/entity mismatch. No scope
claims universal metric support and no URL parameter name is encoded.

## Subject types implemented

Thirteen kinds with repository-evidenced stable identity: player, group,
game, corporation, prelude, corporation-prelude-pairing (typed ID pair
replacing display-label pairing), card, tag (canonical code), score-source
(typed ten-key registry), style (canonical code), map, milestone, award.
`analyticsSubjectKey`/`analyticsSubjectRefsEqual` build identity exclusively
from kind plus stable identifiers; `AnalyticsSubjectDisplay` and
`LabeledAnalyticsSubject` keep labels separate. `lineup`, `board-position`,
and `opponent` are deliberately excluded for lack of stable repository
identity, with the reasoning documented in code and the developer guide.

## Capability statuses implemented

The approved seven-status discriminated union: `supported`,
`partially-supported`, `unavailable`, `requires-query-work`, `requires-view`,
`requires-new-fields`, `insufficient-evidence`. Every non-supported status
requires a typed reason; `requires-new-fields` requires non-empty
`missingData`; `isAnalyticsCapabilityExecutable` narrows the two executable
statuses; `describeAnalyticsCapabilityStatus` is the exhaustively checked
switch. Scope support is declared through `AnalyticsScopeSupportDeclaration`
(supported list plus optional per-scope unsupported reasons; undeclared means
unsupported), with `isScopeSupportedByCapability` and
`describeUnsupportedScope` helpers. `AnalyticsCapabilityRemediation` states
permanent-versus-remediable and honest historical-backfill feasibility.

Eight default declarations trace the Phase 0 audit, covering all seven
statuses: `placement-and-winners` (supported),
`score-source-breakdown` (partially-supported),
`board-control-analytics` (unavailable),
`canonical-win-point-differential` (requires-query-work, backfillable once
approved), `opponent-adjusted-performance` (requires-view),
`cards-purchased-by-generation` and `tr-by-generation` (requires-new-fields,
no backfill), and `final-terraforming-actions` (insufficient-evidence,
unverified remote RPC). Declarations carry no numeric coverage and every
evidence source records `populationVerified: false`, because production row
coverage has never been audited.

## Reason-code model

`ANALYTICS_CAPABILITY_REASON_CODES` is a stable eleven-code union
(`required-facts-not-persisted`, `no-verified-event-writer`,
`no-canonical-read-model`, `approved-view-or-rpc-missing`,
`remote-contract-unverified`, `production-population-unverified`,
`approved-definition-missing`, `source-timing-not-recorded`,
`partial-source-coverage`, `unsupported-scope`, `unsupported-subject`), each
paired with a required user-safe explanation in
`AnalyticsCapabilityReason`. Scope and coverage validation issues use their
own stable code unions rather than arbitrary strings.

## Value-state model

`AnalyticsValueResult` separates three layers that must never collapse:
`ready` (carrying the Phase 1 `MetricValue`, so observed zero, nonzero,
partial/lower-bound, missing, and unavailable-for-subject stay distinct, plus
optional coverage/evidence/calculation-version/warnings),
`capability-unavailable` (carrying a `NonExecutableAnalyticsCapability`; the
constructor rejects executable capabilities at runtime), and `load-error`
(user-safe `AnalyticsLoadError`, distinct from knowing data is absent). No
state is coerced, missing never becomes zero, and no display placeholder is
an underlying value.

## Coverage model

`AnalyticsCoverage` is a structural ledger: eligible records, records with
required data, reconciled missing count, optional considered total,
exclusions and missing-data reasons by stable code, and per-source
`sourceDimensions` for source-specific partial data.
`analyticsCoverageRatio` returns `null` (never `0%`) for non-positive or
invalid denominators; `analyticsCoverageStatus` distinguishes `complete`,
`partial`, `none` (explicit zero coverage), `no-eligible-records`, and
`invalid`; `normalizeAnalyticsCoverage` is pure and deterministic
(locale-independent ordering, no duplicate merging, no input mutation);
`validateAnalyticsCoverage` reports typed consistency issues. No coverage or
sample threshold was invented — threshold interpretation is Step 2.3 work.

## Evidence and provenance model

`AnalyticsEvidence` names typed sources (persisted table, analytics view,
metric snapshot, remote RPC, runtime derivation, import evidence, audit
document) with independent `schemaVerified`/`populationVerified` flags,
optional qualifying game count, optional explicitly loaded game IDs,
ISO-8601 `calculatedAt`/`dataUpdatedAt` strings for serializability, and
optional coverage. `AnalyticsCalculationVersion` provides the definition
ID/version/methodology-reference shape; the definition registry itself is
Step 2.4 work. Contracts only — no evidence-loading behavior was added.

## Type guards and validators

Runtime guards: `isAnalyticsSubjectKind`, `isAnalyticsScoreSourceKey`,
`isAnalyticsScopeType`, `isAnalyticsDomainKind`,
`isAnalyticsCapabilityStatus`, `isAnalyticsCapabilityReasonCode`,
`isAnalyticsEvidenceSourceKind`, `isAnalyticsCapabilityExecutable`, and the
three value-result guards. Validators: `validateAnalyticsSubjectRef`,
`validateAnalyticsScope`, `validateAnalyticsCoverage`,
`validateAnalyticsEvidence`, `validateAnalyticsCapabilityResult` — all pure,
deterministic, side-effect-free, and returning typed issue lists with stable
codes. Exhaustiveness is enforced by `never`-checked switches.

## Tests added

7 files / 102 focused tests covering: every scope type valid and invalid
(missing/blank IDs, too-few and duplicate comparison subjects, invalid
subject references with paths, domain-entity mismatch, purity of
validation); dataset-context derivation including global-opt-in flags;
stable subject identity for all thirteen kinds, cross-kind distinctness,
pairing composites, display-never-identity, and the compile-time
score-source vocabulary pin; every capability status constructed, validated,
discriminated, described distinctly, and JSON-round-tripped; executable
narrowing; declared/generic unsupported-scope reasons; every capability
validator rule; every declaration passing validation with all seven statuses
present, no fabricated coverage, honest verification flags, deep
immutability, and deterministic ordering; coverage ratio/status across
complete/partial/none/no-eligible/invalid, zero-denominator safety, Phase 1
adapter agreement, source-dimension independence, normalization determinism
and non-mutation; evidence guards, validation, and serializability; and the
value envelope keeping observed zero, missing, subject-unavailable,
capability-unavailable, and load-error distinct, with the runtime rejection
of executable capabilities in the unavailable constructor.

## Full validation results

Compared with the Step 1.3/2.0 baseline (81 files / 297 tests; four ESLint
warnings; `next lint` deprecation notice; build 23/23 pages):

- Focused Step 2.1 tests — 7 files / 102 tests passed, 0 failed.
- `npm test` — 88 files / 399 tests passed, 0 failed (+7 files / +102 tests,
  all from Step 2.1).
- `npx tsc --noEmit` — passed, no errors (exit 0).
- `npm run lint` — exit 0 with exactly the four baseline warnings (three
  `@next/next/no-img-element` in `score-profile-panel.tsx`; unused
  `normalizeProfileHeadToHeadRow` in `analytics-repo.ts`) plus the `next
  lint` deprecation notice. No new warnings; no baseline warning was fixed
  (out of scope).
- `npm run build` — passed; 23/23 pages generated; the same four baseline
  warnings only.
- `git diff --check` — run before staging; results recorded in the
  completion report.

## Baseline warnings

Unchanged from the recorded baseline: the three `no-img-element` warnings,
the one unused-function warning, the `next lint` deprecation notice, and the
original dependency vulnerability/deprecation report (not re-audited; no
`npm audit fix` was run).

## Known limitations

- Capability declarations restate the documentation-only Phase 0 audit; no
  production row coverage was queried, so every declaration honestly reports
  `populationVerified: false` and carries no numeric coverage.
- Scope/subject validation is structural (non-blank, distinct, well-formed).
  UUID-format enforcement, registered-ID parsing, and authorization belong to
  Step 2.2 parsers and Step 2.5 repositories.
- Breakdown reason codes in the coverage ledger are stable caller-supplied
  strings until Step 2.3 registers the canonical exclusion and missing-data
  vocabularies.
- The declarations registry is a seed (eight entries), not an exhaustive
  metric catalog; later steps add entries per the documented safety
  checklist.
- No adapter maps the value envelope onto the component-level
  `DataDisplayState`; that mapping is deferred so `src/lib` never imports
  from `src/components`.

## Deferred Step 2.2 work

Filter registry and vocabulary, scope-filter compatibility, normalization,
defaults, canonical URL parameter names, deterministic
serialization/restoration, alias boundary, reset behavior, and
selection/filter synchronization — none of it was started.

## Unresolved capability questions

Unchanged from Step 2.0 and deliberately encoded as capability limitations
rather than resolved: tied-first canonical win-margin policy; overall
point-differential baseline; leaderboard and opponent-strength methodology;
metric-specific sample/coverage thresholds and range construction; approval
of current weighting/expected-score/efficiency/style/award-ROI/final-action
implementations; final-action RPC verification; card opportunity/acquisition
identity and coverage taxonomy; authoritative TR/duration/production/board
capture; canonical score-source display set; authoritative tag vocabulary;
role and global-opt-in semantics; generated database types; and acceptance of
live-only schema/RPC/Storage contracts.

## Next approved action

Begin Step 2.2 — Shared Filter and URL-State Contracts only when explicitly
assigned. Do not begin Step 2.3+, formulas, repositories, schema work,
production page integration, navigation, routes, deployment, or Supabase
mutation.

## Confirmations

- No metric formula work was added.
- No repository query work was added; nothing imports Supabase, and the new
  modules are client-safe pure TypeScript with no server-only imports.
- No schema or migration work was performed; no database or Storage state was
  read, written, or changed.
- No production page integration was made; no route, navigation, page,
  dependency, or environment file changed.
- The separately approved commit `9545f5899` was left intact and its
  corporation-logo policy is preserved unchanged.
- The original `C:\Users\izzyh\Documents\Terraforming Mars` worktree was not
  accessed or modified.
