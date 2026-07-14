import { render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { ProfileDashboard } from './profile-dashboard';

function getByTextContent(pattern: RegExp) {
  return screen.getByText((_content, element) => {
    if (!element || !pattern.test(element.textContent ?? '')) {
      return false;
    }

    return Array.from(element.children).every(
      (child) => !pattern.test(child.textContent ?? ''),
    );
  });
}

function getAllByTextContent(pattern: RegExp) {
  return screen.getAllByText((_content, element) => {
    if (!element || !pattern.test(element.textContent ?? '')) {
      return false;
    }

    return Array.from(element.children).every(
      (child) => !pattern.test(child.textContent ?? ''),
    );
  });
}

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
      expansionProfile: {
        improvements: [
          'Stabilize Milestones: it is the swingiest scoring source in the expanded model, so choose one dependable backup route before final scoring.',
          'Treat fast heat games as the prep branch: the current fast-terraforming sample says that mix is the weakest, so decide earlier whether to chase TR, cards, or board points.',
          'When the lead plan does not land, reserve a catch-up package worth about 2.5 points, which is the average non-winning chase gap.',
          'Add buffer turns against attacks; opponents have made Friday Mars lose 3 stored resources and 0 production, so avoid plans that fold to one removal hit.',
        ],
        sections: [
          {
            code: 'opening_profile',
            confidenceLabel:
              'Uses linked-player actions from generations 1-3 in imported logs.',
            metrics: [{ label: 'Gen 1-3 Cards', value: '5' }],
            summary:
              'Your opening profile leans toward card development before the engine fully matures.',
            title: 'Opening Profile',
          },
          {
            code: 'engine_shape',
            confidenceLabel:
              'Uses imported card-play events matched to catalog tags and printed VP.',
            metrics: [{ label: 'Top Card Tag', value: 'Space' }],
            summary:
              'Your engine shape is card-led with a Space tilt and reliable logged gains.',
            title: 'Engine Shape',
          },
          {
            code: 'scoring_reliability',
            confidenceLabel:
              'Uses final score-source rows and standard deviation across finalized games.',
            metrics: [{ label: 'Most Reliable', value: 'Terraform Rating' }],
            summary:
              'Terraform Rating is your safest scoring lane while Milestones swing the most.',
            title: 'Scoring Source Reliability',
          },
          {
            code: 'comeback_front_runner',
            confidenceLabel:
              'Uses final score differentials plus phase peaks as a comeback/front-runner proxy.',
            metrics: [{ label: 'Lead Rate', value: '75%' }],
            summary:
              'The profile currently reads as front-runner with a manageable chase gap.',
            title: 'Comeback / Front-Runner',
          },
          {
            code: 'opponent_adjusted',
            confidenceLabel:
              'Uses shared finalized-game rows, comparing your score to the average opponent in each game.',
            metrics: [{ label: 'Vs Opp Avg', value: '+5.8' }],
            summary:
              'Opponent-adjusted scoring is positive versus the average opponent in shared games.',
            title: 'Opponent-Adjusted Performance',
          },
          {
            code: 'board_control',
            confidenceLabel:
              'Uses imported tile spaces plus shared board adjacency.',
            metrics: [{ label: 'Board Pts / Tile', value: '4.8' }],
            summary:
              'Board control is supported by connected cities and greeneries touching oceans.',
            title: 'Board Control',
          },
          {
            code: 'interaction_personality',
            confidenceLabel:
              'Imported log removals use stored source and target players, with stored-resource and production losses split.',
            metrics: [{ label: 'Outgoing Stored', value: '2' }],
            summary:
              'Your interaction personality is proactive with more outgoing than incoming removal.',
            title: 'Interaction Personality',
          },
          {
            code: 'corporation_prelude_fit',
            confidenceLabel:
              'Current profile read uses style outcomes as a proxy; exact fit needs corporation and prelude setup selections on profile games.',
            metrics: [{ label: 'Winning Shell', value: 'Board Control' }],
            summary:
              'Exact corporation/prelude fit needs setup selections, so this read uses style outcomes.',
            title: 'Corporation / Prelude Fit',
          },
          {
            code: 'game_speed_matchup',
            confidenceLabel:
              'Combines generation-length buckets with fast oxygen, heat, ocean, and exact fast-parameter mixes.',
            metrics: [{ label: 'Best Fast Mix', value: 'Fast Oxygen + Oceans' }],
            summary:
              'You fare best in fast oxygen + oceans games and worst in fast heat games.',
            title: 'Game-Speed Matchup',
          },
          {
            code: 'improvement_coach',
            confidenceLabel:
              'Condenses the expansion model into the next few review prompts.',
            metrics: [{ label: 'Review 1', value: 'Stabilize Milestones' }],
            summary:
              'Highest ROI review target: stabilize the swingiest scoring lane.',
            title: 'Improvement Coach',
          },
        ],
        strengths: [
          'The expanded profile backs the front-runner read: the explicit lead shows up in 75% of finalized games with a 5.8 point average score edge, and Terraform Rating is the repeatable floor at 25.3 points with 1.4 standard deviation.',
          'The best expanded tempo lane is mid game peaks at 75% win rate, fast oxygen + oceans games at 75% win rate, short games at 75% win rate; that is the game shape where the model says the plan travels best.',
          'The opponent-adjusted profile is positive: Friday Mars scores 5.8 points above the average opponent in shared games and wins 75% of the stronger-table sample.',
        ],
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
          'Imported log removals use stored source and target players, with stored-resource and production losses split.',
        explicitAttributionEvents: 3,
        fallbackAttributionEvents: 0,
        importedGames: 3,
        incoming: {
          amountPerImportedGame: 1,
          events: 1,
          productionAmount: 0,
          productionEvents: 0,
          resourceAmount: 3,
          resourceEvents: 1,
          totalAmount: 3,
        },
        outgoing: {
          amountPerImportedGame: 2,
          events: 2,
          productionAmount: 0,
          productionEvents: 0,
          resourceAmount: 6,
          resourceEvents: 2,
          totalAmount: 6,
        },
        resourceRows: [
          {
            amount: 9,
            deltaKind: 'resource',
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
      getByTextContent(/expanded profile backs the front-runner read/i),
    ).toBeInTheDocument();
    expect(
      getByTextContent(/terraform rating is the repeatable floor/i),
    ).toBeInTheDocument();
    expect(
      getByTextContent(/best expanded tempo lane is mid game peaks/i),
    ).toBeInTheDocument();
    expect(
      getByTextContent(/fast oxygen \+ oceans games at 75% win rate/i),
    ).toBeInTheDocument();
    expect(
      getByTextContent(/short games at 75% win rate/i),
    ).toBeInTheDocument();
    expect(
      getByTextContent(/opponent-adjusted profile is positive/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/stabilize milestones/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/treat fast heat games as the prep branch/i)
        .length,
    ).toBeGreaterThan(0);
    expect(
      getByTextContent(/reserve a catch-up package worth about 2.5 points/i),
    ).toBeInTheDocument();
    expect(
      getByTextContent(/add buffer turns against attacks/i),
    ).toBeInTheDocument();
    expect(getByTextContent(/play style profile/i)).toBeInTheDocument();
    expect(screen.getByText(/score pace by generation/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /explicit lead/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/front-runner/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/interaction pressure/i).length).toBeGreaterThan(0);
    expect(getByTextContent(/you made opponents lose/i)).toBeInTheDocument();
    expect(getByTextContent(/early, mid, and late game/i)).toBeInTheDocument();
    expect(getByTextContent(/activity peaks in the mid game/i)).toBeInTheDocument();
    expect(screen.getByText(/terraforming tempo/i)).toBeInTheDocument();
    expect(
      getAllByTextContent(/you fare best in fast oxygen \+ oceans games/i)
        .length,
    ).toBeGreaterThan(0);
    expect(
      getAllByTextContent(
        /toughest fast-terraforming mix is fast heat games/i,
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/generation length fit/i)).toBeInTheDocument();
    expect(getByTextContent(/you do best in short games/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/ways to enhance the model/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/profile expansions/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /opening profile/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /engine shape/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /scoring source reliability/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /comeback \/ front-runner/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /opponent-adjusted performance/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /^board control$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /interaction personality/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /corporation \/ prelude fit/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /game-speed matchup/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /improvement coach/i }),
    ).toBeInTheDocument();
    expect(
      getByTextContent(/you fare best in fast oxygen \+ oceans games and worst in fast heat games/i),
    ).toBeInTheDocument();
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

  it('does not present zero removal totals as measured pressure when no parsed removal events exist', () => {
    render(
      <ProfileDashboard
        playerName="Friday Mars"
        resourceRemovalProfile={{
          confidenceLabel:
            'Imported log removals use stored source and target players, with stored-resource and production losses split.',
          explicitAttributionEvents: 0,
          fallbackAttributionEvents: 0,
          importedGames: 2,
          incoming: {
            amountPerImportedGame: 0,
            events: 0,
            productionAmount: 0,
            productionEvents: 0,
            resourceAmount: 0,
            resourceEvents: 0,
            totalAmount: 0,
          },
          outgoing: {
            amountPerImportedGame: 0,
            events: 0,
            productionAmount: 0,
            productionEvents: 0,
            resourceAmount: 0,
            resourceEvents: 0,
            totalAmount: 0,
          },
          resourceRows: [],
          totalRemovalEvents: 0,
        }}
      />,
    );

    expect(
      getByTextContent(/no parsed resource or production removal events/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/you made opponents lose/i)).not.toBeInTheDocument();
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
