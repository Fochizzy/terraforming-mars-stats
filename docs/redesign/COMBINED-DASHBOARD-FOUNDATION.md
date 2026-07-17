# TM Stats Combined Dashboard Foundation

Phase 1, Step 1.3 provides shared dashboard anatomy and interaction coordination.
It contains no production analytics, query logic, scope semantics, or canonical
query parameter names.

## Composition

Use `DashboardPageShell` for the page header/toolbar/section rhythm, then compose
the shared regions with `CombinedDashboardLayout`:

```tsx
<DashboardPageShell header={header} withContainer>
  <CombinedDashboardLayout
    toolbar={toolbar}
    primary={dominantChart}
    supporting={supportingChart}
    insights={insightRail}
    evidence={evidenceTable}
    detail={optionalDetail}
  />
</DashboardPageShell>
```

`CombinedDashboardLayout` uses the existing Step 1.1 `DashboardGrid`. It adds
only named region placement: toolbar, primary, supporting, insights, evidence,
and detail. Mobile/tablet order is chart-first and single-column; desktop uses a
12-column composition with an 8/4 dominant/supporting split and a 4/8
insight/evidence split. Every region is `min-width: 0`; the shared table retains
its own keyboard-focusable horizontal scroll container.

Charts remain caller-owned Recharts content inside `AnalyticsPanel` and
`ChartContainer`. The shared layer never parses generated chart DOM and does not
introduce another chart library.

## Coordinated state architecture

`DashboardSelection` contains opaque IDs only:

- `selectedEntityId`
- `selectedMetricId`
- `selectedDataPointId`
- `hoveredDataPointId`
- `activeTableRowId`
- `activeLegendItemId`
- `openDetailItemId`

`DashboardSelectionAvailability` supplies the IDs currently valid for each
field. `reconcileDashboardSelection` chooses a deterministic available entity
and metric, but clears invalid optional point, row, legend, hover, and detail
IDs. If the entity or metric becomes invalid, all child context is cleared.

The pure `reduceDashboardSelection` transition function keeps interaction rules
outside presentation JSX. In particular:

- `focus-item` synchronizes chart selection and the active evidence row;
- `activate-table-row` synchronizes the table row and chart selection;
- entity or metric changes clear point/row/legend/hover/detail state;
- opening details focuses the same item in charts and the table;
- clearing selection retains the explicit entity/metric context while clearing
  the coordinated item, hover, row, legend, and detail state.

## Controlled and uncontrolled use

`useCoordinatedDashboard` supports both modes:

```tsx
const dashboard = useCoordinatedDashboard({
  availability,
  defaultValue: {
    selectedEntityId: availableEntities[0]?.id ?? null,
    selectedMetricId: availableMetrics[0]?.id ?? null,
  },
  onChange: handleSelectionChange,
});
```

Omit `value` for local state. Supply `value` and `onChange` for controlled state.
In both modes, callbacks receive reconciled values and availability changes
remove stale IDs. `reset()` returns to the reconciled caller-provided defaults;
`clearSelection()` keeps the chosen entity/metric and clears coordinated detail.

Do not create global application state merely to use this controller. Lift the
controlled value only to the lowest common owner of the coordinated charts,
legend, table, insights, and details.

## URL adapter boundary

`createDashboardUrlStateAdapter` accepts a caller-supplied field map:

```ts
const adapter = createDashboardUrlStateAdapter({
  selectedEntityId: 'fixtureEntity',
  selectedMetricId: 'fixtureMetric',
  selectedDataPointId: 'fixtureItem',
});
```

The adapter reads and writes string IDs, preserves unrelated query parameters,
deletes cleared mapped values, and rejects duplicate parameter names. Decoded
IDs must be reconciled against current availability before use.

The fixture names are intentionally demo-only. Phase 2 owns canonical analytics
scope, filter, compatibility, and URL-state semantics. Do not reuse the fixture
names as production conventions by inference.

## Synchronizing views

All views receive the same controller:

- Recharts shapes and keyboard-accessible chart controls call `focusItem` and
  read `selectedDataPointId`/`hoveredDataPointId` for emphasis.
- `SelectableDashboardLegend` reads `activeLegendItemId` and calls
  `activateLegendItem`.
- `DashboardEvidenceTable` reads `activeTableRowId` and calls
  `activateTableRow`; callers may also call `openDetail` from that action.
- `DashboardInsightRail` compares each `relatedItemId` with
  `selectedDataPointId` and calls `focusItem` from its action.
- `DashboardDetailSurface` reads `openDetailItemId`, calls `closeDetail`, and
  may call `clearSelection`.
- `DashboardSelectionSummary` provides a polite, readable update for the current
  entity, metric, item, and legend context.

Calculations and conclusions remain outside these components. Table columns use
typed render functions; `DashboardMetricValue` handles only the existing
presentation union so explicit zero, missing, partial, and unavailable states
remain distinct.

## Detail behavior

`DashboardDetailSurface` supports `panel`, `modal`, and `responsive` modes.
Responsive mode is a persistent non-modal named region above 767px and an
`aria-modal` dialog on narrower screens. The modal:

- focuses its Close action when opened;
- closes with Escape;
- traps Tab within the surface;
- restores focus to the opener when closed.

The same shared data-state renderer handles loading, empty, error, and
unavailable detail content.

## Creating a development fixture

Keep deterministic fixture values in a development feature module, never inside
the reusable dashboard components. Label the content as demo data, use opaque
fixture IDs, and exercise mixed data-quality states without claiming production
meaning. Reuse `AssetImage` and an existing resolver for imagery.

The current example lives at `/dev/combined-dashboard`. Its server page calls
`notFound()` outside development and it is not linked from navigation. It shows
two Recharts views, accessible chart controls, shared legend, insights, evidence,
details, URL round-trip, long labels, responsive stacking, loading/empty states,
missing/zero/partial/unavailable values, partial coverage, and a fixture-only
low-sample threshold.

## Deferred to Phase 2

Step 1.3 deliberately does not define:

- canonical global, group, player, or comparison scope semantics;
- production subject, metric, filter, or compatibility types;
- final production query parameter names or URL migration behavior;
- canonical formulas, thresholds, confidence, ranges, or interpretation text;
- production repository DTOs, database schema, migrations, or Supabase queries;
- production dashboard integration or legacy retirement.

Those responsibilities require separate Phase 2 review and explicit assignment.
