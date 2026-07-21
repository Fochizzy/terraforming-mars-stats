import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getCrossGroupFocusData,
  getGlobalInsightMetrics,
  getProfileAnalytics,
  listGroupInteractions,
  rewriteLineupLabels,
} from './analytics-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('getGlobalInsightMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.mocked(createSupabaseServerClient).mockReset();
  });

  it('loads and normalizes the seven global insight metric groups', async () => {
    const rpc = vi.fn(async (fn: string) => {
      if (fn === 'get_player_usernames') {
        return {
          data: [{ player_id: 'player-1', username: 'friday' }],
          error: null,
        };
      }

      return {
        data: {
          cardTiming: [
            {
              cardName: 'Mars University',
              earlyPlays: '4',
              earlyWinRate: '0.75',
              earlyWins: '3',
              latePlays: '3',
              lateWinRate: '0.3333',
              lateWins: '1',
              winRateDelta: '0.4167',
            },
          ],
          mapTableMeta: [
            {
              averageGeneration: '10.5',
              averageScore: '82.25',
              category: 'map',
              games: '6',
              label: 'Tharsis',
              playerResults: '24',
              winRate: null,
            },
          ],
          metaSignals: [
            {
              averageScore: '88.5',
              baselineWinRate: '0.25',
              direction: 'overperformer',
              label: 'Tharsis Republic',
              sampleSize: '5',
              sourceType: 'Corporation',
              winRate: '0.6',
              winRateDelta: '0.35',
              wins: '3',
            },
            {
              averageScore: '74',
              baselineWinRate: '0.36',
              direction: 'dragger',
              label: 'Project Eden',
              sampleSize: '5',
              sourceType: 'Card',
              winRate: '0',
              winRateDelta: '-0.36',
              wins: '0',
            },
            {
              averageScore: '74',
              baselineWinRate: '0.36',
              direction: 'dragger',
              label: 'Project Eden',
              sampleSize: '5',
              sourceType: 'Prelude',
              winRate: '0',
              winRateDelta: '-0.36',
              wins: '0',
            },
          ],
          objectiveConversion: [
            {
              actions: '4',
              conversionRate: '0.5',
              label: 'Gardener',
              objectiveType: 'milestone',
              snipedActions: null,
              snipedRate: null,
              winRate: '0.75',
              wins: '3',
            },
          ],
          openingCombos: [
            {
              averageScore: '91.5',
              corporationName: 'Ecoline',
              label: 'Ecoline | Mohole',
              plays: '4',
              preludeLabel: 'Mohole',
              scoreDeviation: '8.5',
              signalType: 'best',
              winRate: '0.75',
              wins: '3',
            },
          ],
          summary: {
            average_generation: '10.5',
            average_score: '82.25',
            baseline_win_rate: '0.25',
            player_results: '24',
            total_games: '6',
          },
          tempoProfile: [
            {
              averageGeneration: '10',
              averagePointsPerGeneration: '8.1',
              averageScore: '81',
              bucket: 'standard',
              games: '4',
              label: 'Standard games',
              playerResults: '16',
              winRate: '0.25',
              wins: '4',
            },
          ],
          terraformingShare: [
            {
              actionShare: '0.4',
              heatActions: '2',
              oceanActions: '1',
              oxygenActions: '5',
              playerId: 'player-1',
              playerName: 'Friday Mars',
              totalActions: '8',
            },
          ],
        },
        error: null,
      };
    });
    const playersIn = vi.fn().mockResolvedValue({
      data: [
        {
          display_name: 'Friday Mars',
          id: 'player-1',
          linked_user_id: 'user-friday',
          normalized_display_name: 'friday mars',
        },
      ],
      error: null,
    });
    const playersSelect = vi.fn().mockReturnValue({ in: playersIn });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'players') {
          return { select: playersSelect };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc,
    } as never);

    await expect(getGlobalInsightMetrics()).resolves.toMatchObject({
      cardTiming: [{ cardName: 'Mars University', earlyPlays: 4 }],
      mapTableMeta: [{ averageScore: 82.25, category: 'map' }],
      metaSignals: [
        { label: 'Tharsis Republic', winRateDelta: 0.35 },
        { label: 'Project Eden', sourceType: 'Prelude' },
      ],
      objectiveConversion: [{ label: 'Gardener', snipedRate: null }],
      openingCombos: [{ corporationName: 'Ecoline', signalType: 'best' }],
      summary: {
        averageGeneration: 10.5,
        baselineWinRate: 0.25,
        totalGames: 6,
      },
      tempoProfile: [{ bucket: 'standard', games: 4 }],
      terraformingShare: [{ playerName: 'friday', totalActions: 8 }],
    });
    const metrics = await getGlobalInsightMetrics();
    expect(
      metrics.metaSignals.filter((signal) => signal.label === 'Project Eden'),
    ).toEqual([
      expect.objectContaining({ sourceType: 'Prelude', sampleSize: 5 }),
    ]);
    expect(rpc).toHaveBeenCalledWith('get_global_insight_metrics');
  });

  it('combines terraforming share by linked user and renders usernames', async () => {
    const rpc = vi.fn(async (fn: string) => {
      if (fn === 'get_player_usernames') {
        return {
          data: [
            { player_id: 'izzy-home', username: 'Fochizzy' },
            { player_id: 'izzy-weekend', username: 'Fochizzy' },
            { player_id: 'corey-home', username: 'RevLoki' },
          ],
          error: null,
        };
      }

      return {
        data: {
          cardTiming: [],
          mapTableMeta: [],
          metaSignals: [],
          objectiveConversion: [],
          openingCombos: [],
          summary: {},
          tempoProfile: [],
          terraformingShare: [
            {
              actionShare: '0.14',
              oceanActions: '38',
              oxygenActions: '89',
              playerId: 'izzy-home',
              playerName: 'Izzy Hodnett',
              temperatureActions: '7',
              totalActions: '134',
            },
            {
              actionShare: '0.10',
              heatActions: '3',
              oceans: '21',
              oxygen: '71',
              playerId: 'izzy-weekend',
              playerName: 'Izzy Hodnett',
              total: '95',
            },
            {
              actionShare: '0.12',
              oceanActions: '43',
              oxygenActions: '72',
              playerId: 'corey-home',
              playerName: 'Corey Jansen',
              temperature: '4',
              totalActions: '119',
            },
          ],
        },
        error: null,
      };
    });
    const playersIn = vi.fn().mockResolvedValue({
      data: [
        {
          display_name: 'Izzy Hodnett',
          id: 'izzy-home',
          linked_user_id: 'user-izzy',
          normalized_display_name: 'izzy hodnett',
        },
        {
          display_name: 'Izzy Hodnett',
          id: 'izzy-weekend',
          linked_user_id: 'user-izzy',
          normalized_display_name: 'izzy hodnett',
        },
        {
          display_name: 'Corey Jansen',
          id: 'corey-home',
          linked_user_id: 'user-corey',
          normalized_display_name: 'corey jansen',
        },
      ],
      error: null,
    });
    const playersSelect = vi.fn().mockReturnValue({ in: playersIn });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'players') {
          return { select: playersSelect };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc,
    } as never);

    const metrics = await getGlobalInsightMetrics();

    expect(metrics.terraformingShare).toEqual([
      {
        actionShare: 0.24,
        heatActions: 10,
        oceanActions: 59,
        oxygenActions: 160,
        playerId: 'user:user-izzy',
        playerName: 'Fochizzy',
        totalActions: 229,
      },
      {
        actionShare: 0.12,
        heatActions: 4,
        oceanActions: 43,
        oxygenActions: 72,
        playerId: 'user:user-corey',
        playerName: 'RevLoki',
        totalActions: 119,
      },
    ]);
    expect(playersSelect).toHaveBeenCalledWith('id, linked_user_id');
    expect(playersIn).toHaveBeenCalledWith('id', [
      'izzy-home',
      'izzy-weekend',
      'corey-home',
    ]);
  });
});

describe('getProfileAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty linked-profile state when analytics rows are absent', async () => {
    const playersOrderByDisplayName = vi.fn().mockResolvedValue({
      data: [{ display_name: 'Friday Mars', id: 'player-1' }],
      error: null,
    });
    const playersOrderByCreatedAt = playersOrderByDisplayName;
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
      rpc: vi.fn(async (fn: string) => ({
        data:
          fn === 'get_player_usernames'
            ? [{ player_id: 'player-1', username: 'friday' }]
            : fn === 'get_public_player_names'
              ? [{ is_linked: true, player_id: 'player-1', public_name: 'friday' }]
              : [],
        error: null,
      })),
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
      expansionProfile: null,
      gameLengthProfile: null,
      globalParameterTempoProfile: null,
      headToHeadRows: [],
      keyCards: [],
      leadPressure: null,
      lossCards: [],
      phaseTempoProfile: null,
      performance: null,
      playerId: 'player-1',
      playerName: 'friday',
      resourceRemovalProfile: null,
      scoreAverages: null,
      scorePace: null,
      styleAgreement: null,
      styleBreakdownRows: [],
      styleInsights: [],
      tagOutcomes: [],
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
    const playersOrderByCreatedAt = playersOrderByDisplayName;
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
      rpc: vi.fn(async (fn: string) => ({
        data:
          fn === 'get_player_usernames'
            ? [{ player_id: 'player-2', username: 'weeknight' }]
            : fn === 'get_public_player_names'
              ? [{ is_linked: true, player_id: 'player-2', public_name: 'weeknight' }]
              : [],
        error: null,
      })),
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
      playerName: 'weeknight',
    });

    expect(playersSelect).toHaveBeenCalledWith('id, group_id');
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
    const playersOrderByCreatedAt = playersOrderByDisplayName;
    const playersEqLinkedUserId = vi.fn().mockReturnValue({
      order: playersOrderByCreatedAt,
    });
    const playersSelect = vi.fn().mockReturnValue({ eq: playersEqLinkedUserId });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      rpc: vi.fn(async (fn: string) => ({
        data:
          fn === 'get_player_usernames'
            ? [{ player_id: 'me-1', username: 'Fochizzy' }]
            : fn === 'get_public_player_names'
              ? [{ is_linked: true, player_id: 'me-1', public_name: 'Fochizzy' }]
              : [],
        error: null,
      })),
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

  it('builds score pace, lead pressure, and resource-removal profile from finalized games and imports', async () => {
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
        card_points_total: 20,
        cities_points: 8,
        generation_count: 8,
        game_id: 'game-1',
        greenery_points: 12,
        is_winner: true,
        milestone_points: 5,
        signed_differential_points: 6,
        total_points: 80,
        tr_points: 24,
        win_differential_points: 6,
      }),
      makeRow({
        card_points_total: 10,
        cities_points: 4,
        generation_count: 12,
        game_id: 'game-2',
        greenery_points: 8,
        loss_gap_points: 4,
        milestone_points: 5,
        placement: 2,
        placement_score: 0.5,
        signed_differential_points: -4,
        total_points: 70,
        tr_points: 20,
      }),
    ];
    const sharedRows = [
      ...ownRows.map((row) => ({ ...row })),
      makeRow({
        game_id: 'game-1',
        player_id: 'opponent-1',
        player_name: 'Corey',
      }),
      makeRow({
        game_id: 'game-2',
        is_winner: true,
        player_id: 'opponent-1',
        player_name: 'Corey',
      }),
    ];

    const playerResultsIn = vi.fn((column: string) => {
      if (column === 'player_id') {
        return Promise.resolve({ data: ownRows, error: null });
      }

      return Promise.resolve({ data: sharedRows, error: null });
    });
    const playerResultsSelect = vi.fn().mockReturnValue({ in: playerResultsIn });
    const cardStatsIn = vi.fn().mockResolvedValue({ data: [], error: null });
    const cardStatsSelect = vi.fn().mockReturnValue({ in: cardStatsIn });
    const importsIn = vi.fn().mockResolvedValue({
      data: [
        { game_id: 'game-1', id: 'import-1' },
        { game_id: 'game-2', id: 'import-2' },
      ],
      error: null,
    });
    const importsSelect = vi.fn().mockReturnValue({ in: importsIn });
    const eventsIn = vi.fn().mockResolvedValue({
      data: [
        {
          card_id: null,
          event_order: 1,
          event_type: 'generation_started',
          game_log_import_id: 'import-1',
          generation_number: 1,
          payload: {},
          resource_amount: null,
          resource_type: null,
          tile_type: null,
        },
        {
          card_id: 'card-asteroid',
          event_order: 2,
          event_type: 'card_played',
          game_log_import_id: 'import-1',
          generation_number: null,
          payload: { actor: 'FM Alias', cardName: 'Asteroid' },
          resource_amount: null,
          resource_type: null,
          tile_type: null,
        },
        {
          card_id: 'card-solar-flare',
          event_order: 2.05,
          event_type: 'card_played',
          game_log_import_id: 'import-1',
          generation_number: null,
          payload: { actor: 'FM Alias', cardName: 'Solar Flare' },
          resource_amount: null,
          resource_type: null,
          tile_type: null,
        },
        {
          card_id: null,
          event_order: 2.1,
          event_type: 'global_parameter_changed',
          game_log_import_id: 'import-1',
          generation_number: null,
          payload: { actor: 'FM Alias', parameterType: 'oxygen' },
          resource_amount: null,
          resource_type: 'oxygen',
          tile_type: null,
        },
        {
          card_id: null,
          event_order: 2.2,
          event_type: 'global_parameter_changed',
          game_log_import_id: 'import-1',
          generation_number: null,
          payload: { actor: 'FM Alias', parameterType: 'ocean' },
          resource_amount: null,
          resource_type: 'ocean',
          tile_type: null,
        },
        {
          card_id: null,
          event_order: 3,
          event_type: 'generation_started',
          game_log_import_id: 'import-1',
          generation_number: 5,
          payload: {},
          resource_amount: null,
          resource_type: null,
          tile_type: null,
        },
        {
          card_id: null,
          event_order: 4,
          event_type: 'tile_placed',
          game_log_import_id: 'import-1',
          generation_number: null,
          payload: { actor: 'FM Alias' },
          resource_amount: null,
          resource_type: null,
          tile_type: 'Greenery',
        },
        {
          card_id: null,
          event_order: 5,
          event_type: 'resource_changed',
          game_log_import_id: 'import-1',
          generation_number: null,
          payload: {
            actor: 'FM Alias',
            affectedPlayer: 'Corey',
            operation: 'removed',
          },
          resource_amount: 3,
          resource_type: 'plant',
          tile_type: null,
        },
        {
          card_id: null,
          event_order: 1,
          event_type: 'generation_started',
          game_log_import_id: 'import-2',
          generation_number: 1,
          payload: {},
          resource_amount: null,
          resource_type: null,
          tile_type: null,
        },
        {
          card_id: 'card-hackers',
          event_order: 2,
          event_type: 'card_played',
          game_log_import_id: 'import-2',
          generation_number: null,
          payload: { actor: 'Corey', cardName: 'Hackers' },
          resource_amount: null,
          resource_type: null,
          tile_type: null,
        },
        {
          card_id: null,
          event_order: 3,
          event_type: 'generation_started',
          game_log_import_id: 'import-2',
          generation_number: 5,
          payload: {},
          resource_amount: null,
          resource_type: null,
          tile_type: null,
        },
        {
          card_id: 'card-hackers',
          event_order: 4,
          event_type: 'resource_changed',
          game_log_import_id: 'import-2',
          generation_number: null,
          payload: {
            actor: 'Corey',
            cardName: 'Hackers',
            deltaKind: 'production',
            operation: 'removed',
            sourcePlayerName: 'Corey',
            targetPlayerName: 'FM Alias',
          },
          resource_amount: 4,
          resource_type: 'megacredit',
          tile_type: null,
        },
        {
          card_id: null,
          event_order: 4.1,
          event_type: 'global_parameter_changed',
          game_log_import_id: 'import-2',
          generation_number: null,
          payload: { actor: 'FM Alias', parameterType: 'temperature' },
          resource_amount: null,
          resource_type: 'temperature',
          tile_type: null,
        },
        {
          card_id: null,
          event_order: 5,
          event_type: 'milestone_claimed',
          game_log_import_id: 'import-2',
          generation_number: null,
          payload: { actor: 'FM Alias' },
          resource_amount: null,
          resource_type: null,
          tile_type: null,
        },
        {
          card_id: null,
          event_order: 6,
          event_type: 'award_funded',
          game_log_import_id: 'import-2',
          generation_number: null,
          payload: { actor: 'FM Alias', awardName: 'Landlord' },
          resource_amount: null,
          resource_type: null,
          tile_type: null,
        },
        {
          card_id: null,
          event_order: 7,
          event_type: 'award_result',
          game_log_import_id: 'import-2',
          generation_number: null,
          payload: {
            actor: 'FM Alias',
            awardName: 'Landlord',
            placement: 'second',
          },
          resource_amount: null,
          resource_type: null,
          tile_type: null,
        },
      ],
      error: null,
    });
    const eventsSelect = vi.fn().mockReturnValue({ in: eventsIn });
    const aliasesEq = vi.fn().mockResolvedValue({
      data: [
        {
          group_id: 'group-1',
          normalized_alias: 'fm alias',
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
          printed_victory_points: 0,
        },
        {
          card_name: 'Hackers',
          card_type: 'Active',
          gameplay_tags: ['interaction'],
          id: 'card-hackers',
          printed_victory_points: 1,
        },
        {
          // Tags deliberately don't overlap with Asteroid's 'space' tag: if
          // Event exclusion regresses, 'event'/'microbe' tie at count 1 and
          // 'Event' wins the alphabetical tiebreak, flipping the engine's top
          // tag away from 'Space' — a discriminating, not coincidental, check.
          card_name: 'Solar Flare',
          card_type: 'Event',
          gameplay_tags: ['event', 'microbe'],
          id: 'card-solar-flare',
          printed_victory_points: 0,
        },
      ],
      error: null,
    });
    const cardsSelect = vi.fn().mockReturnValue({ in: cardsIn });

    const playersOrderByDisplayName = vi.fn().mockResolvedValue({
      data: [{ display_name: 'Friday Mars', group_id: 'group-1', id: 'me-1' }],
      error: null,
    });
    const playersOrderByCreatedAt = playersOrderByDisplayName;
    const playersEqLinkedUserId = vi.fn().mockReturnValue({
      order: playersOrderByCreatedAt,
    });
    const opponentIdentityIn = vi.fn().mockResolvedValue({
      data: [{ id: 'opponent-1', linked_user_id: null }],
      error: null,
    });
    const playersSelect = vi.fn((columns: string) => {
      if (columns === 'id, linked_user_id') {
        return { in: opponentIdentityIn };
      }

      return { eq: playersEqLinkedUserId };
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      rpc: vi.fn(async (fn: string) => ({
        data:
          fn === 'get_player_usernames'
            ? [{ player_id: 'me-1', username: 'Fochizzy' }]
            : fn === 'get_public_player_names'
              ? [{ is_linked: true, player_id: 'me-1', public_name: 'Fochizzy' }]
              : [],
        error: null,
      })),
      from: vi.fn((table: string) => {
        if (table === 'players') {
          return { select: playersSelect };
        }

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
      schema: vi.fn((schemaName: string) => {
        if (schemaName !== 'analytics') {
          throw new Error(`Unexpected schema ${schemaName}`);
        }

        return {
          from: vi.fn((table: string) => {
            if (table === 'player_game_results') {
              return { select: playerResultsSelect };
            }

            if (table === 'player_key_cards' || table === 'player_card_outcomes') {
              return { select: cardStatsSelect };
            }

            throw new Error(`Unexpected analytics table ${table}`);
          }),
        };
      }),
    } as never);

    await expect(getProfileAnalytics('user-1')).resolves.toMatchObject({
      cardOutcomes: [
        expect.objectContaining({
          cardName: 'Asteroid',
          plays: 1,
          wins: 1,
        }),
        expect.objectContaining({
          cardName: 'Solar Flare',
          plays: 1,
          wins: 1,
        }),
      ],
      expansionProfile: {
        improvements: expect.arrayContaining([expect.stringMatching(/stabilize/i)]),
        sections: expect.arrayContaining([
          expect.objectContaining({
            code: 'opening_profile',
            metrics: expect.arrayContaining([
              expect.objectContaining({ label: 'Snapshot Rows', value: '3' }),
            ]),
          }),
          expect.objectContaining({
            code: 'engine_shape',
            // The engine profile is scoped to the linked player's own plays
            // (Asteroid + Solar Flare, not Corey's Hackers). Without Event
            // exclusion, Solar Flare's 'event'/'microbe' tags would tie
            // Asteroid's 'space' at count 1 and 'Event' would win the
            // alphabetical tiebreak — so 'Space' remaining top proves the
            // Event card's tags were excluded, not merely outweighed.
            metrics: expect.arrayContaining([
              expect.objectContaining({
                label: 'Top Card Tag',
                value: 'Space',
              }),
            ]),
          }),
          expect.objectContaining({ code: 'scoring_reliability' }),
          expect.objectContaining({
            code: 'comeback_front_runner',
            metrics: expect.arrayContaining([
              expect.objectContaining({ label: 'Avg Award Fund Gen', value: '5' }),
              expect.objectContaining({ label: 'Second Awards', value: '1' }),
            ]),
          }),
          expect.objectContaining({ code: 'opponent_adjusted' }),
          expect.objectContaining({ code: 'board_control' }),
          expect.objectContaining({
            code: 'interaction_personality',
            metrics: expect.arrayContaining([
              expect.objectContaining({ label: 'Outgoing Stored', value: '3' }),
              expect.objectContaining({ label: 'Incoming Production', value: '4' }),
            ]),
          }),
          expect.objectContaining({ code: 'corporation_prelude_fit' }),
          expect.objectContaining({ code: 'game_speed_matchup' }),
          expect.objectContaining({ code: 'improvement_coach' }),
        ]),
        strengths: expect.arrayContaining([
          expect.stringMatching(/expanded profile backs/i),
        ]),
      },
      // Solar Flare (Event) still shows up here — the card *play* legitimately
      // counts toward victory-impact evidence. Only its printed tags must be
      // excluded from tag-derived analytics (see the exact-match `tagOutcomes`
      // assertion below: it stays at a single Space entry with totalTags: 1,
      // proving Solar Flare's `event`/`space` tags never contributed).
      keyCards: [
        expect.objectContaining({
          cardName: 'Asteroid',
          plays: 1,
          wins: 1,
        }),
        expect.objectContaining({
          cardName: 'Solar Flare',
          plays: 1,
          wins: 1,
        }),
      ],
      gameLengthProfile: {
        bestBucket: expect.objectContaining({
          averageGenerationCount: 8,
          averagePlacement: 1,
          averagePointsPerGeneration: 10,
          averageScore: 80,
          bucket: 'short',
          gamesPlayed: 1,
          winRate: 1,
          wins: 1,
        }),
        rows: [
          expect.objectContaining({
            bucket: 'short',
            label: 'Short Games',
            rangeLabel: '9 or fewer generations',
          }),
          expect.objectContaining({
            averageGenerationCount: 12,
            averagePlacement: 2,
            averagePointsPerGeneration: 5.833,
            averageScore: 70,
            bucket: 'long',
            gamesPlayed: 1,
            label: 'Long Games',
            rangeLabel: '12+ generations',
            winRate: 0,
            wins: 0,
          }),
        ],
        weakestBucket: expect.objectContaining({
          bucket: 'long',
        }),
      },
      globalParameterTempoProfile: {
        bestMix: expect.objectContaining({
          averageFastGeneration: 1,
          averagePlacement: 1,
          averageScore: 80,
          code: 'fast_oxygen_ocean',
          gamesPlayed: 1,
          label: 'Fast Oxygen + Oceans',
          parameters: ['oxygen', 'ocean'],
          winRate: 1,
          wins: 1,
        }),
        importedGames: 2,
        rows: [
          expect.objectContaining({
            code: 'fast_heat',
            label: 'Fast Heat',
            parameters: ['heat'],
            winRate: 0,
          }),
          expect.objectContaining({
            code: 'fast_oxygen_ocean',
            label: 'Fast Oxygen + Oceans',
            parameters: ['oxygen', 'ocean'],
            winRate: 1,
          }),
        ],
        weakestMix: expect.objectContaining({
          averageFastGeneration: 5,
          averagePlacement: 2,
          averageScore: 70,
          code: 'fast_heat',
          gamesPlayed: 1,
          winRate: 0,
          wins: 0,
        }),
      },
      leadPressure: {
        averageLeadWhenWinning: 6,
        averageScoreDifferential: 1,
        averageShortfallWhenBehind: 4,
        closeGameRate: 0.5,
        dominantWinRate: 0,
        gamesPlayed: 2,
        leadRate: 0.5,
        pressureLabel: 'Close-game grinder',
      },
      phaseTempoProfile: {
        bestPhase: expect.objectContaining({
          averagePlacementWhenPeak: 1,
          averageScoreWhenPeak: 80,
          gamesWithPeak: 1,
          label: 'Early Game',
          phase: 'early',
          winRateWhenPeak: 1,
          winsWhenPeak: 1,
        }),
        importedGames: 2,
        mostActivePhase: expect.objectContaining({
          actions: 5,
          actionsPerImportedGame: 2.5,
          label: 'Mid Game',
          phase: 'mid',
        }),
        rows: [
          expect.objectContaining({
            // 2 card plays (Asteroid + Solar Flare) in the opening phase.
            actions: 4,
            cardsPlayed: 2,
            gamesWithPeak: 1,
            phase: 'early',
          }),
          expect.objectContaining({
            actions: 5,
            awardsFunded: 1,
            gamesWithPeak: 1,
            greeneriesPlaced: 1,
            milestonesClaimed: 1,
            phase: 'mid',
            removalEvents: 1,
            tilesPlaced: 1,
          }),
          expect.objectContaining({
            actions: 0,
            phase: 'late',
          }),
        ],
      },
      resourceRemovalProfile: {
        explicitAttributionEvents: 2,
        fallbackAttributionEvents: 0,
        importedGames: 2,
        incoming: {
          amountPerImportedGame: 2,
          events: 1,
          productionAmount: 4,
          productionEvents: 1,
          resourceAmount: 0,
          resourceEvents: 0,
          totalAmount: 4,
        },
        outgoing: {
          amountPerImportedGame: 1.5,
          events: 1,
          productionAmount: 0,
          productionEvents: 0,
          resourceAmount: 3,
          resourceEvents: 1,
          totalAmount: 3,
        },
        resourceRows: [
          {
            amount: 4,
            deltaKind: 'production',
            events: 1,
            resourceType: 'megacredit',
          },
          {
            amount: 3,
            deltaKind: 'resource',
            events: 1,
            resourceType: 'plant',
          },
        ],
        totalRemovalEvents: 2,
      },
      scorePace: {
        averageGenerationCount: 10,
        averageTotalPointsPerGeneration: 7.917,
        rows: [
          expect.objectContaining({
            averagePoints: 22,
            averagePointsPerGeneration: 2.333,
            code: 'terraform_rating',
          }),
          expect.objectContaining({
            averagePoints: 15,
            averagePointsPerGeneration: 1.667,
            code: 'cards',
          }),
          expect.objectContaining({
            averagePoints: 10,
            averagePointsPerGeneration: 1.083,
            code: 'greenery',
          }),
          expect.objectContaining({
            averagePoints: 6,
            averagePointsPerGeneration: 0.667,
            code: 'cities',
          }),
          expect.objectContaining({
            averagePoints: 5,
            averagePointsPerGeneration: 0.521,
            code: 'milestones',
          }),
        ],
      },
      // Exact-length array: Solar Flare (Event) plays 'event' and a second
      // 'space' tag (see the cards mock above) — if either leaked in, this
      // would show totalTags: 2 for Space and/or an extra Event entry.
      tagOutcomes: [
        expect.objectContaining({
          games: 1,
          tagCode: 'Space',
          totalTags: 1,
          wins: 1,
        }),
      ],
    });
  });

  it('uses imported log generation markers for tempo when profile game length is missing', async () => {
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
      game_id: 'game-1',
      generation_count: 0,
      greenery_points: 0,
      group_id: 'group-1',
      has_full_card_breakdown: false,
      inferred_primary_style_code: null,
      inferred_style_confidence: null,
      is_winner: true,
      key_card_count: 0,
      loss_gap_points: null,
      milestone_points: 0,
      other_card_points: null,
      placement: 1,
      placement_score: 1,
      player_id: 'me-1',
      player_name: 'Friday Mars',
      signed_differential_points: 5,
      total_points: 80,
      tr_points: 24,
      win_differential_points: 5,
      ...overrides,
    });

    const ownRows = [makeRow({})];
    const sharedRows = ownRows.map((row) => ({ ...row }));
    const playerResultsIn = vi.fn((column: string) => {
      if (column === 'player_id') {
        return Promise.resolve({ data: ownRows, error: null });
      }

      return Promise.resolve({ data: sharedRows, error: null });
    });
    const playerResultsSelect = vi.fn().mockReturnValue({ in: playerResultsIn });
    const cardStatsIn = vi.fn().mockResolvedValue({ data: [], error: null });
    const cardStatsSelect = vi.fn().mockReturnValue({ in: cardStatsIn });
    const importsIn = vi.fn().mockResolvedValue({
      data: [{ game_id: 'game-1', id: 'import-1' }],
      error: null,
    });
    const importsSelect = vi.fn().mockReturnValue({ in: importsIn });
    const eventsIn = vi.fn().mockResolvedValue({
      data: [
        {
          card_id: null,
          event_order: 1,
          event_type: 'generation_started',
          game_log_import_id: 'import-1',
          generation_number: 1,
          payload: {},
          resource_amount: null,
          resource_type: null,
          tile_type: null,
        },
        {
          card_id: null,
          event_order: 2,
          event_type: 'card_played',
          game_log_import_id: 'import-1',
          generation_number: null,
          payload: { actor: 'Friday Mars', cardName: 'Asteroid' },
          resource_amount: null,
          resource_type: null,
          tile_type: null,
        },
        {
          card_id: null,
          event_order: 3,
          event_type: 'global_parameter_changed',
          game_log_import_id: 'import-1',
          generation_number: null,
          payload: { actor: 'Friday Mars', parameterType: 'oxygen' },
          resource_amount: null,
          resource_type: 'oxygen',
          tile_type: null,
        },
        {
          card_id: null,
          event_order: 4,
          event_type: 'generation_started',
          game_log_import_id: 'import-1',
          generation_number: 5,
          payload: {},
          resource_amount: null,
          resource_type: null,
          tile_type: null,
        },
        {
          card_id: null,
          event_order: 5,
          event_type: 'global_parameter_changed',
          game_log_import_id: 'import-1',
          generation_number: null,
          payload: { actor: 'Friday Mars', parameterType: 'temperature' },
          resource_amount: null,
          resource_type: 'temperature',
          tile_type: null,
        },
        {
          card_id: null,
          event_order: 6,
          event_type: 'generation_started',
          game_log_import_id: 'import-1',
          generation_number: 8,
          payload: {},
          resource_amount: null,
          resource_type: null,
          tile_type: null,
        },
      ],
      error: null,
    });
    const eventsSelect = vi.fn().mockReturnValue({ in: eventsIn });
    const aliasesEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const aliasesIn = vi.fn().mockReturnValue({ eq: aliasesEq });
    const aliasesSelect = vi.fn().mockReturnValue({ in: aliasesIn });

    const playersOrderByDisplayName = vi.fn().mockResolvedValue({
      data: [{ display_name: 'Friday Mars', group_id: 'group-1', id: 'me-1' }],
      error: null,
    });
    const playersOrderByCreatedAt = playersOrderByDisplayName;
    const playersEqLinkedUserId = vi.fn().mockReturnValue({
      order: playersOrderByCreatedAt,
    });
    const playersSelect = vi.fn().mockReturnValue({ eq: playersEqLinkedUserId });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      rpc: vi.fn(async (fn: string) => ({
        data:
          fn === 'get_selection_stats'
            ? { baselineWinRate: 0, cards: [] }
            : [],
        error: null,
      })),
      from: vi.fn((table: string) => {
        if (table === 'players') {
          return { select: playersSelect };
        }

        if (table === 'game_log_imports') {
          return { select: importsSelect };
        }

        if (table === 'game_log_events') {
          return { select: eventsSelect };
        }

        if (table === 'player_import_aliases') {
          return { select: aliasesSelect };
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

            if (table === 'player_card_outcomes') {
              return { select: cardStatsSelect };
            }

            throw new Error(`Unexpected analytics table ${table}`);
          }),
        };
      }),
    } as never);

    await expect(getProfileAnalytics('user-1')).resolves.toMatchObject({
      globalParameterTempoProfile: {
        bestMix: expect.objectContaining({
          averageFastGeneration: 1,
          code: 'fast_oxygen',
          gamesPlayed: 1,
          label: 'Fast Oxygen',
          parameters: ['oxygen'],
          winRate: 1,
        }),
        importedGames: 1,
        rows: [
          expect.objectContaining({
            code: 'fast_oxygen',
            gamesPlayed: 1,
            winRate: 1,
          }),
        ],
      },
      phaseTempoProfile: {
        bestPhase: expect.objectContaining({
          phase: 'early',
          winRateWhenPeak: 1,
        }),
        mostActivePhase: expect.objectContaining({
          actions: 2,
          phase: 'early',
        }),
      },
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
    const playersOrderByCreatedAt = playersOrderByDisplayName;
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
      rpc: vi.fn(async (fn: string) => ({
        data:
          fn === 'get_player_usernames'
            ? [
                { player_id: 'me-1', username: 'Fochizzy' },
                { player_id: 'me-2', username: 'Fochizzy' },
                { player_id: 'corey-a', username: 'RevLoki' },
                { player_id: 'corey-b', username: 'RevLoki' },
              ]
            : fn === 'get_public_player_names'
              ? [{ is_linked: true, player_id: 'me-1', public_name: 'Fochizzy' }, { is_linked: true, player_id: 'me-2', public_name: 'Fochizzy' }, { is_linked: true, player_id: 'corey-a', public_name: 'RevLoki' }, { is_linked: true, player_id: 'corey-b', public_name: 'RevLoki' }]
              : [],
        error: null,
      })),
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
        opponentName: 'RevLoki',
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
    const playersOrderByCreatedAt = playersOrderByDisplayName;
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
      rpc: vi.fn(async (fn: string) => ({
        data:
          fn === 'get_player_usernames'
            ? [
                { player_id: 'izzy-1', username: 'Fochizzy' },
                { player_id: 'colette-1', username: 'ColetteUser' },
              ]
            : fn === 'get_public_player_names'
              ? [{ is_linked: true, player_id: 'izzy-1', public_name: 'Fochizzy' }, { is_linked: true, player_id: 'colette-1', public_name: 'ColetteUser' }]
              : [],
        error: null,
      })),
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

    // The signed-in user is offered first, then their opponent, and analytics
    // labels are usernames only.
    expect(people.map((person) => person.displayName)).toEqual([
      'Fochizzy',
      'ColetteUser',
    ]);

    const colette = people.find(
      (person) => person.canonicalId === 'user:user-colette',
    );
    expect(colette).toMatchObject({
      activeGroupPlayerId: 'colette-1',
      inActiveGroup: true,
      playerIds: ['colette-1'],
    });
    // `opponentId` is the opponent's canonical person ID, not their group-local
    // player row, so consumers can match a matchup without comparing names.
    expect(colette?.bundle.headToHeadRows).toEqual([
      {
        averageScoreDifferential: -10,
        gamesPlayed: 1,
        label: 'ColetteUser vs Fochizzy',
        losses: 1,
        opponentId: 'user:user-1',
        ties: 0,
        wins: 0,
      },
    ]);
    expect(colette?.bundle.performance?.gamesPlayed).toBe(1);
    expect(colette?.bundle.trendRows).toHaveLength(1);

    const fochizzy = people.find((person) => person.canonicalId === 'user:user-1');
    expect(fochizzy?.bundle.headToHeadRows[0]?.opponentId).toBe('user:user-colette');
    expect(fochizzy?.bundle.headToHeadRows[0]?.opponentId).not.toBe('colette-1');
  });

  it('returns an empty list when the user has no linked players', async () => {
    const playersOrderByDisplayName = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const playersOrderByCreatedAt = playersOrderByDisplayName;
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

  it('uses a placeholder when a co-player can not be resolved', () => {
    const rows = [makeRow('id-a,id-unknown', 'Corey Jansen, Someone Else')];

    rewriteLineupLabels(rows, (id) => (id === 'id-a' ? 'corey' : undefined));

    expect(rows[0].lineup_label).toBe('corey, Unclaimed player 1');
  });

  it('skips solo rows with no lineup key', () => {
    const rows = [makeRow(null, 'Solo setup')];

    rewriteLineupLabels(rows, () => 'corey');

    expect(rows[0].lineup_label).toBe('Solo setup');
  });
});
