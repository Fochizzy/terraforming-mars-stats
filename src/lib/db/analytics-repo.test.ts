import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getProfileAnalytics, listGroupInteractions } from './analytics-repo';

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

  it('filters expansion mix interactions out of group analytics rows', async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [
        {
          average_placement: '1.4',
          average_score: '89.4',
          games_played: 5,
          group_id: 'group-1',
          interaction_type: 'map_expansion_mix',
          label: 'Hellas | Prelude',
          win_rate: '0.8',
          wins: 4,
        },
        {
          average_placement: '1.8',
          average_score: '82.1',
          games_played: 4,
          group_id: 'group-1',
          interaction_type: 'corporation_prelude_pair',
          label: 'Tharsis Republic | Allied Bank',
          win_rate: '0.5',
          wins: 2,
        },
      ],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn((tableName: string) => {
      if (tableName !== 'group_interactions') {
        throw new Error(`Unexpected analytics table ${tableName}`);
      }

      return { select };
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      schema: vi.fn((schemaName: string) => {
        if (schemaName !== 'analytics') {
          throw new Error(`Unexpected schema ${schemaName}`);
        }

        return { from };
      }),
    } as never);

    await expect(listGroupInteractions('group-1')).resolves.toEqual([
      {
        averagePlacement: 1.8,
        averageScore: 82.1,
        gamesPlayed: 4,
        groupId: 'group-1',
        interactionType: 'corporation_prelude_pair',
        label: 'Tharsis Republic | Allied Bank',
        winRate: 0.5,
        wins: 2,
      },
    ]);
  });
});
