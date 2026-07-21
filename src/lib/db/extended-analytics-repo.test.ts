import { describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listImportedCardAndTagOutcomes } from './extended-analytics-repo';

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
