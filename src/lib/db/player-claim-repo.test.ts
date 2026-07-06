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

  it('claims the saved player when exactly one exact match exists', async () => {
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
        ],
        error: null,
      });

    await expect(resolveSavedPlayerAutoClaim()).resolves.toEqual({
      groupId: 'group-1',
      groupName: 'Mars Club',
      playerName: 'Friday Mars',
      status: 'claimed-and-joined',
    });
  });

  it('returns manual claim candidates when more than one exact match exists', async () => {
    rpc.mockResolvedValueOnce({
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
    });

    await expect(resolveSavedPlayerAutoClaim()).resolves.toEqual({
      candidates: [
        {
          exactMatch: true,
          groupId: 'group-1',
          groupName: 'Mars Club',
          matchReason: 'exact',
          playerId: 'player-1',
          playerName: 'Friday Mars',
        },
        {
          exactMatch: true,
          groupId: 'group-2',
          groupName: 'Second Table',
          matchReason: 'exact',
          playerId: 'player-2',
          playerName: 'Friday Mars',
        },
      ],
      status: 'needs-manual-claim',
    });
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
