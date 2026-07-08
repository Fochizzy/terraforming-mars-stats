import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ExtendedGroupAnalytics } from '@/lib/db/extended-analytics-repo';
import { InsightsDashboard } from './insights-dashboard';

function buildExtendedFixture(
  overrides: Partial<ExtendedGroupAnalytics> = {},
): ExtendedGroupAnalytics {
  return {
    awardFunderWinnerRows: [],
    awardOutcomeRows: [],
    gameLengthPerformanceRows: [],
    generationDistributionRows: [],
    generationPaceRows: [],
    groupMapPerformanceRows: [],
    milestoneEconomicsRows: [],
    placementDistributionRows: [],
    playerCountPerformanceRows: [],
    playerMapPerformanceRows: [],
    playerMilestoneClaimRows: [],
    tagOutcomeRows: [],
    tilePlacementRows: [],
    ...overrides,
  };
}

describe('InsightsDashboard', () => {
  it('does not surface promo catalog or map expansion interactions as stats', () => {
    render(
      <InsightsDashboard
        analytics={{
          coverage: null,
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
          groupStylePerformanceRows: [],
          headToHeadRows: [],
          importCoverageRows: [],
          leaderboardRows: [],
          lineupEffectRows: [],
          playerCoverages: [],
          playerInteractionRows: [],
          playerScoreAverages: [],
          playerStylePerformanceRows: [],
          playerTrendRows: [],
          scoreAverages: null,
          styleAgreementRows: [],
        } as never}
        extended={buildExtendedFixture()}
        players={[]}
      />,
    );

    expect(screen.queryByText(/promo catalog/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Interaction Insights/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Hellas \| Prelude/i)).not.toBeInTheDocument();
  });

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
              interactionType: 'corporation_prelude_pair',
              label: 'Tharsis Republic | Allied Bank',
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
        extended={buildExtendedFixture({
          generationDistributionRows: [
            { gamesPlayed: 2, generationCount: 10, groupId: 'group-1' },
            { gamesPlayed: 2, generationCount: 12, groupId: 'group-1' },
          ],
          milestoneEconomicsRows: [
            {
              averageClaimerPlacement: 1.3,
              claimRate: 0.75,
              claimerWinRate: 0.66,
              claimerWins: 2,
              claims: 3,
              groupId: 'group-1',
              milestoneId: 'm1',
              milestoneName: 'Terraformer',
            },
          ],
          placementDistributionRows: [
            {
              gamesPlayed: 3,
              groupId: 'group-1',
              placement: 1,
              playerId: 'p1',
              playerName: 'Friday Mars',
            },
            {
              gamesPlayed: 1,
              groupId: 'group-1',
              placement: 2,
              playerId: 'p1',
              playerName: 'Friday Mars',
            },
          ],
          playerCountPerformanceRows: [
            {
              averagePlacement: 1.5,
              averageScore: 82.3,
              gamesPlayed: 4,
              groupId: 'group-1',
              playerCount: 3,
              playerId: 'p1',
              playerName: 'Friday Mars',
              winRate: 0.5,
              wins: 2,
            },
          ],
        })}
        players={[
          { displayName: 'Friday Mars', id: 'p1' },
          { displayName: 'Second Seat', id: 'p2' },
        ]}
      />,
    );

    expect(screen.getByText(/Friday Mars currently leads the group/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Group Score Profile/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Placement Spread/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Score Source Radar/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /^Table Size Performance$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Game Length$/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Milestone Economics/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Game Pace Replay/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Board Heatmap/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Best Style Snapshot/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Trend Over Time/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Interaction Insights/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Tharsis Republic \| Allied Bank/i }),
    ).toBeInTheDocument();

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
