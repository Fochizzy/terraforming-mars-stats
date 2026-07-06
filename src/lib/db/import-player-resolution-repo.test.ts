import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listImportResolutionPlayers } from './import-player-resolution-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}));

describe('listImportResolutionPlayers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enriches roster players with linked full names, usernames, and games played', async () => {
    const playerOrder = vi.fn().mockResolvedValue({
      data: [
        {
          display_name: 'Friday Mars',
          id: 'player-1',
          linked_user_id: 'user-1',
        },
        {
          display_name: 'Second Seat',
          id: 'player-2',
          linked_user_id: null,
        },
      ],
      error: null,
    });
    const playerEq = vi.fn().mockReturnValue({ order: playerOrder });
    const playerSelect = vi.fn().mockReturnValue({ eq: playerEq });
    const leaderboardEq = vi.fn().mockResolvedValue({
      data: [
        { games_played: 11, player_id: 'player-1' },
        { games_played: 4, player_id: 'player-2' },
      ],
      error: null,
    });
    const leaderboardSelect = vi.fn().mockReturnValue({ eq: leaderboardEq });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'players') {
          return {
            select: playerSelect,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      schema: vi.fn((schemaName: string) => {
        if (schemaName !== 'analytics') {
          throw new Error(`Unexpected schema ${schemaName}`);
        }

        return {
          from: vi.fn((table: string) => {
            if (table === 'group_leaderboard') {
              return {
                eq: leaderboardEq,
                select: leaderboardSelect,
              };
            }

            throw new Error(`Unexpected analytics table ${table}`);
          }),
        };
      }),
    } as never);

    const profileIn = vi.fn().mockResolvedValue({
      data: [
        {
          full_name: 'Friday Mars',
          user_id: 'user-1',
          username: 'friday-mars',
        },
      ],
      error: null,
    });
    const profileSelect = vi.fn().mockReturnValue({ in: profileIn });

    vi.mocked(createSupabaseAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'user_profiles') {
          return {
            in: profileIn,
            select: profileSelect,
          };
        }

        throw new Error(`Unexpected admin table ${table}`);
      }),
    } as never);

    await expect(listImportResolutionPlayers('group-1')).resolves.toEqual([
      {
        displayName: 'Friday Mars',
        gamesPlayed: 11,
        id: 'player-1',
        linkedFullName: 'Friday Mars',
        linkedUsername: 'friday-mars',
      },
      {
        displayName: 'Second Seat',
        gamesPlayed: 4,
        id: 'player-2',
        linkedFullName: null,
        linkedUsername: null,
      },
    ]);
  });

  it('falls back to roster names and play counts when the admin client is unavailable', async () => {
    const playerOrder = vi.fn().mockResolvedValue({
      data: [
        {
          display_name: 'Friday Mars',
          id: 'player-1',
          linked_user_id: 'user-1',
        },
      ],
      error: null,
    });
    const playerEq = vi.fn().mockReturnValue({ order: playerOrder });
    const playerSelect = vi.fn().mockReturnValue({ eq: playerEq });
    const leaderboardEq = vi.fn().mockResolvedValue({
      data: [{ games_played: 11, player_id: 'player-1' }],
      error: null,
    });
    const leaderboardSelect = vi.fn().mockReturnValue({ eq: leaderboardEq });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'players') {
          return {
            select: playerSelect,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      schema: vi.fn(() => ({
        from: vi.fn(() => ({
          eq: leaderboardEq,
          select: leaderboardSelect,
        })),
      })),
    } as never);

    vi.mocked(createSupabaseAdminClient).mockImplementation(() => {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for web import group matching.');
    });

    await expect(listImportResolutionPlayers('group-1')).resolves.toEqual([
      {
        displayName: 'Friday Mars',
        gamesPlayed: 11,
        id: 'player-1',
        linkedFullName: null,
        linkedUsername: null,
      },
    ]);
  });
});
