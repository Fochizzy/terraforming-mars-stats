import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  attachImportIdentityStaging,
  createOrReuseGuestPlayerByPersonalName,
  discardImportIdentityStaging,
  listImportPlayerIdentityCandidates,
  resolveImportPlayerIdentities,
  stageImportPlayerIdentityEvidence,
} from './import-player-identity-repo';

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

const groupId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const userId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const stagingId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const linkedPlayerId = '11111111-1111-4111-8111-111111111111';
const guestPlayerId = '22222222-2222-4222-8222-222222222222';
const newGuestPlayerId = '33333333-3333-4333-8333-333333333333';

const defaultRoster = [
  { is_linked: true, player_id: linkedPlayerId, public_name: 'registered-handle' },
  { is_linked: false, player_id: guestPlayerId, public_name: 'Guest 22224222' },
];

function mockServer(options?: { resolveRows?: unknown[] }) {
  const rpc = vi.fn((fnName: string) => {
    if (fnName === 'list_import_player_identity_candidates') {
      return Promise.resolve({ data: defaultRoster, error: null });
    }
    if (fnName === 'resolve_import_guest_identity') {
      return Promise.resolve({ data: options?.resolveRows ?? [], error: null });
    }
    return Promise.resolve({ data: null, error: new Error(`Unexpected rpc ${fnName}`) });
  });
  const from = vi.fn((table: string) => {
    throw new Error(`Unexpected direct table read: ${table}`);
  });
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ from, rpc } as never);
  return { from, rpc };
}

function mockAdmin(rows: unknown[] = []) {
  const rpc = vi.fn((fnName: string) => {
    if (fnName === 'stage_import_player_identity_evidence') {
      return Promise.resolve({ data: stagingId, error: null });
    }
    if (fnName === 'attach_import_identity_staging') {
      return Promise.resolve({ data: true, error: null });
    }
    if (fnName === 'discard_import_identity_staging') {
      return Promise.resolve({ data: true, error: null });
    }
    if (fnName === 'resolve_staged_import_player_identity') {
      return Promise.resolve({ data: rows, error: null });
    }
    return Promise.resolve({ data: null, error: new Error(`Unexpected rpc ${fnName}`) });
  });
  vi.mocked(createSupabaseAdminClient).mockReturnValue({ rpc } as never);
  return rpc;
}

const baseResolveInput = {
  authoritativeSourcePlayerTexts: ['Server parsed seat'],
  groupId,
  requestingUserId: userId,
  stagingId,
};

describe('import player identity repository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns only public-safe roster fields and never reads identity tables', async () => {
    const { from } = mockServer();
    const candidates = await listImportPlayerIdentityCandidates(groupId);
    expect(candidates).toEqual([
      { id: linkedPlayerId, isAccessible: true, isLinked: true, publicName: 'registered-handle' },
      { id: guestPlayerId, isAccessible: true, isLinked: false, publicName: 'Guest 22224222' },
    ]);
    expect(JSON.stringify(candidates)).not.toMatch(/firstName|lastName|normalized/i);
    expect(from).not.toHaveBeenCalled();
  });

  it('stages server-parsed evidence through the service-role gateway', async () => {
    const rpc = mockAdmin();
    await expect(stageImportPlayerIdentityEvidence({
      groupId,
      parserIdentity: 'parser-v1',
      requestingUserId: userId,
      sourceFormat: 'game_log',
      sourcePlayerTexts: ['Player A', 'Player B'],
    })).resolves.toBe(stagingId);
    expect(rpc).toHaveBeenCalledWith('stage_import_player_identity_evidence', {
      p_group_id: groupId,
      p_parser_identity: 'parser-v1',
      p_requesting_user_id: userId,
      p_source_format: 'game_log',
      p_source_player_texts: ['Player A', 'Player B'],
    });
  });

  it('resolves every mode through the source-bound service RPC and ignores client source text', async () => {
    mockServer();
    const rpc = mockAdmin([
      { outcome: 'resolved', player_id: linkedPlayerId, public_label: 'registered-handle' },
    ]);
    const result = await resolveImportPlayerIdentities({
      ...baseResolveInput,
      identities: [{
        mode: 'existing_player',
        selectedPlayerId: linkedPlayerId,
        sourcePlayerText: 'Client-tampered seat',
      }],
    });

    expect(result[0]).toMatchObject({
      decision: 'linked',
      selectedPlayerId: linkedPlayerId,
      sourcePlayerText: 'Server parsed seat',
      state: 'linked_registered_player',
    });
    expect(rpc).toHaveBeenCalledWith('resolve_staged_import_player_identity', {
      p_create_new: false,
      p_guest_first_name: null,
      p_guest_last_name: null,
      p_guest_username: null,
      p_identity_mode: 'existing_player',
      p_requesting_user_id: userId,
      p_selected_player_id: linkedPlayerId,
      p_source_player_ordinal: 1,
      p_staging_id: stagingId,
    });
    expect(rpc).not.toHaveBeenCalledWith('resolve_import_guest_identity', expect.anything());
  });

  it('returns no private matcher detail and maps a new personal-name guest', async () => {
    mockServer();
    mockAdmin([{ outcome: 'resolved', player_id: newGuestPlayerId, public_label: 'Guest 33334333' }]);
    const result = await resolveImportPlayerIdentities({
      ...baseResolveInput,
      authoritativeSourcePlayerTexts: ['First Last'],
      identities: [{
        createNew: true,
        firstName: 'First',
        lastName: 'Last',
        mode: 'personal_name',
        selectedPlayerId: null,
        sourcePlayerText: 'tampered',
      }],
    });
    expect(result[0]).toMatchObject({ decision: 'created', sourcePlayerText: 'First Last' });
    expect(JSON.stringify(result)).not.toMatch(/public_label|normalized|firstName|lastName/);
  });

  it('uses indistinguishable application errors for service failures', async () => {
    mockServer();
    const rpc = vi.fn(() => Promise.resolve({ data: null, error: new Error('private detail') }));
    vi.mocked(createSupabaseAdminClient).mockReturnValue({ rpc } as never);
    await expect(resolveImportPlayerIdentities({
      ...baseResolveInput,
      identities: [{ mode: 'existing_player', selectedPlayerId: linkedPlayerId, sourcePlayerText: 'x' }],
    })).rejects.toThrow('unavailable');
  });

  it('attaches and discards staging only through service-role gateways', async () => {
    const rpc = mockAdmin();
    await expect(attachImportIdentityStaging({
      gameId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      gameLogImportId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      requestingUserId: userId,
      stagingId,
    })).resolves.toBe(true);
    await discardImportIdentityStaging({ requestingUserId: userId, stagingId });
    expect(rpc).toHaveBeenCalledWith('discard_import_identity_staging', {
      p_requesting_user_id: userId,
      p_staging_id: stagingId,
    });
  });

  it('keeps non-import roster guest creation off import alias evidence', async () => {
    const { rpc } = mockServer({ resolveRows: [{
      player_id: newGuestPlayerId,
      public_name: 'Guest 33334333',
      resolution_state: 'newly_created_unlinked_guest',
    }] });
    await createOrReuseGuestPlayerByPersonalName({ firstName: 'First', groupId, lastName: 'Last' });
    expect(rpc).toHaveBeenCalledWith('resolve_import_guest_identity', expect.objectContaining({
      p_record_import_alias: false,
    }));
  });
});
