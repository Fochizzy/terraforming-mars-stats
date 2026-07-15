import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type {
  CrossGroupFocusPerson,
  GroupAnalytics,
} from '@/lib/db/analytics-repo';
import type { ExtendedGroupAnalytics } from '@/lib/db/extended-analytics-repo';
import { PlayerComparisonSummary } from './player-comparison-summary';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const emptyScoreAverages = {
  averageAnimalPoints: 0,
  averageAwardPoints: 0,
  averageCardPoints: 0,
  averageCitiesPoints: 0,
  averageGreeneryPoints: 0,
  averageJovianPoints: 0,
  averageMicrobePoints: 0,
  averageMilestonePoints: 0,
  averageOtherCardPoints: 0,
  averageTrPoints: 0,
};

function buildFocusPerson(
  overrides: Partial<CrossGroupFocusPerson> &
    Pick<CrossGroupFocusPerson, 'canonicalId' | 'displayName'>,
): CrossGroupFocusPerson {
  return {
    activeGroupPlayerId: null,
    bundle: {
      coverage: null,
      headToHeadRows: [],
      performance: null,
      scoreAverages: null,
      trendRows: [],
    },
    inActiveGroup: false,
    playerIds: [overrides.canonicalId],
    ...overrides,
  };
}

function buildGroupAnalytics(
  overrides: Partial<GroupAnalytics> = {},
): GroupAnalytics {
  return {
    coverage: null,
    groupInteractionRows: [],
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
    ...overrides,
  };
}

function buildExtended(
  overrides: Partial<ExtendedGroupAnalytics> = {},
): ExtendedGroupAnalytics {
  return {
    awardFunderWinnerRows: [],
    awardOutcomeRows: [],
    cardOutcomeRows: [],
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

const focusPeopleBase: CrossGroupFocusPerson[] = [
  buildFocusPerson({ canonicalId: 'user:alice', displayName: 'Alice' }),
  buildFocusPerson({ canonicalId: 'user:bob', displayName: 'Bob' }),
];

const analyticsWithLeaderboard = buildGroupAnalytics({
  leaderboardRows: [
    {
      averageLossGap: 3,
      averagePlacement: 1.5,
      averageScore: 85,
      averageWinMargin: 7,
      differentialComponent: 0.06,
      gamesPlayed: 6,
      groupId: 'g1',
      placementComponent: 0.25,
      playerId: 'user:alice',
      playerName: 'Alice',
      weightedScore: 0.71,
      winRate: 0.667,
      winRateComponent: 0.33,
      wins: 4,
    },
    {
      averageLossGap: 5,
      averagePlacement: 2.5,
      averageScore: 78,
      averageWinMargin: 4,
      differentialComponent: -0.02,
      gamesPlayed: 6,
      groupId: 'g1',
      placementComponent: 0.18,
      playerId: 'user:bob',
      playerName: 'Bob',
      weightedScore: 0.46,
      winRate: 0.333,
      winRateComponent: 0.17,
      wins: 2,
    },
  ],
  headToHeadRows: [
    {
      averagePlacementEdge: 0.5,
      averageScoreDifferential: 4.5,
      gamesPlayed: 4,
      groupId: 'g1',
      leftPlayerId: 'user:alice',
      leftPlayerName: 'Alice',
      leftWins: 3,
      rightPlayerId: 'user:bob',
      rightPlayerName: 'Bob',
      rightWins: 1,
      ties: 0,
    },
  ],
  playerInteractionRows: [
    {
      averagePlacement: 1.5,
      averageScore: 86,
      gamesPlayed: 4,
      groupId: 'g1',
      interactionType: 'corporation_prelude_pair',
      label: 'Tharsis Republic | Allied Bank',
      playerId: 'user:alice',
      playerName: 'Alice',
      winRate: 0.75,
      wins: 3,
    },
    {
      averagePlacement: 2,
      averageScore: 79,
      gamesPlayed: 3,
      groupId: 'g1',
      interactionType: 'corporation_prelude_pair',
      label: 'Inventrix | Martian Survey',
      playerId: 'user:bob',
      playerName: 'Bob',
      winRate: 0.33,
      wins: 1,
    },
  ],
  playerScoreAverages: [
    {
      ...emptyScoreAverages,
      averageCardPoints: 20,
      averageTrPoints: 28,
      groupId: 'g1',
      playerId: 'user:alice',
      playerName: 'Alice',
    },
    {
      ...emptyScoreAverages,
      averageCardPoints: 14,
      averageTrPoints: 25,
      groupId: 'g1',
      playerId: 'user:bob',
      playerName: 'Bob',
    },
  ],
  playerStylePerformanceRows: [
    {
      averageGenerationCount: 10.5,
      averagePlacement: 1.5,
      averageScore: 88,
      gamesPlayed: 4,
      groupId: 'g1',
      playerId: 'user:alice',
      playerName: 'Alice',
      styleCode: 'engine_builder',
      winRate: 0.75,
      wins: 3,
    },
    {
      averageGenerationCount: 11,
      averagePlacement: 2.5,
      averageScore: 80,
      gamesPlayed: 4,
      groupId: 'g1',
      playerId: 'user:bob',
      playerName: 'Bob',
      styleCode: 'board_control',
      winRate: 0.25,
      wins: 1,
    },
  ],
});

const extendedWithTags = buildExtended({
  tagOutcomeRows: [
    // Alice: science tags — avg ~4.5/game
    {
      corporationId: null,
      corporationName: 'Tharsis Republic',
      gameId: 'g1',
      groupId: 'g1',
      isWinner: true,
      playedOn: '2026-06-01',
      playerId: 'user:alice',
      playerName: 'Alice',
      tagCode: 'science',
      tagCount: 5,
      totalPoints: 88,
    },
    {
      corporationId: null,
      corporationName: 'Tharsis Republic',
      gameId: 'g2',
      groupId: 'g1',
      isWinner: false,
      playedOn: '2026-06-08',
      playerId: 'user:alice',
      playerName: 'Alice',
      tagCode: 'science',
      tagCount: 4,
      totalPoints: 76,
    },
    // Bob: science tags — avg ~2/game (Alice leads on science)
    {
      corporationId: null,
      corporationName: 'Inventrix',
      gameId: 'g1',
      groupId: 'g1',
      isWinner: false,
      playedOn: '2026-06-01',
      playerId: 'user:bob',
      playerName: 'Bob',
      tagCode: 'science',
      tagCount: 2,
      totalPoints: 80,
    },
    {
      corporationId: null,
      corporationName: 'Inventrix',
      gameId: 'g2',
      groupId: 'g1',
      isWinner: true,
      playedOn: '2026-06-08',
      playerId: 'user:bob',
      playerName: 'Bob',
      tagCode: 'science',
      tagCount: 2,
      totalPoints: 85,
    },
    // Bob also has building tags (his unique tag lane)
    {
      corporationId: null,
      corporationName: 'Inventrix',
      gameId: 'g1',
      groupId: 'g1',
      isWinner: false,
      playedOn: '2026-06-01',
      playerId: 'user:bob',
      playerName: 'Bob',
      tagCode: 'building',
      tagCount: 6,
      totalPoints: 80,
    },
  ],
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PlayerComparisonSummary', () => {
  it('returns null when fewer than two canonical IDs are provided', () => {
    const { container } = render(
      <PlayerComparisonSummary
        analytics={buildGroupAnalytics()}
        extended={buildExtended()}
        focusPeople={focusPeopleBase}
        selectedCanonicalIds={['user:alice']}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders both selected player names in headers', () => {
    render(
      <PlayerComparisonSummary
        analytics={analyticsWithLeaderboard}
        extended={extendedWithTags}
        focusPeople={focusPeopleBase}
        selectedCanonicalIds={['user:alice', 'user:bob']}
      />,
    );

    const aliceCards = screen.getAllByRole('heading', { level: 3 }).filter((h) =>
      h.textContent?.includes('Alice'),
    );
    const bobCards = screen.getAllByRole('heading', { level: 3 }).filter((h) =>
      h.textContent?.includes('Bob'),
    );

    expect(aliceCards.length).toBeGreaterThan(0);
    expect(bobCards.length).toBeGreaterThan(0);
  });

  it('renders the three comparison section headings', () => {
    render(
      <PlayerComparisonSummary
        analytics={analyticsWithLeaderboard}
        extended={extendedWithTags}
        focusPeople={focusPeopleBase}
        selectedCanonicalIds={['user:alice', 'user:bob']}
      />,
    );

    expect(screen.getByRole('heading', { name: /tag profiles/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /preferred corporations and preludes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /additional compare points/i }),
    ).toBeInTheDocument();
  });

  it('renders real tag data from tagOutcomeRows for each player', () => {
    render(
      <PlayerComparisonSummary
        analytics={analyticsWithLeaderboard}
        extended={extendedWithTags}
        focusPeople={focusPeopleBase}
        selectedCanonicalIds={['user:alice', 'user:bob']}
      />,
    );

    // Alice's top tag is 'science', Bob's is 'building'
    expect(screen.getAllByText(/science/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/building/i).length).toBeGreaterThan(0);
  });

  it('renders leading-value comparison indicators when one player leads', () => {
    render(
      <PlayerComparisonSummary
        analytics={analyticsWithLeaderboard}
        extended={extendedWithTags}
        focusPeople={focusPeopleBase}
        selectedCanonicalIds={['user:alice', 'user:bob']}
      />,
    );

    // The ComparisonDelta renders a span with aria-label ending in "lead"
    // when one player's averagePerGame is strictly higher than the other's
    const leads = document.querySelectorAll('[aria-label$="lead"]');

    expect(leads.length).toBeGreaterThan(0);
  });

  it('separates corporation names from Prelude selections in pairing cards', () => {
    render(
      <PlayerComparisonSummary
        analytics={analyticsWithLeaderboard}
        extended={extendedWithTags}
        focusPeople={focusPeopleBase}
        selectedCanonicalIds={['user:alice', 'user:bob']}
      />,
    );

    // Corporation names should appear (may appear more than once due to tag
    // outcome rows that reference the same corporation name)
    expect(screen.getAllByText('Tharsis Republic').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inventrix').length).toBeGreaterThan(0);
    // Prelude names should render separately in the pairing card
    expect(screen.getByText('Allied Bank')).toBeInTheDocument();
    expect(screen.getByText('Martian Survey')).toBeInTheDocument();
  });

  it('renders supporting metrics pills (games, win rate, avg points) for pairings', () => {
    render(
      <PlayerComparisonSummary
        analytics={analyticsWithLeaderboard}
        extended={extendedWithTags}
        focusPeople={focusPeopleBase}
        selectedCanonicalIds={['user:alice', 'user:bob']}
      />,
    );

    const preferredSection = screen
      .getByRole('region', { name: /preferred corporations and preludes/i });

    // Should contain game counts
    expect(within(preferredSection).getAllByText(/game/i).length).toBeGreaterThan(0);
    // Should contain win rate values
    expect(within(preferredSection).getAllByText(/win rate/i).length).toBeGreaterThan(0);
    // Should contain avg points values
    expect(within(preferredSection).getAllByText(/avg\. points/i).length).toBeGreaterThan(0);
  });

  it('renders five Additional Compare Points rows with icons', () => {
    render(
      <PlayerComparisonSummary
        analytics={analyticsWithLeaderboard}
        extended={extendedWithTags}
        focusPeople={focusPeopleBase}
        selectedCanonicalIds={['user:alice', 'user:bob']}
      />,
    );

    const additionalSection = screen.getByRole('region', {
      name: /additional compare points/i,
    });
    const insightArticles = within(additionalSection).getAllByRole('article');

    expect(insightArticles.length).toBe(5);
    // Each row has a titled heading
    expect(within(additionalSection).getByRole('heading', { name: /pressure games/i })).toBeInTheDocument();
    expect(within(additionalSection).getByRole('heading', { name: /style mirror/i })).toBeInTheDocument();
    expect(within(additionalSection).getByRole('heading', { name: /point-source gap/i })).toBeInTheDocument();
    expect(within(additionalSection).getByRole('heading', { name: /tag identity/i })).toBeInTheDocument();
    expect(within(additionalSection).getByRole('heading', { name: /selection comfort/i })).toBeInTheDocument();
  });

  it('shows player header metrics (game count, win rate, avg points) as pills', () => {
    render(
      <PlayerComparisonSummary
        analytics={analyticsWithLeaderboard}
        extended={extendedWithTags}
        focusPeople={focusPeopleBase}
        selectedCanonicalIds={['user:alice', 'user:bob']}
      />,
    );

    // Alice: 6 games, 67% win rate
    expect(screen.getAllByText(/6 games/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/67% win rate/i).length).toBeGreaterThan(0);
  });

  it('marks the current user with a "You" badge', () => {
    render(
      <PlayerComparisonSummary
        analytics={analyticsWithLeaderboard}
        currentUserCanonicalId="user:alice"
        extended={extendedWithTags}
        focusPeople={focusPeopleBase}
        selectedCanonicalIds={['user:alice', 'user:bob']}
      />,
    );

    expect(screen.getAllByText(/^You$/i).length).toBeGreaterThan(0);
  });

  it('renders empty-data state for tag profiles when no tag rows exist', () => {
    render(
      <PlayerComparisonSummary
        analytics={analyticsWithLeaderboard}
        extended={buildExtended()}
        focusPeople={focusPeopleBase}
        selectedCanonicalIds={['user:alice', 'user:bob']}
      />,
    );

    expect(
      screen.getAllByText(/tag evidence will appear/i).length,
    ).toBeGreaterThan(0);
  });

  it('renders empty-data state for pairings when no interaction rows exist', () => {
    render(
      <PlayerComparisonSummary
        analytics={buildGroupAnalytics()}
        extended={buildExtended()}
        focusPeople={focusPeopleBase}
        selectedCanonicalIds={['user:alice', 'user:bob']}
      />,
    );

    expect(
      screen.getAllByText(/Corporation and Prelude preferences will appear/i).length,
    ).toBeGreaterThan(0);
  });

  it('uses accessible section labels', () => {
    render(
      <PlayerComparisonSummary
        analytics={analyticsWithLeaderboard}
        extended={extendedWithTags}
        focusPeople={focusPeopleBase}
        selectedCanonicalIds={['user:alice', 'user:bob']}
      />,
    );

    expect(
      screen.getByRole('region', { name: /tag profiles/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /preferred corporations and preludes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /additional compare points/i }),
    ).toBeInTheDocument();
  });

  it('uses sr-only labels on metric pill definition terms for accessibility', () => {
    render(
      <PlayerComparisonSummary
        analytics={analyticsWithLeaderboard}
        extended={extendedWithTags}
        focusPeople={focusPeopleBase}
        selectedCanonicalIds={['user:alice', 'user:bob']}
      />,
    );

    // sr-only dt labels are present
    const dtElements = document.querySelectorAll('dt.sr-only');

    expect(dtElements.length).toBeGreaterThan(0);
  });
});
