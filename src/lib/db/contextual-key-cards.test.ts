import { describe, expect, it } from 'vitest';
import {
  buildContextAdjustedImpactCards,
  type RawProfileCardRow,
} from './analytics-repo';

function cardRow(
  cardId: string,
  gameId: string,
  isWinner: boolean,
  context: Partial<RawProfileCardRow> = {},
): RawProfileCardRow {
  return {
    card_id: cardId,
    card_name: cardId,
    game_id: gameId,
    is_winner: isWinner,
    player_id: 'player-1',
    ...context,
  };
}

describe('buildContextAdjustedImpactCards', () => {
  it('lets repeated evidence outrank a one-game perfect result', () => {
    const rows = [
      cardRow('one-game', 'one-1', true),
      cardRow('repeated', 'repeat-1', true),
      cardRow('repeated', 'repeat-2', true),
      cardRow('repeated', 'repeat-3', true),
      cardRow('repeated', 'repeat-4', true),
      cardRow('repeated', 'repeat-5', false),
      cardRow('repeated', 'repeat-6', false),
    ];

    const cards = buildContextAdjustedImpactCards(
      rows,
      new Map([
        ['one-game', 0.5],
        ['repeated', 0.5],
      ]),
      0.5,
      0.5,
    );
    const oneGame = cards.find((card) => card.cardId === 'one-game')!;
    const repeated = cards.find((card) => card.cardId === 'repeated')!;

    expect(repeated.victoryImpact).toBeGreaterThan(oneGame.victoryImpact!);
    expect(oneGame.evidenceConfidence).toBe('Low');
    expect(repeated.evidenceConfidence).toBe('High');
  });

  it('credits a win more when it beats a difficult corporation context', () => {
    const rows = [
      cardRow('strong-context-card', 'strong-target', true, {
        corporation_name: 'Tharsis Republic',
      }),
      cardRow('hard-context-card', 'hard-target', true, {
        corporation_name: 'Ecoline',
        outcome_method: 'board_position',
        style_code: 'board_control',
      }),
      ...[1, 2, 3, 4].map((game) =>
        cardRow('strong-context-history', `strong-${game}`, true, {
          corporation_name: 'Tharsis Republic',
        }),
      ),
      ...[1, 2, 3, 4].map((game) =>
        cardRow('hard-context-history', `hard-${game}`, false, {
          corporation_name: 'Ecoline',
        }),
      ),
    ];
    const globalRates = new Map(rows.map((row) => [row.card_name, 0.5]));
    const cards = buildContextAdjustedImpactCards(rows, globalRates, 0.5, 0.5);
    const strongContext = cards.find(
      (card) => card.cardId === 'strong-context-card',
    )!;
    const hardContext = cards.find((card) => card.cardId === 'hard-context-card')!;

    expect(hardContext.victoryImpact).toBeGreaterThan(
      strongContext.victoryImpact!,
    );
    expect(hardContext.contextLabel).toBe(
      'Ecoline · Board Control · Board Position',
    );
  });
});
