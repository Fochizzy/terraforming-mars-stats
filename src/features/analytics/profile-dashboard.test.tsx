import { render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { ProfileDashboard } from './profile-dashboard';

describe('ProfileDashboard', () => {
  it('renders personal finalized-game analytics when a linked player exists', () => {
    const props: ComponentProps<typeof ProfileDashboard> = {
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
      gameLengthProfile: {
        bestBucket: {
          averageGenerationCount: 8.5,
          averagePlacement: 1.2,
          averagePointsPerGeneration: 9.1,
          averageScore: 77.4,
          bucket: 'short',
          gamesPlayed: 2,
          label: 'Short Games',
          rangeLabel: '9 or fewer generations',
          winRate: 0.75,
          wins: 2,
        },
        rows: [
          {
            averageGenerationCount: 8.5,
            averagePlacement: 1.2,
            averagePointsPerGeneration: 9.1,
            averageScore: 77.4,
            bucket: 'short',
            gamesPlayed: 2,
            label: 'Short Games',
            rangeLabel: '9 or fewer generations',
            winRate: 0.75,
            wins: 2,
          },
          {
            averageGenerationCount: 10.5,
            averagePlacement: 2,
            averagePointsPerGeneration: 8,
            averageScore: 84,
            bucket: 'standard',
            gamesPlayed: 2,
            label: 'Standard Games',
            rangeLabel: '10-11 generations',
            winRate: 0.5,
            wins: 1,
          },
        ],
        weakestBucket: {
          averageGenerationCount: 10.5,
          averagePlacement: 2,
          averagePointsPerGeneration: 8,
          averageScore: 84,
          bucket: 'standard',
          gamesPlayed: 2,
          label: 'Standard Games',
          rangeLabel: '10-11 generations',
          winRate: 0.5,
          wins: 1,
        },
      },
      globalParameterTempoProfile: {
        bestMix: {
          averageFastGeneration: 1.5,
          averagePlacement: 1.2,
          averageScore: 78,
          code: 'fast_oxygen_ocean',
          gamesPlayed: 2,
          label: 'Fast Oxygen + Oceans',
          parameters: ['oxygen', 'ocean'],
          winRate: 0.75,
          wins: 2,
        },
        confidenceLabel:
          'Imported log terraforming read: fast means your first oxygen, heat, or ocean raise happened by that game midpoint; combinations are exact fast-parameter mixes.',
        importedGames: 4,
        rows: [
          {
            averageFastGeneration: 1.5,
            averagePlacement: 1.2,
            averageScore: 78,
            code: 'fast_oxygen_ocean',
            gamesPlayed: 2,
            label: 'Fast Oxygen + Oceans',
            parameters: ['oxygen', 'ocean'],
            winRate: 0.75,
            wins: 2,
          },
          {
            averageFastGeneration: 4,
            averagePlacement: 2.5,
            averageScore: 72,
            code: 'fast_heat',
            gamesPlayed: 2,
            label: 'Fast Heat',
            parameters: ['heat'],
            winRate: 0.25,
            wins: 1,
          },
        ],
        weakestMix: {
          averageFastGeneration: 4,
          averagePlacement: 2.5,
          averageScore: 72,
          code: 'fast_heat',
          gamesPlayed: 2,
          label: 'Fast Heat',
          parameters: ['heat'],
          winRate: 0.25,
          wins: 1,
        },
      },
      headToHeadRows: [
        {
          averagePlacementEdge: 0.75,
          averageScoreDifferential: 5.8,
          gamesPlayed: 4,
          losses: 1,
          opponentName: 'Second Seat',
          ties: 0,
          wins: 3,
        },
      ],
      performance: {
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
      leadPressure: {
        averageLeadWhenWinning: 6.2,
        averageScoreDifferential: 5.8,
        averageShortfallWhenBehind: 2.5,
        closeGameRate: 0.5,
        dominantWinRate: 0.25,
        gamesPlayed: 4,
        leadRate: 0.75,
        pressureLabel: 'Front-runner',
      },
      playerName: 'Friday Mars',
      phaseTempoProfile: {
        bestPhase: {
          actions: 8,
          actionsPerImportedGame: 2.67,
          awardsFunded: 1,
          averagePlacementWhenPeak: 1.25,
          averageScoreWhenPeak: 86,
          cardsPlayed: 4,
          citiesPlaced: 1,
          gamesWithPeak: 2,
          greeneriesPlaced: 1,
          label: 'Mid Game',
          milestonesClaimed: 1,
          phase: 'mid',
          removalEvents: 1,
          tilesPlaced: 2,
          winRateWhenPeak: 0.75,
          winsWhenPeak: 2,
        },
        confidenceLabel:
          'Imported log phase read: early, mid, and late are split by each game generation count and use logged actions as the tempo signal.',
        importedGames: 3,
        mostActivePhase: {
          actions: 8,
          actionsPerImportedGame: 2.67,
          awardsFunded: 1,
          averagePlacementWhenPeak: 1.25,
          averageScoreWhenPeak: 86,
          cardsPlayed: 4,
          citiesPlaced: 1,
          gamesWithPeak: 2,
          greeneriesPlaced: 1,
          label: 'Mid Game',
          milestonesClaimed: 1,
          phase: 'mid',
          removalEvents: 1,
          tilesPlaced: 2,
          winRateWhenPeak: 0.75,
          winsWhenPeak: 2,
        },
        rows: [
          {
            actions: 3,
            actionsPerImportedGame: 1,
            awardsFunded: 0,
            averagePlacementWhenPeak: 2,
            averageScoreWhenPeak: 76,
            cardsPlayed: 2,
            citiesPlaced: 0,
            gamesWithPeak: 1,
            greeneriesPlaced: 1,
            label: 'Early Game',
            milestonesClaimed: 0,
            phase: 'early',
            removalEvents: 0,
            tilesPlaced: 1,
            winRateWhenPeak: 0.5,
            winsWhenPeak: 1,
          },
          {
            actions: 8,
            actionsPerImportedGame: 2.67,
            awardsFunded: 1,
            averagePlacementWhenPeak: 1.25,
            averageScoreWhenPeak: 86,
            cardsPlayed: 4,
            citiesPlaced: 1,
            gamesWithPeak: 2,
            greeneriesPlaced: 1,
            label: 'Mid Game',
            milestonesClaimed: 1,
            phase: 'mid',
            removalEvents: 1,
            tilesPlaced: 2,
            winRateWhenPeak: 0.75,
            winsWhenPeak: 2,
          },
          {
            actions: 2,
            actionsPerImportedGame: 0.67,
            awardsFunded: 0,
            averagePlacementWhenPeak: null,
            averageScoreWhenPeak: null,
            cardsPlayed: 1,
            citiesPlaced: 0,
            gamesWithPeak: 0,
            greeneriesPlaced: 0,
            label: 'Late Game',
            milestonesClaimed: 0,
            phase: 'late',
            removalEvents: 1,
            tilesPlaced: 0,
            winRateWhenPeak: null,
            winsWhenPeak: 0,
          },
        ],
      },
      resourceRemovalProfile: {
        confidenceLabel:
          'Imported log estimate: removals are attributed to the prior played card with the same card name or id.',
        importedGames: 3,
        incoming: {
          amountPerImportedGame: 1,
          events: 1,
          totalAmount: 3,
        },
        outgoing: {
          amountPerImportedGame: 2,
          events: 2,
          totalAmount: 6,
        },
        resourceRows: [
          {
            amount: 9,
            events: 3,
            resourceType: 'plant',
          },
        ],
        totalRemovalEvents: 3,
      },
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
      scorePace: {
        averageGenerationCount: 10,
        averageTotalPointsPerGeneration: 8.45,
        lightestSource: {
          averagePoints: 4.1,
          averagePointsPerGeneration: 0.41,
          code: 'milestones',
          label: 'Milestones',
          scoreShare: 0.0485,
        },
        rows: [
          {
            averagePoints: 25.3,
            averagePointsPerGeneration: 2.53,
            code: 'terraform_rating',
            label: 'Terraform Rating',
            scoreShare: 0.2994,
          },
          {
            averagePoints: 20.2,
            averagePointsPerGeneration: 2.02,
            code: 'cards',
            label: 'Card Points',
            scoreShare: 0.2391,
          },
          {
            averagePoints: 11.6,
            averagePointsPerGeneration: 1.16,
            code: 'greenery',
            label: 'Greenery',
            scoreShare: 0.1373,
          },
          {
            averagePoints: 7.4,
            averagePointsPerGeneration: 0.74,
            code: 'cities',
            label: 'Cities',
            scoreShare: 0.0876,
          },
          {
            averagePoints: 4.1,
            averagePointsPerGeneration: 0.41,
            code: 'milestones',
            label: 'Milestones',
            scoreShare: 0.0485,
          },
        ],
        strongestSource: {
          averagePoints: 25.3,
          averagePointsPerGeneration: 2.53,
          code: 'terraform_rating',
          label: 'Terraform Rating',
          scoreShare: 0.2994,
        },
      },
      styleBreakdownRows: [
        {
          averagePlacement: 1.5,
          averageScore: 82,
          gamesPlayed: 3,
          playRate: 0.75,
          styleCode: 'board_control',
          styleName: 'Board Control',
          winRate: 0.667,
          wins: 2,
        },
        {
          averagePlacement: 2,
          averageScore: 88,
          gamesPlayed: 1,
          playRate: 0.25,
          styleCode: 'jovian_payoff',
          styleName: 'Jovian Payoff',
          winRate: 1,
          wins: 1,
        },
      ],
      styleInsights: [
        {
          body: 'Your most logged style is Board Control: 3 finishes out of 4 finalized style reads (75%), averaging place 1.5 and 82 points.',
          confidence: 'medium',
          evidenceLabel: '3 finalized style reads',
          sampleSize: 3,
          title: 'Style Identity',
        },
        {
          body: 'Imported game logs add texture to your Board Control games: Commercial District is your most repeated logged card there, appearing in 2 plays with a 50% win rate.',
          confidence: 'low',
          evidenceLabel: '2 logged card plays',
          sampleSize: 2,
          title: 'Game Log Signal',
        },
      ],
    };

    render(
      <ProfileDashboard {...props} />,
    );

    expect(screen.getByText(/my performance/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/profile group/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/view group stats/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/delta vs overall/i)).not.toBeInTheDocument();
    expect(screen.getByText(/4 finalized games overall/i)).toBeInTheDocument();
    expect(screen.getAllByText(/friday mars/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/second seat/i)).toBeInTheDocument();
    expect(screen.getByText(/play analysis/i)).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('list', {
          name: /what friday mars does well/i,
        }),
      ).getAllByRole('listitem'),
    ).toHaveLength(3);
    expect(
      within(
        screen.getByRole('list', {
          name: /how friday mars could improve/i,
        }),
      ).getAllByRole('listitem'),
    ).toHaveLength(4);
    expect(
      screen.getByText(/front-runner: they lead in 75%/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/terraform rating at 2.53 points per generation/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/best-fit game shapes are activity peaking in the mid game/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/fast oxygen \+ oceans games \(75% win rate\)/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/short games \(75% win rate\)/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/interaction pressure is proactive/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/roughest game shapes first/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/standard games \(50% win rate\)/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/fast heat games \(25% win rate\)/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/use the mid game peak as a review template/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/lightest pace source is milestones/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/build a buffer against resource and production attacks/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/play style profile/i)).toBeInTheDocument();
    expect(screen.getByText(/score pace by generation/i)).toBeInTheDocument();
    expect(screen.getByText(/explicit lead/i)).toBeInTheDocument();
    expect(screen.getAllByText(/front-runner/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/interaction pressure/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/you made opponents lose/i)).toBeInTheDocument();
    expect(screen.getByText(/early, mid, and late game/i)).toBeInTheDocument();
    expect(screen.getByText(/activity peaks in the mid game/i)).toBeInTheDocument();
    expect(screen.getByText(/terraforming tempo/i)).toBeInTheDocument();
    expect(screen.getByText(/you fare best in fast oxygen \+ oceans games/i)).toBeInTheDocument();
    expect(screen.getByText(/toughest fast-terraforming mix is fast heat games/i)).toBeInTheDocument();
    expect(screen.getByText(/generation length fit/i)).toBeInTheDocument();
    expect(screen.getByText(/you do best in short games/i)).toBeInTheDocument();
    expect(screen.getByText(/ways to enhance the model/i)).toBeInTheDocument();
    expect(screen.getByText(/score source averages/i)).toBeInTheDocument();
    expect(screen.getByText(/styles breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/most played/i)).toBeInTheDocument();
    expect(screen.getByText(/most wins/i)).toBeInTheDocument();
    expect(screen.getAllByText(/board control/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/jovian payoff/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/style insights/i)).toBeInTheDocument();
    expect(screen.getByText(/style identity/i)).toBeInTheDocument();
    expect(screen.getByText(/game log signal/i)).toBeInTheDocument();
    expect(screen.getByText(/commercial district/i)).toBeInTheDocument();
  });

  it('links out to the dedicated play comparison screen', () => {
    render(<ProfileDashboard playerName="Friday Mars" />);

    expect(
      within(
        screen.getByRole('list', {
          name: /what friday mars does well/i,
        }),
      ).getAllByRole('listitem'),
    ).toHaveLength(2);
    expect(
      within(
        screen.getByRole('list', {
          name: /how friday mars could improve/i,
        }),
      ).getAllByRole('listitem'),
    ).toHaveLength(3);
    expect(screen.getByText(/group comparisons/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /compare players/i }),
    ).toHaveAttribute('href', '/profile/compare');
    expect(
      screen.getByRole('link', { name: /open my play vs overall/i }),
    ).toHaveAttribute('href', '/profile/comparison');
  });


  it('renders an onboarding empty state when no linked player is available', () => {
    render(<ProfileDashboard linkHref="/group/players" playerName={null} />);

    expect(screen.getByText(/link a saved player profile/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /link saved player/i }),
    ).toHaveAttribute('href', '/group/players');
  });
});
