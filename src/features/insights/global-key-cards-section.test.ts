import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { CardWinStat } from '@/lib/db/selection-stats-repo';
import {
  buildGlobalKeyCardData,
  GlobalKeyCardsSection,
} from './global-key-cards-section';

function card(
  card_name: string,
  plays: number,
  win_rate_when_played: number,
): CardWinStat {
  return { card_name, plays, win_rate_when_played };
}

describe('buildGlobalKeyCardData', () => {
  it('ranks by victory impact over the baseline win rate', () => {
    const result = buildGlobalKeyCardData(
      [
        card('Big Impact', 20, 0.7),
        card('Small Impact', 20, 0.55),
      ],
      0.5,
      { minPlays: 5 },
    );

    expect(result.map((c) => c.cardName)).toEqual(['Big Impact', 'Small Impact']);
    expect(result[0].victoryImpact).toBeCloseTo(0.2, 5);
    expect(result[0].impactScore).toBeCloseTo(0.1333, 3);
  });

  it('uses play-count confidence as well as raw win-rate lift', () => {
    const result = buildGlobalKeyCardData(
      [
        card('Small Sample Spike', 5, 0.8),
        card('Repeated Lift', 30, 0.65),
      ],
      0.5,
      { minPlays: 5 },
    );

    expect(result.map((c) => c.cardName)).toEqual([
      'Repeated Lift',
      'Small Sample Spike',
    ]);
  });

  it('drops cards below the play floor so a lucky game cannot top the list', () => {
    const result = buildGlobalKeyCardData(
      [
        card('One Lucky Game', 1, 1),
        card('Proven Card', 30, 0.62),
      ],
      0.5,
      { minPlays: 5 },
    );

    expect(result.map((c) => c.cardName)).toEqual(['Proven Card']);
  });

  it('excludes cards that do not beat the baseline', () => {
    const result = buildGlobalKeyCardData(
      [
        card('Below Baseline', 40, 0.4),
        card('Above Baseline', 40, 0.6),
      ],
      0.5,
      { minPlays: 5 },
    );

    expect(result.map((c) => c.cardName)).toEqual(['Above Baseline']);
  });

  it('honors the limit', () => {
    const cards = Array.from({ length: 20 }, (_, i) =>
      card(`Card ${i}`, 10, 0.6 + i / 1000),
    );

    expect(buildGlobalKeyCardData(cards, 0.5, { limit: 5 })).toHaveLength(5);
  });

  it('shows ten positive cards first and expands the rest on request', async () => {
    const user = userEvent.setup();
    const cards = Array.from({ length: 12 }, (_, index) =>
      card(`Positive ${index + 1}`, 20, 0.8 - index / 100),
    );

    render(
      createElement(GlobalKeyCardsSection, {
        baselineWinRate: 0.5,
        cards,
      }),
    );

    expect(screen.getByText('Positive 10')).toBeInTheDocument();
    expect(screen.queryByText('Positive 11')).not.toBeInTheDocument();
    expect(screen.getAllByText(/composite impact score/i)).toHaveLength(10);

    await user.click(
      screen.getByRole('button', { name: /see more positive cards/i }),
    );

    expect(screen.getByText('Positive 11')).toBeInTheDocument();
    expect(screen.getByText('Positive 12')).toBeInTheDocument();
  });
});
