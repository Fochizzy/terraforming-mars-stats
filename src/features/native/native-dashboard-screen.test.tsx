import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NativeDashboardScreen } from './native-dashboard-screen';
import type { NativeDashboardData } from './load-native-dashboard';

const nativeHarness = vi.hoisted(() => {
  let scrollHandler:
    | null
    | ((event: { nativeEvent: { contentOffset: { y: number } } }) => void) = null;

  return {
    emitScroll(y: number) {
      if (!scrollHandler) {
        throw new Error('Scroll handler has not been registered.');
      }

      scrollHandler({
        nativeEvent: {
          contentOffset: {
            y,
          },
        },
      });
    },
    layoutYByTestId: {
      'dashboard-section-global': 1020,
      'dashboard-section-group': 640,
      'dashboard-section-profile': 260,
    } as Record<string, number>,
    registerScrollHandler(
      handler: null | ((event: { nativeEvent: { contentOffset: { y: number } } }) => void),
    ) {
      scrollHandler = handler;
    },
    reset() {
      scrollHandler = null;
      this.scrollToMock.mockReset();
    },
    scrollToMock: vi.fn(),
  };
});

const supabaseHarness = vi.hoisted(() => {
  type QueryResult = {
    data: unknown;
    error: null | Error;
  };

  const analyticsResults = new Map<string, QueryResult[]>();
  const publicResults = new Map<string, QueryResult[]>();

  function takeResult(
    results: Map<string, QueryResult[]>,
    tableName: string,
  ): QueryResult {
    const queue = results.get(tableName);

    if (!queue || queue.length === 0) {
      throw new Error(`Missing mock result for ${tableName}.`);
    }

    return queue.shift()!;
  }

  function buildQuery(result: QueryResult) {
    const query = {
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(() => Promise.resolve(result)),
      order: vi.fn(() => query),
      select: vi.fn(() => query),
      then: (
        resolve: (value: QueryResult) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => Promise.resolve(result).then(resolve, reject),
    };

    return query;
  }

  return {
    authGetSession: vi.fn(),
    from: vi.fn((tableName: string) =>
      buildQuery(takeResult(publicResults, tableName)),
    ),
    reset() {
      analyticsResults.clear();
      publicResults.clear();
      this.authGetSession.mockReset();
      this.from.mockClear();
      this.schema.mockClear();
      this.schemaFrom.mockClear();
    },
    schema: vi.fn(() => ({
      from: supabaseHarness.schemaFrom,
    })),
    schemaFrom: vi.fn((tableName: string) =>
      buildQuery(takeResult(analyticsResults, tableName)),
    ),
    setAnalyticsResult(tableName: string, result: QueryResult) {
      analyticsResults.set(tableName, [
        ...(analyticsResults.get(tableName) ?? []),
        result,
      ]);
    },
    setPublicResult(tableName: string, result: QueryResult) {
      publicResults.set(tableName, [
        ...(publicResults.get(tableName) ?? []),
        result,
      ]);
    },
  };
});

vi.mock('react-native', async () => {
  const React = await import('react');

  return {
    Image: () => <div>banner image</div>,
    ImageBackground: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Pressable: ({
      children,
      onPress,
      style,
    }: {
      children: ReactNode;
      onPress?: () => void;
      style?: Record<string, unknown> | Array<Record<string, unknown> | false | null>;
    }) => {
      const flattenedStyle = Array.isArray(style)
        ? Object.assign({}, ...style.filter(Boolean))
        : (style ?? {});
      const isActive = flattenedStyle.backgroundColor === '#f59e0b';

      return (
        <button data-active={isActive ? 'true' : 'false'} onClick={onPress}>
          {children}
        </button>
      );
    },
    ScrollView: React.forwardRef(function ScrollViewMock(
      {
        children,
        onScroll,
      }: {
        children: ReactNode;
        onScroll?: (event: { nativeEvent: { contentOffset: { y: number } } }) => void;
      },
      ref,
    ) {
      React.useEffect(() => {
        nativeHarness.registerScrollHandler(onScroll ?? null);
      }, [onScroll]);

      React.useImperativeHandle(ref, () => ({
        scrollTo: nativeHarness.scrollToMock,
      }));

      return <div>{children}</div>;
    }),
    StyleSheet: {
      create: <T,>(styles: T) => styles,
    },
    Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
    View: ({
      children,
      onLayout,
      testID,
    }: {
      children: ReactNode;
      onLayout?: (event: { nativeEvent: { layout: { y: number } } }) => void;
      testID?: string;
    }) => {
      React.useEffect(() => {
        const y = testID ? nativeHarness.layoutYByTestId[testID] : undefined;

        if (onLayout && typeof y === 'number') {
          onLayout({
            nativeEvent: {
              layout: {
                y,
              },
            },
          });
        }
      }, [onLayout, testID]);

      return <div data-testid={testID}>{children}</div>;
    },
  };
});

vi.mock('@/lib/supabase/native', () => ({
  nativeSupabase: {
    auth: {
      getSession: supabaseHarness.authGetSession,
    },
    from: supabaseHarness.from,
    schema: supabaseHarness.schema,
  },
}));

function seedNativeDashboardLoaderResults({
  globalMapResult = {
    data: [
      {
        average_generations: 10,
        average_points: 84,
        average_points_per_generation: 8.4,
        expected_score_baseline: null,
        games_played: 6,
        map_id: 'tharsis',
        maps: { name: 'Tharsis' },
        player_count: 4,
      },
      {
        average_generations: 11,
        average_points: 88,
        average_points_per_generation: 8,
        expected_score_baseline: 76,
        games_played: 5,
        map_id: 'tharsis',
        maps: { name: 'Tharsis' },
        player_count: 5,
      },
    ],
    error: null,
  },
  playerMetricResult = {
    data: {
      average_award_roi: 1.25,
      average_normalized_efficiency: 1.08,
      average_points_per_generation: 8.4,
      average_score_delta_vs_expected: 3.2,
      best_score_source: 'Terraform Rating',
      best_tag_lane: 'Science',
      games_played: 5,
      tag_evidence_coverage: 0.8,
    },
    error: null,
  },
}: {
  globalMapResult?: { data: unknown; error: null | Error };
  playerMetricResult?: { data: unknown; error: null | Error };
} = {}) {
  supabaseHarness.authGetSession.mockResolvedValue({
    data: {
      session: {
        user: {
          email: 'izzy.hodnett@gmail.com',
          id: 'user-1',
        },
      },
    },
  });

  supabaseHarness.setPublicResult('user_profiles', {
    data: { last_active_group_id: 'group-1' },
    error: null,
  });
  supabaseHarness.setPublicResult('group_members', {
    data: [
      {
        group_id: 'group-1',
        groups: { name: 'Friday Night Mars' },
        role: 'owner',
      },
    ],
    error: null,
  });
  supabaseHarness.setPublicResult('players', {
    data: [
      {
        display_name: 'Friday Mars',
        group_id: 'group-1',
        id: 'player-1',
      },
    ],
    error: null,
  });
  supabaseHarness.setPublicResult('player_metric_summaries', playerMetricResult);
  supabaseHarness.setPublicResult('global_map_metric_summaries', globalMapResult);

  supabaseHarness.setAnalyticsResult('group_leaderboard', {
    data: [
      {
        average_score: 84.5,
        games_played: 5,
        player_id: 'player-1',
        player_name: 'Friday Mars',
        weighted_score: 91.4,
        win_rate: 0.75,
      },
    ],
    error: null,
  });
  supabaseHarness.setAnalyticsResult('head_to_head', {
    data: [],
    error: null,
  });
  supabaseHarness.setAnalyticsResult('lineup_effects', {
    data: [],
    error: null,
  });
  supabaseHarness.setAnalyticsResult('style_agreement', {
    data: [
      {
        exact_match_rate: 0.6,
        mismatch_rate: 0.1,
        partial_match_rate: 0.3,
        player_id: 'player-1',
        player_name: 'Friday Mars',
      },
    ],
    error: null,
  });
  supabaseHarness.setAnalyticsResult('player_trends', {
    data: [],
    error: null,
  });
  supabaseHarness.setAnalyticsResult('global_corporation_performance', {
    data: [
      {
        average_score: 82.2,
        corporation_id: 'helion',
        corporation_name: 'Helion',
        games_played: 9,
        win_rate: 0.66,
        wins: 6,
      },
    ],
    error: null,
  });
  supabaseHarness.setAnalyticsResult('group_leaderboard', {
    data: {
      average_score: 84.5,
      games_played: 5,
      player_id: 'player-1',
      player_name: 'Friday Mars',
      weighted_score: 91.4,
      win_rate: 0.75,
    },
    error: null,
  });
  supabaseHarness.setAnalyticsResult('player_score_source_averages', {
    data: {
      average_animal_points: 0,
      average_award_points: 8,
      average_card_points: 18,
      average_cities_points: 5,
      average_greenery_points: 12,
      average_jovian_points: 0,
      average_microbe_points: 0,
      average_milestone_points: 10,
      average_other_card_points: 0,
      average_tr_points: 25,
    },
    error: null,
  });
  supabaseHarness.setAnalyticsResult('player_data_coverage', {
    data: {
      animal_coverage: 0.25,
      card_breakdown_coverage: 0.75,
      declared_style_coverage: 0.5,
      jovian_coverage: 0.25,
      key_card_coverage: 0.7,
      microbe_coverage: 0.25,
    },
    error: null,
  });
}

const dashboardFixture: NativeDashboardData = {
  global: {
    leaderboardRows: [
      {
        accent: 'heat',
        detail: '18 plays',
        label: 'Helion',
        value: 0.611,
      },
    ],
    mapRows: [
      {
        accent: 'ocean',
        detail: '83.1 avg pts | 10.0 gens | 6 games | 4 players',
        label: 'Tharsis',
        value: 8.4,
      },
    ],
    summary: 'Opted-in groups globally are rewarding heat rush corps right now.',
    title: 'Global Stats',
  },
  group: {
    headToHeadRows: [
      {
        detail: 'Score edge +6.2',
        label: 'Friday Mars vs Second Seat',
        record: '4-1-0',
      },
    ],
    leaderboardRows: [
      {
        accent: 'ocean',
        detail: '78% win rate',
        label: 'Friday Mars',
        value: 0.812,
      },
    ],
    summary: 'Helion-heavy games keep skewing the group podium.',
    title: 'Comparative Stats',
    trendRows: [
      {
        label: '06/12',
        value: 72,
      },
      {
        label: '06/28',
        value: 89,
      },
    ],
  },
  groupName: 'Friday Night Mars',
  profile: {
    coverageBadges: [
      {
        label: 'Full card breakdown',
        value: 0.75,
      },
    ],
    headline: 'Friday Mars',
    metrics: [
      {
        label: 'Weighted Score',
        value: '91.4',
      },
      {
        label: 'Win Rate',
        value: '75%',
      },
      {
        label: 'Average Score',
        value: '84.5',
      },
      {
        label: 'Points Per Generation',
        value: '8.4 pts/gen',
      },
      {
        label: 'Normalized Efficiency',
        value: '1.08',
      },
    ],
    rivalRows: [
      {
        detail: 'Score edge +5.8',
        label: 'Second Seat',
        record: '3-1-0',
      },
    ],
    scoreSourceRows: [
      {
        accent: 'greenery',
        detail: '11.6 avg points',
        label: 'Greenery',
        value: 11.6,
      },
      {
        accent: 'ocean',
        detail: '25.3 avg points',
        label: 'Terraform Rating',
        value: 25.3,
      },
    ],
    subtitle: '5 finalized games in Friday Night Mars',
    title: 'Personal Stats',
  },
  sessionEmail: 'izzy.hodnett@gmail.com',
};

describe('NativeDashboardScreen', () => {
  beforeEach(() => {
    nativeHarness.reset();
    supabaseHarness.reset();
  });

  it('scrolls to the tapped section and updates the active hero button', async () => {
    const user = userEvent.setup();

    render(<NativeDashboardScreen dashboard={dashboardFixture} onSignOut={vi.fn()} />);

    const personalButton = screen.getByRole('button', { name: /personal stats/i });
    const comparativeButton = screen.getByRole('button', {
      name: /comparative stats/i,
    });

    expect(personalButton).toHaveAttribute('data-active', 'true');
    expect(comparativeButton).toHaveAttribute('data-active', 'false');

    await user.click(comparativeButton);

    expect(nativeHarness.scrollToMock).toHaveBeenCalledWith({
      animated: true,
      y: 628,
    });
    expect(personalButton).toHaveAttribute('data-active', 'false');
    expect(comparativeButton).toHaveAttribute('data-active', 'true');
  });

  it('moves the active hero button when scrolling reaches a later section', () => {
    render(<NativeDashboardScreen dashboard={dashboardFixture} onSignOut={vi.fn()} />);

    const personalButton = screen.getByRole('button', { name: /personal stats/i });
    const globalButton = screen.getByRole('button', { name: /global stats/i });

    expect(personalButton).toHaveAttribute('data-active', 'true');
    expect(globalButton).toHaveAttribute('data-active', 'false');

    act(() => {
      nativeHarness.emitScroll(960);
    });

    expect(personalButton).toHaveAttribute('data-active', 'false');
    expect(globalButton).toHaveAttribute('data-active', 'true');
  });

  it('renders persisted profile metrics and global map rows', () => {
    render(<NativeDashboardScreen dashboard={dashboardFixture} onSignOut={vi.fn()} />);

    expect(screen.getByText(/points per generation/i)).toBeInTheDocument();
    expect(screen.getByText(/8\.4 pts\/gen/i)).toBeInTheDocument();
    expect(screen.getByText(/normalized efficiency/i)).toBeInTheDocument();
    expect(screen.getByText(/global map meta/i)).toBeInTheDocument();
    expect(screen.getByText(/tharsis/i)).toBeInTheDocument();
  });
});

describe('loadNativeDashboard', () => {
  beforeEach(() => {
    nativeHarness.reset();
    supabaseHarness.reset();
  });

  it('keeps legacy native analytics when persisted public summaries fail', async () => {
    seedNativeDashboardLoaderResults({
      globalMapResult: {
        data: null,
        error: new Error('persisted map summary unavailable'),
      },
      playerMetricResult: {
        data: null,
        error: new Error('persisted player summary unavailable'),
      },
    });

    const { loadNativeDashboard } = await import('./load-native-dashboard');
    const dashboard = await loadNativeDashboard();

    expect(dashboard?.profile?.metrics).toEqual(
      expect.arrayContaining([
        { label: 'Weighted Score', value: '91.4' },
        { label: 'Win Rate', value: '75%' },
        { label: 'Average Score', value: '84.5' },
      ]),
    );
    expect(dashboard?.profile?.metrics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Points Per Generation' }),
      ]),
    );
    expect(dashboard?.global?.leaderboardRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Helion' }),
      ]),
    );
    expect(dashboard?.global?.mapRows).toEqual([]);
    expect(dashboard?.global?.summary).toBe(
      'Helion is setting the opted-in global pace right now.',
    );
  });

  it('labels persisted global map rows by player count and omits null baseline copy', async () => {
    seedNativeDashboardLoaderResults();

    const { loadNativeDashboard } = await import('./load-native-dashboard');
    const dashboard = await loadNativeDashboard();

    expect(dashboard?.global?.mapRows?.map((row) => row.label)).toEqual([
      'Tharsis (4p)',
      'Tharsis (5p)',
    ]);
    expect(dashboard?.global?.summary).toBe(
      'Tharsis is the top global map baseline at 8.4 pts/gen.',
    );
    expect(dashboard?.global?.summary).not.toContain('0 expected points');
  });

  it('uses corporation summary when persisted global map rows are unusable', async () => {
    seedNativeDashboardLoaderResults({
      globalMapResult: {
        data: [
          {
            average_generations: 10,
            average_points: 84,
            average_points_per_generation: null,
            expected_score_baseline: 72,
            games_played: 6,
            map_id: 'tharsis',
            maps: { name: 'Tharsis' },
            player_count: 4,
          },
        ],
        error: null,
      },
    });

    const { loadNativeDashboard } = await import('./load-native-dashboard');
    const dashboard = await loadNativeDashboard();

    expect(dashboard?.global?.mapRows).toEqual([]);
    expect(dashboard?.global?.summary).toBe(
      'Helion is setting the opted-in global pace right now.',
    );
  });
});
