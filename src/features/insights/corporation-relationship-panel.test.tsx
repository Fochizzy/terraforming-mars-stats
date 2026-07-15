import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CorporationTagDatum } from './tag-outcomes-section';
import { CorporationRelationshipPanel } from './corporation-relationship-panel';

const uniformUseRateData: CorporationTagDatum[] = [
  {
    averageTagCount: 4,
    corporationId: 'polaris',
    corporationName: 'Polaris',
    results: 4,
    tagUseRate: 100,
    winRate: 75,
    winsWithTag: 3,
    withTagResults: 4,
  },
  {
    averageTagCount: 2,
    corporationId: 'palladin-shipping',
    corporationName: 'Palladin Shipping',
    results: 1,
    tagUseRate: 100,
    winRate: 100,
    winsWithTag: 1,
    withTagResults: 1,
  },
];

const variedUseRateData: CorporationTagDatum[] = [
  {
    averageTagCount: 3,
    corporationId: 'agricola',
    corporationName: 'Agricola Inc',
    results: 5,
    tagUseRate: 40,
    winRate: 50,
    winsWithTag: 1,
    withTagResults: 2,
  },
  {
    averageTagCount: 5,
    corporationId: 'polaris',
    corporationName: 'Polaris',
    results: 4,
    tagUseRate: 100,
    winRate: 75,
    winsWithTag: 3,
    withTagResults: 4,
  },
];

function getTableRows() {
  const table = screen.getByRole('table');
  return within(table).getAllByRole('row').slice(1);
}

describe('CorporationRelationshipPanel', () => {
  it('uses tagged games for the chart and hides a repetitive use-rate column', () => {
    render(<CorporationRelationshipPanel data={uniformUseRateData} />);

    expect(
      screen.getByRole('heading', { name: 'Corporation performance' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Tagged games and win rate' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sort by Games' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sort by Tagged' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Sort by Avg tags' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sort by Record' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Sort by Use rate' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/use rate is identical for every corporation/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Limited · 1 tagged game')).toBeInTheDocument();
  });

  it('shows meaningful use-rate differences and supports column sorting', () => {
    render(<CorporationRelationshipPanel data={variedUseRateData} />);

    expect(
      screen.getByRole('button', { name: 'Sort by Use rate' }),
    ).toBeInTheDocument();

    let rows = getTableRows();
    expect(within(rows[0]).getByText('Polaris')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sort by Corporation' }));

    rows = getTableRows();
    expect(within(rows[0]).getByText('Agricola Inc')).toBeInTheDocument();
  });
});
