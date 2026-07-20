import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { matchImportPlayerNames } from './import-player-resolution-repo';
import {
  createPlayerIfMissing,
  linkPlayerToUser,
  listPlayers,
} from './player-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('./import-player-resolution-repo', () => ({
  matchImportPlayerNames: vi.fn(),
}));

const INSUFFICIENT_PRIVILEGE = {
  code: '42501',
  message: 'permission denied for table players',
};

describe('listPlayers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('labels the roster through the public-name resolver, never the display columns', async () => {
    const playersOrder = vi.fn().mockResolvedValue({
      data: [
        { id: 'player-guest', linked_user_id: null },
        { id: 'player-izzy', linked_user_id: 'user-izzy' },
      ],
      error: null,
    });
    const playersEq = vi.fn().mockReturnValue({ order: playersOrder });
    const playersSelect = vi.fn().mockReturnValue({ eq: playersEq });
    const rpc = vi.fn(async (fn: string) => {
      if (fn !== 'get_public_player_names') {
        throw new Error(`Unexpected rpc ${fn}`);
      }

      return {
        data: [
          {
            is_linked: false,
            player_id: 'player-guest',
            public_name: 'Guest 5F2A',
          },
          {
            is_linked: true,
            player_id: 'player-izzy',
            public_name: 'fochizzy',
          },
        ],
        error: null,
      };
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn(() => ({ select: playersSelect })),
      rpc,
    } as never);

    await expect(listPlayers('group-1')).resolves.toEqual([
      { display_name: 'fochizzy', id: 'player-izzy', linked_user_id: 'user-izzy' },
      { display_name: 'Guest 5F2A', id: 'player-guest', linked_user_id: null },
    ]);

    // The roster read asks for ids and linkage only — no name columns.
    expect(playersSelect).toHaveBeenCalledWith('id, linked_user_id');
  });
});

describe('createPlayerIfMissing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function buildDirectProbe(result: { data: unknown; error: unknown }) {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(result),
    };
  }

  it('returns the existing roster player while the direct probe is still permitted', async () => {
    const probe = buildDirectProbe({
      data: { id: 'player-existing', linked_user_id: null },
      error: null,
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn(() => probe),
    } as never);

    await expect(
      createPlayerIfMissing({ displayName: 'Jenna', groupId: 'group-1' }),
    ).resolves.toEqual({
      display_name: 'Jenna',
      id: 'player-existing',
      linked_user_id: null,
    });

    expect(probe.eq).toHaveBeenCalledWith('normalized_display_name', 'jenna');
    expect(vi.mocked(matchImportPlayerNames)).not.toHaveBeenCalled();
  });

  it('falls back to the definer matcher when the display columns are restricted', async () => {
    const probe = buildDirectProbe({
      data: null,
      error: INSUFFICIENT_PRIVILEGE,
    });
    const groupCheck = buildDirectProbe({
      data: { id: 'player-existing', linked_user_id: null },
      error: null,
    });
    let playersCallCount = 0;

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn(() => {
        playersCallCount += 1;
        return playersCallCount === 1 ? probe : groupCheck;
      }),
    } as never);
    vi.mocked(matchImportPlayerNames).mockResolvedValue([
      {
        importedName: 'Jenna',
        matchReason: 'exact',
        playerId: 'player-existing',
        publicName: 'Guest 5F2A',
      },
    ]);

    await expect(
      createPlayerIfMissing({ displayName: 'Jenna', groupId: 'group-1' }),
    ).resolves.toEqual({
      display_name: 'Jenna',
      id: 'player-existing',
      linked_user_id: null,
    });

    // The matched player must be verified as part of this group's roster.
    expect(groupCheck.eq).toHaveBeenCalledWith('group_id', 'group-1');
    expect(groupCheck.eq).toHaveBeenCalledWith('id', 'player-existing');
  });

  it('creates the player when the restricted-era matcher finds only a cross-group person', async () => {
    const probe = buildDirectProbe({
      data: null,
      error: INSUFFICIENT_PRIVILEGE,
    });
    // The exact match exists, but in another group's roster.
    const groupCheck = buildDirectProbe({ data: null, error: null });
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'player-created', linked_user_id: null },
        error: null,
      }),
    };
    let playersCallCount = 0;

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn(() => {
        playersCallCount += 1;
        if (playersCallCount === 1) {
          return probe;
        }
        return playersCallCount === 2 ? groupCheck : insertChain;
      }),
    } as never);
    vi.mocked(matchImportPlayerNames).mockResolvedValue([
      {
        importedName: 'Jenna',
        matchReason: 'exact',
        playerId: 'player-in-other-group',
        publicName: 'Guest 77AA',
      },
    ]);

    await expect(
      createPlayerIfMissing({ displayName: 'Jenna', groupId: 'group-1' }),
    ).resolves.toEqual({
      display_name: 'Jenna',
      id: 'player-created',
      linked_user_id: null,
    });

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: 'Jenna',
        group_id: 'group-1',
      }),
    );
  });

  it('does not treat a partial restricted-era match as the same person', async () => {
    const probe = buildDirectProbe({
      data: null,
      error: INSUFFICIENT_PRIVILEGE,
    });
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'player-created', linked_user_id: null },
        error: null,
      }),
    };
    let playersCallCount = 0;

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn(() => {
        playersCallCount += 1;
        return playersCallCount === 1 ? probe : insertChain;
      }),
    } as never);
    vi.mocked(matchImportPlayerNames).mockResolvedValue([
      {
        importedName: 'Jenna',
        matchReason: 'partial',
        playerId: 'player-similar',
        publicName: 'Guest 5F2A',
      },
    ]);

    await expect(
      createPlayerIfMissing({ displayName: 'Jenna', groupId: 'group-1' }),
    ).resolves.toEqual({
      display_name: 'Jenna',
      id: 'player-created',
      linked_user_id: null,
    });
  });

  it('rethrows unexpected probe errors instead of swallowing them', async () => {
    const probe = buildDirectProbe({
      data: null,
      error: { code: '57014', message: 'statement timeout' },
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn(() => probe),
    } as never);

    await expect(
      createPlayerIfMissing({ displayName: 'Jenna', groupId: 'group-1' }),
    ).rejects.toMatchObject({ code: '57014' });
    expect(vi.mocked(matchImportPlayerNames)).not.toHaveBeenCalled();
  });
});

describe('linkPlayerToUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears the current group link before claiming the selected player', async () => {
    const targetMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'player-2', linked_user_id: null },
      error: null,
    });
    const targetEqId = vi.fn().mockReturnValue({ maybeSingle: targetMaybeSingle });
    const targetEqGroup = vi.fn().mockReturnValue({ eq: targetEqId });
    const targetSelect = vi.fn().mockReturnValue({ eq: targetEqGroup });

    const clearEqLinkedUser = vi.fn().mockResolvedValue({ error: null });
    const clearEqGroup = vi.fn().mockReturnValue({ eq: clearEqLinkedUser });
    const clearUpdate = vi.fn().mockReturnValue({ eq: clearEqGroup });

    const updateSingle = vi.fn().mockResolvedValue({
      data: { id: 'player-2', linked_user_id: 'user-1' },
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
    ).resolves.toEqual({ id: 'player-2', linked_user_id: 'user-1' });

    // No name column is selected on either side of the link.
    expect(targetSelect).toHaveBeenCalledWith('id, linked_user_id');
    expect(updateSelect).toHaveBeenCalledWith('id, linked_user_id');
    expect(clearUpdate).toHaveBeenCalledWith({ linked_user_id: null });
    expect(clearEqGroup).toHaveBeenCalledWith('group_id', 'group-1');
    expect(clearEqLinkedUser).toHaveBeenCalledWith('linked_user_id', 'user-1');
    expect(claimUpdate).toHaveBeenCalledWith({ linked_user_id: 'user-1' });
    expect(updateEqGroup).toHaveBeenCalledWith('group_id', 'group-1');
    expect(updateEqId).toHaveBeenCalledWith('id', 'player-2');
  });

  it('rejects players that are already linked to someone else', async () => {
    const targetMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'player-2', linked_user_id: 'user-2' },
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
