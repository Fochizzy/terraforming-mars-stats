/**
 * Page-agnostic coordination state for combined analytics dashboards.
 *
 * IDs are intentionally opaque. Phase 1 owns only interaction coordination;
 * Phase 2 will define canonical analytics subjects, scopes, metrics, and URL
 * semantics. Missing selections remain `null` and are never converted into a
 * production analytics value.
 */
export type DashboardSelection = {
  selectedEntityId: string | null;
  selectedMetricId: string | null;
  selectedDataPointId: string | null;
  hoveredDataPointId: string | null;
  activeTableRowId: string | null;
  activeLegendItemId: string | null;
  openDetailItemId: string | null;
};

export type DashboardSelectionDefaults = Partial<DashboardSelection>;

export type DashboardSelectionAvailability = {
  entityIds?: readonly string[];
  metricIds?: readonly string[];
  dataPointIds?: readonly string[];
  tableRowIds?: readonly string[];
  legendItemIds?: readonly string[];
  detailItemIds?: readonly string[];
};

export const emptyDashboardSelection: DashboardSelection = {
  selectedEntityId: null,
  selectedMetricId: null,
  selectedDataPointId: null,
  hoveredDataPointId: null,
  activeTableRowId: null,
  activeLegendItemId: null,
  openDetailItemId: null,
};

function isAvailable(
  value: string | null,
  availableValues: readonly string[] | undefined,
) {
  return (
    value !== null &&
    (availableValues === undefined || availableValues.includes(value))
  );
}

function reconcileRequiredSelection(
  current: string | null,
  availableValues: readonly string[] | undefined,
  fallback: string | null,
) {
  if (isAvailable(current, availableValues)) {
    return current;
  }
  if (isAvailable(fallback, availableValues)) {
    return fallback;
  }
  return availableValues?.[0] ?? null;
}

function reconcileOptionalSelection(
  current: string | null,
  availableValues: readonly string[] | undefined,
) {
  return isAvailable(current, availableValues) ? current : null;
}

/**
 * Removes invalid IDs and deterministically chooses the supplied/first
 * available entity and metric. Point, row, legend, hover, and detail IDs are
 * optional: invalid values are cleared rather than silently redirected.
 */
export function reconcileDashboardSelection(
  selection: DashboardSelection,
  availability: DashboardSelectionAvailability,
  defaults: DashboardSelectionDefaults = {},
): DashboardSelection {
  const selectedEntityId = reconcileRequiredSelection(
    selection.selectedEntityId,
    availability.entityIds,
    defaults.selectedEntityId ?? null,
  );
  const selectedMetricId = reconcileRequiredSelection(
    selection.selectedMetricId,
    availability.metricIds,
    defaults.selectedMetricId ?? null,
  );
  const contextChanged =
    selectedEntityId !== selection.selectedEntityId ||
    selectedMetricId !== selection.selectedMetricId;

  return {
    selectedEntityId,
    selectedMetricId,
    selectedDataPointId: contextChanged
      ? null
      : reconcileOptionalSelection(
          selection.selectedDataPointId,
          availability.dataPointIds,
        ),
    hoveredDataPointId: contextChanged
      ? null
      : reconcileOptionalSelection(
          selection.hoveredDataPointId,
          availability.dataPointIds,
        ),
    activeTableRowId: contextChanged
      ? null
      : reconcileOptionalSelection(
          selection.activeTableRowId,
          availability.tableRowIds ?? availability.dataPointIds,
        ),
    activeLegendItemId: contextChanged
      ? null
      : reconcileOptionalSelection(
          selection.activeLegendItemId,
          availability.legendItemIds,
        ),
    openDetailItemId: contextChanged
      ? null
      : reconcileOptionalSelection(
          selection.openDetailItemId,
          availability.detailItemIds ?? availability.dataPointIds,
        ),
  };
}

export function createDashboardSelection(
  defaults: DashboardSelectionDefaults = {},
  availability: DashboardSelectionAvailability = {},
): DashboardSelection {
  return reconcileDashboardSelection(
    { ...emptyDashboardSelection, ...defaults },
    availability,
    defaults,
  );
}

export function dashboardSelectionsEqual(
  left: DashboardSelection,
  right: DashboardSelection,
) {
  return (
    left.selectedEntityId === right.selectedEntityId &&
    left.selectedMetricId === right.selectedMetricId &&
    left.selectedDataPointId === right.selectedDataPointId &&
    left.hoveredDataPointId === right.hoveredDataPointId &&
    left.activeTableRowId === right.activeTableRowId &&
    left.activeLegendItemId === right.activeLegendItemId &&
    left.openDetailItemId === right.openDetailItemId
  );
}

export type DashboardSelectionAction =
  | { type: 'select-entity'; entityId: string | null }
  | { type: 'select-metric'; metricId: string | null }
  | { type: 'focus-item'; itemId: string | null }
  | { type: 'hover-item'; itemId: string | null }
  | { type: 'activate-table-row'; rowId: string | null }
  | { type: 'activate-legend-item'; itemId: string | null }
  | { type: 'open-detail'; itemId: string }
  | { type: 'close-detail' }
  | { type: 'clear-selection' }
  | { type: 'replace'; selection: DashboardSelection };

/** Pure transition function used by both controlled and uncontrolled clients. */
export function reduceDashboardSelection(
  selection: DashboardSelection,
  action: DashboardSelectionAction,
): DashboardSelection {
  switch (action.type) {
    case 'select-entity':
      return {
        ...selection,
        selectedEntityId: action.entityId,
        selectedDataPointId: null,
        hoveredDataPointId: null,
        activeTableRowId: null,
        activeLegendItemId: null,
        openDetailItemId: null,
      };
    case 'select-metric':
      return {
        ...selection,
        selectedMetricId: action.metricId,
        selectedDataPointId: null,
        hoveredDataPointId: null,
        activeTableRowId: null,
        activeLegendItemId: null,
        openDetailItemId: null,
      };
    case 'focus-item':
      return {
        ...selection,
        selectedDataPointId: action.itemId,
        activeTableRowId: action.itemId,
      };
    case 'hover-item':
      return { ...selection, hoveredDataPointId: action.itemId };
    case 'activate-table-row':
      return {
        ...selection,
        selectedDataPointId: action.rowId,
        activeTableRowId: action.rowId,
      };
    case 'activate-legend-item':
      return { ...selection, activeLegendItemId: action.itemId };
    case 'open-detail':
      return {
        ...selection,
        selectedDataPointId: action.itemId,
        activeTableRowId: action.itemId,
        openDetailItemId: action.itemId,
      };
    case 'close-detail':
      return { ...selection, openDetailItemId: null };
    case 'clear-selection':
      return {
        ...selection,
        selectedDataPointId: null,
        hoveredDataPointId: null,
        activeTableRowId: null,
        activeLegendItemId: null,
        openDetailItemId: null,
      };
    case 'replace':
      return action.selection;
  }
}
