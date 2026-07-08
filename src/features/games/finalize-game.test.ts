import { describe, expect, it } from 'vitest';
import {
  buildFinalizedGamePayload,
  buildGameReview,
} from './finalize-game';
import { rankPlayers } from './tie-utils';

describe('rankPlayers', () => {
  it('breaks ties with final megacredits and preserves true ties', () => {
    const ranked = rankPlayers([
      { playerId: 'a', totalPoints: 82, finalMegacredits: 14 },
      { playerId: 'b', totalPoints: 82, finalMegacredits: 10 },
      { playerId: 'c', totalPoints: 82, finalMegacredits: 10 },
    ]);

    expect(ranked[0]).toMatchObject({
      playerId: 'a',
      placement: 1,
      isWinner: true,
    });
    expect(ranked[1]).toMatchObject({
      playerId: 'b',
      placement: 2,
      isWinner: false,
    });
    expect(ranked[2]).toMatchObject({
      playerId: 'c',
      placement: 2,
      isWinner: false,
    });
  });

  it('keeps every player in a true first-place tie at placement one', () => {
    const ranked = rankPlayers([
      { playerId: 'a', totalPoints: 82, finalMegacredits: 10 },
      { playerId: 'b', totalPoints: 82, finalMegacredits: 10 },
      { playerId: 'c', totalPoints: 82, finalMegacredits: 10 },
    ]);

    expect(ranked).toEqual([
      expect.objectContaining({ playerId: 'a', placement: 1, isWinner: true }),
      expect.objectContaining({ playerId: 'b', placement: 1, isWinner: true }),
      expect.objectContaining({ playerId: 'c', placement: 1, isWinner: true }),
    ]);
  });
});

describe('buildGameReview', () => {
  it('flags mismatched scoring rows and missing draft requirements', () => {
    const review = buildGameReview({
      awardClaims: {
        award1: {
          firstPlaceWinnerPlayerIds: ['p1'],
          funded: true,
          fundedByPlayerId: '',
          secondPlaceWinnerPlayerIds: ['p2'],
        },
      },
      mapAwardIds: ['award1'],
      mapMilestoneIds: ['milestone1'],
      milestoneClaims: {
        milestone1: {
          claimed: true,
          winnerPlayerId: 'p1',
        },
      },
      playerCount: 3,
      playerScores: {
        p1: {
          awardPoints: 0,
          cardPointsAnimals: 2,
          cardPointsJovian: 1,
          cardPointsMicrobes: 3,
          cardPointsTotal: 5,
          citiesPoints: 4,
          finalMegacredits: 10,
          greeneryPoints: 6,
          milestonePoints: 0,
          totalPoints: 40,
          trPoints: 12,
        },
        p2: {
          awardPoints: 2,
          cardPointsTotal: 7,
          citiesPoints: 2,
          finalMegacredits: 8,
          greeneryPoints: 4,
          milestonePoints: 0,
          totalPoints: 33,
          trPoints: 10,
        },
      },
      selectedPlayerIds: ['p1', 'p2'],
    });

    expect(review.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'player_count_mismatch',
        'milestone_points_mismatch',
        'award_points_mismatch',
        'missing_award_funder',
        'invalid_card_breakdown',
      ]),
    );
    expect(review.coverage.playersWithCardBreakdown).toBe(1);
  });

  it('requires preludes for everyone once any player has preludes entered', () => {
    const review = buildGameReview({
      mapAwardIds: [],
      mapMilestoneIds: [],
      playerCount: 2,
      playerSelections: {
        p1: {
          corporationId: 'corp1',
          preludeIds: ['prelude1', 'prelude2'],
        },
        p2: {
          corporationId: 'corp2',
          preludeIds: [],
        },
      },
      selectedPlayerIds: ['p1', 'p2'],
    });

    expect(review.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_preludes',
          message: 'Choose at least one prelude for p2.',
        }),
      ]),
    );
    expect(
      review.issues.filter((issue) => issue.code === 'missing_preludes'),
    ).toHaveLength(1);
  });

  it('does not require preludes when no player has any entered', () => {
    const review = buildGameReview({
      mapAwardIds: [],
      mapMilestoneIds: [],
      playerCount: 1,
      playerSelections: {
        p1: {
          corporationId: 'corp1',
          preludeIds: [],
        },
      },
      selectedPlayerIds: ['p1'],
    });

    expect(review.issues.map((issue) => issue.code)).not.toContain(
      'missing_preludes',
    );
  });

  it('flags milestone and award references that no longer point at selected players', () => {
    const review = buildGameReview({
      awardClaims: {
        award1: {
          firstPlaceWinnerPlayerIds: ['removed-player'],
          funded: true,
          fundedByPlayerId: 'removed-player',
          secondPlaceWinnerPlayerIds: ['removed-player'],
        },
      },
      mapAwardIds: ['award1'],
      mapMilestoneIds: ['milestone1'],
      milestoneClaims: {
        milestone1: {
          claimed: true,
          winnerPlayerId: 'removed-player',
        },
      },
      playerCount: 1,
      playerScores: {
        kept: {
          awardPoints: 0,
          cardPointsTotal: 0,
          citiesPoints: 0,
          finalMegacredits: 0,
          greeneryPoints: 0,
          milestonePoints: 0,
          totalPoints: 0,
          trPoints: 0,
        },
      },
      playerSelections: {
        kept: {
          corporationId: 'corp-1',
          preludeIds: [],
        },
      },
      selectedPlayerIds: ['kept'],
    });

    expect(review.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'missing_milestone_winner',
        'missing_award_funder',
        'missing_award_first_place',
      ]),
    );
  });
});

describe('buildFinalizedGamePayload', () => {
  it('builds final rows, preserves ties, and derives style and card breakdown details', () => {
    const payload = buildFinalizedGamePayload({
      awardClaims: {
        award1: {
          firstPlaceWinnerPlayerIds: ['p1', 'p2'],
          funded: true,
          fundedByPlayerId: 'p2',
          secondPlaceWinnerPlayerIds: [],
        },
      },
      catalogSnapshotId: 'catalog-1',
      gameId: 'game-1',
      mapAwardIds: ['award1'],
      mapMilestoneIds: ['milestone1'],
      milestoneClaims: {
        milestone1: {
          claimed: true,
          winnerPlayerId: 'p1',
        },
      },
      playerSelections: {
        p1: {
          corporationId: 'corp1',
          preludeIds: ['prelude1'],
        },
        p2: {
          corporationId: 'corp2',
          preludeIds: ['prelude2'],
        },
      },
      playerScores: {
        p1: {
          awardPoints: 5,
          cardPointsAnimals: 3,
          cardPointsJovian: 7,
          cardPointsMicrobes: 4,
          cardPointsTotal: 24,
          citiesPoints: 6,
          finalMegacredits: 12,
          greeneryPoints: 8,
          milestonePoints: 5,
          totalPoints: 80,
          trPoints: 20,
        },
        p2: {
          awardPoints: 5,
          cardPointsTotal: 14,
          citiesPoints: 7,
          finalMegacredits: 12,
          greeneryPoints: 9,
          milestonePoints: 0,
          totalPoints: 80,
          trPoints: 18,
        },
      },
      playerStyles: {
        p1: {
          keyCardIds: ['card1'],
          modifierStyleCodes: ['card_combo'],
          primaryStyleCode: 'engine_builder',
        },
      },
      selectedPlayerIds: ['p1', 'p2'],
    });

    expect(payload.review.issues).toHaveLength(0);
    expect(payload.gameUpdate).toMatchObject({
      catalog_snapshot_id: 'catalog-1',
      status: 'finalized',
    });
    expect(payload.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: 'p1',
          placement: 1,
          isWinner: true,
          otherCardPoints: 10,
        }),
        expect.objectContaining({
          playerId: 'p2',
          placement: 1,
          isWinner: true,
        }),
      ]),
    );
    expect(payload.preludes).toEqual(
      expect.arrayContaining([
        { playerId: 'p1', preludeId: 'prelude1' },
        { playerId: 'p2', preludeId: 'prelude2' },
      ]),
    );
    expect(payload.milestones).toEqual([
      { milestoneId: 'milestone1', winnerPlayerId: 'p1' },
    ]);
    expect(payload.awards).toEqual(
      expect.arrayContaining([
        {
          awardId: 'award1',
          fundedByPlayerId: 'p2',
          place: 1,
          winnerPlayerId: 'p1',
        },
        {
          awardId: 'award1',
          fundedByPlayerId: 'p2',
          place: 1,
          winnerPlayerId: 'p2',
        },
      ]),
    );
    expect(payload.declaredStyles).toEqual(
      expect.arrayContaining([
        { playerId: 'p1', styleCode: 'engine_builder', isPrimary: true },
        { playerId: 'p1', styleCode: 'card_combo', isPrimary: false },
      ]),
    );
    expect(payload.inferredStyles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: 'p1',
          styleCode: 'jovian_payoff',
        }),
      ]),
    );
    expect(payload.keyCards).toEqual([{ cardId: 'card1', playerId: 'p1' }]);
  });
});
