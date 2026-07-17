# Phase 2 — Analytics Foundation

## Status

Steps 2.0 — Analytics Foundation Specification and Acceptance Criteria, 2.1 —
Analytics Scope and Capability Model, and 2.2 — Shared Filter and URL-State
Contracts — were completed on 2026-07-17. Steps 2.3 through 2.6 are specified
but unstarted and each requires a separate explicit assignment.

Phase 2 is a contract and calculation-foundation phase. It does not migrate a
production destination page, change navigation, introduce a production route,
or authorize database or Storage changes.

## Objective

Define and validate the shared analytics scope, filters, capability modeling,
metric results, calculations, repository boundaries, and data-integrity rules
that later TM Stats pages can consume without inventing semantics inside routes
or presentation components.

## Outcome

At Phase 2 completion, the repository will have:

- typed analytics scopes and subject/dataset contexts;
- typed capability, evidence, eligibility, coverage, and metric-result models;
- canonical shared filter normalization and URL-state contracts;
- centralized, versioned calculation utilities only for approved definitions;
- typed repository inputs and capability-aware outputs that distinguish errors,
  empty results, incomplete evidence, and unavailable facts;
- focused unit and integration tests proving the contracts work with the Phase 1
  dashboard foundations; and
- documentation that identifies unsupported facts and unresolved decisions
  without fabricating production behavior.

## Why Phase 2 follows Phase 1

Phase 1 established the presentation and coordination primitives that analytics
contracts must feed. Phase 2 gives those primitives real, consistent semantics
before route and page work begins. In particular, Phase 1 already supplies
distinct metric states, sample and coverage display primitives, typed asset
metadata, a responsive combined-dashboard anatomy, coordinated selection state,
and a caller-named URL adapter boundary. Phase 2 extends those foundations with
analytics-domain contracts; it must not create parallel replacements.

## Prerequisites

- Phase 0 audits and migration matrix are complete.
- Phase 1 is complete through Step 1.3 at commit
  `4283e826f881eb116befbe3285c3de426fb25c6c`.
- The redesign worktree is clean and on
  `redesign/tm-stats-dashboard-rebuild` before each substep begins.
- The incoming assignment names exactly one Phase 2 substep.
- Any formula, threshold, schema, authorization, or product decision required by
  that substep is already approved in `DECISIONS.md`, or the implementation must
  defer it explicitly.
- Real repository and Supabase capabilities, not target-page copy or fixture
  values, determine what a contract may claim to support.

## Phase 1 foundations to reuse

Phase 2 must reuse, as applicable:

- `MetricValue`, `metricFromNullable`, `SampleSize`, and `CoverageObservation`;
- `DataDisplayState`, shared loading/empty/error/unavailable states,
  `MissingDataNotice`, `LowSampleNotice`, and `PartialCoverageNotice`;
- `KpiCard`, `AnalyticsPanel`, `ChartContainer`, and `TableContainer`;
- `PageContainer`, `DashboardPageShell`, `PageHeader`, `SectionHeader`,
  `DashboardGrid`, and `FilterToolbar`;
- `CombinedDashboardLayout`, dashboard selectors, legend, summary, insight rail,
  evidence table, and responsive detail surface;
- `DashboardSelection`, availability reconciliation, controlled/uncontrolled
  coordination, deterministic reset, and stale-selection cleanup;
- the caller-named `DashboardUrlStateAdapter` boundary;
- typed asset descriptors, resolvers, fallbacks, and `AssetImage`; and
- the existing theme, accessibility, responsive, Vitest, Testing Library, and
  Recharts conventions.

Phase 2 may extend a Phase 1 type when the existing type cannot express an
approved analytics requirement. It must preserve backward compatibility or
provide an explicit adapter and tests; it must not silently reinterpret a Phase
1 field.

## Approved substep structure

| Substep | Title | Required result | Status |
| --- | --- | --- | --- |
| 2.0 | Analytics Foundation Specification and Acceptance Criteria | This authoritative plan, approved decisions, state update, and handoff | Completed |
| 2.1 | Analytics Scope and Capability Model | Typed scope, subject, dataset, capability, evidence, and coverage contracts | Completed |
| 2.2 | Shared Filter and URL-State Contracts | Typed filters, normalization, canonical URL encoding, restoration, compatibility, and reset behavior | Completed |
| 2.3 | Metric, Sample, Coverage, and Eligibility Contracts | Shared metric result, denominator, sample, coverage, eligibility, and exclusion contracts | Unstarted |
| 2.4 | Canonical Analytics Definitions and Calculation Utilities | Centralized, versioned, tested utilities for approved formulas only | Unstarted |
| 2.5 | Analytics Repository and Query Contracts | Typed query inputs, capability-aware outputs, batching, and error/partial behavior | Unstarted |
| 2.6 | Analytics Foundation Integration Validation | Cross-contract tests and proof that Phase 1 foundations consume Phase 2 results | Unstarted |

Completing one row does not authorize the next row.

## Required reading for every Phase 2 substep

1. Root `AGENTS.md` and `CLAUDE.md`
2. `docs/REDESIGN_STATE.md`
3. `docs/redesign/MASTER-RULES.md`
4. `docs/redesign/PAGE-ARCHITECTURE.md`
5. `docs/redesign/DECISIONS.md`
6. This phase file
7. `docs/redesign/MIGRATION-MATRIX.md`
8. `docs/redesign/DATA-CAPABILITIES.md`
9. `docs/redesign/ANALYTICS-INVENTORY.md`
10. `docs/redesign/COMPONENT-MIGRATION-MATRIX.md`
11. The latest completed Phase 2 handoff, or the Phase 1 Step 1.3 handoff when
    beginning Step 2.1
12. The exact implementation and tests being extended

Asset inventory and baseline validation are required when the substep touches
asset metadata, generated database types, validation expectations, or a recorded
baseline warning.

## Architecture and expected source-code areas

The intended dependency direction is:

`persisted facts / repository rows → repository DTOs → analytics contracts →
calculation utilities → presentation models → Phase 1 components`

Dependencies must not point from calculation or repository code into React
presentation components.

Likely areas to inspect include:

- `src/lib/metrics/metric-value.ts` and its tests;
- `src/lib/dashboard/selection.ts`, `url-state.ts`, and their tests;
- `src/components/foundations/` and `src/components/dashboard/`;
- `src/lib/db/analytics-repo.ts` and focused repository modules;
- current analytics types and calculations in `src/features/analytics/`,
  `src/features/insights/`, and `src/features/insights/build-insight-cards.ts`;
- Supabase migrations and analytics views as read-only contract evidence; and
- existing repository, component, and calculation tests.

Likely new client-safe pure modules may live under `src/lib/analytics/`, with a
barrel exporting only approved public contracts. Server-only database access
must remain under `src/lib/db/` and must not leak Supabase clients, credentials,
or server-only imports into client-safe modules. Exact files are chosen by each
assigned substep after inspecting current code; this plan does not create empty
placeholder files.

Expected test areas are colocated `*.test.ts` pure-contract and calculation tests,
focused repository tests under `src/lib/db/`, and narrowly scoped component or
integration tests only where a Phase 1 consumer boundary must be proven.

## Scope model

The scope contract must support only contexts backed by repository evidence:

| Scope | Meaning | Required identity/context | Important restrictions |
| --- | --- | --- | --- |
| `global` | Aggregates across globally eligible, opted-in groups | metric/domain and global eligibility policy | Must enforce global opt-in in the source query; must not expose group-private dimensions |
| `individual` | Analytics for one saved or linked player | stable player identity plus authorized context | Display names are not identity; group/global baselines require compatible coverage |
| `group` | Analytics for one authorized group | stable active group identity | Membership and RLS apply; group data is not automatically global data |
| `comparison` | Side-by-side compatible subjects | two or more typed subjects and one shared comparison context | Subjects, denominators, coverage, units, and formula versions must be compatible |
| `game` | Facts and derived values for one authorized game | game identity and game-player identities | Per-game facts do not imply aggregate eligibility; replay coverage may be partial |
| `domain` | Entity/domain analysis such as card, tag, corporation, Prelude, score source, style, map, or objective | typed domain and canonical entity identity | Each metric declares supported domains; catalog existence is not gameplay evidence |

Route ownership determines the primary scope. Phase 2 does not introduce a
canonical `scope` query parameter and does not revive the legacy ignored
`scope=` behavior. A metric must declare its supported scopes; absence from that
set is an unavailable capability, not an empty result.

## Capability-state rules

Step 2.1 must define a discriminated union whose public status vocabulary is:

- `supported` — required facts and an approved interpretation are available;
- `partially-supported` — useful lower-bound or subset evidence exists, with
  incomplete coverage represented explicitly;
- `unavailable` — the metric cannot be produced for this subject/context;
- `requires-query-work` — persisted facts appear sufficient, but a trustworthy
  read model does not yet exist;
- `requires-view` — an approved server-side view/RPC or equivalent grouped query
  is required;
- `requires-new-fields` — new persisted facts are required and historical values
  cannot be inferred;
- `insufficient-evidence` — a shape or remote object may exist, but source,
  writer, identity, coverage, or production population is unverified.

Every capability result must be able to expose:

- status;
- stable reason code and user-safe explanation;
- required facts or data contract;
- available coverage, including source dimensions when relevant;
- supported scopes and compatible filters;
- calculation definition/version when relevant; and
- evidence/source metadata and verification status when relevant.

`unavailable` must always carry a reason. Capability states describe whether a
metric can be produced; `MetricValue` describes a value for an evaluated
subject. The two must not be collapsed. A query error is not a capability state,
and an empty row set is not proof that a capability is unavailable.

## Value and data-integrity rules

- Explicit zero is an observed value and must remain numeric zero.
- Zero, missing, unavailable, and partial/lower-bound values are distinct.
- A UI placeholder is never stored in a numeric field or calculation input.
- Missing generation observations are not zero and are not moved to the final
  generation.
- Query error, empty eligible population, stale snapshot, and unsupported metric
  are distinct states.
- Partial data must include coverage/provenance and must not be promoted to an
  exact result.
- Non-finite outputs become unavailable calculation results with a reason.
- Winner and tie semantics remain explicit.
- Deterministic ordering must include a documented stable tie-breaker; a stable
  technical key may order equal results but must not be described as a business
  ranking preference.
- All relationships are observational unless a separately approved causal design
  exists. Cards, tags, corporations, Preludes, styles, maps, objectives, or other
  behaviors must not be described as causing wins.

## Filter contract

Filters narrow the eligible dataset. They are distinct from selections, which
coordinate focus within an already filtered dataset.

The shared filter vocabulary must cover these categories when the selected
scope and metric support them:

| Filter field | Canonical URL parameter | Shape and default |
| --- | --- | --- |
| Player | `player` | stable player ID; absent means route/context default, not an arbitrary player |
| Group | `group` | stable authorized group ID; absent means active context; never available as a privacy-breaking global filter |
| Date range start/end | `from`, `to` | ISO `YYYY-MM-DD`; absent means all eligible authorized history |
| Map | `map` | repeated canonical map IDs/codes; empty means all eligible maps |
| Table size | `playerCount` | repeated positive integers supported by recorded games |
| Generation count | `generationCount` | repeated positive integers; not a proxy for elapsed duration |
| Game-length category | `gameLength` | registered category ID only; unavailable until its definition is approved |
| Expansions | `expansion` | repeated canonical expansion codes/IDs |
| Corporation | `corporation` | repeated stable corporation IDs/codes |
| Prelude | `prelude` | repeated stable Prelude IDs/codes; no-Prelude and missing remain distinct |
| Card | `card` | repeated stable catalog IDs; catalog identity is not acquisition evidence |
| Tag | `tag` | repeated approved tag codes |
| Score source | `scoreSource` | repeated typed score-source IDs |
| Style | `style` | repeated approved style codes with declared/inferred provenance retained |
| Explicit sample exclusion | `minSample` | nonnegative integer only when a user explicitly requests exclusion; no default policy |
| Game status | `status` | registered status; analytics default is `finalized` unless a game-specific contract says otherwise |

Multi-value filters use repeated parameters, not comma-delimited strings. Values
are trimmed, validated against the field parser, deduplicated, and serialized in
stable canonical-key order. Query keys are serialized in the registry order
shown above. Default-valued filters are omitted where round-tripping remains
unambiguous.

### Filter compatibility by scope

| Filter category | Global | Individual | Group | Comparison | Game | Domain |
| --- | --- | --- | --- | --- | --- | --- |
| Player | No private player drilldown | Required subject or compatible selector | Optional member subset | Typed compatible subjects | Player within game | Only when domain metric supports player scope |
| Group | Never arbitrary group exposure | Authorized baseline/context only | Active group identity | Authorized common context only | Derived from game | Authorized group-domain context only |
| Date/game range | Yes | Yes | Yes | Shared range only | No | When source facts are temporal |
| Map/table size/generations/expansions | Yes | Yes | Yes | Shared compatible context | Descriptive, not narrowing route identity | When declared by metric |
| Corporation/Prelude/card/tag/score source/style | Metric-specific | Metric-specific | Metric-specific | Only if all subjects support it | Recorded game facts only | Canonical domain selectors |
| Minimum sample | Explicit exclusion only | Explicit exclusion only | Explicit exclusion only | Explicit exclusion only | Not aggregate | Explicit exclusion only |
| Status | Finalized | Finalized | Finalized | Finalized | Route game status | Metric-specific, finalized by default |

Unsupported filters are rejected with a compatibility reason; they are not
silently applied or interpreted as returning no data.

## URL-state rules

Step 2.2 must extend the Phase 1 caller-named adapter into a typed analytics URL
contract without changing production routes.

- The owning route supplies the scope; there is no shared `scope` parameter.
- Canonical filter parameters are the names in the filter table above.
- Durable selection parameters are `entity`, `metric`, `point`, `series`, and
  `detail` when the owning dashboard supports them.
- Hover is transient and is never serialized.
- The semantic evidence-row focus mirrors `point`; it does not receive a second
  competing URL field.
- Parsers accept only registered types/IDs. Invalid values are discarded and
  reported to normalization metadata for optional user feedback.
- A stale entity is cleared. Its dependent point, series, evidence, and detail
  selections are also cleared through Phase 1 availability reconciliation.
- Filter changes preserve compatible entity/metric selections and clear only
  selections invalidated by the new available IDs.
- Reset restores route-owned defaults, removes canonical analytics fields, and
  preserves unrelated query parameters.
- Legacy parameter aliases may be accepted only through an explicit
  route-provided compatibility map. Serialization always emits canonical names.
- Parsing and serialization are deterministic and idempotent: normalize(parse(
  serialize(normalize(input)))) yields the same canonical state.
- Multiple identical parameters are deduplicated; scalar parameters use the
  first valid canonical value and record discarded conflicts.
- URL state never authorizes an entity. Repositories revalidate group/game/player
  access server-side.

## Metric-result rules

Step 2.3 must define a shared result contract that can carry:

- stable metric ID and formula/definition version;
- `MetricValue` for observed, partial, missing, or unavailable value state;
- unit and formatting metadata without preformatted numeric placeholders;
- capability result and supported scope;
- numerator and denominator when interpretation depends on them;
- eligible and excluded observation counts plus typed exclusion reasons;
- sample size and optional caller-approved low-sample threshold;
- coverage count, eligible denominator, source-coverage dimensions, and
  complete/partial status;
- evidence/source metadata and freshness when available; and
- methodology/definition text or a stable reference to it.

Formatting stays separate from calculations. Presentation components may choose
labels and decimal formatting but must not recompute business metrics.

### Eligibility and exclusion

Eligibility is evaluated before aggregation. Exclusions use stable reason codes,
including as applicable missing numerator, missing denominator, zero denominator,
unsupported scope, incompatible context, incomplete required coverage,
unfinalized game, tie policy exclusion, or insufficient verified evidence.
Counts by exclusion reason remain inspectable; exclusions must not silently
disappear from methodology.

### Samples, coverage, and denominators

- There is no universal low-sample threshold.
- A threshold is metric-specific and approved, or explicitly caller-provided.
- Absence of a threshold means “no approved threshold,” not “sample sufficient.”
- `minSample` is an explicit dataset-exclusion filter and is separate from a
  low-sample display threshold.
- Low-sample categories remain visible by default and are communicated with text
  and semantics, not color alone.
- Denominators, eligible observations, and coverage appear wherever they affect
  interpretation.
- Zero coverage with a positive eligible denominator is shown as zero coverage.
- A non-positive or missing coverage denominator is unavailable, not `0%`.
- Mixed completeness includes source dimensions; “some events recorded” is not
  full event coverage.

## Formula approval and calculation policy

Step 2.0 approves no new metric formula. Step 2.4 may implement only definitions
already approved in `DECISIONS.md` or added there by a separate explicit approval.

Approved definitions currently include:

- Cards Purchased as cards paid for and added to hand, distinct from cards seen,
  drawn, received, played, discarded, or retained;
- Cards Seen as genuine card opportunities, including repeated named cards only
  when a distinct opportunity presents the card again;
- Purchase Conversion = Cards Purchased / Cards Seen, unavailable when Cards
  Seen is missing or zero;
- Total Hand Acquisitions as cards entering hand from recorded sources;
- Purchased Hand Share = Cards Purchased / Total Hand Acquisitions;
- Hand Utilization = Cards Played / Total Hand Acquisitions;
- End-Hand Carryover = Cards Remaining at Game End / Total Hand Acquisitions;
- for supported multi-game rates, both ratio of totals and median per-game rate;
- win point differential against the highest non-winning final score, with tied
  first requiring explicit handling; and
- observational, non-causal interpretation.

For multi-game rates:

- ratio of totals is `sum(eligible numerators) / sum(eligible denominators)`;
- median per-game rate is the arithmetic median of eligible per-game ratios;
- both use the same explicitly reported eligibility cohort unless a documented
  definition says otherwise; and
- percentages are never silently averaged.

Central utilities must be pure where possible, versioned by stable definition
ID, deterministic, and directly tested for explicit zero, missing operands,
zero denominator, partial data, empty inputs, even/odd medians, ties, exclusions,
and stable ordering.

The following remain undecided and block corresponding Step 2.4 work: the
numeric/exclusion policy for tied-first win margin; the definition of overall
point differential; leaderboard methodology and eligibility; opponent/player
strength adjustment; approved sample and coverage thresholds; versioned range
construction; corporation weighting; final-action formulas/source; and whether
current expected-score, efficiency, style, and award-ROI heuristics are accepted
canonical definitions. Existing implementations are evidence, not approval.

### Card-acquisition integrity

Cards Purchased, Cards Seen, Cards Drawn, Cards Received, Cards Played, Cards
Remaining, and Total Hand Acquisitions are separate facts. The contracts must:

- never infer Cards Seen from Cards Purchased;
- never sum hand snapshots to infer acquisitions;
- never use selected key cards as purchase or play evidence;
- require stable opportunity/source-event identity to avoid duplicate exposure;
- represent complete, source-specific partial, purchased-only, and no Cards Seen
  coverage separately; and
- keep historical games without these facts unavailable rather than backfilling
  from final totals.

### Differential integrity

The contracts keep separate:

- win point differential versus the highest non-winning score;
- overall point differential versus the separately approved opponent baseline;
- direct head-to-head differential;
- opponent-adjusted margin; and
- loss deficit.

Tied-first outcomes carry an explicit tie status and are never described as
ordinary positive-margin wins.

### Temporal integrity

- Generation-level observations are never reconstructed from final totals.
- Generation-level TR is never inferred from final TR or `tr_points`.
- Final TR is never inferred from the TR score component.
- Engine/production curves require real snapshots or events.
- Cards bought by generation and TR by generation remain independent facts.
- Missing or invalid event generations remain missing; they are not clamped to
  the final generation.

## Repository and query policy

Step 2.5 must define typed query inputs from the approved scope/filter contracts
and return capability-aware DTOs. Repository rules are:

- server-only Supabase access remains under `src/lib/db/`;
- calculation modules do not import Supabase or React;
- presentation modules do not normalize raw database rows or define formulas;
- route-specific readers prefer narrow DTOs over the broad `GroupAnalytics`
  bundle;
- repositories return explicit `ready`, `empty`, `error`, `partial`, or
  `unavailable` result state rather than converting failures to empty arrays;
- input authorization is rechecked server-side; URL IDs are untrusted;
- global readers enforce `global_analytics_enabled` in source selection;
- optional numeric fields preserve null and observed-zero distinctions;
- joins use stable IDs, never parsed display labels;
- list/reference/asset metadata is batched or preloaded; no query or signed-URL
  request is issued per rendered row;
- query fan-out, row volume, ordering, and pagination/cap are documented and
  tested where relevant;
- snapshot-derived results expose freshness/version or unavailable verification
  when freshness cannot be proven; and
- remote-only RPC/view shapes remain `insufficient-evidence` until their SQL,
  grants, RLS, and production population are verified.

Repository errors may preserve successfully loaded independent domains as
partial results only when the contract identifies which domains failed. Partial
transport success does not imply partial metric coverage.

## Schema and migration policy

- Step 2.0 creates no schema change or migration.
- Phase 2 may design and document prospective facts, DTOs, views, RPCs, generated
  database types, or drift repairs.
- No migration, linked-database mutation, Storage mutation, backfill, RPC/view
  deployment, or generated-type adoption is authorized unless a separate
  assignment explicitly names it.
- Before any future migration: approve the fact and identity model; define null,
  zero, partial, coverage, provenance, authorization, uniqueness, backfill
  exclusion, rollback, and tests; verify live/local drift read-only; and record
  the decision in `DECISIONS.md`.
- Historical facts that cannot be derived honestly remain nullable/unavailable.
- A migration must have SQL tests and focused repository/compatibility tests.

## Accessibility implications

- Missing, unavailable, partial, error, and low-sample states use text and
  programmatic semantics, not color alone.
- Filter controls have persistent accessible labels and keyboard operation.
- Validation/normalization feedback identifies invalid filters without stealing
  focus unnecessarily.
- Charts retain a semantic evidence table or equivalent accessible alternative.
- Methodology, denominator, sample, coverage, and exclusions are available to
  assistive technology.
- URL-restored selection announces meaningful state through the Phase 1 live
  selection summary.
- No hover-only interaction is required to access evidence or definitions.

## Performance requirements

- Parsing, normalization, eligibility, and calculations are pure and avoid work
  proportional to all production history during React render.
- Repeated filter values are deduplicated once; stable serialization avoids
  router churn.
- Repository inputs support set-based reads and batching; N+1 database, Storage,
  or signed-URL calls are prohibited.
- Broad existing analytics bundles are not expanded as a shortcut for a narrow
  contract.
- Large result sets define deterministic server ordering and pagination or an
  explicit cap.
- Calculation utilities avoid hidden repeated sorts where a shared prepared
  cohort is appropriate.
- Integration tests verify that availability reconciliation does not create URL
  or render loops.

## Detailed substeps and acceptance criteria

### Step 2.0 — Analytics Foundation Specification and Acceptance Criteria

**Purpose:** write this authoritative plan, record only the policies explicitly
approved by the assignment, update state, and create the Step 2.0 handoff.

**Files:** modify this phase file, `docs/redesign/DECISIONS.md`, and
`docs/REDESIGN_STATE.md`; create
`docs/agent-handoffs/PHASE-02-STEP-00-analytics-foundation-specification.md`.

**Must remain untouched:** all production source, tests, dependencies,
environment files, migrations, Supabase resources, routes, and navigation.

**Validation:** Markdown scope review, `git diff --check`, status/diff review,
and proof that only the four approved documentation files changed.

**Acceptance criteria:**

- all sections required by the Step 2.0 assignment are present;
- Steps 2.1 through 2.6 each have an implementable boundary and acceptance
  criteria;
- approved policies and undecided questions are separated;
- Step 2.1 can be assigned without inventing its types or scope;
- no production code, test, dependency, environment, migration, deployment, or
  Supabase state changes;
- state and handoff identify Step 2.1 as the only next action; and
- one focused documentation commit leaves the redesign worktree clean.

**Stop condition:** stop after the Step 2.0 commit. Do not begin Step 2.1.

### Step 2.1 — Analytics Scope and Capability Model

**Exact scope:** implement client-safe pure TypeScript contracts for analytics
scope, subject identity, dataset context, capability status/reasons, supported
scope/filter declarations, evidence/source metadata, and source-dimensional
coverage. Add adapters only where required to reuse Phase 1 `MetricValue`,
`CoverageObservation`, and data-state conventions. Do not implement business
metric formulas, URL parsing, repositories, schema, or production UI.

**Prerequisites:** Step 2.0 committed; explicit Step 2.1 assignment; current
audits rechecked against source; no unresolved naming conflict in the approved
status vocabulary.

**Likely existing files to inspect:**

- `src/lib/metrics/metric-value.ts` and tests;
- `src/lib/dashboard/selection.ts` and tests;
- `src/components/foundations/data-states.tsx` and tests;
- `src/lib/db/analytics-repo.ts` type declarations and mappers;
- current analytics repository types/consumers; and
- `DATA-CAPABILITIES.md` and `MIGRATION-MATRIX.md`.

**Likely new files:** cohesive modules such as
`src/lib/analytics/scopes.ts`, `capabilities.ts`, `evidence.ts`, a narrow barrel,
and colocated tests. Exact separation follows implementation size; no placeholder
file is required.

**Likely modified files:** only relevant analytics/metric barrels or Phase 1
contracts when an additive extension is necessary. Existing consumers retain
behavior.

**Must remain untouched:** production pages/routes/navigation, repository query
behavior, formula implementations, Supabase migrations/data/Storage, environment
files, and dependencies.

**Runtime boundary:** contracts and pure guards are client-safe. No server-only
import is allowed in their dependency graph.

**Migration:** none. If source inspection reveals a required persisted fact,
record `requires-new-fields`; do not add it.

**Tests:** every scope; stable subject identity; supported and unsupported
scope/filter declarations; every capability status; required unavailable reason;
partial/source coverage; evidence metadata; serializable/client-safe values; and
compatibility with Phase 1 metric/coverage states.

**Acceptance criteria:**

- the six approved scopes are modeled without claiming universal metric support;
- every capability status is a discriminated, exhaustively checked case;
- capability and value/query display state remain separate;
- unavailable and insufficient-evidence cases require typed reasons;
- evidence and coverage can represent source-specific partial data;
- no display name is used as canonical identity;
- exports are minimal and documented;
- focused tests, full tests, typecheck, lint, and build pass against the recorded
  baseline; and
- state/handoff identify Step 2.2 only, without beginning it.

### Step 2.2 — Shared Filter and URL-State Contracts

**Purpose:** implement the filter registry, scope compatibility, normalization,
defaults, canonical serialization/restoration, alias boundary, and selection
synchronization described above.

**Prerequisites:** Step 2.1 contracts committed; explicit Step 2.2 assignment.

**Likely existing files to inspect:** `src/lib/dashboard/url-state.ts`,
`selection.ts`, their tests, dashboard controls/hook tests, target-route docs,
and current query-parameter usage.

**Likely new files:** pure modules such as `src/lib/analytics/filters.ts`,
`filter-normalization.ts`, `filter-url-state.ts`, and tests.

**Likely modified files:** analytics barrel and, only when additive compatibility
requires it, the Phase 1 URL adapter/selection contract and focused tests.

**Must remain untouched:** production route ownership, navigation, middleware,
page queries, formulas, schema/migrations, dependencies, and environment files.

**Runtime boundary:** parsing, normalization, and serialization are client-safe;
authorization remains server-side and out of this substep.

**Migration:** none.

**Tests:** every canonical field; scalar/multi parsing; stable order; duplicates;
invalid values; date/range validation; defaults; unsupported scope filters; stale
entities; reset; unknown query preservation; explicit aliases; selection/filter
separation; URL round-trip/idempotence; and Phase 1 reconciliation.

**Acceptance criteria:**

- canonical parameter names and deterministic repeated-value encoding match this
  plan;
- defaults never invent an entity or threshold;
- invalid/stale values cannot survive as active selections;
- filter changes preserve only compatible selection state;
- reset preserves unrelated query state;
- unsupported filters return a typed compatibility result;
- legacy aliases are explicit and serialize canonically;
- no render/router synchronization loop is possible in tests;
- focused tests, full tests, typecheck, lint, and build pass; and
- state/handoff identify Step 2.3 only.

### Step 2.3 — Metric, Sample, Coverage, and Eligibility Contracts

**Purpose:** implement the shared metric-result, denominator, eligibility,
exclusion, sample, coverage, methodology, and evidence contracts.

**Prerequisites:** Steps 2.1 and 2.2 committed; explicit Step 2.3 assignment.

**Likely existing files to inspect:** `metric-value.ts`, shared data states,
`KpiCard`, dashboard evidence/insight components, current analytics DTOs, and
their tests.

**Likely new files:** pure modules such as `src/lib/analytics/metric-result.ts`,
`eligibility.ts`, `coverage.ts`, and tests.

**Likely modified files:** metric/analytics barrels and additive Phase 1 adapters
or component tests only if the approved result cannot be consumed otherwise.

**Must remain untouched:** business formulas, database queries/schema,
production pages, navigation, dependencies, and environment files.

**Runtime boundary:** contracts and pure derivation of display metadata are
client-safe. No repository access.

**Migration:** none.

**Tests:** observed zero; missing; unavailable reason; partial/lower bound; error
versus empty; numerator/denominator presence; zero denominator; eligibility and
exclusion counts; no-threshold behavior; caller threshold; zero/partial/missing
coverage; source coverage; methodology/version; and Phase 1 consumption.

**Acceptance criteria:**

- no value-state coercion occurs;
- denominators and exclusions remain inspectable;
- sample threshold absence is represented explicitly;
- low-sample data remains visible by default;
- coverage distinguishes eligible denominator from source completeness;
- result formatting is separate from numeric calculation;
- contracts serialize without React or server dependencies;
- focused tests, full tests, typecheck, lint, and build pass; and
- state/handoff identify Step 2.4 only.

### Step 2.4 — Canonical Analytics Definitions and Calculation Utilities

**Purpose:** implement only approved definitions in centralized, versioned, pure
calculation utilities and remove duplicated helpers only after consumer parity.

**Prerequisites:** Steps 2.1–2.3 committed; explicit Step 2.4 formula list in the
assignment; every listed formula approved in `DECISIONS.md`; unresolved formulas
excluded.

**Likely existing files to inspect:** analytics SQL/views, repository mappers,
`finalize-game.ts`, persisted-metric refresh SQL, score-source builders,
corporation/style/final-action components, `build-insight-cards.ts`, and current
formula tests.

**Likely new files:** domain-focused modules under
`src/lib/analytics/calculations/` plus direct tests and a definition/version
registry. Do not create a single unbounded utility file.

**Likely modified files:** only approved calculation consumers/adapters whose
parity is directly tested. Production pages are not redesigned.

**Must remain untouched:** unapproved formulas, page layout/navigation, schema
and migrations unless separately assigned, production data, dependencies, and
environment files.

**Runtime boundary:** calculations are pure/client-safe. Database-specific SQL
parity work remains server/migration scoped and requires separate approval.

**Migration:** no migration by default. A separately assigned view/RPC migration
must satisfy the migration gate in this plan.

**Tests:** every approved formula with explicit zero, missing operand, unavailable
input, partial data, division by zero, empty input, ratio of totals, odd/even
median, player counts, ties, stable sorting/tie-breaking, eligibility/exclusion,
version identity, and parity with retained consumers.

**Acceptance criteria:**

- the implementation inventory matches the assignment's approved formula list;
- no speculative formula or threshold is introduced;
- formula IDs/versions and methodology are public contract metadata;
- rate aggregation exposes ratio of totals and median per-game distinctly;
- tie and zero-denominator behavior are explicit;
- duplicated calculations retire only after every consumer has parity tests;
- calculation modules import neither React nor Supabase;
- focused and full validation pass; and
- state/handoff identify Step 2.5 only.

### Step 2.5 — Analytics Repository and Query Contracts

**Purpose:** implement typed query inputs/outputs and focused repository adapters
that preserve capability, eligibility, coverage, freshness, partial, and error
semantics without N+1 access.

**Prerequisites:** Steps 2.1–2.4 committed; explicit Step 2.5 repository slice;
required remote/local contracts verified or marked insufficient-evidence.

**Likely existing files to inspect:** `src/lib/db/analytics-repo.ts`, focused DB
repositories and tests, Supabase clients/migrations, route loaders as read-only
consumer evidence, reference repository batching, and generated-type status.

**Likely new files:** focused server-only readers under `src/lib/db/analytics/`,
client-safe DTO contracts under `src/lib/analytics/` when not already present,
and direct repository tests/mocks.

**Likely modified files:** existing repository barrels/mappers and only the
consumers named by the assignment for contract parity. No page migration.

**Must remain untouched:** unrelated repositories, production page structure,
navigation, unapproved SQL/schema, Supabase data/Storage, dependencies, and
environment files.

**Runtime boundary:** database clients/readers are server-only; DTOs and pure
contracts are client-safe; the boundary is enforced by imports and tests.

**Migration:** possible only under a separate explicit migration assignment
after the gate in this plan. Otherwise return `requires-view`,
`requires-new-fields`, or `insufficient-evidence`.

**Tests:** typed inputs; authorization assumptions; global opt-in; null/zero;
empty/error/partial distinctions; deterministic ordering; batching/query count;
no parsed display identities; capability propagation; freshness; remote-contract
failure; and backward compatibility for retained consumers.

**Acceptance criteria:**

- route inputs map to narrow typed repository queries;
- server/client imports are separated;
- errors are never converted to valid empty results;
- global/private scope rules are explicit and tested;
- null and observed zero survive mapping;
- query count is bounded and no per-row lookup occurs;
- unsupported source facts yield capability results rather than fabricated DTOs;
- focused and full validation pass; and
- state/handoff identify Step 2.6 only.

### Step 2.6 — Analytics Foundation Integration Validation

**Purpose:** validate all Phase 2 contracts together and prove Phase 1 dashboard
foundations consume them without migrating a destination page.

**Prerequisites:** Steps 2.1–2.5 committed and individually green; explicit Step
2.6 assignment; no unresolved blocker for the integration fixtures selected.

**Likely existing files to inspect:** all Phase 2 public contracts/tests, Phase 1
dashboard coordination and evidence tests, the development-only combined
dashboard fixture, and representative repository tests.

**Likely new files:** focused analytics-foundation integration tests and, only if
needed, a development/test fixture adapter that uses deterministic non-production
facts. No new production route.

**Likely modified files:** analytics barrels, existing development fixture/tests,
and documentation/state/handoff. Production destination pages remain untouched.

**Must remain untouched:** production route ownership/navigation, unrelated
features, unapproved formulas/schema, Supabase data/Storage, dependencies, and
environment files.

**Runtime boundary:** integration may cross server repository DTOs into
client-safe contracts through explicit serialization; no server client or secret
enters a client module.

**Migration:** none unless a separate assignment already approved and completed
the required migration before Step 2.6.

**Tests:** filter/URL round-trip into repository inputs; capability to metric/data
state; calculation outputs; eligibility/sample/coverage; repository error and
partial responses; coordinated entity/metric/point/table/detail state; explicit
zero/missing/unavailable/partial; accessibility; and deterministic fixture data.

**Acceptance criteria:**

- one tested path connects normalized filters, typed repository response,
  approved calculation result, metric metadata, and Phase 1 presentation state;
- explicit zero, missing, unavailable, partial, empty, and error remain distinct
  end to end;
- URL restoration and availability reconciliation are deterministic;
- repository errors and capability gaps render appropriate states;
- no production page/route/navigation or Supabase resource is migrated;
- focused tests, full tests, typecheck, lint, and build pass with new versus
  baseline warnings reported;
- Phase 2 documentation/state/decisions/handoff are complete; and
- Phase 3 is only the documented next phase and is not begun without explicit
  approval.

## Phase-level validation requirements

For implementation Steps 2.1–2.6, run focused tests first, then:

- `npm test`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

Record focused counts, full test-file/test/failure counts, typecheck, lint, build,
new warnings, baseline warnings, and differences from the prior handoff. Run
`git diff --check` and inspect the full staged diff before every commit.

Step 2.0 is documentation-only and requires `git diff --check`, status/stat/full
diff review, staged review, and proof that only its four approved Markdown files
changed. It does not require the application suite.

Do not weaken existing tests, use fixture values as production policy, run
`npm audit fix`, deploy, or mutate Supabase during Phase 2 validation.

## Handoff requirements

Every Phase 2 substep must update `docs/REDESIGN_STATE.md`, update
`docs/redesign/DECISIONS.md` only for explicit decisions, and create one
`docs/agent-handoffs/PHASE-02-STEP-<NN>-<short-name>.md` handoff containing:

- exact assignment, objective, directory, branch, base/final commit;
- prerequisites and source/documents inspected;
- files created/modified/intentionally untouched;
- contracts, formulas, data behavior, runtime boundary, and migration status;
- focused/full validation and baseline warning comparison;
- limitations, deferred capabilities, unresolved decisions, and blockers;
- the next explicitly approved action; and
- confirmation that no unauthorized production, Supabase, deployment, or
  original-worktree change occurred.

## Phase-level acceptance criteria

Phase 2 is complete only when:

- Steps 2.0 through 2.6 are individually assigned, completed, validated,
  documented, and committed;
- scopes, capability states, filters, URL state, metric results, eligibility,
  sample, coverage, evidence, and repository DTOs are typed and tested;
- all implemented calculations have approved versioned definitions and direct
  edge-case tests;
- zero, missing, unavailable, partial, error, empty, stale, and low-sample states
  remain distinct end to end;
- every metric declares supported scopes/filters and unsupported capabilities;
- URL state is deterministic, compatible, and does not authorize entities;
- repositories preserve nulls, errors, capability gaps, opt-in, and group scope
  while avoiding N+1 reads;
- Phase 1 dashboard foundations consume representative Phase 2 results through
  integration tests;
- complete validation passes with new warnings separated from the baseline;
- no production destination page, route ownership, or navigation was migrated;
- no schema/migration/Supabase change occurred without a separately approved and
  fully tested assignment; and
- final state/handoff names Phase 3 as awaiting explicit approval.

## Phase-wide prohibited changes

Unless a later prompt explicitly assigns one within the exact substep, do not:

- redesign or migrate a production page;
- add, remove, rename, or redirect a production route;
- change navigation, middleware, authentication, or group switching;
- create or run migrations, views, RPCs, backfills, generated schema adoption,
  Supabase mutations, or Storage changes;
- change environment files or dependencies;
- add a charting or UI framework;
- infer unsupported card, TR, production, duration, board, opponent, or temporal
  facts;
- approve a universal sample threshold;
- invent a formula, range, ranking, causal claim, or production URL policy;
- remove a legacy consumer before tested parity; or
- begin another Phase 2 substep or Phase 3 without explicit assignment.

## Explicit stop conditions

Stop the current substep when its acceptance criteria and focused commit are
complete. Stop without implementing a requested formula, query, schema, or
filter semantic when its required decision is absent or contradictory. Record
the blocker rather than choosing a policy from current UI behavior.

Step 2.0 stops after its documentation commit. Steps 2.1–2.6 stop after their
own handoffs and commits. Phase 2 completion does not itself authorize Phase 3.

## Approved next action

Begin Step 2.3 — Metric, Sample, Coverage, and Eligibility Contracts only when
explicitly assigned. Do not begin formulas, repository changes, schema work,
production page integration, navigation, route migration, deployment, or
Supabase mutation as part of that assignment.
