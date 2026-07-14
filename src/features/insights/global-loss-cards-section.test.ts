import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { CardWinStat } from '@/lib/db/selection-stats-repo';
import {
  buildGlobalLossCardData,
  GlobalLossCardsSection,
} from './global-loss-cards-section';

function card(
  card_name: string,
  plays: number,
  win_rate_when_played: number,
): CardWinStat {
  return { card_name, plays, win_rate_when_played };
}

describe('buildGlobalLossCardData', () => {
  it('ranks by how far the win rate falls below the baseline', () => {
    const result = buildGlobalLossCardData(
      [
        card('Big Drag', 20, 0.3),
        card('Small Drag', 20, 0.45),
      ],
      0.5,
      { minPlays: 5 },
    );

    expect(result.map((c) => c.cardName)).toEqual(['Big Drag', 'Small Drag']);
    expect(result[0].victoryImpact).toBeCloseTo(-0.2, 5);
    expect(result[0].impactScore).toBeCloseTo(-0.1333, 3);
  });

  it('uses play-count confidence as well as raw win-rate drop', () => {
    const result = buildGlobalLossCardData(
      [
        card('Small Sample Crash', 5, 0.2),
        card('Repeated Drag', 30, 0.35),
      ],
      0.5,
      { minPlays: 5 },
    );

    expect(result.map((c) => c.cardName)).toEqual([
      'Repeated Drag',
      'Small Sample Crash',
    ]);
  });

  it('drops cards below the play floor so a single game cannot condemn a card', () => {
    const result = buildGlobalLossCardData(
      [
        card('One Bad Game', 1, 0),
        card('Proven Drag', 30, 0.38),
      ],
      0.5,
      { minPlays: 5 },
    );

    expect(result.map((c) => c.cardName)).toEqual(['Proven Drag']);
  });

  it('excludes cards that meet or beat the baseline', () => {
    const result = buildGlobalLossCardData(
      [
        card('Below Baseline', 40, 0.4),
        card('At Baseline', 40, 0.5),
        card('Above Baseline', 40, 0.6),
      ],
      0.5,
      { minPlays: 5 },
    );

    expect(result.map((c) => c.cardName)).toEqual(['Below Baseline']);
  });

  it('honors the limit', () => {
    const cards = Array.from({ length: 20 }, (_, i) =>
      card(`Card ${i}`, 10, 0.4 - i / 1000),
    );

    expect(buildGlobalLossCardData(cards, 0.5, { limit: 5 })).toHaveLength(5);
  });

  it('shows five negative cards first and expands the rest on request', async () => {
    const user = userEvent.setup();
    const cards = Array.from({ length: 7 }, (_, index) =>
      card(`Negative ${index + 1}`, 20, 0.2 + index / 100),
    );

    render(
      createElement(GlobalLossCardsSection, {
        baselineWinRate: 0.5,
        cardMetaByName: new Map(),
        cards,
      }),
    );

    expect(screen.getByText('Negative 5')).toBeInTheDocument();
    expect(screen.queryByText('Negative 6')).not.toBeInTheDocument();
    expect(screen.getAllByText(/composite impact score/i)).toHaveLength(5);

    await user.click(
      screen.getByRole('button', { name: /see more negative cards/i }),
    );

    expect(screen.getByText('Negative 6')).toBeInTheDocument();
    expect(screen.getByText('Negative 7')).toBeInTheDocument();
  });
});
