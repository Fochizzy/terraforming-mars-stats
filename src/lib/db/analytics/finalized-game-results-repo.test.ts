import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDefaultAnalyticsFilterState,
  createEmptyAnalyticsSelectionState,
} from '@/lib/analytics';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getFinalizedGameResult,
  listFinalizedGameResults,
} from './finalized-game-results-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

const IDS = {
  group: '00000000-0000-4000-8000-000000000001',
  gameOne: '00000000-0000-4000-8000-000000000002',
  gameTwo: '00000000-0000-4000-8000-000000000003',
  map: '00000000-0000-4000-8000-000000000004',
  playerOne: '00000000-0000-4000-8000-000000000005',
  playerTwo: '00000000-0000-4000-8000-000000000006',
  gamePlayerOne: '00000000-0000-4000-8000-000000000007',
  gamePlayerTwo: '00000000-0000-4000-8000-000000000008',
  user: '00000000-0000-4000-8000-000000000009',
};

type QueryResponse = { data: unknown; error: unknown | null };
type QueryCall = { method: string; args: readonly unknown[] };
type QueryTrace = { table: string; calls: QueryCall[] };

function createQueryBuilder(response: QueryResponse, trace: QueryTrace) {
  const builder: Record<string, unknown> = {};
  for (const method of [
    'select',
    'eq',
    'in',
    'gte',
    'lte',
    'order',
    'range',
    'abortSignal',
    'maybeSingle',
  ]) {
    builder[method] = vi.fn((...args: unknown[]) => {
      trace.calls.push({ method, args });
      return builder;
    });
  }
  builder.then = (
    resolve: (value: QueryResponse) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(response).then(resolve, reject);
  return builder;
}

function installClient(input?: {
  user?: { id: string } | null;
  authError?: unknown | null;
  responses?: Record<string, QueryResponse[]>;
}) {
  const traces: QueryTrace[] = [];
  const queues = input?.responses ?? {};
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: input?.user === undefined ? { id: IDS.user } : input.user },
        error: input?.authError ?? null,
      }),
    },
    from: vi.fn((table: string) => {
      const response = queues[table]?.shift();
      if (response === undefined) {
        throw new Error(`Unexpected query for ${table}`);
      }
      const trace = { table, calls: [] } satisfies QueryTrace;
      traces.push(trace);
      return createQueryBuilder(response, trace);
    }),
  };
  vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never);
  return { client, traces };
}

function rawGame(id = IDS.gameOne) {
  return {
    id,
    group_id: IDS.group,
    played_on: '2026-07-10',
    map_id: IDS.map,
    player_count: 2,
    generation_count: 10,
    status: 'finalized',
    created_at: '2026-07-10T10:00:00.000Z',
    updated_at: '2026-07-10T11:00:00.000Z',
  };
}

function rawPlayers(input?: { winnerPoints?: number | null }) {
  const winnerPoints =
    input?.winnerPoints === undefined ? 120 : input.winnerPoints;
  return [
    {
      id: IDS.gamePlayerOne,
      game_id: IDS.gameOne,
      player_id: IDS.playerOne,
      placement: 1,
      is_winner: true,
      total_points: winnerPoints,
    },
    {
      id: IDS.gamePlayerTwo,
      game_id: IDS.gameOne,
      player_id: IDS.playerTwo,
      placement: 2,
      is_winner: false,
      total_points: 0,
    },
  ];
}

function listInput() {
  return {
    scope: { type: 'group' as const, groupId: IDS.group },
    filters: createDefaultAnalyticsFilterState(),
    authorization: {
      kind: 'current-user' as const,
      requiredAccess: 'group-member' as const,
    },
  };
}

function callsFor(trace: QueryTrace, method: string) {
  return trace.calls.filter((call) => call.method === method);
}

describe('finalized game results repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes filters, validates identities, pages deterministically, and batches child rows', async () => {
    const { traces } = installClient({
      responses: {
        group_members: [{ data: { group_id: IDS.group }, error: null }],
        maps: [{ data: [{ id: IDS.map }], error: null }],
        games: [
          {
            data: [rawGame(), rawGame(IDS.gameTwo)],
            error: null,
          },
        ],
        game_players: [{ data: rawPlayers(), error: null }],
        game_log_imports: [{ data: [], error: null }],
      },
    });

    const result = await listFinalizedGameResults({
      ...listInput(),
      filters: {
        ...createDefaultAnalyticsFilterState(),
        from: '2026-07-01',
        to: '2026-07-31',
        mapIds: [IDS.map, IDS.map],
        playerCounts: [2],
        generationCounts: [10],
      },
      selectionContext: {
        state: {
          ...createEmptyAnalyticsSelectionState(),
          metricId: 'win-point-differential',
        },
        role: 'highlight-only',
      },
      pagination: { kind: 'offset', offset: 0, limit: 1 },
    });

    expect(result).toMatchObject({
      status: 'ready',
      query: {
        appliedFilters: [
          'date-range',
          'map',
          'player-count',
          'generation-count',
        ],
        selectionContext: { role: 'highlight-only' },
        pagination: { offset: 0, limit: 1, returned: 1, hasMore: true },
      },
      data: {
        records: [
          {
            gameId: IDS.gameOne,
            players: [{ totalPoints: 120 }, { totalPoints: 0 }],
          },
        ],
      },
    });
    if (result.status === 'error' || result.status === 'unavailable') return;
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'duplicate-filter-value', filter: 'map' }),
    );

    expect(traces.map((trace) => trace.table)).toEqual([
      'group_members',
      'maps',
      'games',
      'game_players',
      'game_log_imports',
    ]);
    expect(traces.filter((trace) => trace.table === 'game_players')).toHaveLength(1);
    expect(traces.filter((trace) => trace.table === 'game_log_imports')).toHaveLength(1);
    expect(JSON.stringify(traces)).not.toContain('win-point-differential');

    const gameTrace = traces.find((trace) => trace.table === 'games')!;
    expect(callsFor(gameTrace, 'gte')).toContainEqual({
      method: 'gte',
      args: ['played_on', '2026-07-01'],
    });
    expect(callsFor(gameTrace, 'lte')).toContainEqual({
      method: 'lte',
      args: ['played_on', '2026-07-31'],
    });
    expect(callsFor(gameTrace, 'order')).toEqual([
      { method: 'order', args: ['played_on', { ascending: false }] },
      { method: 'order', args: ['created_at', { ascending: false }] },
      { method: 'order', args: ['id', { ascending: true }] },
    ]);
    expect(callsFor(gameTrace, 'range')).toEqual([
      { method: 'range', args: [0, 1] },
    ]);
    expect(callsFor(gameTrace, 'eq')).toContainEqual({
      method: 'eq',
      args: ['status', 'finalized'],
    });
  });

  it.each([
    {
      name: 'a reversed date range',
      filters: {
        ...createDefaultAnalyticsFilterState(),
        from: '2026-07-31',
        to: '2026-07-01',
      },
      category: 'invalid-input',
    },
    {
      name: 'an unsupported minimum sample including explicit zero',
      filters: { ...createDefaultAnalyticsFilterState(), minSample: 0 },
      category: 'unsupported-filter',
    },
    {
      name: 'an unsupported card filter',
      filters: {
        ...createDefaultAnalyticsFilterState(),
        cardIds: ['00000000-0000-4000-8000-000000000010'],
      },
      category: 'unsupported-filter',
    },
    {
      name: 'a malformed stable identifier',
      filters: {
        ...createDefaultAnalyticsFilterState(),
        mapIds: ['Tharsis'],
      },
      category: 'invalid-input',
    },
  ])('rejects $name before opening a database client', async ({ filters, category }) => {
    const result = await listFinalizedGameResults({
      ...listInput(),
      filters,
    });

    expect(result).toMatchObject({ status: 'error', error: { category } });
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('rejects global scope instead of bypassing the opt-in analytics boundary', async () => {
    const result = await listFinalizedGameResults({
      ...listInput(),
      scope: { type: 'global' },
    } as never);

    expect(result).toMatchObject({
      status: 'error',
      error: { category: 'unsupported-scope' },
    });
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it.each([
    { kind: 'offset' as const, offset: -1, limit: 25 },
    { kind: 'offset' as const, offset: 0, limit: 0 },
    { kind: 'offset' as const, offset: 0, limit: 101 },
  ])('rejects invalid bounded pagination %#', async (pagination) => {
    const result = await listFinalizedGameResults({
      ...listInput(),
      pagination,
    });

    expect(result).toMatchObject({
      status: 'error',
      error: { category: 'invalid-input' },
    });
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('applies an open-ended date range without inventing the other bound', async () => {
    const { traces } = installClient({
      responses: {
        group_members: [{ data: { group_id: IDS.group }, error: null }],
        games: [{ data: [], error: null }],
      },
    });
    const result = await listFinalizedGameResults({
      ...listInput(),
      filters: {
        ...createDefaultAnalyticsFilterState(),
        from: '2026-07-01',
      },
    });

    expect(result.status).toBe('empty');
    const gameTrace = traces.find((trace) => trace.table === 'games')!;
    expect(callsFor(gameTrace, 'gte')).toHaveLength(1);
    expect(callsFor(gameTrace, 'lte')).toHaveLength(0);
  });

  it('distinguishes an unsigned user from a forbidden group', async () => {
    installClient({ user: null, responses: {} });
    const unsigned = await listFinalizedGameResults(listInput());
    expect(unsigned).toMatchObject({
      status: 'error',
      error: { category: 'unauthorized' },
    });

    installClient({
      responses: {
        group_members: [{ data: null, error: null }],
      },
    });
    const forbidden = await listFinalizedGameResults(listInput());
    expect(forbidden).toMatchObject({
      status: 'error',
      error: { category: 'forbidden' },
    });
  });

  it('rejects stale map identity before querying the game population', async () => {
    const { traces } = installClient({
      responses: {
        group_members: [{ data: { group_id: IDS.group }, error: null }],
        maps: [{ data: [], error: null }],
      },
    });
    const result = await listFinalizedGameResults({
      ...listInput(),
      filters: {
        ...createDefaultAnalyticsFilterState(),
        mapIds: [IDS.map],
      },
    });

    expect(result).toMatchObject({
      status: 'error',
      error: { category: 'stale-identity' },
    });
    expect(traces.some((trace) => trace.table === 'games')).toBe(false);
  });

  it('distinguishes a successful empty result from a source query failure', async () => {
    installClient({
      responses: {
        group_members: [{ data: { group_id: IDS.group }, error: null }],
        games: [{ data: [], error: null }],
      },
    });
    const empty = await listFinalizedGameResults(listInput());
    expect(empty).toMatchObject({
      status: 'empty',
      data: { records: [], coverage: { eligibleRecords: 0 } },
    });

    const rawError = { message: 'private table detail', code: '42501' };
    const onDiagnostic = vi.fn();
    installClient({
      responses: {
        group_members: [{ data: { group_id: IDS.group }, error: null }],
        games: [{ data: null, error: rawError }],
      },
    });
    const failed = await listFinalizedGameResults({
      ...listInput(),
      execution: { requestId: 'request-1', onDiagnostic },
    });
    expect(failed).toEqual({
      status: 'error',
      operationId: 'finalized-game-results.list',
      error: {
        category: 'query-failure',
        message: 'Analytics data could not be loaded. Please try again.',
        retryable: true,
      },
    });
    expect(JSON.stringify(failed)).not.toContain('private table detail');
    expect(onDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'request-1',
        category: 'query-failure',
        cause: rawError,
      }),
    );
  });

  it('returns partial imported data when persisted required observations are missing', async () => {
    installClient({
      responses: {
        group_members: [{ data: { group_id: IDS.group }, error: null }],
        games: [{ data: [rawGame()], error: null }],
        game_players: [
          { data: rawPlayers({ winnerPoints: null }), error: null },
        ],
        game_log_imports: [
          {
            data: [
              {
                id: '00000000-0000-4000-8000-000000000010',
                game_id: IDS.gameOne,
                parse_status: 'finalized',
                created_at: '2026-07-10T10:30:00.000Z',
              },
            ],
            error: null,
          },
        ],
      },
    });
    const result = await listFinalizedGameResults(listInput());

    expect(result).toMatchObject({
      status: 'partial',
      data: {
        records: [
          {
            completeness: 'partial',
            missingFields: ['total-points'],
            players: [{ totalPoints: null }, { totalPoints: 0 }],
            provenance: {
              kind: 'imported',
              importStatus: 'finalized',
            },
          },
        ],
        coverage: { recordsMissingRequiredData: 1 },
      },
      warnings: expect.arrayContaining([
        expect.objectContaining({ code: 'partial-records' }),
      ]),
    });
  });

  it('uses game RLS for a single result and does not reveal an unreadable game', async () => {
    const { traces } = installClient({
      responses: {
        games: [{ data: null, error: null }],
      },
    });
    const result = await getFinalizedGameResult({
      scope: { type: 'game', gameId: IDS.gameOne },
      authorization: {
        kind: 'current-user',
        requiredAccess: 'readable-game',
      },
    });

    expect(result).toMatchObject({
      status: 'error',
      error: { category: 'not-found' },
    });
    expect(traces.map((trace) => trace.table)).toEqual(['games']);
  });

  it('returns one normalized readable game without a membership-side query', async () => {
    const { traces } = installClient({
      responses: {
        games: [{ data: rawGame(), error: null }],
        game_players: [{ data: rawPlayers(), error: null }],
        game_log_imports: [{ data: [], error: null }],
      },
    });
    const result = await getFinalizedGameResult({
      scope: { type: 'game', gameId: IDS.gameOne },
      authorization: {
        kind: 'current-user',
        requiredAccess: 'readable-game',
      },
    });

    expect(result).toMatchObject({
      status: 'ready',
      query: {
        scope: { type: 'game', gameId: IDS.gameOne },
        pagination: { kind: 'none' },
        authorizationBoundary: 'current-user-rls',
      },
      data: { records: [{ gameId: IDS.gameOne }] },
    });
    expect(traces.map((trace) => trace.table)).toEqual([
      'games',
      'game_players',
      'game_log_imports',
    ]);
  });

  it('honors an already-aborted request before opening a database client', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await listFinalizedGameResults({
      ...listInput(),
      execution: { signal: controller.signal },
    });

    expect(result).toMatchObject({
      status: 'error',
      error: { category: 'aborted-request', retryable: false },
    });
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });
});
