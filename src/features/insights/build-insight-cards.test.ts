import { describe, expect, it } from 'vitest';
import { buildInsightCards } from './build-insight-cards';

describe('buildInsightCards', () => {
  it('does not create insight cards from map and expansion mix interactions', () => {
    const cards = buildInsightCards({
      interactionRows: [
        {
          averagePlacement: 1.5,
          averageScore: 88.2,
          gamesPlayed: 4,
          groupId: 'group-1',
          interactionType: 'map_expansion_mix',
          label: 'Hellas | Prelude',
          winRate: 0.75,
        },
      ],
    } as never);

    expect(cards).toEqual([]);
  });

  it('builds focused player insights from finalized analytics', () => {
    const cards = buildInsightCards({
      coverage: {
        animalCoverage: 0.25,
        cardBreakdownCoverage: 0.5,
        declaredStyleCoverage: 0.75,
        finalizedGames: 4,
        finalizedPlayerResults: 4,
        groupId: 'group-1',
        jovianCoverage: 0.5,
        keyCardCoverage: 0.25,
        microbeCoverage: 0.75,
        playerId: 'p1',
        playerName: 'Friday Mars',
      },
      focusPlayerId: 'p1',
      focusPlayerName: 'Friday Mars',
      headToHeadRows: [
        {
          averagePlacementEdge: 0.75,
          averageScoreDifferential: 5.8,
          gamesPlayed: 4,
          groupId: 'group-1',
          leftPlayerId: 'p1',
          leftPlayerName: 'Friday Mars',
          leftWins: 3,
          rightPlayerId: 'p2',
          rightPlayerName: 'Second Seat',
          rightWins: 1,
          ties: 0,
        },
      ],
      leaderboardRows: [
        {
          averageLossGap: 2.5,
          averagePlacement: 1.25,
          averageScore: 84.5,
          averageWinMargin: 6.2,
          differentialComponent: 0.067,
          gamesPlayed: 4,
          groupId: 'group-1',
          placementComponent: 0.281,
          playerId: 'p1',
          playerName: 'Friday Mars',
          weightedScore: 0.723,
          winRate: 0.75,
          winRateComponent: 0.375,
          wins: 3,
        },
      ],
      lineupEffectRows: [
        {
          averageGenerationCount: 10.7,
          averagePlacement: 1.33,
          averageScore: 86.4,
          gamesPlayed: 3,
          groupId: 'group-1',
          lineupLabel: 'Second Seat, Third Seat',
          playerId: 'p1',
          playerName: 'Friday Mars',
          winRate: 0.667,
        },
      ],
      interactionRows: [
        {
          averagePlacement: 1.5,
          averageScore: 88.2,
          gamesPlayed: 4,
          groupId: 'group-1',
          interactionType: 'corporation_prelude_pair',
          label: 'Tharsis Republic | Allied Bank',
          winRate: 0.75,
        },
      ],
      stylePerformanceRows: [
        {
          averageGenerationCount: 10.2,
          averagePlacement: 1.33,
          averageScore: 88.1,
          gamesPlayed: 3,
          groupId: 'group-1',
          playerId: 'p1',
          playerName: 'Friday Mars',
          styleCode: 'jovian_payoff',
          winRate: 0.667,
          wins: 2,
        },
      ],
      trendRows: [
        {
          gameId: 'g1',
          generationCount: 12,
          groupId: 'group-1',
          inferredPrimaryStyleCode: 'balanced',
          isWinner: false,
          placement: 3,
          playedOn: '2026-06-01',
          playerId: 'p1',
          playerName: 'Friday Mars',
          totalPoints: 72,
        },
        {
          gameId: 'g2',
          generationCount: 11,
          groupId: 'group-1',
          inferredPrimaryStyleCode: 'board_control',
          isWinner: true,
          placement: 1,
          playedOn: '2026-06-12',
          playerId: 'p1',
          playerName: 'Friday Mars',
          totalPoints: 86,
        },
        {
          gameId: 'g3',
          generationCount: 10,
          groupId: 'group-1',
          inferredPrimaryStyleCode: 'jovian_payoff',
          isWinner: true,
          placement: 1,
          playedOn: '2026-06-20',
          playerId: 'p1',
          playerName: 'Friday Mars',
          totalPoints: 91,
        },
        {
          gameId: 'g4',
          generationCount: 10,
          groupId: 'group-1',
          inferredPrimaryStyleCode: 'jovian_payoff',
          isWinner: true,
          placement: 1,
          playedOn: '2026-06-28',
          playerId: 'p1',
          playerName: 'Friday Mars',
          totalPoints: 95,
        },
      ],
    } as never);

    expect(cards).toHaveLength(6);
    expect(cards[0].body).toMatch(/Friday Mars/);
    expect(cards[0].body).toMatch(/75%/);
    expect(cards[1].body).toMatch(/Second Seat/);
    expect(cards[2].body).toMatch(/Second Seat, Third Seat/);
    expect(cards[3].body).toMatch(/Tharsis Republic \| Allied Bank/);
    expect(cards[4].body).toMatch(/Jovian payoff/i);
    expect(cards[5].body).toMatch(/recent/i);
  });

  it('never emits a declared-style agreement card', () => {
    const cards = buildInsightCards({
      focusPlayerId: 'p1',
      focusPlayerName: 'Friday Mars',
      stylePerformanceRows: [
        {
          averageGenerationCount: 11,
          averagePlacement: 1.33,
          averageScore: 88.1,
          gamesPlayed: 3,
          groupId: 'group-1',
          playerId: 'p1',
          playerName: 'Friday Mars',
          styleCode: 'jovian_payoff',
          winRate: 0.667,
          wins: 2,
        },
      ],
    });

    expect(cards.map((card) => card.title)).not.toContain('Style Agreement');
    for (const card of cards) {
      expect(card.body).not.toMatch(/declared/i);
      expect(card.body).not.toMatch(/style agreement/i);
    }
  });
});
