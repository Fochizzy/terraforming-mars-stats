import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getOverallExtendedAnalytics,
  listImportedCardAndTagOutcomes,
} from './extended-analytics-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('listImportedCardAndTagOutcomes', () => {
  it('excludes an Event card from tag outcomes while keeping its card-play outcome', async () => {
    const rpc = vi.fn(async () => ({ data: [], error: null }));

    const resultEq = vi.fn().mockResolvedValue({
      data: [
        {
          game_id: 'game-1',
          group_id: 'group-1',
          is_winner: true,
          played_on: '2026-07-01',
          player_id: 'me-1',
          player_name: 'Friday Mars',
          total_points: 80,
        },
      ],
      error: null,
    });
    const resultSelect = vi.fn().mockReturnValue({ eq: resultEq });

    const importsIn = vi.fn().mockResolvedValue({
      data: [{ game_id: 'game-1', id: 'import-1' }],
      error: null,
    });
    const importsSelect = vi.fn().mockReturnValue({ in: importsIn });

    const eventsIn = vi.fn().mockResolvedValue({
      data: [
        {
          card_id: 'card-asteroid',
          event_type: 'card_played',
          game_log_import_id: 'import-1',
          payload: { actor: 'Friday Mars', cardName: 'Asteroid' },
        },
        {
          // Solar Flare's printed tags — including a second 'event'/'space'
          // pair — must never reach tagOutcomeRows: it's an Event card.
          card_id: 'card-solar-flare',
          event_type: 'card_played',
          game_log_import_id: 'import-1',
          payload: { actor: 'Friday Mars', cardName: 'Solar Flare' },
        },
      ],
      error: null,
    });
    const eventsSelect = vi.fn().mockReturnValue({ in: eventsIn });

    const aliasesEq = vi.fn().mockResolvedValue({
      data: [
        {
          group_id: 'group-1',
          normalized_alias: 'friday mars',
          player_id: 'me-1',
        },
      ],
      error: null,
    });
    const aliasesIn = vi.fn().mockReturnValue({ eq: aliasesEq });
    const aliasesSelect = vi.fn().mockReturnValue({ in: aliasesIn });

    const cardsIn = vi.fn().mockResolvedValue({
      data: [
        {
          card_name: 'Asteroid',
          card_type: 'Automated',
          gameplay_tags: ['space'],
          id: 'card-asteroid',
        },
        {
          card_name: 'Solar Flare',
          card_type: 'Event',
          gameplay_tags: ['event', 'space'],
          id: 'card-solar-flare',
        },
      ],
      error: null,
    });
    const cardsSelect = vi.fn().mockReturnValue({ in: cardsIn });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'game_log_imports') {
          return { select: importsSelect };
        }

        if (table === 'game_log_events') {
          return { select: eventsSelect };
        }

        if (table === 'player_import_aliases') {
          return { select: aliasesSelect };
        }

        if (table === 'cards') {
          return { select: cardsSelect };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc,
      schema: vi.fn((schemaName: string) => {
        if (schemaName !== 'analytics') {
          throw new Error(`Unexpected schema ${schemaName}`);
        }

        return {
          from: vi.fn((table: string) => {
            if (table === 'player_game_results') {
              return { select: resultSelect };
            }

            throw new Error(`Unexpected analytics table ${table}`);
          }),
        };
      }),
    } as never);

    const { cardOutcomeRows, tagOutcomeRows } =
      await listImportedCardAndTagOutcomes('group-1');

    expect(cardOutcomeRows.map((row) => row.cardName).sort()).toEqual([
      'Asteroid',
      'Solar Flare',
    ]);

    // Exact-length array: if Solar Flare's tags leaked in, this would show a
    // second 'space' contribution (tagCount: 2) and/or an 'event' entry.
    expect(tagOutcomeRows).toEqual([
      expect.objectContaining({
        gameId: 'game-1',
        tagCode: 'space',
        tagCount: 1,
      }),
    ]);
  });
});

/**
 * Overall scope reads twenty-odd analytics views for one render. A single
 * failing view used to reject the shared Promise.all, which discarded every
 * other view's rows and blanked the entire scope — Tag profiles and Preferred
 * corporations included, even though their own views had returned data.
 */
describe('getOverallExtendedAnalytics', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockAnalyticsViews(responseFor: (table: string) => unknown) {
    const query = (table: string) => {
      const chain: Record<string, unknown> = {};
      for (const method of ['select', 'in', 'eq', 'gt', 'order']) {
        chain[method] = () => chain;
      }
      chain.then = (
        resolve: (value: unknown) => unknown,
        reject: (reason: unknown) => unknown,
      ) => Promise.resolve(responseFor(table)).then(resolve, reject);
      return chain;
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: (table: string) => query(table),
      rpc: async () => ({ data: [], error: null }),
      schema: () => ({ from: (table: string) => query(table) }),
    } as never);
  }

  it('keeps the views that loaded when one view times out', async () => {
    const timeout = {
      code: '57014',
      message: 'canceling statement due to statement timeout',
    };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockAnalyticsViews((table) => {
      if (table === 'player_card_outcomes') {
        return { data: null, error: timeout };
      }

      if (table === 'player_tag_outcomes') {
        return {
          data: [
            {
              corporation_id: 'corp-1',
              corporation_name: 'Helion',
              game_id: 'game-1',
              group_id: 'group-1',
              is_winner: true,
              played_on: '2026-07-01',
              player_id: 'player-1',
              player_name: 'Friday Mars',
              tag_code: 'space',
              tag_count: 4,
              total_points: 80,
            },
          ],
          error: null,
        };
      }

      if (table === 'player_placement_distribution') {
        return {
          data: [
            {
              games_played: 3,
              group_id: 'group-1',
              placement: 1,
              player_id: 'player-1',
              player_name: 'Friday Mars',
            },
          ],
          error: null,
        };
      }

      return { data: [], error: null };
    });

    const extended = await getOverallExtendedAnalytics(
      ['group-1'],
      (playerId) => ({ canonicalId: `user:${playerId}`, displayName: 'Friday Mars' }),
      3,
    );

    expect(extended.tagOutcomeRows).toEqual([
      expect.objectContaining({ playerId: 'user:player-1', tagCode: 'space', tagCount: 4 }),
    ]);
    expect(extended.placementDistributionRows).toEqual([
      expect.objectContaining({ gamesPlayed: 3, placement: 1 }),
    ]);
    expect(extended.cardOutcomeRows).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('player_card_outcomes'),
      timeout,
    );
  });
});
