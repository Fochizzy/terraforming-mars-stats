import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDashboardSelection } from '@/lib/dashboard';
import { useCoordinatedDashboard } from './use-coordinated-dashboard';

const availability = {
  entityIds: ['entity-a', 'entity-b'],
  metricIds: ['metric-a', 'metric-b'],
  dataPointIds: ['point-a', 'point-b'],
  tableRowIds: ['point-a', 'point-b'],
  legendItemIds: ['series-a', 'series-b'],
  detailItemIds: ['point-a', 'point-b'],
} as const;

describe('useCoordinatedDashboard', () => {
  it('supports uncontrolled state and deterministic clearing', () => {
    const { result } = renderHook(() =>
      useCoordinatedDashboard({ availability }),
    );

    act(() => result.current.focusItem('point-a'));
    expect(result.current.selection).toMatchObject({
      selectedDataPointId: 'point-a',
      activeTableRowId: 'point-a',
    });

    act(() => result.current.clearSelection());
    expect(result.current.selection).toMatchObject({
      selectedEntityId: 'entity-a',
      selectedMetricId: 'metric-a',
      selectedDataPointId: null,
      activeTableRowId: null,
    });
  });

  it('supports controlled state through explicit callbacks', () => {
    const onChange = vi.fn();
    const controlled = createDashboardSelection(
      { selectedEntityId: 'entity-b', selectedMetricId: 'metric-b' },
      availability,
    );
    const { result } = renderHook(() =>
      useCoordinatedDashboard({
        availability,
        onChange,
        value: controlled,
      }),
    );

    act(() => result.current.focusItem('point-b'));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedEntityId: 'entity-b',
        selectedMetricId: 'metric-b',
        selectedDataPointId: 'point-b',
        activeTableRowId: 'point-b',
      }),
    );
    expect(result.current.selection.selectedDataPointId).toBeNull();
  });

  it('cleans an invalid controlled selection and reports the cleaned value', () => {
    const onChange = vi.fn();
    renderHook(() =>
      useCoordinatedDashboard({
        availability,
        onChange,
        value: {
          ...createDashboardSelection({}, availability),
          selectedDataPointId: 'invalid',
        },
      }),
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ selectedDataPointId: null }),
    );
  });

  it('resets stale state when available entities change', () => {
    const { result, rerender } = renderHook(
      ({ entityIds }) =>
        useCoordinatedDashboard({
          availability: { ...availability, entityIds },
          defaultValue: { selectedEntityId: 'entity-b' },
        }),
      { initialProps: { entityIds: ['entity-a', 'entity-b'] as readonly string[] } },
    );

    act(() => result.current.focusItem('point-b'));
    rerender({ entityIds: ['entity-a'] });

    expect(result.current.selection).toMatchObject({
      selectedEntityId: 'entity-a',
      selectedDataPointId: null,
      activeTableRowId: null,
    });
  });

  it('resets to the caller-supplied safe defaults', () => {
    const { result } = renderHook(() =>
      useCoordinatedDashboard({
        availability,
        defaultValue: {
          selectedEntityId: 'entity-b',
          selectedMetricId: 'metric-b',
        },
      }),
    );

    act(() => result.current.selectEntity('entity-a'));
    act(() => result.current.reset());
    expect(result.current.selection).toMatchObject({
      selectedEntityId: 'entity-b',
      selectedMetricId: 'metric-b',
    });
  });
});
