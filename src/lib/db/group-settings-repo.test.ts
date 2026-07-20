import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getGroupSettings, renameGroup } from './group-settings-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('renameGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates only the target group name', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Weeknight Mars',
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from,
    } as never);

    await expect(
      renameGroup({
        group_id: '550e8400-e29b-41d4-a716-446655440000',
        group_name: 'Weeknight Mars',
      }),
    ).resolves.toEqual({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Weeknight Mars',
    });

    expect(from).toHaveBeenCalledWith('groups');
    expect(update).toHaveBeenCalledWith({ name: 'Weeknight Mars' });
    expect(eq).toHaveBeenCalledWith(
      'id',
      '550e8400-e29b-41d4-a716-446655440000',
    );
  });
});

describe('getGroupSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads group settings from the public roster label, never a raw groups.name select', async () => {
    const groupId = '550e8400-e29b-41d4-a716-446655440000';
    const from = vi.fn((table: string) => {
      if (table === 'players') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: [{ group_id: groupId, id: 'player-a' }],
              error: null,
            }),
          })),
        };
      }

      if (table === 'group_settings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  default_map_id: 'map-tharsis',
                  global_analytics_enabled: true,
                },
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === 'group_default_promo_sets') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
    const rpc = vi.fn((fn: string, args: { p_player_ids: string[] }) => {
      if (fn !== 'get_public_player_names') {
        throw new Error(`Unexpected rpc ${fn}`);
      }

      return Promise.resolve({
        data: args.p_player_ids.map((playerId) => ({
          is_linked: true,
          player_id: playerId,
          public_name: playerId === 'player-a' ? 'Weeknight Mars' : null,
        })),
        error: null,
      });
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from,
      rpc,
    } as never);

    await expect(getGroupSettings(groupId)).resolves.toEqual({
      defaultMapId: 'map-tharsis',
      defaultPromoSetSlugs: [],
      globalAnalyticsEnabled: true,
      groupId,
      groupName: 'Weeknight Mars',
    });
    // A raw `groups.name` select must never be part of this read.
    expect(from.mock.calls.map(([table]) => table)).not.toContain('groups');
    expect(rpc).toHaveBeenCalledWith('get_public_player_names', {
      p_player_ids: ['player-a'],
    });
  });
});
