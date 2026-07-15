import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GlobalAwardMetricRow } from '@/lib/db/analytics-repo';
import { AwardMapSummary } from './award-map-summary';

const rows: GlobalAwardMetricRow[] = [
  {
    averageAwardRoi: 1.4,
    averageFundedGeneration: 7,
    awardId: 'banker',
    awardName: 'Banker',
    awardWinnerWinRate: 0.65,
    funderSuccessRate: 0.9,
    funderWins: 9,
    gamesPlayed: 10,
    mapId: 'hellas',
    mapName: 'Hellas',
    playerCount: 4,
    winnerFunderMismatchRate: 0.1,
    winnerWins: 7,
  },
  {
    averageAwardRoi: 0.9,
    averageFundedGeneration: 8,
    awardId: 'contractor',
    awardName: 'Contractor',
    awardWinnerWinRate: 0.55,
    funderSuccessRate: 0.7,
    funderWins: 7,
    gamesPlayed: 10,
    mapId: 'hellas',
    mapName: 'Hellas',
    playerCount: 4,
    winnerFunderMismatchRate: 0.2,
    winnerWins: 6,
  },
  {
    averageAwardRoi: 0.4,
    averageFundedGeneration: 9,
    awardId: 'celebrity',
    awardName: 'Celebrity',
    awardWinnerWinRate: 0.45,
    funderSuccessRate: 0.5,
    funderWins: 4,
    gamesPlayed: 8,
    mapId: 'elysium',
    mapName: 'Elysium',
    playerCount: 4,
    winnerFunderMismatchRate: 0.3,
    winnerWins: 4,
  },
];

describe('AwardMapSummary', () => {
  it('renders map summaries, a structured award table, and updates when the map changes', () => {
    render(<AwardMapSummary rows={rows} />);

    expect(
      screen.getByRole('heading', { name: 'Award performance on Hellas' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Hellas award performance' })).toBeInTheDocument();
    expect(screen.getByLabelText('Selected map')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Award' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Funded' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Funder wins' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'ROI' })).toBeInTheDocument();

    const awardsTracked = screen.getByText('Awards tracked').closest('article');
    const averageRoi = screen.getByText('Average ROI').closest('article');
    const mostProfitable = screen.getByText('Most profitable').closest('article');

    expect(awardsTracked).not.toBeNull();
    expect(averageRoi).not.toBeNull();
    expect(mostProfitable).not.toBeNull();
    expect(within(awardsTracked!).getByText('2')).toBeInTheDocument();
    expect(within(averageRoi!).getByText('80%')).toBeInTheDocument();
    expect(within(mostProfitable!).getByText('Banker')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Award map'), {
      target: { value: 'elysium' },
    });

    expect(
      screen.getByRole('heading', { name: 'Award performance on Elysium' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Elysium award performance' })).toBeInTheDocument();
    expect(screen.getByText('Celebrity')).toBeInTheDocument();
    expect(screen.queryByText('Banker')).not.toBeInTheDocument();
  });
});
