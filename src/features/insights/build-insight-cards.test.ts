import { describe, expect, it } from 'vitest';
import { buildInsightCards } from './build-insight-cards';

describe('buildInsightCards', () => {
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
      playerEfficiencySummaries: [
        {
          averageAwardRoi: 1.2,
          averageExpectedScore: 82.1,
          averageLossGap: 2.5,
          averageNormalizedEfficiency: 1.08,
          averagePlacement: 1.25,
          averagePointsPerGeneration: 8.45,
          averageScore: 84.5,
          averageScoreDeltaVsExpected: 2.4,
          averageWinMargin: 6.2,
          awardScoreShare: 0.05,
          bestScoreSource: 'Card Points',
          bestTagLane: 'science',
          cardScoreShare: 0.3,
          citiesScoreShare: 0.08,
          closeGameCount: 2,
          closeGameWins: 1,
          closeGameWinRate: 0.5,
          gamesPlayed: 4,
          greeneryScoreShare: 0.12,
          groupId: 'group-1',
          milestoneScoreShare: 0.04,
          playerId: 'p1',
          tagEvidenceCoverage: 0.75,
          trScoreShare: 0.35,
          winRate: 0.75,
          wins: 3,
        },
      ],
      playerMapMetricRows: [
        {
          averageGenerations: 10,
          averageNormalizedEfficiency: 1.12,
          averagePoints: 84.5,
          averagePointsPerGeneration: 8.45,
          averageScoreDeltaVsExpected: 3.2,
          bestScoreSourceOnMap: 'Card Points',
          bestTagLaneOnMap: 'science',
          gamesPlayed: 4,
          groupId: 'group-1',
          mapId: '11111111-1111-4111-8111-111111111111',
          mapName: 'Tharsis',
          mapRankForPlayer: 1,
          playerId: 'p1',
          winRate: 0.75,
          wins: 3,
        },
      ],
      globalMapMetricRows: [
        {
          averageGenerations: 10.4,
          averageNormalizedEfficiency: 1.02,
          averagePoints: 82.6,
          averagePointsPerGeneration: 7.94,
          bestTagLane: 'building',
          expectedScoreBaseline: 81.5,
          gamesPlayed: 12,
          highestEfficiencyStyleCode: 'engine_builder',
          highestWinRateCorporationId: 'credicor',
          mapId: '22222222-2222-4222-8222-222222222222',
          mapName: 'Hellas',
          playerCount: 7,
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
          interactionType: 'map_expansion_mix',
          label: 'Hellas | Prelude',
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
      styleAgreementRows: [
        {
          averageInferredConfidence: 0.8,
          comparedGames: 4,
          exactMatchRate: 0.5,
          groupId: 'group-1',
          mismatchRate: 0.25,
          partialMatchRate: 0.25,
          playerId: 'p1',
          playerName: 'Friday Mars',
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

    expect(cards).toHaveLength(7);
    expect(cards[0].body).toMatch(/Friday Mars/);
    expect(cards[0].body).toMatch(/75%/);
    expect(cards[1].body).toMatch(/Second Seat/);
    expect(cards[2].body).toMatch(/Second Seat, Third Seat/);
    expect(cards[3].body).toMatch(/Hellas \| Prelude/);
    expect(cards[4].body).toMatch(/50%/);
    expect(cards[5].body).toMatch(/Jovian payoff/i);
    expect(cards[6].body).toMatch(/persisted efficiency/i);
    expect(cards[6].body).toMatch(/8.45 pts\/gen/i);
  });

  it('builds a persisted metric card from global map metrics when player rows are absent', () => {
    const cards = buildInsightCards({
      globalMapMetricRows: [
        {
          averageGenerations: 10.4,
          averageNormalizedEfficiency: 1.02,
          averagePoints: 82.6,
          averagePointsPerGeneration: 7.1,
          bestTagLane: 'building',
          expectedScoreBaseline: 81.5,
          gamesPlayed: 12,
          highestEfficiencyStyleCode: 'engine_builder',
          highestWinRateCorporationId: 'credicor',
          mapId: '22222222-2222-4222-8222-222222222222',
          mapName: 'Hellas',
          playerCount: 7,
        },
        {
          averageGenerations: 10.1,
          averageNormalizedEfficiency: 1.08,
          averagePoints: 84.6,
          averagePointsPerGeneration: 8.38,
          bestTagLane: 'science',
          expectedScoreBaseline: 80.2,
          gamesPlayed: 5,
          highestEfficiencyStyleCode: 'science_engine',
          highestWinRateCorporationId: 'teractor',
          mapId: '33333333-3333-4333-8333-333333333333',
          mapName: 'Elysium',
          playerCount: 4,
        },
      ],
    } as never);

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      title: 'Global Map Baseline',
      tone: 'performance',
      sampleSize: 5,
    });
    expect(cards[0].body).toMatch(/elysium/i);
    expect(cards[0].body).toMatch(/8.38 pts\/gen/i);
    expect(cards[0].body).toMatch(/baseline 80.2/i);
  });
});
