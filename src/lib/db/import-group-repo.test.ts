import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { buildPublicGroupLabel } from './group-label-resolution';
import {
  buildImportGroupMemberRows,
  buildGroupRosterSignature,
  findExactGroupRosterMatch,
  planImportGroupReconciliation,
  reconcileImportGroupAfterFinalize,
  resolveOrCreateImportGroup,
  selectCurrentGroupPlayerIds,
  resolveImportParticipantIdentities,
} from './import-group-repo';

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}));

describe('resolveImportParticipantIdentities', () => {
  /**
   * Review shows a public label, never the roster name, so the label matches no
   * player row. Routing on it alone spun up duplicate guests instead of reusing
   * the person the reviewer picked; the confirmed id has to win.
   */
  it('resolves a confirmed selection from its player row, not the shown label', () => {
    const playerRows = [
      {
        display_name: 'Corey Jansen',
        group_id: 'group-1',
        id: 'player-corey',
        linked_user_id: 'user-corey',
      },
      {
        display_name: 'Jenna Kass',
        group_id: 'group-1',
        id: 'player-jenna',
        linked_user_id: null,
      },
    ];

    expect(
      resolveImportParticipantIdentities(
        ['lurker', 'Guest 461D9612'],
        playerRows,
        ['player-corey', 'player-jenna'],
      ),
    ).toEqual([
      {
        displayName: 'Corey Jansen',
        linkedUserId: 'user-corey',
        normalizedName: 'corey jansen',
        token: 'user:user-corey',
      },
      {
        displayName: 'Jenna Kass',
        linkedUserId: null,
        normalizedName: 'jenna kass',
        token: 'name:jenna kass',
      },
    ]);
  });

  it('falls back to the name when no selection was confirmed', () => {
    expect(
      resolveImportParticipantIdentities(
        ['Corey Jansen'],
        [
          {
            display_name: 'Corey Jansen',
            group_id: 'group-1',
            id: 'player-corey',
            linked_user_id: 'user-corey',
          },
        ],
        [null],
      ),
    ).toEqual([
      {
        displayName: 'Corey Jansen',
        linkedUserId: 'user-corey',
        normalizedName: 'corey jansen',
        token: 'user:user-corey',
      },
    ]);
  });

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
  // plus the corrected players the reviewer actually selected. Labels are
  // public (never a private display_name) — this function only ever reasons
  // about the public label a player currently resolves to.
  const rosterPlayers = [
    { id: 'phantom-1', linked_user_id: null, publicLabel: 'Guest AAAA0001' },
    { id: 'phantom-2', linked_user_id: null, publicLabel: 'Guest BBBB0002' },
    {
      id: 'confirmed-1',
      linked_user_id: 'user-izzy',
      publicLabel: 'fochizzy',
    },
    {
      id: 'confirmed-2',
      linked_user_id: null,
      publicLabel: 'Guest CCCC0003',
    },
  ];

  it('prunes phantom import players and renames the auto-generated group from confirmed participants', () => {
    expect(
      planImportGroupReconciliation({
        confirmedPlayerIds: ['confirmed-1', 'confirmed-2'],
        groupName: buildPublicGroupLabel(['Guest AAAA0001', 'Guest BBBB0002']),
        originalRosterPlayerIds: ['phantom-1', 'phantom-2'],
        rosterPlayers,
      }),
    ).toEqual({
      playerIdsToRemove: ['phantom-1', 'phantom-2'],
      updatedGroupName: buildPublicGroupLabel(['fochizzy', 'Guest CCCC0003']),
    });
  });

  it('keeps linked players even when they are missing from the finalized game', () => {
    expect(
      planImportGroupReconciliation({
        confirmedPlayerIds: ['confirmed-2'],
        groupName: buildPublicGroupLabel(['Guest AAAA0001', 'Guest BBBB0002']),
        originalRosterPlayerIds: ['phantom-1', 'phantom-2'],
        rosterPlayers,
      }),
    ).toEqual({
      playerIdsToRemove: ['phantom-1', 'phantom-2'],
      updatedGroupName: 'Guest CCCC0003',
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
        groupName: buildPublicGroupLabel(['Guest AAAA0001', 'Guest BBBB0002']),
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
        groupName: buildPublicGroupLabel(['Guest AAAA0001', 'Guest BBBB0002']),
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
    id: string;
    linked_user_id: string | null;
    publicLabel: string;
  }>;
};

type RecordedOp = { args: unknown[]; method: string };

function createAdminClientMock(state: AdminMockState) {
  const writes = {
    deletedPlayerIds: null as string[] | null,
    updatedGroupName: null as string | null,
  };
  const publicLabelById = new Map(
    state.players.map((player) => [player.id, player.publicLabel]),
  );

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

      // The reconciliation path never selects display_name — only id and
      // linked_user_id — so the mock row shape matches that contract.
      return {
        data: state.players.map((player) => ({
          id: player.id,
          linked_user_id: player.linked_user_id,
        })),
        error: null,
      };
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
    client: {
      from: (table: string) => createQueryStub(table),
      // Stands in for the production `get_public_player_names` RPC: it never
      // reads a private column, only the label the roster fixture assigns.
      rpc: (fn: string, args: Record<string, unknown>) => {
        if (fn !== 'get_public_player_names') {
          throw new Error(`Unexpected rpc ${fn}`);
        }

        const requestedIds = args.p_player_ids as string[];
        return Promise.resolve({
          data: requestedIds.map((playerId) => ({
            is_linked: state.players.find((player) => player.id === playerId)
              ?.linked_user_id != null,
            player_id: playerId,
            public_name: publicLabelById.get(playerId) ?? null,
          })),
          error: null,
        });
      },
    },
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
    group: {
      id: 'group-1',
      name: buildPublicGroupLabel(['Guest AAAA0001', 'Guest BBBB0002']),
    },
    players: [
      { id: 'phantom-1', linked_user_id: null, publicLabel: 'Guest AAAA0001' },
      { id: 'phantom-2', linked_user_id: null, publicLabel: 'Guest BBBB0002' },
      {
        id: 'confirmed-1',
        linked_user_id: 'user-izzy',
        publicLabel: 'fochizzy',
      },
      {
        id: 'confirmed-2',
        linked_user_id: null,
        publicLabel: 'Guest CCCC0003',
      },
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
      updatedGroupName: buildPublicGroupLabel(['fochizzy', 'Guest CCCC0003']),
    });

    expect(writes.deletedPlayerIds).toEqual(['phantom-1', 'phantom-2']);
    expect(writes.updatedGroupName).toBe(
      buildPublicGroupLabel(['fochizzy', 'Guest CCCC0003']),
    );
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

type ResolveGroupMemberUpsert = { options: unknown; rows: unknown };

type ResolveMockState = {
  existingPlayers: Array<{
    created_at: string;
    display_name: string;
    group_id: string;
    id: string;
    linked_user_id: string | null;
  }>;
  insertedGroup: { id: string; name: string };
  insertedPlayers: Array<{
    display_name: string;
    group_id: string;
    id: string;
    linked_user_id: string | null;
  }>;
  /** Public label the `get_public_player_names` rpc mock resolves per id. */
  publicLabelById: Record<string, string>;
};

function createResolveAdminMock(state: ResolveMockState) {
  const groupMemberUpserts: ResolveGroupMemberUpsert[] = [];
  const writes = { updatedGroupName: null as string | null };

  function createQueryStub(table: string) {
    const ctx = { didInsert: false, didUpdate: false };
    const stub: Record<string, unknown> = {};

    for (const method of ['eq', 'in', 'order', 'select']) {
      stub[method] = () => stub;
    }

    stub.insert = () => {
      ctx.didInsert = true;
      return stub;
    };
    stub.update = (values: { name?: string }) => {
      ctx.didUpdate = true;

      if (table === 'groups' && typeof values.name === 'string') {
        writes.updatedGroupName = values.name;
      }

      return stub;
    };
    stub.upsert = (rows: unknown, options: unknown) => {
      if (table === 'group_members') {
        groupMemberUpserts.push({ options, rows });
      }
      return stub;
    };

    function resolve() {
      if (table === 'players') {
        return ctx.didInsert
          ? { data: state.insertedPlayers, error: null }
          : { data: state.existingPlayers, error: null };
      }

      if (table === 'groups') {
        if (ctx.didUpdate) {
          return { data: null, error: null };
        }

        return { data: state.insertedGroup, error: null };
      }

      if (table === 'group_members' || table === 'group_settings') {
        return { data: null, error: null };
      }

      throw new Error(`Unexpected table ${table}`);
    }

    stub.single = () => Promise.resolve(resolve());
    stub.maybeSingle = () => Promise.resolve(resolve());
    stub.then = (
      onFulfilled: (value: unknown) => unknown,
      onRejected: (reason: unknown) => unknown,
    ) => Promise.resolve(resolve()).then(onFulfilled, onRejected);

    return stub;
  }

  function rpc(fn: string, args: Record<string, unknown>) {
    if (fn !== 'get_public_player_names') {
      throw new Error(`Unexpected rpc ${fn}`);
    }

    const requestedIds = args.p_player_ids as string[];
    const allPlayers = [...state.existingPlayers, ...state.insertedPlayers];

    return Promise.resolve({
      data: requestedIds.map((playerId) => ({
        is_linked:
          allPlayers.find((player) => player.id === playerId)
            ?.linked_user_id != null,
        player_id: playerId,
        public_name: state.publicLabelById[playerId] ?? null,
      })),
      error: null,
    });
  }

  return {
    client: {
      from: (table: string) => createQueryStub(table),
      rpc,
    },
    groupMemberUpserts,
    writes,
  };
}

describe('resolveOrCreateImportGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds the importing user as an editor of a newly created group even when they are not a participant', async () => {
    // Distinctive values that could only appear in the result if a private
    // personal name leaked through the new-group naming path.
    const SENTINEL_ALICE = 'Xyzzy-Private-Fullname-Alice';
    const SENTINEL_BOB = 'Xyzzy-Private-Fullname-Bob';
    const { client, groupMemberUpserts, writes } = createResolveAdminMock({
      existingPlayers: [],
      insertedGroup: { id: 'group-new', name: 'New group' },
      insertedPlayers: [
        {
          display_name: SENTINEL_ALICE,
          group_id: 'group-new',
          id: 'player-alice',
          linked_user_id: null,
        },
        {
          display_name: SENTINEL_BOB,
          group_id: 'group-new',
          id: 'player-bob',
          linked_user_id: null,
        },
      ],
      publicLabelById: {
        'player-alice': 'Guest 1111AAAA',
        'player-bob': 'Guest 2222BBBB',
      },
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as never);

    const result = await resolveOrCreateImportGroup({
      importingUserId: 'user-importer',
      participantNames: [SENTINEL_ALICE, SENTINEL_BOB],
    });

    expect(result.createdNewGroup).toBe(true);
    expect(result.groupId).toBe('group-new');
    // The returned and persisted group name is the roster's public label,
    // never the private display name the participants were submitted as.
    const expectedGroupName = buildPublicGroupLabel([
      'Guest 1111AAAA',
      'Guest 2222BBBB',
    ]);
    expect(result.groupName).toBe(expectedGroupName);
    expect(writes.updatedGroupName).toBe(expectedGroupName);
    expect(result.groupName).not.toContain(SENTINEL_ALICE);
    expect(result.groupName).not.toContain(SENTINEL_BOB);
    expect(result.selectedPlayerIds).toEqual(['player-alice', 'player-bob']);
    // The importer is not a roster participant, so they must still be granted
    // editor access — added only when absent so an existing role is preserved.
    expect(groupMemberUpserts).toContainEqual({
      options: { ignoreDuplicates: true, onConflict: 'group_id,user_id' },
      rows: { group_id: 'group-new', role: 'editor', user_id: 'user-importer' },
    });
  });
});
