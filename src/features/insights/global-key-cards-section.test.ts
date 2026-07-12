import { describe, expect, it } from 'vitest';
import type { CardWinStat } from '@/lib/db/selection-stats-repo';
import { buildGlobalKeyCardData } from './global-key-cards-section';

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
});
