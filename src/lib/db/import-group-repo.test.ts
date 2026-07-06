import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  buildGroupRosterSignature,
  findExactGroupRosterMatch,
  resolveOrCreateImportGroup,
  selectCurrentGroupPlayerIds,
  resolveImportParticipantIdentities,
} from './import-group-repo';
import { setCurrentUserLastActiveGroup } from './user-profile-repo';

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock('./user-profile-repo', () => ({
  setCurrentUserLastActiveGroup: vi.fn(),
}));

function mockImportGroupAdminClient(input: {
  group?: { id: string; name: string };
  insertedGroup?: { id: string; name: string };
  insertedPlayers?: Array<{
    display_name: string;
    group_id: string;
    id: string;
    linked_user_id: string | null;
  }>;
  playerRows: Array<{
    created_at?: string | null;
    display_name: string;
    group_id: string;
    id: string;
    linked_user_id: string | null;
  }>;
}) {
  const playerOrder = vi.fn().mockResolvedValue({
    data: input.playerRows,
    error: null,
  });
  const playerSelect = vi.fn().mockReturnValue({ order: playerOrder });
  const playerInsertSelect = vi.fn().mockResolvedValue({
    data: input.insertedPlayers ?? [],
    error: null,
  });
  const playerInsert = vi.fn().mockReturnValue({ select: playerInsertSelect });

  const groupSingle = vi.fn().mockResolvedValue({
    data: input.group ?? null,
    error: null,
  });
  const groupEq = vi.fn().mockReturnValue({ single: groupSingle });
  const groupSelect = vi.fn().mockReturnValue({ eq: groupEq });
  const groupInsertSingle = vi.fn().mockResolvedValue({
    data: input.insertedGroup ?? null,
    error: null,
  });
  const groupInsertSelect = vi.fn().mockReturnValue({ single: groupInsertSingle });
  const groupInsert = vi.fn().mockReturnValue({ select: groupInsertSelect });

  const groupMembersUpsert = vi.fn().mockResolvedValue({ error: null });
  const groupSettingsUpsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table: string) => {
    if (table === 'players') {
      return {
        insert: playerInsert,
        select: playerSelect,
      };
    }

    if (table === 'groups') {
      return {
        insert: groupInsert,
        select: groupSelect,
      };
    }

    if (table === 'group_members') {
      return {
        upsert: groupMembersUpsert,
      };
    }

    if (table === 'group_settings') {
      return {
        upsert: groupSettingsUpsert,
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  vi.mocked(createSupabaseAdminClient).mockReturnValue({
    from,
  } as never);

  return {
    from,
    groupInsert,
    groupMembersUpsert,
    groupSettingsUpsert,
    playerInsert,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(setCurrentUserLastActiveGroup).mockResolvedValue(undefined);
});

describe('resolveImportParticipantIdentities', () => {
  it('reuses a linked user identity for an exact normalized name match', () => {
    const resolved = resolveImportParticipantIdentities(
      ['Friday Mars', 'New Challenger'],
      [
        {
          display_name: 'Friday Mars',
          group_id: 'group-1',
          id: 'player-1',
          linked_user_id: 'user-1',
        },
      ],
    );

    expect(resolved).toEqual([
      {
        displayName: 'Friday Mars',
        linkedUserId: 'user-1',
        normalizedName: 'friday mars',
        token: 'user:user-1',
      },
      {
        displayName: 'New Challenger',
        linkedUserId: null,
        normalizedName: 'new challenger',
        token: 'name:new challenger',
      },
    ]);
  });

  it('falls back to an exact normalized name token when no linked account exists', () => {
    const resolved = resolveImportParticipantIdentities(
      ['Friday-Mars!!'],
      [
        {
          display_name: 'Friday Mars',
          group_id: 'group-1',
          id: 'player-1',
          linked_user_id: null,
        },
        {
          display_name: 'Friday   Mars',
          group_id: 'group-2',
          id: 'player-2',
          linked_user_id: null,
        },
      ],
    );

    expect(resolved).toEqual([
      {
        displayName: 'Friday-Mars!!',
        linkedUserId: null,
        normalizedName: 'friday mars',
        token: 'name:friday mars',
      },
    ]);
  });

  it('throws when one exact imported name maps to multiple linked users', () => {
    expect(() =>
      resolveImportParticipantIdentities(
        ['Friday Mars'],
        [
          {
            display_name: 'Friday Mars',
            group_id: 'group-1',
            id: 'player-1',
            linked_user_id: 'user-1',
          },
          {
            display_name: 'Friday Mars',
            group_id: 'group-2',
            id: 'player-2',
            linked_user_id: 'user-2',
          },
        ],
      ),
    ).toThrow(/multiple existing users/i);
  });

  it('throws with the duplicate exact token when imported participants collapse together', () => {
    expect(() =>
      resolveImportParticipantIdentities(['Friday Mars', 'Friday-Mars'], []),
    ).toThrow(/name:friday mars/i);
  });
});

describe('findExactGroupRosterMatch', () => {
  it('matches an existing group by the exact player set regardless of turn order', () => {
    const importedParticipants = resolveImportParticipantIdentities(
      ['Second Seat', 'Friday Mars'],
      [
        {
          display_name: 'Friday Mars',
          group_id: 'group-1',
          id: 'player-1',
          linked_user_id: 'user-1',
        },
        {
          display_name: 'Second Seat',
          group_id: 'group-1',
          id: 'player-2',
          linked_user_id: 'user-2',
        },
      ],
    );

    const groupId = findExactGroupRosterMatch(importedParticipants, [
      {
        created_at: '2026-07-04T00:00:00Z',
        display_name: 'Friday Mars',
        group_id: 'group-1',
        id: 'player-1',
        linked_user_id: 'user-1',
      },
      {
        created_at: '2026-07-04T00:00:00Z',
        display_name: 'Second Seat',
        group_id: 'group-1',
        id: 'player-2',
        linked_user_id: 'user-2',
      },
      {
        created_at: '2026-07-04T00:00:00Z',
        display_name: 'Third Seat',
        group_id: 'group-2',
        id: 'player-3',
        linked_user_id: 'user-3',
      },
    ]);

    expect(groupId).toBe('group-1');
    expect(
      buildGroupRosterSignature(importedParticipants.map((participant) => participant.token)),
    ).toBe('user:user-1|user:user-2');
  });

  it('throws with the exact roster signature when two groups already share it', () => {
    const importedParticipants = resolveImportParticipantIdentities(
      ['Second Seat', 'Friday Mars'],
      [],
    );

    expect(() =>
      findExactGroupRosterMatch(importedParticipants, [
        {
          created_at: '2026-07-04T00:00:00Z',
          display_name: 'Friday Mars',
          group_id: 'group-1',
          id: 'player-1',
          linked_user_id: null,
        },
        {
          created_at: '2026-07-04T00:00:00Z',
          display_name: 'Second Seat',
          group_id: 'group-1',
          id: 'player-2',
          linked_user_id: null,
        },
        {
          created_at: '2026-07-04T00:00:00Z',
          display_name: 'Friday-Mars',
          group_id: 'group-2',
          id: 'player-3',
          linked_user_id: null,
        },
        {
          created_at: '2026-07-04T00:00:00Z',
          display_name: 'Second  Seat',
          group_id: 'group-2',
          id: 'player-4',
          linked_user_id: null,
        },
      ]),
    ).toThrow(/name:friday mars\|name:second seat/i);
  });
});

describe('selectCurrentGroupPlayerIds', () => {
  it('selects exact current-group player matches regardless of order', () => {
    expect(
      selectCurrentGroupPlayerIds(
        ['Second Seat', 'Friday Mars'],
        [
          { display_name: 'Friday Mars', id: 'player-1' },
          { display_name: 'Second Seat', id: 'player-2' },
        ],
      ),
    ).toEqual(['player-2', 'player-1']);
  });

  it('throws when a participant does not exactly match one player in the current group', () => {
    expect(() =>
      selectCurrentGroupPlayerIds(
        ['Friday Mars', 'New Challenger'],
        [{ display_name: 'Friday Mars', id: 'player-1' }],
      ),
    ).toThrow(/current group/i);
  });
});

describe('previewImportGroupResolution', () => {
  it('previews a reused group regardless of imported turn order', async () => {
    mockImportGroupAdminClient({
      group: {
        id: 'group-1',
        name: 'Friday Mars / Second Seat',
      },
      playerRows: [
        {
          created_at: '2026-07-04T00:00:00Z',
          display_name: 'Friday Mars',
          group_id: 'group-1',
          id: 'player-1',
          linked_user_id: 'user-1',
        },
        {
          created_at: '2026-07-04T00:00:00Z',
          display_name: 'Second Seat',
          group_id: 'group-1',
          id: 'player-2',
          linked_user_id: 'user-2',
        },
      ],
    });

    const module = (await import('./import-group-repo')) as typeof import('./import-group-repo') & {
      previewImportGroupResolution?: (input: {
        participantNames: string[];
      }) => Promise<unknown>;
    };

    await expect(
      module.previewImportGroupResolution?.({
        participantNames: ['Second Seat', 'Friday Mars'],
      }),
    ).resolves.toEqual({
      createdNewGroup: false,
      createdProfileNames: [],
      groupId: 'group-1',
      groupName: 'Friday Mars / Second Seat',
      selectedPlayerIds: ['player-2', 'player-1'],
    });
  });
});

describe('resolveOrCreateImportGroup', () => {
  it('updates last_active_group_id after reusing an exact roster match', async () => {
    const { groupMembersUpsert } = mockImportGroupAdminClient({
      group: {
        id: 'group-1',
        name: 'Friday Mars / Second Seat',
      },
      playerRows: [
        {
          created_at: '2026-07-04T00:00:00Z',
          display_name: 'Friday Mars',
          group_id: 'group-1',
          id: 'player-1',
          linked_user_id: 'user-1',
        },
        {
          created_at: '2026-07-04T00:00:00Z',
          display_name: 'Second Seat',
          group_id: 'group-1',
          id: 'player-2',
          linked_user_id: 'user-2',
        },
      ],
    });

    await expect(
      resolveOrCreateImportGroup({
        importingUserId: 'user-9',
        participantNames: ['Second Seat', 'Friday Mars'],
      }),
    ).resolves.toEqual({
      createdNewGroup: false,
      createdProfileNames: [],
      groupId: 'group-1',
      groupName: 'Friday Mars / Second Seat',
      selectedPlayerIds: ['player-2', 'player-1'],
    });

    expect(groupMembersUpsert).toHaveBeenCalledWith(
      [
        { group_id: 'group-1', role: 'editor', user_id: 'user-9' },
        { group_id: 'group-1', role: 'editor', user_id: 'user-2' },
        { group_id: 'group-1', role: 'editor', user_id: 'user-1' },
      ],
      {
        ignoreDuplicates: false,
        onConflict: 'group_id,user_id',
      },
    );
    expect(setCurrentUserLastActiveGroup).toHaveBeenCalledWith({
      groupId: 'group-1',
      userId: 'user-9',
    });
  });

  it('creates a fresh group-local roster and updates last_active_group_id when no exact match exists', async () => {
    const { groupInsert, groupSettingsUpsert, playerInsert } = mockImportGroupAdminClient({
      insertedGroup: {
        id: 'group-new',
        name: 'Friday Mars / New Challenger',
      },
      insertedPlayers: [
        {
          display_name: 'Friday Mars',
          group_id: 'group-new',
          id: 'player-new-1',
          linked_user_id: 'user-1',
        },
        {
          display_name: 'New Challenger',
          group_id: 'group-new',
          id: 'player-new-2',
          linked_user_id: null,
        },
      ],
      playerRows: [
        {
          created_at: '2026-07-04T00:00:00Z',
          display_name: 'Friday Mars',
          group_id: 'group-1',
          id: 'player-1',
          linked_user_id: 'user-1',
        },
      ],
    });

    await expect(
      resolveOrCreateImportGroup({
        importingUserId: 'user-9',
        participantNames: ['Friday Mars', 'New Challenger'],
      }),
    ).resolves.toEqual({
      createdNewGroup: true,
      createdProfileNames: ['New Challenger'],
      groupId: 'group-new',
      groupName: 'Friday Mars / New Challenger',
      selectedPlayerIds: ['player-new-1', 'player-new-2'],
    });

    expect(groupInsert).toHaveBeenCalledWith({
      name: 'Friday Mars / New Challenger',
    });
    expect(groupSettingsUpsert).toHaveBeenCalledWith({
      default_map_id: null,
      global_analytics_enabled: false,
      group_id: 'group-new',
    });
    expect(playerInsert).toHaveBeenCalledWith([
      {
        display_name: 'Friday Mars',
        group_id: 'group-new',
        linked_user_id: 'user-1',
      },
      {
        display_name: 'New Challenger',
        group_id: 'group-new',
        linked_user_id: null,
      },
    ]);
    expect(setCurrentUserLastActiveGroup).toHaveBeenCalledWith({
      groupId: 'group-new',
      userId: 'user-9',
    });
  });
});
