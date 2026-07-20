import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  createOrReuseGuestPlayerByPersonalName,
  listImportPlayerIdentityCandidates,
  resolveImportPlayerIdentities,
} from './import-player-identity-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

const groupId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const linkedPlayerId = '11111111-1111-4111-8111-111111111111';
const guestPlayerId = '22222222-2222-4222-8222-222222222222';
const newGuestPlayerId = '33333333-3333-4333-8333-333333333333';

// The roster is served exclusively by the guarded
// list_import_player_identity_candidates RPC. It carries only public fields, so
// no private personal name or private matching key can reach the browser (F-01).
const defaultRoster = [
  { is_linked: true, player_id: linkedPlayerId, public_name: 'registered-handle' },
  { is_linked: false, player_id: guestPlayerId, public_name: 'Guest 22224222' },
];

function mockClient(options?: { roster?: unknown[]; resolveRows?: unknown[] }) {
  const roster = options?.roster ?? defaultRoster;
  const rpc = vi.fn((fnName: string) => {
    if (fnName === 'list_import_player_identity_candidates') {
      return Promise.resolve({ data: roster, error: null });
    }
    if (fnName === 'resolve_import_guest_identity') {
      return Promise.resolve({ data: options?.resolveRows ?? [], error: null });
    }
    return Promise.resolve({
      data: null,
      error: new Error(`Unexpected rpc ${fnName}`),
    });
  });

  // Direct reads of the private identity/alias tables must never occur.
  const from = vi.fn((table: string) => {
    throw new Error(`Unexpected direct table read: ${table}`);
  });

  vi.mocked(createSupabaseServerClient).mockResolvedValue({ from, rpc } as never);
  return { from, rpc };
}

describe('import player identity repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns privacy-safe roster candidates from the guarded RPC and never reads private tables', async () => {
    const { from } = mockClient();

    const candidates = await listImportPlayerIdentityCandidates(groupId);

    expect(candidates).toEqual([
      {
        id: linkedPlayerId,
        isAccessible: true,
        isLinked: true,
        publicName: 'registered-handle',
      },
      {
        id: guestPlayerId,
        isAccessible: true,
        isLinked: false,
        publicName: 'Guest 22224222',
      },
    ]);
    for (const candidate of candidates) {
      expect(candidate).not.toHaveProperty('firstName');
      expect(candidate).not.toHaveProperty('lastName');
      expect(candidate).not.toHaveProperty('normalizedPersonalName');
      expect(candidate).not.toHaveProperty('normalizedUsername');
    }
    expect(from).not.toHaveBeenCalled();
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
    expect(rpc).not.toHaveBeenCalledWith(
      'resolve_import_guest_identity',
      expect.anything(),
    );
  });

  it('reuses an explicitly confirmed exact guest username and never surfaces the private matching key', async () => {
    // Distinctive sentinel: if this string ever appears in the repo's output,
    // the private normalized matching key leaked out of the server boundary.
    const sentinel = 'zz-private-normalized-username-sentinel';
    const { rpc } = mockClient({
      resolveRows: [
        {
          normalized_imported_value: sentinel,
          player_id: guestPlayerId,
          public_name: 'Guest 22224222',
          resolution_state: 'existing_unlinked_guest',
        },
      ],
    });

    const resolutions = await resolveImportPlayerIdentities({
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
    });

    expect(resolutions).toEqual([
      expect.objectContaining({
        decision: 'reused',
        identityMode: 'username',
        selectedPlayerId: guestPlayerId,
        state: 'existing_unlinked_guest',
      }),
    ]);
    expect(resolutions[0]).not.toHaveProperty('normalizedImportedValue');
    expect(JSON.stringify(resolutions)).not.toContain(sentinel);
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

  it('creates a structurally separate personal-name guest without exposing the normalized personal name', async () => {
    const sentinel = 'zz-private-normalized-personal-name-sentinel';
    mockClient({
      resolveRows: [
        {
          normalized_imported_value: sentinel,
          player_id: newGuestPlayerId,
          public_name: 'Guest 33334333',
          resolution_state: 'newly_created_unlinked_guest',
        },
      ],
    });

    const resolutions = await resolveImportPlayerIdentities({
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
    });

    expect(resolutions).toEqual([
      expect.objectContaining({
        decision: 'created',
        identityMode: 'personal_name',
        selectedPlayerId: newGuestPlayerId,
        state: 'newly_created_unlinked_guest',
      }),
    ]);
    expect(resolutions[0]).not.toHaveProperty('normalizedImportedValue');
    expect(JSON.stringify(resolutions)).not.toContain(sentinel);
  });

  it('creates a roster guest through the RPC without recording a false import alias', async () => {
    const sentinel = 'zz-private-roster-normalized-sentinel';
    const { from, rpc } = mockClient({
      resolveRows: [
        {
          normalized_imported_value: sentinel,
          player_id: newGuestPlayerId,
          public_name: 'Guest 33334333',
          resolution_state: 'newly_created_unlinked_guest',
        },
      ],
    });

    const created = await createOrReuseGuestPlayerByPersonalName({
      firstName: 'First',
      groupId,
      lastName: 'Last',
    });

    expect(created).toEqual({
      id: newGuestPlayerId,
      publicName: 'Guest 33334333',
      resolutionState: 'newly_created_unlinked_guest',
    });
    expect(JSON.stringify(created)).not.toContain(sentinel);
    expect(rpc).toHaveBeenCalledWith('resolve_import_guest_identity', {
      p_create_new: true,
      p_group_id: groupId,
      p_guest_first_name: 'First',
      p_guest_last_name: 'Last',
      p_guest_username: null,
      p_identity_mode: 'personal_name',
      p_record_import_alias: false,
      p_selected_player_id: null,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('names the missing gated migration instead of falling back to false import-alias evidence', async () => {
    const rpc = vi.fn(() =>
      Promise.resolve({
        data: null,
        error: Object.assign(new Error('function not found'), {
          code: 'PGRST202',
        }),
      }),
    );
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);

    await expect(
      createOrReuseGuestPlayerByPersonalName({
        firstName: 'First',
        groupId,
        lastName: 'Last',
      }),
    ).rejects.toThrow('20260720100000_add_guest_identity_alias_source_control');
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
