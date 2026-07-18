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
      mapId: 'tharsis',
      playedOn: '2026-07-04',
      playerCount: 3,
    });
    expect(loaded).not.toHaveProperty('expansionCodes');

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
