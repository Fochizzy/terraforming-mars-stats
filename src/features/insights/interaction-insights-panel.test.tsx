import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InteractionInsightsPanel } from './interaction-insights-panel';

const rows = [
  {
    averagePlacement: 1,
    averageScore: 72,
    gamesPlayed: 1,
    groupId: 'group-1',
    interactionType: 'corporation_prelude_pair' as const,
    label: 'Factorum | Dome Farming + Merger',
    winRate: 1,
    wins: 1,
  },
  {
    averagePlacement: 1.8,
    averageScore: 91,
    gamesPlayed: 5,
    groupId: 'group-1',
    interactionType: 'corporation_prelude_pair' as const,
    label: 'Spire | Business Empire + Industrial Complex',
    winRate: 0.6,
    wins: 3,
  },
  {
    averagePlacement: 1.5,
    averageScore: 103,
    gamesPlayed: 3,
    groupId: 'group-1',
    interactionType: 'corporation_prelude_pair' as const,
    label: 'Spire | Mohole Excavation + Suitable Infrastructure',
    winRate: 0.67,
    wins: 2,
  },
];

describe('InteractionInsightsPanel', () => {
  it('groups repeated corporations and prioritizes larger samples', () => {
    render(<InteractionInsightsPanel rows={rows} />);

    expect(
      screen.getByRole('heading', { name: /interaction insights/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('2 pairings')).toBeInTheDocument();

    const rankedRows = screen
      .getAllByText(/^#\d+$/)
      .map((element) => element.closest('[data-interaction-rank]'));

    expect(rankedRows[0]).toHaveAttribute('data-interaction-rank', '1');
    expect(within(rankedRows[0] as HTMLElement).getByText('5 games')).toBeInTheDocument();
    expect(screen.getByText('Low sample')).toBeInTheDocument();
  });

  it('supports average VP sorting and shows compact performance metrics', () => {
    render(<InteractionInsightsPanel rows={rows} />);

    fireEvent.click(screen.getByRole('button', { name: /highest average vp/i }));

    expect(screen.getByRole('button', { name: /highest average vp/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const firstRankedRow = screen
      .getByText('#1')
      .closest('[data-interaction-rank]') as HTMLElement;

    expect(within(firstRankedRow).getByText('103 avg VP')).toBeInTheDocument();
    expect(within(firstRankedRow).getByText('67% win rate')).toBeInTheDocument();
    expect(within(firstRankedRow).getByText('1.5 avg finish')).toBeInTheDocument();
  });
});
