import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type {
  CrossGroupFocusBundle,
  CrossGroupFocusPerson,
  GroupAnalytics,
  LeaderboardRow,
  ScoreSourceAverages,
} from '@/lib/db/analytics-repo';
import type { ExtendedGroupAnalytics } from '@/lib/db/extended-analytics-repo';
import { PlayerComparisonSummary } from './player-comparison-summary';

// ---------------------------------------------------------------------------
// Fixtures
//
// The comparison always renders in cross-group ("Overall") scope. There the
// GroupAnalytics object deliberately ships empty leaderboard / score-average /
// head-to-head arrays (see getOverallGroupAnalytics), and every per-player
// figure lives on the matching CrossGroupFocusPerson bundle instead. Canonical
// person IDs (`user:…` / `player:…`) are also distinct from the group-local
// player row IDs these people own, so nothing may key off the latter.
// ---------------------------------------------------------------------------

const ALICE_CANONICAL = 'user:alice-account';
const BOB_CANONICAL = 'player:bob-roster-row';

const emptyScoreAverages: ScoreSourceAverages = {
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

function buildPerformance(
  overrides: Partial<LeaderboardRow> & Pick<LeaderboardRow, 'playerName'>,
): LeaderboardRow {
  return {
    averageLossGap: 3,
    averagePlacement: 1.5,
    averageScore: 85,
    averageWinMargin: 7,
    differentialComponent: 0.06,
    gamesPlayed: 6,
    groupId: 'linked-profile',
    placementComponent: 0.25,
    playerId: 'linked-profile',
    weightedScore: 0.71,
    winRate: 0.667,
    winRateComponent: 0.33,
    wins: 4,
    ...overrides,
  };
}

function buildBundle(
  overrides: Partial<CrossGroupFocusBundle> = {},
): CrossGroupFocusBundle {
  return {
    coverage: null,
    headToHeadRows: [],
    performance: null,
    scoreAverages: null,
    trendRows: [],
    ...overrides,
  };
}

function buildFocusPerson(
  overrides: Partial<CrossGroupFocusPerson> &
    Pick<CrossGroupFocusPerson, 'canonicalId' | 'displayName'>,
): CrossGroupFocusPerson {
  return {
    activeGroupPlayerId: null,
    bundle: buildBundle(),
    inActiveGroup: false,
    playerIds: [],
    ...overrides,
  };
}

/**
 * The exact shape the Overall scope hands the comparison: leaderboard, score
 * averages, coverage, head-to-head and trend rows are empty **by design**.
 * Only the canonicalised style and interaction rows carry data.
 */
function buildOverallAnalytics(
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

const alice = buildFocusPerson({
  activeGroupPlayerId: 'alice-group-1',
  canonicalId: ALICE_CANONICAL,
  displayName: 'Alice',
  inActiveGroup: true,
  // Same person, one roster row per group — none of these equal the canonical ID.
  playerIds: ['alice-group-1', 'alice-group-2'],
  bundle: buildBundle({
    headToHeadRows: [
      {
        averageScoreDifferential: 4.5,
        gamesPlayed: 4,
        label: 'Alice vs Bob',
        losses: 1,
        opponentId: BOB_CANONICAL,
        ties: 0,
        wins: 3,
      },
    ],
    performance: buildPerformance({
      averageScore: 85,
      gamesPlayed: 6,
      playerName: 'Alice',
      winRate: 0.667,
      wins: 4,
    }),
    scoreAverages: {
      ...emptyScoreAverages,
      averageCardPoints: 20,
      averageTrPoints: 28,
    },
  }),
});

const bob = buildFocusPerson({
  activeGroupPlayerId: 'bob-group-1',
  canonicalId: BOB_CANONICAL,
  displayName: 'Bob',
  inActiveGroup: true,
  playerIds: ['bob-group-1'],
  bundle: buildBundle({
    headToHeadRows: [
      {
        averageScoreDifferential: -4.5,
        gamesPlayed: 4,
        label: 'Bob vs Alice',
        losses: 3,
        opponentId: ALICE_CANONICAL,
        ties: 0,
        wins: 1,
      },
    ],
    performance: buildPerformance({
      averageScore: 78,
      gamesPlayed: 4,
      playerName: 'Bob',
      winRate: 0.25,
      wins: 1,
    }),
    scoreAverages: {
      ...emptyScoreAverages,
      averageCardPoints: 14,
      averageTrPoints: 25,
    },
  }),
});

const focusPeople: CrossGroupFocusPerson[] = [alice, bob];
const selectedCanonicalIds = [ALICE_CANONICAL, BOB_CANONICAL];

const overallAnalytics = buildOverallAnalytics({
  // Canonicalised by mergePlayerInteractions/mergePlayerStylePerformance, so
  // these are keyed by canonical person ID, never by the group-local player row.
  playerInteractionRows: [
    {
      averagePlacement: 1.5,
      averageScore: 86,
      gamesPlayed: 4,
      groupId: 'all-groups',
      interactionType: 'corporation_prelude_pair',
      label: 'Tharsis Republic | Allied Bank',
      playerId: ALICE_CANONICAL,
      playerName: 'Alice',
      winRate: 0.75,
      wins: 3,
    },
    {
      averagePlacement: 2,
      averageScore: 79,
      gamesPlayed: 3,
      groupId: 'all-groups',
      interactionType: 'corporation_prelude_pair',
      label: 'Inventrix | Martian Survey',
      playerId: BOB_CANONICAL,
      playerName: 'Bob',
      winRate: 0.33,
      wins: 1,
    },
  ],
  playerStylePerformanceRows: [
    {
      averageGenerationCount: 10.5,
      averagePlacement: 1.5,
      averageScore: 88,
      gamesPlayed: 4,
      groupId: 'all-groups',
      playerId: ALICE_CANONICAL,
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
      groupId: 'all-groups',
      playerId: BOB_CANONICAL,
      playerName: 'Bob',
      styleCode: 'board_control',
      winRate: 0.25,
      wins: 1,
    },
  ],
});

const extendedWithTags = buildExtended({
  // remapTagOutcomes rewrites these to canonical person IDs in Overall scope.
  tagOutcomeRows: [
    {
      corporationId: null,
      corporationName: 'Tharsis Republic',
      gameId: 'g1',
      groupId: 'all-groups',
      isWinner: true,
      playedOn: '2026-06-01',
      playerId: ALICE_CANONICAL,
      playerName: 'Alice',
      tagCode: 'science',
      tagCount: 5,
      totalPoints: 88,
    },
    {
      corporationId: null,
      corporationName: 'Tharsis Republic',
      gameId: 'g2',
      groupId: 'all-groups',
      isWinner: false,
      playedOn: '2026-06-08',
      playerId: ALICE_CANONICAL,
      playerName: 'Alice',
      tagCode: 'science',
      tagCount: 4,
      totalPoints: 76,
    },
    {
      corporationId: null,
      corporationName: 'Inventrix',
      gameId: 'g1',
      groupId: 'all-groups',
      isWinner: false,
      playedOn: '2026-06-01',
      playerId: BOB_CANONICAL,
      playerName: 'Bob',
      tagCode: 'building',
      tagCount: 6,
      totalPoints: 80,
    },
    // Bob also plays science, less heavily — a shared tag so the comparison can
    // mark the leading value.
    {
      corporationId: null,
      corporationName: 'Inventrix',
      gameId: 'g1',
      groupId: 'all-groups',
      isWinner: false,
      playedOn: '2026-06-01',
      playerId: BOB_CANONICAL,
      playerName: 'Bob',
      tagCode: 'science',
      tagCount: 2,
      totalPoints: 80,
    },
    {
      corporationId: null,
      corporationName: 'Inventrix',
      gameId: 'g2',
      groupId: 'all-groups',
      isWinner: true,
      playedOn: '2026-06-08',
      playerId: BOB_CANONICAL,
      playerName: 'Bob',
      tagCode: 'science',
      tagCount: 2,
      totalPoints: 85,
    },
  ],
});

function renderComparison(
  overrides: Partial<React.ComponentProps<typeof PlayerComparisonSummary>> = {},
) {
  return render(
    <PlayerComparisonSummary
      analytics={overallAnalytics}
      extended={extendedWithTags}
      focusPeople={focusPeople}
      selectedCanonicalIds={selectedCanonicalIds}
      {...overrides}
    />,
  );
}

// ---------------------------------------------------------------------------
// Regression: the live defect — zero games and empty evidence for players who
// do have finalized-game analytics, because the component read the empty
// Overall GroupAnalytics arrays instead of the per-person focus bundles.
// ---------------------------------------------------------------------------

describe('PlayerComparisonSummary cross-group data wiring', () => {
  it('renders each player’s game count from their focus bundle, not the empty overall leaderboard', () => {
    renderComparison();

    expect(overallAnalytics.leaderboardRows).toHaveLength(0);
    expect(screen.getAllByText('6 games').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4 games').length).toBeGreaterThan(0);
    expect(screen.queryByText('0 games')).not.toBeInTheDocument();
  });

  it('renders win rate and average points from the focus bundle performance', () => {
    renderComparison();

    expect(screen.getAllByText('67% win rate').length).toBeGreaterThan(0);
    expect(screen.getAllByText('25% win rate').length).toBeGreaterThan(0);
    expect(screen.getAllByText('85.0 avg. points').length).toBeGreaterThan(0);
    expect(screen.getAllByText('78.0 avg. points').length).toBeGreaterThan(0);
  });

  it('derives the score-source difference from each bundle’s score averages', () => {
    renderComparison();

    expect(overallAnalytics.playerScoreAverages).toHaveLength(0);

    const gap = screen.getByRole('heading', { name: /point-source gap/i })
      .parentElement;

    // Card points differ by 6 (20 vs 14), TR by 3 — card points is the largest gap.
    expect(gap).toHaveTextContent(/Card points/);
    expect(gap).toHaveTextContent(/\+6\.00 points/);
  });

  it('finds direct matchup evidence through canonical opponent IDs', () => {
    renderComparison();

    expect(overallAnalytics.headToHeadRows).toHaveLength(0);

    const pressure = screen.getByRole('heading', { name: /pressure games/i })
      .parentElement;

    expect(pressure).toHaveTextContent(/4/);
    expect(pressure).toHaveTextContent(/matchups/);
    expect(pressure).toHaveTextContent(/\+4\.50-point/);
    expect(pressure).not.toHaveTextContent(/not available/i);
  });

  it('mirrors the opponent’s head-to-head row when only their bundle carries it', () => {
    // Alice's bundle has no matchup row; Bob's does, from his perspective.
    const aliceWithoutRows = buildFocusPerson({
      ...alice,
      bundle: buildBundle({ ...alice.bundle, headToHeadRows: [] }),
    });

    renderComparison({ focusPeople: [aliceWithoutRows, bob] });

    const pressure = screen.getByRole('heading', { name: /pressure games/i })
      .parentElement;

    // Bob's −4.50 differential is inverted back to Alice's +4.50 perspective.
    expect(pressure).toHaveTextContent(/\+4\.50-point/);
  });

  it('never matches head-to-head evidence on display names', () => {
    const bobWithoutOpponentId = buildFocusPerson({
      ...bob,
      bundle: buildBundle({
        ...bob.bundle,
        headToHeadRows: [
          {
            averageScoreDifferential: -4.5,
            gamesPlayed: 4,
            label: 'Bob vs Alice',
            losses: 3,
            ties: 0,
            wins: 1,
          },
        ],
      }),
    });
    const aliceWithoutOpponentId = buildFocusPerson({
      ...alice,
      bundle: buildBundle({
        ...alice.bundle,
        headToHeadRows: [
          {
            averageScoreDifferential: 4.5,
            gamesPlayed: 4,
            label: 'Alice vs Bob',
            losses: 1,
            ties: 0,
            wins: 3,
          },
        ],
      }),
    });

    renderComparison({
      focusPeople: [aliceWithoutOpponentId, bobWithoutOpponentId],
    });

    const pressure = screen.getByRole('heading', { name: /pressure games/i })
      .parentElement;

    // The label names both players, but names are not an identity boundary, so
    // this reads as missing evidence rather than a name-matched claim.
    expect(pressure).toHaveTextContent(/not available/i);
  });

  it('renders tag profiles keyed by canonical person ID', () => {
    renderComparison();

    const tagSection = screen.getByRole('region', { name: /tag profiles/i });

    expect(within(tagSection).getAllByText(/science/i).length).toBeGreaterThan(0);
    expect(within(tagSection).getAllByText(/building/i).length).toBeGreaterThan(0);
    expect(
      within(tagSection).queryByText(/tag evidence will appear/i),
    ).not.toBeInTheDocument();
  });

  it('renders corporation and Prelude preferences keyed by canonical person ID', () => {
    renderComparison();

    const preferred = screen.getByRole('region', {
      name: /preferred corporations and preludes/i,
    });

    expect(within(preferred).getByText('Tharsis Republic')).toBeInTheDocument();
    expect(within(preferred).getByText('Allied Bank')).toBeInTheDocument();
    expect(within(preferred).getByText('Inventrix')).toBeInTheDocument();
    expect(within(preferred).getByText('Martian Survey')).toBeInTheDocument();
    expect(
      within(preferred).queryByText(/preferences will appear/i),
    ).not.toBeInTheDocument();
  });

  it('ignores rows keyed by group-local player IDs instead of canonical IDs', () => {
    // A mapping regression would emit rows keyed by the roster row. Those must
    // not be attributed to the canonical person.
    const groupKeyedAnalytics = buildOverallAnalytics({
      playerInteractionRows: [
        {
          averagePlacement: 1.5,
          averageScore: 86,
          gamesPlayed: 4,
          groupId: 'group-1',
          interactionType: 'corporation_prelude_pair',
          label: 'Tharsis Republic | Allied Bank',
          playerId: 'alice-group-1',
          playerName: 'Alice',
          winRate: 0.75,
          wins: 3,
        },
      ],
    });

    renderComparison({ analytics: groupKeyedAnalytics, extended: buildExtended() });

    expect(screen.queryByText('Tharsis Republic')).not.toBeInTheDocument();
    expect(
      screen.getAllByText(/Corporation and Prelude preferences will appear/i).length,
    ).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Missing-versus-zero: an absent bundle is an empty evidence state, not a
// zero-filled profile, and a recorded zero stays a real value.
// ---------------------------------------------------------------------------

describe('PlayerComparisonSummary missing-versus-zero semantics', () => {
  it('shows a legitimate empty evidence state when bundles carry no games', () => {
    const emptyPeople = [
      buildFocusPerson({ canonicalId: ALICE_CANONICAL, displayName: 'Alice' }),
      buildFocusPerson({ canonicalId: BOB_CANONICAL, displayName: 'Bob' }),
    ];

    renderComparison({
      analytics: buildOverallAnalytics(),
      extended: buildExtended(),
      focusPeople: emptyPeople,
    });

    // Each player gets a header in both the tag-profile and pairing cards.
    expect(screen.getAllByText('0 games')).toHaveLength(4);
    // Unavailable rather than zero: win rate and average points render as em dashes.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/tag evidence will appear/i).length,
    ).toBeGreaterThan(0);
  });

  it('claims no point-source gap when either score profile is unavailable', () => {
    const aliceWithoutScores = buildFocusPerson({
      ...alice,
      bundle: buildBundle({ ...alice.bundle, scoreAverages: null }),
    });

    renderComparison({ focusPeople: [aliceWithoutScores, bob] });

    const gap = screen.getByRole('heading', { name: /point-source gap/i })
      .parentElement;

    expect(gap).toHaveTextContent(/will appear after score breakdowns are available/i);
  });

  it('treats a recorded zero as a real value rather than missing data', () => {
    const bobWithZeroCardPoints = buildFocusPerson({
      ...bob,
      bundle: buildBundle({
        ...bob.bundle,
        scoreAverages: { ...emptyScoreAverages, averageTrPoints: 25 },
      }),
    });

    renderComparison({ focusPeople: [alice, bobWithZeroCardPoints] });

    const gap = screen.getByRole('heading', { name: /point-source gap/i })
      .parentElement;

    // Alice 20 card points vs a recorded 0 is a real +20.00 gap.
    expect(gap).toHaveTextContent(/Card points/);
    expect(gap).toHaveTextContent(/\+20\.00 points/);
  });
});

// ---------------------------------------------------------------------------
// Declared-style removal
// ---------------------------------------------------------------------------

describe('PlayerComparisonSummary declared-style removal', () => {
  it('renders no declared-style copy anywhere in the comparison', () => {
    const { container } = renderComparison();

    const text = container.textContent ?? '';

    expect(text).not.toMatch(/Declared style coverage/i);
    expect(text).not.toMatch(/Declared vs\.? Inferred Style/i);
    expect(text).not.toMatch(/Declared-versus-inferred/i);
    expect(text).not.toMatch(/Style Agreement/i);
    expect(text).not.toMatch(/declared/i);
  });

  it('titles the surviving style compare point as inferred-style evidence', () => {
    renderComparison();

    const mirror = screen.getByRole('heading', { name: /inferred style mirror/i });

    expect(mirror).toBeInTheDocument();
    expect(mirror.parentElement).toHaveTextContent(/Engine Builder/i);
    expect(mirror.parentElement).toHaveTextContent(/Board Control/i);
  });
});

// ---------------------------------------------------------------------------
// Presentation behaviour retained from the original suite
// ---------------------------------------------------------------------------

describe('PlayerComparisonSummary', () => {
  it('returns null when fewer than two canonical IDs are provided', () => {
    const { container } = renderComparison({
      selectedCanonicalIds: [ALICE_CANONICAL],
    });

    expect(container.firstChild).toBeNull();
  });

  it('renders both selected player names in headers', () => {
    renderComparison();

    const headings = screen.getAllByRole('heading', { level: 3 });

    expect(
      headings.filter((heading) => heading.textContent?.includes('Alice')).length,
    ).toBeGreaterThan(0);
    expect(
      headings.filter((heading) => heading.textContent?.includes('Bob')).length,
    ).toBeGreaterThan(0);
  });

  it('renders the three comparison section headings', () => {
    renderComparison();

    expect(screen.getByRole('heading', { name: /tag profiles/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /preferred corporations and preludes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /additional compare points/i }),
    ).toBeInTheDocument();
  });

  it('renders leading-value comparison indicators when one player leads', () => {
    renderComparison();

    expect(document.querySelectorAll('[aria-label$="lead"]').length).toBeGreaterThan(0);
  });

  it('renders supporting metrics pills (games, win rate, avg points) for pairings', () => {
    renderComparison();

    const preferredSection = screen.getByRole('region', {
      name: /preferred corporations and preludes/i,
    });

    expect(within(preferredSection).getAllByText(/game/i).length).toBeGreaterThan(0);
    expect(within(preferredSection).getAllByText(/win rate/i).length).toBeGreaterThan(0);
    expect(
      within(preferredSection).getAllByText(/avg\. points/i).length,
    ).toBeGreaterThan(0);
  });

  it('renders five Additional Compare Points rows with icons', () => {
    renderComparison();

    const additionalSection = screen.getByRole('region', {
      name: /additional compare points/i,
    });

    expect(within(additionalSection).getAllByRole('article').length).toBe(5);
    expect(
      within(additionalSection).getByRole('heading', { name: /pressure games/i }),
    ).toBeInTheDocument();
    expect(
      within(additionalSection).getByRole('heading', { name: /inferred style mirror/i }),
    ).toBeInTheDocument();
    expect(
      within(additionalSection).getByRole('heading', { name: /point-source gap/i }),
    ).toBeInTheDocument();
    expect(
      within(additionalSection).getByRole('heading', { name: /tag identity/i }),
    ).toBeInTheDocument();
    expect(
      within(additionalSection).getByRole('heading', { name: /selection comfort/i }),
    ).toBeInTheDocument();
  });

  it('marks the current user with a "You" badge', () => {
    renderComparison({ currentUserCanonicalId: ALICE_CANONICAL });

    expect(screen.getAllByText(/^You$/i).length).toBeGreaterThan(0);
  });

  it('renders empty-data state for pairings when no interaction rows exist', () => {
    renderComparison({ analytics: buildOverallAnalytics() });

    expect(
      screen.getAllByText(/Corporation and Prelude preferences will appear/i).length,
    ).toBeGreaterThan(0);
  });

  it('uses accessible section labels', () => {
    renderComparison();

    expect(screen.getByRole('region', { name: /tag profiles/i })).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /preferred corporations and preludes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /additional compare points/i }),
    ).toBeInTheDocument();
  });

  it('uses sr-only labels on metric pill definition terms for accessibility', () => {
    renderComparison();

    expect(document.querySelectorAll('dt.sr-only').length).toBeGreaterThan(0);
  });
});
