import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { StyleEffectivenessPanel } from './style-effectiveness-panel';

const personalScoreAverages = {
  averageAnimalPoints: 1.2,
  averageAwardPoints: 4.2,
  averageCardPoints: 24.5,
  averageCitiesPoints: 13.4,
  averageGreeneryPoints: 10.1,
  averageJovianPoints: 5.8,
  averageMicrobePoints: 0.8,
  averageMilestonePoints: 3.9,
  averageOtherCardPoints: 12.2,
  averageTrPoints: 28.7,
};

const globalScoreAverages = {
  ...personalScoreAverages,
  averageCardPoints: 27.8,
  averageCitiesPoints: 9.1,
  averageTrPoints: 25.4,
};

describe('StyleEffectivenessPanel', () => {
  it('renders personal style rows as scannable metrics and switches to global data', () => {
    const props: ComponentProps<typeof StyleEffectivenessPanel> = {
      personalScoreAverages,
      personalRows: [
        {
          averageGenerationCount: 10.2,
          averagePlacement: 1.9,
          averageScore: 89.5,
          gamesPlayed: 14,
          groupId: 'group-1',
          styleCode: 'balanced',
          winRate: 0.21,
          wins: 3,
        },
        {
          averageGenerationCount: 10.8,
          averagePlacement: 2.2,
          averageScore: 79.9,
          gamesPlayed: 13,
          groupId: 'group-1',
          styleCode: 'board_control',
          winRate: 0.15,
          wins: 2,
        },
      ],
      globalScoreAverages,
      globalRows: [
        {
          averageGenerationCount: 9.7,
          averagePlacement: 1.8,
          averageScore: 92.4,
          gamesPlayed: 30,
          groupId: 'group-1',
          styleCode: 'jovian_payoff',
          winRate: 0.27,
          wins: 8,
        },
      ],
    };

    render(<StyleEffectivenessPanel {...props} />);

    expect(
      screen.getByRole('heading', { name: /style effectiveness/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/primary style/i)).toBeInTheDocument();
    expect(screen.getByText(/terraform rating/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /balanced/i })).toBeInTheDocument();
    expect(screen.getByText('89.5')).toBeInTheDocument();
    expect(screen.getByText('21%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /global/i }));

    expect(
      screen.getByRole('heading', { name: /jovian payoff/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('92.4')).toBeInTheDocument();
    expect(screen.getByText('27%')).toBeInTheDocument();
  });
});
