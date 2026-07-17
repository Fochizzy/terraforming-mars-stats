import { describe, expect, it } from 'vitest';
import { extractMergerPlayEvidence } from './merger-play-evidence';

const players = [
  { gamePlayerId: 'gp-alex', playerId: 'player-alex', displayName: 'Alex Mars' },
  { gamePlayerId: 'gp-jordan', playerId: 'player-jordan', displayName: 'Jordan Vale' },
];

describe('extractMergerPlayEvidence', () => {
  it.each(['promo:P39', 'promo:merger'])(
    'accepts the documented Merger catalog identity %s',
    (cardSourceId) => {
      expect(
        extractMergerPlayEvidence({
          aliases: [],
          events: [
            {
              actorText: 'Alex Mars',
              cardSourceId,
              confidence: 'high',
              eventOrder: 4,
              rawLine: 'Alex Mars played Merger',
            },
          ],
          players,
        }),
      ).toEqual([
        expect.objectContaining({
          cardSourceId: cardSourceId.toLowerCase(),
          gamePlayerId: 'gp-alex',
          identityResolution: 'exact',
        }),
      ]);
    },
  );

  it('uses a confirmed alias only after exact player matching fails', () => {
    const evidence = extractMergerPlayEvidence({
      aliases: [{ normalizedAlias: 'a mars', playerId: 'player-alex' }],
      events: [
        {
          actorText: 'A. Mars',
          cardSourceId: 'promo:P39',
          confidence: 'high',
          eventOrder: 7,
          rawLine: 'A. Mars played Merger',
        },
      ],
      players,
    });

    expect(evidence[0]).toMatchObject({
      gamePlayerId: 'gp-alex',
      identityResolution: 'alias',
    });
  });

  it('retains ambiguous and unresolved actors for review instead of guessing', () => {
    const evidence = extractMergerPlayEvidence({
      aliases: [
        { normalizedAlias: 'mars', playerId: 'player-alex' },
        { normalizedAlias: 'mars', playerId: 'player-jordan' },
      ],
      events: [
        {
          actorText: 'Mars',
          cardSourceId: 'promo:P39',
          confidence: 'medium',
          eventOrder: 3,
          rawLine: 'Mars played Merger',
        },
        {
          actorText: null,
          cardSourceId: 'promo:merger',
          confidence: 'low',
          eventOrder: 4,
          rawLine: 'Merger played',
        },
      ],
      players,
    });

    expect(evidence.map((entry) => entry.identityResolution)).toEqual([
      'ambiguous',
      'unresolved',
    ]);
    expect(evidence.every((entry) => entry.gamePlayerId === null)).toBe(true);
  });
});
