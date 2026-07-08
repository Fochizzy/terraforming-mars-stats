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
        data: { id: 'game-1', status: 'draft' },
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
    expect(revisionQuery.eq).toHaveBeenCalledWith('game_id', 'game-1');
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
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
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
