import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { InsightsDashboard } from './insights-dashboard';

describe('InsightsDashboard', () => {
  it('lets the user focus comparisons on a selected player', async () => {
    const user = userEvent.setup();

    render(
      <InsightsDashboard
        analytics={{
          coverage: {
            animalCoverage: 0.25,
            cardBreakdownCoverage: 0.5,
            declaredStyleCoverage: 0.75,
            finalizedGames: 4,
            finalizedPlayerResults: 16,
            groupId: 'group-1',
            jovianCoverage: 0.5,
            keyCardCoverage: 0.25,
            microbeCoverage: 0.75,
          },
          headToHeadRows: [
            {
              averagePlacementEdge: 0.5,
              averageScoreDifferential: 4.2,
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
            {
              averageLossGap: 5.1,
              averagePlacement: 2.25,
              averageScore: 78.1,
              averageWinMargin: 3.5,
              differentialComponent: -0.02,
              gamesPlayed: 4,
              groupId: 'group-1',
              placementComponent: 0.188,
              playerId: 'p2',
              playerName: 'Second Seat',
              weightedScore: 0.468,
              winRate: 0.25,
              winRateComponent: 0.125,
              wins: 1,
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
              mapId: 'tharsis',
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
              mapId: 'hellas',
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
            {
              averageGenerationCount: 11.5,
              averagePlacement: 2.33,
              averageScore: 76.4,
              gamesPlayed: 3,
              groupId: 'group-1',
              lineupLabel: 'Friday Mars, Third Seat',
              playerId: 'p2',
              playerName: 'Second Seat',
              winRate: 0.333,
            },
          ],
          groupInteractionRows: [
            {
              averagePlacement: 1.4,
              averageScore: 89.4,
              gamesPlayed: 5,
              groupId: 'group-1',
              interactionType: 'map_expansion_mix',
              label: 'Hellas | Prelude',
              winRate: 0.8,
            },
          ],
          playerInteractionRows: [
            {
              averagePlacement: 1.67,
              averageScore: 86.1,
              gamesPlayed: 3,
              groupId: 'group-1',
              interactionType: 'corporation_prelude_pair',
              label: 'Tharsis Republic | Allied Bank',
              playerId: 'p2',
              playerName: 'Second Seat',
              winRate: 0.667,
            },
          ],
          playerTrendRows: [
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
              playerId: 'p2',
              playerName: 'Second Seat',
              totalPoints: 84,
            },
            {
              gameId: 'g4',
              generationCount: 9,
              groupId: 'group-1',
              inferredPrimaryStyleCode: 'jovian_payoff',
              isWinner: true,
              placement: 1,
              playedOn: '2026-06-28',
              playerId: 'p2',
              playerName: 'Second Seat',
              totalPoints: 92,
            },
          ],
          playerCoverages: [
            {
              animalCoverage: 0.5,
              cardBreakdownCoverage: 0.75,
              declaredStyleCoverage: 1,
              finalizedGames: 4,
              finalizedPlayerResults: 4,
              groupId: 'group-1',
              jovianCoverage: 0.75,
              keyCardCoverage: 0.5,
              microbeCoverage: 1,
              playerId: 'p2',
              playerName: 'Second Seat',
            },
          ],
          playerScoreAverages: [
            {
              averageAnimalPoints: 1.1,
              averageAwardPoints: 2.5,
              averageCardPoints: 16.2,
              averageCitiesPoints: 6.4,
              averageGreeneryPoints: 10.2,
              averageJovianPoints: 1.3,
              averageMicrobePoints: 0.8,
              averageMilestonePoints: 2.1,
              averageOtherCardPoints: 12.1,
              averageTrPoints: 24.3,
              groupId: 'group-1',
              playerId: 'p2',
              playerName: 'Second Seat',
            },
          ],
          playerStylePerformanceRows: [
            {
              averageGenerationCount: 10.5,
              averagePlacement: 1.5,
              averageScore: 89.2,
              gamesPlayed: 2,
              groupId: 'group-1',
              playerId: 'p2',
              playerName: 'Second Seat',
              styleCode: 'jovian_payoff',
              winRate: 1,
              wins: 2,
            },
          ],
          groupStylePerformanceRows: [
            {
              averageGenerationCount: 10.5,
              averagePlacement: 1.4,
              averageScore: 88.4,
              gamesPlayed: 4,
              groupId: 'group-1',
              styleCode: 'jovian_payoff',
              winRate: 0.75,
              wins: 3,
            },
          ],
          scoreAverages: {
            averageAnimalPoints: 2.1,
            averageAwardPoints: 3.5,
            averageCardPoints: 20.2,
            averageCitiesPoints: 7.4,
            averageGreeneryPoints: 11.6,
            averageJovianPoints: 3.3,
            averageMicrobePoints: 1.8,
            averageMilestonePoints: 4.1,
            averageOtherCardPoints: 11.2,
            averageTrPoints: 25.3,
          },
          styleAgreementRows: [
            {
              averageInferredConfidence: 0.82,
              comparedGames: 4,
              exactMatchRate: 0.5,
              groupId: 'group-1',
              mismatchRate: 0.25,
              partialMatchRate: 0.25,
              playerId: 'p1',
              playerName: 'Friday Mars',
            },
            {
              averageInferredConfidence: 0.76,
              comparedGames: 4,
              exactMatchRate: 0.25,
              groupId: 'group-1',
              mismatchRate: 0.5,
              partialMatchRate: 0.25,
              playerId: 'p2',
              playerName: 'Second Seat',
            },
          ],
        } as never}
        players={[
          { displayName: 'Friday Mars', id: 'p1' },
          { displayName: 'Second Seat', id: 'p2' },
        ]}
        promoCards={[]}
        promoSets={[]}
      />,
    );

    expect(screen.getByText(/Friday Mars currently leads the group/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Group Score Profile/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Best Style Snapshot/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Trend Over Time/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Persisted Efficiency/i })).toBeInTheDocument();
    expect(screen.getAllByText(/8.45 pts\/gen/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /Global Map Meta/i })).toBeInTheDocument();
    expect(screen.getAllByText(/hellas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/persisted efficiency/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole('heading', { name: /Interaction Insights/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Hellas \| Prelude/i })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/player focus/i), 'p2');

    expect(screen.getByText(/Focused on Second Seat/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Score Profile for Second Seat/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Jovian Payoff/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Friday Mars, Third Seat/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /2026-06-28/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Tharsis Republic \| Allied Bank/i }),
    ).toBeInTheDocument();
  });
});
