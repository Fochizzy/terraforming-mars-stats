# Phase 1, Step 1.1 Handoff — Shared Design Foundations

## Status

Completed on 2026-07-17.

## Branch and baseline

- Branch: `redesign/tm-stats-dashboard-rebuild`
- Baseline before Step 1.1: `7c8e88e4a` (Phase 0 complete), clean working tree
- Production behavior changes: none — no existing route, page, component,
  query, formula, or asset was modified or removed
- Database migration created or run: none
- Supabase data, schema, policy, function, bucket, or Storage changes: none
- New dependencies: none; no UI framework or charting library added

## Scope

Step 1.1 created reusable shared design foundations only. Nothing consumes
them yet; adoption happens in later phases per the migration matrix. The
legacy `AppShell`, `ChartFrame`, `HeadToHeadLensFrame`, and `CoverageBadge`
remain untouched and operational.

`docs/redesign/phases/01-shared-components.md` exists but is empty; the Step
1.1 scope was taken from the assigning task and
`docs/redesign/MIGRATION-MATRIX.md` section 8.

## Files inspected

- Governance and audit documents: `AGENTS.md`, `CLAUDE.md`,
  `docs/REDESIGN_STATE.md`, `docs/redesign/MASTER-RULES.md`,
  `docs/redesign/PAGE-ARCHITECTURE.md`, `docs/redesign/DECISIONS.md`,
  `docs/redesign/MIGRATION-MATRIX.md`,
  `docs/redesign/COMPONENT-MIGRATION-MATRIX.md`,
  `docs/redesign/ASSET-INVENTORY.md`, `docs/redesign/BASELINE-VALIDATION.md`,
  `docs/agent-handoffs/PHASE-00-STEP-06-migration-matrix.md`,
  `docs/redesign/phases/01-shared-components.md` (empty)
- Existing implementation: `src/app/globals.css`, `tailwind.config.ts`,
  `postcss.config.mjs`, `tsconfig.json`, `eslint.config.mjs`,
  `vitest.config.ts`, `src/test/setup.ts`, `package.json`,
  `src/components/layout/app-shell.tsx` and `app-shell.module.css`,
  `src/components/navigation/bottom-nav.tsx`,
  `src/components/charts/chart-frame.tsx` and `chart-frame.module.css`,
  `src/components/charts/coverage-badge.tsx`, `src/components/ui/*`,
  `src/lib/theme/tokens.ts`, `src/features/analytics/group-dashboard.tsx`
  (state/empty-state conventions), plus surveys of status-color, focus-visible,
  live-region, and Recharts-container usage across `src`
- Existing tests: `app-shell.test.tsx`, `chart-frame.test.tsx`,
  `coverage-badge.test.tsx`, `src/app/page.test.tsx`

## Files changed

### Modified

- `src/app/globals.css` — appended a clearly-marked "Shared design
  foundations" `@layer components` block (focus ring, KPI value, toolbar,
  table, state, spinner, notice, missing-value, and tooltip classes) plus the
  `tm-spin` keyframes and a `prefers-reduced-motion` block. All new classes
  reuse the existing `--tm-*` variables; no existing rule or theme value was
  changed.
- `src/lib/theme/tokens.ts` — kept `chartPalette` unchanged; added typed
  `colorTokens`, `fontTokens`, `cssVar()`, and documented Tailwind-default
  `breakpoints` mirroring (not altering) the `globals.css` theme.

### Created — shared logic

- `src/lib/metrics/metric-value.ts` — `MetricValue` union
  (observed/partial/missing/unavailable), `metricFromNullable` (null →
  missing, never zero; non-finite → unavailable), deterministic en-US
  formatting, `SampleSize` + `isLowSample` (returns `null` without an
  approved caller-supplied threshold), `CoverageObservation` +
  `coverageFraction`/`formatCoverage` (denominator always visible;
  non-positive denominator refuses to yield a percentage).

### Created — `src/components/foundations/`

- `foundation-classes.ts` — shared literal Tailwind class constants (page
  width/gutters, section gap, grid variants) so spacing stays consistent and
  Tailwind's scanner sees the literals.
- `typography.tsx` — `Heading` (level decoupled from visual variant/size) and
  `Text` (body/muted/accent/label/eyebrow) over existing `tm-*` classes.
- `page-container.tsx` — centered container matching the current `AppShell`
  content width and gutters; semantic `as` prop.
- `dashboard-page-shell.tsx` — in-page header/toolbar/sections column;
  optional standard container; does not replace `AppShell` chrome.
- `page-header.tsx` — eyebrow/title/description/actions; `headingLevel`
  defaults to `h1` with a documented `h2` mode inside the legacy shell.
- `section-header.tsx` — `h2`-default section title with badges and actions
  slots.
- `dashboard-grid.tsx` — fixed responsive variant maps (`kpi`, `split`,
  `thirds`, `single`); single column on mobile; `minmax(0, 1fr)` columns for
  long content.
- `kpi-card.tsx` — `tm-stat-card` KPI with `MetricValue` rendering (explicit
  zero renders `0`; missing renders "Not recorded" without unit; unavailable
  and partial render distinctly), sample-size line, threshold-gated low-sample
  marker, optional accessible info tooltip.
- `analytics-panel.tsx` — typed `tm-panel` section with explicit props only
  (no title-string behavior), named region, header preserved in every data
  state.
- `filter-toolbar.tsx` — labeled toolbar group, label-wrapped fields, named
  button groups; native tab order preserved; no filtering logic.
- `chart-container.tsx` — named figure with reserved min-height, optional
  caption, screen-reader summary, shared data states, and an optional
  keyboard-focusable scroll region; no charting dependency.
- `table-container.tsx` — native `table` in a labeled keyboard-focusable
  scroll region with caption support and `data-align="numeric"` cells; shared
  states replace the table when not ready.
- `data-states.tsx` — `LoadingState` (polite status), `EmptyState`,
  `ErrorState` (`role="alert"`, distinct from empty), `UnavailableState`,
  `MissingDataNotice`, `LowSampleNotice` (renders nothing without an approved
  threshold), `PartialCoverageNotice` (numerator/denominator/percent;
  non-positive denominator reported as unavailable), `DataStateRenderer`, and
  the `DataDisplayState` union. All states use text plus glyph, never color
  alone.
- `tooltip.tsx` — client-only `Tooltip` (describes a focusable child) and
  `InfoTooltip` (own button trigger); WAI-ARIA tooltip pattern: content always
  in the DOM for `aria-describedby`, shown on hover/focus, hidden on
  blur/leave/Escape.
- `index.ts` — barrel export.

### Created — tests (15 files, 84 tests)

- `src/lib/theme/tokens.test.ts` — token/`globals.css` alignment, no invented
  custom properties, breakpoint documentation.
- `src/lib/metrics/metric-value.test.ts` — explicit zero vs missing vs
  unavailable vs partial, non-finite guard, formatting (grouping, decimals,
  custom formatter), threshold-gated low-sample, coverage denominators and
  zero-denominator refusal.
- `src/components/foundations/*.test.tsx` (12 files) and the two above cover:
  basic rendering; responsive class/layout behavior (grid variants, container
  gutters, wrapping headers); loading and empty states; missing vs zero in
  `KpiCard`; low-sample and partial-coverage states; keyboard access (toolbar
  tab order, tooltip focus/Escape, focusable scroll regions); accessible names
  and headings (named regions/figures/articles, heading levels, label
  association, `aria-describedby`, `role="status"`/`role="alert"`).

### Documentation

- Updated `docs/REDESIGN_STATE.md` (Step 1.1 complete; next action Step 1.2 —
  Shared Asset Foundations).
- Created this handoff.
- `docs/redesign/DECISIONS.md` unchanged — Step 1.1 approved no new product,
  formula, threshold, route, or asset decisions.

## Existing components reused (not modified, not retired)

- The `tm-*` visual language in `globals.css` (`tm-panel`, `tm-stat-card`,
  `tm-data-label`, `tm-display-*`, `tm-input`, `tm-coverage-badge`, button
  classes) is the styling base for every new primitive.
- `chartPalette` retained in `src/lib/theme/tokens.ts`.
- Legacy `AppShell`, `BottomNav`, `LogoutButton`, `ChartFrame`,
  `HeadToHeadLensFrame`, `CoverageBadge`, and all feature components remain
  as-is; the new primitives are additive replacements-in-waiting per the
  migration matrix retirement rules.

## Validation results

Compared with the Step 0.5 baseline (55 test files / 137 tests; four ESLint
warnings; `next lint` deprecation; build 22/22):

- `npm test` — 70 files / 221 tests passed, 0 failed (+15 files / +84 tests,
  all from Step 1.1).
- `npx tsc --noEmit` — passed, no errors.
- `npm run lint` — exit 0 with exactly the four baseline warnings (three
  `@next/next/no-img-element` in `score-profile-panel.tsx`; unused
  `normalizeProfileHeadToHeadRow` in `analytics-repo.ts`) plus the `next
  lint` deprecation notice. No new warnings; no baseline warning was fixed
  (out of scope).
- `npm run build` — passed; 22/22 pages generated; same baseline warnings
  only.
- `git diff --check` — clean.

## Assumptions and limitations

- The empty phase file meant substep boundaries came from the assigning task;
  the shared asset descriptor/rendering primitive that the migration matrix
  also assigns to Phase 1 was deliberately left for Step 1.2 rather than
  bundled here.
- Default state copy ("Not recorded", "Unavailable", "No data recorded yet",
  "Data could not be loaded", "Not available") is generic and overridable per
  metric; no metric-specific wording was approved or hard-coded.
- No low-sample threshold exists anywhere in the primitives; `isLowSample`
  returns `null` and `LowSampleNotice` renders nothing until the owning phase
  approves per-metric thresholds (matrix section 15, question 8).
- `PageHeader` defaults to `h1` for future standalone pages; inside the legacy
  `AppShell` (which already renders the page `h1`) callers must pass
  `headingLevel={2}`. This is documented in the component.
- The generic `Tooltip` requires a focusable child; `InfoTooltip` is the
  primitive for informational hints beside plain text.
- Foundations are intentionally unconsumed this step, so visual verification
  in a running page happens when the first consumer adopts them (Phase 1
  acceptance kept them additive-only).

## Next action

Phase 1, Step 1.2 — Shared Asset Foundations (typed asset
descriptor/rendering primitive, brand metadata, family-aware fallbacks,
public/static/private separation per `MIGRATION-MATRIX.md` sections 7-8). Do
not begin without explicit assignment.

## Commit

The completion commit contains all Step 1.1 code, tests, and documentation.
