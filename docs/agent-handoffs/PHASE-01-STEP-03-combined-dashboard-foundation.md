# Phase 1, Step 1.3 Handoff — Combined Dashboard Foundation

## Status

Completed on 2026-07-17.

## Branch and baseline

- Branch: `redesign/tm-stats-dashboard-rebuild`
- Required baseline: `c1ac4867a8ef9cbc56440a5b28184df34f2c71d5`
  (Phase 1, Step 1.2), clean worktree
- Production behavior changes: none — no existing page, route ownership,
  navigation item, analytics formula, repository query, or asset consumer was
  modified
- Database migration created or run: none
- Supabase data, schema, policy, function, bucket, Storage object, or credential
  changed: none
- New dependencies, environment files, or deployment changes: none

## Scope completed

Step 1.3 adds an additive combined-dashboard foundation for later page-owning
phases:

- responsive labeled regions for a toolbar, dominant visualization, supporting
  visualization, insight rail, evidence table, and optional detail surface;
- typed page-agnostic coordination state with pure reconciliation and reducer
  behavior;
- controlled and uncontrolled React coordination with explicit callbacks;
- a caller-named URL adapter boundary without canonical production parameters;
- shared entity/metric selectors, selectable legend, selected-state summary,
  insight rail, semantic evidence table, and responsive detail surface;
- a development-only deterministic Recharts fixture at
  `/dev/combined-dashboard`;
- direct state, URL, component, accessibility, interaction, and fixture tests;
- desktop, tablet, and mobile visual and interaction review.

No production page was redesigned. Phase 2 remains unstarted.

## Required files inspected

- Governance and state: `AGENTS.md`, `CLAUDE.md`,
  `docs/redesign/MASTER-RULES.md`, `docs/REDESIGN_STATE.md`,
  `docs/redesign/DECISIONS.md`, `docs/redesign/MIGRATION-MATRIX.md`,
  `docs/redesign/COMPONENT-MATRIX.md`,
  `docs/redesign/BASELINE.md`,
  `docs/redesign/SHARED-DESIGN-FOUNDATIONS.md`,
  `docs/redesign/SHARED-ASSET-FOUNDATIONS.md`, and
  `docs/redesign/phases/01-shared-components.md`
- Prior handoffs:
  `docs/agent-handoffs/PHASE-01-STEP-01-shared-design-foundations.md` and
  `docs/agent-handoffs/PHASE-01-STEP-02-shared-asset-foundations.md`
- Existing dashboard, metric-value, data-state, asset, Recharts, responsive,
  testing, and development-route conventions in the current redesign worktree

The original Terraforming Mars worktree was not inspected or changed. The
assigned implementation was completed entirely in the redesign worktree.

## Files created

### Shared coordination logic

- `src/lib/dashboard/selection.ts`
- `src/lib/dashboard/selection.test.ts`
- `src/lib/dashboard/url-state.ts`
- `src/lib/dashboard/url-state.test.ts`
- `src/lib/dashboard/index.ts`

### Shared dashboard components

- `src/components/dashboard/combined-dashboard-layout.tsx`
- `src/components/dashboard/combined-dashboard-layout.test.tsx`
- `src/components/dashboard/dashboard-controls.tsx`
- `src/components/dashboard/dashboard-controls.test.tsx`
- `src/components/dashboard/dashboard-detail-surface.tsx`
- `src/components/dashboard/dashboard-detail-surface.test.tsx`
- `src/components/dashboard/dashboard-evidence-table.tsx`
- `src/components/dashboard/dashboard-evidence-table.test.tsx`
- `src/components/dashboard/insight-rail.tsx`
- `src/components/dashboard/insight-rail.test.tsx`
- `src/components/dashboard/use-coordinated-dashboard.ts`
- `src/components/dashboard/use-coordinated-dashboard.test.tsx`
- `src/components/dashboard/index.ts`

### Development fixture

- `src/features/dev/combined-dashboard-fixture.tsx`
- `src/features/dev/combined-dashboard-fixture.test.tsx`
- `src/app/dev/combined-dashboard/page.tsx`

### Documentation

- `docs/redesign/COMBINED-DASHBOARD-FOUNDATION.md`
- `docs/agent-handoffs/PHASE-01-STEP-03-combined-dashboard-foundation.md`

## Files modified

- `src/app/globals.css`
- `docs/redesign/phases/01-shared-components.md`
- `docs/REDESIGN_STATE.md`

`docs/redesign/DECISIONS.md` is unchanged. This step did not settle product,
formula, scope, threshold, repository, route, schema, authorization, or
production URL semantics; those decisions remain with their owning phases.

## Coordination behavior

The shared `DashboardSelection` model coordinates selected entity and metric,
selected and hovered data points, active evidence row, active legend item, and
open detail item. Pure reconciliation ensures required entity/metric selections
remain available and clears optional selections that become stale.

Entity and metric changes clear child context deterministically. Reset retains
the currently available entity/metric defaults while clearing transient
selections. The React hook supports controlled and uncontrolled usage and
reports every state change through an explicit callback.

The URL adapter accepts parameter names from the future owning page. It reads,
writes, preserves unrelated parameters, removes cleared values, and rejects
duplicate parameter names. The fixture uses only namespaced demo parameters;
no canonical production URL contract is implied.

## Layout, data, and accessibility behavior

- Desktop uses a 12-column dominant/supporting composition with a four/eight
  insight/evidence row; tablet and mobile use chart-first stacked order.
- Both charts, legend, insight rail, evidence rows, detail surface, summary,
  and demo URL state consume the same coordinated selection.
- The evidence table is the semantic chart alternative and preserves observed
  zero, missing, partial, and unavailable values through the Step 1.1 metric
  model.
- Selectable controls expose pressed/selected semantics, visible text state,
  keyboard operation, visible focus, and at least 44-pixel touch targets.
- Evidence rows activate with Enter/Space. Long labels remain available to
  assistive technology and do not create page-level overflow.
- The detail surface is a persistent labeled region at desktop widths and an
  `aria-modal` dialog below 768 pixels, with initial close-button focus, Escape
  handling, focus trapping, and opener focus restoration.
- The fixture uses deterministic demo values, Recharts, Step 1.1 shared
  foundations, and the Step 1.2 asset resolver. It demonstrates ready, loading,
  empty, unavailable, missing, partial coverage, observed zero, and explicitly
  local low-sample states.
- The fixture has no production navigation link and calls `notFound()` outside
  development mode.

## Tests added

Nine files / 42 tests cover:

- defaults, reducer behavior, reset, equality, stale-selection cleanup, and
  availability reconciliation;
- URL read/write behavior, unrelated parameter preservation, cleared values,
  and duplicate names;
- responsive region order and composition;
- selector, legend, summary, keyboard, and selected-state semantics;
- controlled/uncontrolled hook behavior and availability changes;
- evidence table activation and zero/missing/partial/unavailable rendering;
- insight selection and unavailable state;
- desktop detail region and mobile dialog focus lifecycle; and
- fixture-wide chart, legend, evidence, detail, URL, and data-state
  coordination.

## Validation results

Compared with the Step 1.2 baseline (72 files / 255 tests; four lint warnings;
22/22 pages):

- Focused Step 1.3 tests — 9 files / 42 tests passed, 0 failed.
- `npm test` — 81 files / 297 tests passed, 0 failed.
- `npx tsc --noEmit` — passed, no errors.
- `npm run lint` — exit 0 with exactly the four baseline warnings: three
  `@next/next/no-img-element` warnings in `score-profile-panel.tsx` and the
  unused `normalizeProfileHeadToHeadRow` warning in `analytics-repo.ts`, plus
  the existing `next lint` deprecation notice. No new warning was introduced.
- `npm run build` — passed; 23/23 pages generated; the same four baseline
  warnings only.
- `git diff --check` — passed.

## Visual and interaction review

The development fixture was reviewed in the in-app browser at 1440×1000,
900×900, and 390×844:

- desktop displayed the dominant/supporting and insight/evidence column
  relationships; tablet and mobile stacked all regions in chart-first order;
- no reviewed viewport had page-level horizontal overflow;
- mobile controls retained a 44-pixel minimum target;
- legend, chart point, evidence row, insight, summary, detail, and URL state
  stayed synchronized;
- entity selection cleared stale child context;
- observed zero, missing, partial, unavailable, coverage, and low-sample
  treatments were visible and distinct;
- the responsive dialog focused its close button, closed with Escape, and
  restored focus to its opener;
- keyboard focus had a visible outline; and
- the final responsive review produced no console errors or warnings.

Screenshots were saved outside the repository in the local temporary directory
for the completion report. The temporary development server was stopped.

## Assumptions and limitations

- Demo entity, metric, point, row, legend, detail, and URL identifiers are
  intentionally opaque fixture values, not production contracts.
- The fixture's low-sample threshold and coverage values exist only to exercise
  presentation states; no production analytics policy was selected.
- Chart geometry and values are deterministic fixture data. No Temporal, card,
  TR, board, opponent, or production analytics data was fabricated.
- Responsive behavior received browser review on representative viewport
  sizes, not a full device/browser matrix.
- The production build lists the guarded development route in the build route
  manifest, but its page calls `notFound()` whenever `NODE_ENV` is not
  `development`, so the fixture cannot be served as application content in
  production.

## Next action

Await review and explicit approval before beginning Phase 2. Do not define
canonical analytics scope/filter/URL semantics, formulas, repository contracts,
schema work, production page integration, or route migration without that
assignment.

## Commit

The completion commit containing this handoff includes only Phase 1, Step 1.3
code, tests, state, and documentation. Its hash is reported after the commit is
created.
