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
];

function renderTable() {
  render(
    <SelectionStatTable
      globalPlaysByName={new Map([
        ['Alpha Corporation', 5],
        ['Beta Corporation', 10],
      ])}
      globalTotalGames={20}
      kind="Corporation"
      rows={rows}
      scopeTotalGames={10}
    />,
  );
}

function getBodyRows() {
  const table = screen.getByRole('table', { name: /corporation statistics/i });
  const rowGroups = within(table).getAllByRole('rowgroup');
  return within(rowGroups[1]).getAllByRole('row');
}

describe('SelectionStatTable', () => {
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

  it('sorts interactively and applies restrained metric tones', () => {
    renderTable();

    fireEvent.click(screen.getByRole('button', { name: /sort by name/i }));

    expect(screen.getByRole('columnheader', { name: /name/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    expect(within(getBodyRows()[0]).getByText('Alpha Corporation')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /sort by win rate/i }));

    expect(screen.getByRole('columnheader', { name: /win rate/i })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    expect(within(getBodyRows()[0]).getByText('Alpha Corporation')).toBeInTheDocument();
    expect(screen.getByText('67%').closest('[data-metric-tone]')).toHaveAttribute(
      'data-metric-tone',
      'positive',
    );
    expect(screen.getByText('13%').closest('[data-metric-tone]')).toHaveAttribute(
      'data-metric-tone',
      'negative',
    );
  });
});
