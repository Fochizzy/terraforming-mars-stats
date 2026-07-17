'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createDashboardSelection,
  dashboardSelectionsEqual,
  reconcileDashboardSelection,
  reduceDashboardSelection,
  type DashboardSelection,
  type DashboardSelectionAction,
  type DashboardSelectionAvailability,
  type DashboardSelectionDefaults,
} from '@/lib/dashboard';

export type CoordinatedDashboardController = {
  selection: DashboardSelection;
  dispatch(action: DashboardSelectionAction): void;
  selectEntity(entityId: string | null): void;
  selectMetric(metricId: string | null): void;
  focusItem(itemId: string | null): void;
  hoverItem(itemId: string | null): void;
  activateTableRow(rowId: string | null): void;
  activateLegendItem(itemId: string | null): void;
  openDetail(itemId: string): void;
  closeDetail(): void;
  clearSelection(): void;
  reset(): void;
};

export type UseCoordinatedDashboardOptions = {
  /** Controlled value. Omit to let the hook keep local state. */
  value?: DashboardSelection;
  /** Safe local baseline and reset target. */
  defaultValue?: DashboardSelectionDefaults;
  /** Available IDs used to clean stale URL, entity, metric, and item state. */
  availability?: DashboardSelectionAvailability;
  /** Called for both controlled and uncontrolled transitions. */
  onChange?: (selection: DashboardSelection) => void;
};

function stableSignature(value: unknown) {
  return JSON.stringify(value);
}

/**
 * Shared controlled/uncontrolled controller. Entity or metric changes clear
 * stale point/row/legend/detail state. Availability changes are reconciled
 * deterministically and invalid optional IDs are removed.
 */
export function useCoordinatedDashboard({
  value,
  defaultValue = {},
  availability = {},
  onChange,
}: UseCoordinatedDashboardOptions = {}): CoordinatedDashboardController {
  const availabilitySignature = stableSignature(availability);
  const defaultSignature = stableSignature(defaultValue);
  const stableAvailability = useMemo(
    () => availability,
    // The serialized value makes equivalent inline arrays stable for effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [availabilitySignature],
  );
  const stableDefaults = useMemo(
    () => defaultValue,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defaultSignature],
  );
  const [localSelection, setLocalSelection] = useState(() =>
    createDashboardSelection(stableDefaults, stableAvailability),
  );
  const controlled = value !== undefined;
  const sourceSelection = controlled ? value : localSelection;
  const selection = useMemo(
    () =>
      reconcileDashboardSelection(
        sourceSelection,
        stableAvailability,
        stableDefaults,
      ),
    [sourceSelection, stableAvailability, stableDefaults],
  );

  const commit = useCallback(
    (next: DashboardSelection) => {
      if (!controlled) {
        setLocalSelection(next);
      }
      onChange?.(next);
    },
    [controlled, onChange],
  );

  useEffect(() => {
    if (!dashboardSelectionsEqual(sourceSelection, selection)) {
      commit(selection);
    }
  }, [commit, selection, sourceSelection]);

  const dispatch = useCallback(
    (action: DashboardSelectionAction) => {
      const next = reconcileDashboardSelection(
        reduceDashboardSelection(selection, action),
        stableAvailability,
        stableDefaults,
      );
      if (!dashboardSelectionsEqual(selection, next)) {
        commit(next);
      }
    }, [commit, selection, stableAvailability, stableDefaults],
  );

  const reset = useCallback(() => {
    const next = createDashboardSelection(stableDefaults, stableAvailability);
    if (!dashboardSelectionsEqual(selection, next)) {
      commit(next);
    }
  }, [commit, selection, stableAvailability, stableDefaults]);

  return {
    selection,
    dispatch,
    selectEntity: (entityId) => dispatch({ type: 'select-entity', entityId }),
    selectMetric: (metricId) => dispatch({ type: 'select-metric', metricId }),
    focusItem: (itemId) => dispatch({ type: 'focus-item', itemId }),
    hoverItem: (itemId) => dispatch({ type: 'hover-item', itemId }),
    activateTableRow: (rowId) =>
      dispatch({ type: 'activate-table-row', rowId }),
    activateLegendItem: (itemId) =>
      dispatch({ type: 'activate-legend-item', itemId }),
    openDetail: (itemId) => dispatch({ type: 'open-detail', itemId }),
    closeDetail: () => dispatch({ type: 'close-detail' }),
    clearSelection: () => dispatch({ type: 'clear-selection' }),
    reset,
  };
}
