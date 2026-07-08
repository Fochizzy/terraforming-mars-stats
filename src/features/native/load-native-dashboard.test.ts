import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadNativeDashboard } from './load-native-dashboard';

type QueryResult = {
  data: unknown;
  error: null;
};

type QueryResultSource = QueryResult | ((filters: Map<string, unknown>) => QueryResult);

const mockState = vi.hoisted(() => ({
  getSession: vi.fn(),
  from: vi.fn(),
  schema: vi.fn(),
}));

vi.mock('@/lib/supabase/native', () => ({
  nativeSupabase: {
    auth: {
      getSession: mockState.getSession,
    },
    from: mockState.from,
    schema: mockState.schema,
  },
}));

function createQueryBuilder(
  tableName: string,
  listResults: Record<string, QueryResultSource>,
  singleResults: Record<string, QueryResultSource>,
) {
  const filters = new Map<string, unknown>();
  const resolveResult = (
    source: QueryResultSource | undefined,
    fallback: QueryResult,
  ) => {
    if (!source) {
      return fallback;
    }

    if (typeof source === 'function') {
      return source(filters);
    }

    return source;
  };

  const builder = {
    eq: vi.fn((column: string, value: unknown) => {
      filters.set(column, value);
      return builder;
    }),
    maybeSingle: vi.fn(async () => {
      if (tableName === 'group_leaderboard') {
        const rows = (resolveResult(
          listResults[tableName],
          { data: [], error: null },
        ).data ?? []) as Array<
          Record<string, unknown>
        >;
        const playerId = filters.get('player_id');

        return {
          data: rows.find((row) => row.player_id === playerId) ?? null,
          error: null,
        };
      }

      return resolveResult(singleResults[tableName], { data: null, error: null });
    }),
    order: vi.fn(() => builder),
    select: vi.fn(() => builder),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(
        resolveResult(listResults[tableName], { data: [], error: null }),
      ).then(resolve, reject),
  };

  return builder;
}

function primeNativeSupabaseMock(input: {
  listResults: Record<string, QueryResultSource>;
  singleResults?: Record<string, QueryResultSource>;
}) {
  const singleResults = input.singleResults ?? {};
  const createBuilder = (tableName: string) =>
    createQueryBuilder(tableName, input.listResults, singleResults);

  mockState.from.mockImplementation(createBuilder);
  mockState.schema.mockImplementation((schemaName: string) => {
    if (schemaName !== 'analytics') {
      throw new Error(`Unexpected schema ${schemaName}`);
    }

    return {
      from: createBuilder,
    };
  });
}

describe('loadNativeDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            email: 'izzy@example.test',
            id: 'user-1',
          },
        },
      },
    });
  });

  it('labels player-list groups from finalized leaderboard rows and summarizes the actual leader', async () => {
    primeNativeSupabaseMock({
      listResults: {
        global_corporation_performance: { data: [], error: null },
        group_leaderboard: {
          data: [
            {
              average_score: '96',
              games_played: 2,
              player_id: 'player-izzy',
              player_name: 'Izzy Hodnett',
              weighted_score: '0.2',
              win_rate: '0.5',
            },
            {
              average_score: '127',
              games_played: 2,
              player_id: 'player-james',
              player_name: 'James Hodnett',
              weighted_score: '0.6',
              win_rate: '0.5',
            },
          ],
          error: null,
        },
        group_members: {
          data: [
            {
              group_id: 'group-1',
              groups: {
                name: 'Colette LeRoux / Corey Jansen / Izzy Hodnett',
              },
              role: 'editor',
            },
          ],
          error: null,
        },
        head_to_head: { data: [], error: null },
        lineup_effects: { data: [], error: null },
        player_data_coverage: { data: null, error: null },
        player_score_source_averages: { data: null, error: null },
        player_trends: { data: [], error: null },
        players: {
          data: [
            {
              display_name: 'Izzy Hodnett',
              group_id: 'group-1',
              id: 'player-izzy',
            },
          ],
          error: null,
        },
        style_agreement: { data: [], error: null },
        user_profiles: { data: null, error: null },
      },
      singleResults: {
        player_data_coverage: { data: null, error: null },
        player_score_source_averages: { data: null, error: null },
        user_profiles: {
          data: { last_active_group_id: 'group-1' },
          error: null,
        },
      },
    });

    const dashboard = await loadNativeDashboard();

    expect(dashboard?.groupName).toBe('Izzy Hodnett / James Hodnett');
    expect(dashboard?.group?.summary).toBe(
      'James Hodnett currently leads Izzy Hodnett / James Hodnett at 50% across 2 finalized games.',
    );
    expect(dashboard?.group?.leaderboardRows?.map((row) => row.label)).toEqual([
      'James Hodnett',
      'Izzy Hodnett',
    ]);
    expect(dashboard?.profile?.subtitle).toBe(
      '2 finalized games in Izzy Hodnett / James Hodnett',
    );
  });

  it('exposes all-groups and per-group dashboard scopes for every group membership', async () => {
    const leaderboardsByGroup: Record<string, Array<Record<string, unknown>>> = {
      'group-1': [
        {
          average_score: '96',
          games_played: 2,
          player_id: 'player-izzy',
          player_name: 'Izzy Hodnett',
          weighted_score: '0.2',
          win_rate: '0.5',
        },
        {
          average_score: '127',
          games_played: 2,
          player_id: 'player-james',
          player_name: 'James Hodnett',
          weighted_score: '0.6',
          win_rate: '0.5',
        },
      ],
      'group-2': [
        {
          average_score: '84',
          games_played: 3,
          player_id: 'player-izzy-mars',
          player_name: 'Izzy Hodnett',
          weighted_score: '0.4',
          win_rate: '1',
        },
        {
          average_score: '80',
          games_played: 3,
          player_id: 'player-alex',
          player_name: 'Alex Grant',
          weighted_score: '0.1',
          win_rate: '0',
        },
      ],
    };

    const emptyGroupRows = (filters: Map<string, unknown>) => {
      expect(filters.get('group_id')).toBeTruthy();
      return { data: [], error: null };
    };

    primeNativeSupabaseMock({
      listResults: {
        global_corporation_performance: { data: [], error: null },
        group_leaderboard: (filters) => ({
          data: leaderboardsByGroup[String(filters.get('group_id'))] ?? [],
          error: null,
        }),
        group_members: {
          data: [
            {
              group_id: 'group-1',
              groups: {
                name: 'Colette LeRoux / Corey Jansen / Izzy Hodnett',
              },
              role: 'editor',
            },
            {
              group_id: 'group-2',
              groups: {
                name: 'Mars Club',
              },
              role: 'editor',
            },
          ],
          error: null,
        },
        head_to_head: emptyGroupRows,
        lineup_effects: emptyGroupRows,
        player_data_coverage: { data: null, error: null },
        player_score_source_averages: { data: null, error: null },
        player_trends: emptyGroupRows,
        players: {
          data: [
            {
              display_name: 'Izzy Hodnett',
              group_id: 'group-1',
              id: 'player-izzy',
            },
            {
              display_name: 'Izzy Hodnett',
              group_id: 'group-2',
              id: 'player-izzy-mars',
            },
          ],
          error: null,
        },
        style_agreement: emptyGroupRows,
        user_profiles: { data: null, error: null },
      },
      singleResults: {
        player_data_coverage: { data: null, error: null },
        player_score_source_averages: { data: null, error: null },
        user_profiles: {
          data: { last_active_group_id: 'group-1' },
          error: null,
        },
      },
    });

    const dashboard = await loadNativeDashboard();
    const scopes = dashboard?.scopes ?? [];
    const allGroupsScope = scopes[0];

    expect(scopes.map((scope) => scope.label)).toEqual([
      'All Groups',
      'Izzy Hodnett / James Hodnett',
      'Mars Club',
    ]);
    expect(allGroupsScope.profile?.subtitle).toBe(
      '5 finalized games across 2 groups',
    );
    expect(allGroupsScope.profile?.metrics).toEqual([
      { label: 'Weighted Score', value: '0.3' },
      { label: 'Win Rate', value: '80%' },
      { label: 'Average Score', value: '88.8' },
    ]);
    expect(
      allGroupsScope.individualProfiles?.map((profile) => profile.groupName),
    ).toEqual(['Izzy Hodnett / James Hodnett', 'Mars Club']);
  });
});
