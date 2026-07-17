import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  ClearDashboardSelectionButton,
  DashboardEntitySelector,
  DashboardMetricSelector,
  DashboardSelectionSummary,
  SelectableDashboardLegend,
} from './dashboard-controls';

describe('dashboard selection controls', () => {
  it('emits entity and metric selections through explicit callbacks', async () => {
    const user = userEvent.setup();
    const onEntity = vi.fn();
    const onMetric = vi.fn();
    render(
      <>
        <DashboardEntitySelector
          onChange={onEntity}
          options={[{ id: 'entity-a', label: 'Entity A' }]}
          value={null}
        />
        <DashboardMetricSelector
          onChange={onMetric}
          options={[{ id: 'metric-a', label: 'Metric A' }]}
          value={null}
        />
      </>,
    );

    await user.selectOptions(screen.getByLabelText('Entity'), 'entity-a');
    await user.selectOptions(screen.getByLabelText('Metric'), 'metric-a');
    expect(onEntity).toHaveBeenCalledWith('entity-a');
    expect(onMetric).toHaveBeenCalledWith('metric-a');
  });

  it('conveys legend selection with aria-pressed and visible text', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <SelectableDashboardLegend
        activeItemId={null}
        items={[{ id: 'series-a', label: 'Very long fixture series label' }]}
        onChange={onChange}
      />,
    );
    const legendButton = screen.getByRole('button', {
      name: /Very long fixture series label.*Available/,
    });
    await user.click(legendButton);
    expect(onChange).toHaveBeenCalledWith('series-a');

    rerender(
      <SelectableDashboardLegend
        activeItemId="series-a"
        items={[{ id: 'series-a', label: 'Very long fixture series label' }]}
        onChange={onChange}
      />,
    );
    expect(
      screen.getByRole('button', {
        name: /Very long fixture series label.*Selected/,
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('disables and labels unavailable legend and selector options', () => {
    render(
      <>
        <DashboardMetricSelector
          onChange={() => undefined}
          options={[
            { id: 'metric-unavailable', label: 'Future metric', unavailable: true },
          ]}
          value={null}
        />
        <SelectableDashboardLegend
          activeItemId={null}
          items={[
            { id: 'series-unavailable', label: 'Future series', unavailable: true },
          ]}
          onChange={() => undefined}
        />
      </>,
    );

    expect(screen.getByRole('option', { name: 'Future metric (Unavailable)' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /Future series.*Unavailable/ }),
    ).toBeDisabled();
  });

  it('announces selected context and supports clearing by keyboard', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <>
        <DashboardSelectionSummary
          labels={{
            entity: 'Entity A',
            metric: 'Metric A',
            item: 'Point A',
            legend: null,
          }}
        />
        <ClearDashboardSelectionButton onClear={onClear} />
      </>,
    );

    expect(screen.getByText(/Entity: Entity A/)).toHaveAttribute('aria-live', 'polite');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Clear selection' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onClear).toHaveBeenCalledOnce();
  });
});
