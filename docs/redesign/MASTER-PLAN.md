# TM Stats Redesign — Master Plan

> **Document status:** Living project plan  
> **Repository:** `C:\Users\izzyh\Documents\Terraforming Mars Redesign`  
> **Required branch:** `redesign/tm-stats-dashboard-rebuild`  
> **Original worktree:** `C:\Users\izzyh\Documents\Terraforming Mars` — **do not modify**

---

## 1. Purpose

This document is the durable project plan for redesigning **tm-stats.com** into a consistent, responsive Terraforming Mars analytics application while preserving:

- existing functionality
- real Supabase data
- current authentication and permissions
- approved analytics semantics
- approved Terraforming Mars assets
- accessibility
- missing-data integrity
- the existing repository architecture where appropriate

The redesign is executed **one approved phase substep at a time**. This plan provides project-wide context, but it does not grant permission to begin future work early or expand the current assignment.

---

## 2. Authority and Scope Control

When instructions conflict, use this authority order:

1. Current explicit user-approved assignment
2. `docs/REDESIGN_STATE.md`
3. The assigned phase file
4. `docs/redesign/DECISIONS.md`
5. The latest relevant handoff
6. `docs/redesign/MASTER-RULES.md`
7. `docs/redesign/reference/TM-Stats-Redesign-Master-Guide.docx`
8. This Markdown master plan

This file is a working companion to the Word master guide. It should summarize and operationalize approved decisions without silently replacing higher-authority sources.

### Scope rule

For every task:

- implement only the explicitly assigned phase and substep
- use future-phase material only as context
- record out-of-scope discoveries as deferred work
- do not begin the next substep until the current substep is validated, documented, committed, and marked complete

---

## 3. Project Outcomes

The completed redesign should provide:

- a coherent visual and interaction system across the application
- responsive desktop, tablet, and mobile layouts
- reusable and accessible analytics components
- deterministic and testable analytics definitions
- stable filter and URL-state behavior
- clear distinctions among observed, missing, unavailable, partial, and insufficient data
- real-data integrations that preserve existing authorization boundaries
- analytics language that remains observational rather than causal
- documented handoffs, acceptance criteria, and validation evidence for every substep

---

## 4. Non-Negotiable Constraints

### Repository safety

Work only in:

```text
C:\Users\izzyh\Documents\Terraforming Mars Redesign
```

Never modify:

```text
C:\Users\izzyh\Documents\Terraforming Mars
```

Do not clean, reset, stage, commit, copy files wholesale from, or otherwise alter the original worktree.

### Prohibited actions

Do not:

- deploy
- push unless explicitly instructed
- add dependencies without approval
- modify environment files
- run `npm audit fix`
- run `npm audit fix --force`
- mutate Supabase production data
- mutate Supabase Storage
- create migrations without separate approval
- create database views without separate approval
- modify schema without separate approval
- fix unrelated warnings
- refactor unrelated code
- begin the next substep early
- fabricate analytics data
- hard-code sample analytics
- silently substitute unsupported data
- suppress missing-data limitations
- copy the dirty original worktree wholesale

### Architectural separation

Keep these concerns separate:

- database queries
- repository and data-access contracts
- domain and calculation utilities
- typed analytics contracts
- presentation components
- URL and filter state

Avoid N+1 query patterns. Use real repository and Supabase capabilities.

---

## 5. Delivery Model

Every substep must include:

1. explicit scope
2. prerequisites
3. expected files or file categories
4. implementation plan
5. focused tests
6. acceptance criteria
7. validation results
8. `docs/REDESIGN_STATE.md` update
9. an agent handoff
10. a separate commit

### Standard completion gate

A substep is complete only when:

- all in-scope acceptance criteria are satisfied
- focused tests pass
- relevant broader validation passes
- no unapproved schema, dependency, environment, or production changes were made
- documentation reflects the implemented behavior
- the handoff identifies files changed, decisions made, tests run, remaining risks, and the next approved action
- the worktree is clean after commit

---

## 6. Project State

### Step 2.6 validation outcome (2026-07-17)

Phase 2, Step 2.6 completed with a focused integration test that composes
normalized URL filters and non-sample selection, normalized repository data,
the versioned sole-winner Win Point Differential, typed metric evidence, and a
Phase 1 accessible evidence table. Full validation passes at 103 test files /
556 tests, with typecheck clean, the four recorded lint warnings unchanged, and
a 23/23-page production build. No production route, navigation, schema,
migration, Supabase, Storage, dependency, or deployment change occurred.

Phase 2 is complete in the repository. The Merger remediation adds an
owner-managed group default copied to a nullable, provenance-bearing game
snapshot; stable catalog alias handling; reviewable actor/evidence resolution;
and availability-aware usage, availability, and conditional-selection
definitions. Unknown and incomplete evidence remain distinct from Off or zero,
and raw Merger selections are not ranked with randomly offered Preludes.

### Glossary and Card Database preservation outcome (2026-07-17)

The explicitly assigned preservation task restored the canonical authenticated
`/glossary` and full `/cards` Card Database without expanding analytics or data
authority. Historical commit `b13276d88` supplies Glossary identity and behavior
only; current contracts control semantic wording and unsupported historical
metrics remain visible as unavailable, provisional, or deferred. `/cards` now
uses the full server-repository catalog, stable card IDs, metadata search and
filters, image fallback, and a metadata detail dialog. Card outcome statistics
remain unavailable because no approved reader exists. The specialized promo
browser is not canonical. Controlled Glossary links operate only in trusted
explanatory text and preserve interactive, existing-link, code, URL, and
editable-content boundaries.

### Current next approved work

Await a new explicit assignment. The un-applied Merger production
migration/backfill package remains separately owner-gated; it is not authority
to begin any other Phase 2 work.

### Completed

#### Phase 1 — Shared Foundations

Completed through:

- Step 1.3 — Combined Dashboard Foundation

Completion commit:

```text
4283e826f881eb116befbe3285c3de426fb25c6c
```

Phase 1 delivered:

- theme and design tokens
- page and dashboard shells
- headers
- dashboard grids
- KPI cards
- analytics panels
- filter toolbar foundations
- chart containers
- table containers
- loading, empty, error, and unavailable states
- tooltip foundations
- metric-value handling
- shared asset foundations
- combined dashboard foundations

#### Phase 2 — Analytics Foundation Planning

Completed:

- Step 2.0 — Analytics Foundation Specification and Acceptance Criteria
- Step 2.1 — Analytics Scope and Capability Model
- Step 2.2 — Shared Filter and URL-State Contracts
- Step 2.3 — Metric, Sample, Coverage, and Eligibility Contracts
- Step 2.4 — Canonical Analytics Definitions and Calculation Utilities
- Step 2.5 — Analytics Repository and Query Contracts

Phase 2 planning commit:

```text
73184cbdb
```

Step 2.1 foundation commit:

```text
f3800146d
```

The Step 2.3 and Step 2.4 completion hashes are recorded in their completion
reports and handoffs.

#### Corporation Logo Policy

Documented in:

- `docs/redesign/ASSET-INVENTORY.md`
- `docs/redesign/DECISIONS.md`

Commit:

```text
9545f589961fce4a0854ed1c6bcff8ba6c7c87d0
```

### Most recently completed work

#### Phase 2, Step 2.5 — Analytics Repository and Query Contracts

Durable outcome:

- a reusable client-safe operation, input, normalized-data, evidence, warning,
  and error contract separated from the server persistence implementation
- authenticated, RLS-preserving finalized-game result operations for a bounded
  group page and one readable game
- explicit Step 2.2 filter compatibility and non-sample selection context,
  bounded stable ordering, and page-wide player/import batching
- null/zero, native/imported, complete/partial, empty/error, and capability
  distinctions preserved through normalized source records
- a pure source adapter into the version 1 Step 2.4 Win Point Differential;
  tied-first remains indeterminate and unsupported facts remain unavailable
- no database, schema, view, RPC, route, page, dependency, or legacy-consumer
  migration

Handoff:

```text
docs/agent-handoffs/PHASE-02-STEP-05-analytics-repository-query-contracts.md
```

### Next approved work

Only after an explicit assignment:

- Phase 2, Step 2.6 — Analytics Foundation Integration Validation

Step 2.5 completion does not authorize Step 2.6.

---

## 7. Phase Roadmap

## Phase 1 — Shared Components and Dashboard Foundations

**Status:** Complete through Step 1.3

Purpose:

- establish reusable visual, layout, state, and dashboard primitives
- reduce page-specific duplication
- create a stable base for later analytics integration

Completed substeps:

- Step 1.1 — Shared component foundations
- Step 1.2 — Shared analytics presentation foundations
- Step 1.3 — Combined Dashboard Foundation

Use the Phase 1 phase file and handoffs for exact historical scope.

---

## Phase 2 — Analytics Foundation

**Status:** Complete in repository; production migration/backfill package is
prepared but unapplied pending separate owner authorization.

Purpose:

- define the typed, testable, reusable analytics model before page-level analytics implementation
- separate data capability from desired presentation
- centralize analytics meaning and state handling
- establish stable filter, URL, metric, query, and repository contracts

### Step 2.0 — Analytics Foundation Specification and Acceptance Criteria

**Status:** Complete

Primary outcome:

- approved Phase 2 structure, goals, constraints, acceptance criteria, and validation expectations

### Step 2.1 — Analytics Scope and Capability Model

**Status:** Complete

Primary outcome:

- define supported analytics scopes
- map requested analytics to real repository and Supabase capabilities
- distinguish supported, partial, unavailable, and deferred analytics
- document data grain, identity, availability, and coverage limits
- prevent later UI work from assuming unsupported data

Expected deliverables should include, as applicable:

- typed scope identifiers
- capability categories or states
- scope-to-filter compatibility
- scope-to-metric compatibility
- known data limitations
- unsupported inference rules
- documentation and focused tests

Do not add production page integration unless explicitly approved.

### Step 2.2 — Shared Filter and URL-State Contracts

**Status:** Complete

Primary outcome:

- define shared typed filter contracts
- define scope-aware filter compatibility
- define deterministic URL parsing, validation, normalization, and serialization
- preserve stable entity identity
- distinguish filter state from transient UI state

Expected filter domains may include:

- player
- group
- date range
- game range
- map
- table size
- generation count
- game-length category
- expansions
- corporation
- Prelude
- corporation–Prelude pairing
- card
- tag
- score source
- player style
- finalized-game status
- imported-game status or data source
- minimum sample
- comparison entities

Not every filter applies to every scope.

### Step 2.3 — Metric, Sample, Coverage, and Eligibility Contracts

**Status:** Complete

Primary outcome:

- define metric result types and value states
- define metric-specific eligibility rules
- define sample and denominator contracts
- define coverage and partial-data reporting
- prevent null, zero, unavailable, and insufficient-evidence states from collapsing together

### Step 2.4 — Canonical Analytics Definitions and Calculation Utilities

**Status:** Complete

Primary outcome:

- implement only approved analytics definitions
- centralize deterministic calculation utilities
- keep formulas outside React presentation components
- provide tests for formulas, edge cases, and state handling
- version definitions where appropriate

### Step 2.5 — Analytics Repository and Query Contracts

**Status:** Complete

Primary outcome:

- define repository interfaces and query contracts
- align data retrieval with approved scopes, filters, metrics, eligibility, and coverage rules
- use real repository and Supabase capabilities
- avoid N+1 patterns
- preserve authorization boundaries

### Step 2.6 — Analytics Foundation Integration Validation

**Status:** Completed. Its Merger closure blocker was resolved by the separately
assigned Phase 2 Validation Remediation and Closure task.

Primary outcome:

- validate that Phase 2 contracts work together
- verify consistency among capability, filter, URL, metric, calculation, and repository layers
- confirm documentation, tests, and handoffs are sufficient for later page implementation
- identify deferred gaps without beginning the next phase

---

## 8. Analytics Domain Rules

### 8.1 Value states

The domain model must preserve distinct states for:

- observed zero
- observed nonzero value
- missing observation
- unavailable capability
- partial coverage
- insufficient evidence
- loading
- query error

Rules:

- do not represent all states as `null`
- do not convert missing data to zero
- do not use display strings such as `"-"`, `"N/A"`, or `"Unknown"` as domain values
- encode domain meaning in typed values
- convert domain values to display text only in presentation code

### 8.2 Formula governance

Analytics formulas must be:

- centralized
- typed
- deterministic
- versioned where appropriate
- tested
- outside React presentation components

Do not invent formulas during implementation.

Only implement formulas approved in:

- `docs/redesign/DECISIONS.md`
- the assigned phase file
- the explicit current assignment

### 8.3 Sample and denominator rules

- there is no universal minimum-sample threshold
- thresholds must be metric-specific or explicitly caller-provided
- low-sample categories remain visible unless explicitly filtered out
- low sample must not be communicated through color alone
- denominators and coverage must be visible when interpretation depends on them
- sample state and metric value are related but distinct

### 8.4 Analytics language

Analytics wording must remain observational.

Preferred language:

- associated with
- performs better within this sample
- correlated with
- observed among recorded games

Avoid causal claims about cards, corporations, Preludes, tags, maps, strategies, or player behavior unless a causal design actually exists.

---

## 9. Card Acquisition Model

Keep these concepts separate:

- Cards Purchased
- Cards Seen
- Cards Drawn
- Cards Received
- Cards Played
- Cards Remaining
- Total Hand Acquisitions

Rules:

- do not infer Cards Seen from Cards Purchased
- do not infer acquisitions by summing hand snapshots
- do not treat cards bought as equivalent to cards seen, drawn, played, retained, or remaining
- Purchase Conversion is unavailable when Cards Seen is missing or zero
- do not silently average percentages

For multi-game rate summaries, support both where appropriate:

- ratio of totals
- median per-game rate

Preserve generation-level data only when it was actually recorded.

Do not infer:

- generation-level TR from final TR
- cards bought by generation from final card totals
- cards seen from cards purchased
- engine curves from final totals
- hand acquisitions by summing repeated hand snapshots

Missing generation observations are not zero.

---

## 10. Win Point Differential Model

Keep these concepts separate:

- win point differential versus the highest non-winning score
- overall point differential versus opponents
- direct head-to-head differential
- opponent-adjusted margin
- loss deficit

Tied-first outcomes require explicit handling.

Do not silently treat tied-first games as ordinary positive-margin wins.

Any formula or display behavior must be explicitly approved before implementation.

---

## 11. Filter and URL-State Model

### Stable identity

Filter identity must use stable identifiers such as:

- canonical database IDs
- canonical codes
- canonical slugs
- another repository-approved stable key

Do not use display labels as identity.

### URL contract requirements

URL state must define:

- canonical parameter names
- parsing
- validation
- normalization
- serialization
- default omission
- deterministic ordering
- duplicate handling
- invalid-value behavior
- stale-entity behavior
- scope compatibility
- reset behavior
- selection state versus filter state
- preservation of explicit zero where meaningful

### Do not serialize

- display labels
- logo paths
- asset URLs
- private information
- authorization values
- internal errors

### Transient state

Do not serialize transient:

- hover state
- tooltip state
- focus state

State required to recreate an analytical view should generally be URL-addressable.

---

## 12. Corporation Logo Policy

Approved corporation logos contain the corporation name in the artwork.

### Presentation

When the embedded name is clearly legible:

- adjacent visible corporation-name text may be omitted
- the name should not be unnecessarily repeated visually

### Accessibility

- an informative standalone logo uses the corporation name as alt text
- a logo beside an already visible corporation name is decorative and uses empty alt text
- interactive logo-only controls require an accessible name containing the corporation name
- small logo contexts need visible text when the embedded name is not legible
- missing or failed logos need a readable text fallback
- screen readers must not be expected to interpret text embedded in an image

### Stable mapping

Corporation logos must resolve through stable identity:

- canonical database ID
- canonical code
- canonical slug
- another repository-approved stable key

Do not use these as corporation identity:

- display names
- logo filenames
- asset paths
- Storage URLs

The asset inventory should map verified corporation identity to:

- display name
- Supabase Storage bucket
- asset path
- file dimensions
- transparency status
- whether the name is embedded
- minimum readable logo-only size
- confirmation status

Do not guess mapping values.

### Production asset state (replaced 2026-07-17)

A separately authorized task replaced every corporation logo. Durable outcomes:

- All 116 corporations resolve through `corporations.logo_path` to uniform
  **800×800** content-addressed tiles (`corporation-logo-<sha256>.png`) in
  `tm-corporation-logos`; 112 distinct objects, with Athena/Eris/Kuiper
  Cooperative/Tycho Magnetics intentionally shared across their two editions.
- Each tile is flattened onto **white**, **black**, or **orange `#f06a32`**
  (`--tm-tr`), chosen per logo for contrast against the app surface `#141a22`.
- Content-addressed naming is the standing convention for refreshing this
  long-cached public bucket without overwriting prior objects.
- Prior objects are retained; a `logo_path` revert is the rollback path.

See `DECISIONS.md` and
`docs/agent-handoffs/CORPORATION-LOGO-ASSET-REPLACEMENT-AND-REMAPPING.md`.

---

## 13. Data Integrity and Missing-Data Policy

Every analytics feature must answer these questions explicitly:

1. What data grain is available?
2. Which records are eligible?
3. What denominator is used?
4. Is coverage complete, partial, or unknown?
5. Is a missing value truly absent, unsupported, filtered out, or not yet loaded?
6. Does the requested metric require an inference the recorded data cannot support?

Required behavior:

- preserve observed zero as zero
- preserve missing observations as missing
- represent unavailable capabilities explicitly
- expose partial coverage when it affects interpretation
- expose insufficient evidence independently of numeric value
- avoid fabricated or substituted values
- do not suppress limitations in UI, tooltips, tables, exports, or documentation

---

## 14. Accessibility Requirements

All redesigned interfaces must preserve or improve accessibility.

Minimum requirements:

- semantic headings and landmarks
- keyboard-accessible interactions
- visible focus states
- accessible names for icon-only and logo-only controls
- non-color indicators for low sample, state, and status
- text alternatives appropriate to the visual context
- readable fallbacks for failed assets
- responsive layouts that remain usable under zoom
- loading, error, empty, partial, and unavailable states that are announced or exposed semantically where appropriate

Accessibility acceptance criteria should be included in every relevant substep rather than deferred to a final pass.

---

## 15. Responsive and UI Consistency Requirements

Use Phase 1 shared foundations rather than creating page-specific replacements without approval.

Expected consistency areas:

- spacing and sizing tokens
- page shells
- dashboard grids
- headers
- filter toolbars
- KPI cards
- analytics panels
- chart containers
- table containers
- metric formatting
- loading states
- empty states
- error states
- unavailable states
- tooltips
- asset presentation

New components should be introduced only when existing shared foundations cannot meet the approved requirement.

---

## 16. Testing Strategy

Testing should be proportional to the substep and focused on approved behavior.

### Contract tests

Use for:

- scope compatibility
- capability states
- filter validation
- URL parsing and serialization
- metric result types
- sample and eligibility logic
- repository interface behavior

### Unit tests

Use for:

- calculation utilities
- normalization
- deterministic ordering
- duplicate handling
- missing-data behavior
- tied-result handling
- coverage rules
- edge cases

### Component tests

Use for:

- value-state presentation
- accessibility labels
- text fallbacks
- low-sample communication
- loading, empty, error, partial, and unavailable states
- responsive behavior where practical

### Integration validation

Use for:

- contracts working together across layers
- real repository behavior
- scope and filter compatibility
- stable URL round trips
- correct denominator and coverage propagation
- authorization-safe data access

Do not broaden a substep solely to fix unrelated historical warnings.

---

## 17. Validation Baseline

Initial repository baseline:

- Node.js `24.15.0`
- npm `11.12.1`
- Next.js `15.5.20`
- 55 test files passed
- 137 tests passed
- TypeScript passed
- production build passed
- lint completed with known warnings

Known historical warnings included:

- `no-img-element` warnings in score-profile-panel
- unused analytics repository helpers
- deprecated `next lint` usage

Later substeps may change totals or warning locations.

Always use the latest completed handoff as the current validation baseline.

Do not fix unrelated warnings unless explicitly assigned.

---

## 18. Step Transition Checklist

Before beginning any new substep:

```powershell
Set-Location "C:\Users\izzyh\Documents\Terraforming Mars Redesign"

git branch --show-current
git status --short
git log -5 --oneline
```

Confirm:

- the branch is `redesign/tm-stats-dashboard-rebuild`
- the prior substep is committed
- the worktree is clean
- the prior handoff exists
- `docs/REDESIGN_STATE.md` marks the prior substep complete
- `docs/REDESIGN_STATE.md` identifies the new substep as the next action
- no unapproved migration, view, schema, dependency, environment, deployment, or production-data change occurred
- prior approved policy commits remain intact

### Step 2.1 to Step 2.2 gate

Before Step 2.2 specifically, confirm:

- Step 2.1 is committed
- the Step 2.1 handoff exists
- the corporation-logo policy remains intact
- no migration was created
- no production page integration was added
- `docs/REDESIGN_STATE.md` identifies Step 2.2 as next

---

## 19. Required Project Documents

### Root instructions

- `AGENTS.md`
- `CLAUDE.md`

### Project state

- `docs/REDESIGN_STATE.md`

### Whole-plan reference

- `docs/redesign/reference/TM-Stats-Redesign-Master-Guide.docx`

### Core redesign documents

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

### Phase files

- `docs/redesign/phases/01-shared-components.md`
- `docs/redesign/phases/02-analytics-foundation.md`

### Relevant handoffs

- `docs/agent-handoffs/PHASE-01-STEP-03-combined-dashboard-foundation.md`
- `docs/agent-handoffs/PHASE-02-STEP-00-analytics-foundation-specification.md`
- `docs/agent-handoffs/PHASE-02-STEP-01-analytics-scope-capability-model.md`

---

## 20. Documentation Update Rules

Update this master plan when an approved change affects project-wide context, including:

- a phase or substep is added, removed, renamed, or reordered
- a project-wide constraint changes
- an architectural boundary changes
- a canonical analytics or data policy changes
- a new shared identity, asset, filter, or URL-state rule is approved
- a phase completes
- a new validation baseline becomes authoritative

Do not update this file to imply approval that has not been granted.

### Required update sequence after each completed substep

1. update the assigned phase file if required
2. update `docs/redesign/DECISIONS.md` for approved durable decisions
3. update relevant inventories or matrices
4. update `docs/REDESIGN_STATE.md`
5. write the substep handoff
6. update this master plan only when project-wide context changed
7. validate
8. commit separately

---

## 21. Decision Recording Template

Use the following structure for durable decisions:

```markdown
## Decision: <short title>

- **Date:** YYYY-MM-DD
- **Status:** Approved | Superseded | Deferred
- **Scope:** <phase/substep or project-wide>
- **Context:** <problem or ambiguity>
- **Decision:** <approved rule>
- **Rationale:** <why this option was chosen>
- **Consequences:** <implementation and UX effects>
- **Alternatives rejected:** <brief list>
- **Affected files:** <documents, contracts, tests, components>
```

Durable decisions belong in `docs/redesign/DECISIONS.md`; this master plan should summarize only decisions that affect the project broadly.

---

## 22. Handoff Template

Each substep handoff should include:

```markdown
# Phase <N>, Step <N.N> — <Title> Handoff

## Status

## Scope completed

## Files changed

## Contracts or behavior introduced

## Decisions made

## Tests and validation run

## Validation results

## Known limitations

## Deferred work

## Repository state

- Branch:
- Commit:
- Worktree status:

## Next approved action
```

The handoff must describe what was actually completed, not the originally intended scope when they differ.

---

## 23. Deferred Work Register

Use this section only for work discovered during implementation that is outside the current assignment.

| ID | Discovered in | Deferred item | Reason deferred | Intended phase or owner | Status |
|---|---|---|---|---|---|
| DW-001 | — | — | — | — | Open |

Rules:

- do not implement a deferred item without explicit approval
- link the item to the relevant handoff or decision
- close or supersede the item when it becomes approved work

---

| DW-002 | Step 2.6 | Model historical always-available Merger Prelude availability and denominator | Resolved in repository with nullable snapshots, provenance, alias mapping, availability-aware calculation, and a group-scoped dry-run/backfill package | Owner review and separate production execution only | Repository complete; production gated |

## 24. Risk Register

| Risk | Impact | Mitigation | Review point |
|---|---|---|---|
| Unsupported analytics inferred from incomplete data | Incorrect or misleading results | Capability model, explicit unavailable states, no silent inference | Steps 2.1–2.6 |
| Missing values collapsed into zero or null | Corrupted interpretation | Typed value states and focused tests | Steps 2.3–2.6 |
| Filter identity tied to display labels | Broken URLs and stale selections | Stable IDs, codes, or slugs | Step 2.2 |
| Formula duplication across components | Inconsistent analytics | Centralized typed utilities | Step 2.4 |
| Query expansion creates N+1 behavior | Performance degradation | Repository contracts and query review | Step 2.5 |
| Shared foundations bypassed by page-specific code | UI inconsistency | Reuse Phase 1 components and document exceptions | All later phases |
| Asset identity mapped by filename or URL | Fragile logo resolution | Verified stable identity inventory | All asset work |
| Low sample communicated only by color | Accessibility and interpretation failure | Text or semantic indicators | Steps 2.3 onward |
| Future work begins before prior completion | Scope drift and unstable architecture | Step transition checklist and separate commits | Every substep |

---

## 25. Open Questions

The following must be resolved only through approved assignments or higher-authority documents:

- the complete roadmap after Phase 2
- final page-by-page migration order beyond documented phase files
- any analytics formulas not already approved
- any database schema, migration, or view changes
- production deployment strategy
- dependency additions
- unverified corporation asset mappings
- metric-specific sample thresholds not already approved

Do not fill these gaps by assumption.

---

## 26. Current Action

Completed:

```text
Phase 2, Step 2.5 — Analytics Repository and Query Contracts
```

Next, only when explicitly assigned:

```text
Phase 2, Step 2.6 — Analytics Foundation Integration Validation
```

Do not push unless explicitly instructed.

---

## 27. Maintenance Header

Update these fields whenever this file changes materially:

- **Last updated:** 2026-07-17
- **Current phase:** Phase 2 — Analytics Foundation (repository complete)
- **Current substep:** Glossary and Card Database Preservation and Cross-Linking (complete)
- **Next gated substep:** Await explicit assignment
- **Latest protected policy commit:** `9545f589961fce4a0854ed1c6bcff8ba6c7c87d0`
- **Phase 1 completion commit:** `4283e826f881eb116befbe3285c3de426fb25c6c`
- **Phase 2 planning commit:** `73184cbdb`
