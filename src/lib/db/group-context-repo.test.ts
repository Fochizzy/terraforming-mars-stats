import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentGroupContext, listCurrentUserGroups } from './group-context-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

/**
 * A membership-sync client whose RPC `group_name` column is a hostile
 * private-name concatenation, and whose roster/label rpc resolves the
 * privacy-safe labels the resolver must return instead.
 */
function mockGroupMembershipClient(input: {
  memberships: Array<{ group_id: string; group_name: string; role: string }>;
  rosterByGroupId: Record<string, string[]>;
  labelByPlayerId: Record<string, string>;
  userId?: string;
  profileQuery?: unknown;
}) {
  const rosterRows = Object.entries(input.rosterByGroupId).flatMap(
    ([groupId, playerIds]) =>
      playerIds.map((playerId) => ({ group_id: groupId, id: playerId })),
  );

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: input.userId ?? 'user-1' } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'players') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: rosterRows, error: null }),
          }),
        };
      }

      if (table === 'user_profiles' && input.profileQuery) {
        return input.profileQuery;
      }

      throw new Error(`Unexpected table ${table}`);
    }),
    rpc: vi.fn((fn: string, args?: Record<string, unknown>) => {
      if (fn === 'sync_current_user_played_group_memberships') {
        return Promise.resolve({ data: input.memberships, error: null });
      }

      if (fn === 'get_public_player_names') {
        const requestedIds = (args?.p_player_ids as string[]) ?? [];
        return Promise.resolve({
          data: requestedIds.map((playerId) => ({
            is_linked: true,
            player_id: playerId,
            public_name: input.labelByPlayerId[playerId] ?? null,
          })),
          error: null,
        });
      }

      throw new Error(`Unexpected rpc ${fn}`);
    }),
  };
}

describe('getCurrentGroupContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves group names from the roster public labels, never the rpc private-name column', async () => {
    // Distinctive values that could only appear in the result if the RPC's
    // raw group_name column leaked through.
    const SENTINEL_1 = 'Xyzzy-Private-Fullname-One / Xyzzy-Private-Fullname-Two';
    const SENTINEL_2 = 'Xyzzy-Private-Fullname-Three / Xyzzy-Private-Fullname-Four';

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockGroupMembershipClient({
        memberships: [
          { group_id: 'group-1', group_name: SENTINEL_1, role: 'editor' },
          { group_id: 'group-2', group_name: SENTINEL_2, role: 'viewer' },
        ],
        rosterByGroupId: {
          'group-1': ['player-a', 'player-b'],
          'group-2': ['player-c'],
        },
        labelByPlayerId: {
          'player-a': 'fochizzy',
          'player-b': 'Guest 5BDB6ED1',
          'player-c': 'suzythegnat',
        },
      }) as never,
    );

    const result = await listCurrentUserGroups();

    expect(result).toEqual([
      {
        groupId: 'group-1',
        groupName: 'fochizzy / Guest 5BDB6ED1',
        role: 'editor',
      },
      {
        groupId: 'group-2',
        groupName: 'suzythegnat',
        role: 'viewer',
      },
    ]);

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('Xyzzy-Private-Fullname');
  });

  it('prefers the user profile last active group when it matches a membership', async () => {
    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { last_active_group_id: 'group-2' },
        error: null,
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockGroupMembershipClient({
        memberships: [
          { group_id: 'group-1', group_name: 'raw stored name 1', role: 'viewer' },
          { group_id: 'group-2', group_name: 'raw stored name 2', role: 'editor' },
        ],
        rosterByGroupId: {
          'group-1': ['player-a'],
          'group-2': ['player-b'],
        },
        labelByPlayerId: {
          'player-a': 'First Group',
          'player-b': 'Second Group',
        },
        profileQuery,
      }) as never,
    );

    await expect(getCurrentGroupContext()).resolves.toEqual({
      groupId: 'group-2',
      groupName: 'Second Group',
      role: 'editor',
      userId: 'user-1',
    });
  });

  it('falls back to the earliest membership when no active group is saved', async () => {
    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockGroupMembershipClient({
        memberships: [
          { group_id: 'group-1', group_name: 'raw stored name 1', role: 'owner' },
          { group_id: 'group-2', group_name: 'raw stored name 2', role: 'editor' },
        ],
        rosterByGroupId: {
          'group-1': ['player-a'],
          'group-2': ['player-b'],
        },
        labelByPlayerId: {
          'player-a': 'First Group',
          'player-b': 'Second Group',
        },
        profileQuery,
      }) as never,
    );

    await expect(getCurrentGroupContext()).resolves.toEqual({
      groupId: 'group-1',
      groupName: 'First Group',
      role: 'owner',
      userId: 'user-1',
    });
  });

  it('treats a missing auth session as signed out instead of throwing', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { name: 'AuthSessionMissingError' },
        }),
      },
    } as never);

    await expect(getCurrentGroupContext()).resolves.toBeNull();
  });

  it('returns no groups when the session is missing', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { name: 'AuthSessionMissingError' },
        }),
      },
    } as never);

    await expect(listCurrentUserGroups()).resolves.toEqual([]);
  });

  it('treats an invalid refresh token as signed out instead of throwing', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: {
            name: 'AuthApiError',
            code: 'refresh_token_not_found',
            status: 400,
          },
        }),
      },
    } as never);

    await expect(getCurrentGroupContext()).resolves.toBeNull();
  });
});
