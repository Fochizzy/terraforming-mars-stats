import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getProfileAnalytics } from './analytics-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('getProfileAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty linked-profile state when analytics rows are absent', async () => {
    const playersOrderByDisplayName = vi.fn().mockResolvedValue({
      data: [{ display_name: 'Friday Mars', id: 'player-1' }],
      error: null,
    });
    const playersOrderByCreatedAt = vi.fn().mockReturnValue({
      order: playersOrderByDisplayName,
    });
    const playersEqLinkedUserId = vi.fn().mockReturnValue({
      order: playersOrderByCreatedAt,
    });
    const playersSelect = vi.fn().mockReturnValue({
      eq: playersEqLinkedUserId,
    });

    const analyticsIn = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const analyticsSelect = vi.fn().mockReturnValue({
      in: analyticsIn,
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'players') {
          return {
            select: playersSelect,
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
            if (table === 'player_game_results') {
              return {
                select: analyticsSelect,
              };
            }

            throw new Error(`Unexpected analytics table ${table}`);
          }),
        };
      }),
    } as never);

    await expect(getProfileAnalytics('user-1')).resolves.toEqual({
      coverage: null,
      headToHeadRows: [],
      performance: null,
      playerId: 'player-1',
      playerName: 'Friday Mars',
      scoreAverages: null,
      styleAgreement: null,
    });
  });
});
