import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listPlayers } from './player-repo';
import {
  listImportPlayerIdentityCandidates,
  resolveImportPlayerIdentities,
} from './import-player-identity-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('./player-repo', () => ({
  listPlayers: vi.fn(),
}));

const groupId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const linkedPlayerId = '11111111-1111-4111-8111-111111111111';
const guestPlayerId = '22222222-2222-4222-8222-222222222222';
const newGuestPlayerId = '33333333-3333-4333-8333-333333333333';

function mockClient(options?: {
  privateIdentities?: unknown[];
  rpcRows?: unknown[];
}) {
  const privateIdentityEq = vi.fn().mockResolvedValue({
    data: options?.privateIdentities ?? [],
    error: null,
  });
  const privateIdentitySelect = vi.fn(() => ({ eq: privateIdentityEq }));
  const rpc = vi.fn().mockResolvedValue({
    data: options?.rpcRows ?? [],
    error: null,
  });

  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    from: vi.fn((table: string) => {
      if (table !== 'player_private_identities') {
        throw new Error(`Unexpected table ${table}`);
      }

      return { select: privateIdentitySelect };
    }),
    rpc,
  } as never);

  return { privateIdentityEq, rpc };
}

describe('import player identity repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listPlayers).mockResolvedValue([
      {
        display_name: 'registered-handle',
        id: linkedPlayerId,
        linked_user_id: '44444444-4444-4444-8444-444444444444',
      },
      {
        display_name: 'Guest Handle',
        id: guestPlayerId,
        linked_user_id: null,
      },
    ]);
  });

  it('joins authorized private matching data to privacy-safe roster names', async () => {
    mockClient({
      privateIdentities: [
        {
          guest_first_name: 'Known',
          guest_last_name: 'Private Name',
          guest_username: null,
          identity_mode: 'personal_name',
          normalized_guest_username: null,
          normalized_personal_name: 'known private name',
          player_id: guestPlayerId,
        },
      ],
    });

    await expect(listImportPlayerIdentityCandidates(groupId)).resolves.toEqual([
      expect.objectContaining({
        id: linkedPlayerId,
        isLinked: true,
        publicName: 'registered-handle',
      }),
      expect.objectContaining({
        firstName: 'Known',
        id: guestPlayerId,
        identityMode: 'personal_name',
        lastName: 'Private Name',
        normalizedPersonalName: 'known private name',
        publicName: 'Guest Handle',
      }),
    ]);
  });

  it('preserves a selected linked player ID without invoking guest creation', async () => {
    const { rpc } = mockClient();

    await expect(
      resolveImportPlayerIdentities({
        groupId,
        identities: [
          {
            mode: 'existing_player',
            selectedPlayerId: linkedPlayerId,
            sourcePlayerText: 'Original imported seat',
          },
        ],
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        decision: 'linked',
        selectedPlayerId: linkedPlayerId,
        sourcePlayerText: 'Original imported seat',
        state: 'linked_registered_player',
      }),
    ]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('reuses an explicitly confirmed exact guest username', async () => {
    const { rpc } = mockClient({
      rpcRows: [
        {
          normalized_imported_value: 'guest-handle',
          player_id: guestPlayerId,
          public_name: 'Guest Handle',
          resolution_state: 'existing_unlinked_guest',
        },
      ],
    });

    await expect(
      resolveImportPlayerIdentities({
        groupId,
        identities: [
          {
            createNew: false,
            mode: 'username',
            selectedPlayerId: guestPlayerId,
            sourcePlayerText: 'Guest_Handle',
            username: 'Guest_Handle',
          },
        ],
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        decision: 'reused',
        identityMode: 'username',
        normalizedImportedValue: 'guest-handle',
        selectedPlayerId: guestPlayerId,
        state: 'existing_unlinked_guest',
      }),
    ]);
    expect(rpc).toHaveBeenCalledWith('resolve_import_guest_identity', {
      p_create_new: false,
      p_group_id: groupId,
      p_guest_first_name: null,
      p_guest_last_name: null,
      p_guest_username: 'Guest_Handle',
      p_identity_mode: 'username',
      p_selected_player_id: guestPlayerId,
    });
  });

  it('creates a structurally separate personal-name guest when requested', async () => {
    mockClient({
      rpcRows: [
        {
          normalized_imported_value: 'first last',
          player_id: newGuestPlayerId,
          public_name: 'Player',
          resolution_state: 'newly_created_unlinked_guest',
        },
      ],
    });

    await expect(
      resolveImportPlayerIdentities({
        groupId,
        identities: [
          {
            createNew: true,
            firstName: 'First',
            lastName: 'Last',
            mode: 'personal_name',
            selectedPlayerId: null,
            sourcePlayerText: 'First Last',
          },
        ],
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        decision: 'created',
        identityMode: 'personal_name',
        normalizedImportedValue: 'first last',
        selectedPlayerId: newGuestPlayerId,
        state: 'newly_created_unlinked_guest',
      }),
    ]);
  });

  it('rejects two imported seats resolving to the same stable player ID', async () => {
    mockClient();

    await expect(
      resolveImportPlayerIdentities({
        groupId,
        identities: [
          {
            mode: 'existing_player',
            selectedPlayerId: guestPlayerId,
            sourcePlayerText: 'Seat One',
          },
          {
            mode: 'existing_player',
            selectedPlayerId: guestPlayerId,
            sourcePlayerText: 'Seat Two',
          },
        ],
      }),
    ).rejects.toThrow('different player ID');
  });
});
