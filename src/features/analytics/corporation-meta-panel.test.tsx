import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CorporationMetaPanel } from './corporation-meta-panel';

const sharedRow = {
  averageNormalizedEfficiency: 1,
  averagePointsPerGeneration: 9,
  mapId: null,
  mapName: null,
  playerCount: 0,
  winRate: 0.5,
  wins: 1,
};

describe('CorporationMetaPanel', () => {
  it('ranks corporations by sample-size-adjusted VP instead of raw average VP', () => {
    render(
      <CorporationMetaPanel
        rows={[
          {
            ...sharedRow,
            averagePoints: 120,
            corporationId: 'one_game_spike',
            corporationName: 'One Game Spike',
            gamesPlayed: 1,
          },
          {
            ...sharedRow,
            averagePoints: 105,
            corporationId: 'steady_performer',
            corporationName: 'Steady Performer',
            gamesPlayed: 10,
            winRate: 0.6,
            wins: 6,
          },
          {
            ...sharedRow,
            averagePoints: 90,
            corporationId: 'baseline_corp',
            corporationName: 'Baseline Corp',
            gamesPlayed: 10,
            winRate: 0.4,
            wins: 4,
          },
        ]}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Best corporations' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ranked by weighted VP/i)).toBeInTheDocument();

    const rankingRows = screen.getAllByTestId('weighted-corporation-row');
    expect(within(rankingRows[0]).getByText('Steady Performer')).toBeInTheDocument();
    expect(within(rankingRows[1]).getByText('One Game Spike')).toBeInTheDocument();

    const weightedHeader = screen.getByRole('columnheader', {
      name: /Weighted VP/i,
    });
    expect(weightedHeader).toHaveAttribute('aria-sort', 'descending');
  });
});
