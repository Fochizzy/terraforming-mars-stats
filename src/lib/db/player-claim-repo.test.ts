import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  claimAllExactPlayerProfiles,
  claimSavedPlayerProfile,
  listClaimablePlayerProfiles,
  loadClaimCandidates,
  resolveSavedPlayerAutoClaim,
} from './player-claim-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

// A hostile stand-in for a private-name concatenation returned by the claim
// RPCs' raw `group_name` column — it must never reach a resolved result.
const SENTINEL_RAW_GROUP_NAME = 'Xyzzy-Private-Fullname-One / Xyzzy-Private-Fullname-Two';

describe('player claim repo', () => {
  const rpc = vi.fn();
  const from = vi.fn();
  const getUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser },
      from,
      rpc,
    } as never);
  });

  /** Roster stub for `resolvePublicGroupLabels`' `players` read + label rpc. */
  function mockRosterAndLabels(
    rosterByGroupId: Record<string, string[]>,
    labelByPlayerId: Record<string, string>,
  ) {
    const rosterRows = Object.entries(rosterByGroupId).flatMap(
      ([groupId, playerIds]) =>
        playerIds.map((playerId) => ({ group_id: groupId, id: playerId })),
    );

    from.mockImplementation((table: string) => {
      if (table === 'players') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: rosterRows, error: null }),
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    rpc.mockImplementation((fn: string, args?: Record<string, unknown>) => {
      if (fn === 'get_public_player_names') {
        const requestedIds = (args?.p_player_ids as string[]) ?? [];
        return Promise.resolve({
          data: requestedIds.map((playerId) => ({
            is_linked: true,
            player_id: playerId,
            public_name: labelByPlayerId[playerId] ?? null,
          })),
          error: null,
        });
      }

      throw new Error(`Unexpected rpc ${fn} in roster stub`);
    });
  }

  it('claims every exact match in one call and resolves group names from the post-claim roster, not the rpc private-name column', async () => {
    mockRosterAndLabels(
      { 'group-1': ['player-a'], 'group-2': ['player-b'] },
      { 'player-a': 'fochizzy', 'player-b': 'suzythegnat' },
    );
    rpc.mockImplementationOnce((fn: string) => {
      if (fn !== 'list_claimable_player_profiles') {
        throw new Error(`Unexpected first rpc call ${fn}`);
      }

      return Promise.resolve({
        data: [
          {
            exact_match: true,
            group_id: 'group-1',
            group_name: SENTINEL_RAW_GROUP_NAME,
            match_reason: 'exact',
            player_id: 'player-1',
            player_name: 'Friday Mars',
          },
          {
            exact_match: true,
            group_id: 'group-2',
            group_name: SENTINEL_RAW_GROUP_NAME,
            match_reason: 'exact',
            player_id: 'player-2',
            player_name: 'Friday Mars',
          },
        ],
        error: null,
      });
    });
    rpc.mockImplementationOnce((fn: string) => {
      if (fn !== 'claim_player_profiles_by_name') {
        throw new Error(`Unexpected second rpc call ${fn}`);
      }

      return Promise.resolve({
        data: [
          {
            group_id: 'group-1',
            group_name: SENTINEL_RAW_GROUP_NAME,
            player_name: 'Friday Mars',
          },
          {
            group_id: 'group-2',
            group_name: SENTINEL_RAW_GROUP_NAME,
            player_name: 'Friday Mars',
          },
        ],
        error: null,
      });
    });

    const result = await resolveSavedPlayerAutoClaim();

    expect(result).toEqual({
      groups: [
        { groupId: 'group-1', groupName: 'fochizzy' },
        { groupId: 'group-2', groupName: 'suzythegnat' },
      ],
      playerName: 'Friday Mars',
      status: 'claimed-and-joined',
    });
    expect(JSON.stringify(result)).not.toContain('Xyzzy-Private-Fullname');
  });

  it('returns manual claim candidates without any group name, exact or resolved', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          exact_match: false,
          group_id: 'group-2',
          group_name: SENTINEL_RAW_GROUP_NAME,
          match_reason: 'partial',
          player_id: 'player-2',
          player_name: 'Friday M',
        },
      ],
      error: null,
    });

    const result = await resolveSavedPlayerAutoClaim();

    expect(result).toEqual({
      candidates: [
        {
          exactMatch: false,
          groupId: 'group-2',
          matchReason: 'partial',
          playerId: 'player-2',
          playerName: 'Friday M',
        },
      ],
      status: 'needs-manual-claim',
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain('Xyzzy-Private-Fullname');
  });

  it('maps claimable player rows into app-friendly candidates without a group name', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          exact_match: false,
          group_id: 'group-2',
          group_name: SENTINEL_RAW_GROUP_NAME,
          match_reason: 'partial',
          player_id: 'player-2',
          player_name: 'Friday M',
        },
      ],
      error: null,
    });

    const result = await listClaimablePlayerProfiles();

    expect(result).toEqual([
      {
        exactMatch: false,
        groupId: 'group-2',
        matchReason: 'partial',
        playerId: 'player-2',
        playerName: 'Friday M',
      },
    ]);
    expect(JSON.stringify(result)).not.toContain('Xyzzy-Private-Fullname');
  });

  it('calls the claim rpc with the selected player id and resolves the group name from the post-claim roster', async () => {
    mockRosterAndLabels(
      { 'group-1': ['player-a', 'player-b'] },
      { 'player-a': 'fochizzy', 'player-b': 'Guest 5BDB6ED1' },
    );
    rpc.mockImplementationOnce((fn: string, args: { p_player_id: string }) => {
      if (fn !== 'claim_player_profile' || args.p_player_id !== 'player-1') {
        throw new Error(`Unexpected claim rpc call ${fn}`);
      }

      return Promise.resolve({
        data: [
          {
            group_id: 'group-1',
            group_name: SENTINEL_RAW_GROUP_NAME,
            player_name: 'Friday Mars',
          },
        ],
        error: null,
      });
    });

    const result = await claimSavedPlayerProfile('player-1');

    expect(result).toEqual({
      groupId: 'group-1',
      groupName: 'fochizzy / Guest 5BDB6ED1',
      playerName: 'Friday Mars',
      status: 'claimed-and-joined',
    });
    expect(rpc).toHaveBeenCalledWith('claim_player_profile', {
      p_player_id: 'player-1',
    });
    expect(JSON.stringify(result)).not.toContain('Xyzzy-Private-Fullname');
  });

  it('claimAllExactPlayerProfiles resolves each returned group name from its post-claim roster', async () => {
    mockRosterAndLabels(
      { 'group-1': ['player-a'], 'group-2': ['player-b'] },
      { 'player-a': 'fochizzy', 'player-b': 'suzythegnat' },
    );
    rpc.mockImplementationOnce((fn: string) => {
      if (fn !== 'claim_player_profiles_by_name') {
        throw new Error(`Unexpected rpc call ${fn}`);
      }

      return Promise.resolve({
        data: [
          {
            group_id: 'group-1',
            group_name: SENTINEL_RAW_GROUP_NAME,
            player_name: 'Friday Mars',
          },
          {
            group_id: 'group-2',
            group_name: SENTINEL_RAW_GROUP_NAME,
            player_name: 'Friday Mars',
          },
        ],
        error: null,
      });
    });

    const result = await claimAllExactPlayerProfiles();

    expect(result).toEqual({
      groups: [
        { groupId: 'group-1', groupName: 'fochizzy' },
        { groupId: 'group-2', groupName: 'suzythegnat' },
      ],
      playerName: 'Friday Mars',
      status: 'claimed-and-joined',
    });
    expect(JSON.stringify(result)).not.toContain('Xyzzy-Private-Fullname');
  });
});

describe('loadClaimCandidates', () => {
  const rpc = vi.fn();
  const getUser = vi.fn();
  const consoleErrorSpy = vi.spyOn(console, 'error');

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy.mockImplementation(() => {});
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser },
      rpc,
    } as never);
  });

  it('returns status "available" with mapped candidates when the RPC succeeds with rows', async () => {
    rpc.mockResolvedValue({
      data: [
        {
          exact_match: true,
          group_id: 'group-1',
          match_reason: 'exact',
          player_id: 'player-1',
          player_name: 'Friday Mars',
        },
      ],
      error: null,
    });

    await expect(loadClaimCandidates()).resolves.toEqual({
      candidates: [
        {
          exactMatch: true,
          groupId: 'group-1',
          matchReason: 'exact',
          playerId: 'player-1',
          playerName: 'Friday Mars',
        },
      ],
      status: 'available',
    });
  });

  it('returns status "empty" (not "unavailable") for a genuine zero-row result', async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    await expect(loadClaimCandidates()).resolves.toEqual({ status: 'empty' });
  });

  it('returns status "unavailable" instead of throwing when the RPC errors (e.g. a missing grant)', async () => {
    rpc.mockRejectedValue(
      new Error('permission denied for function list_claimable_player_profiles'),
    );

    await expect(loadClaimCandidates()).resolves.toEqual({ status: 'unavailable' });
  });

  it('logs the real cause server-side for an unavailable result without throwing it to the caller', async () => {
    const realError = new Error(
      'permission denied for function list_claimable_player_profiles',
    );
    rpc.mockRejectedValue(realError);

    await loadClaimCandidates();

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), realError);
  });

  it('returns status "unauthorized" without calling the RPC when there is no valid session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(loadClaimCandidates()).resolves.toEqual({ status: 'unauthorized' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('returns status "unauthorized" when the session lookup itself errors', async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('invalid JWT'),
    });

    await expect(loadClaimCandidates()).resolves.toEqual({ status: 'unauthorized' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('never lets a raw error object escape into the resolved result (unavailable stays a plain status)', async () => {
    rpc.mockRejectedValue(
      Object.assign(new Error('permission denied'), { code: '42501' }),
    );

    const result = await loadClaimCandidates();

    expect(JSON.stringify(result)).not.toContain('42501');
    expect(JSON.stringify(result)).not.toContain('permission denied');
    expect(result).toEqual({ status: 'unavailable' });
  });
});
