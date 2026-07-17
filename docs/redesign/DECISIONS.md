# TM Stats Redesign Decisions

## Approved product structure

The application will have eight primary pages:

1. Log a Game
2. My Profile
3. Global Insights
4. Individual Insights
5. Group Insights
6. Compare
7. Improvement
8. Leaderboard

## Production graphics

Existing Supabase-hosted tag icons, point-source graphics, and corporation
logos must be integrated throughout the application.

## Temporal game data

The game log supports:

- Cards bought by player and generation
- Terraforming Rating by player and generation

Explicit zero values must remain distinct from missing observations.

## Win point differential

Winner margin is measured against the highest non-winning final score.

Tied first-place games require explicit handling and must not be silently
treated as ordinary positive-margin wins.

## Agent workflow

- One phase or substep at a time
- Clean commit before switching agents
- State and handoff documentation required
- Incoming agent verifies the previous commit before editing

## Glossary and Card Database preservation

Approved on 2026-07-17 by the explicitly assigned Glossary and Card Database
Preservation and Cross-Linking task:

- Historical commit `b13276d88` is the compatibility baseline for Glossary
  identity and behavior: `/glossary`, category IDs, entry slugs, term names,
  aliases, fragment destinations, controlled matching, and destination focus.
- Current governing redesign contracts control all definitions, formulas,
  eligibility, coverage, availability, and missing-data semantics. Historical
  wording is not authority for an obsolete metric claim.
- `/cards` is the canonical authenticated Card Database and must use the full
  repository-backed Card Lookup, not a promo-only substitute.
- Promo browsing remains a specialized reference view only; it does not define
  the Card Database.
- Historical implementation is adapted to current routing, server repository,
  authentication, group context, and accessibility patterns rather than being
  restored or cherry-picked wholesale.

## Card acquisition and conversion metrics

### Cards purchased

The number of cards a player paid to add to their hand.

Cards purchased must remain distinct from:

- Cards seen
- Cards drawn
- Cards received
- Cards played
- Cards discarded
- Cards retained at game end

### Cards seen

The number of distinct card opportunities genuinely presented to a player.

Cards seen may include separately recorded:

- Starting-card offers
- Research-phase offers
- Draft cards received
- Cards drawn through effects
- Cards inspected through effects

A card must not be counted as seen merely because it was purchased.

The same physical or logical card opportunity must not be counted more than
once unless the underlying game event genuinely presents it again.

### Purchase conversion

Purchase Conversion = Cards Purchased / Cards Seen

This metric is unavailable when Cards Seen is missing or zero.

Missing Cards Seen data must not be treated as zero.

### Hand acquisitions

Total Hand Acquisitions means cards entering the player's hand from all
recorded sources.

This may include:

- Purchased cards
- Cards drawn through effects
- Cards received through other game effects

### Purchased hand share

Purchased Hand Share =
Cards Purchased / Total Hand Acquisitions

### Hand utilization

Hand Utilization =
Cards Played / Total Hand Acquisitions

### End-hand carryover

End-Hand Carryover =
Cards Remaining at Game End / Total Hand Acquisitions

### Aggregation rules

For multi-game summaries, expose both:

- Ratio of totals
- Median per-game rate

Do not silently average percentages.

### Interpretation rules

Relationships between card acquisition behavior and outcomes are
observational associations.

Do not describe cards purchased, cards seen, or purchase conversion as
causing wins.

Relevant context includes:

- Number of generations
- Player count
- Drafting
- Expansion configuration
- Corporation
- Prelude
- Player strength
- Opponent strength

### Repeated card exposure

Cards Seen counts card opportunities, not unique card names.

Seeing the same named card in two separate legitimate offers, draws, or
inspection events counts as two card opportunities.

Seeing a card in one offer and then purchasing that same offered card counts
as one opportunity, not two.

A card must not be counted again merely because it remains visible, remains
in hand, or appears later in a game summary.

## Phase 2 analytics foundation assignment

Approved on 2026-07-17 by the explicit user assignment for Phase 2, Step 2.0.

Phase 2 is titled **Analytics Foundation**. Its approved purpose is analytics
scope, filters, capability modeling, and shared analytics state and data rules.
It is divided into these separately assigned substeps:

1. Step 2.0 — Analytics Foundation Specification and Acceptance Criteria
2. Step 2.1 — Analytics Scope and Capability Model
3. Step 2.2 — Shared Filter and URL-State Contracts
4. Step 2.3 — Metric, Sample, Coverage, and Eligibility Contracts
5. Step 2.4 — Canonical Analytics Definitions and Calculation Utilities
6. Step 2.5 — Analytics Repository and Query Contracts
7. Step 2.6 — Analytics Foundation Integration Validation

Completing one substep does not authorize the next substep.

## Phase 2 value and capability policy

- Explicit zero is a real observed value.
- Zero, missing, unavailable, and partial/lower-bound values remain distinct.
- An unavailable metric includes a reason.
- A display placeholder is never an underlying numeric value.
- Query error, empty eligible data, unsupported capability, and incomplete
  evidence remain distinct.
- Phase 2 capability contracts must represent supported, partially supported,
  unavailable, requires-query-work, requires-view, requires-new-fields, and
  insufficient-evidence states, with typed reasons and source/coverage metadata.
- A capability state and an evaluated metric-value state are separate contracts.

## Phase 2 filter and URL-state policy

Phase 2 must define typed shared filters, scope compatibility, normalization,
defaults, canonical parameter names, deterministic serialization/restoration,
invalid and stale value behavior, explicit compatibility aliases, reset
behavior, and filter-versus-selection synchronization.

The route owns the analytics scope; Phase 2 does not adopt a shared `scope`
query parameter. URL-provided identities never authorize access. Multi-value
filters use deterministic repeated parameters, and serialization emits canonical
names and ordering.

Step 2.2 implements this policy with these durable decisions:

- sample filters and durable comparison/highlight/focus selection are separate
  state objects; route/navigation and hover/focus/open-menu state remain outside
  URL-addressable analytics state;
- canonical filter parameters are `player`, `group`, `from`, `to`, `map`,
  `playerCount`, `generationCount`, `gameLength`, `expansion`, `corporation`,
  `prelude`, `corporationPrelude`, `card`, `tag`, `scoreSource`, `style`,
  `status`, and `minSample`; durable selection uses `entity`, `metric`, `point`,
  `series`, and `detail`;
- corporation/Prelude pairs use repeated `corporationPrelude` values encoded as
  canonical corporation UUID plus canonical Prelude UUID; display names are
  never identity;
- game range and imported/data-source filters remain deferred with no canonical
  parameter, while game-length remains typed but unavailable until its facts and
  category definition are approved;
- `finalized` is the omitted aggregate-status default, and `minSample=0` is an
  explicit value that must survive canonicalization;
- malformed, unknown, stale, authorization-rejected, unresolved, loading, and
  query-error identity states remain typed; unresolved/loading/query-error
  values may remain URL-restorable but are withheld from applicable query state;
- aliases are route-provided compatibility declarations only, canonical input
  wins an alias conflict, and serialization emits canonical names only; and
- reset removes registered analytics fields while preserving unrelated route
  state, and serialization strips authorization/token and internal error fields.

The complete contract and scope matrix are documented in
`SHARED-FILTER-URL-STATE-CONTRACTS.md`.

## Phase 2 sample, coverage, and formula policy

- There is no universal low-sample threshold.
- Thresholds are metric-specific and explicitly approved, or caller-provided.
- Absence of a threshold does not mean a sample passed a threshold.
- Low-sample categories remain visible unless an explicit filter excludes them.
- Denominators, eligible observations, coverage, and exclusion reasons are
  visible when they affect interpretation.
- Step 2.3 implements sample contracts as candidate, eligible, included, and
  excluded counts, with structured exclusion reasons. Comparison/highlight/focus
  selection is context only and does not narrow a sample unless represented as a
  real Step 2.2 filter.
- Step 2.3 implements minimum-sample states as no-threshold, met, not-met,
  cannot-evaluate, and insufficient-evidence. A missing threshold is never
  interpreted as a passed threshold.
- Step 2.3 implements coverage states as measured complete, partial, none,
  no-eligible-records, invalid, plus unknown and capability-unavailable
  evaluated coverage. Available/unavailable source counts must reconcile when
  provided.
- Step 2.3 implements eligibility states as eligible, ineligible,
  indeterminate, unavailable, and not-applicable, with structured reasons for
  every non-eligible state.
- Step 2.3 implements metric result states as loading, load-error,
  capability-unavailable, insufficient-evidence, and ready. Ready results carry
  the Phase 1 value states without coercing observed zero, missing,
  unavailable, partial, or error states into each other.
- Metric identity uses stable IDs/codes/versions. Display metadata is not
  identity, and analytics interpretation remains observational.
- Calculations are centralized, versioned, documented, and directly tested.
- React presentation components do not define business formulas.
- Step 2.0 approves no new metric formula.
- Step 2.3 approves no new metric formula, repository query, schema, migration,
  or production page integration.
- Step 2.4 may implement only formulas already approved here or added by a
  separate explicit approval.
- Ratio of totals and median per-game rate remain separate labeled results where
  supported; percentages are not silently averaged.
- Tie, missing operand, zero denominator, partial data, exclusions, and stable
  tie-breaking are explicit parts of every applicable formula contract.

## Phase 2 canonical calculation versioning

- Step 2.4 registers the approved calculation meanings at formula version `1`
  with stable metric IDs and codes; display copy remains outside identity.
- A semantic formula change requires a new version. It must not silently
  reinterpret an existing metric ID/version pair.
- The approved card-acquisition rate definitions use exact raw values and retain
  sample, eligibility, coverage, and denominator context. Formatting and
  rounding are presentation responsibilities, not calculation behavior.
- The sole-winner Win Point Differential implementation is winner score minus
  highest non-winning score. Tied-first remains indeterminate with no numeric
  result until the unresolved policy receives separate approval.

## Phase 2 repository and query policy

- Step 2.5 establishes a client-safe repository contract separate from the
  server Supabase implementation, raw persistence DTOs, normalized analytics
  records, calculation utilities, and presentation.
- Repository operations use stable operation IDs and explicitly declare scope,
  supported filters, capabilities, authorization, pagination, and ordering.
- Step 2.2 sample filters remain distinct from comparison, highlight, and focus
  selection; selection context never silently changes a repository sample.
- Repository results distinguish ready, successful empty, partial,
  capability-unavailable, and error states. Raw persistence errors remain
  server diagnostics and never enter public result contracts.
- The first approved source slice is finalized game and player results for an
  authenticated group member or an RLS-readable game. Global scope is not
  implemented by this slice and therefore cannot bypass the existing global
  analytics opt-in boundary.
- Group lists use bounded offset pages ordered by played date, creation time,
  and stable game ID. Player results and import provenance are loaded in
  page-wide batches, never per game.
- Normalized records preserve database identity, zero, null/missing fields,
  native/imported provenance, finalized status, and tied-first winner flags.
- Returned-page coverage is not a metric sample size. Consumers remain
  responsible for Step 2.3 candidate, eligible, included, excluded,
  denominator, and minimum-sample construction for the exact metric.
- The version 1 sole-winner Win Point Differential is supported for game scope
  through the normalized source adapter and Step 2.4 utility. Tied-first remains
  indeterminate. Card-acquisition and per-generation facts remain unavailable
  when their recorded sources do not exist.
- Existing production analytics consumers and the broad legacy
  `analytics-repo.ts` are deferred migrations; Step 2.5 does not silently
  reinterpret or replace them.

The full boundary is documented in
`ANALYTICS-REPOSITORY-QUERY-CONTRACTS.md`.

## Phase 2 schema, page, and completion boundaries

- No database schema, migration, view, RPC, backfill, Supabase data, or Storage
  work is authorized without a separate explicit assignment and approval gate.
- Phase 2 does not migrate production destination pages, route ownership,
  navigation, middleware, authentication, or group switching.
- Unsupported historical facts remain unavailable and are not fabricated from
  final totals or incomplete event streams.
- Phase 3 may begin only after Steps 2.0 through 2.6 meet the Phase 2 acceptance
  criteria and Phase 3 receives explicit approval.

## Phase 2 questions that remain undecided

Step 2.0 does not decide:

- the tied-first numeric or exclusion result for canonical win point
  differential;
- the baseline for overall point differential;
- leaderboard ranking, eligibility, and minimum-history methodology;
- opponent/player-strength model, population, time window, uncertainty, or
  no-future-leakage rules;
- metric-specific sample and coverage thresholds;
- data-derived range construction and versioning;
- whether current corporation weighting, expected-score, efficiency, style,
  award-ROI, or final-action calculations become canonical;
- the accepted source and security contract for final terraforming actions;
- the event-versus-aggregate model, identity, reconciliation, provenance, and
  exhaustive coverage needed for card acquisition and Cards Seen;
- authoritative per-generation/final TR, duration, production/engine, and board
  coordinate capture contracts;
- which live-only database, RPC, or Storage objects become tracked production
  contracts; or
- a migration or backfill for any of the above.

These questions are blockers for the specific later substeps that require them,
not permission to resolve them by copying current UI or SQL behavior.

## Phase 2 Merger always-available Prelude remediation

Approved by the explicit Phase 2 Validation Remediation and Closure assignment
on 2026-07-17.

- `group_settings.default_guaranteed_merger_offer` is the owner-managed default
  for future games. It defaults to enabled for the established house rule, but
  only a saved game snapshot is authoritative for analytics.
- `games.guaranteed_merger_offer` is nullable. `true` and `false` are recorded
  facts; null is unknown/unrecorded and must never display or aggregate as Off.
  `games.guaranteed_merger_offer_source` records group default, editor override,
  historical policy, import metadata, or unknown provenance.
- New games copy the current group default once. Editors may override the saved
  snapshot for an exceptional game. Changing a group default cannot reinterpret
  a saved game.
- The historical always-on policy is an explicit, group-scoped, idempotent
  update of only null/null snapshots to `true` with `historical_policy`
  provenance. It is prepared but not applied without a separate production
  authorization and an owner-reviewed target group UUID.
- `game_player_preludes` remains the manual-selection source. A resolved,
  high-confidence imported `card_played` event may corroborate selection, but
  no Merger event never establishes that the variant was off or that a player
  rejected it.
- Imported source-card aliases use stable catalog source identities and one
  `prelude_card_aliases` relationship to canonical `preludes.code = merger`.
  No display-name identity or automatic final-selection correction is allowed.
- Merger reports distinguish usage rate, availability rate, and selection rate
  given availability. Guaranteed-variant exposure is segmented from random and
  unknown sources; non-Merger random offers remain unknown unless independently
  captured.

## Corporation logo identification

Approved corporation logos contain the corporation name as part of the
artwork.

When an approved corporation logo is rendered at a size where its embedded
name remains clearly legible, the interface does not need to repeat the
corporation name as adjacent visible text.

Requirements:

- Resolve corporation logos using the canonical corporation ID or canonical
  slug.
- An informative standalone logo must use the corporation name as its alt
  text.
- A logo displayed beside a visible corporation name is decorative and must
  use empty alt text.
- Interactive logo-only controls must have an accessible name containing the
  corporation name.
- Missing or failed logos must fall back to the corporation name or an
  approved textual abbreviation.
- Keep a visible text label in compact contexts where the name inside the logo
  is too small to read reliably.
- Do not rely on embedded image text for screen-reader accessibility.
- Do not repeat the corporation name visually when the approved logo already
  displays it clearly and legibly.

## Corporation logo asset replacement and presentation

Approved on 2026-07-17 as a separately authorized production task executed
between Phase 2 Step 2.5 and Step 2.6 (it did not begin Step 2.6).

- Corporation logos are stored as **uniform 800×800 tiles** on the
  `tm-corporation-logos` bucket: content trimmed, scaled to fit with a
  consistent margin, centered, and flattened onto a solid background.
- Each logo is placed on **white `#ffffff`**, **black `#000000`**, or **orange
  `#f06a32`** (the app `--tm-tr` accent), chosen per logo for readability against
  the app surface `#141a22`. Backgrounds prevent dark-on-dark and light-on-light
  wash-out; the orange is a real theme token, not an arbitrary color.
- Objects are **content-addressed** (`corporation-logo-<sha256>.png`) so refreshed
  art busts the bucket's one-year cache without overwriting prior objects.
- Stable identity is `corporations.id` + `code`; a source filename, display name,
  prior `logo_path`, object name, or URL never selects a corporation. Near-miss
  and replacement art are matched to a corporation only by verified identity
  (embedded wordmark review plus explicit user adjudication), never by filename.
- The four cross-edition logos that share one object (Athena, Eris, Kuiper
  Cooperative, Tycho Magnetics) **remain shared** — both corporation records in
  each pair point to one tile.
- Prior objects are retained (no deletion) so `logo_path` can be reverted to fully
  roll back. `community:marabout-shiritori`'s previously-missing object is now
  resolved.
- This task replaced only `logo_path` and Storage objects in
  `tm-corporation-logos`; no corporation identity field, schema, RLS policy,
  bucket configuration, or unrelated asset changed, and nothing was deployed.
