import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CorporationPreludePairingsPanel } from './corporation-prelude-pairings-panel';

const rows = [
  {
    averagePlacement: 1.5,
    averageScore: 92,
    gamesPlayed: 4,
    groupId: 'group-1',
    interactionType: 'corporation_prelude_pair' as const,
    label: 'Credicor | Allied Bank',
    winRate: 0.5,
    wins: 2,
  },
  {
    averagePlacement: 2,
    averageScore: 84,
    gamesPlayed: 2,
    groupId: 'group-1',
    interactionType: 'corporation_prelude_pair' as const,
    label: 'Credicor | Biosphere Support',
    winRate: 0,
    wins: 0,
  },
  {
    averagePlacement: 1,
    averageScore: 101,
    gamesPlayed: 3,
    groupId: 'group-1',
    interactionType: 'corporation_prelude_pair' as const,
    label: 'Tharsis Republic | Biosphere Support',
    winRate: 1,
    wins: 3,
  },
  {
    averagePlacement: 1.5,
    averageScore: 89,
    gamesPlayed: 5,
    groupId: 'group-1',
    interactionType: 'map_expansion_mix' as const,
    label: 'Hellas | Prelude',
    winRate: 0.6,
    wins: 3,
  },
];

const scoreAverages = {
  averageAnimalPoints: 1,
  averageAwardPoints: 3,
  averageCardPoints: 18,
  averageCitiesPoints: 8,
  averageGreeneryPoints: 12,
  averageJovianPoints: 2,
  averageMicrobePoints: 1,
  averageMilestonePoints: 4,
  averageOtherCardPoints: 6,
  averageTrPoints: 30,
};

describe('CorporationPreludePairingsPanel', () => {
  it('renders a compact ranking and applies a selected corporation and prelude', async () => {
    const user = userEvent.setup();

    render(
      <CorporationPreludePairingsPanel
        baselineWinRate={0.25}
        rows={rows}
        scoreAverages={scoreAverages}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Top pairings' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Avg VP' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0);

    await user.selectOptions(
      screen.getByLabelText('Corporation'),
      'Tharsis Republic',
    );
    await user.selectOptions(
      screen.getByLabelText('Prelude'),
      'Biosphere Support',
    );
    await user.click(screen.getByRole('button', { name: 'View results' }));

    expect(
      screen.getByRole('heading', {
        name: /Tharsis Republic.*Biosphere Support/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('+75 pts vs baseline')).toBeInTheDocument();
    expect(
      screen.queryByText('Established sample · 3 games'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Developing sample · 3 games')).toBeInTheDocument();
  });

  it('shows an empty state when no corporation and prelude rows exist', () => {
    render(
      <CorporationPreludePairingsPanel
        baselineWinRate={null}
        rows={rows.filter((row) => row.interactionType === 'map_expansion_mix')}
        scoreAverages={null}
      />,
    );

    expect(
      screen.getByText(
        /Pairing comparisons will appear after finalized games/i,
      ),
    ).toBeInTheDocument();
  });
});
