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

  it('loads group settings without querying removed expansion tables', async () => {
    const groupId = '550e8400-e29b-41d4-a716-446655440000';
    const from = vi.fn((table: string) => {
      if (table === 'groups') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { name: 'Weeknight Mars' },
                error: null,
              }),
            })),
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

    vi.mocked(createSupabaseServerClient).mockResolvedValue({ from } as never);

    await expect(getGroupSettings(groupId)).resolves.toEqual({
      defaultMapId: 'map-tharsis',
      defaultPromoSetSlugs: [],
      globalAnalyticsEnabled: true,
      groupId,
      groupName: 'Weeknight Mars',
    });
    expect(from.mock.calls.map(([table]) => table)).toEqual([
      'groups',
      'group_settings',
      'group_default_promo_sets',
    ]);
  });
});
