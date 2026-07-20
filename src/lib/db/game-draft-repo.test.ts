import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as repo from './game-draft-repo';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { refreshGameMetricSnapshots } from './metric-refresh-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('./metric-refresh-repo', () => ({
  refreshGameMetricSnapshots: vi.fn(),
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
        data: { id: 'game-1' },
        error: null,
      }),
    };
    const revisionQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          snapshot: {
            awardClaims: {},
            expansionCodes: ['base'],
            gameId: 'game-1',
            generationCount: 11,
            groupId: '11111111-1111-4111-8111-111111111111',
            importedPlayerResolutions: [
              {
                decision: 'reused',
                identityMode: 'personal_name',
                normalizedImportedValue: 'known private name',
                parserIdentity: 'manual-web-import-v1',
                selectedPlayerId: '22222222-2222-4222-8222-222222222222',
                sourceFormat: 'manual_web_import',
                sourcePlayerText: 'Known Private Name',
                state: 'existing_unlinked_guest',
                valueSource: 'user_corrected',
              },
            ],
            mapId: 'tharsis',
            milestoneClaims: {},
            notes: 'Imported evidence',
            playedOn: '2026-07-04',
            playerCount: 3,
            playerScores: {},
            playerSelections: {},
            playerStyles: {},
            promoSetSlugs: [],
            selectedPlayerIds: [
              '22222222-2222-4222-8222-222222222222',
            ],
          },
        },
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

    const loaded = await repoModule.getDraftGameForm({
        gameId: 'game-1',
        groupId: '11111111-1111-4111-8111-111111111111',
      });

    expect(loaded).toMatchObject({
      gameId: 'game-1',
      generationCount: 11,
      importedPlayerResolutions: [
        {
          selectedPlayerId: '22222222-2222-4222-8222-222222222222',
          sourcePlayerText: 'Known Private Name',
          state: 'existing_unlinked_guest',
        },
      ],
      mapId: 'tharsis',
      playedOn: '2026-07-04',
      playerCount: 3,
      selectedPlayerIds: ['22222222-2222-4222-8222-222222222222'],
    });
    expect(loaded).not.toHaveProperty('expansionCodes');

    // A legacy snapshot may still carry the retired private matching key
    // (`normalizedImportedValue`). Resume must strip it at the parse
    // boundary so no caller — including an unrelated group member resuming
    // this draft — can retrieve the private value from the client form.
    const resumedResolutions = (
      loaded as {
        importedPlayerResolutions: Array<Record<string, unknown>>;
      }
    ).importedPlayerResolutions;
    expect(resumedResolutions[0]).not.toHaveProperty(
      'normalizedImportedValue',
    );
    expect(JSON.stringify(loaded)).not.toContain('known private name');

    // The legacy snapshot above predates objectiveConfiguration. Resuming it
    // must require review ('unknown'), never silently confirm board_defined
    // setup that was never recorded.
    expect(loaded).toMatchObject({ objectiveConfiguration: 'unknown' });

    expect(gameQuery.eq).toHaveBeenCalledWith(
      'group_id',
      '11111111-1111-4111-8111-111111111111',
    );
    expect(gameQuery.eq).toHaveBeenCalledWith('status', 'draft');
    expect(revisionQuery.eq).toHaveBeenCalledWith('game_id', 'game-1');
  });
});
describe('finalizeGameLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes persisted metric snapshots after finalized data and revision writes succeed', async () => {
    vi.mocked(refreshGameMetricSnapshots).mockResolvedValue(undefined);

    const setupDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const setupDelete = vi.fn(() => ({ eq: setupDeleteEq }));
    const gameInsertSingle = vi.fn().mockResolvedValue({
      data: { id: 'game-final' },
      error: null,
    });
    const gameInsertSelect = vi.fn(() => ({ single: gameInsertSingle }));
    const gameInsert = vi.fn(() => ({ select: gameInsertSelect }));
    const groupSettingsMaybeSingle = vi.fn().mockResolvedValue({
      data: { default_guaranteed_merger_offer: true },
      error: null,
    });
    const groupSettingsEq = vi.fn(() => ({ maybeSingle: groupSettingsMaybeSingle }));
    const groupSettingsSelect = vi.fn(() => ({ eq: groupSettingsEq }));
    const playerDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const playerDelete = vi.fn(() => ({ eq: playerDeleteEq }));
    const playerInsertSelect = vi.fn().mockResolvedValue({
      data: [{ id: 'game-player-1', player_id: 'player-1' }],
      error: null,
    });
    const playerInsert = vi.fn(() => ({ select: playerInsertSelect }));
    const revisionInsert = vi.fn().mockResolvedValue({ error: null });

    const finalizeClient = {
      from: vi.fn((table: string) => {
        if (table === 'game_players') {
          return {
            delete: playerDelete,
            insert: playerInsert,
          };
        }

        if (table === 'game_revisions') {
          return {
            insert: revisionInsert,
          };
        }

        throw new Error(`Unexpected finalize table ${table}`);
      }),
    };
    const upsertClient = {
      from: vi.fn((table: string) => {
        if (table === 'games') {
          return {
            insert: gameInsert,
          };
        }

        if (table === 'group_settings') {
          return { select: groupSettingsSelect };
        }

        throw new Error(`Unexpected upsert table ${table}`);
      }),
    };
    const setupClient = {
      from: vi.fn((table: string) => {
        if (table === 'game_promo_sets') {
          return {
            delete: setupDelete,
          };
        }

        throw new Error(`Unexpected setup table ${table}`);
      }),
    };
    const revisionClient = {
      from: vi.fn((table: string) => {
        if (table === 'game_revisions') {
          return {
            insert: revisionInsert,
          };
        }

        throw new Error(`Unexpected revision table ${table}`);
      }),
    };

    vi.mocked(createSupabaseServerClient)
      .mockResolvedValueOnce(finalizeClient as never)
      .mockResolvedValueOnce(upsertClient as never)
      .mockResolvedValueOnce(setupClient as never)
      .mockResolvedValueOnce(revisionClient as never);

    await expect(
      repo.finalizeGameLog({
        form: {
          awardClaims: {},
          generationCount: 10,
          guaranteedMergerOffer: true,
          groupId: '11111111-1111-4111-8111-111111111111',
          mapId: 'tharsis',
          objectiveConfiguration: 'board_defined',
          mergerOfferRuleSource: 'group_default',
          milestoneClaims: {},
          notes: '',
          playedOn: '2026-07-08',
          playerCount: 1,
          playerScores: {},
          playerSelections: {},
          playerStyles: {},
          promoSetSlugs: [],
          selectedPlayerIds: ['player-1'],
        },
        finalizedPayload: {
          awards: [],
          declaredStyles: [],
          gameUpdate: {
            catalog_snapshot_id: 'catalog-1',
            status: 'finalized',
          },
          inferredStyles: [],
          keyCards: [],
          milestones: [],
          players: [
            {
              awardPoints: 0,
              cardPointsAnimals: null,
              cardPointsJovian: null,
              cardPointsMicrobes: null,
              cardPointsTotal: 8,
              citiesPoints: 6,
              corporationId: 'corp-1',
              finalMegacredits: 12,
              greeneryPoints: 7,
              isWinner: true,
              milestonePoints: 0,
              otherCardPoints: null,
              placement: 1,
              playerId: 'player-1',
              totalPoints: 63,
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
            snapshot: { gameId: 'game-final' },
          },
        },
        userId: 'user-1',
      }),
    ).resolves.toEqual({ gameId: 'game-final' });

    expect(gameInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        guaranteed_merger_offer: true,
        guaranteed_merger_offer_source: 'group_default',
      }),
    );
    expect(revisionInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        game_id: 'game-final',
        revision_note: 'Finalize game results',
      }),
    );
    expect(refreshGameMetricSnapshots).toHaveBeenCalledWith('game-final');
  });
});

describe('saveDraftGame canonical-evidence isolation (Workstream 11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resume-then-save touches only the draft tables, never the import evidence stores', async () => {
    const touchedTables: string[] = [];
    const results: Record<string, Array<{ data?: unknown; error?: null }>> = {
      game_promo_sets: [{ data: null, error: null }],
      game_revisions: [{ data: null, error: null }],
      games: [
        {
          data: {
            guaranteed_merger_offer: true,
            guaranteed_merger_offer_source: 'group_default',
          },
          error: null,
        },
        { data: { id: 'game-1' }, error: null },
      ],
    };
    const from = vi.fn((table: string) => {
      touchedTables.push(table);
      const next = results[table]?.shift() ?? { data: null, error: null };
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      builder.select = vi.fn(chain);
      builder.insert = vi.fn(chain);
      builder.update = vi.fn(chain);
      builder.delete = vi.fn(chain);
      builder.eq = vi.fn(chain);
      builder.in = vi.fn(chain);
      builder.maybeSingle = vi.fn(async () => next);
      builder.single = vi.fn(async () => next);
      builder.then = (
        resolve: (value: unknown) => unknown,
        reject: (reason: unknown) => unknown,
      ) => Promise.resolve(next).then(resolve, reject);
      return builder;
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ from } as never);

    await repo.saveDraftGame({
      form: {
        gameId: 'game-1',
        generationCount: 10,
        groupId: '22222222-2222-4222-8222-222222222222',
        mapId: 'map-tharsis',
        notes: '',
        playedOn: '2026-07-19',
        playerCount: 2,
        promoSetSlugs: [],
      } as never,
      userId: 'user-1',
    });

    expect(new Set(touchedTables)).toEqual(
      new Set(['games', 'game_promo_sets', 'game_revisions']),
    );
    // Saving or resuming a draft must never rewrite the immutable import
    // evidence: no parser rerun, no duplicated events or placements, no
    // rewritten original source, no expansion-state mutation.
    for (const evidenceTable of [
      'game_log_imports',
      'game_log_events',
      'game_expansion_facts',
      'game_capture_import_sources',
      'game_capture_parser_runs',
      'game_capture_events',
      'game_capture_board_placements',
    ]) {
      expect(touchedTables).not.toContain(evidenceTable);
    }
  });
});
