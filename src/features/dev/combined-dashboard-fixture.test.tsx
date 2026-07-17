import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('recharts', () => {
  const Wrapper = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Empty = () => null;
  return {
    Bar: Wrapper,
    BarChart: Wrapper,
    CartesianGrid: Empty,
    Cell: Empty,
    Line: Empty,
    LineChart: Wrapper,
    ReferenceLine: Empty,
    ResponsiveContainer: Wrapper,
    Tooltip: Empty,
    XAxis: Empty,
    YAxis: Empty,
  };
});

import { CombinedDashboardFixture } from './combined-dashboard-fixture';

describe('CombinedDashboardFixture', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/dev/combined-dashboard');
  });

  it('labels deterministic demo content and exposes the complete anatomy', () => {
    render(<CombinedDashboardFixture />);

    expect(
      screen.getByRole('heading', { name: 'Combined Dashboard Foundation' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Development/demo data only')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Primary visualization' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Supporting visualization' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Insight rail' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Evidence table' })).toBeInTheDocument();
    expect(screen.getByText('Explicit zero fixture segment')).toBeInTheDocument();
    expect(screen.getByText('Not recorded')).toBeInTheDocument();
    expect(screen.getByText('≥ 27')).toBeInTheDocument();
  });

  it('synchronizes chart controls, table state, insight state, legend, and URL', async () => {
    const user = userEvent.setup();
    render(<CombinedDashboardFixture />);

    await user.click(
      screen.getAllByRole('button', {
        name: 'Focus North demonstration segment',
      })[0],
    );

    expect(screen.getByText(/Focused item: North demonstration segment/)).toBeInTheDocument();
    expect(
      screen.getByRole('row', { name: 'Focus North demonstration segment' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('article', { name: 'Fixture-only descriptive finding' }),
    ).toHaveAttribute('data-selected', 'true');
    expect(window.location.search).toContain('demoItem=demo-north');

    await user.click(
      screen.getByRole('button', {
        name: /Primary fixture series.*Available/,
      }),
    );
    expect(screen.getByText(/Legend: Primary fixture series/)).toBeInTheDocument();
    expect(window.location.search).toContain('demoLegend=demo-primary-series');

    await user.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.getByText(/No data point selected/)).toBeInTheDocument();
    expect(window.location.search).not.toContain('demoItem');
    expect(window.location.search).not.toContain('demoLegend');
  });

  it('synchronizes keyboard table activation and detail closing', async () => {
    const user = userEvent.setup();
    render(<CombinedDashboardFixture />);
    const row = screen.getByRole('row', { name: 'Focus Explicit zero fixture segment' });
    row.focus();
    await user.keyboard('{Enter}');

    expect(
      screen.getByRole('region', {
        name: 'Explicit zero fixture segment detail',
      }),
    ).toBeInTheDocument();
    expect(window.location.search).toContain('demoDetail=demo-zero');
    await user.click(
      screen.getByRole('button', {
        name: 'Close Explicit zero fixture segment detail',
      }),
    );
    expect(
      screen.queryByRole('region', {
        name: 'Explicit zero fixture segment detail',
      }),
    ).not.toBeInTheDocument();
  });

  it('demonstrates loading, empty, and unavailable display states', async () => {
    const user = userEvent.setup();
    render(<CombinedDashboardFixture />);
    const state = screen.getByLabelText('Fixture display state');

    await user.selectOptions(state, 'loading');
    expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(3);

    await user.selectOptions(state, 'empty');
    expect(
      screen.getAllByText('No demo rows in this fixture state').length,
    ).toBeGreaterThanOrEqual(3);

    await user.selectOptions(state, 'unavailable');
    expect(screen.getAllByText('Demo metric unavailable').length).toBeGreaterThanOrEqual(
      3,
    );
  });

  it('resets stale item state when entity or metric changes', async () => {
    const user = userEvent.setup();
    render(<CombinedDashboardFixture />);
    await user.click(
      screen.getAllByRole('button', {
        name: 'Focus North demonstration segment',
      })[0],
    );
    await user.selectOptions(
      screen.getByLabelText('Demo entity'),
      'demo-long-name',
    );
    expect(screen.getByText(/No data point selected/)).toBeInTheDocument();

    await user.click(
      screen.getAllByRole('button', {
        name: 'Focus Explicit zero fixture segment',
      })[0],
    );
    await user.selectOptions(
      screen.getByLabelText('Demo metric'),
      'demo-stability',
    );
    expect(screen.getByText(/No data point selected/)).toBeInTheDocument();
  });

  it('cleans invalid fixture URL selections through availability reconciliation', async () => {
    window.history.replaceState(
      null,
      '',
      '/dev/combined-dashboard?demoEntity=invalid&demoItem=invalid',
    );
    render(
      <CombinedDashboardFixture
        initialSearchParams={{ demoEntity: 'invalid', demoItem: 'invalid' }}
      />,
    );

    expect(screen.getByText(/Entity: Demo Ares Collective/)).toBeInTheDocument();
    expect(screen.getByText(/No data point selected/)).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.search).not.toContain('invalid');
    });
  });
});
