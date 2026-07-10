import { describe, expect, it } from 'vitest';
import { sanitizePlayerLinkedState } from './sanitize-player-linked-state';

describe('sanitizePlayerLinkedState', () => {
  it('removes score, style, milestone, and award references for deselected players', () => {
    expect(
      sanitizePlayerLinkedState({
        awardClaims: {
          landlord: {
            firstPlaceWinnerPlayerIds: ['kept-player', 'removed-player'],
            funded: true,
            fundedByPlayerId: 'removed-player',
            secondPlaceWinnerPlayerIds: ['removed-player'],
          },
        },
        expansionCodes: ['base'],
        gameId: 'game-1',
        generationCount: 10,
        groupId: '11111111-1111-4111-8111-111111111111',
        mapId: 'tharsis',
        milestoneClaims: {
          builder: {
            claimed: true,
            winnerPlayerId: 'removed-player',
          },
        },
        notes: '',
        playedOn: '2026-07-08',
        playerCount: 1,
        playerScores: {
          'kept-player': {
            totalPoints: 55,
          },
          'removed-player': {
            totalPoints: 44,
          },
        },
        playerSelections: {
          'kept-player': {
            corporationId: 'corp-1',
            corporationIds: ['corp-1'],
            preludeIds: [],
          },
          'removed-player': {
            corporationId: 'corp-2',
            corporationIds: ['corp-2'],
            preludeIds: [],
          },
        },
        playerStyles: {
          'kept-player': {
            keyCardIds: [],
            modifierStyleCodes: [],
            primaryStyleCode: 'engine_builder',
          },
          'removed-player': {
            keyCardIds: ['card-1'],
            modifierStyleCodes: [],
            primaryStyleCode: 'terraforming_rush',
          },
        },
        promoSetSlugs: [],
        selectedPlayerIds: ['kept-player'],
      }),
    ).toEqual({
      awardClaims: {
        landlord: {
          firstPlaceWinnerPlayerIds: ['kept-player'],
          funded: true,
          fundedByPlayerId: '',
          secondPlaceWinnerPlayerIds: [],
        },
      },
      expansionCodes: ['base'],
      gameId: 'game-1',
      generationCount: 10,
      groupId: '11111111-1111-4111-8111-111111111111',
      mapId: 'tharsis',
      milestoneClaims: {
        builder: {
          claimed: true,
          winnerPlayerId: '',
        },
      },
      notes: '',
      playedOn: '2026-07-08',
      playerCount: 1,
      playerScores: {
        'kept-player': {
          totalPoints: 55,
        },
      },
      playerSelections: {
        'kept-player': {
          corporationId: 'corp-1',
          corporationIds: ['corp-1'],
          preludeIds: [],
        },
      },
      playerStyles: {
        'kept-player': {
          keyCardIds: [],
          modifierStyleCodes: [],
          primaryStyleCode: 'engine_builder',
        },
      },
      promoSetSlugs: [],
      selectedPlayerIds: ['kept-player'],
    });
  });
});
