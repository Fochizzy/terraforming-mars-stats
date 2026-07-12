import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  buildImportGroupMemberRows,
  buildGroupRosterSignature,
  buildImportGroupName,
  findExactGroupRosterMatch,
  planImportGroupReconciliation,
  reconcileImportGroupAfterFinalize,
  selectCurrentGroupPlayerIds,
  resolveImportParticipantIdentities,
} from './import-group-repo';

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}));

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
});

describe('buildImportGroupMemberRows', () => {
  it('adds one member per distinct linked participant', () => {
    expect(
      buildImportGroupMemberRows({
        groupId: 'group-1',
        participantIdentities: [
          {
            linkedUserId: 'user-james',
          },
          {
            linkedUserId: 'user-izzy',
          },
          {
            linkedUserId: null,
          },
          {
            linkedUserId: 'user-izzy',
          },
          {
            linkedUserId: 'user-corey',
          },
        ],
      }),
    ).toEqual([
      { group_id: 'group-1', role: 'editor', user_id: 'user-james' },
      { group_id: 'group-1', role: 'editor', user_id: 'user-izzy' },
      { group_id: 'group-1', role: 'editor', user_id: 'user-corey' },
    ]);
  });

  it('does not add the importing user when they are not a linked participant', () => {
    // Importing a game for a roster you did not play in must not make you a
    // member of that group — membership derives from participation only.
    expect(
      buildImportGroupMemberRows({
        groupId: 'group-1',
        participantIdentities: [
          { linkedUserId: 'user-colette' },
          { linkedUserId: 'user-corey' },
          { linkedUserId: null },
        ],
      }),
    ).toEqual([
      { group_id: 'group-1', role: 'editor', user_id: 'user-colette' },
      { group_id: 'group-1', role: 'editor', user_id: 'user-corey' },
    ]);
  });
});

describe('planImportGroupReconciliation', () => {
  // Roster after a review pass: the two OCR misreads created at draft time
  // plus the corrected players the reviewer actually selected.
  const rosterPlayers = [
    { display_name: 'Colette LeRoux', id: 'phantom-1', linked_user_id: null },
    { display_name: 'Corey Jansen', id: 'phantom-2', linked_user_id: null },
    {
      display_name: 'Izzy Hodnett',
      id: 'confirmed-1',
      linked_user_id: 'user-izzy',
    },
    { display_name: 'Corey', id: 'confirmed-2', linked_user_id: null },
  ];

  it('prunes phantom import players and renames the auto-generated group from confirmed participants', () => {
    expect(
      planImportGroupReconciliation({
        confirmedPlayerIds: ['confirmed-1', 'confirmed-2'],
        groupName: buildImportGroupName(['Colette LeRoux', 'Corey Jansen']),
        originalRosterPlayerIds: ['phantom-1', 'phantom-2'],
        rosterPlayers,
      }),
    ).toEqual({
      playerIdsToRemove: ['phantom-1', 'phantom-2'],
      updatedGroupName: 'Corey / Izzy Hodnett',
    });
  });

  it('keeps linked players even when they are missing from the finalized game', () => {
    expect(
      planImportGroupReconciliation({
        confirmedPlayerIds: ['confirmed-2'],
        groupName: buildImportGroupName(['Colette LeRoux', 'Corey Jansen']),
        originalRosterPlayerIds: ['phantom-1', 'phantom-2'],
        rosterPlayers,
      }),
    ).toEqual({
      playerIdsToRemove: ['phantom-1', 'phantom-2'],
      updatedGroupName: 'Corey',
    });
  });

  it('leaves a manually renamed group and its roster untouched', () => {
    expect(
      planImportGroupReconciliation({
        confirmedPlayerIds: ['confirmed-1', 'confirmed-2'],
        groupName: 'Tuesday Night Terraformers',
        originalRosterPlayerIds: ['phantom-1', 'phantom-2'],
        rosterPlayers,
      }),
    ).toEqual({
      playerIdsToRemove: [],
      updatedGroupName: null,
    });
  });

  it('does nothing when the original import roster cannot be reconstructed', () => {
    expect(
      planImportGroupReconciliation({
        confirmedPlayerIds: ['confirmed-1', 'confirmed-2'],
        groupName: buildImportGroupName(['Colette LeRoux', 'Corey Jansen']),
        originalRosterPlayerIds: ['phantom-1', 'deleted-player'],
        rosterPlayers,
      }),
    ).toEqual({
      playerIdsToRemove: [],
      updatedGroupName: null,
    });
  });

  it('skips renaming when the confirmed participants already match the group name', () => {
    expect(
      planImportGroupReconciliation({
        confirmedPlayerIds: ['phantom-1', 'phantom-2'],
        groupName: buildImportGroupName(['Colette LeRoux', 'Corey Jansen']),
        originalRosterPlayerIds: ['phantom-1', 'phantom-2'],
        rosterPlayers,
      }),
    ).toEqual({
      playerIdsToRemove: ['confirmed-2'],
      updatedGroupName: null,
    });
  });
});

type AdminMockState = {
  firstRevisionSnapshot: unknown;
  gameLogImports: Array<{ id: string }>;
  gamePlayers: Array<{ player_id: string }>;
  games: Array<{ id: string; status: string }>;
  group: { id: string; name: string };
  players: Array<{
    display_name: string;
    id: string;
    linked_user_id: string | null;
  }>;
};

type RecordedOp = { args: unknown[]; method: string };

function createAdminClientMock(state: AdminMockState) {
  const writes = {
    deletedPlayerIds: null as string[] | null,
    updatedGroupName: null as string | null,
  };

  function resolveQuery(table: string, ops: RecordedOp[]) {
    const opNames = ops.map((op) => op.method);

    if (table === 'game_log_imports') {
      return { data: state.gameLogImports, error: null };
    }

    if (table === 'games') {
      return { data: state.games, error: null };
    }

    if (table === 'groups') {
      const updateOp = ops.find((op) => op.method === 'update');

      if (updateOp) {
        writes.updatedGroupName = (updateOp.args[0] as { name: string }).name;
        return { data: null, error: null };
      }

      return { data: state.group, error: null };
    }

    if (table === 'players') {
      if (opNames.includes('delete')) {
        const inOp = ops.find((op) => op.method === 'in');
        writes.deletedPlayerIds = (inOp?.args[1] as string[]) ?? [];
        return { data: null, error: null };
      }

      return { data: state.players, error: null };
    }

    if (table === 'game_players') {
      return { data: state.gamePlayers, error: null };
    }

    if (table === 'game_revisions') {
      return { data: { snapshot: state.firstRevisionSnapshot }, error: null };
    }

    throw new Error(`Unexpected table ${table}`);
  }

  function createQueryStub(table: string) {
    const ops: RecordedOp[] = [];
    const stub: Record<string, unknown> = {};

    for (const method of [
      'delete',
      'eq',
      'in',
      'limit',
      'order',
      'select',
      'update',
    ]) {
      stub[method] = (...args: unknown[]) => {
        ops.push({ args, method });
        return stub;
      };
    }

    stub.single = () => Promise.resolve(resolveQuery(table, ops));
    stub.maybeSingle = () => Promise.resolve(resolveQuery(table, ops));
    stub.then = (
      onFulfilled: (value: unknown) => unknown,
      onRejected: (reason: unknown) => unknown,
    ) => Promise.resolve(resolveQuery(table, ops)).then(onFulfilled, onRejected);

    return stub;
  }

  return {
    client: { from: (table: string) => createQueryStub(table) },
    writes,
  };
}

describe('reconcileImportGroupAfterFinalize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const productionLikeState: AdminMockState = {
    firstRevisionSnapshot: { selectedPlayerIds: ['phantom-1', 'phantom-2'] },
    gameLogImports: [{ id: 'import-1' }],
    gamePlayers: [{ player_id: 'confirmed-1' }, { player_id: 'confirmed-2' }],
    games: [{ id: 'game-1', status: 'finalized' }],
    group: { id: 'group-1', name: 'Colette LeRoux / Corey Jansen' },
    players: [
      { display_name: 'Colette LeRoux', id: 'phantom-1', linked_user_id: null },
      { display_name: 'Corey Jansen', id: 'phantom-2', linked_user_id: null },
      {
        display_name: 'Izzy Hodnett',
        id: 'confirmed-1',
        linked_user_id: 'user-izzy',
      },
      { display_name: 'Corey', id: 'confirmed-2', linked_user_id: null },
    ],
  };

  it('removes phantom players and renames the group once the import is finalized with confirmed participants', async () => {
    const { client, writes } = createAdminClientMock(productionLikeState);
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as never);

    await expect(
      reconcileImportGroupAfterFinalize({
        gameId: 'game-1',
        groupId: 'group-1',
      }),
    ).resolves.toEqual({
      playerIdsToRemove: ['phantom-1', 'phantom-2'],
      updatedGroupName: 'Corey / Izzy Hodnett',
    });

    expect(writes.deletedPlayerIds).toEqual(['phantom-1', 'phantom-2']);
    expect(writes.updatedGroupName).toBe('Corey / Izzy Hodnett');
  });

  it('leaves groups with other games untouched', async () => {
    const { client, writes } = createAdminClientMock({
      ...productionLikeState,
      games: [
        { id: 'game-1', status: 'finalized' },
        { id: 'game-2', status: 'draft' },
      ],
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as never);

    await expect(
      reconcileImportGroupAfterFinalize({
        gameId: 'game-1',
        groupId: 'group-1',
      }),
    ).resolves.toEqual({
      playerIdsToRemove: [],
      updatedGroupName: null,
    });

    expect(writes.deletedPlayerIds).toBeNull();
    expect(writes.updatedGroupName).toBeNull();
  });

  it('skips games that were not created from import evidence', async () => {
    const { client, writes } = createAdminClientMock({
      ...productionLikeState,
      gameLogImports: [],
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as never);

    await expect(
      reconcileImportGroupAfterFinalize({
        gameId: 'game-1',
        groupId: 'group-1',
      }),
    ).resolves.toEqual({
      playerIdsToRemove: [],
      updatedGroupName: null,
    });

    expect(writes.deletedPlayerIds).toBeNull();
    expect(writes.updatedGroupName).toBeNull();
  });

  it('skips drafts that are not finalized yet', async () => {
    const { client, writes } = createAdminClientMock({
      ...productionLikeState,
      games: [{ id: 'game-1', status: 'draft' }],
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as never);

    await expect(
      reconcileImportGroupAfterFinalize({
        gameId: 'game-1',
        groupId: 'group-1',
      }),
    ).resolves.toEqual({
      playerIdsToRemove: [],
      updatedGroupName: null,
    });

    expect(writes.deletedPlayerIds).toBeNull();
    expect(writes.updatedGroupName).toBeNull();
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
