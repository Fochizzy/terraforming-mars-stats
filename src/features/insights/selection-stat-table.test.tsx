import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SelectionStatRow } from '@/lib/db/selection-stats-repo';
import { SelectionStatTable } from './selection-stat-table';

type NamedStatRow = SelectionStatRow & { name: string };

function buildRow(overrides: Partial<NamedStatRow>): NamedStatRow {
  return {
    avg_animal_points: 2,
    avg_award_points: 3,
    avg_awards_won: 0.5,
    avg_card_points: 22,
    avg_cities_points: 6,
    avg_greenery_points: 8,
    avg_jovian_points: 1,
    avg_microbe_points: 1.5,
    avg_milestone_points: 4,
    avg_milestones_won: 0.75,
    avg_placement: 2,
    avg_points: 86,
    avg_tr_points: 34,
    first_place_finishes: 1,
    name: 'Corporation',
    plays: 4,
    second_place_finishes: 1,
    third_plus_finishes: 2,
    win_rate: 0.25,
    ...overrides,
  };
}

const rows: NamedStatRow[] = [
  buildRow({
    avg_placement: 1.4,
    avg_points: 94.2,
    name: 'Alpha Corporation',
    plays: 3,
    win_rate: 0.67,
  }),
  buildRow({
    avg_placement: 2.3,
    avg_points: 78.8,
    name: 'Beta Corporation',
    plays: 8,
    win_rate: 0.13,
  }),
  buildRow({
    avg_placement: 1,
    avg_points: 101,
    name: 'Gamma Corporation',
    plays: 1,
    win_rate: 1,
  }),
];

function renderTable() {
  render(
    <SelectionStatTable
      globalPlaysByName={new Map([
        ['Alpha Corporation', 5],
        ['Beta Corporation', 10],
        ['Gamma Corporation', 1],
      ])}
      globalTotalGames={20}
      kind="Corporation"
      rows={rows}
      scopeTotalGames={12}
    />,
  );
}

function getBodyRows() {
  const table = screen.getByRole('table', { name: /corporation statistics/i });
  const rowGroups = within(table).getAllByRole('rowgroup');
  return within(rowGroups[1]).getAllByRole('row').filter((row) =>
    within(row).queryByText(/Corporation/),
  );
}

describe('SelectionStatTable', () => {
  it('shows the summary strip, grouped headings, sticky-friendly controls, and low-sample warning', () => {
    renderTable();

    expect(screen.getByText('3 corporations')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('2 low-sample rows are visually de-emphasized.')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Usage' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Results' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Production' })).toBeInTheDocument();
    expect(screen.getAllByText('Small sample')).toHaveLength(2);
    expect(screen.getByText('Terraform rating')).toBeInTheDocument();
    expect(screen.getByText('Card points')).toBeInTheDocument();
  });

  it('defaults to most-played first and exposes the active sort state', () => {
    renderTable();

    expect(screen.getByRole('columnheader', { name: /plays/i })).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    const bodyRows = getBodyRows();
    expect(within(bodyRows[0]).getByText('Beta Corporation')).toBeInTheDocument();
    expect(within(bodyRows[1]).getByText('Alpha Corporation')).toBeInTheDocument();
  });

  it('sorts interactively and supports secondary sorting with Shift', () => {
    renderTable();

    fireEvent.click(screen.getByRole('button', { name: /corporation.*click to sort/i }));

    expect(screen.getByRole('columnheader', { name: /corporation/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    expect(within(getBodyRows()[0]).getByText('Alpha Corporation')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /win rate.*click to sort/i }), {
      shiftKey: true,
    });

    expect(screen.getByLabelText('Sort priority 1')).toHaveTextContent('1');
    expect(screen.getByLabelText('Sort priority 2')).toHaveTextContent('2');
    expect(screen.getByText(/Corporation ↑ · Win rate ↓/)).toBeInTheDocument();
  });

  it('applies semantic metric tones and consistent number formatting', () => {
    renderTable();

    expect(screen.getByText('67%').closest('[data-metric-tone]')).toHaveAttribute(
      'data-metric-tone',
      'positive',
    );
    expect(screen.getByText('13%').closest('[data-metric-tone]')).toHaveAttribute(
      'data-metric-tone',
      'negative',
    );
    expect(screen.getByText('1.40')).toBeInTheDocument();
    expect(screen.getByText('94.2')).toBeInTheDocument();
  });

  it('switches column presets and allows custom visibility', () => {
    renderTable();

    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    expect(screen.queryByText('Terraform rating')).not.toBeInTheDocument();
    expect(screen.getByText('Average VP')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Columns'));
    fireEvent.click(screen.getByLabelText('Terraform rating'));
    expect(screen.getByText('Terraform rating')).toBeInTheDocument();
  });

  it('exposes mobile detail expansion and row selection states', () => {
    renderTable();

    const detailButton = screen.getByRole('button', {
      name: 'Show details for Alpha Corporation',
    });
    fireEvent.click(detailButton);

    expect(screen.getByLabelText('Mobile details for Alpha Corporation')).toBeInTheDocument();
    expect(detailButton).toHaveAttribute('aria-expanded', 'true');

    const alphaRow = within(getBodyRows()[1]).getByText('Alpha Corporation').closest('tr');
    expect(alphaRow).not.toBeNull();
    fireEvent.click(alphaRow!);
    expect(alphaRow).toHaveAttribute('aria-selected', 'true');
  });
});
