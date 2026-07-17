import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  missingMetric,
  observedMetric,
  partialMetric,
  unavailableMetric,
  type MetricValue,
} from '@/lib/metrics/metric-value';
import {
  DashboardEvidenceTable,
  DashboardMetricValue,
  type DashboardEvidenceColumn,
} from './dashboard-evidence-table';

type Row = { id: string; label: string; value: MetricValue };

const rows: Row[] = [
  { id: 'zero', label: 'Explicit zero', value: observedMetric(0) },
  { id: 'missing', label: 'Missing', value: missingMetric() },
  { id: 'partial', label: 'Partial', value: partialMetric(7) },
  { id: 'unavailable', label: 'Unavailable', value: unavailableMetric('Absent') },
];

const columns: DashboardEvidenceColumn<Row>[] = [
  { id: 'label', header: 'Label', render: (row) => row.label },
  {
    id: 'value',
    header: 'Value',
    align: 'numeric',
    render: (row) => <DashboardMetricValue value={row.value} />,
  },
];

function renderTable(onActivateRow = vi.fn()) {
  return render(
    <DashboardEvidenceTable
      caption="Fixture evidence"
      columns={columns}
      getRowId={(row) => row.id}
      getRowLabel={(row) => row.label}
      label="Evidence"
      onActivateRow={onActivateRow}
      rows={rows}
      selectedRowId="partial"
    />,
  );
}

describe('DashboardEvidenceTable', () => {
  it('preserves explicit zero, missing, partial, and unavailable values', () => {
    renderTable();

    expect(screen.getByText('0')).toHaveAttribute('data-metric-kind', 'observed');
    expect(screen.getByText('Not recorded')).toHaveAttribute('data-state', 'missing');
    expect(screen.getByText('≥ 7')).toHaveAttribute('data-metric-kind', 'partial');
    const unavailableValue = within(
      screen.getByRole('row', { name: 'Focus Unavailable' }),
    )
      .getAllByText('Unavailable')
      .find((element) => element.hasAttribute('data-metric-kind'));
    expect(unavailableValue).toHaveAttribute('data-metric-kind', 'unavailable');
  });

  it('marks the selected row semantically and visually', () => {
    renderTable();
    expect(screen.getByRole('row', { name: 'Focus Partial' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('row', { name: 'Focus Partial' })).toHaveAttribute(
      'data-selected',
      'true',
    );
  });

  it('activates rows with click, Enter, and Space', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    renderTable(onActivate);
    const row = screen.getByRole('row', { name: 'Focus Explicit zero' });

    await user.click(row);
    row.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onActivate).toHaveBeenNthCalledWith(1, 'zero');
    expect(onActivate).toHaveBeenNthCalledWith(2, 'zero');
    expect(onActivate).toHaveBeenNthCalledWith(3, 'zero');
  });

  it('uses the shared responsive scroll region and accessible column labels', () => {
    renderTable();
    expect(screen.getByRole('region', { name: 'Evidence' })).toHaveAttribute(
      'tabindex',
      '0',
    );
    expect(screen.getByRole('columnheader', { name: 'Value' })).toHaveAttribute(
      'data-align',
      'numeric',
    );
  });

  it('renders shared loading, empty, and unavailable states', () => {
    const { rerender } = render(
      <DashboardEvidenceTable
        columns={columns}
        getRowId={(row) => row.id}
        getRowLabel={(row) => row.label}
        label="Evidence states"
        rows={[]}
        state={{ status: 'loading', label: 'Loading evidence' }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading evidence');

    rerender(
      <DashboardEvidenceTable
        columns={columns}
        getRowId={(row) => row.id}
        getRowLabel={(row) => row.label}
        label="Evidence states"
        rows={[]}
      />,
    );
    expect(screen.getByText('No evidence rows')).toBeInTheDocument();

    rerender(
      <DashboardEvidenceTable
        columns={columns}
        getRowId={(row) => row.id}
        getRowLabel={(row) => row.label}
        label="Evidence states"
        rows={[]}
        state={{ status: 'unavailable', title: 'Evidence unavailable' }}
      />,
    );
    expect(screen.getByText('Evidence unavailable')).toBeInTheDocument();
  });
});
