import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getGroupAnalytics,
  getProfileAnalytics,
  mapGlobalAwardMetricRow,
  mapGlobalCorporationMetricRow,
  mapGlobalGenerationMetricRow,
  mapGlobalMapMetricRow,
  mapGlobalMilestoneMetricRow,
  mapGlobalPlayerCountMetricRow,
  mapGlobalStyleMetricRow,
  mapGlobalTagMetricRow,
  mapPlayerEfficiencySummary,
  mapPlayerMapMetricRow,
  type RawGlobalAwardMetricRow,
  type RawGlobalCorporationMetricRow,
  type RawGlobalGenerationMetricRow,
  type RawGlobalMapMetricRow,
  type RawGlobalMilestoneMetricRow,
  type RawGlobalPlayerCountMetricRow,
  type RawGlobalStyleMetricRow,
  type RawGlobalTagMetricRow,
  type RawPlayerEfficiencySummaryRow,
  type RawPlayerMapMetricRow,
} from './analytics-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

type TableEntry =
  | Error
  | {
      data?: unknown[] | null;
      error?: Error | null;
    }
  | unknown[]
  | null;

type TableRows = Record<string, TableEntry>;

function createQueryResult(data: unknown[] | null = [], error: Error | null = null) {
  return { data, error };
}

function normalizeTableEntry(entry: TableEntry) {
  if (entry instanceof Error) {
    return createQueryResult(null, entry);
  }

  if (Array.isArray(entry) || entry === null) {
    return createQueryResult(entry);
  }

  return createQueryResult(entry.data ?? [], entry.error ?? null);
}

function createTableQuery(entry: TableEntry) {
  const tableResult = normalizeTableEntry(entry);
  const result = Promise.resolve(tableResult);
  const query = {
    eq: vi.fn(() => query),
    gt: vi.fn(() => query),
    in: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({
      data: tableResult.data?.[0] ?? null,
      error: tableResult.error,
    }),
    order: vi.fn(() => query),
    select: vi.fn(() => query),
    then: result.then.bind(result),
  };

  return query;
}

function mockSupabase(rowsByTable: TableRows) {
  const publicQueries = new Map<string, ReturnType<typeof createTableQuery>>();
  const analyticsQueries = new Map<string, ReturnType<typeof createTableQuery>>();

  const getPublicQuery = (table: string) => {
    if (!Object.prototype.hasOwnProperty.call(rowsByTable, table)) {
      throw new Error(`Unexpected public table ${table}`);
    }

    const query = createTableQuery(rowsByTable[table]);
    publicQueries.set(table, query);
    return query;
  };

  const getAnalyticsQuery = (table: string) => {
    const key = `analytics.${table}`;

    if (!Object.prototype.hasOwnProperty.call(rowsByTable, key)) {
      throw new Error(`Unexpected analytics table ${table}`);
    }

    const query = createTableQuery(rowsByTable[key]);
    analyticsQueries.set(table, query);
    return query;
  };

  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    from: vi.fn(getPublicQuery),
    schema: vi.fn((schemaName: string) => {
      if (schemaName !== 'analytics') {
        throw new Error(`Unexpected schema ${schemaName}`);
      }

      return {
        from: vi.fn(getAnalyticsQuery),
      };
    }),
  } as never);

  return { analyticsQueries, publicQueries };
}

function createProfileGameResultRow(overrides: Record<string, unknown> = {}) {
  return {
    award_points: '5',
    card_points_animals: null,
    card_points_jovian: null,
    card_points_microbes: null,
    card_points_total: '20',
    cities_points: '10',
    declared_modifier_style_codes: [],
    declared_primary_style_code: null,
    game_id: 'game-1',
    greenery_points: '12',
    group_id: 'group-1',
    has_full_card_breakdown: false,
    inferred_primary_style_code: null,
    inferred_style_confidence: null,
    is_winner: true,
    key_card_count: '0',
    loss_gap_points: null,
    milestone_points: '8',
    other_card_points: null,
    placement: '1',
    placement_score: '1',
    player_id: 'player-1',
    player_name: 'Friday Mars',
    signed_differential_points: '6',
    total_points: '75',
    tr_points: '20',
    win_differential_points: '6',
    ...overrides,
  };
}

describe('persisted metric mappers', () => {
  it('exports mappers that convert persisted numeric strings', () => {
    const efficiencyRow = {
      average_award_roi: '1.2500',
      average_expected_score: '72.5000',
      average_loss_gap: null,
      average_normalized_efficiency: '1.1000',
      average_placement: '1.5000',
      average_points_per_generation: '8.2500',
      average_score: '82.5000',
      average_score_delta_vs_expected: '6.5000',
      average_win_margin: '4.5000',
      award_score_share: '0.1200',
      best_score_source: 'cards',
      best_tag_lane: 'science',
      card_score_share: '0.4200',
      cities_score_share: '0.1000',
      close_game_count: '2',
      clutch_close_rate: '0.5000',
      consistency_index: '0.7143',
      close_game_wins: '1',
      close_game_win_rate: '0.5000',
      games_played: '4',
      greenery_score_share: '0.1500',
      group_id: 'group-1',
      milestone_score_share: '0.1100',
      player_id: 'player-1',
      tag_evidence_coverage: '0.8750',
      tr_score_share: '0.2100',
      win_conversion_over_expected: '0.1875',
      win_rate: '0.7500',
      wins: '3',
    } satisfies RawPlayerEfficiencySummaryRow;
    const mapRow = {
      average_generations: '10.5000',
      average_normalized_efficiency: '1.0300',
      average_points: '82.2500',
      average_points_per_generation: '7.8333',
      average_score_delta_vs_expected: null,
      clutch_close_rate: '0.3333',
      consistency_index: '0.8000',
      best_score_source_on_map: 'cards',
      best_tag_lane_on_map: 'science',
      games_played: '6',
      group_id: 'group-1',
      map_id: 'map-a',
      map_rank_for_player: '1',
      maps: { name: 'Tharsis' },
      player_id: 'player-1',
      win_conversion_over_expected: '0.1250',
      win_rate: '0.6667',
      wins: '4',
    } satisfies RawPlayerMapMetricRow;
    const globalRow = {
      average_generations: '10.0000',
      average_normalized_efficiency: '1.0100',
      average_points: '80.0000',
      average_points_per_generation: '8.0000',
      best_tag_lane: 'building',
      expected_score_baseline: '79.5000',
      games_played: '10',
      highest_efficiency_style_code: 'engine',
      highest_win_rate_corporation_id: 'corp-1',
      map_id: '11111111-1111-4111-8111-111111111111',
      maps: { name: 'Tharsis' },
      player_count: '4',
      win_conversion_over_expected: '0.0500',
      consistency_index: '0.7600',
      clutch_close_rate: '0.4000',
    } satisfies RawGlobalMapMetricRow;
    const corporationRow = {
      average_normalized_efficiency: '1.1100',
      average_points: '86.2000',
      average_points_per_generation: '8.6200',
      corporation_id: 'corp-1',
      corporations: { name: 'CrediCor' },
      games_played: '8',
      map_id: 'map-b',
      maps: { name: 'Hellas' },
      player_count: '4',
      win_conversion_over_expected: '0.1750',
      consistency_index: '0.6900',
      clutch_close_rate: '0.6667',
      win_rate: '0.6250',
      wins: '5',
    } satisfies RawGlobalCorporationMetricRow;
    const styleRow = {
      average_normalized_efficiency: '1.0900',
      average_points: '84.1000',
      average_points_per_generation: '8.4100',
      games_played: '7',
      map_id: null,
      maps: null,
      player_count: '4',
      style_code: 'engine_builder',
      win_conversion_over_expected: '0.0714',
      consistency_index: '0.7200',
      clutch_close_rate: '0.5000',
      win_rate: '0.5714',
      wins: '4',
    } satisfies RawGlobalStyleMetricRow;
    const tagRow = {
      average_normalized_efficiency: '1.1400',
      average_points: '88.3000',
      average_points_per_generation: '8.8300',
      average_tag_count: '6.4000',
      games_played: '9',
      map_id: null,
      maps: null,
      player_count: '4',
      tag_code: 'science',
      win_conversion_over_expected: '0.1667',
      consistency_index: '0.8100',
      clutch_close_rate: '0.7500',
      win_rate: '0.6667',
      wins: '6',
    } satisfies RawGlobalTagMetricRow;
    const milestoneRow = {
      average_claimed_generation: '6.5000',
      average_winner_points_per_generation: '8.9000',
      games_played: '6',
      map_id: null,
      maps: null,
      milestone_id: 'milestone-1',
      milestones: [{ name: 'Gardener' }],
      milestone_winner_win_rate: '0.5000',
      player_count: '4',
      winner_win_conversion_over_expected: '0.1250',
      winner_consistency_index: '0.7800',
      winner_clutch_close_rate: '0.5000',
      winner_wins: '3',
    } satisfies RawGlobalMilestoneMetricRow;
    const awardRow = {
      average_award_roi: '-1.2500',
      average_funded_generation: '7.2500',
      award_id: 'award-1',
      awards: { name: 'Banker' },
      award_winner_win_rate: '0.5000',
      funder_success_rate: '0.7500',
      funder_wins: '2',
      games_played: '4',
      map_id: null,
      maps: null,
      player_count: '4',
      winner_funder_mismatch_rate: '0.2500',
      award_winner_win_conversion_over_expected: '0.1250',
      award_winner_consistency_index: '0.7400',
      award_winner_clutch_close_rate: '0.5000',
      funder_win_conversion_over_expected: '0.2500',
      funder_consistency_index: '0.8200',
      funder_clutch_close_rate: '0.7500',
      winner_wins: '2',
    } satisfies RawGlobalAwardMetricRow;
    const playerCountRow = {
      average_generations: '10.5000',
      average_points: '83.4000',
      average_points_per_generation: '7.9400',
      expected_score_baseline: '82.1000',
      games_played: '11',
      player_count: '4',
      win_conversion_over_expected: '0.0909',
      consistency_index: '0.7000',
      clutch_close_rate: '0.5455',
    } satisfies RawGlobalPlayerCountMetricRow;
    const generationRow = {
      average_points: '85.7000',
      average_points_per_generation: '8.5700',
      expected_score_baseline: '84.2000',
      games_played: '5',
      generation_count: '10',
      win_conversion_over_expected: '0.1000',
      consistency_index: '0.6800',
      clutch_close_rate: '0.6000',
    } satisfies RawGlobalGenerationMetricRow;

    expect(mapPlayerEfficiencySummary(efficiencyRow)).toMatchObject({
      averageAwardRoi: 1.25,
      averagePointsPerGeneration: 8.25,
      gamesPlayed: 4,
      tagEvidenceCoverage: 0.875,
      winConversionOverExpected: 0.1875,
      consistencyIndex: 0.7143,
      clutchCloseRate: 0.5,
      winRate: 0.75,
    });
    expect(mapPlayerMapMetricRow(mapRow)).toMatchObject({
      averagePointsPerGeneration: 7.8333,
      gamesPlayed: 6,
      mapName: 'Tharsis',
      mapRankForPlayer: 1,
      winConversionOverExpected: 0.125,
      consistencyIndex: 0.8,
      clutchCloseRate: 0.3333,
    });
    expect(mapGlobalMapMetricRow(globalRow)).toMatchObject({
      averagePointsPerGeneration: 8,
      expectedScoreBaseline: 79.5,
      mapId: '11111111-1111-4111-8111-111111111111',
      mapName: 'Tharsis',
      playerCount: 4,
      winConversionOverExpected: 0.05,
      consistencyIndex: 0.76,
      clutchCloseRate: 0.4,
    });
    expect(mapGlobalCorporationMetricRow(corporationRow)).toMatchObject({
      averagePointsPerGeneration: 8.62,
      corporationName: 'CrediCor',
      gamesPlayed: 8,
      mapName: 'Hellas',
      winConversionOverExpected: 0.175,
      consistencyIndex: 0.69,
      clutchCloseRate: 0.6667,
      winRate: 0.625,
    });
    expect(mapGlobalStyleMetricRow(styleRow)).toMatchObject({
      averagePointsPerGeneration: 8.41,
      mapName: null,
      styleCode: 'engine_builder',
      winConversionOverExpected: 0.0714,
      consistencyIndex: 0.72,
      clutchCloseRate: 0.5,
      winRate: 0.5714,
    });
    expect(mapGlobalTagMetricRow(tagRow)).toMatchObject({
      averageTagCount: 6.4,
      tagCode: 'science',
      winConversionOverExpected: 0.1667,
      consistencyIndex: 0.81,
      clutchCloseRate: 0.75,
      winRate: 0.6667,
    });
    expect(mapGlobalMilestoneMetricRow(milestoneRow)).toMatchObject({
      averageClaimedGeneration: 6.5,
      milestoneName: 'Gardener',
      milestoneWinnerWinRate: 0.5,
      winnerWinConversionOverExpected: 0.125,
      winnerConsistencyIndex: 0.78,
      winnerClutchCloseRate: 0.5,
    });
    expect(mapGlobalAwardMetricRow(awardRow)).toMatchObject({
      averageAwardRoi: -1.25,
      averageFundedGeneration: 7.25,
      awardName: 'Banker',
      funderSuccessRate: 0.75,
      awardWinnerWinConversionOverExpected: 0.125,
      awardWinnerConsistencyIndex: 0.74,
      awardWinnerClutchCloseRate: 0.5,
      funderWinConversionOverExpected: 0.25,
      funderConsistencyIndex: 0.82,
      funderClutchCloseRate: 0.75,
    });
    expect(mapGlobalPlayerCountMetricRow(playerCountRow)).toMatchObject({
      averageGenerations: 10.5,
      expectedScoreBaseline: 82.1,
      playerCount: 4,
      winConversionOverExpected: 0.0909,
      consistencyIndex: 0.7,
      clutchCloseRate: 0.5455,
    });
    expect(mapGlobalGenerationMetricRow(generationRow)).toMatchObject({
      averagePointsPerGeneration: 8.57,
      expectedScoreBaseline: 84.2,
      generationCount: 10,
      winConversionOverExpected: 0.1,
      consistencyIndex: 0.68,
      clutchCloseRate: 0.6,
    });
  });
});

describe('getProfileAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty linked-profile state when analytics rows are absent', async () => {
    mockSupabase({
      players: [{ display_name: 'Friday Mars', id: 'player-1' }],
      'analytics.player_game_results': null,
      player_metric_summaries: [],
      player_map_metric_summaries: [],
    });

    await expect(getProfileAnalytics('group-1', 'user-1')).resolves.toEqual({
      coverage: null,
      efficiencySummary: null,
      headToHeadRows: [],
      mapMetricRows: [],
      performance: null,
      playerId: 'player-1',
      playerName: 'Friday Mars',
      scoreAverages: null,
      styleAgreement: null,
    });
  });

  it('includes persisted efficiency and map metric rows for linked players', async () => {
    const { publicQueries } = mockSupabase({
      players: [
        { display_name: 'Friday Mars', id: 'player-1' },
        { display_name: 'Friday Mars', id: 'player-2' },
      ],
      'analytics.player_game_results': null,
      player_metric_summaries: [
        {
          average_award_roi: '1.5000',
          average_expected_score: '72.2500',
          average_loss_gap: '4.2500',
          average_normalized_efficiency: '1.1200',
          average_placement: '1.8000',
          average_points_per_generation: '8.4000',
          average_score: '84.0000',
          average_score_delta_vs_expected: '6.5000',
          average_win_margin: '7.7500',
          best_score_source: 'cards',
          best_tag_lane: 'science',
          card_score_share: '0.4200',
          cities_score_share: '0.1200',
          close_game_count: 3,
          close_game_win_rate: '0.6667',
          close_game_wins: 2,
          clutch_close_rate: '0.6667',
          consistency_index: '0.7143',
          games_played: 5,
          greenery_score_share: '0.1800',
          group_id: 'group-1',
          milestone_score_share: '0.0900',
          award_score_share: '0.1100',
          player_id: 'player-1',
          tag_evidence_coverage: '0.8750',
          tr_score_share: '0.2100',
          win_conversion_over_expected: '0.1875',
          win_rate: '0.6000',
          wins: 3,
        },
        {
          average_award_roi: '0.2500',
          average_expected_score: '70.0000',
          average_loss_gap: null,
          average_normalized_efficiency: '0.9900',
          average_placement: '2.1000',
          average_points_per_generation: '7.1000',
          average_score: '71.0000',
          average_score_delta_vs_expected: '1.0000',
          average_win_margin: null,
          best_score_source: 'tr',
          best_tag_lane: null,
          card_score_share: '0.3000',
          cities_score_share: '0.1000',
          close_game_count: 1,
          close_game_win_rate: '0.0000',
          close_game_wins: 0,
          clutch_close_rate: '0.0000',
          consistency_index: '0.6400',
          games_played: 2,
          greenery_score_share: '0.2000',
          group_id: 'group-1',
          milestone_score_share: '0.0500',
          award_score_share: '0.0600',
          player_id: 'player-2',
          tag_evidence_coverage: '0.5000',
          tr_score_share: '0.2400',
          win_conversion_over_expected: '-0.0500',
          win_rate: '0.5000',
          wins: 1,
        },
      ],
      player_map_metric_summaries: [
        {
          average_generations: '10.2500',
          average_normalized_efficiency: '1.0800',
          average_points: '84.5000',
          average_points_per_generation: '8.4500',
          average_score_delta_vs_expected: '5.7500',
          best_score_source_on_map: 'cards',
          best_tag_lane_on_map: 'science',
          clutch_close_rate: '0.3333',
          consistency_index: '0.8000',
          games_played: 3,
          group_id: 'group-1',
          map_id: 'map-a',
          map_rank_for_player: '2',
          maps: { name: 'Tharsis' },
          player_id: 'player-1',
          win_conversion_over_expected: '0.1250',
          win_rate: '0.6667',
          wins: 2,
        },
        {
          average_generations: '9.0000',
          average_normalized_efficiency: '1.2000',
          average_points: '81.0000',
          average_points_per_generation: '9.0000',
          average_score_delta_vs_expected: null,
          best_score_source_on_map: 'greenery',
          best_tag_lane_on_map: null,
          clutch_close_rate: '0.5000',
          consistency_index: '0.7000',
          games_played: 4,
          group_id: 'group-1',
          map_id: 'map-b',
          map_rank_for_player: '1',
          maps: null,
          player_id: 'player-1',
          win_conversion_over_expected: '0.0900',
          win_rate: '0.5000',
          wins: 2,
        },
      ],
    });

    const result = await getProfileAnalytics('group-1', 'user-1');
    const efficiencyQuery = publicQueries.get('player_metric_summaries');
    const mapQuery = publicQueries.get('player_map_metric_summaries');

    expect(result?.efficiencySummary).toEqual({
      averageAwardRoi: 1.5,
      averageExpectedScore: 72.25,
      averageLossGap: 4.25,
      averageNormalizedEfficiency: 1.12,
      averagePlacement: 1.8,
      averagePointsPerGeneration: 8.4,
      averageScore: 84,
      averageScoreDeltaVsExpected: 6.5,
      averageWinMargin: 7.75,
      bestScoreSource: 'cards',
      bestTagLane: 'science',
      cardScoreShare: 0.42,
      citiesScoreShare: 0.12,
      closeGameCount: 3,
      closeGameWinRate: 0.6667,
      closeGameWins: 2,
      clutchCloseRate: 0.6667,
      consistencyIndex: 0.7143,
      gamesPlayed: 5,
      greeneryScoreShare: 0.18,
      groupId: 'group-1',
      milestoneScoreShare: 0.09,
      awardScoreShare: 0.11,
      playerId: 'player-1',
      tagEvidenceCoverage: 0.875,
      trScoreShare: 0.21,
      winConversionOverExpected: 0.1875,
      winRate: 0.6,
      wins: 3,
    });
    expect(result?.mapMetricRows).toEqual([
      {
        averageGenerations: 9,
        averageNormalizedEfficiency: 1.2,
        averagePoints: 81,
        averagePointsPerGeneration: 9,
        averageScoreDeltaVsExpected: null,
        bestScoreSourceOnMap: 'greenery',
        bestTagLaneOnMap: null,
        clutchCloseRate: 0.5,
        consistencyIndex: 0.7,
        gamesPlayed: 4,
        groupId: 'group-1',
        mapId: 'map-b',
        mapName: null,
        mapRankForPlayer: 1,
        playerId: 'player-1',
        winConversionOverExpected: 0.09,
        winRate: 0.5,
        wins: 2,
      },
      {
        averageGenerations: 10.25,
        averageNormalizedEfficiency: 1.08,
        averagePoints: 84.5,
        averagePointsPerGeneration: 8.45,
        averageScoreDeltaVsExpected: 5.75,
        bestScoreSourceOnMap: 'cards',
        bestTagLaneOnMap: 'science',
        clutchCloseRate: 0.3333,
        consistencyIndex: 0.8,
        gamesPlayed: 3,
        groupId: 'group-1',
        mapId: 'map-a',
        mapName: 'Tharsis',
        mapRankForPlayer: 2,
        playerId: 'player-1',
        winConversionOverExpected: 0.125,
        winRate: 0.6667,
        wins: 2,
      },
    ]);
    expect(efficiencyQuery?.select).toHaveBeenCalledWith(
      expect.stringContaining('average_points_per_generation'),
    );
    expect(efficiencyQuery?.in).toHaveBeenCalledWith('player_id', ['player-1']);
    expect(efficiencyQuery?.order).toHaveBeenNthCalledWith(1, 'games_played', {
      ascending: false,
    });
    expect(efficiencyQuery?.order).toHaveBeenNthCalledWith(
      2,
      'average_points_per_generation',
      { ascending: false },
    );
    expect(efficiencyQuery?.order).toHaveBeenNthCalledWith(3, 'player_id', {
      ascending: true,
    });
    expect(efficiencyQuery?.order).toHaveBeenNthCalledWith(4, 'group_id', {
      ascending: true,
    });
    expect(mapQuery?.select).toHaveBeenCalledWith(
      expect.stringContaining('map_rank_for_player'),
    );
    expect(mapQuery?.in).toHaveBeenCalledWith('player_id', ['player-1']);
    expect(mapQuery?.order).toHaveBeenCalledWith('map_rank_for_player', {
      ascending: true,
    });
  });

  it('falls back to legacy profile analytics when persisted metric reads fail', async () => {
    mockSupabase({
      players: [{ display_name: 'Friday Mars', id: 'player-1' }],
      'analytics.player_game_results': [createProfileGameResultRow()],
      player_metric_summaries: new Error('persisted summary unavailable'),
      player_map_metric_summaries: new Error('persisted map unavailable'),
    });

    await expect(getProfileAnalytics('group-1', 'user-1')).resolves.toMatchObject({
      efficiencySummary: null,
      mapMetricRows: [],
      performance: {
        averageScore: 75,
        gamesPlayed: 1,
        playerId: 'player-1',
      },
    });
  });
});

describe('getGroupAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes group persisted metric rows from public metrics', async () => {
    const { publicQueries } = mockSupabase({
      'analytics.group_leaderboard': [],
      'analytics.group_score_source_averages': [],
      'analytics.player_score_source_averages': [],
      'analytics.group_style_performance': [],
      'analytics.player_style_performance': [],
      'analytics.group_interactions': [],
      'analytics.player_interactions': [],
      'analytics.head_to_head': [],
      'analytics.lineup_effects': [],
      'analytics.player_trends': [],
      'analytics.style_agreement': [],
      'analytics.data_coverage': [],
      'analytics.player_data_coverage': [],
      player_metric_summaries: [
        {
          average_award_roi: '1.2500',
          average_expected_score: '72.5000',
          average_loss_gap: '3.2500',
          average_normalized_efficiency: '1.1000',
          average_placement: '1.5000',
          average_points_per_generation: '8.2500',
          average_score: '82.5000',
          average_score_delta_vs_expected: '6.5000',
          average_win_margin: '4.5000',
          award_score_share: '0.1200',
          best_score_source: 'cards',
          best_tag_lane: 'science',
          card_score_share: '0.4200',
          cities_score_share: '0.1000',
          close_game_count: '2',
          clutch_close_rate: '0.5000',
          consistency_index: '0.7143',
          close_game_wins: '1',
          close_game_win_rate: '0.5000',
          games_played: '4',
          greenery_score_share: '0.1500',
          group_id: 'group-1',
          milestone_score_share: '0.1100',
          player_id: 'player-1',
          tag_evidence_coverage: '0.8750',
          tr_score_share: '0.2100',
          win_conversion_over_expected: '0.1875',
          win_rate: '0.7500',
          wins: '3',
        },
      ],
      player_map_metric_summaries: [
        {
          average_generations: '10.2500',
          average_normalized_efficiency: '1.0800',
          average_points: '84.5000',
          average_points_per_generation: '8.4500',
          average_score_delta_vs_expected: '5.7500',
          clutch_close_rate: '0.3333',
          consistency_index: '0.8000',
          best_score_source_on_map: 'cards',
          best_tag_lane_on_map: 'science',
          games_played: '3',
          group_id: 'group-1',
          map_id: 'map-a',
          map_rank_for_player: '1',
          maps: { name: 'Tharsis' },
          player_id: 'player-1',
          win_conversion_over_expected: '0.1250',
          win_rate: '0.6667',
          wins: '2',
        },
      ],
      global_map_metric_summaries: [
        {
          average_generations: '10.5000',
          average_normalized_efficiency: '1.0300',
          average_points: '82.2500',
          average_points_per_generation: '7.8333',
          best_tag_lane: 'building',
          expected_score_baseline: '79.7500',
          games_played: 6,
          highest_efficiency_style_code: 'engine',
          highest_win_rate_corporation_id: 'corp-1',
          map_id: '11111111-1111-4111-8111-111111111111',
          maps: { name: 'Tharsis' },
          player_count: 4,
          win_conversion_over_expected: '0.0500',
          consistency_index: '0.7600',
          clutch_close_rate: '0.4000',
        },
      ],
      global_corporation_metric_summaries: [
        {
          average_normalized_efficiency: '1.1100',
          average_points: '86.2000',
          average_points_per_generation: '8.6200',
          corporation_id: 'corp-1',
          corporations: { name: 'CrediCor' },
          games_played: '8',
          map_id: 'map-b',
          maps: { name: 'Hellas' },
          player_count: '4',
          win_conversion_over_expected: '0.1750',
          consistency_index: '0.6900',
          clutch_close_rate: '0.6667',
          win_rate: '0.6250',
          wins: '5',
        },
      ],
      global_style_metric_summaries: [
        {
          average_normalized_efficiency: '1.0900',
          average_points: '84.1000',
          average_points_per_generation: '8.4100',
          games_played: '7',
          map_id: null,
          maps: null,
          player_count: '4',
          style_code: 'engine_builder',
          win_conversion_over_expected: '0.0714',
          consistency_index: '0.7200',
          clutch_close_rate: '0.5000',
          win_rate: '0.5714',
          wins: '4',
        },
      ],
      global_tag_metric_summaries: [
        {
          average_normalized_efficiency: '1.1400',
          average_points: '88.3000',
          average_points_per_generation: '8.8300',
          average_tag_count: '6.4000',
          games_played: '9',
          map_id: null,
          maps: null,
          player_count: '4',
          tag_code: 'science',
          win_conversion_over_expected: '0.1667',
          consistency_index: '0.8100',
          clutch_close_rate: '0.7500',
          win_rate: '0.6667',
          wins: '6',
        },
      ],
      global_milestone_metric_summaries: [
        {
          average_claimed_generation: '6.5000',
          average_winner_points_per_generation: '8.9000',
          games_played: '6',
          map_id: null,
          maps: null,
          milestone_id: 'milestone-1',
          milestones: { name: 'Gardener' },
          milestone_winner_win_rate: '0.5000',
          player_count: '4',
          winner_win_conversion_over_expected: '0.1250',
          winner_consistency_index: '0.7800',
          winner_clutch_close_rate: '0.5000',
          winner_wins: '3',
        },
      ],
      global_award_metric_summaries: [
        {
          average_award_roi: '-1.2500',
          average_funded_generation: '7.2500',
          award_id: 'award-1',
          awards: { name: 'Banker' },
          award_winner_win_rate: '0.5000',
          funder_success_rate: '0.7500',
          funder_wins: '2',
          games_played: '4',
          map_id: null,
          maps: null,
          player_count: '4',
          winner_funder_mismatch_rate: '0.2500',
          award_winner_win_conversion_over_expected: '0.1250',
          award_winner_consistency_index: '0.7400',
          award_winner_clutch_close_rate: '0.5000',
          funder_win_conversion_over_expected: '0.2500',
          funder_consistency_index: '0.8200',
          funder_clutch_close_rate: '0.7500',
          winner_wins: '2',
        },
      ],
      global_player_count_metric_summaries: [
        {
          average_generations: '10.5000',
          average_points: '83.4000',
          average_points_per_generation: '7.9400',
          expected_score_baseline: '82.1000',
          games_played: '11',
          player_count: '4',
          win_conversion_over_expected: '0.0909',
          consistency_index: '0.7000',
          clutch_close_rate: '0.5455',
        },
      ],
      global_generation_metric_summaries: [
        {
          average_points: '85.7000',
          average_points_per_generation: '8.5700',
          expected_score_baseline: '84.2000',
          games_played: '5',
          generation_count: '10',
          win_conversion_over_expected: '0.1000',
          consistency_index: '0.6800',
          clutch_close_rate: '0.6000',
        },
      ],
    });

    await expect(getGroupAnalytics('group-1')).resolves.toMatchObject({
      globalMapMetricRows: [
        {
          averageGenerations: 10.5,
          averageNormalizedEfficiency: 1.03,
          averagePoints: 82.25,
          averagePointsPerGeneration: 7.8333,
          bestTagLane: 'building',
          expectedScoreBaseline: 79.75,
          gamesPlayed: 6,
          highestEfficiencyStyleCode: 'engine',
          highestWinRateCorporationId: 'corp-1',
          mapId: '11111111-1111-4111-8111-111111111111',
          mapName: 'Tharsis',
          playerCount: 4,
          winConversionOverExpected: 0.05,
          consistencyIndex: 0.76,
          clutchCloseRate: 0.4,
        },
      ],
      globalCorporationMetricRows: [
        {
          averageNormalizedEfficiency: 1.11,
          averagePoints: 86.2,
          averagePointsPerGeneration: 8.62,
          corporationId: 'corp-1',
          corporationName: 'CrediCor',
          gamesPlayed: 8,
          mapId: 'map-b',
          mapName: 'Hellas',
          playerCount: 4,
          winConversionOverExpected: 0.175,
          consistencyIndex: 0.69,
          clutchCloseRate: 0.6667,
          winRate: 0.625,
          wins: 5,
        },
      ],
      globalStyleMetricRows: [
        {
          averageNormalizedEfficiency: 1.09,
          averagePoints: 84.1,
          averagePointsPerGeneration: 8.41,
          gamesPlayed: 7,
          mapId: null,
          mapName: null,
          playerCount: 4,
          styleCode: 'engine_builder',
          winConversionOverExpected: 0.0714,
          consistencyIndex: 0.72,
          clutchCloseRate: 0.5,
          winRate: 0.5714,
          wins: 4,
        },
      ],
      globalTagMetricRows: [
        {
          averageNormalizedEfficiency: 1.14,
          averagePoints: 88.3,
          averagePointsPerGeneration: 8.83,
          averageTagCount: 6.4,
          gamesPlayed: 9,
          mapId: null,
          mapName: null,
          playerCount: 4,
          tagCode: 'science',
          winConversionOverExpected: 0.1667,
          consistencyIndex: 0.81,
          clutchCloseRate: 0.75,
          winRate: 0.6667,
          wins: 6,
        },
      ],
      globalMilestoneMetricRows: [
        {
          averageClaimedGeneration: 6.5,
          averageWinnerPointsPerGeneration: 8.9,
          gamesPlayed: 6,
          mapId: null,
          mapName: null,
          milestoneId: 'milestone-1',
          milestoneName: 'Gardener',
          milestoneWinnerWinRate: 0.5,
          playerCount: 4,
          winnerWinConversionOverExpected: 0.125,
          winnerConsistencyIndex: 0.78,
          winnerClutchCloseRate: 0.5,
          winnerWins: 3,
        },
      ],
      globalAwardMetricRows: [
        {
          averageAwardRoi: -1.25,
          averageFundedGeneration: 7.25,
          awardId: 'award-1',
          awardName: 'Banker',
          awardWinnerWinRate: 0.5,
          funderSuccessRate: 0.75,
          funderWins: 2,
          gamesPlayed: 4,
          mapId: null,
          mapName: null,
          playerCount: 4,
          winnerFunderMismatchRate: 0.25,
          awardWinnerWinConversionOverExpected: 0.125,
          awardWinnerConsistencyIndex: 0.74,
          awardWinnerClutchCloseRate: 0.5,
          funderWinConversionOverExpected: 0.25,
          funderConsistencyIndex: 0.82,
          funderClutchCloseRate: 0.75,
          winnerWins: 2,
        },
      ],
      globalPlayerCountMetricRows: [
        {
          averageGenerations: 10.5,
          averagePoints: 83.4,
          averagePointsPerGeneration: 7.94,
          expectedScoreBaseline: 82.1,
          gamesPlayed: 11,
          playerCount: 4,
          winConversionOverExpected: 0.0909,
          consistencyIndex: 0.7,
          clutchCloseRate: 0.5455,
        },
      ],
      globalGenerationMetricRows: [
        {
          averagePoints: 85.7,
          averagePointsPerGeneration: 8.57,
          expectedScoreBaseline: 84.2,
          gamesPlayed: 5,
          generationCount: 10,
          winConversionOverExpected: 0.1,
          consistencyIndex: 0.68,
          clutchCloseRate: 0.6,
        },
      ],
      playerEfficiencySummaries: [
        {
          averageAwardRoi: 1.25,
          averageExpectedScore: 72.5,
          averageLossGap: 3.25,
          averageNormalizedEfficiency: 1.1,
          averagePlacement: 1.5,
          averagePointsPerGeneration: 8.25,
          averageScore: 82.5,
          averageScoreDeltaVsExpected: 6.5,
          averageWinMargin: 4.5,
          awardScoreShare: 0.12,
          bestScoreSource: 'cards',
          bestTagLane: 'science',
          cardScoreShare: 0.42,
          citiesScoreShare: 0.1,
          closeGameCount: 2,
          clutchCloseRate: 0.5,
          consistencyIndex: 0.7143,
          closeGameWins: 1,
          closeGameWinRate: 0.5,
          gamesPlayed: 4,
          greeneryScoreShare: 0.15,
          groupId: 'group-1',
          milestoneScoreShare: 0.11,
          playerId: 'player-1',
          tagEvidenceCoverage: 0.875,
          trScoreShare: 0.21,
          winConversionOverExpected: 0.1875,
          winRate: 0.75,
          wins: 3,
        },
      ],
      playerMapMetricRows: [
        {
          averageGenerations: 10.25,
          averageNormalizedEfficiency: 1.08,
          averagePoints: 84.5,
          averagePointsPerGeneration: 8.45,
          averageScoreDeltaVsExpected: 5.75,
          bestScoreSourceOnMap: 'cards',
          bestTagLaneOnMap: 'science',
          gamesPlayed: 3,
          groupId: 'group-1',
          mapId: 'map-a',
          mapName: 'Tharsis',
          mapRankForPlayer: 1,
          playerId: 'player-1',
          winConversionOverExpected: 0.125,
          consistencyIndex: 0.8,
          clutchCloseRate: 0.3333,
          winRate: 0.6667,
          wins: 2,
        },
      ],
    });
    const globalQuery = publicQueries.get('global_map_metric_summaries');
    const corporationQuery = publicQueries.get('global_corporation_metric_summaries');
    const styleQuery = publicQueries.get('global_style_metric_summaries');
    const tagQuery = publicQueries.get('global_tag_metric_summaries');
    const milestoneQuery = publicQueries.get('global_milestone_metric_summaries');
    const awardQuery = publicQueries.get('global_award_metric_summaries');
    const playerCountQuery = publicQueries.get(
      'global_player_count_metric_summaries',
    );
    const generationQuery = publicQueries.get('global_generation_metric_summaries');
    const playerSummaryQuery = publicQueries.get('player_metric_summaries');
    const playerMapQuery = publicQueries.get('player_map_metric_summaries');

    expect(publicQueries.has('global_map_metric_summaries')).toBe(true);
    expect(publicQueries.has('global_corporation_metric_summaries')).toBe(true);
    expect(publicQueries.has('global_style_metric_summaries')).toBe(true);
    expect(publicQueries.has('global_tag_metric_summaries')).toBe(true);
    expect(publicQueries.has('global_milestone_metric_summaries')).toBe(true);
    expect(publicQueries.has('global_award_metric_summaries')).toBe(true);
    expect(publicQueries.has('global_player_count_metric_summaries')).toBe(true);
    expect(publicQueries.has('global_generation_metric_summaries')).toBe(true);
    expect(publicQueries.has('player_metric_summaries')).toBe(true);
    expect(publicQueries.has('player_map_metric_summaries')).toBe(true);
    expect(globalQuery?.select).toHaveBeenCalledWith(
      expect.stringContaining('expected_score_baseline'),
    );
    expect(globalQuery?.select).toHaveBeenCalledWith(
      expect.stringContaining('maps(name)'),
    );
    expect(globalQuery?.order).toHaveBeenCalledWith('games_played', {
      ascending: false,
    });
    expect(corporationQuery?.select).toHaveBeenCalledWith(
      expect.stringContaining('corporations(name)'),
    );
    expect(corporationQuery?.select).toHaveBeenCalledWith(
      expect.stringContaining('maps(name)'),
    );
    expect(corporationQuery?.order).toHaveBeenCalledWith('win_rate', {
      ascending: false,
    });
    expect(styleQuery?.select).toHaveBeenCalledWith(
      expect.stringContaining('style_code'),
    );
    expect(styleQuery?.order).toHaveBeenCalledWith('average_points_per_generation', {
      ascending: false,
    });
    expect(tagQuery?.select).toHaveBeenCalledWith(
      expect.stringContaining('tag_code'),
    );
    expect(tagQuery?.select).toHaveBeenCalledWith(
      expect.stringContaining('average_tag_count'),
    );
    expect(milestoneQuery?.select).toHaveBeenCalledWith(
      expect.stringContaining('milestones(name)'),
    );
    expect(milestoneQuery?.order).toHaveBeenCalledWith(
      'milestone_winner_win_rate',
      { ascending: false },
    );
    expect(awardQuery?.select).toHaveBeenCalledWith(
      expect.stringContaining('awards(name)'),
    );
    expect(awardQuery?.order).toHaveBeenCalledWith('funder_success_rate', {
      ascending: false,
    });
    expect(playerCountQuery?.select).toHaveBeenCalledWith(
      expect.stringContaining('player_count'),
    );
    expect(playerCountQuery?.order).toHaveBeenCalledWith('player_count', {
      ascending: true,
    });
    expect(generationQuery?.select).toHaveBeenCalledWith(
      expect.stringContaining('generation_count'),
    );
    expect(generationQuery?.order).toHaveBeenCalledWith('generation_count', {
      ascending: true,
    });
    expect(playerSummaryQuery?.eq).toHaveBeenCalledWith('group_id', 'group-1');
    expect(playerSummaryQuery?.order).toHaveBeenNthCalledWith(4, 'group_id', {
      ascending: true,
    });
    expect(playerMapQuery?.select).toHaveBeenCalledWith(
      expect.stringContaining('maps(name)'),
    );
    expect(playerMapQuery?.eq).toHaveBeenCalledWith('group_id', 'group-1');
    expect(playerMapQuery?.order).toHaveBeenNthCalledWith(
      1,
      'map_rank_for_player',
      { ascending: true },
    );
    expect(playerMapQuery?.order).toHaveBeenNthCalledWith(2, 'games_played', {
      ascending: false,
    });
  });

  it('throws when an analytics query uses an unexpected table', async () => {
    mockSupabase({
      players: [],
    });

    await expect(getGroupAnalytics('group-1')).rejects.toThrow(
      'Unexpected analytics table group_leaderboard',
    );
  });

  it('throws when a public query uses an unexpected table', async () => {
    mockSupabase({
      'analytics.group_leaderboard': [],
      'analytics.group_score_source_averages': [],
      'analytics.player_score_source_averages': [],
      'analytics.group_style_performance': [],
      'analytics.player_style_performance': [],
      'analytics.group_interactions': [],
      'analytics.player_interactions': [],
      'analytics.head_to_head': [],
      'analytics.lineup_effects': [],
      'analytics.player_trends': [],
      'analytics.style_agreement': [],
      'analytics.data_coverage': [],
      'analytics.player_data_coverage': [],
    });

    await expect(getGroupAnalytics('group-1')).rejects.toThrow(
      'Unexpected public table player_metric_summaries',
    );
  });
});
