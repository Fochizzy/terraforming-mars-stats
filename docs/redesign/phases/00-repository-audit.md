# Phase 0 — Repository and Analytics Audit

## Objective

Document the current application before changing production behavior.

No visual redesign or production feature implementation is allowed during
this phase.

## Substeps

### Step 0.1 — Route Inventory

Document every current application route.

For each route record:

- Route path
- Source file
- Purpose
- Server or client rendering
- Authentication requirements
- Group requirements
- Data queries
- Components rendered
- URL parameters
- Known problems
- Proposed future destination

Output:

`docs/redesign/CURRENT-ROUTE-MAP.md`

### Step 0.2 — Component Inventory

Document major analytics and page components.

For each component record:

- Current page
- Scope
- Props
- Data source
- Reusability
- Proposed destination
- Retain, refactor, move, merge, or retire

Output:

`docs/redesign/COMPONENT-MIGRATION-MATRIX.md`

### Step 0.3 — Data Capability Audit

Classify every requested capability as:

- Available now
- Derivable from current data
- Requires query work
- Requires a database view
- Requires new fields
- Not currently possible

Include:

- Cards
- Tags
- Corporations
- Preludes
- Pairings
- Score sources
- Styles
- Maps
- Milestones
- Awards
- Final terraforming actions
- Head-to-head results
- Win point differential
- Per-generation cards bought
- Per-generation Terraforming Rating
- Production snapshots
- Board placements
- Opponent ratings
- Recommendation persistence

Output:

`docs/redesign/DATA-CAPABILITIES.md`

### Step 0.4 — Asset Inventory

Audit Supabase and local assets for:

- Tag icons
- Point-source graphics
- Corporation logos
- Map graphics
- Milestone and award graphics
- Storage buckets
- Database asset references
- Existing asset components

Output:

`docs/redesign/ASSET-INVENTORY.md`

### Step 0.5 — Baseline Validation

Run and document:

- Tests
- Type checking
- Linting
- Production build

Record pre-existing failures separately.

### Step 0.6 — Migration Matrix

Create the final current-to-target migration matrix covering:

- Routes
- Components
- Analytics
- Data sources
- Assets
- Replacement phase
- Retirement conditions

## Restrictions

- Do not modify production UI.
- Do not change database schema.
- Do not move route files.
- Do not delete components.
- Do not change analytics formulas.
- Do not clean unrelated code.
- Do not begin Phase 1.

## Required handoff

At the end of each substep:

1. Update `docs/REDESIGN_STATE.md`.
2. Create a handoff file.
3. Commit only the completed substep.
4. Report findings, files, commands, and blockers.
