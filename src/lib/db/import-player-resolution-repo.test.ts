import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IMPORT_MATCHER_AUDIT_EVENT } from '@/lib/observability/import-matcher-audit';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listCurrentUserGroups } from './group-context-repo';
import {
  listImportResolutionPlayers,
  listImportResolutionPlayersForCurrentUser,
  matchImportPlayerNames,
} from './import-player-resolution-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('./group-context-repo', () => ({
  listCurrentUserGroups: vi.fn(),
}));

/**
 * `public.players.full_name` / `username` are not readable through the Data API
 * (they resolve to `permission denied for table players`). Import candidates
 * come from the `list_import_player_identity_candidates` security-definer RPC
 * instead, so these mocks fail loudly if the roster table is ever read again.
 */
function mockSupabase(input: {
  candidatesByGroupId: Record<
    string,
    Array<{ is_linked: boolean; player_id: string; public_name: string }>
  >;
  leaderboardRows?: Array<{ games_played: number; player_id: string }>;
}) {
  const rpc = vi.fn(async (fn: string, args: Record<string, unknown>) => {
    if (fn !== 'list_import_player_identity_candidates') {
      throw new Error(`Unexpected rpc ${fn}`);
    }

    const groupId = args.p_group_id as string;

    return {
      data: input.candidatesByGroupId[groupId] ?? [],
      error: null,
    };
  });

  const leaderboardResult = {
    data: input.leaderboardRows ?? [],
    error: null,
  };
  const leaderboardFilter = vi.fn().mockResolvedValue(leaderboardResult);
  const leaderboardSelect = vi.fn().mockReturnValue({
    eq: leaderboardFilter,
    in: leaderboardFilter,
  });

  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    from: vi.fn((table: string) => {
      throw new Error(`The Data API must not read ${table} for import review`);
    }),
    rpc,
    schema: vi.fn((schemaName: string) => {
      if (schemaName !== 'analytics') {
        throw new Error(`Unexpected schema ${schemaName}`);
      }

      return {
        from: vi.fn((table: string) => {
          if (table === 'group_leaderboard') {
            return { select: leaderboardSelect };
          }

          throw new Error(`Unexpected analytics table ${table}`);
        }),
      };
    }),
  } as never);

  return { rpc };
}

describe('listImportResolutionPlayers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('identifies a linked account by its username and joins games played', async () => {
    mockSupabase({
      candidatesByGroupId: {
        'group-1': [
          { is_linked: true, player_id: 'player-1', public_name: 'friday-mars' },
        ],
      },
      leaderboardRows: [{ games_played: 11, player_id: 'player-1' }],
    });

    await expect(listImportResolutionPlayers('group-1')).resolves.toEqual([
      {
        displayName: 'friday-mars',
        gamesPlayed: 11,
        id: 'player-1',
        linkedFullName: null,
        linkedUsername: 'friday-mars',
      },
    ]);
  });

  it('renders an unlinked guest by its neutral label and carries no personal name', async () => {
    mockSupabase({
      candidatesByGroupId: {
        'group-1': [
          {
            is_linked: false,
            player_id: 'player-2',
            public_name: 'Guest 5F2A1B3C',
          },
        ],
      },
    });

    await expect(listImportResolutionPlayers('group-1')).resolves.toEqual([
      {
        displayName: 'Guest 5F2A1B3C',
        gamesPlayed: 0,
        id: 'player-2',
        linkedFullName: null,
        linkedUsername: null,
      },
    ]);
  });

  it('requests candidates for the given group only', async () => {
    const { rpc } = mockSupabase({ candidatesByGroupId: { 'group-1': [] } });

    await listImportResolutionPlayers('group-1');

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('list_import_player_identity_candidates', {
      p_group_id: 'group-1',
    });
  });
});

describe('listImportResolutionPlayersForCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pools candidates across every group the user plays in', async () => {
    vi.mocked(listCurrentUserGroups).mockResolvedValue([
      { groupId: 'group-1' },
      { groupId: 'group-2' },
    ] as never);
    const { rpc } = mockSupabase({
      candidatesByGroupId: {
        'group-1': [
          { is_linked: true, player_id: 'player-1', public_name: 'ada' },
        ],
        'group-2': [
          { is_linked: false, player_id: 'player-2', public_name: 'Guest 99AA' },
        ],
      },
      leaderboardRows: [{ games_played: 3, player_id: 'player-1' }],
    });

    await expect(listImportResolutionPlayersForCurrentUser()).resolves.toEqual([
      {
        canonicalKey: 'username:ada',
        displayName: 'ada',
        gamesPlayed: 3,
        id: 'player-1',
        linkedFullName: null,
        linkedUsername: 'ada',
      },
      {
        canonicalKey: 'player:player-2',
        displayName: 'Guest 99AA',
        gamesPlayed: 0,
        id: 'player-2',
        linkedFullName: null,
        linkedUsername: null,
      },
    ]);
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it('returns nothing when the user belongs to no group', async () => {
    vi.mocked(listCurrentUserGroups).mockResolvedValue([] as never);

    await expect(listImportResolutionPlayersForCurrentUser()).resolves.toEqual(
      [],
    );
  });
});

describe('matchImportPlayerNames', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockMatcher(
    rows: Array<{
      imported_name: string;
      match_reason: string;
      player_id: string;
      public_name: string;
    }>,
    options: { rpcError?: unknown; userId?: string | null } = {},
  ) {
    const rpc = vi.fn(
      async (fn: string, ...rest: Array<Record<string, unknown>>) => {
        void rest;
        if (fn !== 'match_import_player_names') {
          throw new Error(`Unexpected rpc ${fn}`);
        }

        return options.rpcError
          ? { data: null, error: options.rpcError }
          : { data: rows, error: null };
      },
    );
    const getUser = vi.fn(async () => ({
      data: {
        user:
          options.userId === null
            ? null
            : { id: options.userId ?? 'user-analyst' },
      },
      error: null,
    }));

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser },
      from: vi.fn((table: string) => {
        throw new Error(`The Data API must not read ${table} for matching`);
      }),
      rpc,
    } as never);

    return { rpc };
  }

  /** The single audit line `matchImportPlayerNames` emitted, parsed. */
  function readAuditRecords(info: ReturnType<typeof spyOnConsoleInfo>) {
    return info.mock.calls
      .map((call) => call[0])
      .filter((line): line is string => typeof line === 'string')
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((record) => record.event === IMPORT_MATCHER_AUDIT_EVENT);
  }

  function spyOnConsoleInfo() {
    return vi.spyOn(console, 'info').mockImplementation(() => undefined);
  }

  it("coarsens today's fine-grained reasons so no matching axis escapes the repository", async () => {
    mockMatcher([
      {
        imported_name: 'Izzy',
        match_reason: 'display_name_exact',
        player_id: 'player-1',
        public_name: 'fochizzy',
      },
      {
        imported_name: 'Corey',
        match_reason: 'full_name_exact',
        player_id: 'player-2',
        public_name: 'lurker',
      },
      {
        imported_name: 'Jenna',
        match_reason: 'alias_exact',
        player_id: 'player-3',
        public_name: 'Guest 5F2A',
      },
      {
        imported_name: 'Jam',
        match_reason: 'full_name_partial',
        player_id: 'player-4',
        public_name: 'revloki',
      },
    ]);

    const matches = await matchImportPlayerNames('group-1', [
      'Izzy',
      'Corey',
      'Jenna',
      'Jam',
    ]);

    expect(matches.map((match) => match.matchReason)).toEqual([
      'exact',
      'exact',
      'exact',
      'partial',
    ]);
    expect(JSON.stringify(matches)).not.toMatch(
      /display_name|full_name|alias|username_/,
    );
  });

  it('passes the future coarse response through unchanged', async () => {
    mockMatcher([
      {
        imported_name: 'Izzy',
        match_reason: 'exact',
        player_id: 'player-1',
        public_name: 'fochizzy',
      },
      {
        imported_name: 'Jam',
        match_reason: 'partial',
        player_id: 'player-2',
        public_name: 'revloki',
      },
    ]);

    await expect(
      matchImportPlayerNames('group-1', ['Izzy', 'Jam']),
    ).resolves.toEqual([
      {
        importedName: 'Izzy',
        matchReason: 'exact',
        playerId: 'player-1',
        publicName: 'fochizzy',
      },
      {
        importedName: 'Jam',
        matchReason: 'partial',
        playerId: 'player-2',
        publicName: 'revloki',
      },
    ]);
  });

  it('ranks an unrecognized reason as partial so it stays reviewable', async () => {
    mockMatcher([
      {
        imported_name: 'Izzy',
        match_reason: 'some_future_reason',
        player_id: 'player-1',
        public_name: 'fochizzy',
      },
    ]);

    const [match] = await matchImportPlayerNames('group-1', ['Izzy']);

    expect(match?.matchReason).toBe('partial');
  });

  it('bounds the request to what a single game can name, and never sends the excess', async () => {
    const { rpc } = mockMatcher([]);
    const names = Array.from({ length: 80 }, (_, index) => `Player ${index}`);

    // Previously this sliced to 64 and asked anyway. A game has at most five
    // players and the evidence can spell each of them two ways, so eleven
    // distinct names did not come from one game.
    await expect(
      matchImportPlayerNames('group-1', names),
    ).rejects.toThrow(/at most 5/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('accepts both spellings of a full five-player game', async () => {
    const { rpc } = mockMatcher([]);
    const names = [
      ...Array.from({ length: 5 }, (_, index) => `Player ${index}`),
      ...Array.from({ length: 5 }, (_, index) => `Player ${index} Surname`),
    ];

    await expect(matchImportPlayerNames('group-1', names)).resolves.toEqual([]);

    const submitted = rpc.mock.calls[0]?.[1] as
      | { p_imported_names: string[] }
      | undefined;

    expect(submitted?.p_imported_names).toHaveLength(10);
  });

  it('rejects an overlong name instead of silently dropping it', async () => {
    const { rpc } = mockMatcher([]);

    await expect(
      matchImportPlayerNames('group-1', ['   ', 'y'.repeat(200)]),
    ).rejects.toThrow(/longer than 128 characters/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('records a successful invocation with the requester, group and counts', async () => {
    const info = spyOnConsoleInfo();
    mockMatcher([
      {
        imported_name: 'Izzy',
        match_reason: 'exact',
        player_id: 'player-1',
        public_name: 'fochizzy',
      },
    ]);

    await matchImportPlayerNames('group-7', ['Izzy', 'Jam'], 'import_analyze');

    expect(readAuditRecords(info)).toEqual([
      {
        candidateNameCount: 2,
        errorCode: null,
        event: IMPORT_MATCHER_AUDIT_EVENT,
        groupId: 'group-7',
        matchCount: 1,
        outcome: 'matched',
        source: 'import_analyze',
        userId: 'user-analyst',
      },
    ]);
  });

  it('never writes a candidate name or a matched label into the audit line', async () => {
    const info = spyOnConsoleInfo();
    mockMatcher([
      {
        imported_name: 'Jenna Kass',
        match_reason: 'full_name_exact',
        player_id: 'player-guest',
        public_name: 'Guest 5F2A',
      },
    ]);

    await matchImportPlayerNames(
      'group-7',
      ['Jenna Kass'],
      'log_game_player_resolution',
    );

    const serialized = JSON.stringify(readAuditRecords(info));

    expect(serialized).not.toContain('Jenna');
    expect(serialized).not.toContain('Kass');
    expect(serialized).not.toContain('Guest 5F2A');
  });

  it('records a rejected probe, so an over-limit request is not silent', async () => {
    const info = spyOnConsoleInfo();
    mockMatcher([]);
    const names = Array.from({ length: 64 }, (_, index) => `Probe ${index}`);

    await expect(
      matchImportPlayerNames('group-7', names, 'import_analyze'),
    ).rejects.toThrow();

    expect(readAuditRecords(info)).toEqual([
      {
        candidateNameCount: 64,
        errorCode: 'Error',
        event: IMPORT_MATCHER_AUDIT_EVENT,
        groupId: 'group-7',
        matchCount: 0,
        outcome: 'rejected',
        source: 'import_analyze',
        userId: 'user-analyst',
      },
    ]);
    expect(JSON.stringify(readAuditRecords(info))).not.toContain('Probe');
  });

  it('records a failed invocation with the code but not the error message', async () => {
    const info = spyOnConsoleInfo();
    mockMatcher([], {
      rpcError: {
        code: '42501',
        message: 'permission denied for function match_import_player_names',
      },
    });

    await expect(matchImportPlayerNames('group-7', ['Izzy'])).rejects.toEqual(
      expect.objectContaining({ code: '42501' }),
    );

    expect(readAuditRecords(info)).toEqual([
      {
        candidateNameCount: 1,
        errorCode: '42501',
        event: IMPORT_MATCHER_AUDIT_EVENT,
        groupId: 'group-7',
        matchCount: 0,
        outcome: 'failed',
        source: 'unspecified',
        userId: 'user-analyst',
      },
    ]);
  });

  it('still records the invocation when the session id cannot be resolved', async () => {
    const info = spyOnConsoleInfo();
    mockMatcher([], { userId: null });

    await matchImportPlayerNames('group-7', ['Izzy']);

    expect(readAuditRecords(info)[0]).toMatchObject({
      outcome: 'matched',
      userId: null,
    });
  });
});
