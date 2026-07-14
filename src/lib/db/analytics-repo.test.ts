import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getCrossGroupFocusData,
  getProfileAnalytics,
  listGroupInteractions,
  rewriteLineupLabels,
} from './analytics-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('getProfileAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty linked-profile state when analytics rows are absent', async () => {
    const playersOrderByDisplayName = vi.fn().mockResolvedValue({
      data: [{ display_name: 'Friday Mars', id: 'player-1' }],
      error: null,
    });
    const playersOrderByCreatedAt = vi.fn().mockReturnValue({
      order: playersOrderByDisplayName,
    });
    const playersEqLinkedUserId = vi.fn().mockReturnValue({
      order: playersOrderByCreatedAt,
    });
    const playersSelect = vi.fn().mockReturnValue({
      eq: playersEqLinkedUserId,
    });

    const analyticsIn = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const analyticsSelect = vi.fn().mockReturnValue({
      in: analyticsIn,
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      rpc: vi.fn(async () => ({ data: [], error: null })),
      from: vi.fn((table: string) => {
        if (table === 'players') {
          return {
            select: playersSelect,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      schema: vi.fn((schemaName: string) => {
        if (schemaName !== 'analytics') {
          throw new Error(`Unexpected schema ${schemaName}`);
        }

        return {
          from: vi.fn((table: string) => {
            if (table === 'player_game_results') {
              return {
                select: analyticsSelect,
              };
            }

            throw new Error(`Unexpected analytics table ${table}`);
          }),
        };
      }),
    } as never);

    await expect(getProfileAnalytics('user-1')).resolves.toEqual({
      cardOutcomes: [],
      coverage: null,
      headToHeadRows: [],
      keyCards: [],
      lossCards: [],
      performance: null,
      playerId: 'player-1',
      playerName: 'Friday Mars',
      scoreAverages: null,
      styleAgreement: null,
      styleBreakdownRows: [],
      styleInsights: [],
    });
  });

  it('filters linked player analytics to the selected group', async () => {
    const playersOrderByDisplayName = vi.fn().mockResolvedValue({
      data: [
        { display_name: 'Friday Mars', group_id: 'group-1', id: 'player-1' },
        { display_name: 'Weeknight Mars', group_id: 'group-2', id: 'player-2' },
      ],
      error: null,
    });
    const playersOrderByCreatedAt = vi.fn().mockReturnValue({
      order: playersOrderByDisplayName,
    });
    const playersEqLinkedUserId = vi.fn().mockReturnValue({
      order: playersOrderByCreatedAt,
    });
    const playersSelect = vi.fn().mockReturnValue({
      eq: playersEqLinkedUserId,
    });

    const analyticsIn = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const analyticsSelect = vi.fn().mockReturnValue({
      in: analyticsIn,
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      rpc: vi.fn(async () => ({ data: [], error: null })),
      from: vi.fn((table: string) => {
        if (table === 'players') {
          return {
            select: playersSelect,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      schema: vi.fn((schemaName: string) => {
        if (schemaName !== 'analytics') {
          throw new Error(`Unexpected schema ${schemaName}`);
        }

        return {
          from: vi.fn((table: string) => {
            if (table === 'player_game_results') {
              return {
                select: analyticsSelect,
              };
            }

            throw new Error(`Unexpected analytics table ${table}`);
          }),
        };
      }),
    } as never);

    await expect(
      getProfileAnalytics('user-1', { groupId: 'group-2' }),
    ).resolves.toMatchObject({
      playerId: 'player-2',
      playerName: 'Weeknight Mars',
    });

    expect(playersSelect).toHaveBeenCalledWith('id, display_name, group_id');
    expect(analyticsIn).toHaveBeenCalledWith('player_id', ['player-2']);
  });

  it('aggregates profile style frequency and wins from inferred styles', async () => {
    const makeRow = (
      overrides: Partial<Record<string, unknown>>,
    ): Record<string, unknown> => ({
      award_points: 0,
      card_points_animals: null,
      card_points_jovian: null,
      card_points_microbes: null,
      card_points_total: 0,
      cities_points: 0,
      declared_modifier_style_codes: null,
      declared_primary_style_code: null,
      game_id: 'g1',
      greenery_points: 0,
      group_id: 'group-1',
      has_full_card_breakdown: false,
      inferred_primary_style_code: null,
      inferred_style_confidence: null,
      is_winner: false,
      key_card_count: 0,
      loss_gap_points: null,
      milestone_points: 0,
      other_card_points: null,
      placement: 1,
      placement_score: 1,
      player_id: 'me-1',
      player_name: 'Friday Mars',
      signed_differential_points: 0,
      total_points: 0,
      tr_points: 0,
      win_differential_points: null,
      ...overrides,
    });

    const ownRows = [
      makeRow({
        game_id: 'g1',
        inferred_primary_style_code: 'board_control',
        is_winner: true,
        total_points: 80,
      }),
      makeRow({
        game_id: 'g2',
        inferred_primary_style_code: 'board_control',
        placement: 2,
        total_points: 70,
      }),
      makeRow({
        game_id: 'g3',
        inferred_primary_style_code: 'jovian_payoff',
        is_winner: true,
        total_points: 92,
      }),
    ];
    const playerResultsIn = vi.fn((column: string) => {
      if (column === 'player_id') {
        return Promise.resolve({ data: ownRows, error: null });
      }

      return Promise.resolve({ data: ownRows, error: null });
    });
    const playerResultsSelect = vi.fn().mockReturnValue({ in: playerResultsIn });
    const keyCardsIn = vi.fn().mockResolvedValue({ data: [], error: null });
    const keyCardsSelect = vi.fn().mockReturnValue({ in: keyCardsIn });
    const cardOutcomesIn = vi.fn().mockResolvedValue({
      data: [
        {
          card_id: 'card-1',
          card_name: 'Commercial District',
          full_image_url: null,
          game_id: 'g1',
          is_winner: true,
          player_id: 'me-1',
          thumbnail_url: null,
        },
        {
          card_id: 'card-1',
          card_name: 'Commercial District',
          full_image_url: null,
          game_id: 'g2',
          is_winner: false,
          player_id: 'me-1',
          thumbnail_url: null,
        },
        {
          card_id: 'card-2',
          card_name: 'Io Mining Industries',
          full_image_url: null,
          game_id: 'g3',
          is_winner: true,
          player_id: 'me-1',
          thumbnail_url: null,
        },
      ],
      error: null,
    });
    const cardOutcomesSelect = vi.fn().mockReturnValue({ in: cardOutcomesIn });

    const playersOrderByDisplayName = vi.fn().mockResolvedValue({
      data: [{ display_name: 'Friday Mars', group_id: 'group-1', id: 'me-1' }],
      error: null,
    });
    const playersOrderByCreatedAt = vi.fn().mockReturnValue({
      order: playersOrderByDisplayName,
    });
    const playersEqLinkedUserId = vi.fn().mockReturnValue({
      order: playersOrderByCreatedAt,
    });
    const playersSelect = vi.fn().mockReturnValue({ eq: playersEqLinkedUserId });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      rpc: vi.fn(async () => ({ data: [], error: null })),
      from: vi.fn((table: string) => {
        if (table === 'players') {
          return { select: playersSelect };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      schema: vi.fn((schemaName: string) => {
        if (schemaName !== 'analytics') {
          throw new Error(`Unexpected schema ${schemaName}`);
        }

        return {
          from: vi.fn((table: string) => {
            if (table === 'player_game_results') {
              return { select: playerResultsSelect };
            }

            if (table === 'player_key_cards') {
              return { select: keyCardsSelect };
            }

            if (table === 'player_card_outcomes') {
              return { select: cardOutcomesSelect };
            }

            throw new Error(`Unexpected analytics table ${table}`);
          }),
        };
      }),
    } as never);

    await expect(getProfileAnalytics('user-1')).resolves.toMatchObject({
      styleBreakdownRows: [
        {
          averagePlacement: 1.5,
          averageScore: 75,
          gamesPlayed: 2,
          playRate: 0.6667,
          styleCode: 'board_control',
          styleName: 'Board Control',
          winRate: 0.5,
          wins: 1,
        },
        {
          averagePlacement: 1,
          averageScore: 92,
          gamesPlayed: 1,
          playRate: 0.3333,
          styleCode: 'jovian_payoff',
          styleName: 'Jovian Payoff',
          winRate: 1,
          wins: 1,
        },
      ],
      styleInsights: [
        expect.objectContaining({
          body: expect.stringMatching(
            /Your most logged style is Board Control: 2 finishes out of 3 finalized style reads/i,
          ),
          evidenceLabel: '2 finalized style reads',
          title: 'Style Identity',
        }),
        expect.objectContaining({
          body: expect.stringMatching(
            /strongest final placements are coming from Jovian Payoff/i,
          ),
          title: 'Final Placement Read',
        }),
        expect.objectContaining({
          body: expect.stringMatching(
            /Imported game logs add texture to your Board Control games: Commercial District/i,
          ),
          evidenceLabel: '2 logged card plays',
          title: 'Game Log Signal',
        }),
      ],
    });
  });

  it('collapses opponents that share a linked user into one head-to-head row', async () => {
    const makeRow = (
      overrides: Partial<Record<string, unknown>>,
    ): Record<string, unknown> => ({
      award_points: 0,
      card_points_animals: null,
      card_points_jovian: null,
      card_points_microbes: null,
      card_points_total: 0,
      cities_points: 0,
      declared_modifier_style_codes: null,
      declared_primary_style_code: null,
      greenery_points: 0,
      has_full_card_breakdown: false,
      inferred_primary_style_code: null,
      inferred_style_confidence: null,
      is_winner: false,
      key_card_count: 0,
      loss_gap_points: null,
      milestone_points: 0,
      other_card_points: null,
      placement_score: 0,
      signed_differential_points: 0,
      tr_points: 0,
      win_differential_points: null,
      ...overrides,
    });

    // Izzy is linked to a player in each of two groups.
    const ownRows = [
      makeRow({
        game_id: 'g1',
        group_id: 'group-1',
        player_id: 'me-1',
        player_name: 'Izzy',
        placement: '2',
        total_points: '50',
      }),
      makeRow({
        game_id: 'g2',
        group_id: 'group-2',
        player_id: 'me-2',
        player_name: 'Izzy',
        placement: '1',
        total_points: '40',
      }),
    ];
    // Corey appears as a distinct player row in each group's game.
    const sharedRows = [
      ...ownRows,
      makeRow({
        game_id: 'g1',
        group_id: 'group-1',
        player_id: 'corey-a',
        player_name: 'Corey Jansen',
        placement: '1',
        total_points: '60',
      }),
      makeRow({
        game_id: 'g2',
        group_id: 'group-2',
        player_id: 'corey-b',
        player_name: 'Corey Jansen',
        placement: '2',
        total_points: '30',
      }),
    ];

    const analyticsIn = vi.fn((column: string) => {
      if (column === 'player_id') {
        return Promise.resolve({ data: ownRows, error: null });
      }

      return Promise.resolve({ data: sharedRows, error: null });
    });
    const analyticsSelect = vi.fn().mockReturnValue({ in: analyticsIn });
    const cardStatsIn = vi.fn().mockResolvedValue({ data: [], error: null });
    const cardStatsSelect = vi.fn().mockReturnValue({ in: cardStatsIn });

    const linkedPlayersResult = {
      data: [
        { display_name: 'Izzy', group_id: 'group-1', id: 'me-1' },
        { display_name: 'Izzy', group_id: 'group-2', id: 'me-2' },
      ],
      error: null,
    };
    const playersOrderByDisplayName = vi.fn().mockResolvedValue(linkedPlayersResult);
    const playersOrderByCreatedAt = vi.fn().mockReturnValue({
      order: playersOrderByDisplayName,
    });
    const playersEqLinkedUserId = vi.fn().mockReturnValue({
      order: playersOrderByCreatedAt,
    });
    // Opponent identity lookup: both Corey rows resolve to the same user.
    const opponentIdentityIn = vi.fn().mockResolvedValue({
      data: [
        { id: 'corey-a', linked_user_id: 'corey-user' },
        { id: 'corey-b', linked_user_id: 'corey-user' },
      ],
      error: null,
    });
    const playersSelect = vi.fn((columns: string) => {
      if (columns === 'id, linked_user_id') {
        return { in: opponentIdentityIn };
      }

      return { eq: playersEqLinkedUserId };
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      rpc: vi.fn(async () => ({ data: [], error: null })),
      from: vi.fn((table: string) => {
        if (table === 'players') {
          return { select: playersSelect };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      schema: vi.fn((schemaName: string) => {
        if (schemaName !== 'analytics') {
          throw new Error(`Unexpected schema ${schemaName}`);
        }

        return {
          from: vi.fn((table: string) => {
            if (table === 'player_game_results') {
              return { select: analyticsSelect };
            }

            if (table === 'player_key_cards' || table === 'player_card_outcomes') {
              return { select: cardStatsSelect };
            }

            throw new Error(`Unexpected analytics table ${table}`);
          }),
        };
      }),
    } as never);

    const result = await getProfileAnalytics('user-1');

    expect(result?.headToHeadRows).toEqual([
      expect.objectContaining({
        // personLabel shows unregistered opponents by first name only (privacy).
        opponentName: 'Corey',
        gamesPlayed: 2,
        wins: 1,
        losses: 1,
        ties: 0,
      }),
    ]);
    expect(opponentIdentityIn).toHaveBeenCalledWith('id', ['corey-a', 'corey-b']);
  });

  it('filters expansion mix interactions out of group analytics rows', async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [
        {
          average_placement: '1.4',
          average_score: '89.4',
          games_played: 5,
          group_id: 'group-1',
          interaction_type: 'map_expansion_mix',
          label: 'Hellas | Prelude',
          win_rate: '0.8',
          wins: 4,
        },
        {
          average_placement: '1.8',
          average_score: '82.1',
          games_played: 4,
          group_id: 'group-1',
          interaction_type: 'corporation_prelude_pair',
          label: 'Tharsis Republic | Allied Bank',
          win_rate: '0.5',
          wins: 2,
        },
      ],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn((tableName: string) => {
      if (tableName !== 'group_interactions') {
        throw new Error(`Unexpected analytics table ${tableName}`);
      }

      return { select };
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      rpc: vi.fn(async () => ({ data: [], error: null })),
      schema: vi.fn((schemaName: string) => {
        if (schemaName !== 'analytics') {
          throw new Error(`Unexpected schema ${schemaName}`);
        }

        return { from };
      }),
    } as never);

    await expect(listGroupInteractions('group-1')).resolves.toEqual([
      {
        averagePlacement: 1.8,
        averageScore: 82.1,
        gamesPlayed: 4,
        groupId: 'group-1',
        interactionType: 'corporation_prelude_pair',
        label: 'Tharsis Republic | Allied Bank',
        winRate: 0.5,
        wins: 2,
      },
    ]);
  });
});

function buildFocusResultRow(overrides: Record<string, unknown>) {
  return {
    award_points: 0,
    card_points_animals: null,
    card_points_jovian: null,
    card_points_microbes: null,
    card_points_total: 0,
    cities_points: 0,
    declared_modifier_style_codes: null,
    declared_primary_style_code: null,
    game_id: 'game-1',
    generation_count: 10,
    greenery_points: 0,
    group_id: 'group-1',
    has_full_card_breakdown: false,
    inferred_primary_style_code: null,
    inferred_style_confidence: null,
    is_winner: false,
    key_card_count: 0,
    loss_gap_points: null,
    milestone_points: 0,
    other_card_points: null,
    placement: 1,
    placement_score: 0,
    played_on: '2026-06-01',
    player_id: 'player-1',
    player_name: 'Player One',
    signed_differential_points: 0,
    total_points: 0,
    tr_points: 0,
    win_differential_points: null,
    ...overrides,
  };
}

describe('getCrossGroupFocusData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists every shared-game person, deduped by canonical identity, with a per-person bundle', async () => {
    const izzyRow = buildFocusResultRow({
      game_id: 'game-1',
      group_id: 'group-1',
      is_winner: true,
      placement: 1,
      player_id: 'izzy-1',
      player_name: 'Izzy Hodnett',
      total_points: 80,
    });
    const coletteRow = buildFocusResultRow({
      game_id: 'game-1',
      group_id: 'group-1',
      is_winner: false,
      placement: 2,
      player_id: 'colette-1',
      player_name: 'Colette LeRoux',
      total_points: 70,
    });

    const playersOrderByDisplayName = vi.fn().mockResolvedValue({
      data: [{ display_name: 'Izzy Hodnett', group_id: 'group-1', id: 'izzy-1' }],
      error: null,
    });
    const playersOrderByCreatedAt = vi.fn().mockReturnValue({
      order: playersOrderByDisplayName,
    });
    const playersEqLinkedUserId = vi.fn().mockReturnValue({
      order: playersOrderByCreatedAt,
    });
    const participantsIn = vi.fn().mockResolvedValue({
      data: [
        {
          display_name: 'Izzy Hodnett',
          id: 'izzy-1',
          linked_user_id: 'user-1',
          normalized_display_name: 'izzy hodnett',
        },
        {
          display_name: 'Colette LeRoux',
          id: 'colette-1',
          linked_user_id: 'user-colette',
          normalized_display_name: 'colette leroux',
        },
      ],
      error: null,
    });
    const playersSelect = vi.fn().mockReturnValue({
      eq: playersEqLinkedUserId,
      in: participantsIn,
    });

    const analyticsIn = vi
      .fn()
      .mockResolvedValueOnce({ data: [izzyRow], error: null })
      .mockResolvedValueOnce({ data: [izzyRow, coletteRow], error: null });
    const analyticsSelect = vi.fn().mockReturnValue({ in: analyticsIn });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      rpc: vi.fn(async () => ({ data: [], error: null })),
      from: vi.fn((table: string) => {
        if (table === 'players') {
          return { select: playersSelect };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      schema: vi.fn((schemaName: string) => {
        if (schemaName !== 'analytics') {
          throw new Error(`Unexpected schema ${schemaName}`);
        }

        return {
          from: vi.fn((table: string) => {
            if (table === 'player_game_results') {
              return { select: analyticsSelect };
            }

            throw new Error(`Unexpected analytics table ${table}`);
          }),
        };
      }),
    } as never);

    const people = await getCrossGroupFocusData('user-1', 'group-1');

    // The signed-in user is offered first, then their opponent. Unregistered
    // people are labelled by first name only (personLabel privacy rule).
    expect(people.map((person) => person.displayName)).toEqual([
      'Izzy',
      'Colette',
    ]);

    const colette = people.find(
      (person) => person.canonicalId === 'user:user-colette',
    );
    expect(colette).toMatchObject({
      activeGroupPlayerId: 'colette-1',
      inActiveGroup: true,
      playerIds: ['colette-1'],
    });
    expect(colette?.bundle.headToHeadRows).toEqual([
      {
        averageScoreDifferential: -10,
        gamesPlayed: 1,
        label: 'Colette vs Izzy',
        losses: 1,
        ties: 0,
        wins: 0,
      },
    ]);
    expect(colette?.bundle.performance?.gamesPlayed).toBe(1);
    expect(colette?.bundle.trendRows).toHaveLength(1);
  });

  it('returns an empty list when the user has no linked players', async () => {
    const playersOrderByDisplayName = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const playersOrderByCreatedAt = vi.fn().mockReturnValue({
      order: playersOrderByDisplayName,
    });
    const playersEqLinkedUserId = vi.fn().mockReturnValue({
      order: playersOrderByCreatedAt,
    });
    const playersSelect = vi.fn().mockReturnValue({ eq: playersEqLinkedUserId });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      rpc: vi.fn(async () => ({ data: [], error: null })),
      from: vi.fn((table: string) => {
        if (table === 'players') {
          return { select: playersSelect };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    await expect(getCrossGroupFocusData('user-1', 'group-1')).resolves.toEqual([]);
  });
});

describe('rewriteLineupLabels', () => {
  const makeRow = (lineupKey: string | null, lineupLabel: string | null) =>
    ({
      lineup_key: lineupKey,
      lineup_label: lineupLabel,
    }) as never as Parameters<typeof rewriteLineupLabels>[0][number];

  it('rebuilds the label from co-player ids, not by splitting the old label', () => {
    // lineup_key is ordered by id; lineup_label by display name — so the label
    // must be rebuilt from the ids, never zipped positionally against the label.
    const rows = [makeRow('id-b,id-a', 'Corey Jansen, James Hodnett')];
    const labels: Record<string, string> = { 'id-a': 'corey', 'id-b': 'jimmy' };

    rewriteLineupLabels(rows, (id) => labels[id]);

    expect(rows[0].lineup_label).toBe('corey, jimmy');
  });

  it('leaves the label untouched when a co-player can not be resolved', () => {
    const rows = [makeRow('id-a,id-unknown', 'Corey Jansen, Someone Else')];

    rewriteLineupLabels(rows, (id) => (id === 'id-a' ? 'corey' : undefined));

    expect(rows[0].lineup_label).toBe('Corey Jansen, Someone Else');
  });

  it('skips solo rows with no lineup key', () => {
    const rows = [makeRow(null, 'Solo setup')];

    rewriteLineupLabels(rows, () => 'corey');

    expect(rows[0].lineup_label).toBe('Solo setup');
  });
});
