import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as repo from './game-draft-repo';
import { createSupabaseServerClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
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
    expect(gameQuery.eq).toHaveBeenCalledWith('status', 'draft');
    expect(revisionQuery.eq).toHaveBeenCalledWith('game_id', 'game-1');
  });
});
