# Phase 1 — Shared Foundations

## Status

Completed through Step 1.3 on 2026-07-17. Phase 1 is an additive foundation
phase. No primary production page, route ownership, navigation, analytics
formula, repository query, database schema, Supabase state, Storage object, or
production asset consumer is migrated by this phase.

## Step 1.1 — Shared Design Foundations

Status: Completed.

Created the shared theme-aligned page and dashboard shells, typography, grids,
KPI cards, analytics panels, filter toolbar, chart/table containers, data-state
primitives, tooltip, and the typed metric-value, coverage, and sample models.

Acceptance criteria:

- Explicit zero, missing, unavailable, and partial metric values remain distinct.
- Loading, empty, error, unavailable, coverage, and low-sample states are shared.
- Layout, state, tooltip, responsive, and accessibility behavior has direct tests.
- Existing production components and routes remain operational and unmodified.

## Step 1.2 — Shared Asset Foundations

Status: Completed.

Created typed family/source/access metadata, canonical lookup and object-path
normalization, public/static/private boundaries, family resolvers, deterministic
fallbacks, and the accessible responsive `AssetImage` primitive.

Acceptance criteria:

- Assets resolve from stable identity and approved metadata, never display-name
  filename guesses.
- Public, bundled/static, external, unavailable, and already-authorized signed
  private sources remain distinct.
- Informative/decorative semantics, loading, fallback, dimensions, and failed
  delivery behavior have direct tests.
- No Storage object, production asset mapping, route, or consumer is changed.

## Step 1.3 — Combined Dashboard Foundation

Status: Completed.

Objective: provide the reusable combined-dashboard layout and coordination layer
that later Global, Individual, Group, Compare, and Improvement pages can use,
without redesigning a production page or defining Phase 2 analytics semantics.

Approved outputs:

- responsive labeled regions for a toolbar, dominant visualization, supporting
  visualization, insight rail, evidence table, and optional detail surface;
- page-agnostic typed state for entity, metric, data point, hover, table row,
  legend, and detail coordination;
- controlled and uncontrolled state, explicit callbacks, deterministic reset,
  available-ID reconciliation, and stale-selection cleanup;
- a caller-named URL adapter boundary with no final production parameter names;
- shared selectors, selectable legend, live selected-state summary, insight rail,
  evidence table, and responsive panel/modal detail surface;
- keyboard, focus, selected-state, touch-target, long-label, missing/unavailable,
  responsive-overflow, and modal focus-restoration behavior;
- a development-only `/dev/combined-dashboard` fixture using deterministic demo
  values, Recharts, shared foundations, and the Step 1.2 asset resolver;
- focused unit/component tests and desktop/tablet/mobile visual review.

Acceptance criteria:

- Both charts, the legend, evidence table, insight rail, details, and narrow demo
  URL adapter consume one coordinated selection.
- Entity/metric changes and availability changes remove stale child selections.
- The evidence table is the semantic chart alternative and preserves explicit
  zero, missing, partial, and unavailable values.
- Selected and unavailable states are communicated with text/semantics, not
  color alone; interactive controls are keyboard operable with visible focus.
- Desktop uses a dominant/supporting composition; tablet and mobile stack in
  chart-first priority order without page-level horizontal overflow.
- The detail surface is a persistent region on wider screens and an accessible
  focus-managed modal on narrow screens.
- The fixture demonstrates ready, loading, empty, missing, unavailable, partial
  coverage, and explicitly thresholded low-sample states without production data.
- The production build cannot serve the fixture and production navigation does
  not link to it.
- No production page, analytics formula, repository, schema, Supabase resource,
  dependency, environment file, navigation, or deployment configuration changes.

## Explicit stop condition

Stop after Step 1.3. Phase 1 completion does not authorize Phase 2, route
activation, production page migration, formula changes, repository/schema work,
or canonical analytics URL/filter semantics.

## Next action

Await review and explicit approval before beginning Phase 2 — Analytics Types
and Calculation Foundations.
