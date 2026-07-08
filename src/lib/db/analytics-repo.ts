import { createSupabaseServerClient } from '@/lib/supabase/server';

export type LeaderboardRow = {
  averageLossGap: number | null;
  averagePlacement: number;
  averageScore: number;
  averageWinMargin: number | null;
  differentialComponent: number;
  gamesPlayed: number;
  groupId: string;
  placementComponent: number;
  playerId: string;
  playerName: string;
  weightedScore: number;
  winRate: number;
  winRateComponent: number;
  wins: number;
};

export type ScoreSourceAverages = {
  averageAnimalPoints: number;
  averageAwardPoints: number;
  averageCardPoints: number;
  averageCitiesPoints: number;
  averageGreeneryPoints: number;
  averageJovianPoints: number;
  averageMicrobePoints: number;
  averageMilestonePoints: number;
  averageOtherCardPoints: number;
  averageTrPoints: number;
};

export type PlayerScoreSourceAverages = ScoreSourceAverages & {
  groupId: string;
  playerId: string;
  playerName: string;
};

export type GroupStylePerformanceRow = {
  averageGenerationCount: number;
  averagePlacement: number;
  averageScore: number;
  gamesPlayed: number;
  groupId: string;
  styleCode: string;
  winRate: number;
  wins: number;
};

export type PlayerStylePerformanceRow = GroupStylePerformanceRow & {
  playerId: string;
  playerName: string;
};

export type GroupInteractionRow = {
  averagePlacement: number;
  averageScore: number;
  gamesPlayed: number;
  groupId: string;
  interactionType: 'corporation_prelude_pair' | 'map_expansion_mix';
  label: string;
  winRate: number;
  wins: number;
};

export type PlayerInteractionRow = GroupInteractionRow & {
  playerId: string;
  playerName: string;
};

export type GroupHeadToHeadRow = {
  averagePlacementEdge: number;
  averageScoreDifferential: number;
  gamesPlayed: number;
  groupId: string;
  leftPlayerId: string;
  leftPlayerName: string;
  leftWins: number;
  rightPlayerId: string;
  rightPlayerName: string;
  rightWins: number;
  ties: number;
};

export type ProfileHeadToHeadRow = {
  averagePlacementEdge: number;
  averageScoreDifferential: number;
  gamesPlayed: number;
  losses: number;
  opponentName: string;
  ties: number;
  wins: number;
};

export type LineupEffectRow = {
  averageGenerationCount: number;
  averagePlacement: number;
  averageScore: number;
  gamesPlayed: number;
  groupId: string;
  lineupLabel: string;
  playerId: string;
  playerName: string;
  winRate: number;
};

export type StyleAgreementRow = {
  averageInferredConfidence: number | null;
  comparedGames: number;
  exactMatchRate: number;
  groupId: string;
  mismatchRate: number;
  partialMatchRate: number;
  playerId: string;
  playerName: string;
};

export type CoverageRow = {
  animalCoverage: number;
  cardBreakdownCoverage: number;
  declaredStyleCoverage: number;
  finalizedGames: number;
  finalizedPlayerResults: number;
  groupId: string;
  jovianCoverage: number;
  keyCardCoverage: number;
  microbeCoverage: number;
  playerId?: string;
  playerName?: string;
};

export type PlayerEfficiencySummary = {
  averageAwardRoi: number;
  averageExpectedScore: number | null;
  averageLossGap: number | null;
  averageNormalizedEfficiency: number | null;
  averagePlacement: number;
  averagePointsPerGeneration: number;
  averageScore: number;
  averageScoreDeltaVsExpected: number | null;
  averageWinMargin: number | null;
  awardScoreShare: number;
  bestScoreSource: string | null;
  bestTagLane: string | null;
  cardScoreShare: number;
  citiesScoreShare: number;
  closeGameCount: number;
  closeGameWins: number;
  closeGameWinRate: number;
  gamesPlayed: number;
  greeneryScoreShare: number;
  groupId: string;
  milestoneScoreShare: number;
  playerId: string;
  tagEvidenceCoverage: number;
  trScoreShare: number;
  winRate: number;
  wins: number;
};

export type PlayerMapMetricRow = {
  averageGenerations: number;
  averageNormalizedEfficiency: number | null;
  averagePoints: number;
  averagePointsPerGeneration: number;
  averageScoreDeltaVsExpected: number | null;
  bestScoreSourceOnMap: string | null;
  bestTagLaneOnMap: string | null;
  gamesPlayed: number;
  groupId: string;
  mapId: string;
  mapName: string | null;
  mapRankForPlayer: number | null;
  playerId: string;
  winRate: number;
  wins: number;
};

export type GlobalMapMetricRow = {
  averageGenerations: number;
  averageNormalizedEfficiency: number | null;
  averagePoints: number;
  averagePointsPerGeneration: number;
  bestTagLane: string | null;
  expectedScoreBaseline: number | null;
  gamesPlayed: number;
  highestEfficiencyStyleCode: string | null;
  highestWinRateCorporationId: string | null;
  mapId: string;
  mapName: string | null;
  playerCount: number;
};

export type ProfileAnalytics = {
  coverage: CoverageRow | null;
  efficiencySummary: PlayerEfficiencySummary | null;
  headToHeadRows: ProfileHeadToHeadRow[];
  mapMetricRows: PlayerMapMetricRow[];
  performance: LeaderboardRow | null;
  playerId: string;
  playerName: string;
  scoreAverages: ScoreSourceAverages | null;
  styleAgreement: StyleAgreementRow | null;
};

export type GroupAnalytics = {
  coverage: CoverageRow | null;
  globalMapMetricRows: GlobalMapMetricRow[];
  groupStylePerformanceRows: GroupStylePerformanceRow[];
  groupInteractionRows: GroupInteractionRow[];
  headToHeadRows: GroupHeadToHeadRow[];
  leaderboardRows: LeaderboardRow[];
  lineupEffectRows: LineupEffectRow[];
  playerCoverages: CoverageRow[];
  playerEfficiencySummaries: PlayerEfficiencySummary[];
  playerInteractionRows: PlayerInteractionRow[];
  playerMapMetricRows: PlayerMapMetricRow[];
  playerScoreAverages: PlayerScoreSourceAverages[];
  playerStylePerformanceRows: PlayerStylePerformanceRow[];
  playerTrendRows: TrendRow[];
  scoreAverages: ScoreSourceAverages | null;
  styleAgreementRows: StyleAgreementRow[];
};

export type TrendRow = {
  gameId: string;
  generationCount: number;
  groupId: string;
  inferredPrimaryStyleCode: string | null;
  isWinner: boolean;
  placement: number;
  playedOn: string;
  playerId: string;
  playerName: string;
  totalPoints: number;
};

type AnalyticsSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type RawLeaderboardRow = {
  average_loss_gap: number | string | null;
  average_placement: number | string;
  average_score: number | string;
  average_win_margin: number | string | null;
  differential_component: number | string;
  games_played: number;
  group_id: string;
  placement_component: number | string;
  player_id: string;
  player_name: string;
  weighted_score: number | string;
  win_rate: number | string;
  win_rate_component: number | string;
  wins: number;
};

type RawScoreSourceAveragesRow = {
  average_animal_points: number | string;
  average_award_points: number | string;
  average_card_points: number | string;
  average_cities_points: number | string;
  average_greenery_points: number | string;
  average_jovian_points: number | string;
  average_microbe_points: number | string;
  average_milestone_points: number | string;
  average_other_card_points: number | string;
  average_tr_points: number | string;
};

type RawPlayerScoreSourceAveragesRow = RawScoreSourceAveragesRow & {
  group_id: string;
  player_id: string;
  player_name: string;
};

type RawHeadToHeadRow = {
  average_placement_edge: number | string;
  average_score_differential: number | string;
  games_played: number;
  group_id: string;
  left_player_id: string;
  left_player_name: string;
  left_wins: number;
  right_player_id: string;
  right_player_name: string;
  right_wins: number;
  ties: number;
};

type RawGroupStylePerformanceRow = {
  average_generation_count: number | string;
  average_placement: number | string;
  average_score: number | string;
  games_played: number;
  group_id: string;
  style_code: string;
  win_rate: number | string;
  wins: number;
};

type RawPlayerStylePerformanceRow = RawGroupStylePerformanceRow & {
  player_id: string;
  player_name: string;
};

type RawGroupInteractionRow = {
  average_placement: number | string;
  average_score: number | string;
  games_played: number;
  group_id: string;
  interaction_type: 'corporation_prelude_pair' | 'map_expansion_mix';
  label: string;
  win_rate: number | string;
  wins: number;
};

type RawPlayerInteractionRow = RawGroupInteractionRow & {
  player_id: string;
  player_name: string;
};

type RawLineupEffectRow = {
  average_generation_count: number | string;
  average_placement: number | string;
  average_score: number | string;
  games_played: number;
  group_id: string;
  lineup_label: string | null;
  player_id: string;
  player_name: string;
  win_rate: number | string;
};

type RawStyleAgreementRow = {
  average_inferred_confidence: number | string | null;
  compared_games: number;
  exact_match_rate: number | string;
  group_id: string;
  mismatch_rate: number | string;
  partial_match_rate: number | string;
  player_id: string;
  player_name: string;
};

type RawCoverageRow = {
  animal_coverage: number | string;
  card_breakdown_coverage: number | string;
  declared_style_coverage: number | string;
  finalized_games: number;
  finalized_player_results: number;
  group_id: string;
  jovian_coverage: number | string;
  key_card_coverage: number | string;
  microbe_coverage: number | string;
  player_id?: string;
  player_name?: string;
};

export type RawPlayerEfficiencySummaryRow = {
  average_award_roi: number | string;
  average_expected_score: number | string | null;
  average_loss_gap: number | string | null;
  average_normalized_efficiency: number | string | null;
  average_placement: number | string;
  average_points_per_generation: number | string;
  average_score: number | string;
  average_score_delta_vs_expected: number | string | null;
  average_win_margin: number | string | null;
  award_score_share: number | string;
  best_score_source: string | null;
  best_tag_lane: string | null;
  card_score_share: number | string;
  cities_score_share: number | string;
  close_game_count: number | string;
  close_game_wins: number | string;
  close_game_win_rate: number | string;
  games_played: number | string;
  greenery_score_share: number | string;
  group_id: string;
  milestone_score_share: number | string;
  player_id: string;
  tag_evidence_coverage: number | string;
  tr_score_share: number | string;
  win_rate: number | string;
  wins: number | string;
};

export type RawPlayerMapMetricRow = {
  average_generations: number | string;
  average_normalized_efficiency: number | string | null;
  average_points: number | string;
  average_points_per_generation: number | string;
  average_score_delta_vs_expected: number | string | null;
  best_score_source_on_map: string | null;
  best_tag_lane_on_map: string | null;
  games_played: number | string;
  group_id: string;
  map_id: string;
  map_rank_for_player: number | string | null;
  maps: { name: string | null } | { name: string | null }[] | null;
  player_id: string;
  win_rate: number | string;
  wins: number | string;
};

export type RawGlobalMapMetricRow = {
  average_generations: number | string;
  average_normalized_efficiency: number | string | null;
  average_points: number | string;
  average_points_per_generation: number | string;
  best_tag_lane: string | null;
  expected_score_baseline: number | string | null;
  games_played: number | string;
  highest_efficiency_style_code: string | null;
  highest_win_rate_corporation_id: string | null;
  map_id: string;
  maps?: { name: string | null } | { name: string | null }[] | null;
  player_count: number | string;
};

type RawTrendRow = {
  game_id: string;
  generation_count: number | string;
  group_id: string;
  inferred_primary_style_code: string | null;
  is_winner: boolean;
  placement: number | string;
  played_on: string;
  player_id: string;
  player_name: string;
  total_points: number | string;
};

type RawProfileGameResultRow = {
  award_points: number | string;
  card_points_animals: number | string | null;
  card_points_jovian: number | string | null;
  card_points_microbes: number | string | null;
  card_points_total: number | string;
  cities_points: number | string;
  declared_modifier_style_codes: string[] | null;
  declared_primary_style_code: null | string;
  game_id: string;
  greenery_points: number | string;
  group_id: string;
  has_full_card_breakdown: boolean;
  inferred_primary_style_code: null | string;
  inferred_style_confidence: number | string | null;
  is_winner: boolean;
  key_card_count: number | string;
  loss_gap_points: number | string | null;
  milestone_points: number | string;
  other_card_points: number | string | null;
  placement: number | string;
  placement_score: number | string;
  player_id: string;
  player_name: string;
  signed_differential_points: number | string;
  total_points: number | string;
  tr_points: number | string;
  win_differential_points: number | string | null;
};

type ProfileGameResultRow = {
  awardPoints: number;
  cardPointsAnimals: null | number;
  cardPointsJovian: null | number;
  cardPointsMicrobes: null | number;
  cardPointsTotal: number;
  citiesPoints: number;
  declaredModifierStyleCodes: string[];
  declaredPrimaryStyleCode: null | string;
  gameId: string;
  greeneryPoints: number;
  groupId: string;
  hasFullCardBreakdown: boolean;
  inferredPrimaryStyleCode: null | string;
  inferredStyleConfidence: null | number;
  isWinner: boolean;
  keyCardCount: number;
  lossGapPoints: null | number;
  milestonePoints: number;
  otherCardPoints: null | number;
  placement: number;
  placementScore: number;
  playerId: string;
  playerName: string;
  signedDifferentialPoints: number;
  totalPoints: number;
  trPoints: number;
  winDifferentialPoints: null | number;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toNullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return toNumber(value);
}

function roundNumber(value: number, digits: number) {
  return Number(value.toFixed(digits));
}

function averageNumbers(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weightedAverage(entries: Array<{ value: number; weight: number }>) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);

  if (totalWeight <= 0) {
    return null;
  }

  const weightedTotal = entries.reduce(
    (sum, entry) => sum + entry.value * entry.weight,
    0,
  );

  return weightedTotal / totalWeight;
}

function getWeightedScore(row: Record<string, unknown>) {
  return toNumber(
    typeof row.weighted_score !== 'undefined'
      ? (row.weighted_score as number | string | null | undefined)
      : (row.weightedScore as number | string | null | undefined),
  );
}

function getAnalyticsClient(supabase: AnalyticsSupabaseClient) {
  return supabase.schema('analytics');
}

function mapLeaderboardRow(row: RawLeaderboardRow): LeaderboardRow {
  return {
    groupId: row.group_id,
    playerId: row.player_id,
    playerName: row.player_name,
    gamesPlayed: row.games_played,
    wins: row.wins,
    winRate: toNumber(row.win_rate),
    averagePlacement: toNumber(row.average_placement),
    averageScore: toNumber(row.average_score),
    averageWinMargin: toNullableNumber(row.average_win_margin),
    averageLossGap: toNullableNumber(row.average_loss_gap),
    winRateComponent: toNumber(row.win_rate_component),
    placementComponent: toNumber(row.placement_component),
    differentialComponent: toNumber(row.differential_component),
    weightedScore: toNumber(row.weighted_score),
  };
}

function mapScoreSourceAverages(row: RawScoreSourceAveragesRow): ScoreSourceAverages {
  return {
    averageCitiesPoints: toNumber(row.average_cities_points),
    averageGreeneryPoints: toNumber(row.average_greenery_points),
    averageCardPoints: toNumber(row.average_card_points),
    averageMicrobePoints: toNumber(row.average_microbe_points),
    averageAnimalPoints: toNumber(row.average_animal_points),
    averageJovianPoints: toNumber(row.average_jovian_points),
    averageOtherCardPoints: toNumber(row.average_other_card_points),
    averageTrPoints: toNumber(row.average_tr_points),
    averageMilestonePoints: toNumber(row.average_milestone_points),
    averageAwardPoints: toNumber(row.average_award_points),
  };
}

function mapPlayerScoreSourceAveragesRow(
  row: RawPlayerScoreSourceAveragesRow,
): PlayerScoreSourceAverages {
  return {
    groupId: row.group_id,
    playerId: row.player_id,
    playerName: row.player_name,
    ...mapScoreSourceAverages(row),
  };
}

function mapHeadToHeadRow(row: RawHeadToHeadRow): GroupHeadToHeadRow {
  return {
    groupId: row.group_id,
    leftPlayerId: row.left_player_id,
    leftPlayerName: row.left_player_name,
    rightPlayerId: row.right_player_id,
    rightPlayerName: row.right_player_name,
    gamesPlayed: row.games_played,
    leftWins: row.left_wins,
    rightWins: row.right_wins,
    ties: row.ties,
    averageScoreDifferential: toNumber(row.average_score_differential),
    averagePlacementEdge: toNumber(row.average_placement_edge),
  };
}

function mapGroupStylePerformanceRow(
  row: RawGroupStylePerformanceRow,
): GroupStylePerformanceRow {
  return {
    groupId: row.group_id,
    styleCode: row.style_code,
    gamesPlayed: row.games_played,
    wins: row.wins,
    winRate: toNumber(row.win_rate),
    averagePlacement: toNumber(row.average_placement),
    averageScore: toNumber(row.average_score),
    averageGenerationCount: toNumber(row.average_generation_count),
  };
}

function mapPlayerStylePerformanceRow(
  row: RawPlayerStylePerformanceRow,
): PlayerStylePerformanceRow {
  return {
    ...mapGroupStylePerformanceRow(row),
    playerId: row.player_id,
    playerName: row.player_name,
  };
}

function mapGroupInteractionRow(row: RawGroupInteractionRow): GroupInteractionRow {
  return {
    groupId: row.group_id,
    interactionType: row.interaction_type,
    label: row.label,
    gamesPlayed: row.games_played,
    wins: row.wins,
    winRate: toNumber(row.win_rate),
    averagePlacement: toNumber(row.average_placement),
    averageScore: toNumber(row.average_score),
  };
}

function mapPlayerInteractionRow(
  row: RawPlayerInteractionRow,
): PlayerInteractionRow {
  return {
    ...mapGroupInteractionRow(row),
    playerId: row.player_id,
    playerName: row.player_name,
  };
}

function mapLineupEffectRow(row: RawLineupEffectRow): LineupEffectRow {
  return {
    groupId: row.group_id,
    playerId: row.player_id,
    playerName: row.player_name,
    lineupLabel: row.lineup_label ?? 'Solo setup',
    gamesPlayed: row.games_played,
    winRate: toNumber(row.win_rate),
    averagePlacement: toNumber(row.average_placement),
    averageScore: toNumber(row.average_score),
    averageGenerationCount: toNumber(row.average_generation_count),
  };
}

function mapStyleAgreementRow(row: RawStyleAgreementRow): StyleAgreementRow {
  return {
    groupId: row.group_id,
    playerId: row.player_id,
    playerName: row.player_name,
    comparedGames: row.compared_games,
    exactMatchRate: toNumber(row.exact_match_rate),
    partialMatchRate: toNumber(row.partial_match_rate),
    mismatchRate: toNumber(row.mismatch_rate),
    averageInferredConfidence: toNullableNumber(row.average_inferred_confidence),
  };
}

function mapCoverageRow(row: RawCoverageRow): CoverageRow {
  return {
    groupId: row.group_id,
    playerId: row.player_id,
    playerName: row.player_name,
    finalizedGames: row.finalized_games,
    finalizedPlayerResults: row.finalized_player_results,
    microbeCoverage: toNumber(row.microbe_coverage),
    animalCoverage: toNumber(row.animal_coverage),
    jovianCoverage: toNumber(row.jovian_coverage),
    cardBreakdownCoverage: toNumber(row.card_breakdown_coverage),
    declaredStyleCoverage: toNumber(row.declared_style_coverage),
    keyCardCoverage: toNumber(row.key_card_coverage),
  };
}

export function mapPlayerEfficiencySummary(
  row: RawPlayerEfficiencySummaryRow,
): PlayerEfficiencySummary {
  return {
    groupId: row.group_id,
    playerId: row.player_id,
    gamesPlayed: toNumber(row.games_played),
    wins: toNumber(row.wins),
    winRate: toNumber(row.win_rate),
    averageScore: toNumber(row.average_score),
    averagePlacement: toNumber(row.average_placement),
    averagePointsPerGeneration: toNumber(row.average_points_per_generation),
    averageNormalizedEfficiency: toNullableNumber(row.average_normalized_efficiency),
    averageExpectedScore: toNullableNumber(row.average_expected_score),
    averageScoreDeltaVsExpected: toNullableNumber(row.average_score_delta_vs_expected),
    averageWinMargin: toNullableNumber(row.average_win_margin),
    averageLossGap: toNullableNumber(row.average_loss_gap),
    closeGameCount: toNumber(row.close_game_count),
    closeGameWins: toNumber(row.close_game_wins),
    closeGameWinRate: toNumber(row.close_game_win_rate),
    bestScoreSource: row.best_score_source,
    trScoreShare: toNumber(row.tr_score_share),
    cardScoreShare: toNumber(row.card_score_share),
    citiesScoreShare: toNumber(row.cities_score_share),
    greeneryScoreShare: toNumber(row.greenery_score_share),
    milestoneScoreShare: toNumber(row.milestone_score_share),
    awardScoreShare: toNumber(row.award_score_share),
    bestTagLane: row.best_tag_lane,
    tagEvidenceCoverage: toNumber(row.tag_evidence_coverage),
    averageAwardRoi: toNumber(row.average_award_roi),
  };
}

export function mapPlayerMapMetricRow(
  row: RawPlayerMapMetricRow,
): PlayerMapMetricRow {
  const mapRelation = Array.isArray(row.maps) ? row.maps[0] : row.maps;

  return {
    groupId: row.group_id,
    playerId: row.player_id,
    mapId: row.map_id,
    mapName: mapRelation?.name ?? null,
    gamesPlayed: toNumber(row.games_played),
    wins: toNumber(row.wins),
    winRate: toNumber(row.win_rate),
    averagePoints: toNumber(row.average_points),
    averageGenerations: toNumber(row.average_generations),
    averagePointsPerGeneration: toNumber(row.average_points_per_generation),
    averageNormalizedEfficiency: toNullableNumber(row.average_normalized_efficiency),
    averageScoreDeltaVsExpected: toNullableNumber(row.average_score_delta_vs_expected),
    bestScoreSourceOnMap: row.best_score_source_on_map,
    bestTagLaneOnMap: row.best_tag_lane_on_map,
    mapRankForPlayer: toNullableNumber(row.map_rank_for_player),
  };
}

export function mapGlobalMapMetricRow(row: RawGlobalMapMetricRow): GlobalMapMetricRow {
  const mapRelation = Array.isArray(row.maps) ? row.maps[0] : row.maps;

  return {
    mapId: row.map_id,
    mapName: mapRelation?.name ?? null,
    playerCount: toNumber(row.player_count),
    gamesPlayed: toNumber(row.games_played),
    averagePoints: toNumber(row.average_points),
    averageGenerations: toNumber(row.average_generations),
    averagePointsPerGeneration: toNumber(row.average_points_per_generation),
    averageNormalizedEfficiency: toNullableNumber(row.average_normalized_efficiency),
    expectedScoreBaseline: toNullableNumber(row.expected_score_baseline),
    highestWinRateCorporationId: row.highest_win_rate_corporation_id,
    highestEfficiencyStyleCode: row.highest_efficiency_style_code,
    bestTagLane: row.best_tag_lane,
  };
}

function mapTrendRow(row: RawTrendRow): TrendRow {
  return {
    groupId: row.group_id,
    gameId: row.game_id,
    playedOn: row.played_on,
    playerId: row.player_id,
    playerName: row.player_name,
    placement: toNumber(row.placement),
    isWinner: row.is_winner,
    totalPoints: toNumber(row.total_points),
    generationCount: toNumber(row.generation_count),
    inferredPrimaryStyleCode: row.inferred_primary_style_code,
  };
}

function mapProfileGameResultRow(row: RawProfileGameResultRow): ProfileGameResultRow {
  return {
    gameId: row.game_id,
    groupId: row.group_id,
    playerId: row.player_id,
    playerName: row.player_name,
    placement: toNumber(row.placement),
    isWinner: row.is_winner,
    totalPoints: toNumber(row.total_points),
    citiesPoints: toNumber(row.cities_points),
    greeneryPoints: toNumber(row.greenery_points),
    cardPointsTotal: toNumber(row.card_points_total),
    cardPointsMicrobes: toNullableNumber(row.card_points_microbes),
    cardPointsAnimals: toNullableNumber(row.card_points_animals),
    cardPointsJovian: toNullableNumber(row.card_points_jovian),
    otherCardPoints: toNullableNumber(row.other_card_points),
    trPoints: toNumber(row.tr_points),
    milestonePoints: toNumber(row.milestone_points),
    awardPoints: toNumber(row.award_points),
    hasFullCardBreakdown: row.has_full_card_breakdown,
    declaredPrimaryStyleCode: row.declared_primary_style_code,
    declaredModifierStyleCodes: row.declared_modifier_style_codes ?? [],
    inferredPrimaryStyleCode: row.inferred_primary_style_code,
    inferredStyleConfidence: toNullableNumber(row.inferred_style_confidence),
    keyCardCount: toNumber(row.key_card_count),
    winDifferentialPoints: toNullableNumber(row.win_differential_points),
    lossGapPoints: toNullableNumber(row.loss_gap_points),
    signedDifferentialPoints: toNumber(row.signed_differential_points),
    placementScore: toNumber(row.placement_score),
  };
}

function normalizeProfileHeadToHeadRow(
  playerId: string,
  row: GroupHeadToHeadRow,
): ProfileHeadToHeadRow | null {
  if (row.leftPlayerId === playerId) {
    return {
      opponentName: row.rightPlayerName,
      gamesPlayed: row.gamesPlayed,
      wins: row.leftWins,
      losses: row.rightWins,
      ties: row.ties,
      averageScoreDifferential: row.averageScoreDifferential,
      averagePlacementEdge: row.averagePlacementEdge,
    };
  }

  if (row.rightPlayerId === playerId) {
    return {
      opponentName: row.leftPlayerName,
      gamesPlayed: row.gamesPlayed,
      wins: row.rightWins,
      losses: row.leftWins,
      ties: row.ties,
      averageScoreDifferential: row.averageScoreDifferential * -1,
      averagePlacementEdge: row.averagePlacementEdge * -1,
    };
  }

  return null;
}

async function getLinkedPlayer(groupId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('players')
    .select('id, display_name')
    .eq('group_id', groupId)
    .eq('linked_user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function resolveProfileLabel(
  linkedPlayers: Array<{ display_name: string }>,
  fallbackPlayerName: string | null,
) {
  if (fallbackPlayerName) {
    return fallbackPlayerName;
  }

  const uniqueNames = [
    ...new Set(linkedPlayers.map((player) => player.display_name.trim()).filter(Boolean)),
  ];

  if (uniqueNames.length === 1) {
    return uniqueNames[0] ?? 'My Profile';
  }

  return 'Your linked profiles';
}

function buildProfileAnalyticsFromRows(input: {
  efficiencySummary: PlayerEfficiencySummary | null;
  linkedPlayers: Array<{ id: string; display_name: string }>;
  mapMetricRows: PlayerMapMetricRow[];
  ownRows: ProfileGameResultRow[];
  sharedRows: ProfileGameResultRow[];
}) {
  const ownPlayerIds = new Set(input.linkedPlayers.map((player) => player.id));
  const profileGroupId =
    input.ownRows.length === 1
      ? input.ownRows[0]?.groupId ?? 'linked-profile'
      : 'linked-profile';
  const primaryPlayerId = input.linkedPlayers[0]?.id ?? 'linked-profile';
  const playerName = resolveProfileLabel(
    input.linkedPlayers,
    input.ownRows[0]?.playerName ?? null,
  );

  if (input.ownRows.length === 0) {
    return {
      playerId: primaryPlayerId,
      playerName,
      performance: null,
      scoreAverages: null,
      styleAgreement: null,
      coverage: null,
      headToHeadRows: [],
      efficiencySummary: input.efficiencySummary,
      mapMetricRows: input.mapMetricRows,
    } satisfies ProfileAnalytics;
  }

  const gamesPlayed = input.ownRows.length;
  const wins = input.ownRows.filter((row) => row.isWinner).length;
  const winRate = wins / gamesPlayed;
  const averagePlacement = averageNumbers(input.ownRows.map((row) => row.placement)) ?? 0;
  const averageScore = averageNumbers(input.ownRows.map((row) => row.totalPoints)) ?? 0;
  const averageWinMargin = averageNumbers(
    input.ownRows
      .map((row) => row.winDifferentialPoints)
      .filter((value): value is number => value !== null),
  );
  const averageLossGap = averageNumbers(
    input.ownRows
      .map((row) => row.lossGapPoints)
      .filter((value): value is number => value !== null),
  );
  const averagePlacementScore =
    averageNumbers(input.ownRows.map((row) => row.placementScore)) ?? 0;
  const averageSignedDifferential =
    averageNumbers(input.ownRows.map((row) => row.signedDifferentialPoints)) ?? 0;
  const winRateComponent = roundNumber(winRate * 0.5, 4);
  const placementComponent = roundNumber(averagePlacementScore * 0.3, 4);
  const differentialComponent = roundNumber(
    Math.max(Math.min(averageSignedDifferential / 20, 1), -1) * 0.2,
    4,
  );

  const scoreAverages = {
    averageCitiesPoints:
      roundNumber(averageNumbers(input.ownRows.map((row) => row.citiesPoints)) ?? 0, 3),
    averageGreeneryPoints:
      roundNumber(averageNumbers(input.ownRows.map((row) => row.greeneryPoints)) ?? 0, 3),
    averageCardPoints:
      roundNumber(averageNumbers(input.ownRows.map((row) => row.cardPointsTotal)) ?? 0, 3),
    averageMicrobePoints: roundNumber(
      averageNumbers(input.ownRows.map((row) => row.cardPointsMicrobes ?? 0)) ?? 0,
      3,
    ),
    averageAnimalPoints: roundNumber(
      averageNumbers(input.ownRows.map((row) => row.cardPointsAnimals ?? 0)) ?? 0,
      3,
    ),
    averageJovianPoints: roundNumber(
      averageNumbers(input.ownRows.map((row) => row.cardPointsJovian ?? 0)) ?? 0,
      3,
    ),
    averageOtherCardPoints: roundNumber(
      averageNumbers(input.ownRows.map((row) => row.otherCardPoints ?? 0)) ?? 0,
      3,
    ),
    averageTrPoints:
      roundNumber(averageNumbers(input.ownRows.map((row) => row.trPoints)) ?? 0, 3),
    averageMilestonePoints: roundNumber(
      averageNumbers(input.ownRows.map((row) => row.milestonePoints)) ?? 0,
      3,
    ),
    averageAwardPoints: roundNumber(
      averageNumbers(input.ownRows.map((row) => row.awardPoints)) ?? 0,
      3,
    ),
  } satisfies ScoreSourceAverages;

  const comparedStyleRows = input.ownRows.filter(
    (row) =>
      row.declaredPrimaryStyleCode !== null &&
      row.inferredPrimaryStyleCode !== null,
  );
  const exactMatchGames = comparedStyleRows.filter(
    (row) => row.declaredPrimaryStyleCode === row.inferredPrimaryStyleCode,
  ).length;
  const partialMatchGames = comparedStyleRows.filter(
    (row) =>
      row.declaredPrimaryStyleCode !== row.inferredPrimaryStyleCode &&
      row.inferredPrimaryStyleCode !== null &&
      row.declaredModifierStyleCodes.includes(row.inferredPrimaryStyleCode),
  ).length;
  const mismatchGames =
    comparedStyleRows.length - exactMatchGames - partialMatchGames;
  const styleAgreement =
    comparedStyleRows.length > 0
      ? {
          groupId: profileGroupId,
          playerId: primaryPlayerId,
          playerName,
          comparedGames: comparedStyleRows.length,
          exactMatchRate: roundNumber(
            exactMatchGames / comparedStyleRows.length,
            4,
          ),
          partialMatchRate: roundNumber(
            partialMatchGames / comparedStyleRows.length,
            4,
          ),
          mismatchRate: roundNumber(
            mismatchGames / comparedStyleRows.length,
            4,
          ),
          averageInferredConfidence: toNullableNumber(
            averageNumbers(
              comparedStyleRows
                .map((row) => row.inferredStyleConfidence)
                .filter((value): value is number => value !== null),
            ),
          ),
        }
      : null;

  const coverage = {
    groupId: profileGroupId,
    playerId: primaryPlayerId,
    playerName,
    finalizedGames: gamesPlayed,
    finalizedPlayerResults: gamesPlayed,
    microbeCoverage: roundNumber(
      averageNumbers(
        input.ownRows.map((row) => Number(row.cardPointsMicrobes !== null)),
      ) ?? 0,
      4,
    ),
    animalCoverage: roundNumber(
      averageNumbers(
        input.ownRows.map((row) => Number(row.cardPointsAnimals !== null)),
      ) ?? 0,
      4,
    ),
    jovianCoverage: roundNumber(
      averageNumbers(
        input.ownRows.map((row) => Number(row.cardPointsJovian !== null)),
      ) ?? 0,
      4,
    ),
    cardBreakdownCoverage: roundNumber(
      averageNumbers(
        input.ownRows.map((row) => Number(row.hasFullCardBreakdown)),
      ) ?? 0,
      4,
    ),
    declaredStyleCoverage: roundNumber(
      averageNumbers(
        input.ownRows.map((row) => Number(row.declaredPrimaryStyleCode !== null)),
      ) ?? 0,
      4,
    ),
    keyCardCoverage: roundNumber(
      averageNumbers(
        input.ownRows.map((row) => Number(row.keyCardCount > 0)),
      ) ?? 0,
      4,
    ),
  } satisfies CoverageRow;

  const sharedRowsByGameId = new Map<string, ProfileGameResultRow[]>();

  for (const row of input.sharedRows) {
    const existingRows = sharedRowsByGameId.get(row.gameId) ?? [];
    existingRows.push(row);
    sharedRowsByGameId.set(row.gameId, existingRows);
  }

  const headToHeadByOpponent = new Map<
    string,
    {
      averagePlacementEntries: Array<{ value: number; weight: number }>;
      averageScoreEntries: Array<{ value: number; weight: number }>;
      gamesPlayed: number;
      losses: number;
      opponentName: string;
      ties: number;
      wins: number;
    }
  >();

  for (const ownRow of input.ownRows) {
    const gameRows = sharedRowsByGameId.get(ownRow.gameId) ?? [];

    for (const opponentRow of gameRows) {
      if (ownPlayerIds.has(opponentRow.playerId)) {
        continue;
      }

      const current = headToHeadByOpponent.get(opponentRow.playerId) ?? {
        averagePlacementEntries: [],
        averageScoreEntries: [],
        gamesPlayed: 0,
        losses: 0,
        opponentName: opponentRow.playerName,
        ties: 0,
        wins: 0,
      };

      current.gamesPlayed += 1;
      current.averageScoreEntries.push({
        value: ownRow.totalPoints - opponentRow.totalPoints,
        weight: 1,
      });
      current.averagePlacementEntries.push({
        value: opponentRow.placement - ownRow.placement,
        weight: 1,
      });

      if (ownRow.placement < opponentRow.placement) {
        current.wins += 1;
      } else if (ownRow.placement > opponentRow.placement) {
        current.losses += 1;
      } else {
        current.ties += 1;
      }

      headToHeadByOpponent.set(opponentRow.playerId, current);
    }
  }

  const headToHeadRows = [...headToHeadByOpponent.values()]
    .map((row) => ({
      opponentName: row.opponentName,
      gamesPlayed: row.gamesPlayed,
      wins: row.wins,
      losses: row.losses,
      ties: row.ties,
      averageScoreDifferential: roundNumber(
        weightedAverage(row.averageScoreEntries) ?? 0,
        3,
      ),
      averagePlacementEdge: roundNumber(
        weightedAverage(row.averagePlacementEntries) ?? 0,
        3,
      ),
    }))
    .sort(
      (left, right) =>
        right.gamesPlayed - left.gamesPlayed ||
        right.wins - left.wins ||
        left.opponentName.localeCompare(right.opponentName),
    );

  return {
    playerId: primaryPlayerId,
    playerName,
    performance: {
      groupId: profileGroupId,
      playerId: primaryPlayerId,
      playerName,
      gamesPlayed,
      wins,
      winRate: roundNumber(winRate, 4),
      averagePlacement: roundNumber(averagePlacement, 3),
      averageScore: roundNumber(averageScore, 3),
      averageWinMargin:
        averageWinMargin === null ? null : roundNumber(averageWinMargin, 3),
      averageLossGap:
        averageLossGap === null ? null : roundNumber(averageLossGap, 3),
      winRateComponent,
      placementComponent,
      differentialComponent,
      weightedScore: roundNumber(
        winRateComponent + placementComponent + differentialComponent,
        4,
      ),
    },
    scoreAverages,
    styleAgreement,
    coverage,
    headToHeadRows,
    efficiencySummary: input.efficiencySummary,
    mapMetricRows: input.mapMetricRows,
  } satisfies ProfileAnalytics;
}

export function sortLeaderboardRows<T extends Record<string, unknown>>(rows: T[]) {
  return [...rows].sort((left, right) => getWeightedScore(right) - getWeightedScore(left));
}

export function sortHeadToHeadRows<T extends {
  averageScoreDifferential: number;
  gamesPlayed: number;
  leftPlayerName: string;
}>(rows: T[]) {
  return [...rows].sort(
    (left, right) =>
      right.gamesPlayed - left.gamesPlayed ||
      Math.abs(right.averageScoreDifferential) - Math.abs(left.averageScoreDifferential) ||
      left.leftPlayerName.localeCompare(right.leftPlayerName),
  );
}

export function sortLineupEffectRows<T extends {
  gamesPlayed: number;
  playerName: string;
  winRate: number;
}>(rows: T[]) {
  return [...rows].sort(
    (left, right) =>
      right.gamesPlayed - left.gamesPlayed ||
      right.winRate - left.winRate ||
      left.playerName.localeCompare(right.playerName),
  );
}

export function sortStyleAgreementRows<T extends {
  comparedGames: number;
  exactMatchRate: number;
  playerName: string;
}>(rows: T[]) {
  return [...rows].sort(
    (left, right) =>
      right.exactMatchRate - left.exactMatchRate ||
      right.comparedGames - left.comparedGames ||
      left.playerName.localeCompare(right.playerName),
  );
}

export function sortStylePerformanceRows<T extends {
  averagePlacement: number;
  gamesPlayed: number;
  styleCode: string;
  winRate: number;
}>(rows: T[]) {
  return [...rows].sort(
    (left, right) =>
      right.winRate - left.winRate ||
      right.gamesPlayed - left.gamesPlayed ||
      left.averagePlacement - right.averagePlacement ||
      left.styleCode.localeCompare(right.styleCode),
  );
}

export function sortInteractionRows<T extends {
  averagePlacement: number;
  gamesPlayed: number;
  label: string;
  winRate: number;
}>(rows: T[]) {
  return [...rows].sort(
    (left, right) =>
      right.winRate - left.winRate ||
      right.gamesPlayed - left.gamesPlayed ||
      left.averagePlacement - right.averagePlacement ||
      left.label.localeCompare(right.label),
  );
}

export function sortTrendRows<T extends { playedOn: string; playerName: string }>(rows: T[]) {
  return [...rows].sort(
    (left, right) =>
      left.playedOn.localeCompare(right.playedOn) ||
      left.playerName.localeCompare(right.playerName),
  );
}

export function sortPlayerEfficiencySummaries<T extends {
  averagePointsPerGeneration: number;
  gamesPlayed: number;
  groupId: string;
  playerId: string;
}>(rows: T[]) {
  return [...rows].sort(
    (left, right) =>
      right.gamesPlayed - left.gamesPlayed ||
      right.averagePointsPerGeneration - left.averagePointsPerGeneration ||
      left.playerId.localeCompare(right.playerId) ||
      left.groupId.localeCompare(right.groupId),
  );
}

export function sortPlayerMapMetricRows<T extends {
  averagePointsPerGeneration: number;
  gamesPlayed: number;
  mapId: string;
  mapRankForPlayer: number | null;
  playerId: string;
}>(rows: T[]) {
  return [...rows].sort((left, right) => {
    const leftRank = left.mapRankForPlayer ?? Number.POSITIVE_INFINITY;
    const rightRank = right.mapRankForPlayer ?? Number.POSITIVE_INFINITY;

    return (
      leftRank - rightRank ||
      right.gamesPlayed - left.gamesPlayed ||
      right.averagePointsPerGeneration - left.averagePointsPerGeneration ||
      left.playerId.localeCompare(right.playerId) ||
      left.mapId.localeCompare(right.mapId)
    );
  });
}

export function sortGlobalMapMetricRows<T extends {
  averagePointsPerGeneration: number;
  gamesPlayed: number;
  mapId: string;
  playerCount: number;
}>(rows: T[]) {
  return [...rows].sort(
    (left, right) =>
      right.gamesPlayed - left.gamesPlayed ||
      right.averagePointsPerGeneration - left.averagePointsPerGeneration ||
      left.mapId.localeCompare(right.mapId) ||
      left.playerCount - right.playerCount,
  );
}

export function buildScoreSourceEntries(row: ScoreSourceAverages) {
  return [
    { label: 'Terraform Rating', value: row.averageTrPoints },
    { label: 'Card Points', value: row.averageCardPoints },
    { label: 'Other Card', value: row.averageOtherCardPoints },
    { label: 'Greenery', value: row.averageGreeneryPoints },
    { label: 'Cities', value: row.averageCitiesPoints },
    { label: 'Milestones', value: row.averageMilestonePoints },
    { label: 'Awards', value: row.averageAwardPoints },
    { label: 'Jovian', value: row.averageJovianPoints },
    { label: 'Microbe', value: row.averageMicrobePoints },
    { label: 'Animal', value: row.averageAnimalPoints },
  ];
}

export async function listGroupLeaderboard(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await getAnalyticsClient(supabase)
    .from('group_leaderboard')
    .select('*')
    .eq('group_id', groupId);

  if (error) {
    throw error;
  }

  return sortLeaderboardRows((data as RawLeaderboardRow[]).map(mapLeaderboardRow));
}

export async function getGroupScoreSourceAverages(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await getAnalyticsClient(supabase)
    .from('group_score_source_averages')
    .select('*')
    .eq('group_id', groupId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapScoreSourceAverages(data as RawScoreSourceAveragesRow) : null;
}

export async function getPlayerScoreSourceAverages(groupId: string, playerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await getAnalyticsClient(supabase)
    .from('player_score_source_averages')
    .select('*')
    .eq('group_id', groupId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapScoreSourceAverages(data as RawScoreSourceAveragesRow) : null;
}

export async function listGroupPlayerScoreAverages(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await getAnalyticsClient(supabase)
    .from('player_score_source_averages')
    .select('*')
    .eq('group_id', groupId);

  if (error) {
    throw error;
  }

  return (data as RawPlayerScoreSourceAveragesRow[])
    .map(mapPlayerScoreSourceAveragesRow)
    .sort((left, right) => left.playerName.localeCompare(right.playerName));
}

export async function listGroupHeadToHead(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await getAnalyticsClient(supabase)
    .from('head_to_head')
    .select('*')
    .eq('group_id', groupId);

  if (error) {
    throw error;
  }

  return sortHeadToHeadRows((data as RawHeadToHeadRow[]).map(mapHeadToHeadRow));
}

export async function listGroupStylePerformance(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await getAnalyticsClient(supabase)
    .from('group_style_performance')
    .select('*')
    .eq('group_id', groupId);

  if (error) {
    throw error;
  }

  return sortStylePerformanceRows(
    (data as RawGroupStylePerformanceRow[]).map(mapGroupStylePerformanceRow),
  );
}

export async function listPlayerStylePerformance(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await getAnalyticsClient(supabase)
    .from('player_style_performance')
    .select('*')
    .eq('group_id', groupId);

  if (error) {
    throw error;
  }

  return sortStylePerformanceRows(
    (data as RawPlayerStylePerformanceRow[]).map(mapPlayerStylePerformanceRow),
  );
}

export async function listGroupInteractions(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await getAnalyticsClient(supabase)
    .from('group_interactions')
    .select('*')
    .eq('group_id', groupId);

  if (error) {
    throw error;
  }

  return sortInteractionRows(
    (data as RawGroupInteractionRow[]).map(mapGroupInteractionRow),
  );
}

export async function listPlayerInteractions(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await getAnalyticsClient(supabase)
    .from('player_interactions')
    .select('*')
    .eq('group_id', groupId);

  if (error) {
    throw error;
  }

  return sortInteractionRows(
    (data as RawPlayerInteractionRow[]).map(mapPlayerInteractionRow),
  );
}

export async function listGroupLineupEffects(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await getAnalyticsClient(supabase)
    .from('lineup_effects')
    .select('*')
    .eq('group_id', groupId);

  if (error) {
    throw error;
  }

  return sortLineupEffectRows((data as RawLineupEffectRow[]).map(mapLineupEffectRow));
}

export async function listPlayerTrendRows(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await getAnalyticsClient(supabase)
    .from('player_trends')
    .select('*')
    .eq('group_id', groupId);

  if (error) {
    throw error;
  }

  return sortTrendRows((data as RawTrendRow[]).map(mapTrendRow));
}

export async function listGroupStyleAgreement(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await getAnalyticsClient(supabase)
    .from('style_agreement')
    .select('*')
    .eq('group_id', groupId)
    .gt('compared_games', 0);

  if (error) {
    throw error;
  }

  return sortStyleAgreementRows(
    (data as RawStyleAgreementRow[]).map(mapStyleAgreementRow),
  );
}

export async function getGroupCoverage(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await getAnalyticsClient(supabase)
    .from('data_coverage')
    .select('*')
    .eq('group_id', groupId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapCoverageRow(data as RawCoverageRow) : null;
}

export async function getPlayerCoverage(groupId: string, playerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await getAnalyticsClient(supabase)
    .from('player_data_coverage')
    .select('*')
    .eq('group_id', groupId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapCoverageRow(data as RawCoverageRow) : null;
}

export async function listGroupPlayerCoverage(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await getAnalyticsClient(supabase)
    .from('player_data_coverage')
    .select('*')
    .eq('group_id', groupId);

  if (error) {
    throw error;
  }

  return (data as RawCoverageRow[])
    .map(mapCoverageRow)
    .sort(
      (left, right) =>
        (left.playerName ?? left.playerId ?? '').localeCompare(
          right.playerName ?? right.playerId ?? '',
        ),
    );
}

const playerEfficiencySummarySelect =
  'average_award_roi, average_expected_score, average_loss_gap, average_normalized_efficiency, average_placement, average_points_per_generation, average_score, average_score_delta_vs_expected, average_win_margin, award_score_share, best_score_source, best_tag_lane, card_score_share, cities_score_share, close_game_count, close_game_wins, close_game_win_rate, games_played, greenery_score_share, group_id, milestone_score_share, player_id, tag_evidence_coverage, tr_score_share, win_rate, wins';

const playerMapMetricSelect =
  'average_generations, average_normalized_efficiency, average_points, average_points_per_generation, average_score_delta_vs_expected, best_score_source_on_map, best_tag_lane_on_map, games_played, group_id, map_id, map_rank_for_player, maps(name), player_id, win_rate, wins';

const globalMapMetricSelect =
  'average_generations, average_normalized_efficiency, average_points, average_points_per_generation, best_tag_lane, expected_score_baseline, games_played, highest_efficiency_style_code, highest_win_rate_corporation_id, map_id, maps(name), player_count';

export async function listPlayerEfficiencySummariesByPlayerIds(playerIds: string[]) {
  if (playerIds.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('player_metric_summaries')
    .select(playerEfficiencySummarySelect)
    .in('player_id', playerIds)
    .order('games_played', { ascending: false })
    .order('average_points_per_generation', { ascending: false })
    .order('player_id', { ascending: true })
    .order('group_id', { ascending: true });

  if (error) {
    throw error;
  }

  return sortPlayerEfficiencySummaries(
    ((data as RawPlayerEfficiencySummaryRow[] | null) ?? []).map(
      mapPlayerEfficiencySummary,
    ),
  );
}

export async function listGroupPlayerEfficiencySummaries(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('player_metric_summaries')
    .select(playerEfficiencySummarySelect)
    .eq('group_id', groupId)
    .order('games_played', { ascending: false })
    .order('average_points_per_generation', { ascending: false })
    .order('player_id', { ascending: true })
    .order('group_id', { ascending: true });

  if (error) {
    throw error;
  }

  return sortPlayerEfficiencySummaries(
    ((data as RawPlayerEfficiencySummaryRow[] | null) ?? []).map(
      mapPlayerEfficiencySummary,
    ),
  );
}

export async function listPlayerMapMetricsByPlayerIds(playerIds: string[]) {
  if (playerIds.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('player_map_metric_summaries')
    .select(playerMapMetricSelect)
    .in('player_id', playerIds)
    .order('map_rank_for_player', { ascending: true })
    .order('games_played', { ascending: false });

  if (error) {
    throw error;
  }

  return sortPlayerMapMetricRows(
    ((data as RawPlayerMapMetricRow[] | null) ?? []).map(mapPlayerMapMetricRow),
  );
}

export async function listGroupPlayerMapMetrics(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('player_map_metric_summaries')
    .select(playerMapMetricSelect)
    .eq('group_id', groupId)
    .order('map_rank_for_player', { ascending: true })
    .order('games_played', { ascending: false });

  if (error) {
    throw error;
  }

  return sortPlayerMapMetricRows(
    ((data as RawPlayerMapMetricRow[] | null) ?? []).map(mapPlayerMapMetricRow),
  );
}

export async function listGlobalMapMetrics() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('global_map_metric_summaries')
    .select(globalMapMetricSelect)
    .order('games_played', { ascending: false })
    .order('average_points_per_generation', { ascending: false });

  if (error) {
    throw error;
  }

  return sortGlobalMapMetricRows(
    ((data as RawGlobalMapMetricRow[] | null) ?? []).map(mapGlobalMapMetricRow),
  );
}

async function getProfilePersistedMetrics(playerIds: string[]) {
  const [efficiencyResult, mapResult] = await Promise.allSettled([
    listPlayerEfficiencySummariesByPlayerIds(playerIds),
    listPlayerMapMetricsByPlayerIds(playerIds),
  ]);

  if (efficiencyResult.status === 'rejected' || mapResult.status === 'rejected') {
    return {
      efficiencyRows: [],
      mapMetricRows: [],
    };
  }

  return {
    efficiencyRows: efficiencyResult.value,
    mapMetricRows: mapResult.value,
  };
}

export async function getProfileAnalytics(groupId: string, userId: string) {
  const linkedPlayer = await getLinkedPlayer(groupId, userId);

  if (!linkedPlayer) {
    return null;
  }

  const linkedPlayers = [linkedPlayer];
  const supabase = await createSupabaseServerClient();
  const linkedPlayerIds = linkedPlayers.map((player) => player.id);
  const { efficiencyRows, mapMetricRows } =
    await getProfilePersistedMetrics(linkedPlayerIds);
  const { data: ownRows, error: ownRowsError } = await getAnalyticsClient(supabase)
    .from('player_game_results')
    .select(
      'award_points, card_points_animals, card_points_jovian, card_points_microbes, card_points_total, cities_points, declared_modifier_style_codes, declared_primary_style_code, game_id, greenery_points, group_id, has_full_card_breakdown, inferred_primary_style_code, inferred_style_confidence, is_winner, key_card_count, loss_gap_points, milestone_points, other_card_points, placement, placement_score, player_id, player_name, signed_differential_points, total_points, tr_points, win_differential_points',
    )
    .eq('group_id', groupId)
    .in('player_id', linkedPlayerIds);

  if (ownRowsError) {
    throw ownRowsError;
  }

  const normalizedOwnRows = ((ownRows as RawProfileGameResultRow[] | null) ?? []).map(
    mapProfileGameResultRow,
  );
  const sharedGameIds = [...new Set(normalizedOwnRows.map((row) => row.gameId))];

  let normalizedSharedRows: ProfileGameResultRow[] = [];

  if (sharedGameIds.length > 0) {
    const { data: sharedRows, error: sharedRowsError } = await getAnalyticsClient(
      supabase,
    )
      .from('player_game_results')
      .select(
        'award_points, card_points_animals, card_points_jovian, card_points_microbes, card_points_total, cities_points, declared_modifier_style_codes, declared_primary_style_code, game_id, greenery_points, group_id, has_full_card_breakdown, inferred_primary_style_code, inferred_style_confidence, is_winner, key_card_count, loss_gap_points, milestone_points, other_card_points, placement, placement_score, player_id, player_name, signed_differential_points, total_points, tr_points, win_differential_points',
      )
      .eq('group_id', groupId)
      .in('game_id', sharedGameIds);

    if (sharedRowsError) {
      throw sharedRowsError;
    }

    normalizedSharedRows = ((sharedRows as RawProfileGameResultRow[] | null) ?? []).map(
      mapProfileGameResultRow,
    );
  }

  return buildProfileAnalyticsFromRows({
    efficiencySummary: efficiencyRows[0] ?? null,
    linkedPlayers,
    mapMetricRows,
    ownRows: normalizedOwnRows,
    sharedRows: normalizedSharedRows,
  });
}

export async function getGroupAnalytics(groupId: string) {
  const [
    leaderboardRows,
    scoreAverages,
    playerScoreAverages,
    groupStylePerformanceRows,
    playerStylePerformanceRows,
    groupInteractionRows,
    playerInteractionRows,
    headToHeadRows,
    lineupEffectRows,
    playerTrendRows,
    styleAgreementRows,
    coverage,
    playerCoverages,
    playerEfficiencySummaries,
    playerMapMetricRows,
    globalMapMetricRows,
  ] = await Promise.all([
    listGroupLeaderboard(groupId),
    getGroupScoreSourceAverages(groupId),
    listGroupPlayerScoreAverages(groupId),
    listGroupStylePerformance(groupId),
    listPlayerStylePerformance(groupId),
    listGroupInteractions(groupId),
    listPlayerInteractions(groupId),
    listGroupHeadToHead(groupId),
    listGroupLineupEffects(groupId),
    listPlayerTrendRows(groupId),
    listGroupStyleAgreement(groupId),
    getGroupCoverage(groupId),
    listGroupPlayerCoverage(groupId),
    listGroupPlayerEfficiencySummaries(groupId),
    listGroupPlayerMapMetrics(groupId),
    listGlobalMapMetrics(),
  ]);

  return {
    leaderboardRows,
    scoreAverages,
    playerScoreAverages,
    groupStylePerformanceRows,
    playerStylePerformanceRows,
    groupInteractionRows,
    playerInteractionRows,
    headToHeadRows,
    lineupEffectRows,
    playerTrendRows,
    styleAgreementRows,
    coverage,
    playerCoverages,
    playerEfficiencySummaries,
    playerMapMetricRows,
    globalMapMetricRows,
  } satisfies GroupAnalytics;
}
