import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { linkPlayerToUser } from './player-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('linkPlayerToUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears the current group link before claiming the selected player', async () => {
    const targetMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        display_name: 'Friday Mars',
        id: 'player-2',
        linked_user_id: null,
      },
      error: null,
    });
    const targetEqId = vi.fn().mockReturnValue({ maybeSingle: targetMaybeSingle });
    const targetEqGroup = vi.fn().mockReturnValue({ eq: targetEqId });
    const targetSelect = vi.fn().mockReturnValue({ eq: targetEqGroup });

    const clearEqLinkedUser = vi.fn().mockResolvedValue({ error: null });
    const clearEqGroup = vi.fn().mockReturnValue({ eq: clearEqLinkedUser });
    const clearUpdate = vi.fn().mockReturnValue({ eq: clearEqGroup });

    const updateSingle = vi.fn().mockResolvedValue({
      data: {
        display_name: 'Friday Mars',
        id: 'player-2',
        linked_user_id: 'user-1',
      },
      error: null,
    });
    const updateSelect = vi.fn().mockReturnValue({ single: updateSingle });
    const updateEqId = vi.fn().mockReturnValue({ select: updateSelect });
    const updateEqGroup = vi.fn().mockReturnValue({ eq: updateEqId });
    const claimUpdate = vi.fn().mockReturnValue({ eq: updateEqGroup });

    const from = vi
      .fn()
      .mockReturnValueOnce({ select: targetSelect })
      .mockReturnValueOnce({ update: clearUpdate })
      .mockReturnValueOnce({ update: claimUpdate });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from,
    } as never);

    await expect(
      linkPlayerToUser({
        groupId: 'group-1',
        playerId: 'player-2',
        userId: 'user-1',
      }),
    ).resolves.toEqual({
      display_name: 'Friday Mars',
      id: 'player-2',
      linked_user_id: 'user-1',
    });

    expect(clearUpdate).toHaveBeenCalledWith({ linked_user_id: null });
    expect(clearEqGroup).toHaveBeenCalledWith('group_id', 'group-1');
    expect(clearEqLinkedUser).toHaveBeenCalledWith('linked_user_id', 'user-1');
    expect(claimUpdate).toHaveBeenCalledWith({ linked_user_id: 'user-1' });
    expect(updateEqGroup).toHaveBeenCalledWith('group_id', 'group-1');
    expect(updateEqId).toHaveBeenCalledWith('id', 'player-2');
  });

  it('rejects players that are already linked to someone else', async () => {
    const targetMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        display_name: 'Friday Mars',
        id: 'player-2',
        linked_user_id: 'user-2',
      },
      error: null,
    });
    const targetEqId = vi.fn().mockReturnValue({ maybeSingle: targetMaybeSingle });
    const targetEqGroup = vi.fn().mockReturnValue({ eq: targetEqId });
    const targetSelect = vi.fn().mockReturnValue({ eq: targetEqGroup });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({ select: targetSelect }),
    } as never);

    await expect(
      linkPlayerToUser({
        groupId: 'group-1',
        playerId: 'player-2',
        userId: 'user-1',
      }),
    ).rejects.toThrow(/already linked to another account/i);
  });
});
