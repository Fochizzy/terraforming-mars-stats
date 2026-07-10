import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as repo from './game-draft-repo';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logGameDraftSchema } from '@/lib/validation/log-game';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
  getServerEnv: () => ({
    SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE: 'tm-import-evidence',
  }),
}));

describe('getDraftGameForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the latest saved draft snapshot for a group draft game', async () => {
    const gameQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'game-1', status: 'draft' },
        error: null,
      }),
    };
    const revisionQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            snapshot: {
              awardClaims: {},
              expansionCodes: ['base'],
              gameId: 'game-1',
              generationCount: 11,
              groupId: '11111111-1111-4111-8111-111111111111',
              mapId: 'tharsis',
              milestoneClaims: {},
              notes: 'Imported evidence',
              playedOn: '2026-07-04',
              playerCount: 3,
              playerScores: {},
              playerSelections: {},
              playerStyles: {},
              promoSetSlugs: [],
              selectedPlayerIds: [],
            },
          },
        ],
        error: null,
      }),
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'games') {
          return gameQuery;
        }

        if (table === 'game_revisions') {
          return revisionQuery;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    const repoModule = repo as {
      getDraftGameForm?: (input: {
        gameId: string;
        groupId: string;
      }) => Promise<unknown>;
    };

    expect(repoModule.getDraftGameForm).toBeTypeOf('function');
    if (!repoModule.getDraftGameForm) {
      return;
    }

    await expect(
      repoModule.getDraftGameForm({
        gameId: 'game-1',
        groupId: '11111111-1111-4111-8111-111111111111',
      }),
    ).resolves.toMatchObject({
      gameId: 'game-1',
      generationCount: 11,
      mapId: 'tharsis',
      playedOn: '2026-07-04',
      playerCount: 3,
    });

    expect(gameQuery.eq).toHaveBeenCalledWith(
      'group_id',
      '11111111-1111-4111-8111-111111111111',
    );
    expect(revisionQuery.eq).toHaveBeenCalledWith('game_id', 'game-1');
  });
});

describe('getSavedGameForm revision fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const draftFormSnapshot = {
    awardClaims: {},
    expansionCodes: ['base'],
    gameId: 'game-final',
    generationCount: 11,
    groupId: '11111111-1111-4111-8111-111111111111',
    mapId: 'tharsis',
    milestoneClaims: {},
    notes: '',
    playedOn: '2026-07-04',
    playerCount: 3,
    playerScores: {},
    playerSelections: {},
    playerStyles: {},
    promoSetSlugs: [],
    selectedPlayerIds: [],
  };

  // A finalize revision written before the snapshot carried the whole form.
  const legacyFinalizeSnapshot = {
    awardClaims: {},
    awards: [],
    catalogSnapshotId: 'snap-1',
    gameId: 'game-final',
    milestoneClaims: {},
    milestones: [],
    notes: '',
    players: [],
    playerSelections: {},
    playerStyles: {},
    preludes: [],
    selectedPlayerIds: [],
  };

  function mockRevisions(snapshots: unknown[]) {
    const gameQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'game-final', status: 'draft' },
        error: null,
      }),
    };
    const revisionQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: snapshots.map((snapshot) => ({ snapshot })),
        error: null,
      }),
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) =>
        table === 'games' ? gameQuery : revisionQuery,
      ),
    } as never);

    return { gameQuery, revisionQuery };
  }

  it('falls back to the newest revision that still parses as a draft form', async () => {
    mockRevisions([legacyFinalizeSnapshot, draftFormSnapshot]);

    await expect(
      repo.getSavedGameForm({
        gameId: 'game-final',
        groupId: '11111111-1111-4111-8111-111111111111',
      }),
    ).resolves.toMatchObject({
      form: { mapId: 'tharsis', playedOn: '2026-07-04', playerCount: 3 },
      status: 'draft',
    });
  });

  it('returns null instead of throwing when no revision parses', async () => {
    mockRevisions([legacyFinalizeSnapshot]);

    await expect(
      repo.getSavedGameForm({
        gameId: 'game-final',
        groupId: '11111111-1111-4111-8111-111111111111',
      }),
    ).resolves.toBeNull();
  });
});

describe('deleteSavedGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a saved game in the active group and removes import evidence files first', async () => {
    const gameLookupQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'game-final' },
        error: null,
      }),
    };
    const legacyImportsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { screenshot_object_path: 'game-final/legacy.png' },
          { screenshot_object_path: null },
        ],
        error: null,
      }),
    };
    const screenshotImportsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ storage_object_path: 'game-final/result.png' }],
        error: null,
      }),
    };
    const deleteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'game-final' },
        error: null,
      }),
    };
    const remove = vi.fn().mockResolvedValue({ data: [], error: null });
    const storageFrom = vi.fn().mockReturnValue({ remove });
    let gamesCallCount = 0;
    const from = vi.fn((table: string) => {
      if (table === 'games') {
        gamesCallCount += 1;
        return gamesCallCount === 1 ? gameLookupQuery : deleteQuery;
      }

      if (table === 'game_log_imports') {
        return legacyImportsQuery;
      }

      if (table === 'game_result_screenshot_imports') {
        return screenshotImportsQuery;
      }

      throw new Error(`Unexpected table ${table}`);
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from,
      storage: {
        from: storageFrom,
      },
    } as never);

    const repoModule = repo as {
      deleteSavedGame?: (input: {
        gameId: string;
        groupId: string;
      }) => Promise<unknown>;
    };

    expect(repoModule.deleteSavedGame).toBeTypeOf('function');
    if (!repoModule.deleteSavedGame) {
      return;
    }

    await expect(
      repoModule.deleteSavedGame({
        gameId: 'game-final',
        groupId: 'group-1',
      }),
    ).resolves.toEqual({ gameId: 'game-final' });

    expect(gameLookupQuery.eq).toHaveBeenCalledWith('id', 'game-final');
    expect(gameLookupQuery.eq).toHaveBeenCalledWith('group_id', 'group-1');
    expect(storageFrom).toHaveBeenCalledWith('tm-import-evidence');
    expect(remove).toHaveBeenCalledWith([
      'game-final/legacy.png',
      'game-final/result.png',
    ]);
    expect(deleteQuery.eq).toHaveBeenCalledWith('id', 'game-final');
    expect(deleteQuery.eq).toHaveBeenCalledWith('group_id', 'group-1');
  });

  it('refuses to delete a missing or inaccessible game', async () => {
    const gameLookupQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };
    const from = vi.fn((table: string) => {
      if (table === 'games') {
        return gameLookupQuery;
      }

      throw new Error(`Unexpected table ${table}`);
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from,
    } as never);

    const repoModule = repo as {
      deleteSavedGame?: (input: {
        gameId: string;
        groupId: string;
      }) => Promise<unknown>;
    };

    expect(repoModule.deleteSavedGame).toBeTypeOf('function');
    if (!repoModule.deleteSavedGame) {
      return;
    }

    await expect(
      repoModule.deleteSavedGame({
        gameId: 'game-final',
        groupId: 'group-1',
      }),
    ).rejects.toThrow(/saved game not found/i);
  });

  it('still deletes saved games when the split screenshot import table is unavailable', async () => {
    const gameLookupQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'game-draft' },
        error: null,
      }),
    };
    const legacyImportsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ screenshot_object_path: 'game-draft/legacy.png' }],
        error: null,
      }),
    };
    const screenshotImportsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST205',
          message: "Could not find the table 'game_result_screenshot_imports'",
        },
      }),
    };
    const deleteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'game-draft' },
        error: null,
      }),
    };
    const remove = vi.fn().mockResolvedValue({ data: [], error: null });
    let gamesCallCount = 0;
    const from = vi.fn((table: string) => {
      if (table === 'games') {
        gamesCallCount += 1;
        return gamesCallCount === 1 ? gameLookupQuery : deleteQuery;
      }

      if (table === 'game_log_imports') {
        return legacyImportsQuery;
      }

      if (table === 'game_result_screenshot_imports') {
        return screenshotImportsQuery;
      }

      throw new Error(`Unexpected table ${table}`);
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from,
      storage: {
        from: vi.fn().mockReturnValue({ remove }),
      },
    } as never);

    const repoModule = repo as {
      deleteSavedGame?: (input: {
        gameId: string;
        groupId: string;
      }) => Promise<unknown>;
    };

    expect(repoModule.deleteSavedGame).toBeTypeOf('function');
    if (!repoModule.deleteSavedGame) {
      return;
    }

    await expect(
      repoModule.deleteSavedGame({
        gameId: 'game-draft',
        groupId: 'group-1',
      }),
    ).resolves.toEqual({ gameId: 'game-draft' });

    expect(remove).toHaveBeenCalledWith(['game-draft/legacy.png']);
  });
});

describe('finalizeGameLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes setup preludes and mid-game preludes to separate tables', async () => {
    const finalGamePlayersDeleteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const finalGamePlayersInsertQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: [{ id: 'game-player-1', player_id: 'player-1' }],
        error: null,
      }),
    };
    let finalGamePlayersCallCount = 0;
    const corporationInsert = vi.fn().mockResolvedValue({ error: null });
    const preludeInsert = vi.fn().mockResolvedValue({ error: null });
    const midgamePreludeInsert = vi.fn().mockResolvedValue({ error: null });
    const finalClient = {
      from: vi.fn((table: string) => {
        if (table === 'game_players') {
          finalGamePlayersCallCount += 1;
          return finalGamePlayersCallCount === 1
            ? finalGamePlayersDeleteQuery
            : finalGamePlayersInsertQuery;
        }

        if (table === 'game_player_corporations') {
          return { insert: corporationInsert };
        }

        if (table === 'game_player_preludes') {
          return { insert: preludeInsert };
        }

        if (table === 'game_player_midgame_preludes') {
          return { insert: midgamePreludeInsert };
        }

        throw new Error(`Unexpected finalization table ${table}`);
      }),
    };
    const updateGameQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'game-1' },
        error: null,
      }),
    };
    const shellClient = {
      from: vi.fn(() => updateGameQuery),
    };
    const setupDeleteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const setupClient = {
      from: vi.fn(() => setupDeleteQuery),
    };
    const revisionClient = {
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })),
    };

    vi.mocked(createSupabaseServerClient)
      .mockResolvedValueOnce(finalClient as never)
      .mockResolvedValueOnce(shellClient as never)
      .mockResolvedValueOnce(setupClient as never)
      .mockResolvedValueOnce(revisionClient as never);

    await expect(
      repo.finalizeGameLog({
        form: {
          awardClaims: {},
          expansionCodes: [],
          gameId: 'game-1',
          generationCount: 10,
          groupId: '11111111-1111-4111-8111-111111111111',
          mapId: 'tharsis',
          milestoneClaims: {},
          notes: '',
          playedOn: '2026-07-08',
          playerCount: 1,
          playerScores: {},
          playerSelections: {
            'player-1': {
              corporationId: 'corp-1',
              corporationIds: ['corp-1'],
              midgamePreludeIds: ['prelude-2'],
              preludeIds: ['prelude-1'],
            },
          },
          playerStyles: {},
          promoSetSlugs: [],
          selectedPlayerIds: ['player-1'],
        },
        finalizedPayload: {
          awards: [],
          corporations: [{ playerId: 'player-1', corporationId: 'corp-1' }],
          declaredStyles: [],
          gameUpdate: {
            catalog_snapshot_id: null,
            status: 'finalized',
          },
          inferredStyles: [],
          keyCards: [],
          midgamePreludes: [{ playerId: 'player-1', preludeId: 'prelude-2' }],
          milestones: [],
          players: [
            {
              awardPoints: 0,
              cardPointsAnimals: null,
              cardPointsJovian: null,
              cardPointsMicrobes: null,
              cardPointsTotal: 0,
              citiesPoints: 0,
              corporationId: 'corp-1',
              corporationIds: ['corp-1'],
              finalMegacredits: 0,
              greeneryPoints: 0,
              isWinner: true,
              milestonePoints: 0,
              otherCardPoints: null,
              placement: 1,
              playerId: 'player-1',
              totalPoints: 42,
              trPoints: 42,
            },
          ],
          preludes: [{ playerId: 'player-1', preludeId: 'prelude-1' }],
          review: {
            coverage: {
              playersWithCardBreakdown: 0,
              playersWithDeclaredStyle: 0,
              playersWithKeyCards: 0,
              playersWithOptionalSubscores: 0,
            },
            issues: [],
          },
          revision: {
            note: 'Finalize game results',
            snapshot: {},
          },
        },
        userId: 'user-1',
      }),
    ).resolves.toEqual({ gameId: 'game-1' });

    expect(preludeInsert).toHaveBeenCalledWith([
      { game_player_id: 'game-player-1', prelude_id: 'prelude-1' },
    ]);
    expect(midgamePreludeInsert).toHaveBeenCalledWith([
      { game_player_id: 'game-player-1', prelude_id: 'prelude-2' },
    ]);
  });

  it('writes every selected corporation for a finalized player', async () => {
    const finalGamePlayersDeleteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const finalGamePlayersInsertQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: [{ id: 'game-player-1', player_id: 'player-1' }],
        error: null,
      }),
    };
    let finalGamePlayersCallCount = 0;
    const corporationInsert = vi.fn().mockResolvedValue({ error: null });
    const finalClient = {
      from: vi.fn((table: string) => {
        if (table === 'game_players') {
          finalGamePlayersCallCount += 1;
          return finalGamePlayersCallCount === 1
            ? finalGamePlayersDeleteQuery
            : finalGamePlayersInsertQuery;
        }

        if (table === 'game_player_corporations') {
          return { insert: corporationInsert };
        }

        throw new Error(`Unexpected finalization table ${table}`);
      }),
    };
    const updateGameQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'game-1' },
        error: null,
      }),
    };
    const shellClient = {
      from: vi.fn((table: string) => {
        if (table === 'games') {
          return updateGameQuery;
        }

        throw new Error(`Unexpected shell table ${table}`);
      }),
    };
    const setupDeleteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const setupClient = {
      from: vi.fn((table: string) => {
        if (table === 'game_expansions' || table === 'game_promo_sets') {
          return setupDeleteQuery;
        }

        throw new Error(`Unexpected setup table ${table}`);
      }),
    };
    const revisionInsert = vi.fn().mockResolvedValue({ error: null });
    const revisionClient = {
      from: vi.fn((table: string) => {
        if (table === 'game_revisions') {
          return { insert: revisionInsert };
        }

        throw new Error(`Unexpected revision table ${table}`);
      }),
    };

    vi.mocked(createSupabaseServerClient)
      .mockResolvedValueOnce(finalClient as never)
      .mockResolvedValueOnce(shellClient as never)
      .mockResolvedValueOnce(setupClient as never)
      .mockResolvedValueOnce(revisionClient as never);

    await expect(
      repo.finalizeGameLog({
        form: {
          awardClaims: {},
          expansionCodes: [],
          gameId: 'game-1',
          generationCount: 10,
          groupId: '11111111-1111-4111-8111-111111111111',
          mapId: 'tharsis',
          milestoneClaims: {},
          notes: '',
          playedOn: '2026-07-08',
          playerCount: 1,
          playerScores: {},
          playerSelections: {
            'player-1': {
              corporationId: 'corp-1',
              corporationIds: ['corp-1', 'corp-2'],
              midgamePreludeIds: [],
              preludeIds: [],
            },
          },
          playerStyles: {},
          promoSetSlugs: [],
          selectedPlayerIds: ['player-1'],
        },
        finalizedPayload: {
          awards: [],
          corporations: [
            { playerId: 'player-1', corporationId: 'corp-1' },
            { playerId: 'player-1', corporationId: 'corp-2' },
          ],
          declaredStyles: [],
          gameUpdate: {
            catalog_snapshot_id: null,
            status: 'finalized',
          },
          inferredStyles: [],
          keyCards: [],
          midgamePreludes: [],
          milestones: [],
          players: [
            {
              awardPoints: 0,
              cardPointsAnimals: null,
              cardPointsJovian: null,
              cardPointsMicrobes: null,
              cardPointsTotal: 0,
              citiesPoints: 0,
              corporationId: 'corp-1',
              corporationIds: ['corp-1', 'corp-2'],
              finalMegacredits: 0,
              greeneryPoints: 0,
              isWinner: true,
              milestonePoints: 0,
              otherCardPoints: null,
              placement: 1,
              playerId: 'player-1',
              totalPoints: 42,
              trPoints: 42,
            },
          ],
          preludes: [],
          review: {
            coverage: {
              playersWithCardBreakdown: 0,
              playersWithDeclaredStyle: 0,
              playersWithKeyCards: 0,
              playersWithOptionalSubscores: 0,
            },
            issues: [],
          },
          revision: {
            note: 'Finalize game results',
            snapshot: {},
          },
        },
        userId: 'user-1',
      }),
    ).resolves.toEqual({ gameId: 'game-1' });

    expect(finalGamePlayersInsertQuery.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        corporation_id: 'corp-1',
        player_id: 'player-1',
      }),
    ]);
    expect(corporationInsert).toHaveBeenCalledWith([
      {
        game_player_id: 'game-player-1',
        corporation_id: 'corp-1',
      },
      {
        game_player_id: 'game-player-1',
        corporation_id: 'corp-2',
      },
    ]);

    // The finalize revision must stay loadable by getSavedGameForm, otherwise
    // reopening or correcting the game 500s.
    const revisionSnapshot = revisionInsert.mock.calls[0]?.[0]?.snapshot;

    expect(logGameDraftSchema.safeParse(revisionSnapshot).success).toBe(true);
    expect(revisionSnapshot).toMatchObject({
      gameId: 'game-1',
      generationCount: 10,
      groupId: '11111111-1111-4111-8111-111111111111',
      mapId: 'tharsis',
      playedOn: '2026-07-08',
      playerCount: 1,
    });
  });
});

describe('getSavedGameForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the latest saved snapshot for a finalized group game', async () => {
    const gameQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'game-final', status: 'finalized' },
        error: null,
      }),
    };
    const revisionQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            snapshot: {
              awardClaims: {},
              expansionCodes: ['base'],
              gameId: 'game-final',
              generationCount: 12,
              groupId: '11111111-1111-4111-8111-111111111111',
              mapId: 'tharsis',
              milestoneClaims: {},
              notes: 'Corrected result',
              playedOn: '2026-07-06',
              playerCount: 4,
              playerScores: {},
              playerSelections: {},
              playerStyles: {},
              promoSetSlugs: [],
              selectedPlayerIds: ['player-1', 'player-2'],
            },
          },
        ],
        error: null,
      }),
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'games') {
          return gameQuery;
        }

        if (table === 'game_revisions') {
          return revisionQuery;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    const repoModule = repo as {
      getSavedGameForm?: (input: {
        gameId: string;
        groupId: string;
      }) => Promise<unknown>;
    };

    expect(repoModule.getSavedGameForm).toBeTypeOf('function');
    if (!repoModule.getSavedGameForm) {
      return;
    }

    await expect(
      repoModule.getSavedGameForm({
        gameId: 'game-final',
        groupId: '11111111-1111-4111-8111-111111111111',
      }),
    ).resolves.toMatchObject({
      form: {
        gameId: 'game-final',
        generationCount: 12,
        mapId: 'tharsis',
        playedOn: '2026-07-06',
        playerCount: 4,
      },
      status: 'finalized',
    });

    expect(gameQuery.eq).toHaveBeenCalledWith(
      'group_id',
      '11111111-1111-4111-8111-111111111111',
    );
    expect(revisionQuery.eq).toHaveBeenCalledWith('game_id', 'game-final');
  });
});

describe('listSavedGames', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists recent draft and finalized games with player summaries', async () => {
    const gamesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'game-draft',
            player_count: 2,
            played_on: '2026-07-07',
            status: 'draft',
            updated_at: '2026-07-08T09:00:00.000Z',
          },
          {
            id: 'game-final',
            player_count: 2,
            played_on: '2026-07-06',
            status: 'finalized',
            updated_at: '2026-07-08T08:00:00.000Z',
          },
        ],
        error: null,
      }),
    };
    const revisionsQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            created_at: '2026-07-08T09:00:00.000Z',
            game_id: 'game-draft',
            snapshot: {
              selectedPlayerIds: ['player-1', 'player-2'],
            },
          },
          {
            created_at: '2026-07-08T08:00:00.000Z',
            game_id: 'game-final',
            snapshot: {
              selectedPlayerIds: ['player-1', 'Typed Player'],
            },
          },
        ],
        error: null,
      }),
    };
    const playersQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { display_name: 'Friday Mars', id: 'player-1' },
          { display_name: 'Izzy Hodnett', id: 'player-2' },
        ],
        error: null,
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'games') {
          return gamesQuery;
        }

        if (table === 'game_revisions') {
          return revisionsQuery;
        }

        if (table === 'players') {
          return playersQuery;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    const repoModule = repo as {
      listSavedGames?: (input: {
        groupId: string;
        limit: number;
      }) => Promise<unknown>;
    };

    expect(repoModule.listSavedGames).toBeTypeOf('function');
    if (!repoModule.listSavedGames) {
      return;
    }

    await expect(
      repoModule.listSavedGames({
        groupId: '11111111-1111-4111-8111-111111111111',
        limit: 10,
      }),
    ).resolves.toEqual([
      {
        gameId: 'game-draft',
        playerCount: 2,
        playerNames: ['Friday Mars', 'Izzy Hodnett'],
        playedOn: '2026-07-07',
        status: 'draft',
        updatedAt: '2026-07-08T09:00:00.000Z',
      },
      {
        gameId: 'game-final',
        playerCount: 2,
        playerNames: ['Friday Mars', 'Typed Player'],
        playedOn: '2026-07-06',
        status: 'finalized',
        updatedAt: '2026-07-08T08:00:00.000Z',
      },
    ]);

    expect(gamesQuery.eq).toHaveBeenCalledWith(
      'group_id',
      '11111111-1111-4111-8111-111111111111',
    );
    expect(revisionsQuery.in).toHaveBeenCalledWith('game_id', [
      'game-draft',
      'game-final',
    ]);
    expect(playersQuery.eq).toHaveBeenCalledWith(
      'group_id',
      '11111111-1111-4111-8111-111111111111',
    );
  });
});

describe('reopenSavedGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function buildReopenQuery(
    result: { data: unknown; error: unknown } = {
      data: { id: 'game-final' },
      error: null,
    },
  ) {
    return {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(result),
    };
  }

  it('moves a finalized game back to draft and clears its finalized bookkeeping', async () => {
    const reopenQuery = buildReopenQuery();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn(() => reopenQuery),
    } as never);

    await expect(
      repo.reopenSavedGame({
        gameId: 'game-final',
        groupId: '11111111-1111-4111-8111-111111111111',
        userId: 'user-1',
      }),
    ).resolves.toEqual({ gameId: 'game-final' });

    expect(reopenQuery.update).toHaveBeenCalledWith({
      status: 'draft',
      updated_by_user_id: 'user-1',
      catalog_snapshot_id: null,
      finalized_at: null,
      finalized_by_user_id: null,
    });
    expect(reopenQuery.eq).toHaveBeenCalledWith('id', 'game-final');
    expect(reopenQuery.eq).toHaveBeenCalledWith(
      'group_id',
      '11111111-1111-4111-8111-111111111111',
    );
    // Guards against reopening a game that is already a draft.
    expect(reopenQuery.eq).toHaveBeenCalledWith('status', 'finalized');
  });

  it('throws when no finalized game matches the group', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn(() => buildReopenQuery({ data: null, error: null })),
    } as never);

    await expect(
      repo.reopenSavedGame({
        gameId: 'game-draft',
        groupId: '11111111-1111-4111-8111-111111111111',
        userId: 'user-1',
      }),
    ).rejects.toThrow(/not found or you do not have permission to reopen it/i);
  });
});
