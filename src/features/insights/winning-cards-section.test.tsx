import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CardWinStat } from '@/lib/db/selection-stats-repo';
import {
  buildWinningCardData,
  WinningCardsSection,
} from './winning-cards-section';

function card(overrides: Partial<CardWinStat> & { card_name: string }): CardWinStat {
  return {
    plays: 0,
    win_rate_when_played: 0,
    ...overrides,
  };
}

describe('buildWinningCardData', () => {
  it('ranks cards by derived win count, then plays, then name', () => {
    const data = buildWinningCardData([
      card({ card_name: 'Earth Catapult', plays: 6, win_rate_when_played: 0.5 }), // 3 wins
      card({ card_name: 'Ganymede Colony', plays: 8, win_rate_when_played: 0.5 }), // 4 wins
      card({ card_name: 'Aquifer Pumping', plays: 4, win_rate_when_played: 0.75 }), // 3 wins
    ]);

    // Earth Catapult and Aquifer Pumping tie at 3 wins, so the higher play
    // count (Earth Catapult, 6) breaks the tie ahead of Aquifer Pumping (4).
    expect(data.map((row) => row.cardName)).toEqual([
      'Ganymede Colony',
      'Earth Catapult',
      'Aquifer Pumping',
    ]);
    expect(data[0]).toEqual({
      cardName: 'Ganymede Colony',
      plays: 8,
      winRate: 50,
      wins: 4,
    });
  });

  it('drops cards that were never in a win', () => {
    const data = buildWinningCardData([
      card({ card_name: 'Big Asteroid', plays: 5, win_rate_when_played: 0 }),
      card({ card_name: 'Search For Life', plays: 3, win_rate_when_played: 0.667 }), // 2 wins
    ]);

    expect(data.map((row) => row.cardName)).toEqual(['Search For Life']);
  });

  it('caps the list at the requested limit', () => {
    const cards = Array.from({ length: 20 }, (_, index) =>
      card({
        card_name: `Card ${String(index).padStart(2, '0')}`,
        plays: 20 - index,
        win_rate_when_played: 1,
      }),
    );

    expect(buildWinningCardData(cards, 5)).toHaveLength(5);
  });
});

describe('WinningCardsSection', () => {
  it('renders the winning-card table with wins over plays', () => {
    render(
      <WinningCardsSection
        cards={[
          card({ card_name: 'Ganymede Colony', plays: 8, win_rate_when_played: 0.5 }),
        ]}
      />,
    );

    expect(
      screen.getByRole('heading', { name: /most-played cards in wins/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ganymede Colony')).toBeInTheDocument();
    expect(screen.getByText('4/8')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows an empty message when no card has a recorded win', () => {
    render(
      <WinningCardsSection
        cards={[card({ card_name: 'Big Asteroid', plays: 5, win_rate_when_played: 0 })]}
      />,
    );

    expect(
      screen.getByText(/cards played in winning games will appear/i),
    ).toBeInTheDocument();
    expect(screen.queryByText('Big Asteroid')).not.toBeInTheDocument();
  });
});
