# Analytics Scope and Capability Model

- Phase: Phase 2, Step 2.1
- Location: `src/lib/analytics/` (barrel: `src/lib/analytics/index.ts`)
- Runtime boundary: client-safe pure TypeScript. No React, no Supabase, no
  server-only imports anywhere in the dependency graph.

This module answers two questions every later analytics surface must ask
before rendering anything:

1. **Where is this question being asked?** — the scope model.
2. **Can this metric be produced here, and if not, why?** — the capability
   model.

It also provides the shared vocabulary for subject identity, dataset
population, structural coverage, evidence/provenance, and the availability
envelope around an evaluated value.

## Scopes (`scopes.ts`)

`AnalyticsScope` is a discriminated union of the six approved contexts:

| Type | Identity carried | Population (via `describeAnalyticsDatasetContext`) |
| --- | --- | --- |
| `global` | none | opted-in group games; `requiresGlobalOptIn: true` |
| `individual` | `playerId`, optional `groupId` context | the player's authorized games |
| `group` | `groupId` | the group's authorized games |
| `comparison` | ≥ 2 `AnalyticsSubjectRef`s, optional `sharedGroupId` | the compared subjects' games in one shared context |
| `game` | `gameId` | one authorized game |
| `domain` | `domain` kind, optional focused `entity`, optional `groupId` | group-domain games, or opted-in games when no group context (`requiresGlobalOptIn: true`) |

Rules the model enforces or documents:

- Route ownership determines the primary scope. There is no shared `scope`
  URL parameter, and URL serialization belongs to Step 2.2.
- Scope identities are untrusted input. Nothing here authorizes access;
  repositories revalidate group/game/player access server-side (Step 2.5).
- `validateAnalyticsScope` checks structure only: non-blank identities, at
  least two distinct comparison subjects (duplicates detected by stable
  identity), and a focused domain entity whose kind matches its domain. An
  invalid scope reports typed `AnalyticsScopeIssue`s with stable codes.
- Structural validity does not imply metric compatibility. Whether compared
  subjects share denominators, coverage, units, and formula versions is
  metric-level work (Step 2.3+).

## Subjects (`subjects.ts`)

`AnalyticsSubjectRef` covers the thirteen kinds with stable repository
identity: player, group, game, corporation, prelude,
corporation-prelude-pairing, card, tag, score-source, style, map, milestone,
and award.

- Identity is a database ID (`players.id`, `corporations.id`, …) or a
  repository-approved canonical key: tag codes, style codes, and the typed
  ten-key score-source registry (`ANALYTICS_SCORE_SOURCE_KEYS`, mirroring the
  Step 1.2 asset `ScoreSourceKey` vocabulary — a compile-time test pins them
  together).
- Display names are never identity. `AnalyticsSubjectDisplay` /
  `LabeledAnalyticsSubject` keep labels separate; `analyticsSubjectKey` and
  `analyticsSubjectRefsEqual` ignore them by construction.
- `lineup`, `board-position`, and `opponent` are deliberately not subject
  kinds: current lineup analytics expose only display labels, no canonical
  board coordinate model exists, and an opponent is a role played by a
  `player` subject, not a separate identity.
- The score-source keys describe the ten recordable score components; whether
  all ten appear in a canonical display set remains an open product decision.

## Capabilities (`capabilities.ts`)

`AnalyticsCapabilityResult` is a discriminated union over the seven approved
statuses:

| Status | Meaning | Executable |
| --- | --- | --- |
| `supported` | required facts and an approved interpretation exist | yes |
| `partially-supported` | subset/lower-bound evidence with explicit incomplete coverage | yes |
| `unavailable` | cannot be produced for this subject/context | no |
| `requires-query-work` | facts appear sufficient; no trustworthy read model yet | no |
| `requires-view` | an approved server-side view/RPC is required | no |
| `requires-new-fields` | new persisted facts required; history not inferable | no |
| `insufficient-evidence` | a shape/remote object may exist but is unverified | no |

Contract rules:

- Every non-`supported` status carries a typed
  `AnalyticsCapabilityReason` — a stable machine-readable code from
  `ANALYTICS_CAPABILITY_REASON_CODES` plus a user-safe explanation.
- `requires-new-fields` must name its `missingData` requirements.
- Scope support is declared, never assumed: `scopes.supported` lists where
  the capability runs today, `scopes.unsupported` optionally documents
  specific scopes with their own reasons, and anything undeclared is
  unsupported. `describeUnsupportedScope` returns the declared reason or a
  generic `unsupported-scope` fallback.
- Only executable statuses may declare supported scopes;
  `validateAnalyticsCapabilityResult` enforces this and the other structural
  rules.
- `remediation` states whether a limitation is permanent or remediable and,
  when remediable, whether honest historical backfill is possible. "New
  capture can fix future games" and "history stays unavailable" are both
  expressible, and both explicit.

Capability state, metric value, and query/display state are three different
contracts. A capability says whether a metric can be produced; a
`MetricValue` describes an evaluated subject's value; a query error is
neither. An empty row set is never proof that a capability is unavailable.

## Default declarations (`capability-declarations.ts`)

`DECLARED_ANALYTICS_CAPABILITIES` restates audited postures from
`docs/redesign/DATA-CAPABILITIES.md` in the typed contract — one
well-evidenced entry per status (eight entries total), from
`placement-and-winners` (supported) to `cards-purchased-by-generation` and
`tr-by-generation` (requires-new-fields) and `final-terraforming-actions`
(insufficient-evidence).

Integrity rules for declarations:

- No invented support: statuses, reasons, and scope lists trace to the audit.
- No numeric coverage: production row coverage has never been audited, so
  static declarations must not claim counts. `populationVerified` is `false`
  on every evidence source for the same reason.
- Undecided product policies (tied-first margin, opponent model, canonical
  score-source display set, …) stay undecided; explanations may mention them
  but nothing here resolves them.

## Value and availability states (`value-availability.ts`)

`AnalyticsValueResult` is the envelope around one evaluated value:

- `ready` — evaluation ran. The Phase 1 `MetricValue` inside preserves
  observed (including explicit zero), partial (lower-bound), missing, and
  unavailable-for-subject distinctions. Optional `coverage`, `evidence`,
  `calculationVersion`, and `warnings` carry interpretation context.
- `capability-unavailable` — the metric cannot be produced here; carries the
  non-executable capability with its typed reason. The constructor rejects
  executable capabilities at runtime.
- `load-error` — loading failed; whether data exists is unknown, which is
  different from knowing it is absent. `AnalyticsLoadError` is user-safe,
  never a raw driver error.

No state is ever coerced into another, missing never becomes zero, and no
display placeholder ("-", "N/A") is ever an underlying value. Formatting
belongs to presentation code (Phase 1 primitives).

## Coverage (`coverage.ts`)

`AnalyticsCoverage` is a structural ledger: `eligibleRecords`,
`recordsWithRequiredData`, optional reconciled `recordsMissingRequiredData`,
optional `consideredRecords`, exclusion and missing-data breakdowns by stable
reason code, and per-source `sourceDimensions` so "some events recorded" is
never presented as full event coverage.

- `analyticsCoverageRatio` returns a fraction or `null` — a non-positive or
  invalid denominator is unavailable, never `0%`.
- `analyticsCoverageStatus` distinguishes `complete`, `partial`, `none`
  (explicit zero coverage over a positive denominator),
  `no-eligible-records`, and `invalid`.
- `normalizeAnalyticsCoverage` fills the derivable missing count and orders
  breakdowns deterministically (locale-independent); it never merges
  duplicates (validation reports those) and never mutates its input.
- `toCoverageObservation` adapts the ledger to the Phase 1
  `CoverageObservation` so shared presentation primitives render the same
  counts.
- There is no universal coverage or sample threshold here. Threshold
  interpretation is Step 2.3 work, and the canonical exclusion-reason
  vocabulary is registered there too.

## Evidence and provenance (`evidence.ts`)

`AnalyticsEvidence` names sources (`persisted-table`, `analytics-view`,
`metric-snapshot`, `remote-rpc`, `runtime-derivation`, `import-evidence`,
`audit-document`) with per-source verification flags (`schemaVerified`,
`populationVerified` — independent dimensions), optional qualifying game
count and explicitly loaded game IDs, ISO-8601 freshness timestamps, and
optional coverage. `AnalyticsCalculationVersion` is the version metadata
shape results carry; the definition registry itself is Step 2.4 work.

Evidence is a contract, not a loader: nothing here fetches anything, and
`gameIds` exists only for callers that already loaded them. Presentation
should surface counts, freshness, and verification state — not raw database
identifiers.

## How later steps consume these contracts

- **Step 2.2 (filters/URL):** filters narrow the population a scope already
  defines; scope-filter compatibility declarations reference
  `AnalyticsScopeType`; parsers validate IDs into subject references without
  making them identity-by-label.
- **Step 2.3 (metric results):** the shared metric-result contract embeds a
  capability result, a `MetricValue`, this coverage ledger, and registers the
  canonical exclusion-reason and threshold vocabularies.
- **Step 2.4 (calculations):** versioned definitions stamp
  `AnalyticsCalculationVersion` onto results.
- **Step 2.5 (repositories):** typed queries accept validated scopes, enforce
  authorization and global opt-in server-side, and return capability-aware
  DTOs using the availability envelope.

## Adding a new capability safely

1. Find the evidence first: the audit row in
   `docs/redesign/DATA-CAPABILITIES.md`, plus the actual tables/views/code.
   Product copy and target-page wishes are not evidence.
2. Pick the status the evidence supports — when in doubt, prefer the weaker
   claim (`insufficient-evidence` over `supported`).
3. Give every non-supported status a reason code from the registry and a
   user-safe explanation. Extend the reason-code registry only for a genuinely
   new category.
4. Declare only the scopes with a working, trustworthy read path today.
   Undeclared scopes are already unsupported — silence never claims support.
5. Name `requiredData`/`missingData` requirements with stable keys; state
   `remediation` including honest backfill feasibility.
6. Cite evidence sources with truthful verification flags; leave
   `populationVerified: false` until a read-only production audit says
   otherwise. Never embed numeric coverage in a static declaration.
7. Run `validateAnalyticsCapabilityResult` in a test and keep the
   declarations registry alphabetical.

## How to avoid claiming unsupported scope coverage

- Never default a metric to "all scopes"; `scopes.supported` starts empty.
- Non-executable statuses cannot list supported scopes (validated).
- A scope missing from `supported` is an unavailable capability, not an empty
  result — render the typed reason, not a blank chart.
- Catalog existence is not gameplay evidence: a card/corporation existing in
  the catalog says nothing about any scope's data support.

## What Step 2.1 intentionally does not implement

- No metric formulas, thresholds, ranking, or eligibility semantics
  (Steps 2.3/2.4).
- No filters, URL parameter names, parsing, or serialization (Step 2.2).
- No repository queries, Supabase access, views, RPCs, schema, or migrations
  (Step 2.5 and separately assigned migration work).
- No production page integration, navigation, or dashboards (later phases).
- No mapping onto the Phase 1 `DataDisplayState` component union — that
  adapter belongs with the presentation-model work so `src/lib` never imports
  from `src/components`.
- No resolution of undecided product policies (tied-first differential,
  overall differential baseline, opponent model, sample thresholds, canonical
  score-source display set, tag vocabulary).
