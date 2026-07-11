import {
  buildEmptyExtendedAnalytics,
  type ExtendedGroupAnalytics,
  getOverallExtendedAnalytics,
} from '@/lib/db/extended-analytics-repo';
import {
  type CanonicalIdentity,
  type IdentityLookup,
  mergeGroupInteractions,
  mergeGroupStylePerformance,
  mergeLineupEffects,
  mergePlayerInteractions,
  mergePlayerStylePerformance,
  mergeStyleAgreement,
} from '@/lib/db/overall-analytics-aggregators';
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

type AnalyticsInteractionType = 'corporation_prelude_pair';

export type GroupInteractionRow = {
  averagePlacement: number;
  averageScore: number;
  gamesPlayed: number;
  groupId: string;
  interactionType: AnalyticsInteractionType;
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

export type ImportCoverageRow = {
  gameId: string;
  groupId: string;
  hasScoreSourceBreakdown: boolean;
  ignoredFillerLines: number;
  lineCount: number;
  screenshotCount: number;
  unparsedLineCount: number;
};

export type ProfileAnalytics = {
  coverage: CoverageRow | null;
  headToHeadRows: ProfileHeadToHeadRow[];
  performance: LeaderboardRow | null;
  playerId: string;
  playerName: string;
  scoreAverages: ScoreSourceAverages | null;
  styleAgreement: StyleAgreementRow | null;
};

export type GroupAnalytics = {
  coverage: CoverageRow | null;
  groupStylePerformanceRows: GroupStylePerformanceRow[];
  groupInteractionRows: GroupInteractionRow[];
  headToHeadRows: GroupHeadToHeadRow[];
  importCoverageRows: ImportCoverageRow[];
  leaderboardRows: LeaderboardRow[];
  lineupEffectRows: LineupEffectRow[];
  playerCoverages: CoverageRow[];
  playerInteractionRows: PlayerInteractionRow[];
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

export type FocusedHeadToHeadRow = {
  averageScoreDifferential: number;
  gamesPlayed: number;
  label: string;
  losses: number;
  ties: number;
  wins: number;
};

export type CrossGroupFocusBundle = {
  coverage: CoverageRow | null;
  headToHeadRows: FocusedHeadToHeadRow[];
  performance: LeaderboardRow | null;
  scoreAverages: ScoreSourceAverages | null;
  trendRows: TrendRow[];
};

export type CrossGroupFocusPerson = {
  activeGroupPlayerId: string | null;
  bundle: CrossGroupFocusBundle;
  canonicalId: string;
  displayName: string;
  inActiveGroup: boolean;
  playerIds: string[];
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
  interaction_type: AnalyticsInteractionType | 'map_expansion_mix';
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

type RawImportCoverageRow = {
  game_id: string;
  group_id: string;
  has_score_source_breakdown: boolean;
  ignored_filler_lines: number | string;
  line_count: number | string;
  screenshot_count: number | string;
  unparsed_line_count: number | string;
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

type LinkedPlayerRow = {
  display_name: string;
  group_id?: string | null;
  id: string;
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

function isAnalyticsInteractionType(
  interactionType: RawGroupInteractionRow['interaction_type'],
): interactionType is AnalyticsInteractionType {
  return interactionType === 'corporation_prelude_pair';
}

function mapGroupInteractionRow(
  row: RawGroupInteractionRow,
): GroupInteractionRow | null {
  if (!isAnalyticsInteractionType(row.interaction_type)) {
    return null;
  }

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
): PlayerInteractionRow | null {
  const groupInteraction = mapGroupInteractionRow(row);

  if (!groupInteraction) {
    return null;
  }

  return {
    ...groupInteraction,
    playerId: row.player_id,
    playerName: row.player_name,
  };
}

function compactRows<T>(rows: Array<T | null>) {
  return rows.filter((row): row is T => row !== null);
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

function mapImportCoverageRow(row: RawImportCoverageRow): ImportCoverageRow {
  return {
    gameId: row.game_id,
    groupId: row.group_id,
    hasScoreSourceBreakdown: row.has_score_source_breakdown,
    ignoredFillerLines: toNumber(row.ignored_filler_lines),
    lineCount: toNumber(row.line_count),
    screenshotCount: toNumber(row.screenshot_count),
    unparsedLineCount: toNumber(row.unparsed_line_count),
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

const PROFILE_RESULT_SELECT =
  'award_points, card_points_animals, card_points_jovian, card_points_microbes, card_points_total, cities_points, declared_modifier_style_codes, declared_primary_style_code, game_id, greenery_points, group_id, has_full_card_breakdown, inferred_primary_style_code, inferred_style_confidence, is_winner, key_card_count, loss_gap_points, milestone_points, other_card_points, placement, placement_score, player_id, player_name, signed_differential_points, total_points, tr_points, win_differential_points';

const FOCUS_RESULT_SELECT = `${PROFILE_RESULT_SELECT}, generation_count, played_on`;

type RawFocusGameResultRow = RawProfileGameResultRow & {
  generation_count: number | string;
  played_on: string;
};

type FocusGameResultRow = ProfileGameResultRow & {
  generationCount: number;
  playedOn: string;
};

type PlayerIdentityRow = {
  display_name: string;
  id: string;
  linked_user_id: null | string;
  normalized_display_name: null | string;
};

function mapFocusGameResultRow(row: RawFocusGameResultRow): FocusGameResultRow {
  return {
    ...mapProfileGameResultRow(row),
    generationCount: toNumber(row.generation_count),
    playedOn: row.played_on,
  };
}

function focusRowToTrendRow(row: FocusGameResultRow): TrendRow {
  return {
    gameId: row.gameId,
    generationCount: row.generationCount,
    groupId: row.groupId,
    inferredPrimaryStyleCode: row.inferredPrimaryStyleCode,
    isWinner: row.isWinner,
    placement: row.placement,
    playedOn: row.playedOn,
    playerId: row.playerId,
    playerName: row.playerName,
    totalPoints: row.totalPoints,
  };
}

function canonicalPersonId(identity: {
  display_name: string;
  linked_user_id: null | string;
  normalized_display_name: null | string;
}) {
  if (identity.linked_user_id) {
    return `user:${identity.linked_user_id}`;
  }

  const name = (identity.normalized_display_name ?? identity.display_name).trim().toLowerCase();

  return `name:${name}`;
}

async function getLinkedPlayers(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('players')
    .select('id, display_name, group_id')
    .eq('linked_user_id', userId)
    .order('created_at', { ascending: true })
    .order('display_name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as LinkedPlayerRow[];
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
  linkedPlayers: LinkedPlayerRow[];
  opponentIdentityByPlayerId?: Map<string, string>;
  ownRows: ProfileGameResultRow[];
  sharedRows: ProfileGameResultRow[];
}): ProfileAnalytics {
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

      const opponentKey =
        input.opponentIdentityByPlayerId?.get(opponentRow.playerId) ??
        opponentRow.playerId;

      const current = headToHeadByOpponent.get(opponentKey) ?? {
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

      headToHeadByOpponent.set(opponentKey, current);
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
    compactRows((data as RawGroupInteractionRow[]).map(mapGroupInteractionRow)),
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
    compactRows((data as RawPlayerInteractionRow[]).map(mapPlayerInteractionRow)),
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

export async function listImportCoverage(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await getAnalyticsClient(supabase)
    .from('import_coverage')
    .select('game_id, group_id, has_score_source_breakdown, ignored_filler_lines, line_count, screenshot_count, unparsed_line_count')
    .eq('group_id', groupId);

  if (error) {
    throw error;
  }

  return (data as RawImportCoverageRow[]).map(mapImportCoverageRow);
}

export async function getProfileAnalytics(
  userId: string,
  options: { groupId?: string | null } = {},
): Promise<ProfileAnalytics | null> {
  const allLinkedPlayers = await getLinkedPlayers(userId);
  const linkedPlayers = options.groupId
    ? allLinkedPlayers.filter((player) => player.group_id === options.groupId)
    : allLinkedPlayers;

  if (!linkedPlayers || linkedPlayers.length === 0) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const linkedPlayerIds = linkedPlayers.map((player) => player.id);
  const { data: ownRows, error: ownRowsError } = await getAnalyticsClient(supabase)
    .from('player_game_results')
    .select(
      'award_points, card_points_animals, card_points_jovian, card_points_microbes, card_points_total, cities_points, declared_modifier_style_codes, declared_primary_style_code, game_id, greenery_points, group_id, has_full_card_breakdown, inferred_primary_style_code, inferred_style_confidence, is_winner, key_card_count, loss_gap_points, milestone_points, other_card_points, placement, placement_score, player_id, player_name, signed_differential_points, total_points, tr_points, win_differential_points',
    )
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
      .in('game_id', sharedGameIds);

    if (sharedRowsError) {
      throw sharedRowsError;
    }

    normalizedSharedRows = ((sharedRows as RawProfileGameResultRow[] | null) ?? []).map(
      mapProfileGameResultRow,
    );
  }

  // Opponents appear as a distinct player row per group, so head-to-head must
  // collapse rows that belong to the same linked user account.
  const opponentPlayerIds = [
    ...new Set(
      normalizedSharedRows
        .map((row) => row.playerId)
        .filter((playerId) => !linkedPlayerIds.includes(playerId)),
    ),
  ];
  const opponentIdentityByPlayerId = new Map<string, string>();

  if (opponentPlayerIds.length > 0) {
    const { data: opponentPlayers, error: opponentPlayersError } = await supabase
      .from('players')
      .select('id, linked_user_id')
      .in('id', opponentPlayerIds);

    if (opponentPlayersError) {
      throw opponentPlayersError;
    }

    for (const player of (opponentPlayers ?? []) as Array<{
      id: string;
      linked_user_id: null | string;
    }>) {
      opponentIdentityByPlayerId.set(player.id, player.linked_user_id ?? player.id);
    }
  }

  return buildProfileAnalyticsFromRows({
    linkedPlayers,
    opponentIdentityByPlayerId,
    ownRows: normalizedOwnRows,
    sharedRows: normalizedSharedRows,
  });
}

/**
 * Player Focus on Insights spans every person the signed-in user has shared a
 * game with, across all of their groups (the group-split migration gives each
 * person a distinct player row per group). For each such person this returns a
 * bundle of their stats aggregated across those shared games so the dashboard
 * can focus on opponents who aren't in the currently active group.
 */
export async function getCrossGroupFocusData(
  userId: string,
  activeGroupId: string | null,
): Promise<CrossGroupFocusPerson[]> {
  const linkedPlayers = await getLinkedPlayers(userId);

  if (linkedPlayers.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const linkedPlayerIds = linkedPlayers.map((player) => player.id);

  const { data: ownData, error: ownError } = await getAnalyticsClient(supabase)
    .from('player_game_results')
    .select(FOCUS_RESULT_SELECT)
    .in('player_id', linkedPlayerIds);

  if (ownError) {
    throw ownError;
  }

  const ownRows = ((ownData as RawFocusGameResultRow[] | null) ?? []).map(
    mapFocusGameResultRow,
  );
  const gameIds = [...new Set(ownRows.map((row) => row.gameId))];

  if (gameIds.length === 0) {
    return [];
  }

  const { data: allData, error: allError } = await getAnalyticsClient(supabase)
    .from('player_game_results')
    .select(FOCUS_RESULT_SELECT)
    .in('game_id', gameIds);

  if (allError) {
    throw allError;
  }

  const allRows = ((allData as RawFocusGameResultRow[] | null) ?? []).map(
    mapFocusGameResultRow,
  );

  const participantIds = [...new Set(allRows.map((row) => row.playerId))];
  const identityByPlayerId = new Map<string, { canonicalId: string; displayName: string }>();
  const playerIdsByCanonical = new Map<string, Set<string>>();

  if (participantIds.length > 0) {
    const { data: participants, error: participantsError } = await supabase
      .from('players')
      .select('id, display_name, linked_user_id, normalized_display_name')
      .in('id', participantIds);

    if (participantsError) {
      throw participantsError;
    }

    for (const player of (participants ?? []) as PlayerIdentityRow[]) {
      const canonicalId = canonicalPersonId(player);
      identityByPlayerId.set(player.id, { canonicalId, displayName: player.display_name });

      const existing = playerIdsByCanonical.get(canonicalId) ?? new Set<string>();
      existing.add(player.id);
      playerIdsByCanonical.set(canonicalId, existing);
    }
  }

  const opponentIdentityByPlayerId = new Map<string, string>();

  for (const [playerId, identity] of identityByPlayerId) {
    opponentIdentityByPlayerId.set(playerId, identity.canonicalId);
  }

  const rowsByCanonical = new Map<string, FocusGameResultRow[]>();

  for (const row of allRows) {
    const canonicalId = identityByPlayerId.get(row.playerId)?.canonicalId;

    if (!canonicalId) {
      continue;
    }

    const existing = rowsByCanonical.get(canonicalId) ?? [];
    existing.push(row);
    rowsByCanonical.set(canonicalId, existing);
  }

  const userCanonicalId = `user:${userId}`;
  const people: CrossGroupFocusPerson[] = [];

  for (const [canonicalId, personRows] of rowsByCanonical) {
    const personPlayerIds = [
      ...(playerIdsByCanonical.get(canonicalId) ?? new Set<string>()),
    ].sort();
    const displayName =
      identityByPlayerId.get(personRows[0]?.playerId ?? '')?.displayName ??
      personRows[0]?.playerName ??
      'Unknown player';

    const personLinkedPlayers: LinkedPlayerRow[] = personPlayerIds.map((id) => ({
      id,
      display_name: displayName,
      group_id: personRows.find((row) => row.playerId === id)?.groupId ?? null,
    }));

    const profile = buildProfileAnalyticsFromRows({
      linkedPlayers: personLinkedPlayers,
      opponentIdentityByPlayerId,
      ownRows: personRows,
      sharedRows: allRows,
    });

    const activeGroupPlayerId =
      activeGroupId == null
        ? null
        : personRows.find((row) => row.groupId === activeGroupId)?.playerId ?? null;

    const bundle: CrossGroupFocusBundle = {
      coverage: profile.coverage,
      headToHeadRows: profile.headToHeadRows
        .map((row) => ({
          averageScoreDifferential: row.averageScoreDifferential,
          gamesPlayed: row.gamesPlayed,
          label: `${displayName} vs ${row.opponentName}`,
          losses: row.losses,
          ties: row.ties,
          wins: row.wins,
        }))
        .sort(
          (left, right) =>
            right.gamesPlayed - left.gamesPlayed ||
            right.wins - left.wins ||
            left.label.localeCompare(right.label),
        ),
      performance: profile.performance,
      scoreAverages: profile.scoreAverages,
      trendRows: personRows
        .map(focusRowToTrendRow)
        .sort(
          (left, right) =>
            left.playedOn.localeCompare(right.playedOn) ||
            left.gameId.localeCompare(right.gameId),
        ),
    };

    people.push({
      activeGroupPlayerId,
      bundle,
      canonicalId,
      displayName,
      inActiveGroup: activeGroupPlayerId !== null,
      playerIds: personPlayerIds,
    });
  }

  people.sort((left, right) => {
    if (left.canonicalId === userCanonicalId) {
      return -1;
    }

    if (right.canonicalId === userCanonicalId) {
      return 1;
    }

    const leftGames = left.bundle.performance?.gamesPlayed ?? 0;
    const rightGames = right.bundle.performance?.gamesPlayed ?? 0;

    return rightGames - leftGames || left.displayName.localeCompare(right.displayName);
  });

  return people;
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
    importCoverageRows,
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
    listImportCoverage(groupId),
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
    importCoverageRows,
  } satisfies GroupAnalytics;
}

export function buildEmptyGroupAnalytics(): GroupAnalytics {
  return {
    coverage: null,
    groupInteractionRows: [],
    groupStylePerformanceRows: [],
    headToHeadRows: [],
    importCoverageRows: [],
    leaderboardRows: [],
    lineupEffectRows: [],
    playerCoverages: [],
    playerInteractionRows: [],
    playerScoreAverages: [],
    playerStylePerformanceRows: [],
    playerTrendRows: [],
    scoreAverages: null,
    styleAgreementRows: [],
  };
}

export type OverallAnalytics = {
  analytics: GroupAnalytics;
  extended: ExtendedGroupAnalytics;
};

/**
 * Cross-group ("Overall") slice of GroupAnalytics: only the sections the Insights
 * dashboard renders in Overall scope that aren't already covered by the
 * cross-group focus bundle (style, interaction and lineup breakdowns). Every
 * per-group player row is collapsed to a canonical person via `lookup`; the
 * leaderboard / score / coverage / head-to-head / trend fields stay empty
 * because the dashboard sources those from the focus bundle in Overall scope.
 */
export async function getOverallGroupAnalytics(
  groupIds: string[],
  lookup: IdentityLookup,
): Promise<GroupAnalytics> {
  if (groupIds.length === 0) {
    return buildEmptyGroupAnalytics();
  }

  const supabase = await createSupabaseServerClient();
  const client = getAnalyticsClient(supabase);
  const fetchRows = async (view: string) => {
    const { data, error } = await client
      .from(view)
      .select('*')
      .in('group_id', groupIds);

    if (error) {
      throw error;
    }

    return data ?? [];
  };

  const [
    groupStyleRaw,
    playerStyleRaw,
    groupInteractionRaw,
    playerInteractionRaw,
    lineupRaw,
    styleAgreementRaw,
  ] = await Promise.all([
    fetchRows('group_style_performance'),
    fetchRows('player_style_performance'),
    fetchRows('group_interactions'),
    fetchRows('player_interactions'),
    fetchRows('lineup_effects'),
    fetchRows('style_agreement'),
  ]);

  return {
    ...buildEmptyGroupAnalytics(),
    groupStylePerformanceRows: sortStylePerformanceRows(
      mergeGroupStylePerformance(
        (groupStyleRaw as RawGroupStylePerformanceRow[]).map(
          mapGroupStylePerformanceRow,
        ),
      ),
    ),
    playerStylePerformanceRows: sortStylePerformanceRows(
      mergePlayerStylePerformance(
        (playerStyleRaw as RawPlayerStylePerformanceRow[]).map(
          mapPlayerStylePerformanceRow,
        ),
        lookup,
      ),
    ),
    groupInteractionRows: sortInteractionRows(
      mergeGroupInteractions(
        compactRows(
          (groupInteractionRaw as RawGroupInteractionRow[]).map(
            mapGroupInteractionRow,
          ),
        ),
      ),
    ),
    playerInteractionRows: sortInteractionRows(
      mergePlayerInteractions(
        compactRows(
          (playerInteractionRaw as RawPlayerInteractionRow[]).map(
            mapPlayerInteractionRow,
          ),
        ),
        lookup,
      ),
    ),
    lineupEffectRows: sortLineupEffectRows(
      mergeLineupEffects(
        (lineupRaw as RawLineupEffectRow[]).map(mapLineupEffectRow),
        lookup,
      ),
    ),
    styleAgreementRows: sortStyleAgreementRows(
      mergeStyleAgreement(
        (styleAgreementRaw as RawStyleAgreementRow[])
          .map(mapStyleAgreementRow)
          .filter((row) => row.comparedGames > 0),
        lookup,
      ),
    ),
  };
}

/**
 * Everything the Insights "Overall" scope needs, aggregated across every group
 * the signed-in user has played in and collapsed to canonical persons. Returns
 * both the GroupAnalytics slice and the ExtendedGroupAnalytics so the dashboard
 * can render the full section set for "all the people you have played".
 */
export async function getOverallAnalytics(
  userId: string,
): Promise<OverallAnalytics> {
  const linkedPlayers = await getLinkedPlayers(userId);

  if (linkedPlayers.length === 0) {
    return {
      analytics: buildEmptyGroupAnalytics(),
      extended: buildEmptyExtendedAnalytics(),
    };
  }

  const supabase = await createSupabaseServerClient();
  const linkedPlayerIds = linkedPlayers.map((player) => player.id);

  const { data: ownRows, error: ownError } = await getAnalyticsClient(supabase)
    .from('player_game_results')
    .select('group_id')
    .in('player_id', linkedPlayerIds);

  if (ownError) {
    throw ownError;
  }

  const groupIds = [
    ...new Set(
      ((ownRows as Array<{ group_id: string | null }> | null) ?? [])
        .map((row) => row.group_id)
        .filter((groupId): groupId is string => Boolean(groupId)),
    ),
  ];

  if (groupIds.length === 0) {
    return {
      analytics: buildEmptyGroupAnalytics(),
      extended: buildEmptyExtendedAnalytics(),
    };
  }

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, display_name, linked_user_id, normalized_display_name')
    .in('group_id', groupIds);

  if (playersError) {
    throw playersError;
  }

  const identityByPlayerId = new Map<string, CanonicalIdentity>();
  const displayNameByCanonical = new Map<string, string>();
  const linkedPreferredCanonicals = new Set<string>();

  for (const player of (players ?? []) as PlayerIdentityRow[]) {
    const canonicalId = canonicalPersonId(player);
    identityByPlayerId.set(player.id, {
      canonicalId,
      displayName: player.display_name,
    });

    const isLinked = Boolean(player.linked_user_id);
    const shouldPreferName =
      !displayNameByCanonical.has(canonicalId) ||
      (isLinked && !linkedPreferredCanonicals.has(canonicalId));

    if (shouldPreferName) {
      displayNameByCanonical.set(canonicalId, player.display_name);

      if (isLinked) {
        linkedPreferredCanonicals.add(canonicalId);
      }
    }
  }

  const lookup: IdentityLookup = (playerId, fallbackName) => {
    const identity = identityByPlayerId.get(playerId);
    const canonicalId = identity?.canonicalId ?? playerId;

    return {
      canonicalId,
      displayName:
        displayNameByCanonical.get(canonicalId) ??
        identity?.displayName ??
        fallbackName,
    };
  };

  const { data: coverageRows, error: coverageError } = await getAnalyticsClient(
    supabase,
  )
    .from('data_coverage')
    .select('group_id, finalized_games')
    .in('group_id', groupIds);

  if (coverageError) {
    throw coverageError;
  }

  const totalFinalizedGames = (
    (coverageRows as Array<{ finalized_games: number | null }> | null) ?? []
  ).reduce((sum, row) => sum + (row.finalized_games ?? 0), 0);

  const [analytics, extended] = await Promise.all([
    getOverallGroupAnalytics(groupIds, lookup),
    getOverallExtendedAnalytics(groupIds, lookup, totalFinalizedGames),
  ]);

  return { analytics, extended };
}
