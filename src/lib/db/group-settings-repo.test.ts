import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { renameGroup } from './group-settings-repo';

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
