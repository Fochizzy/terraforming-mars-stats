import { describe, expect, it } from 'vitest';
import {
  createDashboardSelection,
  emptyDashboardSelection,
  reconcileDashboardSelection,
  reduceDashboardSelection,
} from './selection';

const availability = {
  entityIds: ['entity-a', 'entity-b'],
  metricIds: ['metric-a', 'metric-b'],
  dataPointIds: ['point-a', 'point-b'],
  tableRowIds: ['point-a', 'point-b'],
  legendItemIds: ['series-a', 'series-b'],
  detailItemIds: ['point-a', 'point-b'],
} as const;

describe('dashboard selection coordination', () => {
  it('creates a deterministic safe local default', () => {
    expect(createDashboardSelection({}, availability)).toEqual({
      ...emptyDashboardSelection,
      selectedEntityId: 'entity-a',
      selectedMetricId: 'metric-a',
    });
  });

  it('retains valid caller defaults', () => {
    expect(
      createDashboardSelection(
        { selectedEntityId: 'entity-b', selectedMetricId: 'metric-b' },
        availability,
      ),
    ).toMatchObject({
      selectedEntityId: 'entity-b',
      selectedMetricId: 'metric-b',
    });
  });

  it('cleans invalid URL-style optional IDs without selecting a replacement', () => {
    const selection = reconcileDashboardSelection(
      {
        ...createDashboardSelection({}, availability),
        selectedDataPointId: 'not-available',
        activeTableRowId: 'not-available',
        activeLegendItemId: 'not-available',
        openDetailItemId: 'not-available',
      },
      availability,
    );

    expect(selection).toMatchObject({
      selectedDataPointId: null,
      activeTableRowId: null,
      activeLegendItemId: null,
      openDetailItemId: null,
    });
  });

  it('resets stale context when an entity becomes unavailable', () => {
    const current = {
      ...createDashboardSelection(
        { selectedEntityId: 'entity-b' },
        availability,
      ),
      selectedDataPointId: 'point-b',
      activeTableRowId: 'point-b',
      activeLegendItemId: 'series-b',
      openDetailItemId: 'point-b',
    };

    expect(
      reconcileDashboardSelection(current, {
        ...availability,
        entityIds: ['entity-a'],
      }),
    ).toEqual({
      ...emptyDashboardSelection,
      selectedEntityId: 'entity-a',
      selectedMetricId: 'metric-a',
    });
  });

  it('synchronizes a focused chart item with the evidence row', () => {
    const current = createDashboardSelection({}, availability);
    expect(
      reduceDashboardSelection(current, {
        type: 'focus-item',
        itemId: 'point-b',
      }),
    ).toMatchObject({
      selectedDataPointId: 'point-b',
      activeTableRowId: 'point-b',
    });
  });

  it('coordinates transient hover and legend state without coupling them', () => {
    const current = createDashboardSelection({}, availability);
    const hovered = reduceDashboardSelection(current, {
      type: 'hover-item',
      itemId: 'point-b',
    });
    const legendSelected = reduceDashboardSelection(hovered, {
      type: 'activate-legend-item',
      itemId: 'series-a',
    });

    expect(legendSelected).toMatchObject({
      hoveredDataPointId: 'point-b',
      activeLegendItemId: 'series-a',
      selectedDataPointId: null,
    });
  });

  it('synchronizes a table row with chart selection and detail when requested', () => {
    const current = createDashboardSelection({}, availability);
    const rowSelected = reduceDashboardSelection(current, {
      type: 'activate-table-row',
      rowId: 'point-a',
    });
    const detailOpened = reduceDashboardSelection(rowSelected, {
      type: 'open-detail',
      itemId: 'point-a',
    });

    expect(detailOpened).toMatchObject({
      selectedDataPointId: 'point-a',
      activeTableRowId: 'point-a',
      openDetailItemId: 'point-a',
    });
  });

  it('clears coordinated item state while retaining explicit entity and metric choices', () => {
    const current = {
      ...createDashboardSelection({}, availability),
      selectedDataPointId: 'point-a',
      hoveredDataPointId: 'point-b',
      activeTableRowId: 'point-a',
      activeLegendItemId: 'series-a',
      openDetailItemId: 'point-a',
    };
    expect(
      reduceDashboardSelection(current, { type: 'clear-selection' }),
    ).toEqual({
      ...emptyDashboardSelection,
      selectedEntityId: 'entity-a',
      selectedMetricId: 'metric-a',
    });
  });
});
