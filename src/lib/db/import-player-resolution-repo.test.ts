import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listCurrentUserGroups } from './group-context-repo';
import {
  listImportResolutionPlayers,
  listImportResolutionPlayersForCurrentUser,
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
