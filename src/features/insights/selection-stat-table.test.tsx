import type { ComponentProps } from 'react';
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
    avg_tr_points: 34,
    name: 'Alpha Corporation',
    plays: 3,
    win_rate: 0.67,
  }),
  buildRow({
    avg_placement: 2.3,
    avg_points: 78.8,
    avg_tr_points: 29,
    name: 'Beta Corporation',
    plays: 8,
    win_rate: 0.13,
  }),
  buildRow({
    avg_placement: 1,
    avg_points: 101,
    avg_tr_points: 41,
    name: 'Gamma Corporation',
    plays: 1,
    win_rate: 1,
  }),
  buildRow({
    avg_placement: 0,
    avg_points: 0,
    avg_tr_points: 0,
    first_place_finishes: 0,
    name: 'Delta Corporation',
    plays: 0,
    second_place_finishes: 0,
    third_plus_finishes: 0,
    win_rate: 0,
  }),
];

function renderTable(
  overrides: Partial<ComponentProps<typeof SelectionStatTable>> = {},
) {
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
      {...overrides}
    />,
  );
}

function getTable(name = /corporation statistics/i) {
  return screen.getByRole('table', { name });
}

function getBodyRows(name = /corporation statistics/i) {
  const table = getTable(name);
  const rowGroups = within(table).getAllByRole('rowgroup');

  return within(rowGroups[1])
    .getAllByRole('row')
    .filter((row) => within(row).queryByText(/Corporation|Prelude/));
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

    // Inactive sort icon is hidden; active sort icon is visible
    expect(
      screen.getByRole('columnheader', { name: /plays/i }).querySelector('[data-sort-icon-state="active"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /corporation/i }).querySelector('[data-sort-icon-state="idle"]'),
    ).toBeInTheDocument();
  });

  it('sorts interactively and preserves aria-sort for the active column', () => {
    renderTable();

    fireEvent.click(screen.getByRole('button', { name: /sort by name/i }));

    expect(screen.getByRole('columnheader', { name: /corporation/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    expect(within(getBodyRows()[0]).getByText('Alpha Corporation')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /sort by win rate/i }));

    expect(screen.getByRole('columnheader', { name: /win rate/i })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    expect(within(getBodyRows()[0]).getByText('Gamma Corporation')).toBeInTheDocument();
  });

  it('filters by search text', () => {
    renderTable();

    fireEvent.change(screen.getByLabelText('Search'), {
      target: { value: 'gamma' },
    });

    const bodyRows = getBodyRows();
    expect(bodyRows).toHaveLength(1);
    expect(within(bodyRows[0]).getByText('Gamma Corporation')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 4 corporations');
  });

  it('filters by minimum sample size', () => {
    renderTable();

    fireEvent.change(screen.getByLabelText('Min plays'), {
      target: { value: '4' },
    });

    const bodyRows = getBodyRows();
    expect(bodyRows).toHaveLength(1);
    expect(within(bodyRows[0]).getByText('Beta Corporation')).toBeInTheDocument();
    expect(screen.queryByText('Gamma Corporation')).not.toBeInTheDocument();
  });

  it('switches between column presets', () => {
    renderTable();

    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    expect(screen.queryByRole('columnheader', { name: /terraform rating/i })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /average vp/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Engine stats' }));
    expect(screen.getByRole('columnheader', { name: /terraform rating/i })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /win rate/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Performance' }));
    expect(screen.getByRole('columnheader', { name: /win rate/i })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /terraform rating/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All metrics' }));
    expect(screen.getByRole('columnheader', { name: /terraform rating/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /win rate/i })).toBeInTheDocument();
  });

  it('shows low-sample treatment with indicator badges', () => {
    renderTable();

    // Alpha (3 plays) and Gamma (1 play) and Delta (0 plays) are low-sample
    expect(screen.getByText(/low-sample.*rows have muted/i)).toBeInTheDocument();
    expect(screen.getAllByText('Low sample').length).toBeGreaterThan(0);
  });

  it('uses right-aligned tabular numeric values', () => {
    renderTable();

    // Beta Corporation plays = 8, rendered in a TabularValue with data-numeric-value
    const plays8 = screen.getAllByText('8').find(
      (el) => el.closest('[data-numeric-value]') !== null,
    )!;
    expect(plays8.closest('[data-numeric-value]')).toHaveClass('tabular-nums');

    // Win rate tones
    const winRateCell67 = screen.getAllByText('67%').find(
      (el) => el.closest('[data-metric-tone]') !== null,
    )!;
    expect(winRateCell67.closest('[data-metric-tone]')).toHaveAttribute(
      'data-metric-tone',
      'positive',
    );
    const winRateCell13 = screen.getAllByText('13%').find(
      (el) => el.closest('[data-metric-tone]') !== null,
    )!;
    expect(winRateCell13.closest('[data-metric-tone]')).toHaveAttribute(
      'data-metric-tone',
      'negative',
    );
  });

  it('renders sticky name column, grouped headers, separated legend, and scroll affordance', () => {
    renderTable();

    // Grouped column headers
    expect(screen.getByRole('columnheader', { name: /selection/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /usage/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /results/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /production/i })).toBeInTheDocument();

    // Sticky name column header
    const nameHeader = screen.getByRole('columnheader', { name: /corporation/i });
    expect(nameHeader).toHaveAttribute('data-sticky-column', 'name');

    // Sticky name column data cells
    expect(
      screen.getAllByText('Beta Corporation')[0].closest('[data-sticky-column="name"]'),
    ).toBeInTheDocument();

    // Score-source legend separated from table header
    const legend = screen.getByLabelText('Score source legend');
    expect(within(legend).getByText('TR')).toBeInTheDocument();
    expect(within(legend).getByText('Microbes')).toBeInTheDocument();

    // Scroll container and right-edge shadow
    expect(screen.getByLabelText('Corporation table scroll area')).toHaveAttribute(
      'data-scroll-container',
    );
    expect(document.querySelector('[data-scroll-shadow="right"]')).toBeInTheDocument();
  });

  it('supports prelude mode labels', () => {
    const preludeRows = rows.map((row) => ({
      ...row,
      name: row.name.replace('Corporation', 'Prelude'),
    }));

    renderTable({
      globalPlaysByName: new Map([
        ['Alpha Prelude', 5],
        ['Beta Prelude', 10],
      ]),
      kind: 'Prelude',
      rows: preludeRows,
    });

    expect(screen.getByRole('table', { name: /prelude statistics/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /prelude/i })).toHaveAttribute(
      'data-sticky-column',
      'name',
    );
    expect(screen.getByPlaceholderText('Search preludes')).toBeInTheDocument();
  });
});
