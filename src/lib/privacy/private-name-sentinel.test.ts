import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  listImportResolutionPlayers,
  matchImportPlayerNames,
} from '@/lib/db/import-player-resolution-repo';
import { listPlayers } from '@/lib/db/player-repo';
import { applyServerPlayerMatches } from '@/lib/imports/apply-server-player-matches';
import { resolveImportPlayerLinks } from '@/lib/imports/resolve-import-player-links';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

/**
 * Distinctive values that could only appear in an output if a private
 * personal-name field leaked through. Each surface below is fed rows that
 * hostilely include them, and its serialized output must not contain them.
 */
const SENTINEL_FULL_NAME = 'Xyzzy-Private-Fullname-77';
const SENTINEL_ALIAS = 'Xyzzy-Private-Alias-88';
const SENTINEL_NORMALIZED = 'xyzzy-private-normalized-99';

function expectNoSentinels(serialized: string) {
  expect(serialized).not.toContain(SENTINEL_FULL_NAME);
  expect(serialized).not.toContain(SENTINEL_ALIAS);
  expect(serialized).not.toContain(SENTINEL_NORMALIZED);
}

describe('private personal names never reach public repository outputs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listPlayers drops hostile name columns and emits only public labels', async () => {
    const playersOrder = vi.fn().mockResolvedValue({
      data: [
        {
          // A row that hostilely carries every private column.
          display_name: SENTINEL_FULL_NAME,
          full_name: SENTINEL_FULL_NAME,
          id: 'player-guest',
          linked_user_id: null,
          normalized_display_name: SENTINEL_NORMALIZED,
          username: SENTINEL_ALIAS,
        },
      ],
      error: null,
    });
    const playersEq = vi.fn().mockReturnValue({ order: playersOrder });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({ eq: playersEq }),
      })),
      rpc: vi.fn(async () => ({
        data: [
          {
            is_linked: false,
            player_id: 'player-guest',
            public_name: 'Guest 5F2A',
          },
        ],
        error: null,
      })),
    } as never);

    const roster = await listPlayers('group-1');

    expect(roster).toEqual([
      { display_name: 'Guest 5F2A', id: 'player-guest', linked_user_id: null },
    ]);
    expectNoSentinels(JSON.stringify(roster));
  });

  it('listImportResolutionPlayers emits candidates without any personal-name field', async () => {
    const leaderboardFilter = vi.fn().mockResolvedValue({ data: [], error: null });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        throw new Error(`The Data API must not read ${table}`);
      }),
      rpc: vi.fn(async () => ({
        data: [
          {
            // Hostile extra fields beside the contract columns.
            full_name: SENTINEL_FULL_NAME,
            is_linked: false,
            normalized_full_name: SENTINEL_NORMALIZED,
            player_id: 'player-guest',
            public_name: 'Guest 5F2A',
          },
        ],
        error: null,
      })),
      schema: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: leaderboardFilter,
            in: leaderboardFilter,
          }),
        })),
      })),
    } as never);

    const candidates = await listImportResolutionPlayers('group-1');

    expectNoSentinels(JSON.stringify(candidates));
    expect(candidates[0]).toEqual({
      displayName: 'Guest 5F2A',
      gamesPlayed: 0,
      id: 'player-guest',
      linkedFullName: null,
      linkedUsername: null,
    });
  });

  it('matchImportPlayerNames emits only the coarse contract fields', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        throw new Error(`The Data API must not read ${table}`);
      }),
      rpc: vi.fn(async () => ({
        data: [
          {
            imported_name: 'Jenna',
            match_reason: 'full_name_exact',
            matched_alias_text: SENTINEL_ALIAS,
            matched_full_name: SENTINEL_FULL_NAME,
            player_id: 'player-guest',
            public_name: 'Guest 5F2A',
          },
        ],
        error: null,
      })),
    } as never);

    const matches = await matchImportPlayerNames('group-1', ['Jenna']);
    const serialized = JSON.stringify(matches);

    expectNoSentinels(serialized);
    // The fine-grained axis is coarsened before anything leaves the repo.
    expect(serialized).not.toContain('full_name');
    expect(Object.keys(matches[0]!).sort()).toEqual([
      'importedName',
      'matchReason',
      'playerId',
      'publicName',
    ]);
  });
});

describe('private personal names never reach serialized review payloads', () => {
  it('review links carry no personal names and no field-specific match axes', () => {
    // The candidate pool mirrors what the candidate RPC returns: public
    // labels only, with linkedFullName pinned to null.
    const resolved = resolveImportPlayerLinks(
      ['Jenna', 'fochizzy'],
      [
        {
          displayName: 'Guest 5F2A',
          gamesPlayed: 2,
          id: 'player-guest',
          linkedFullName: null,
          linkedUsername: null,
        },
        {
          displayName: 'fochizzy',
          gamesPlayed: 9,
          id: 'player-izzy',
          linkedFullName: null,
          linkedUsername: 'fochizzy',
        },
      ],
      [
        {
          aliasText: SENTINEL_ALIAS,
          normalizedAlias: 'jenna',
          playerId: 'player-guest',
          sourceType: 'game_log',
        },
      ],
    );
    const withServerVerdict = applyServerPlayerMatches(resolved.matches, [
      {
        importedName: 'Jenna',
        matchReason: 'exact',
        playerId: 'player-guest',
        publicName: 'Guest 5F2A',
      },
    ]);
    const serialized = JSON.stringify(withServerVerdict);

    expectNoSentinels(serialized);
    expect(serialized).not.toMatch(
      /display_name_exact|full_name_(exact|partial)|alias_exact|username_(exact|partial)|normalized_name/,
    );
    // The internal ranking score is itself private matching evidence: its
    // value is unique per axis (alias vs. display name vs. username), so it
    // must never reach the serialized payload even though matchReason does.
    expect(serialized).not.toContain('matchScore');
    // Nor does any replacement numeric fingerprint, or the private identity
    // fields the candidate DTO used to carry.
    expect(serialized).not.toMatch(/"rank"|"priority"|"confidence"/);
    expect(serialized).not.toContain('linkedFullName');
    expect(serialized).not.toContain('linkedUsername');
    // The alias hit auto-selects the guest, but is disclosed only as 'exact'.
    expect(withServerVerdict[0]).toMatchObject({
      selectedPlayerId: 'player-guest',
      status: 'exact',
    });

    // 'Jenna' matched on a saved private alias (score 250); 'fochizzy'
    // matched on the public display name (score 400). Both axes coarsen to
    // the same 'exact' reason and the same candidate shape, so an inspecting
    // client cannot tell a private-alias hit from a public-name hit.
    const guestCandidate = withServerVerdict[0]?.candidates.find(
      (candidate) => candidate.id === 'player-guest',
    );
    const izzyCandidate = withServerVerdict[1]?.candidates.find(
      (candidate) => candidate.id === 'player-izzy',
    );

    expect(guestCandidate?.matchReason).toBe('exact');
    expect(izzyCandidate?.matchReason).toBe('exact');
    expect(Object.keys(guestCandidate!).sort()).toEqual(
      Object.keys(izzyCandidate!).sort(),
    );
  });
});
