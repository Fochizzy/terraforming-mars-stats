import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  claimSavedPlayerProfile,
  listClaimablePlayerProfiles,
  resolveSavedPlayerAutoClaim,
} from './player-claim-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('player claim repo', () => {
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);
  });

  it('claims every exact match in one call when at least one exact match exists', async () => {
    rpc
      .mockResolvedValueOnce({
        data: [
          {
            exact_match: true,
            group_id: 'group-1',
            group_name: 'Mars Club',
            match_reason: 'exact',
            player_id: 'player-1',
            player_name: 'Friday Mars',
          },
          {
            exact_match: true,
            group_id: 'group-2',
            group_name: 'Second Table',
            match_reason: 'exact',
            player_id: 'player-2',
            player_name: 'Friday Mars',
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            group_id: 'group-1',
            group_name: 'Mars Club',
            player_name: 'Friday Mars',
          },
          {
            group_id: 'group-2',
            group_name: 'Second Table',
            player_name: 'Friday Mars',
          },
        ],
        error: null,
      });

    await expect(resolveSavedPlayerAutoClaim()).resolves.toEqual({
      groups: [
        { groupId: 'group-1', groupName: 'Mars Club' },
        { groupId: 'group-2', groupName: 'Second Table' },
      ],
      playerName: 'Friday Mars',
      status: 'claimed-and-joined',
    });

    expect(rpc).toHaveBeenNthCalledWith(2, 'claim_player_profiles_by_name');
  });

  it('returns manual claim candidates when only partial matches exist', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          exact_match: false,
          group_id: 'group-2',
          group_name: 'Second Table',
          match_reason: 'partial',
          player_id: 'player-2',
          player_name: 'Friday M',
        },
      ],
      error: null,
    });

    await expect(resolveSavedPlayerAutoClaim()).resolves.toEqual({
      candidates: [
        {
          exactMatch: false,
          groupId: 'group-2',
          groupName: 'Second Table',
          matchReason: 'partial',
          playerId: 'player-2',
          playerName: 'Friday M',
        },
      ],
      status: 'needs-manual-claim',
    });

    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('maps claimable player rows into app-friendly candidates', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          exact_match: false,
          group_id: 'group-2',
          group_name: 'Second Table',
          match_reason: 'partial',
          player_id: 'player-2',
          player_name: 'Friday M',
        },
      ],
      error: null,
    });

    await expect(listClaimablePlayerProfiles()).resolves.toEqual([
      {
        exactMatch: false,
        groupId: 'group-2',
        groupName: 'Second Table',
        matchReason: 'partial',
        playerId: 'player-2',
        playerName: 'Friday M',
      },
    ]);
  });

  it('calls the claim rpc with the selected player id', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          group_id: 'group-1',
          group_name: 'Mars Club',
          player_name: 'Friday Mars',
        },
      ],
      error: null,
    });

    await expect(claimSavedPlayerProfile('player-1')).resolves.toEqual({
      groupId: 'group-1',
      groupName: 'Mars Club',
      playerName: 'Friday Mars',
      status: 'claimed-and-joined',
    });

    expect(rpc).toHaveBeenCalledWith('claim_player_profile', {
      p_player_id: 'player-1',
    });
  });
});
