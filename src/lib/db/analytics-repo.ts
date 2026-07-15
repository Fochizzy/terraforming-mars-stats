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
import {
  buildAnalyticsPlayerLabelMap,
  fetchUsernamesByPlayerId,
  resolvePlayerLabelsInRows,
} from '@/lib/db/player-label-resolution';
import { getBoardSpaceMap } from '@/lib/imports/board-space-maps';
import { getSelectionStats } from '@/lib/db/selection-stats-repo';
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

export type GlobalInsightMetricSummary = {
  averageGeneration: number;
  averageScore: number;
  baselineWinRate: number;
  playerResults: number;
  totalGames: number;
};

export type GlobalMetaSignal = {
  averageScore: number;
  baselineWinRate: number;
  direction: 'dragger' | 'overperformer';
  label: string;
  sampleSize: number;
  sourceType: 'Card' | 'Corporation' | 'Prelude' | 'Tag';
  winRate: number;
  winRateDelta: number;
  wins: number;
};

export type GlobalTempoMetric = {
  averageGeneration: number;
  averagePointsPerGeneration: number;
  averageScore: number;
  bucket: 'long' | 'short' | 'standard';
  games: number;
  label: string;
  playerResults: number;
  winRate: number;
  wins: number;
};

export type GlobalTerraformingShareMetric = {
  actionShare: number;
  heatActions: number;
  oceanActions: number;
  oxygenActions: number;
  playerId: string;
  playerName: string;
  totalActions: number;
};

export type GlobalObjectiveConversionMetric = {
  actions: number;
  conversionRate: number;
  label: string;
  objectiveType: 'award' | 'milestone';
  snipedActions: number | null;
  snipedRate: number | null;
  winRate: number;
  wins: number;
};

export type GlobalMapTableMetric = {
  averageGeneration: number;
  averageScore: number;
  category: 'map' | 'tableSize';
  games: number;
  label: string;
  playerResults: number;
  winRate: number | null;
};

export type GlobalOpeningComboMetric = {
  averageScore: number;
  corporationName: string;
  label: string;
  plays: number;
  preludeLabel: string;
  scoreDeviation: number;
  signalType: 'best' | 'highVariance' | 'trap';
  winRate: number;
  wins: number;
};

export type GlobalCardTimingMetric = {
  cardName: string;
  earlyPlays: number;
  earlyWinRate: number;
  earlyWins: number;
  latePlays: number;
  lateWinRate: number;
  lateWins: number;
  winRateDelta: number;
};

export type GlobalInsightMetrics = {
  cardTiming: GlobalCardTimingMetric[];
  mapTableMeta: GlobalMapTableMetric[];
  metaSignals: GlobalMetaSignal[];
  objectiveConversion: GlobalObjectiveConversionMetric[];
  openingCombos: GlobalOpeningComboMetric[];
  summary: GlobalInsightMetricSummary;
  tempoProfile: GlobalTempoMetric[];
  terraformingShare: GlobalTerraformingShareMetric[];
};

export type ProfileScorePaceRow = {
  averagePoints: number;
  averagePointsPerGeneration: number;
  code:
    | 'cards'
    | 'cities'
    | 'greenery'
    | 'milestones'
    | 'terraform_rating';
  label: string;
  scoreShare: number;
};

export type ProfileScorePace = {
  averageGenerationCount: number;
  averageTotalPointsPerGeneration: number;
  lightestSource: ProfileScorePaceRow | null;
  rows: ProfileScorePaceRow[];
  strongestSource: ProfileScorePaceRow | null;
};

export type ProfileGameLengthBucket = 'long' | 'short' | 'standard';

export type ProfileGameLengthRow = {
  averageGenerationCount: number;
  averagePlacement: number;
  averagePointsPerGeneration: number;
  averageScore: number;
  bucket: ProfileGameLengthBucket;
  gamesPlayed: number;
  label: string;
  rangeLabel: string;
  winRate: number;
  wins: number;
};

export type ProfileGameLengthProfile = {
  bestBucket: ProfileGameLengthRow | null;
  rows: ProfileGameLengthRow[];
  weakestBucket: ProfileGameLengthRow | null;
};

export type ProfileGlobalParameter = 'heat' | 'ocean' | 'oxygen';

export type ProfileGlobalParameterTempoRow = {
  averageFastGeneration: number;
  averagePlacement: number;
  averageScore: number;
  code: string;
  gamesPlayed: number;
  label: string;
  parameters: ProfileGlobalParameter[];
  winRate: number;
  wins: number;
};

export type ProfileGlobalParameterTempoProfile = {
  bestMix: ProfileGlobalParameterTempoRow | null;
  confidenceLabel: string;
  importedGames: number;
  rows: ProfileGlobalParameterTempoRow[];
  weakestMix: ProfileGlobalParameterTempoRow | null;
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
  opponentId?: string;
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
  generationCount: number;
  groupId: string;
  hasScoreSourceBreakdown: boolean;
  ignoredFillerLines: number;
  lineCount: number;
  screenshotCount: number;
  unparsedLineCount: number;
};

export type ProfileCardStat = {
  cardId: string;
  cardName: string;
  fullImageUrl: string | null;
  plays: number;
  thumbnailUrl: string | null;
  winRate: number;
  wins: number;
  // Set on victory-impact key cards only: how much this card lifts the player's
  // win chances above their baseline (blended personal + global win rate), and
  // the global win rate it was blended toward. Undefined on most-played cards.
  globalWinRate?: number;
  contextLabel?: string;
  evidenceConfidence?: 'High' | 'Low' | 'Medium';
  victoryImpact?: number;
};

export type ProfileTagStat = {
  averageTagsPerGame: number;
  games: number;
  tagCode: string;
  tagName: string;
  totalTags: number;
  winRate: number;
  wins: number;
};

export type ProfileStyleBreakdownRow = {
  averagePlacement: number;
  averageScore: number;
  gamesPlayed: number;
  playRate: number;
  styleCode: string;
  styleName: string;
  winRate: number;
  wins: number;
};

export type ProfileStyleInsightCard = {
  cardName: string;
  fullImageUrl: string | null;
  id: string;
  thumbnailUrl: string | null;
};

export type ProfileStyleInsight = {
  body: string;
  // The card referenced by name in `body` (Game Log Signal only), so the
  // renderer can turn its mention into a stats link.
  card?: ProfileStyleInsightCard | null;
  confidence: 'high' | 'low' | 'medium';
  evidenceLabel: string;
  sampleSize: number;
  // The play style referenced by name in `body`, so the renderer can deep-link
  // its mention to the glossary. `styleCode` drives the `style-<code>` slug.
  styleCode?: string;
  styleName?: string;
  title: string;
};

export type ProfileLeadPressure = {
  averageLeadWhenWinning: number | null;
  averageScoreDifferential: number;
  averageShortfallWhenBehind: number | null;
  closeGameRate: number;
  dominantWinRate: number;
  gamesPlayed: number;
  leadRate: number;
  pressureLabel: string;
};

export type ProfilePhase = 'early' | 'late' | 'mid';

export type ProfilePhaseTempoRow = {
  actions: number;
  actionsPerImportedGame: number;
  awardsFunded: number;
  averagePlacementWhenPeak: number | null;
  averageScoreWhenPeak: number | null;
  cardsPlayed: number;
  citiesPlaced: number;
  gamesWithPeak: number;
  greeneriesPlaced: number;
  label: string;
  milestonesClaimed: number;
  phase: ProfilePhase;
  removalEvents: number;
  tilesPlaced: number;
  winRateWhenPeak: number | null;
  winsWhenPeak: number;
};

export type ProfilePhaseTempoProfile = {
  bestPhase: ProfilePhaseTempoRow | null;
  confidenceLabel: string;
  importedGames: number;
  mostActivePhase: ProfilePhaseTempoRow | null;
  rows: ProfilePhaseTempoRow[];
};

export type ProfileResourceRemoval = {
  amountPerImportedGame: number;
  events: number;
  productionAmount: number;
  productionEvents: number;
  resourceAmount: number;
  resourceEvents: number;
  totalAmount: number;
};

export type ProfileResourceRemovalProfile = {
  confidenceLabel: string;
  explicitAttributionEvents: number;
  fallbackAttributionEvents: number;
  importedGames: number;
  incoming: ProfileResourceRemoval;
  outgoing: ProfileResourceRemoval;
  resourceRows: Array<{
    amount: number;
    deltaKind: 'production' | 'resource';
    events: number;
    resourceType: string;
  }>;
  totalRemovalEvents: number;
};

export type ProfileExpansionCode =
  | 'board_control'
  | 'comeback_front_runner'
  | 'corporation_prelude_fit'
  | 'engine_shape'
  | 'game_speed_matchup'
  | 'improvement_coach'
  | 'interaction_personality'
  | 'opening_profile'
  | 'opponent_adjusted'
  | 'scoring_reliability';

export type ProfileExpansionMetric = {
  detail?: string;
  label: string;
  value: string;
};

export type ProfileExpansionSection = {
  code: ProfileExpansionCode;
  confidenceLabel: string;
  metrics: ProfileExpansionMetric[];
  summary: string;
  title: string;
};

export type ProfileExpansionProfile = {
  improvements: string[];
  sections: ProfileExpansionSection[];
  strengths: string[];
};

export type ProfileAnalytics = {
  cardOutcomes: ProfileCardStat[];
  coverage: CoverageRow | null;
  expansionProfile: ProfileExpansionProfile | null;
  gameLengthProfile: ProfileGameLengthProfile | null;
  globalParameterTempoProfile: ProfileGlobalParameterTempoProfile | null;
  headToHeadRows: ProfileHeadToHeadRow[];
  keyCards: ProfileCardStat[];
  leadPressure: ProfileLeadPressure | null;
  lossCards: ProfileCardStat[];
  performance: LeaderboardRow | null;
  phaseTempoProfile: ProfilePhaseTempoProfile | null;
  playerId: string;
  playerName: string;
  resourceRemovalProfile: ProfileResourceRemovalProfile | null;
  scoreAverages: ScoreSourceAverages | null;
  scorePace: ProfileScorePace | null;
  styleAgreement: StyleAgreementRow | null;
  styleBreakdownRows: ProfileStyleBreakdownRow[];
  styleInsights: ProfileStyleInsight[];
  tagOutcomes: ProfileTagStat[];
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
  opponentId?: string;
  ties: number;
  wins: number;
};

export type CrossGroupFocusBundle = {
  coverage: CoverageRow | null;
  headToHeadRows: FocusedHeadToHeadRow[];
  performance: LeaderboardRow | null;
  scoreAverages: ScoreSourceAverages | null;
  styleBreakdownRows?: ProfileStyleBreakdownRow[];
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
  lineup_key: string | null;
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
  generation_count: number | string;
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
  generation_count: number | string;
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

export type ProfileGameResultRow = {
  awardPoints: number;
  cardPointsAnimals: null | number;
  cardPointsJovian: null | number;
  cardPointsMicrobes: null | number;
  cardPointsTotal: number;
  citiesPoints: number;
  declaredModifierStyleCodes: string[];
  declaredPrimaryStyleCode: null | string;
  gameId: string;
  generationCount: number;
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

export type SharedGameResultRow = ProfileGameResultRow & {
  mapId: null | string;
  playedOn: string;
  playerCount: number;
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function readNumberField(row: Record<string, unknown>, key: string) {
  return toNumber(row[key] as number | string | null | undefined);
}

function readFirstNumberField(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (typeof row[key] !== 'undefined') {
      return readNumberField(row, key);
    }
  }

  return 0;
}

function readNullableNumberField(row: Record<string, unknown>, key: string) {
  return toNullableNumber(row[key] as number | string | null | undefined);
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

const STYLE_LABELS: Record<string, string> = {
  award_closer: 'Award Closer',
  award_pressure: 'Award Pressure',
  balanced: 'Balanced',
  board_control: 'Board Control',
  card_combo: 'Card Combo',
  card_vp_engine: 'Card VP Engine',
  city_building: 'City Building',
  economy_engine: 'Economy Engine',
  engine_builder: 'Engine Builder',
  engine_building: 'Engine Building',
  jovian_payoff: 'Jovian Payoff',
  milestone_aggression: 'Milestone Aggression',
  milestone_race: 'Milestone Race',
  plant_greenery: 'Plant Greenery',
  science_combo: 'Science Combo',
  space_economy: 'Space Economy',
  terraform_rush: 'Terraform Rush',
  terraforming_rush: 'Terraforming Rush',
};

function formatStyleName(styleCode: string) {
  return (
    STYLE_LABELS[styleCode] ??
    styleCode
      .split('_')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}

function formatInsightNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatInsightPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getProfileInsightConfidence(
  sampleSize: number,
): ProfileStyleInsight['confidence'] {
  if (sampleSize >= 6) {
    return 'high';
  }

  if (sampleSize >= 3) {
    return 'medium';
  }

  return 'low';
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

function readOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
) {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function buildEmptyGlobalInsightMetrics(): GlobalInsightMetrics {
  return {
    cardTiming: [],
    mapTableMeta: [],
    metaSignals: [],
    objectiveConversion: [],
    openingCombos: [],
    summary: {
      averageGeneration: 0,
      averageScore: 0,
      baselineWinRate: 0,
      playerResults: 0,
      totalGames: 0,
    },
    tempoProfile: [],
    terraformingShare: [],
  };
}

function mapGlobalInsightSummary(
  value: unknown,
): GlobalInsightMetricSummary {
  const row = asRecord(value);

  return {
    averageGeneration: readNumberField(row, 'average_generation'),
    averageScore: readNumberField(row, 'average_score'),
    baselineWinRate: readNumberField(row, 'baseline_win_rate'),
    playerResults: readNumberField(row, 'player_results'),
    totalGames: readNumberField(row, 'total_games'),
  };
}

function mapGlobalMetaSignal(row: Record<string, unknown>): GlobalMetaSignal {
  return {
    averageScore: readNumberField(row, 'averageScore'),
    baselineWinRate: readNumberField(row, 'baselineWinRate'),
    direction: readOneOf(
      row.direction,
      ['dragger', 'overperformer'] as const,
      'overperformer',
    ),
    label: readString(row.label),
    sampleSize: readNumberField(row, 'sampleSize'),
    sourceType: readOneOf(
      row.sourceType,
      ['Card', 'Corporation', 'Prelude', 'Tag'] as const,
      'Card',
    ),
    winRate: readNumberField(row, 'winRate'),
    winRateDelta: readNumberField(row, 'winRateDelta'),
    wins: readNumberField(row, 'wins'),
  };
}

const META_SIGNAL_SOURCE_PRIORITY: Record<GlobalMetaSignal['sourceType'], number> = {
  Corporation: 4,
  Prelude: 3,
  Card: 2,
  Tag: 1,
};

function deduplicateGlobalMetaSignals(rows: GlobalMetaSignal[]) {
  const deduplicated: GlobalMetaSignal[] = [];
  const indexByLabel = new Map<string, number>();

  for (const row of rows) {
    const key = row.label.trim().toLocaleLowerCase('en-US');
    const existingIndex = indexByLabel.get(key);

    if (typeof existingIndex === 'undefined') {
      indexByLabel.set(key, deduplicated.length);
      deduplicated.push(row);
      continue;
    }

    const existing = deduplicated[existingIndex];
    if (
      META_SIGNAL_SOURCE_PRIORITY[row.sourceType] >
      META_SIGNAL_SOURCE_PRIORITY[existing.sourceType]
    ) {
      deduplicated[existingIndex] = row;
    }
  }

  return deduplicated;
}

function mapGlobalTempoMetric(row: Record<string, unknown>): GlobalTempoMetric {
  return {
    averageGeneration: readNumberField(row, 'averageGeneration'),
    averagePointsPerGeneration: readNumberField(
      row,
      'averagePointsPerGeneration',
    ),
    averageScore: readNumberField(row, 'averageScore'),
    bucket: readOneOf(
      row.bucket,
      ['long', 'short', 'standard'] as const,
      'standard',
    ),
    games: readNumberField(row, 'games'),
    label: readString(row.label),
    playerResults: readNumberField(row, 'playerResults'),
    winRate: readNumberField(row, 'winRate'),
    wins: readNumberField(row, 'wins'),
  };
}

function mapGlobalTerraformingShareMetric(
  row: Record<string, unknown>,
): GlobalTerraformingShareMetric {
  return {
    actionShare: readNumberField(row, 'actionShare'),
    heatActions: readFirstNumberField(row, [
      'heatActions',
      'temperatureActions',
      'temperature',
    ]),
    oceanActions: readFirstNumberField(row, ['oceanActions', 'oceans']),
    oxygenActions: readFirstNumberField(row, ['oxygenActions', 'oxygen']),
    playerId: readString(row.playerId),
    playerName: readString(row.playerName),
    totalActions: readFirstNumberField(row, ['totalActions', 'total']),
  };
}

async function normalizeGlobalTerraformingShareMetrics(
  supabase: AnalyticsSupabaseClient,
  rows: GlobalTerraformingShareMetric[],
): Promise<GlobalTerraformingShareMetric[]> {
  const playerIds = [...new Set(rows.map((row) => row.playerId).filter(Boolean))];

  if (playerIds.length === 0) {
    return rows;
  }

  const { data: players, error } = await supabase
    .from('players')
    .select('id, display_name, linked_user_id, normalized_display_name')
    .in('id', playerIds);

  if (error) {
    throw error;
  }

  const usernameByPlayerId = await fetchUsernamesByPlayerId(supabase, playerIds);
  const labelByPlayerId = buildAnalyticsPlayerLabelMap(
    playerIds,
    usernameByPlayerId,
  );
  const identityByPlayerId = new Map<string, CanonicalIdentity>();
  const displayNameByCanonical = new Map<string, string>();
  const linkedPreferredCanonicals = new Set<string>();

  for (const player of (players ?? []) as PlayerIdentityRow[]) {
    const canonicalId = canonicalPersonId(player);
    const label = labelByPlayerId.get(player.id) ?? 'Unclaimed player';
    identityByPlayerId.set(player.id, {
      canonicalId,
      displayName: label,
    });

    const isLinked = Boolean(player.linked_user_id);
    const shouldPreferName =
      !displayNameByCanonical.has(canonicalId) ||
      (isLinked && !linkedPreferredCanonicals.has(canonicalId));

    if (shouldPreferName) {
      displayNameByCanonical.set(canonicalId, label);

      if (isLinked) {
        linkedPreferredCanonicals.add(canonicalId);
      }
    }
  }

  const merged = new Map<string, GlobalTerraformingShareMetric>();

  for (const row of rows) {
    const identity = identityByPlayerId.get(row.playerId);
    const canonicalId = identity?.canonicalId ?? row.playerId;
    const playerName =
      (canonicalId ? displayNameByCanonical.get(canonicalId) : null) ??
      identity?.displayName ??
      labelByPlayerId.get(row.playerId) ??
      'Unclaimed player';
    const key = canonicalId || row.playerName;
    const existing = merged.get(key);

    if (existing) {
      existing.actionShare = roundNumber(existing.actionShare + row.actionShare, 4);
      existing.heatActions += row.heatActions;
      existing.oceanActions += row.oceanActions;
      existing.oxygenActions += row.oxygenActions;
      existing.totalActions += row.totalActions;
      continue;
    }

    merged.set(key, {
      ...row,
      playerId: canonicalId || row.playerId,
      playerName,
    });
  }

  return [...merged.values()].sort(
    (left, right) =>
      right.totalActions - left.totalActions ||
      right.actionShare - left.actionShare ||
      left.playerName.localeCompare(right.playerName),
  );
}

function mapGlobalObjectiveConversionMetric(
  row: Record<string, unknown>,
): GlobalObjectiveConversionMetric {
  return {
    actions: readNumberField(row, 'actions'),
    conversionRate: readNumberField(row, 'conversionRate'),
    label: readString(row.label),
    objectiveType: readOneOf(
      row.objectiveType,
      ['award', 'milestone'] as const,
      'milestone',
    ),
    snipedActions: readNullableNumberField(row, 'snipedActions'),
    snipedRate: readNullableNumberField(row, 'snipedRate'),
    winRate: readNumberField(row, 'winRate'),
    wins: readNumberField(row, 'wins'),
  };
}

function mapGlobalMapTableMetric(
  row: Record<string, unknown>,
): GlobalMapTableMetric {
  return {
    averageGeneration: readNumberField(row, 'averageGeneration'),
    averageScore: readNumberField(row, 'averageScore'),
    category: readOneOf(row.category, ['map', 'tableSize'] as const, 'map'),
    games: readNumberField(row, 'games'),
    label: readString(row.label),
    playerResults: readNumberField(row, 'playerResults'),
    winRate: readNullableNumberField(row, 'winRate'),
  };
}

function mapGlobalOpeningComboMetric(
  row: Record<string, unknown>,
): GlobalOpeningComboMetric {
  return {
    averageScore: readNumberField(row, 'averageScore'),
    corporationName: readString(row.corporationName),
    label: readString(row.label),
    plays: readNumberField(row, 'plays'),
    preludeLabel: readString(row.preludeLabel),
    scoreDeviation: readNumberField(row, 'scoreDeviation'),
    signalType: readOneOf(
      row.signalType,
      ['best', 'highVariance', 'trap'] as const,
      'best',
    ),
    winRate: readNumberField(row, 'winRate'),
    wins: readNumberField(row, 'wins'),
  };
}

function mapGlobalCardTimingMetric(
  row: Record<string, unknown>,
): GlobalCardTimingMetric {
  return {
    cardName: readString(row.cardName),
    earlyPlays: readNumberField(row, 'earlyPlays'),
    earlyWinRate: readNumberField(row, 'earlyWinRate'),
    earlyWins: readNumberField(row, 'earlyWins'),
    latePlays: readNumberField(row, 'latePlays'),
    lateWinRate: readNumberField(row, 'lateWinRate'),
    lateWins: readNumberField(row, 'lateWins'),
    winRateDelta: readNumberField(row, 'winRateDelta'),
  };
}

function mapGlobalInsightMetrics(value: unknown): GlobalInsightMetrics {
  const payload = asRecord(value);

  return {
    cardTiming: readRecordArray(payload.cardTiming).map(
      mapGlobalCardTimingMetric,
    ),
    mapTableMeta: readRecordArray(payload.mapTableMeta).map(
      mapGlobalMapTableMetric,
    ),
    metaSignals: deduplicateGlobalMetaSignals(
      readRecordArray(payload.metaSignals).map(mapGlobalMetaSignal),
    ),
    objectiveConversion: readRecordArray(payload.objectiveConversion).map(
      mapGlobalObjectiveConversionMetric,
    ),
    openingCombos: readRecordArray(payload.openingCombos).map(
      mapGlobalOpeningComboMetric,
    ),
    summary: mapGlobalInsightSummary(payload.summary),
    tempoProfile: readRecordArray(payload.tempoProfile).map(
      mapGlobalTempoMetric,
    ),
    terraformingShare: readRecordArray(payload.terraformingShare).map(
      mapGlobalTerraformingShareMetric,
    ),
  };
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

/**
 * Rewrite each lineup row's comma-joined `lineup_label` (built in SQL from the
 * co-players' raw `display_name`s) to analytics-safe labels. If any co-player
 * cannot be resolved to a username, use a non-identifying placeholder instead
 * of preserving the raw SQL label.
 */
export function rewriteLineupLabels(
  rows: RawLineupEffectRow[],
  labelForId: (playerId: string) => string | undefined,
): void {
  for (const row of rows) {
    if (!row.lineup_key) {
      continue;
    }
    const ids = row.lineup_key.split(',').filter(Boolean);
    if (ids.length === 0) {
      continue;
    }
    let unclaimedIndex = 1;
    const labels = ids.map((id) => {
      const label = labelForId(id);
      if (label) {
        return label;
      }
      const fallback = `Unclaimed player ${unclaimedIndex}`;
      unclaimedIndex += 1;
      return fallback;
    });

    row.lineup_label = labels
      .sort((a, b) => a.localeCompare(b))
      .join(', ');
  }
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
    generationCount: toNumber(row.generation_count),
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
    generationCount: toNumber(row.generation_count),
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
  'award_points, card_points_animals, card_points_jovian, card_points_microbes, card_points_total, cities_points, declared_modifier_style_codes, declared_primary_style_code, game_id, generation_count, greenery_points, group_id, has_full_card_breakdown, inferred_primary_style_code, inferred_style_confidence, is_winner, key_card_count, loss_gap_points, milestone_points, other_card_points, placement, placement_score, player_id, player_name, signed_differential_points, total_points, tr_points, win_differential_points';

const FOCUS_RESULT_SELECT = `${PROFILE_RESULT_SELECT}, played_on`;
const SHARED_RESULT_SELECT = `${FOCUS_RESULT_SELECT}, map_id, player_count`;

type RawFocusGameResultRow = RawProfileGameResultRow & {
  played_on: string;
};

type FocusGameResultRow = ProfileGameResultRow & {
  playedOn: string;
};

type RawSharedGameResultRow = RawFocusGameResultRow & {
  map_id: null | string;
  player_count: number | string;
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
    playedOn: row.played_on,
  };
}

function mapSharedGameResultRow(row: RawSharedGameResultRow): SharedGameResultRow {
  return {
    ...mapFocusGameResultRow(row),
    mapId: row.map_id,
    playerCount: toNumber(row.player_count),
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

  const uniqueLabels = [
    ...new Set(linkedPlayers.map((player) => player.display_name.trim()).filter(Boolean)),
  ];

  if (uniqueLabels.length === 1) {
    return uniqueLabels[0] ?? 'My Profile';
  }

  return 'Your linked profiles';
}

function buildProfileScorePace(
  ownRows: ProfileGameResultRow[],
): ProfileScorePace | null {
  const pacedRows = ownRows.filter((row) => row.generationCount > 0);

  if (pacedRows.length === 0) {
    return null;
  }

  const averageScore = averageNumbers(ownRows.map((row) => row.totalPoints)) ?? 0;
  const sources: Array<{
    code: ProfileScorePaceRow['code'];
    getValue: (row: ProfileGameResultRow) => number;
    label: string;
  }> = [
    {
      code: 'terraform_rating',
      getValue: (row) => row.trPoints,
      label: 'Terraform Rating',
    },
    {
      code: 'cards',
      getValue: (row) => row.cardPointsTotal,
      label: 'Card Points',
    },
    {
      code: 'greenery',
      getValue: (row) => row.greeneryPoints,
      label: 'Greenery',
    },
    {
      code: 'milestones',
      getValue: (row) => row.milestonePoints,
      label: 'Milestones',
    },
    {
      code: 'cities',
      getValue: (row) => row.citiesPoints,
      label: 'Cities',
    },
  ];

  const rows = sources
    .map((source) => {
      const averagePoints =
        averageNumbers(ownRows.map((row) => source.getValue(row))) ?? 0;
      const averagePointsPerGeneration =
        averageNumbers(
          pacedRows.map((row) => source.getValue(row) / row.generationCount),
        ) ?? 0;

      return {
        averagePoints: roundNumber(averagePoints, 3),
        averagePointsPerGeneration: roundNumber(averagePointsPerGeneration, 3),
        code: source.code,
        label: source.label,
        scoreShare: roundNumber(
          averageScore > 0 ? averagePoints / averageScore : 0,
          4,
        ),
      } satisfies ProfileScorePaceRow;
    })
    .sort(
      (left, right) =>
        right.averagePointsPerGeneration - left.averagePointsPerGeneration ||
        right.averagePoints - left.averagePoints ||
        left.label.localeCompare(right.label),
    );

  return {
    averageGenerationCount: roundNumber(
      averageNumbers(pacedRows.map((row) => row.generationCount)) ?? 0,
      3,
    ),
    averageTotalPointsPerGeneration: roundNumber(
      averageNumbers(
        pacedRows.map((row) => row.totalPoints / row.generationCount),
      ) ?? 0,
      3,
    ),
    lightestSource:
      [...rows].sort(
        (left, right) =>
          left.averagePointsPerGeneration - right.averagePointsPerGeneration ||
          left.averagePoints - right.averagePoints ||
          left.label.localeCompare(right.label),
      )[0] ?? null,
    rows,
    strongestSource: rows[0] ?? null,
  };
}

function buildProfileLeadPressure(
  ownRows: ProfileGameResultRow[],
): ProfileLeadPressure | null {
  if (ownRows.length === 0) {
    return null;
  }

  const wins = ownRows.filter((row) => row.isWinner).length;
  const averageLeadWhenWinning = averageNumbers(
    ownRows
      .map((row) => row.winDifferentialPoints)
      .filter((value): value is number => value !== null),
  );
  const averageShortfallWhenBehind = averageNumbers(
    ownRows
      .map((row) => row.lossGapPoints)
      .filter((value): value is number => value !== null),
  );
  const averageScoreDifferential =
    averageNumbers(ownRows.map((row) => row.signedDifferentialPoints)) ?? 0;
  const closeGames = ownRows.filter(
    (row) => Math.abs(row.signedDifferentialPoints) <= 5,
  ).length;
  const dominantWins = ownRows.filter(
    (row) => (row.winDifferentialPoints ?? 0) >= 10,
  ).length;
  const leadRate = wins / ownRows.length;
  const closeGameRate = closeGames / ownRows.length;
  const dominantWinRate = dominantWins / ownRows.length;
  let pressureLabel = 'Balanced pressure';

  if (leadRate >= 0.5 && averageScoreDifferential >= 5) {
    pressureLabel = 'Front-runner';
  } else if (dominantWinRate >= 0.25) {
    pressureLabel = 'High-ceiling closer';
  } else if (closeGameRate >= 0.5) {
    pressureLabel = 'Close-game grinder';
  } else if (leadRate < 0.34) {
    pressureLabel = 'Chasing table leader';
  }

  return {
    averageLeadWhenWinning:
      averageLeadWhenWinning === null
        ? null
        : roundNumber(averageLeadWhenWinning, 3),
    averageScoreDifferential: roundNumber(averageScoreDifferential, 3),
    averageShortfallWhenBehind:
      averageShortfallWhenBehind === null
        ? null
        : roundNumber(averageShortfallWhenBehind, 3),
    closeGameRate: roundNumber(closeGameRate, 4),
    dominantWinRate: roundNumber(dominantWinRate, 4),
    gamesPlayed: ownRows.length,
    leadRate: roundNumber(leadRate, 4),
    pressureLabel,
  };
}

function getGameLengthBucket(generationCount: number): ProfileGameLengthBucket {
  if (generationCount <= 9) {
    return 'short';
  }

  if (generationCount <= 11) {
    return 'standard';
  }

  return 'long';
}

const GAME_LENGTH_LABELS: Record<
  ProfileGameLengthBucket,
  { label: string; rangeLabel: string }
> = {
  long: {
    label: 'Long Games',
    rangeLabel: '12+ generations',
  },
  short: {
    label: 'Short Games',
    rangeLabel: '9 or fewer generations',
  },
  standard: {
    label: 'Standard Games',
    rangeLabel: '10-11 generations',
  },
};

function sortGameLengthRows(rows: ProfileGameLengthRow[]) {
  const bucketOrder: Record<ProfileGameLengthBucket, number> = {
    short: 0,
    standard: 1,
    long: 2,
  };

  return [...rows].sort(
    (left, right) => bucketOrder[left.bucket] - bucketOrder[right.bucket],
  );
}

function buildProfileGameLengthProfile(
  ownRows: ProfileGameResultRow[],
): ProfileGameLengthProfile | null {
  const rowsWithLength = ownRows.filter((row) => row.generationCount > 0);

  if (rowsWithLength.length === 0) {
    return null;
  }

  const totals = new Map<
    ProfileGameLengthBucket,
    {
      generationCounts: number[];
      placements: number[];
      scores: number[];
      wins: number;
    }
  >();

  for (const row of rowsWithLength) {
    const bucket = getGameLengthBucket(row.generationCount);
    const current = totals.get(bucket) ?? {
      generationCounts: [],
      placements: [],
      scores: [],
      wins: 0,
    };

    current.generationCounts.push(row.generationCount);
    current.placements.push(row.placement);
    current.scores.push(row.totalPoints);
    current.wins += row.isWinner ? 1 : 0;
    totals.set(bucket, current);
  }

  const rows = sortGameLengthRows(
    [...totals.entries()].map(([bucket, total]) => {
      const gamesPlayed = total.scores.length;
      const label = GAME_LENGTH_LABELS[bucket];
      const averageGenerationCount =
        averageNumbers(total.generationCounts) ?? 0;
      const averageScore = averageNumbers(total.scores) ?? 0;

      return {
        averageGenerationCount: roundNumber(averageGenerationCount, 3),
        averagePlacement: roundNumber(
          averageNumbers(total.placements) ?? 0,
          3,
        ),
        averagePointsPerGeneration: roundNumber(
          averageGenerationCount > 0 ? averageScore / averageGenerationCount : 0,
          3,
        ),
        averageScore: roundNumber(averageScore, 3),
        bucket,
        gamesPlayed,
        label: label.label,
        rangeLabel: label.rangeLabel,
        winRate: roundNumber(total.wins / gamesPlayed, 4),
        wins: total.wins,
      } satisfies ProfileGameLengthRow;
    }),
  );

  const performanceSorted = [...rows].sort(
    (left, right) =>
      right.winRate - left.winRate ||
      left.averagePlacement - right.averagePlacement ||
      right.averageScore - left.averageScore ||
      right.gamesPlayed - left.gamesPlayed,
  );

  return {
    bestBucket: performanceSorted[0] ?? null,
    rows,
    weakestBucket: performanceSorted.at(-1) ?? null,
  };
}

function buildProfileAnalyticsFromRows(input: {
  cardOutcomeRows?: RawProfileCardRow[];
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
      expansionProfile: null,
      gameLengthProfile: null,
      globalParameterTempoProfile: null,
      styleAgreement: null,
      styleBreakdownRows: [],
      styleInsights: [],
      tagOutcomes: [],
      coverage: null,
      headToHeadRows: [],
      keyCards: [],
      leadPressure: null,
      lossCards: [],
      phaseTempoProfile: null,
      resourceRemovalProfile: null,
      scorePace: null,
      cardOutcomes: [],
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
  const scorePace = buildProfileScorePace(input.ownRows);
  const leadPressure = buildProfileLeadPressure(input.ownRows);
  const gameLengthProfile = buildProfileGameLengthProfile(input.ownRows);

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

  const styleTotals = new Map<
    string,
    {
      gamesPlayed: number;
      placementTotal: number;
      scoreTotal: number;
      wins: number;
    }
  >();
  const styleDenominator = input.ownRows.filter(
    (row) => row.inferredPrimaryStyleCode !== null,
  ).length;

  for (const row of input.ownRows) {
    if (!row.inferredPrimaryStyleCode) {
      continue;
    }

    const current = styleTotals.get(row.inferredPrimaryStyleCode) ?? {
      gamesPlayed: 0,
      placementTotal: 0,
      scoreTotal: 0,
      wins: 0,
    };

    current.gamesPlayed += 1;
    current.placementTotal += row.placement;
    current.scoreTotal += row.totalPoints;
    current.wins += row.isWinner ? 1 : 0;
    styleTotals.set(row.inferredPrimaryStyleCode, current);
  }

  const styleBreakdownRows = [...styleTotals.entries()]
    .map(([styleCode, total]) => ({
      averagePlacement: roundNumber(total.placementTotal / total.gamesPlayed, 3),
      averageScore: roundNumber(total.scoreTotal / total.gamesPlayed, 3),
      gamesPlayed: total.gamesPlayed,
      playRate: roundNumber(
        styleDenominator > 0 ? total.gamesPlayed / styleDenominator : 0,
        4,
      ),
      styleCode,
      styleName: formatStyleName(styleCode),
      winRate: roundNumber(total.wins / total.gamesPlayed, 4),
      wins: total.wins,
    }))
    .sort(
      (left, right) =>
        right.gamesPlayed - left.gamesPlayed ||
        right.wins - left.wins ||
        right.winRate - left.winRate ||
        left.styleName.localeCompare(right.styleName),
    );

  const styleInsights = buildProfileStyleInsights({
    cardOutcomeRows: input.cardOutcomeRows ?? [],
    ownRows: input.ownRows,
    styleBreakdownRows,
  });

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

  const headToHeadRows = [...headToHeadByOpponent.entries()]
    .map(([opponentId, row]) => ({
      opponentId,
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
    expansionProfile: null,
    scorePace,
    gameLengthProfile,
    globalParameterTempoProfile: null,
    leadPressure,
    styleAgreement,
    styleBreakdownRows,
    styleInsights,
    tagOutcomes: [],
    coverage,
    headToHeadRows,
    // Card lists come from dedicated analytics views, filled in by
    // getProfileAnalytics; row-derived callers leave them empty.
    keyCards: [],
    lossCards: [],
    phaseTempoProfile: null,
    resourceRemovalProfile: null,
    cardOutcomes: [],
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

export async function getGlobalInsightMetrics(): Promise<GlobalInsightMetrics> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_global_insight_metrics');

  if (error) {
    throw error;
  }

  const metrics = mapGlobalInsightMetrics(data);

  return {
    ...metrics,
    terraformingShare: await normalizeGlobalTerraformingShareMetrics(
      supabase,
      metrics.terraformingShare,
    ),
  };
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

  const rows = await resolvePlayerLabelsInRows(supabase, data as RawLeaderboardRow[]);
  return sortLeaderboardRows(rows.map(mapLeaderboardRow));
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

  const rows = await resolvePlayerLabelsInRows(
    supabase,
    data as RawPlayerScoreSourceAveragesRow[],
  );
  return rows
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

  const rows = await resolvePlayerLabelsInRows(supabase, data as RawHeadToHeadRow[]);
  return sortHeadToHeadRows(rows.map(mapHeadToHeadRow));
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

  const rows = await resolvePlayerLabelsInRows(
    supabase,
    data as RawPlayerStylePerformanceRow[],
  );
  return sortStylePerformanceRows(rows.map(mapPlayerStylePerformanceRow));
}

export type StyleEffectivenessScope = 'global' | 'group' | 'personal';

export type StyleEffectivenessRow = {
  averageGenerationCount: number;
  averagePlacement: number;
  averageScore: number;
  gamesPlayed: number;
  styleCode: string;
  winRate: number;
  wins: number;
};

export type StyleEffectivenessData = {
  scoreAverages: ScoreSourceAverages | null;
  styleRows: StyleEffectivenessRow[];
};

// Inferred-style effectiveness for a scope, via the SECURITY DEFINER
// get_style_effectiveness RPC: 'global' pools every finalized game, 'personal'
// the signed-in user's players, and 'group' a single group. Returns the play
// styles a player/group/field falls into plus their scoring averages.
export async function getStyleEffectiveness(
  scope: StyleEffectivenessScope,
  groupId?: string,
): Promise<StyleEffectivenessData> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_style_effectiveness', {
    p_group_id: groupId ?? null,
    p_scope: scope,
  });

  if (error) {
    throw error;
  }

  const payload = (data ?? {}) as Record<string, unknown>;

  return {
    scoreAverages:
      (payload.scoreAverages as ScoreSourceAverages | null) ?? null,
    styleRows: Array.isArray(payload.styleRows)
      ? (payload.styleRows as StyleEffectivenessRow[])
      : [],
  };
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

  const rows = await resolvePlayerLabelsInRows(
    supabase,
    data as RawPlayerInteractionRow[],
  );
  return sortInteractionRows(compactRows(rows.map(mapPlayerInteractionRow)));
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

  const rows = await resolvePlayerLabelsInRows(supabase, data as RawLineupEffectRow[]);
  const labelById = new Map(rows.map((row) => [row.player_id, row.player_name]));
  rewriteLineupLabels(rows, (id) => labelById.get(id));
  return sortLineupEffectRows(rows.map(mapLineupEffectRow));
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

  const rows = await resolvePlayerLabelsInRows(supabase, data as RawTrendRow[]);
  return sortTrendRows(rows.map(mapTrendRow));
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

  const rows = await resolvePlayerLabelsInRows(
    supabase,
    data as RawStyleAgreementRow[],
  );
  return sortStyleAgreementRows(rows.map(mapStyleAgreementRow));
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

  const [row] = await resolvePlayerLabelsInRows(
    supabase,
    data ? [data as RawCoverageRow] : [],
  );
  return row ? mapCoverageRow(row) : null;
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

  const rows = await resolvePlayerLabelsInRows(supabase, data as RawCoverageRow[]);
  return rows
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

// How many cards each profile card list shows before truncating. Enough to
// surface a player's signature cards without turning the profile into a table
// dump.
export const PROFILE_CARD_LIMIT = 12;

export type RawProfileCardRow = {
  card_id: string;
  card_name: string;
  corporation_name?: string | null;
  full_image_url?: string | null;
  game_id: string;
  is_winner: boolean;
  map_name?: string | null;
  outcome_method?: string | null;
  pace_bucket?: string | null;
  player_id: string;
  player_count?: number | null;
  style_code?: string | null;
  thumbnail_url?: string | null;
};

type RawGameLogImportRow = {
  game_id: string;
  id: string;
};

type RawGameLogEventRow = {
  board_space: string | null;
  card_id: string | null;
  event_order: number | string;
  event_type: string;
  game_log_import_id: string;
  generation_number: number | string | null;
  payload: Record<string, unknown> | null;
  raw_line: string | null;
  resource_amount: number | string | null;
  resource_type: string | null;
  tile_type: string | null;
};

type RawProfileGameLogAliasRow = {
  group_id: string;
  normalized_alias: string;
  player_id: string;
};

type RawProfileCardCatalogRow = {
  card_name: string;
  gameplay_tags: string[] | null;
  id: string;
  printed_victory_points: number | string | null;
};

function normalizeAnalyticsToken(value: null | string | undefined) {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getPayloadString(
  payload: RawGameLogEventRow['payload'],
  key: string,
) {
  const value = payload?.[key];

  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getPayloadStringFromKeys(
  payload: RawGameLogEventRow['payload'],
  keys: string[],
) {
  for (const key of keys) {
    const value = getPayloadString(payload, key);

    if (value) {
      return value;
    }
  }

  return null;
}

function getEventResourceDeltaKind(
  row: RawGameLogEventRow,
): 'production' | 'resource' {
  const explicitKind = getPayloadStringFromKeys(row.payload, [
    'deltaKind',
    'resourceDeltaKind',
  ]);

  if (normalizeAnalyticsToken(explicitKind).includes('production')) {
    return 'production';
  }

  if (normalizeAnalyticsToken(row.resource_type).includes('production')) {
    return 'production';
  }

  return 'resource';
}

function getEventResourceTrack(row: RawGameLogEventRow) {
  const rawResource =
    row.resource_type ??
    getPayloadString(row.payload, 'resourceType') ??
    'resource';
  const withoutProduction = rawResource
    .replace(/\bproduction\b/gi, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  const normalized = normalizeAnalyticsToken(
    withoutProduction || rawResource,
  ).replace(/s$/, '');

  return normalized || 'resource';
}

function getEventCardKey(row: RawGameLogEventRow) {
  if (row.card_id) {
    return `id:${row.card_id}`;
  }

  const cardName = getPayloadString(row.payload, 'cardName');

  return cardName ? `name:${normalizeAnalyticsToken(cardName)}` : null;
}

function getEventBoardSpace(row: RawGameLogEventRow) {
  return (
    row.board_space?.trim() ||
    getPayloadString(row.payload, 'boardSpace') ||
    getPayloadString(row.payload, 'spaceId') ||
    getPayloadString(row.payload, 'space')
  );
}

function getEventTileType(row: RawGameLogEventRow) {
  const normalized = normalizeAnalyticsToken(
    row.tile_type ?? getPayloadString(row.payload, 'tileType'),
  );

  if (normalized.includes('greenery')) {
    return 'greenery' as const;
  }

  if (normalized.includes('city')) {
    return 'city' as const;
  }

  if (normalized.includes('ocean')) {
    return 'ocean' as const;
  }

  return null;
}

function buildProfileActorLookup(
  sharedRows: ProfileGameResultRow[],
  aliases: RawProfileGameLogAliasRow[] = [],
) {
  const gameGroupIdByGameId = new Map<string, string>();
  const rowsByGameAndName = new Map<string, Map<string, ProfileGameResultRow>>();
  const rowsByGameAndPlayerId = new Map<string, Map<string, ProfileGameResultRow>>();
  const aliasPlayerIdByGroupAndName = new Map<string, string>();

  for (const row of sharedRows) {
    gameGroupIdByGameId.set(row.gameId, row.groupId);

    const gameRows = rowsByGameAndName.get(row.gameId) ?? new Map();
    const normalizedName = normalizeAnalyticsToken(row.playerName);

    if (normalizedName) {
      gameRows.set(normalizedName, row);
    }

    rowsByGameAndName.set(row.gameId, gameRows);

    const playerRows = rowsByGameAndPlayerId.get(row.gameId) ?? new Map();
    playerRows.set(row.playerId, row);
    rowsByGameAndPlayerId.set(row.gameId, playerRows);
  }

  for (const alias of aliases) {
    if (!alias.group_id || !alias.normalized_alias || !alias.player_id) {
      continue;
    }

    aliasPlayerIdByGroupAndName.set(
      `${alias.group_id}|${alias.normalized_alias}`,
      alias.player_id,
    );
  }

  return (gameId: string, actor: null | string) => {
    const normalizedActor = normalizeAnalyticsToken(actor);

    if (!normalizedActor) {
      return null;
    }

    const gameRowsByName = rowsByGameAndName.get(gameId);
    const exactNameMatch = gameRowsByName?.get(normalizedActor);

    if (exactNameMatch) {
      return exactNameMatch;
    }

    const groupId = gameGroupIdByGameId.get(gameId);
    const aliasPlayerId = groupId
      ? aliasPlayerIdByGroupAndName.get(`${groupId}|${normalizedActor}`)
      : null;

    return aliasPlayerId
      ? rowsByGameAndPlayerId.get(gameId)?.get(aliasPlayerId) ?? null
      : null;
  };
}

function isRemovedResourceChange(event: RawGameLogEventRow) {
  return (
    event.event_type === 'resource_changed' &&
    getPayloadString(event.payload, 'operation') === 'removed'
  );
}

function resolveResourceRemovalActors({
  event,
  gameId,
  lookupActor,
  sourceByCardKey,
}: {
  event: RawGameLogEventRow;
  gameId: string;
  lookupActor: ReturnType<typeof buildProfileActorLookup>;
  sourceByCardKey: Map<string, ProfileGameResultRow>;
}) {
  const explicitAffectedName = getPayloadStringFromKeys(event.payload, [
    'affectedPlayer',
    'targetPlayerName',
    'targetPlayer',
    'target',
    'opponent',
    'removedFrom',
  ]);
  const cardKey = getEventCardKey(event);

  if (explicitAffectedName) {
    return {
      affectedPlayer: lookupActor(gameId, explicitAffectedName),
      attribution: 'explicit' as const,
      sourcePlayer:
        lookupActor(
          gameId,
          getPayloadStringFromKeys(event.payload, [
            'sourcePlayerName',
            'sourceActor',
            'sourcePlayer',
            'attacker',
            'actor',
          ]),
        ) ??
        (cardKey ? sourceByCardKey.get(cardKey) ?? null : null),
    };
  }

  const explicitSourceName = getPayloadStringFromKeys(event.payload, [
    'sourcePlayerName',
    'sourceActor',
    'sourcePlayer',
    'attacker',
  ]);
  const explicitTargetName = getPayloadStringFromKeys(event.payload, [
    'targetPlayerName',
    'targetPlayer',
    'target',
    'opponent',
  ]);

  if (explicitSourceName || explicitTargetName) {
    const fallbackSourceName = getPayloadStringFromKeys(event.payload, [
      'sourceActor',
      'sourcePlayer',
      'attacker',
      'actor',
    ]);

    return {
      affectedPlayer: lookupActor(
        gameId,
        explicitTargetName ?? getPayloadString(event.payload, 'actor'),
      ),
      attribution: 'explicit' as const,
      sourcePlayer:
        lookupActor(gameId, explicitSourceName ?? fallbackSourceName) ??
        (cardKey ? sourceByCardKey.get(cardKey) ?? null : null),
    };
  }

  return {
    affectedPlayer: lookupActor(gameId, getPayloadString(event.payload, 'actor')),
    attribution: 'fallback' as const,
    sourcePlayer: cardKey ? sourceByCardKey.get(cardKey) ?? null : null,
  };
}

function hasExplicitResourceRemovalAttribution(event: RawGameLogEventRow) {
  const sourceName =
    getPayloadStringFromKeys(event.payload, [
      'sourcePlayerName',
      'sourceActor',
      'sourcePlayer',
      'attacker',
    ]) ?? getPayloadString(event.payload, 'actor');
  const targetName = getPayloadStringFromKeys(event.payload, [
    'targetPlayerName',
    'affectedPlayer',
    'targetPlayer',
    'target',
    'opponent',
    'removedFrom',
  ]);

  return Boolean(sourceName && targetName);
}

function emptyProfileResourceRemoval(): ProfileResourceRemoval {
  return {
    amountPerImportedGame: 0,
    events: 0,
    productionAmount: 0,
    productionEvents: 0,
    resourceAmount: 0,
    resourceEvents: 0,
    totalAmount: 0,
  };
}

const PROFILE_PHASE_LABELS: Record<ProfilePhase, string> = {
  early: 'Early Game',
  late: 'Late Game',
  mid: 'Mid Game',
};

function getProfilePhase(
  generationNumber: number,
  generationCount: number,
): ProfilePhase {
  const safeGenerationCount = Math.max(1, generationCount);
  const earlyCutoff = Math.max(1, Math.floor(safeGenerationCount / 3));
  const midCutoff = Math.max(1, Math.floor((safeGenerationCount * 2) / 3));

  if (generationNumber <= earlyCutoff) {
    return 'early';
  }

  if (generationNumber <= midCutoff) {
    return 'mid';
  }

  return 'late';
}

function getImportedLogGenerationCount(events: RawGameLogEventRow[]) {
  const generationNumbers = events
    .map((event) => toNullableNumber(event.generation_number))
    .filter((value): value is number => value !== null && value > 0);

  if (generationNumbers.length === 0) {
    return null;
  }

  return Math.max(...generationNumbers);
}

function getTempoGenerationCount(
  row: ProfileGameResultRow,
  importedLogGenerationCount: number | null,
) {
  if (row.generationCount > 0) {
    return row.generationCount;
  }

  return importedLogGenerationCount;
}

const PROFILE_GLOBAL_PARAMETER_ORDER: ProfileGlobalParameter[] = [
  'oxygen',
  'heat',
  'ocean',
];

const PROFILE_GLOBAL_PARAMETER_LABELS: Record<ProfileGlobalParameter, string> = {
  heat: 'Heat',
  ocean: 'Oceans',
  oxygen: 'Oxygen',
};

function normalizeGlobalParameterTempoToken(
  value: null | string,
): ProfileGlobalParameter | null {
  const normalized = normalizeAnalyticsToken(value);

  if (!normalized) {
    return null;
  }

  if (normalized.includes('oxygen')) {
    return 'oxygen';
  }

  if (normalized.includes('ocean')) {
    return 'ocean';
  }

  if (normalized.includes('heat') || normalized.includes('temperature')) {
    return 'heat';
  }

  return null;
}

function getEventGlobalParameter(row: RawGameLogEventRow) {
  if (row.event_type === 'tile_placed') {
    const normalizedTileType = normalizeAnalyticsToken(row.tile_type);

    if (normalizedTileType === 'greenery') {
      return 'oxygen';
    }

    if (normalizedTileType === 'ocean') {
      return 'ocean';
    }
  }

  return (
    normalizeGlobalParameterTempoToken(row.resource_type) ??
    normalizeGlobalParameterTempoToken(
      getPayloadString(row.payload, 'parameterType'),
    ) ??
    normalizeGlobalParameterTempoToken(getPayloadString(row.payload, 'parameter'))
  );
}

function getGlobalParameterTempoCode(parameters: ProfileGlobalParameter[]) {
  return `fast_${parameters.join('_')}`;
}

function getGlobalParameterTempoLabel(parameters: ProfileGlobalParameter[]) {
  return `Fast ${parameters
    .map((parameter) => PROFILE_GLOBAL_PARAMETER_LABELS[parameter])
    .join(' + ')}`;
}

function buildProfileGlobalParameterTempoProfile({
  aliases = [],
  events,
  imports,
  linkedPlayerIds,
  sharedRows,
}: {
  aliases?: RawProfileGameLogAliasRow[];
  events: RawGameLogEventRow[];
  imports: RawGameLogImportRow[];
  linkedPlayerIds: string[];
  sharedRows: ProfileGameResultRow[];
}): ProfileGlobalParameterTempoProfile | null {
  if (imports.length === 0) {
    return null;
  }

  const ownPlayerIds = new Set(linkedPlayerIds);
  const importGameIds = new Map(
    imports.map((row) => [row.id, row.game_id] as const),
  );
  const importedGames = new Set(imports.map((row) => row.game_id)).size;
  const lookupActor = buildProfileActorLookup(sharedRows, aliases);
  const eventsByImport = new Map<string, RawGameLogEventRow[]>();
  const mixTotals = new Map<
    string,
    {
      fastGenerations: number[];
      parameters: ProfileGlobalParameter[];
      placements: number[];
      scores: number[];
      wins: number;
    }
  >();

  for (const event of events) {
    const importEvents = eventsByImport.get(event.game_log_import_id) ?? [];
    importEvents.push(event);
    eventsByImport.set(event.game_log_import_id, importEvents);
  }

  for (const [importId, importEvents] of eventsByImport) {
    const gameId = importGameIds.get(importId);

    if (!gameId) {
      continue;
    }

    const sortedEvents = [...importEvents].sort(
      (left, right) => toNumber(left.event_order) - toNumber(right.event_order),
    );
    const importedLogGenerationCount = getImportedLogGenerationCount(sortedEvents);
    const firstParameterGeneration = new Map<ProfileGlobalParameter, number>();
    let currentGeneration = 1;
    let gameSubject: ProfileGameResultRow | null = null;
    let gameGenerationCount: number | null = null;

    for (const event of sortedEvents) {
      const eventGeneration = toNullableNumber(event.generation_number);

      if (eventGeneration !== null && eventGeneration > 0) {
        currentGeneration = eventGeneration;
      }

      if (
        event.event_type !== 'global_parameter_changed' &&
        event.event_type !== 'tile_placed'
      ) {
        continue;
      }

      const parameter = getEventGlobalParameter(event);

      if (!parameter) {
        continue;
      }

      const actor = lookupActor(gameId, getPayloadString(event.payload, 'actor'));

      if (!actor || !ownPlayerIds.has(actor.playerId)) {
        continue;
      }

      const actorGenerationCount = getTempoGenerationCount(
        actor,
        importedLogGenerationCount,
      );

      if (!actorGenerationCount || actorGenerationCount <= 0) {
        continue;
      }

      gameSubject = gameSubject ?? actor;
      gameGenerationCount = gameGenerationCount ?? actorGenerationCount;

      const previousGeneration = firstParameterGeneration.get(parameter);

      if (
        previousGeneration === undefined ||
        currentGeneration < previousGeneration
      ) {
        firstParameterGeneration.set(parameter, currentGeneration);
      }
    }

    if (!gameSubject || !gameGenerationCount || firstParameterGeneration.size === 0) {
      continue;
    }

    const fastCutoffGeneration = Math.max(
      1,
      Math.ceil(gameGenerationCount / 2),
    );
    const fastParameters = PROFILE_GLOBAL_PARAMETER_ORDER.filter(
      (parameter) =>
        (firstParameterGeneration.get(parameter) ?? Infinity) <=
        fastCutoffGeneration,
    );

    if (fastParameters.length === 0) {
      continue;
    }

    const code = getGlobalParameterTempoCode(fastParameters);
    const current = mixTotals.get(code) ?? {
      fastGenerations: [],
      parameters: fastParameters,
      placements: [],
      scores: [],
      wins: 0,
    };
    const averageFastGeneration =
      averageNumbers(
        fastParameters.map(
          (parameter) => firstParameterGeneration.get(parameter) ?? 0,
        ),
      ) ?? 0;

    current.fastGenerations.push(averageFastGeneration);
    current.placements.push(gameSubject.placement);
    current.scores.push(gameSubject.totalPoints);
    current.wins += gameSubject.isWinner ? 1 : 0;
    mixTotals.set(code, current);
  }

  const rows = [...mixTotals.entries()]
    .map(([code, total]) => {
      const gamesPlayed = total.scores.length;

      return {
        averageFastGeneration: roundNumber(
          averageNumbers(total.fastGenerations) ?? 0,
          3,
        ),
        averagePlacement: roundNumber(
          averageNumbers(total.placements) ?? 0,
          3,
        ),
        averageScore: roundNumber(averageNumbers(total.scores) ?? 0, 3),
        code,
        gamesPlayed,
        label: getGlobalParameterTempoLabel(total.parameters),
        parameters: total.parameters,
        winRate: roundNumber(total.wins / gamesPlayed, 4),
        wins: total.wins,
      } satisfies ProfileGlobalParameterTempoRow;
    })
    .sort(
      (left, right) =>
        right.gamesPlayed - left.gamesPlayed ||
        left.parameters.length - right.parameters.length ||
        left.label.localeCompare(right.label),
    );

  const performanceSorted = [...rows].sort(
    (left, right) =>
      right.winRate - left.winRate ||
      left.averagePlacement - right.averagePlacement ||
      right.averageScore - left.averageScore ||
      right.gamesPlayed - left.gamesPlayed ||
      right.parameters.length - left.parameters.length,
  );
  const weaknessSorted = [...rows].sort(
    (left, right) =>
      left.winRate - right.winRate ||
      right.averagePlacement - left.averagePlacement ||
      left.averageScore - right.averageScore ||
      right.gamesPlayed - left.gamesPlayed ||
      right.parameters.length - left.parameters.length,
  );

  return {
    bestMix: performanceSorted[0] ?? null,
    confidenceLabel:
      'Imported log terraforming read: fast means your first oxygen, heat, or ocean raise happened by that game midpoint; combinations are exact fast-parameter mixes.',
    importedGames,
    rows,
    weakestMix: weaknessSorted[0] ?? null,
  };
}

function emptyPhaseEventTotals() {
  return {
    actions: 0,
    awardsFunded: 0,
    cardsPlayed: 0,
    citiesPlaced: 0,
    greeneriesPlaced: 0,
    milestonesClaimed: 0,
    removalEvents: 0,
    terraformingRaises: 0,
    tilesPlaced: 0,
  };
}

function getPhaseActionScore(totals: ReturnType<typeof emptyPhaseEventTotals>) {
  return (
    totals.cardsPlayed +
    totals.tilesPlaced * 1.25 +
    totals.terraformingRaises +
    totals.milestonesClaimed * 2 +
    totals.awardsFunded * 1.5 +
    totals.removalEvents
  );
}

function buildProfilePhaseTempoProfile({
  aliases = [],
  events,
  imports,
  linkedPlayerIds,
  sharedRows,
}: {
  aliases?: RawProfileGameLogAliasRow[];
  events: RawGameLogEventRow[];
  imports: RawGameLogImportRow[];
  linkedPlayerIds: string[];
  sharedRows: ProfileGameResultRow[];
}): ProfilePhaseTempoProfile | null {
  if (imports.length === 0) {
    return null;
  }

  const ownPlayerIds = new Set(linkedPlayerIds);
  const importGameIds = new Map(
    imports.map((row) => [row.id, row.game_id] as const),
  );
  const importedGames = new Set(imports.map((row) => row.game_id)).size;
  const lookupActor = buildProfileActorLookup(sharedRows, aliases);
  const eventsByImport = new Map<string, RawGameLogEventRow[]>();
  const phaseTotals = new Map<ProfilePhase, ReturnType<typeof emptyPhaseEventTotals>>(
    [
      ['early', emptyPhaseEventTotals()],
      ['mid', emptyPhaseEventTotals()],
      ['late', emptyPhaseEventTotals()],
    ],
  );
  const peakTotals = new Map<
    ProfilePhase,
    {
      placements: number[];
      scores: number[];
      wins: number;
    }
  >([
    ['early', { placements: [], scores: [], wins: 0 }],
    ['mid', { placements: [], scores: [], wins: 0 }],
    ['late', { placements: [], scores: [], wins: 0 }],
  ]);

  for (const event of events) {
    const importEvents = eventsByImport.get(event.game_log_import_id) ?? [];
    importEvents.push(event);
    eventsByImport.set(event.game_log_import_id, importEvents);
  }

  for (const [importId, importEvents] of eventsByImport) {
    const gameId = importGameIds.get(importId);

    if (!gameId) {
      continue;
    }

    const sortedEvents = [...importEvents].sort(
      (left, right) => toNumber(left.event_order) - toNumber(right.event_order),
    );
    const importedLogGenerationCount = getImportedLogGenerationCount(sortedEvents);
    const gamePhaseTotals = new Map<
      ProfilePhase,
      ReturnType<typeof emptyPhaseEventTotals>
    >([
      ['early', emptyPhaseEventTotals()],
      ['mid', emptyPhaseEventTotals()],
      ['late', emptyPhaseEventTotals()],
    ]);
    let currentGeneration = 1;
    let gameSubject: ProfileGameResultRow | null = null;
    const sourceByCardKey = new Map<string, ProfileGameResultRow>();

    for (const event of sortedEvents) {
      const eventGeneration = toNullableNumber(event.generation_number);

      if (eventGeneration !== null && eventGeneration > 0) {
        currentGeneration = eventGeneration;
      }

      if (event.event_type === 'generation_started') {
        continue;
      }

      const cardKey = getEventCardKey(event);
      const eventActor = lookupActor(gameId, getPayloadString(event.payload, 'actor'));

      if (event.event_type === 'card_played' && cardKey && eventActor) {
        sourceByCardKey.set(cardKey, eventActor);
      }

      const removalActors = isRemovedResourceChange(event)
        ? resolveResourceRemovalActors({
            event,
            gameId,
            lookupActor,
            sourceByCardKey,
          })
        : null;
      const actor = removalActors?.sourcePlayer ?? eventActor;

      if (!actor || !ownPlayerIds.has(actor.playerId)) {
        continue;
      }

      const actorGenerationCount = getTempoGenerationCount(
        actor,
        importedLogGenerationCount,
      );

      if (!actorGenerationCount || actorGenerationCount <= 0) {
        continue;
      }

      gameSubject = gameSubject ?? actor;

      const phase = getProfilePhase(currentGeneration, actorGenerationCount);
      const globalTotals = phaseTotals.get(phase) ?? emptyPhaseEventTotals();
      const gameTotals = gamePhaseTotals.get(phase) ?? emptyPhaseEventTotals();
      const addAction = () => {
        globalTotals.actions += 1;
        gameTotals.actions += 1;
      };

      if (event.event_type === 'card_played') {
        addAction();
        globalTotals.cardsPlayed += 1;
        gameTotals.cardsPlayed += 1;
      } else if (event.event_type === 'tile_placed') {
        addAction();
        globalTotals.tilesPlaced += 1;
        gameTotals.tilesPlaced += 1;

        if (event.tile_type?.toLowerCase() === 'greenery') {
          globalTotals.greeneriesPlaced += 1;
          gameTotals.greeneriesPlaced += 1;
        }

        if (event.tile_type?.toLowerCase() === 'city') {
          globalTotals.citiesPlaced += 1;
          gameTotals.citiesPlaced += 1;
        }
      } else if (event.event_type === 'milestone_claimed') {
        addAction();
        globalTotals.milestonesClaimed += 1;
        gameTotals.milestonesClaimed += 1;
      } else if (event.event_type === 'award_funded') {
        addAction();
        globalTotals.awardsFunded += 1;
        gameTotals.awardsFunded += 1;
      } else if (
        event.event_type === 'global_parameter_changed' &&
        getEventGlobalParameter(event)
      ) {
        addAction();
        globalTotals.terraformingRaises += 1;
        gameTotals.terraformingRaises += 1;
      } else if (isRemovedResourceChange(event)) {
        addAction();
        globalTotals.removalEvents += 1;
        gameTotals.removalEvents += 1;
      }

      phaseTotals.set(phase, globalTotals);
      gamePhaseTotals.set(phase, gameTotals);
    }

    if (!gameSubject) {
      continue;
    }

    const peakPhase = [...gamePhaseTotals.entries()]
      .map(([phase, totals]) => ({
        phase,
        score: getPhaseActionScore(totals),
      }))
      .filter((entry) => entry.score > 0)
      .sort(
        (left, right) =>
          right.score - left.score ||
          ['early', 'mid', 'late'].indexOf(left.phase) -
            ['early', 'mid', 'late'].indexOf(right.phase),
      )[0]?.phase;

    if (!peakPhase) {
      continue;
    }

    const peak = peakTotals.get(peakPhase);

    if (!peak) {
      continue;
    }

    peak.placements.push(gameSubject.placement);
    peak.scores.push(gameSubject.totalPoints);
    peak.wins += gameSubject.isWinner ? 1 : 0;
  }

  const phaseOrder: ProfilePhase[] = ['early', 'mid', 'late'];
  const rows = phaseOrder.map((phase) => {
    const totals = phaseTotals.get(phase) ?? emptyPhaseEventTotals();
    const peak = peakTotals.get(phase) ?? {
      placements: [],
      scores: [],
      wins: 0,
    };
    const gamesWithPeak = peak.scores.length;

    return {
      actions: totals.actions,
      actionsPerImportedGame: roundNumber(
        importedGames > 0 ? totals.actions / importedGames : 0,
        3,
      ),
      awardsFunded: totals.awardsFunded,
      averagePlacementWhenPeak:
        gamesWithPeak > 0
          ? roundNumber(averageNumbers(peak.placements) ?? 0, 3)
          : null,
      averageScoreWhenPeak:
        gamesWithPeak > 0
          ? roundNumber(averageNumbers(peak.scores) ?? 0, 3)
          : null,
      cardsPlayed: totals.cardsPlayed,
      citiesPlaced: totals.citiesPlaced,
      gamesWithPeak,
      greeneriesPlaced: totals.greeneriesPlaced,
      label: PROFILE_PHASE_LABELS[phase],
      milestonesClaimed: totals.milestonesClaimed,
      phase,
      removalEvents: totals.removalEvents,
      tilesPlaced: totals.tilesPlaced,
      winRateWhenPeak:
        gamesWithPeak > 0 ? roundNumber(peak.wins / gamesWithPeak, 4) : null,
      winsWhenPeak: peak.wins,
    } satisfies ProfilePhaseTempoRow;
  });

  const mostActivePhase =
    [...rows].sort(
      (left, right) =>
        right.actionsPerImportedGame - left.actionsPerImportedGame ||
        right.actions - left.actions ||
        phaseOrder.indexOf(left.phase) - phaseOrder.indexOf(right.phase),
    )[0] ?? null;
  const bestPhase =
    [...rows]
      .filter((row) => row.gamesWithPeak > 0 && row.winRateWhenPeak !== null)
      .sort(
        (left, right) =>
          (right.winRateWhenPeak ?? 0) - (left.winRateWhenPeak ?? 0) ||
          (left.averagePlacementWhenPeak ?? Infinity) -
            (right.averagePlacementWhenPeak ?? Infinity) ||
          (right.averageScoreWhenPeak ?? 0) - (left.averageScoreWhenPeak ?? 0),
      )[0] ?? null;

  return {
    bestPhase,
    confidenceLabel:
      'Imported log phase read: early, mid, and late are split by each game generation count and use logged actions as the tempo signal.',
    importedGames,
    mostActivePhase,
    rows,
  };
}

function buildProfileResourceRemovalProfile({
  aliases = [],
  events,
  imports,
  linkedPlayerIds,
  sharedRows,
}: {
  aliases?: RawProfileGameLogAliasRow[];
  events: RawGameLogEventRow[];
  imports: RawGameLogImportRow[];
  linkedPlayerIds: string[];
  sharedRows: ProfileGameResultRow[];
}): ProfileResourceRemovalProfile | null {
  if (imports.length === 0) {
    return null;
  }

  const ownPlayerIds = new Set(linkedPlayerIds);
  const importGameIds = new Map(
    imports.map((row) => [row.id, row.game_id] as const),
  );
  const importedGames = new Set(imports.map((row) => row.game_id)).size;
  const lookupActor = buildProfileActorLookup(sharedRows, aliases);
  const eventsByImport = new Map<string, RawGameLogEventRow[]>();

  for (const event of events) {
    const importEvents = eventsByImport.get(event.game_log_import_id) ?? [];
    importEvents.push(event);
    eventsByImport.set(event.game_log_import_id, importEvents);
  }

  let totalRemovalEvents = 0;
  let explicitAttributionEvents = 0;
  let fallbackAttributionEvents = 0;
  const incoming = emptyProfileResourceRemoval();
  const outgoing = emptyProfileResourceRemoval();
  const resourceTotals = new Map<
    string,
    {
      amount: number;
      deltaKind: 'production' | 'resource';
      events: number;
      resourceType: string;
    }
  >();
  const addRemoval = (
    bucket: ProfileResourceRemoval,
    amount: number,
    deltaKind: 'production' | 'resource',
  ) => {
    bucket.events += 1;
    bucket.totalAmount += amount;

    if (deltaKind === 'production') {
      bucket.productionAmount += amount;
      bucket.productionEvents += 1;
    } else {
      bucket.resourceAmount += amount;
      bucket.resourceEvents += 1;
    }
  };

  for (const [importId, importEvents] of eventsByImport) {
    const gameId = importGameIds.get(importId);

    if (!gameId) {
      continue;
    }

    const sourceByCardKey = new Map<string, ProfileGameResultRow>();
    const sortedEvents = [...importEvents].sort(
      (left, right) => toNumber(left.event_order) - toNumber(right.event_order),
    );

    for (const event of sortedEvents) {
      const cardKey = getEventCardKey(event);

      if (event.event_type === 'card_played' && cardKey) {
        const actor = lookupActor(gameId, getPayloadString(event.payload, 'actor'));

        if (actor) {
          sourceByCardKey.set(cardKey, actor);
        }

        continue;
      }

      if (!isRemovedResourceChange(event)) {
        continue;
      }

      const { affectedPlayer, sourcePlayer } = resolveResourceRemovalActors({
        event,
        gameId,
        lookupActor,
        sourceByCardKey,
      });
      const amount = Math.max(toNumber(event.resource_amount), 0);
      const deltaKind = getEventResourceDeltaKind(event);
      const resourceType = getEventResourceTrack(event);
      const resourceKey = `${deltaKind}:${resourceType}`;
      const resourceTotal = resourceTotals.get(resourceKey) ?? {
        amount: 0,
        deltaKind,
        events: 0,
        resourceType,
      };

      if (!affectedPlayer || !sourcePlayer) {
        continue;
      }

      const affectedIsOwn = ownPlayerIds.has(affectedPlayer.playerId);
      const sourceIsOwn = ownPlayerIds.has(sourcePlayer.playerId);

      // Spending a resource from one's own card (Asteroid Rights, microbes,
      // animals, etc.) is a cost/activation, not interaction pressure. Keep
      // this profile strictly player-versus-player so self-removal cannot
      // create a misleading affected-track total with zero incoming/outgoing.
      if (affectedPlayer.playerId === sourcePlayer.playerId) {
        continue;
      }

      totalRemovalEvents += 1;
      if (hasExplicitResourceRemovalAttribution(event)) {
        explicitAttributionEvents += 1;
      } else {
        fallbackAttributionEvents += 1;
      }

      resourceTotal.amount += amount;
      resourceTotal.events += 1;
      resourceTotals.set(resourceKey, resourceTotal);

      if (sourceIsOwn && !affectedIsOwn) {
        addRemoval(outgoing, amount, deltaKind);
      } else if (affectedIsOwn && !sourceIsOwn) {
        addRemoval(incoming, amount, deltaKind);
      }
    }
  }

  for (const bucket of [incoming, outgoing]) {
    bucket.totalAmount = roundNumber(bucket.totalAmount, 3);
    bucket.productionAmount = roundNumber(bucket.productionAmount, 3);
    bucket.resourceAmount = roundNumber(bucket.resourceAmount, 3);
    bucket.amountPerImportedGame = roundNumber(
      importedGames > 0 ? bucket.totalAmount / importedGames : 0,
      3,
    );
  }

  return {
    confidenceLabel:
      fallbackAttributionEvents > 0
        ? 'Imported log removals use stored source/target players when available; older rows fall back to prior played-card attribution by name or id.'
        : 'Imported log removals use stored source and target players, with stored-resource and production losses split.',
    explicitAttributionEvents,
    fallbackAttributionEvents,
    importedGames,
    incoming,
    outgoing,
    resourceRows: [...resourceTotals.values()]
      .map((row) => ({
        amount: roundNumber(row.amount, 3),
        deltaKind: row.deltaKind,
        events: row.events,
        resourceType: row.resourceType,
      }))
      .sort(
        (left, right) =>
          right.amount - left.amount ||
          right.events - left.events ||
          left.deltaKind.localeCompare(right.deltaKind) ||
          left.resourceType.localeCompare(right.resourceType),
      ),
    totalRemovalEvents,
  };
}

function formatExpansionNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'n/a';
  }

  return formatInsightNumber(roundNumber(value, 3));
}

function formatExpansionPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'n/a';
  }

  return formatInsightPercent(value);
}

function expansionMetric(
  label: string,
  value: string,
  detail?: string,
): ProfileExpansionMetric {
  return detail ? { detail, label, value } : { label, value };
}

function standardDeviation(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const average = averageNumbers(values) ?? 0;
  const variance =
    averageNumbers(values.map((value) => (value - average) ** 2)) ?? 0;

  return Math.sqrt(variance);
}

function getProfileScoreSourceSeries(ownRows: ProfileGameResultRow[]) {
  return [
    {
      code: 'terraform_rating',
      label: 'Terraform Rating',
      values: ownRows.map((row) => row.trPoints),
    },
    {
      code: 'cards',
      label: 'Card Points',
      values: ownRows.map((row) => row.cardPointsTotal),
    },
    {
      code: 'greenery',
      label: 'Greenery',
      values: ownRows.map((row) => row.greeneryPoints),
    },
    {
      code: 'cities',
      label: 'Cities',
      values: ownRows.map((row) => row.citiesPoints),
    },
    {
      code: 'milestones',
      label: 'Milestones',
      values: ownRows.map((row) => row.milestonePoints),
    },
    {
      code: 'awards',
      label: 'Awards',
      values: ownRows.map((row) => row.awardPoints),
    },
  ];
}

function getProfileScoreReliabilityRows(ownRows: ProfileGameResultRow[]) {
  return getProfileScoreSourceSeries(ownRows)
    .map((source) => {
      const average = averageNumbers(source.values) ?? 0;
      const deviation = standardDeviation(source.values) ?? 0;

      return {
        ...source,
        average: roundNumber(average, 3),
        coefficientOfVariation:
          average > 0 ? roundNumber(deviation / average, 4) : null,
        standardDeviation: roundNumber(deviation, 3),
      };
    })
    .filter((source) => source.average > 0);
}

function getCardCatalogEntry(
  event: RawGameLogEventRow,
  cardById: Map<string, RawProfileCardCatalogRow>,
  cardByName: Map<string, RawProfileCardCatalogRow>,
) {
  if (event.card_id) {
    const card = cardById.get(event.card_id);

    if (card) {
      return card;
    }
  }

  const cardName = getPayloadString(event.payload, 'cardName');

  return cardName ? cardByName.get(normalizeAnalyticsToken(cardName)) ?? null : null;
}

function normalizeGameplayTags(tags: string[] | null) {
  return (tags ?? [])
    .map((tag) => normalizeAnalyticsToken(tag))
    .filter(Boolean)
    .map((tag) => formatStyleName(tag));
}

function topExpansionEntry(entries: Map<string, number>) {
  return [...entries.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )[0] ?? null;
}

function getExpansionTitle(
  code: ProfileExpansionCode,
): ProfileExpansionSection['title'] {
  const titles: Record<ProfileExpansionCode, string> = {
    board_control: 'Board Control',
    comeback_front_runner: 'Comeback / Front-Runner',
    corporation_prelude_fit: 'Corporation / Prelude Fit',
    engine_shape: 'Engine Shape',
    game_speed_matchup: 'Game-Speed Matchup',
    improvement_coach: 'Improvement Coach',
    interaction_personality: 'Interaction Personality',
    opening_profile: 'Opening Profile',
    opponent_adjusted: 'Opponent-Adjusted Performance',
    scoring_reliability: 'Scoring Source Reliability',
  };

  return titles[code];
}

function buildExpansionSection(input: {
  code: ProfileExpansionCode;
  confidenceLabel: string;
  metrics: ProfileExpansionMetric[];
  summary: string;
}): ProfileExpansionSection {
  return {
    ...input,
    title: getExpansionTitle(input.code),
  };
}

function buildProfileExpansionProfile({
  aliases = [],
  cardCatalogRows,
  events,
  gameLengthProfile,
  globalParameterTempoProfile,
  headToHeadRows,
  imports,
  leadPressure,
  linkedPlayerIds,
  ownRows,
  phaseTempoProfile,
  resourceRemovalProfile,
  sharedRows,
  styleBreakdownRows,
}: {
  aliases?: RawProfileGameLogAliasRow[];
  cardCatalogRows: RawProfileCardCatalogRow[];
  events: RawGameLogEventRow[];
  gameLengthProfile: ProfileGameLengthProfile | null;
  globalParameterTempoProfile: ProfileGlobalParameterTempoProfile | null;
  headToHeadRows: ProfileHeadToHeadRow[];
  imports: RawGameLogImportRow[];
  leadPressure: ProfileLeadPressure | null;
  linkedPlayerIds: string[];
  ownRows: ProfileGameResultRow[];
  phaseTempoProfile: ProfilePhaseTempoProfile | null;
  resourceRemovalProfile: ProfileResourceRemovalProfile | null;
  sharedRows: ProfileGameResultRow[];
  styleBreakdownRows: ProfileStyleBreakdownRow[];
}): ProfileExpansionProfile | null {
  if (ownRows.length === 0) {
    return null;
  }

  const ownPlayerIds = new Set(linkedPlayerIds);
  const importGameIds = new Map(
    imports.map((row) => [row.id, row.game_id] as const),
  );
  const lookupActor = buildProfileActorLookup(sharedRows, aliases);
  const eventsByImport = new Map<string, RawGameLogEventRow[]>();
  const cardById = new Map(cardCatalogRows.map((card) => [card.id, card]));
  const cardByName = new Map(
    cardCatalogRows.map((card) => [
      normalizeAnalyticsToken(card.card_name),
      card,
    ]),
  );
  const boardMap = getBoardSpaceMap('tharsis');
  const opening = {
    cardsPlayed: 0,
    loggedGains: 0,
    milestonesClaimed: 0,
    terraformingRaises: 0,
  };
  const engine = {
    cardPrintedVp: 0,
    cardsPlayed: 0,
    loggedGains: 0,
  };
  const tagCounts = new Map<string, number>();
  const tileEvents: Array<{
    actorIsOwn: boolean;
    spaceId: string | null;
    tileType: 'city' | 'greenery' | 'ocean';
  }> = [];
  const generationSnapshots = new Map<
    string,
    {
      awardsFunded: number;
      cardPrintedVp: number;
      cities: number;
      gameId: string;
      generation: number;
      greeneries: number;
      milestonesClaimed: number;
      secondPlaceAwards: number;
      trRaises: number;
    }
  >();
  const milestoneClaimGenerations: number[] = [];
  const awardFundingGenerations: number[] = [];
  let secondPlaceAwardOutcomes = 0;
  const getGenerationSnapshot = (gameId: string, generation: number) => {
    const key = `${gameId}:${generation}`;
    const existing = generationSnapshots.get(key);

    if (existing) {
      return existing;
    }

    const snapshot = {
      awardsFunded: 0,
      cardPrintedVp: 0,
      cities: 0,
      gameId,
      generation,
      greeneries: 0,
      milestonesClaimed: 0,
      secondPlaceAwards: 0,
      trRaises: 0,
    };

    generationSnapshots.set(key, snapshot);
    return snapshot;
  };

  for (const event of events) {
    const importEvents = eventsByImport.get(event.game_log_import_id) ?? [];
    importEvents.push(event);
    eventsByImport.set(event.game_log_import_id, importEvents);
  }

  for (const [importId, importEvents] of eventsByImport) {
    const gameId = importGameIds.get(importId);

    if (!gameId) {
      continue;
    }

    const sortedEvents = [...importEvents].sort(
      (left, right) => toNumber(left.event_order) - toNumber(right.event_order),
    );
    let currentGeneration = 1;

    for (const event of sortedEvents) {
      const eventGeneration = toNullableNumber(event.generation_number);

      if (eventGeneration !== null && eventGeneration > 0) {
        currentGeneration = eventGeneration;
      }

      const actor = lookupActor(gameId, getPayloadString(event.payload, 'actor'));
      const actorIsOwn = actor ? ownPlayerIds.has(actor.playerId) : false;
      const tileType = getEventTileType(event);

      if (event.event_type === 'tile_placed' && tileType) {
        tileEvents.push({
          actorIsOwn,
          spaceId: getEventBoardSpace(event),
          tileType,
        });
      }

      if (!actorIsOwn) {
        continue;
      }

      const isOpening = currentGeneration <= 3;
      const generationSnapshot = getGenerationSnapshot(gameId, currentGeneration);

      if (event.event_type === 'tile_placed') {
        if (tileType === 'greenery') {
          generationSnapshot.greeneries += 1;
        }

        if (tileType === 'city') {
          generationSnapshot.cities += 1;
        }
      }

      if (event.event_type === 'card_played') {
        engine.cardsPlayed += 1;

        if (isOpening) {
          opening.cardsPlayed += 1;
        }

        const card = getCardCatalogEntry(event, cardById, cardByName);

        if (card) {
          const printedVp = toNumber(card.printed_victory_points);

          engine.cardPrintedVp += printedVp;
          generationSnapshot.cardPrintedVp += printedVp;

          for (const tag of normalizeGameplayTags(card.gameplay_tags)) {
            tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
          }
        }
      } else if (
        event.event_type === 'global_parameter_changed' ||
        (event.event_type === 'tile_placed' && getEventGlobalParameter(event))
      ) {
        generationSnapshot.trRaises += 1;

        if (isOpening) {
          opening.terraformingRaises += 1;
        }
      } else if (event.event_type === 'milestone_claimed') {
        generationSnapshot.milestonesClaimed += 1;
        milestoneClaimGenerations.push(currentGeneration);

        if (isOpening) {
          opening.milestonesClaimed += 1;
        }
      } else if (event.event_type === 'award_funded') {
        generationSnapshot.awardsFunded += 1;
        awardFundingGenerations.push(currentGeneration);
      } else if (
        event.event_type === 'award_result' &&
        getPayloadString(event.payload, 'placement') === 'second'
      ) {
        generationSnapshot.secondPlaceAwards += 1;
        secondPlaceAwardOutcomes += 1;
      } else if (
        event.event_type === 'resource_changed' &&
        getPayloadString(event.payload, 'operation') === 'added'
      ) {
        const amount = Math.max(toNumber(event.resource_amount), 0);

        engine.loggedGains += amount;

        if (isOpening) {
          opening.loggedGains += amount;
        }
      }
    }
  }

  const totalGenerations =
    ownRows.reduce((sum, row) => sum + Math.max(row.generationCount, 0), 0) || null;
  const cardsPerGeneration =
    totalGenerations && totalGenerations > 0
      ? engine.cardsPlayed / totalGenerations
      : null;
  const gainsPerGeneration =
    totalGenerations && totalGenerations > 0
      ? engine.loggedGains / totalGenerations
      : null;
  const snapshotRows = [...generationSnapshots.values()];
  const snapshotCardPrintedVp = snapshotRows.reduce(
    (sum, snapshot) => sum + snapshot.cardPrintedVp,
    0,
  );
  const averageMilestoneGeneration = averageNumbers(milestoneClaimGenerations);
  const averageAwardFundingGeneration = averageNumbers(awardFundingGenerations);
  const topTag = topExpansionEntry(tagCounts);
  const reliabilityRows = getProfileScoreReliabilityRows(ownRows);
  const mostReliableSource =
    [...reliabilityRows].sort(
      (left, right) =>
        (left.coefficientOfVariation ?? Infinity) -
          (right.coefficientOfVariation ?? Infinity) ||
        right.average - left.average,
    )[0] ?? null;
  const swingiestSource =
    [...reliabilityRows].sort(
      (left, right) =>
        (right.coefficientOfVariation ?? -Infinity) -
          (left.coefficientOfVariation ?? -Infinity) ||
        right.average - left.average,
    )[0] ?? null;
  const totalScoreDeviation = standardDeviation(
    ownRows.map((row) => row.totalPoints),
  );
  const sharedRowsByGameId = new Map<string, ProfileGameResultRow[]>();

  for (const row of sharedRows) {
    const gameRows = sharedRowsByGameId.get(row.gameId) ?? [];
    gameRows.push(row);
    sharedRowsByGameId.set(row.gameId, gameRows);
  }

  const opponentAdjustedRows: Array<{
    opponentAverage: number;
    scoreEdge: number;
    won: boolean;
  }> = [];

  for (const ownRow of ownRows) {
    const gameRows = sharedRowsByGameId.get(ownRow.gameId) ?? [];
    const opponentRows = gameRows.filter((row) => !ownPlayerIds.has(row.playerId));
    const opponentAverage = averageNumbers(
      opponentRows.map((row) => row.totalPoints),
    );

    if (opponentAverage === null) {
      continue;
    }

    opponentAdjustedRows.push({
      opponentAverage,
      scoreEdge: ownRow.totalPoints - opponentAverage,
      won: ownRow.isWinner,
    });
  }

  const opponentAverageBaseline = averageNumbers(
    opponentAdjustedRows.map((row) => row.opponentAverage),
  );
  const strongerTableRows =
    opponentAverageBaseline === null
      ? []
      : opponentAdjustedRows.filter(
          (row) => row.opponentAverage >= opponentAverageBaseline,
        );
  const scoreVsOpponentAverage = averageNumbers(
    opponentAdjustedRows.map((row) => row.scoreEdge),
  );
  const strongerTableWinRate =
    strongerTableRows.length > 0
      ? strongerTableRows.filter((row) => row.won).length / strongerTableRows.length
      : null;
  const bestHeadToHead =
    [...headToHeadRows].sort(
      (left, right) =>
        right.averageScoreDifferential - left.averageScoreDifferential ||
        right.wins - left.wins ||
        right.gamesPlayed - left.gamesPlayed,
    )[0] ?? null;
  const hardestHeadToHead =
    [...headToHeadRows].sort(
      (left, right) =>
        left.averageScoreDifferential - right.averageScoreDifferential ||
        right.losses - left.losses ||
        right.gamesPlayed - left.gamesPlayed,
    )[0] ?? null;
  const ownGreenerySpaces = new Set(
    tileEvents
      .filter((event) => event.actorIsOwn && event.tileType === 'greenery')
      .map((event) => event.spaceId)
      .filter((spaceId): spaceId is string => Boolean(spaceId)),
  );
  const opponentGreenerySpaces = new Set(
    tileEvents
      .filter((event) => !event.actorIsOwn && event.tileType === 'greenery')
      .map((event) => event.spaceId)
      .filter((spaceId): spaceId is string => Boolean(spaceId)),
  );
  const oceanSpaces = new Set(
    tileEvents
      .filter((event) => event.tileType === 'ocean')
      .map((event) => event.spaceId)
      .filter((spaceId): spaceId is string => Boolean(spaceId)),
  );
  const ownCitySpaces = tileEvents
    .filter((event) => event.actorIsOwn && event.tileType === 'city')
    .map((event) => event.spaceId)
    .filter((spaceId): spaceId is string => Boolean(spaceId));
  const ownTileCounts = {
    cities: tileEvents.filter(
      (event) => event.actorIsOwn && event.tileType === 'city',
    ).length,
    greeneries: tileEvents.filter(
      (event) => event.actorIsOwn && event.tileType === 'greenery',
    ).length,
    oceans: tileEvents.filter(
      (event) => event.actorIsOwn && event.tileType === 'ocean',
    ).length,
  };
  const supportedCityCount = ownCitySpaces.filter((spaceId) => {
    const neighbors = boardMap.spaces[spaceId]?.neighbors ?? [];

    return neighbors.some(
      (neighbor) =>
        ownGreenerySpaces.has(neighbor) || opponentGreenerySpaces.has(neighbor),
    );
  }).length;
  const greeneryNearOceanCount = [...ownGreenerySpaces].filter((spaceId) => {
    const neighbors = boardMap.spaces[spaceId]?.neighbors ?? [];

    return neighbors.some((neighbor) => oceanSpaces.has(neighbor));
  }).length;
  const boardTileCount = ownTileCounts.cities + ownTileCounts.greeneries;
  const boardPoints = ownRows.reduce(
    (sum, row) => sum + row.citiesPoints + row.greeneryPoints,
    0,
  );
  const pointsPerBoardTile =
    boardTileCount > 0 ? boardPoints / boardTileCount : null;
  const bestLength = gameLengthProfile?.bestBucket ?? null;
  const weakestLength = gameLengthProfile?.weakestBucket ?? null;
  const bestSpeed = globalParameterTempoProfile?.bestMix ?? null;
  const weakestSpeed = globalParameterTempoProfile?.weakestMix ?? null;
  const bestPhase = phaseTempoProfile?.bestPhase ?? null;
  const mostActivePhase = phaseTempoProfile?.mostActivePhase ?? null;
  const mostPlayedStyle = styleBreakdownRows[0] ?? null;
  const winningStyle =
    [...styleBreakdownRows].sort(
      (left, right) =>
        right.wins - left.wins ||
        right.winRate - left.winRate ||
        right.gamesPlayed - left.gamesPlayed,
    )[0] ?? null;
  const openingActionCount =
    opening.cardsPlayed +
    opening.terraformingRaises +
    opening.milestonesClaimed +
    opening.loggedGains;
  const winningRows = ownRows.filter((row) => row.isWinner);
  const losingRows = ownRows.filter((row) => !row.isWinner);
  const averageForRows = (
    rows: ProfileGameResultRow[],
    getValue: (row: ProfileGameResultRow) => number,
  ) => averageNumbers(rows.map(getValue));
  const objectivePoints = (row: ProfileGameResultRow) =>
    row.milestonePoints + row.awardPoints;
  const boardScore = (row: ProfileGameResultRow) =>
    row.citiesPoints + row.greeneryPoints;
  const winningObjectiveAverage = averageForRows(winningRows, objectivePoints);
  const losingObjectiveAverage = averageForRows(losingRows, objectivePoints);
  const winningBoardAverage = averageForRows(winningRows, boardScore);
  const losingBoardAverage = averageForRows(losingRows, boardScore);
  const winningTrAverage = averageForRows(winningRows, (row) => row.trPoints);
  const losingTrAverage = averageForRows(losingRows, (row) => row.trPoints);
  const objectiveWinLift =
    winningObjectiveAverage !== null && losingObjectiveAverage !== null
      ? winningObjectiveAverage - losingObjectiveAverage
      : null;
  const boardWinLift =
    winningBoardAverage !== null && losingBoardAverage !== null
      ? winningBoardAverage - losingBoardAverage
      : null;
  const trWinLift =
    winningTrAverage !== null && losingTrAverage !== null
      ? winningTrAverage - losingTrAverage
      : null;
  const outcomeSampleLabel = `${formatExpansionNumber(winningRows.length)} wins and ${formatExpansionNumber(losingRows.length)} non-wins`;

  const strengths: string[] = [];
  const improvements: string[] = [];
  const addStrength = (sentence: string | null) => {
    if (sentence && !strengths.includes(sentence)) {
      strengths.push(sentence);
    }
  };
  const addImprovement = (sentence: string | null) => {
    if (sentence && !improvements.includes(sentence)) {
      improvements.push(sentence);
    }
  };

  const repeatableSourceClause = mostReliableSource
    ? `${mostReliableSource.label} is the repeatable floor at ${formatExpansionNumber(mostReliableSource.average)} points with ${formatExpansionNumber(mostReliableSource.standardDeviation)} standard deviation`
    : null;
  const leadClause = leadPressure
    ? `the explicit lead shows up in ${formatExpansionPercent(leadPressure.leadRate)} of finalized games with a ${formatExpansionNumber(leadPressure.averageScoreDifferential)} point average score edge`
    : null;

  addStrength(
    leadClause || repeatableSourceClause
      ? `The expanded profile backs the ${
          leadPressure?.pressureLabel.toLowerCase() ?? 'core-plan'
        } read: ${[leadClause, repeatableSourceClause].filter(Boolean).join(', and ')}.`
      : null,
  );

  addStrength(
    objectiveWinLift !== null && objectiveWinLift > 0
      ? `Milestones and awards are part of the winning pattern: wins average ${formatExpansionNumber(winningObjectiveAverage)} objective points, ${formatExpansionNumber(objectiveWinLift)} more than non-wins across ${outcomeSampleLabel}. Treat this as an association, especially while either outcome sample is small.`
      : null,
  );

  const tempoFitSignals = [
    bestPhase && bestPhase.winRateWhenPeak !== null
      ? `${bestPhase.label.toLowerCase()} peaks at ${formatExpansionPercent(bestPhase.winRateWhenPeak)} win rate`
      : null,
    bestSpeed
      ? `${bestSpeed.label.toLowerCase()} games at ${formatExpansionPercent(bestSpeed.winRate)} win rate`
      : null,
    bestLength
      ? `${bestLength.label.toLowerCase()} at ${formatExpansionPercent(bestLength.winRate)} win rate`
      : null,
  ].filter((signal): signal is string => Boolean(signal));

  addStrength(
    tempoFitSignals.length > 0
      ? `The best expanded tempo lane is ${tempoFitSignals.join(', ')}; that is the game shape where the model says the plan travels best.`
      : null,
  );

  addStrength(
    scoreVsOpponentAverage !== null && scoreVsOpponentAverage > 0
      ? `The opponent-adjusted profile is positive: you score ${formatExpansionNumber(scoreVsOpponentAverage)} points above the average opponent in shared games${
          strongerTableWinRate !== null
            ? ` and win ${formatExpansionPercent(strongerTableWinRate)} of the stronger-table sample`
            : ''
        }.`
      : null,
  );
  addStrength(
    boardTileCount > 0 && pointsPerBoardTile !== null
      ? `Board control is producing real value: city and greenery tiles are returning ${formatExpansionNumber(pointsPerBoardTile)} final points per logged board tile${boardWinLift !== null && boardWinLift > 0 ? `, while wins score ${formatExpansionNumber(boardWinLift)} more board points than non-wins` : ''}.`
      : null,
  );
  addStrength(
    resourceRemovalProfile &&
      resourceRemovalProfile.outgoing.totalAmount >
        resourceRemovalProfile.incoming.totalAmount
      ? `Interaction pressure is a strength: outgoing logged removal is ${formatExpansionNumber(resourceRemovalProfile.outgoing.totalAmount - resourceRemovalProfile.incoming.totalAmount)} stored-resource or production points ahead of incoming pressure.`
      : null,
  );
  addStrength(
    topTag && engine.cardsPlayed > 0
      ? `The engine profile has a clear ${topTag[0]} tilt, with ${formatExpansionNumber(engine.cardsPlayed)} matched card plays and ${formatExpansionNumber(cardsPerGeneration)} cards per generation.`
      : openingActionCount > 0
        ? `The opening log is specific enough to profile: generations 1-3 show ${formatExpansionNumber(opening.cardsPlayed)} card plays, ${formatExpansionNumber(opening.terraformingRaises)} terraforming raises, and ${formatExpansionNumber(opening.milestonesClaimed)} milestones.`
        : null,
  );

  addImprovement(
    swingiestSource
      ? `Stabilize ${swingiestSource.label}: it is the swingiest scoring source, averaging ${formatExpansionNumber(swingiestSource.average)} points with ${formatExpansionNumber(swingiestSource.standardDeviation)} standard deviation, so choose one dependable backup route before final scoring.`
      : null,
  );
  addImprovement(
    objectiveWinLift !== null && objectiveWinLift < 0
      ? `Review milestone and award timing: non-wins currently average ${formatExpansionNumber(Math.abs(objectiveWinLift))} more objective points than wins across ${outcomeSampleLabel}, suggesting those points may be costing tempo or arriving without enough follow-through.`
      : winningObjectiveAverage !== null && winningObjectiveAverage < 5
        ? `Build a clearer milestone-and-award branch into the opening: wins average only ${formatExpansionNumber(winningObjectiveAverage)} objective points, so identify one claimable milestone and one affordable award without sacrificing the main engine.`
        : null,
  );
  addImprovement(
    boardWinLift !== null && boardWinLift < 0
      ? `Convert board presence more efficiently: non-wins score ${formatExpansionNumber(Math.abs(boardWinLift))} more city-and-greenery points than wins, so check whether late placements are consuming actions without improving placement.`
      : null,
  );
  addImprovement(
    trWinLift !== null && trWinLift < 0
      ? `Recheck terraforming pace: non-wins average ${formatExpansionNumber(Math.abs(trWinLift))} more TR points than wins, which can signal that parameter pushes are ending the game before the rest of the scoring engine pays back.`
      : null,
  );
  addImprovement(
    weakestSpeed && bestSpeed && weakestSpeed.code !== bestSpeed.code
      ? `Treat ${weakestSpeed.label.toLowerCase()} games as the prep branch: the current fast-terraforming sample says that mix is the weakest, so decide earlier whether to chase TR, cards, or board points.`
      : weakestLength && bestLength && weakestLength.bucket !== bestLength.bucket
        ? `Treat ${weakestLength.label.toLowerCase()} as the prep branch: that length bucket is weakest so far, so decide earlier whether to speed up or bank endgame points.`
        : null,
  );
  addImprovement(
    leadPressure && leadPressure.averageShortfallWhenBehind !== null
      ? `When the lead plan does not land, reserve a catch-up package worth about ${formatExpansionNumber(leadPressure.averageShortfallWhenBehind)} points, which is the average non-winning chase gap.`
      : null,
  );
  addImprovement(
    resourceRemovalProfile && resourceRemovalProfile.incoming.events > 0
      ? `Add buffer turns against attacks; opponents have made you lose ${formatExpansionNumber(resourceRemovalProfile.incoming.resourceAmount)} stored resources and ${formatExpansionNumber(resourceRemovalProfile.incoming.productionAmount)} production, so avoid plans that fold to one removal hit.`
      : null,
  );
  addImprovement(
    ownTileCounts.cities > 0 && supportedCityCount < ownTileCounts.cities
      ? `Improve board support by placing cities where more greeneries can score them later.`
      : null,
  );
  addImprovement(
    winningStyle || mostPlayedStyle
      ? `Keep attaching corporation and prelude setup selections to profile games so the ${winningStyle?.styleName ?? mostPlayedStyle?.styleName} style read can become exact start-package advice instead of a proxy.`
      : null,
  );

  const openingSummary =
    openingActionCount <= 0
      ? 'Imported logs do not yet show enough generation 1-3 linked-player actions to call a stable opening pattern.'
      : opening.terraformingRaises >= opening.cardsPlayed
        ? `Your opening profile leans toward immediate terraforming, with ${formatExpansionNumber(opening.terraformingRaises)} oxygen, heat, ocean, or greenery-linked raises in generations 1-3.`
        : `Your opening profile leans toward card development, with ${formatExpansionNumber(opening.cardsPlayed)} logged card plays in generations 1-3 before the engine fully matures.`;
  const engineSummary =
    topTag && engine.cardsPlayed > 0
      ? `Your engine shape is card-led with a ${topTag[0]} tilt: ${formatExpansionNumber(engine.cardsPlayed)} logged card plays and ${formatExpansionNumber(engine.cardPrintedVp)} printed VP visible from matched cards.`
      : engine.cardsPlayed > 0
        ? `Your engine shape is card-led in the logs, but matched card tags are still sparse; the model sees ${formatExpansionNumber(engine.cardsPlayed)} card plays.`
        : 'Your engine shape is currently inferred more from final score sources than from matched card-play logs.';
  const reliabilitySummary =
    mostReliableSource && swingiestSource
      ? `${mostReliableSource.label} is your safest scoring lane, while ${swingiestSource.label} is the one most likely to decide whether a game spikes or stalls.`
      : 'More finalized score rows will let the model separate repeatable scoring lanes from one-off spikes.';
  const comebackSummary =
    leadPressure?.leadRate !== undefined
      ? `The profile currently reads as ${leadPressure.pressureLabel.toLowerCase()}: you hold the explicit lead in ${formatExpansionPercent(leadPressure.leadRate)} of finalized games, with a ${formatExpansionNumber(leadPressure.averageShortfallWhenBehind)} average chase gap when behind.`
      : 'Final placement and differential rows will show whether your wins come more from front-running or late recovery.';
  const opponentSummary =
    scoreVsOpponentAverage !== null
      ? `Opponent-adjusted scoring is ${scoreVsOpponentAverage >= 0 ? 'positive' : 'negative'} at ${formatExpansionNumber(scoreVsOpponentAverage)} points versus the average opponent in shared games.`
      : 'Shared-game opponent rows will show whether the profile is beating tougher tables or mostly converting softer ones.';
  const boardSummary =
    boardTileCount > 0
      ? `Board control is worth ${formatExpansionNumber(pointsPerBoardTile)} final points per logged city/greenery tile, with ${formatExpansionNumber(supportedCityCount)} supported cities and ${formatExpansionNumber(greeneryNearOceanCount)} greeneries touching oceans.`
      : 'Board control can already use final city and greenery points, but imported tile spaces are needed to judge adjacency quality.';
  const hasResourceRemovalEvents =
    (resourceRemovalProfile?.totalRemovalEvents ?? 0) > 0;
  const interactionSummary = resourceRemovalProfile
    ? hasResourceRemovalEvents
      ? resourceRemovalProfile.outgoing.totalAmount >
      resourceRemovalProfile.incoming.totalAmount
        ? `Your interaction personality is proactive: outgoing logged removal exceeds incoming pressure by ${formatExpansionNumber(resourceRemovalProfile.outgoing.totalAmount - resourceRemovalProfile.incoming.totalAmount)} total, split between stored resources and production.`
        : resourceRemovalProfile.incoming.totalAmount > 0
          ? `Your interaction personality is currently more targeted than targeting: incoming logged removal exceeds outgoing pressure by ${formatExpansionNumber(resourceRemovalProfile.incoming.totalAmount - resourceRemovalProfile.outgoing.totalAmount)} total, split between stored resources and production.`
          : 'Your interaction personality is low-contact in the imported logs so far.'
      : 'Imported logs have not produced parsed resource or production removal events yet.'
    : 'Imported logs will show how often you target others and how often they target you.';
  const corpPreludeSummary =
    winningStyle && mostPlayedStyle
      ? `Exact corporation/prelude fit needs setup selections attached to the profile, so this read uses style outcomes: ${winningStyle.styleName} is the strongest winning shell and ${mostPlayedStyle.styleName} is the most common shell.`
      : 'Exact corporation/prelude fit needs setup selections attached to the profile; until then this section uses style outcomes as the closest proxy.';
  const speedSummary =
    bestSpeed
      ? `You fare best in ${bestSpeed.label.toLowerCase()} games and ${
          weakestSpeed && weakestSpeed.code !== bestSpeed.code
            ? `worst in ${weakestSpeed.label.toLowerCase()} games`
            : 'need more contrasting fast terraforming mixes for a worst-case call'
        }.`
      : bestLength
        ? `Generation length is the strongest current speed signal: ${bestLength.label.toLowerCase()} are best for you so far.`
        : 'Generation length and fast-parameter logs will identify the game speeds where your style travels best.';
  const coachSummary =
    improvements.length > 0
      ? `Highest ROI review target: ${improvements[0]}`
      : 'Highest ROI review target: keep logging complete games so the model can turn trends into specific coaching prompts.';

  return {
    improvements: improvements.slice(0, 4),
    sections: [
      buildExpansionSection({
        code: 'opening_profile',
        confidenceLabel:
          snapshotRows.length > 0
            ? 'Uses per-generation imported-log snapshots for TR raises, card VP, greeneries, cities, and milestones.'
            : 'Needs imported logs with generation markers for higher confidence.',
        metrics: [
          expansionMetric('Gen 1-3 Cards', formatExpansionNumber(opening.cardsPlayed)),
          expansionMetric(
            'Gen 1-3 Terraforming',
            formatExpansionNumber(opening.terraformingRaises),
          ),
          expansionMetric(
            'Gen 1-3 Milestones',
            formatExpansionNumber(opening.milestonesClaimed),
          ),
          expansionMetric('Gen 1-3 Logged Gains', formatExpansionNumber(opening.loggedGains)),
          expansionMetric('Snapshot Rows', formatExpansionNumber(snapshotRows.length)),
        ],
        summary: openingSummary,
      }),
      buildExpansionSection({
        code: 'engine_shape',
        confidenceLabel:
          cardCatalogRows.length > 0
            ? 'Uses imported card-play events matched to catalog tags and printed VP.'
            : 'Uses card-play counts now; card tags improve once event cards match catalog rows.',
        metrics: [
          expansionMetric('Cards / Gen', formatExpansionNumber(cardsPerGeneration)),
          expansionMetric('Logged Gains / Gen', formatExpansionNumber(gainsPerGeneration)),
          expansionMetric('Top Card Tag', topTag ? topTag[0] : 'n/a'),
          expansionMetric('Printed Card VP', formatExpansionNumber(engine.cardPrintedVp)),
          expansionMetric('Snapshot Card VP', formatExpansionNumber(snapshotCardPrintedVp)),
        ],
        summary: engineSummary,
      }),
      buildExpansionSection({
        code: 'scoring_reliability',
        confidenceLabel:
          'Uses final score-source rows and standard deviation across finalized games.',
        metrics: [
          expansionMetric(
            'Most Reliable',
            mostReliableSource?.label ?? 'n/a',
            mostReliableSource
              ? `${formatExpansionNumber(mostReliableSource.standardDeviation)} point standard deviation`
              : undefined,
          ),
          expansionMetric(
            'Swingiest',
            swingiestSource?.label ?? 'n/a',
            swingiestSource
              ? `${formatExpansionNumber(swingiestSource.standardDeviation)} point standard deviation`
              : undefined,
          ),
          expansionMetric('Total Score SD', formatExpansionNumber(totalScoreDeviation)),
        ],
        summary: reliabilitySummary,
      }),
      buildExpansionSection({
        code: 'comeback_front_runner',
        confidenceLabel:
          'Uses final score differentials, phase peaks, milestone timing, award timing, and second-place award outcomes.',
        metrics: [
          expansionMetric(
            'Lead Rate',
            formatExpansionPercent(leadPressure?.leadRate),
          ),
          expansionMetric(
            'Avg Chase Gap',
            formatExpansionNumber(leadPressure?.averageShortfallWhenBehind),
          ),
          expansionMetric(
            'Best Peak Phase',
            bestPhase?.label ?? mostActivePhase?.label ?? 'n/a',
          ),
          expansionMetric(
            'Avg Milestone Gen',
            formatExpansionNumber(averageMilestoneGeneration),
          ),
          expansionMetric(
            'Avg Award Fund Gen',
            formatExpansionNumber(averageAwardFundingGeneration),
          ),
          expansionMetric('Second Awards', formatExpansionNumber(secondPlaceAwardOutcomes)),
        ],
        summary: comebackSummary,
      }),
      buildExpansionSection({
        code: 'opponent_adjusted',
        confidenceLabel:
          'Uses shared finalized-game rows, comparing your score to the average opponent in each game.',
        metrics: [
          expansionMetric(
            'Vs Opp Avg',
            formatExpansionNumber(scoreVsOpponentAverage),
          ),
          expansionMetric(
            'Strong-Table Win Rate',
            formatExpansionPercent(strongerTableWinRate),
          ),
          expansionMetric('Best Matchup', bestHeadToHead?.opponentName ?? 'n/a'),
          expansionMetric('Hardest Matchup', hardestHeadToHead?.opponentName ?? 'n/a'),
        ],
        summary: opponentSummary,
      }),
      buildExpansionSection({
        code: 'board_control',
        confidenceLabel:
          tileEvents.some((event) => event.spaceId)
            ? 'Uses imported tile spaces plus shared board adjacency.'
            : 'Needs imported tile space IDs to judge city and greenery adjacency.',
        metrics: [
          expansionMetric('Greeneries', formatExpansionNumber(ownTileCounts.greeneries)),
          expansionMetric('Cities', formatExpansionNumber(ownTileCounts.cities)),
          expansionMetric('Oceans', formatExpansionNumber(ownTileCounts.oceans)),
          expansionMetric('Board Pts / Tile', formatExpansionNumber(pointsPerBoardTile)),
        ],
        summary: boardSummary,
      }),
      buildExpansionSection({
        code: 'interaction_personality',
        confidenceLabel:
          resourceRemovalProfile?.confidenceLabel ??
          'Needs imported logs with resource/production changes.',
        metrics: [
          expansionMetric(
            'Outgoing Stored',
            formatExpansionNumber(resourceRemovalProfile?.outgoing.resourceAmount),
          ),
          expansionMetric(
            'Outgoing Production',
            formatExpansionNumber(resourceRemovalProfile?.outgoing.productionAmount),
          ),
          expansionMetric(
            'Incoming Stored',
            formatExpansionNumber(resourceRemovalProfile?.incoming.resourceAmount),
          ),
          expansionMetric(
            'Incoming Production',
            formatExpansionNumber(resourceRemovalProfile?.incoming.productionAmount),
          ),
        ],
        summary: interactionSummary,
      }),
      buildExpansionSection({
        code: 'corporation_prelude_fit',
        confidenceLabel:
          'Current profile read uses style outcomes as a proxy; exact fit needs corporation and prelude setup selections on profile games.',
        metrics: [
          expansionMetric('Winning Shell', winningStyle?.styleName ?? 'n/a'),
          expansionMetric('Most Common Shell', mostPlayedStyle?.styleName ?? 'n/a'),
          expansionMetric(
            'Shell Win Rate',
            formatExpansionPercent(winningStyle?.winRate),
          ),
        ],
        summary: corpPreludeSummary,
      }),
      buildExpansionSection({
        code: 'game_speed_matchup',
        confidenceLabel:
          'Combines generation-length buckets with fast oxygen, heat, ocean, and exact fast-parameter mixes.',
        metrics: [
          expansionMetric('Best Fast Mix', bestSpeed?.label ?? 'n/a'),
          expansionMetric('Weakest Fast Mix', weakestSpeed?.label ?? 'n/a'),
          expansionMetric('Best Length', bestLength?.label ?? 'n/a'),
          expansionMetric('Weakest Length', weakestLength?.label ?? 'n/a'),
        ],
        summary: speedSummary,
      }),
      buildExpansionSection({
        code: 'improvement_coach',
        confidenceLabel:
          'Condenses the expansion model into the next few review prompts.',
        metrics: [
          expansionMetric('Review 1', improvements[0] ?? 'Keep logging complete games.'),
          expansionMetric('Review 2', improvements[1] ?? 'Compare one win and one loss.'),
          expansionMetric('Review 3', improvements[2] ?? 'Watch for score-source gaps.'),
        ],
        summary: coachSummary,
      }),
    ],
    strengths: strengths.slice(0, 3),
  };
}

async function listProfileResourceLogData(
  supabase: AnalyticsSupabaseClient,
  gameIds: string[],
): Promise<{
  events: RawGameLogEventRow[];
  imports: RawGameLogImportRow[];
} | null> {
  if (gameIds.length === 0) {
    return null;
  }

  try {
    const { data: imports, error: importsError } = await supabase
      .from('game_log_imports')
      .select('id, game_id')
      .in('game_id', gameIds);

    if (importsError) {
      throw importsError;
    }

    const normalizedImports = (imports as RawGameLogImportRow[] | null) ?? [];

    if (normalizedImports.length === 0) {
      return {
        events: [],
        imports: [],
      };
    }

    const { data: events, error: eventsError } = await supabase
      .from('game_log_events')
      .select(
        'board_space, card_id, event_order, event_type, game_log_import_id, generation_number, payload, raw_line, resource_amount, resource_type, tile_type',
      )
      .in(
        'game_log_import_id',
        normalizedImports.map((row) => row.id),
      );

    if (eventsError) {
      throw eventsError;
    }

    return {
      events: (events as RawGameLogEventRow[] | null) ?? [],
      imports: normalizedImports,
    };
  } catch (error) {
    console.warn('[profile] Optional game-log resource lookup failed', error);
    return null;
  }
}

async function listProfileGameLogAliases(
  supabase: AnalyticsSupabaseClient,
  groupIds: string[],
): Promise<RawProfileGameLogAliasRow[]> {
  const uniqueGroupIds = [...new Set(groupIds.filter(Boolean))];

  if (uniqueGroupIds.length === 0) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('player_import_aliases')
      .select('group_id, normalized_alias, player_id')
      .in('group_id', uniqueGroupIds)
      .eq('source_type', 'game_log');

    if (error) {
      throw error;
    }

    return (data as RawProfileGameLogAliasRow[] | null) ?? [];
  } catch (error) {
    console.warn('[profile] Optional game-log alias lookup failed', error);
    return [];
  }
}

async function listProfileCardCatalogRows(
  supabase: AnalyticsSupabaseClient,
  cardIds: string[],
): Promise<RawProfileCardCatalogRow[]> {
  const uniqueCardIds = [...new Set(cardIds.filter(Boolean))];

  if (uniqueCardIds.length === 0) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('cards')
      .select('id, card_name, gameplay_tags, printed_victory_points')
      .in('id', uniqueCardIds);

    if (error) {
      throw error;
    }

    return (data as RawProfileCardCatalogRow[] | null) ?? [];
  } catch (error) {
    console.warn('[profile] Optional profile card catalog lookup failed', error);
    return [];
  }
}

function getEventActorName(event: RawGameLogEventRow) {
  return getPayloadStringFromKeys(event.payload, [
    'actor',
    'playerName',
    'player',
    'player_name',
    'sourcePlayerName',
    'sourceActor',
    'sourcePlayer',
  ]);
}

function getFallbackEventCardName(
  event: RawGameLogEventRow,
  card: RawProfileCardCatalogRow | null,
) {
  return (
    card?.card_name ??
    getPayloadStringFromKeys(event.payload, [
      'cardName',
      'card',
      'card_name',
      'sourceCardName',
      'sourceCard',
    ])
  );
}

function buildProfileCardRowsFromResourceLog({
  aliases,
  cardCatalogRows,
  events,
  imports,
  linkedPlayerIds,
  sharedRows,
}: {
  aliases: RawProfileGameLogAliasRow[];
  cardCatalogRows: RawProfileCardCatalogRow[];
  events: RawGameLogEventRow[];
  imports: RawGameLogImportRow[];
  linkedPlayerIds: string[];
  sharedRows: ProfileGameResultRow[];
}): RawProfileCardRow[] {
  if (events.length === 0 || imports.length === 0 || linkedPlayerIds.length === 0) {
    return [];
  }

  const ownPlayerIds = new Set(linkedPlayerIds);
  const importGameIds = new Map(
    imports.map((row) => [row.id, row.game_id] as const),
  );
  const lookupActor = buildProfileActorLookup(sharedRows, aliases);
  const cardById = new Map(cardCatalogRows.map((card) => [card.id, card]));
  const cardByName = new Map(
    cardCatalogRows.map((card) => [
      normalizeAnalyticsToken(card.card_name),
      card,
    ]),
  );
  const rows: RawProfileCardRow[] = [];

  for (const event of events) {
    if (event.event_type !== 'card_played') {
      continue;
    }

    const gameId = importGameIds.get(event.game_log_import_id);

    if (!gameId) {
      continue;
    }

    const actor = lookupActor(gameId, getEventActorName(event));

    if (!actor || !ownPlayerIds.has(actor.playerId)) {
      continue;
    }

    const card = getCardCatalogEntry(event, cardById, cardByName);
    const cardName = getFallbackEventCardName(event, card);

    if (!cardName) {
      continue;
    }

    const normalizedCardName = normalizeAnalyticsToken(cardName);
    const cardId =
      card?.id ?? event.card_id ?? (normalizedCardName ? `name:${normalizedCardName}` : null);

    if (!cardId) {
      continue;
    }

    rows.push({
      card_id: cardId,
      card_name: cardName,
      game_id: gameId,
      is_winner: actor.isWinner,
      player_id: actor.playerId,
      style_code: actor.inferredPrimaryStyleCode,
    });
  }

  return rows;
}

function buildProfileTagStats(
  rows: RawProfileCardRow[],
  cardCatalogRows: RawProfileCardCatalogRow[],
): ProfileTagStat[] {
  if (rows.length === 0 || cardCatalogRows.length === 0) {
    return [];
  }

  const cardById = new Map(cardCatalogRows.map((card) => [card.id, card]));
  const cardByName = new Map(
    cardCatalogRows.map((card) => [
      normalizeAnalyticsToken(card.card_name),
      card,
    ]),
  );
  const totals = new Map<
    string,
    {
      gameIds: Set<string>;
      totalTags: number;
      winningGameIds: Set<string>;
    }
  >();

  for (const row of uniqueProfileCardRows(rows)) {
    const card =
      cardById.get(row.card_id) ??
      cardByName.get(normalizeAnalyticsToken(row.card_name));

    if (!card) {
      continue;
    }

    for (const tagCode of normalizeGameplayTags(card.gameplay_tags)) {
      const entry = totals.get(tagCode) ?? {
        gameIds: new Set<string>(),
        totalTags: 0,
        winningGameIds: new Set<string>(),
      };
      const gameKey = `${row.game_id}|${row.player_id}`;

      entry.gameIds.add(gameKey);
      entry.totalTags += 1;

      if (row.is_winner) {
        entry.winningGameIds.add(gameKey);
      }

      totals.set(tagCode, entry);
    }
  }

  return [...totals.entries()]
    .map(([tagCode, entry]) => {
      const games = entry.gameIds.size;

      return {
        averageTagsPerGame:
          games > 0 ? roundNumber(entry.totalTags / games, 3) : 0,
        games,
        tagCode,
        tagName: formatStyleName(tagCode),
        totalTags: entry.totalTags,
        winRate:
          games > 0 ? roundNumber(entry.winningGameIds.size / games, 4) : 0,
        wins: entry.winningGameIds.size,
      };
    })
    .filter((row) => row.totalTags > 0)
    .sort(
      (left, right) =>
        right.totalTags - left.totalTags ||
        right.games - left.games ||
        right.winRate - left.winRate ||
        left.tagName.localeCompare(right.tagName),
    )
    .slice(0, PROFILE_CARD_LIMIT);
}

function uniqueProfileCardRows(rows: RawProfileCardRow[]) {
  const seen = new Set<string>();
  const uniqueRows: RawProfileCardRow[] = [];

  for (const row of rows) {
    const dedupeKey = `${row.game_id}|${row.player_id}|${row.card_id}`;

    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    uniqueRows.push(row);
  }

  return uniqueRows;
}

// Collapse per-(game, player, card) rows into one entry per card carrying how
// often it appeared and the win rate across those games. Keyed on the trio so a
// future import path that emits the same play twice can't inflate the counts.
function aggregateProfileCardRows(rows: RawProfileCardRow[]): ProfileCardStat[] {
  const totals = new Map<
    string,
    {
      cardName: string;
      fullImageUrl: string | null;
      plays: number;
      thumbnailUrl: string | null;
      wins: number;
    }
  >();

  for (const row of uniqueProfileCardRows(rows)) {
    const entry = totals.get(row.card_id) ?? {
      cardName: row.card_name,
      fullImageUrl: row.full_image_url ?? null,
      plays: 0,
      thumbnailUrl: row.thumbnail_url ?? null,
      wins: 0,
    };

    entry.plays += 1;
    entry.wins += row.is_winner ? 1 : 0;
    totals.set(row.card_id, entry);
  }

  return [...totals.entries()]
    .map(([cardId, entry]) => ({
      cardId,
      cardName: entry.cardName,
      fullImageUrl: entry.fullImageUrl,
      plays: entry.plays,
      thumbnailUrl: entry.thumbnailUrl,
      winRate: roundNumber(entry.wins / entry.plays, 4),
      wins: entry.wins,
    }))
    .sort(
      (left, right) =>
        right.plays - left.plays ||
        right.winRate - left.winRate ||
        left.cardName.localeCompare(right.cardName),
    )
    .slice(0, PROFILE_CARD_LIMIT);
}

// Pseudo-games of the global rate mixed into each personal sample so a card the
// player has only won once or twice can't leap to the top of their key cards.
const KEY_CARD_SHRINKAGE = 5;

// The profile loss-correlated list mirrors "top 5 cards correlated with losses"
// on the Global Statistics page, so it is capped tighter than the key cards.
const PROFILE_LOSS_CARD_LIMIT = 5;

// Blend each played card's personal win rate toward its global win rate
// (empirical-Bayes shrinkage, so small samples lean on the global signal) and
// carry the signed lift that blended rate has over the player's baseline. The
// key-card and loss-card lists just rank this shared shape in opposite
// directions.
const KEY_CARD_CONTEXT_SHRINKAGE = 3;

type CardContextField =
  | 'corporation_name'
  | 'map_name'
  | 'outcome_method'
  | 'pace_bucket'
  | 'player_count'
  | 'style_code';

function contextWinRates(
  rows: RawProfileCardRow[],
  field: CardContextField,
  personalBaselineWinRate: number,
) {
  const games = new Map<string, { isWinner: boolean; value: string }>();

  for (const row of rows) {
    const rawValue = row[field];
    const value = typeof rawValue === 'number' ? String(rawValue) : rawValue;
    if (value) {
      games.set(`${row.game_id}|${row.player_id}`, {
        isWinner: row.is_winner,
        value,
      });
    }
  }

  const totals = new Map<string, { games: number; wins: number }>();
  for (const game of games.values()) {
    const total = totals.get(game.value) ?? { games: 0, wins: 0 };
    total.games += 1;
    total.wins += game.isWinner ? 1 : 0;
    totals.set(game.value, total);
  }

  return new Map(
    [...totals.entries()].map(([value, total]) => [
      value,
      (total.wins + KEY_CARD_CONTEXT_SHRINKAGE * personalBaselineWinRate) /
        (total.games + KEY_CARD_CONTEXT_SHRINKAGE),
    ]),
  );
}

function mostCommonContext(rows: RawProfileCardRow[], field: CardContextField) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const rawValue = row[field];
    const value = typeof rawValue === 'number' ? String(rawValue) : rawValue;
    if (value) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  return [...counts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )[0]?.[0];
}

function formatCardContext(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Estimate a card's lift after accounting for the corporation, play style,
 * and dominant scoring method in each game. Each contextual baseline is
 * shrunk toward the player's overall rate, then the card residual is blended
 * with the global card residual. The denominator supplies play-count
 * confidence, preventing one-game outliers from dominating the list.
 */
export function buildContextAdjustedImpactCards(
  cardOutcomeRows: RawProfileCardRow[],
  globalWinRateByCardName: Map<string, number>,
  globalBaselineWinRate: number,
  personalBaselineWinRate: number,
): ProfileCardStat[] {
  const uniqueRows = uniqueProfileCardRows(cardOutcomeRows);
  const contextRates = {
    corporation_name: contextWinRates(
      uniqueRows,
      'corporation_name',
      personalBaselineWinRate,
    ),
    map_name: contextWinRates(uniqueRows, 'map_name', personalBaselineWinRate),
    outcome_method: contextWinRates(
      uniqueRows,
      'outcome_method',
      personalBaselineWinRate,
    ),
    pace_bucket: contextWinRates(
      uniqueRows,
      'pace_bucket',
      personalBaselineWinRate,
    ),
    player_count: contextWinRates(
      uniqueRows,
      'player_count',
      personalBaselineWinRate,
    ),
    style_code: contextWinRates(uniqueRows, 'style_code', personalBaselineWinRate),
  };
  const totals = new Map<
    string,
    {
      cardName: string;
      contextResidual: number;
      fullImageUrl: string | null;
      plays: number;
      rows: RawProfileCardRow[];
      thumbnailUrl: string | null;
      wins: number;
    }
  >();

  for (const row of uniqueRows) {
    const entry = totals.get(row.card_id) ?? {
      cardName: row.card_name,
      contextResidual: 0,
      fullImageUrl: row.full_image_url ?? null,
      plays: 0,
      rows: [],
      thumbnailUrl: row.thumbnail_url ?? null,
      wins: 0,
    };

    const expectedRates = (
      [
        'corporation_name',
        'style_code',
        'outcome_method',
        'pace_bucket',
        'player_count',
        'map_name',
      ] as CardContextField[]
    ).flatMap((field) => {
      const rawValue = row[field];
      const value = typeof rawValue === 'number' ? String(rawValue) : rawValue;
      const rate = value ? contextRates[field].get(value) : undefined;
      return typeof rate === 'number' ? [rate] : [];
    });
    const expectedWinRate =
      averageNumbers(expectedRates) ?? personalBaselineWinRate;

    entry.plays += 1;
    entry.contextResidual += (row.is_winner ? 1 : 0) - expectedWinRate;
    entry.rows.push(row);
    entry.wins += row.is_winner ? 1 : 0;
    totals.set(row.card_id, entry);
  }

  return [...totals.entries()].map(([cardId, entry]) => {
    // Fall back to the global baseline when this card isn't in the global
    // top-cards payload, so a rare card leans on the overall win rate.
    const globalWinRate =
      globalWinRateByCardName.get(entry.cardName) ?? globalBaselineWinRate;
    const globalResidual = globalWinRate - globalBaselineWinRate;
    const contextualImpact =
      (entry.contextResidual + KEY_CARD_SHRINKAGE * globalResidual) /
      (entry.plays + KEY_CARD_SHRINKAGE);
    const contextParts = [
      mostCommonContext(entry.rows, 'corporation_name'),
      mostCommonContext(entry.rows, 'style_code'),
      mostCommonContext(entry.rows, 'outcome_method'),
      mostCommonContext(entry.rows, 'pace_bucket'),
      mostCommonContext(entry.rows, 'player_count')
        ? `${mostCommonContext(entry.rows, 'player_count')} players`
        : undefined,
      mostCommonContext(entry.rows, 'map_name'),
    ].filter((value): value is string => Boolean(value));

    return {
      cardId,
      cardName: entry.cardName,
      contextLabel:
        contextParts.length > 0
          ? contextParts.map(formatCardContext).join(' · ')
          : undefined,
      evidenceConfidence:
        entry.plays >= 6 ? 'High' : entry.plays >= 3 ? 'Medium' : 'Low',
      fullImageUrl: entry.fullImageUrl,
      globalWinRate: roundNumber(globalWinRate, 4),
      plays: entry.plays,
      thumbnailUrl: entry.thumbnailUrl,
      victoryImpact: roundNumber(contextualImpact, 4),
      winRate: roundNumber(entry.wins / entry.plays, 4),
      wins: entry.wins,
    };
  });
}

/**
 * Victory-impact key cards: rather than cards a player flagged, surface the ones
 * that most raise their odds of winning. Rank the blended per-card win-rate lift
 * (see buildBlendedImpactCards) so cards that consistently show up in wins — for
 * this player and everyone — rise to the top.
 */
function buildVictoryImpactKeyCards(
  cardOutcomeRows: RawProfileCardRow[],
  globalWinRateByCardName: Map<string, number>,
  globalBaselineWinRate: number,
  personalBaselineWinRate: number,
): ProfileCardStat[] {
  return buildContextAdjustedImpactCards(
    cardOutcomeRows,
    globalWinRateByCardName,
    globalBaselineWinRate,
    personalBaselineWinRate,
  )
    .sort(
      (left, right) =>
        (right.victoryImpact ?? 0) - (left.victoryImpact ?? 0) ||
        right.plays - left.plays ||
        left.cardName.localeCompare(right.cardName),
    )
    .slice(0, PROFILE_CARD_LIMIT);
}

/**
 * Loss-correlated cards: the mirror of the key cards — the cards whose blended
 * win-rate lift sits furthest below the player's baseline. Only cards that
 * genuinely drag the win rate down (negative impact) are kept, so a player with
 * few cards never sees neutral cards padded in as "losses".
 */
function buildLossImpactCards(
  cardOutcomeRows: RawProfileCardRow[],
  globalWinRateByCardName: Map<string, number>,
  globalBaselineWinRate: number,
  personalBaselineWinRate: number,
): ProfileCardStat[] {
  return buildContextAdjustedImpactCards(
    cardOutcomeRows,
    globalWinRateByCardName,
    globalBaselineWinRate,
    personalBaselineWinRate,
  )
    .filter((card) => (card.victoryImpact ?? 0) < 0)
    .sort(
      (left, right) =>
        (left.victoryImpact ?? 0) - (right.victoryImpact ?? 0) ||
        right.plays - left.plays ||
        left.cardName.localeCompare(right.cardName),
    )
    .slice(0, PROFILE_LOSS_CARD_LIMIT);
}

// The signed-in player's key cards blend their own win rate with how the card
// performs globally, so we pull the global per-card win rates once. Optional:
// on failure the profile still renders, just without the global blend.
async function loadGlobalCardWinRates(): Promise<{
  baselineWinRate: number;
  winRateByCardName: Map<string, number>;
}> {
  try {
    const stats = await getSelectionStats('global');

    return {
      baselineWinRate: stats.baselineWinRate,
      winRateByCardName: new Map(
        stats.cards.map((card) => [card.card_name, card.win_rate_when_played]),
      ),
    };
  } catch (error) {
    console.warn('[profile] Optional global card win-rate lookup failed', error);

    return { baselineWinRate: 0, winRateByCardName: new Map() };
  }
}

function buildProfileStyleInsights({
  cardOutcomeRows,
  ownRows,
  styleBreakdownRows,
}: {
  cardOutcomeRows: RawProfileCardRow[];
  ownRows: ProfileGameResultRow[];
  styleBreakdownRows: ProfileStyleBreakdownRow[];
}): ProfileStyleInsight[] {
  if (styleBreakdownRows.length === 0) {
    return [];
  }

  const totalStyleGames = styleBreakdownRows.reduce(
    (sum, row) => sum + row.gamesPlayed,
    0,
  );
  const insights: ProfileStyleInsight[] = [];
  const mostPlayedStyle = styleBreakdownRows[0];

  insights.push({
    title: 'Style Identity',
    sampleSize: mostPlayedStyle.gamesPlayed,
    confidence: getProfileInsightConfidence(mostPlayedStyle.gamesPlayed),
    evidenceLabel: formatCount(
      mostPlayedStyle.gamesPlayed,
      'finalized style read',
    ),
    styleCode: mostPlayedStyle.styleCode,
    styleName: mostPlayedStyle.styleName,
    body: `Your most logged style is ${mostPlayedStyle.styleName}: ${formatCount(mostPlayedStyle.gamesPlayed, 'finish', 'finishes')} out of ${formatCount(totalStyleGames, 'finalized style read')} (${formatInsightPercent(mostPlayedStyle.playRate)}), averaging place ${formatInsightNumber(mostPlayedStyle.averagePlacement)} and ${formatInsightNumber(mostPlayedStyle.averageScore)} points.`,
  });

  const bestPlacementStyle =
    [...styleBreakdownRows].sort(
      (left, right) =>
        left.averagePlacement - right.averagePlacement ||
        right.wins - left.wins ||
        right.gamesPlayed - left.gamesPlayed ||
        left.styleName.localeCompare(right.styleName),
    )[0] ?? null;

  if (bestPlacementStyle) {
    insights.push({
      title: 'Final Placement Read',
      sampleSize: bestPlacementStyle.gamesPlayed,
      confidence: getProfileInsightConfidence(bestPlacementStyle.gamesPlayed),
      evidenceLabel: formatCount(
        bestPlacementStyle.gamesPlayed,
        'finalized style read',
      ),
      styleCode: bestPlacementStyle.styleCode,
      styleName: bestPlacementStyle.styleName,
      body: `Your strongest final placements are coming from ${bestPlacementStyle.styleName}: average place ${formatInsightNumber(bestPlacementStyle.averagePlacement)}, ${formatCount(bestPlacementStyle.wins, 'win')} in ${formatCount(bestPlacementStyle.gamesPlayed, 'finish', 'finishes')}, and a ${formatInsightPercent(bestPlacementStyle.winRate)} win rate.`,
    });
  }

  const styleByGamePlayer = new Map<string, string>();

  for (const row of ownRows) {
    if (!row.inferredPrimaryStyleCode) {
      continue;
    }

    styleByGamePlayer.set(
      `${row.gameId}|${row.playerId}`,
      row.inferredPrimaryStyleCode,
    );
  }

  const loggedCardTotals = new Map<
    string,
    {
      cardId: string;
      cardName: string;
      fullImageUrl: string | null;
      plays: number;
      styleCode: string;
      thumbnailUrl: string | null;
      wins: number;
    }
  >();

  for (const row of uniqueProfileCardRows(cardOutcomeRows)) {
    const styleCode = styleByGamePlayer.get(`${row.game_id}|${row.player_id}`);

    if (!styleCode) {
      continue;
    }

    const key = `${styleCode}|${row.card_id}`;
    const current = loggedCardTotals.get(key) ?? {
      cardId: row.card_id,
      cardName: row.card_name,
      fullImageUrl: row.full_image_url ?? null,
      plays: 0,
      styleCode,
      thumbnailUrl: row.thumbnail_url ?? null,
      wins: 0,
    };

    current.plays += 1;
    current.wins += row.is_winner ? 1 : 0;
    loggedCardTotals.set(key, current);
  }

  const loggedCardSignal =
    [...loggedCardTotals.values()].sort(
      (left, right) =>
        right.plays - left.plays ||
        right.wins - left.wins ||
        left.cardName.localeCompare(right.cardName),
    )[0] ?? null;

  if (loggedCardSignal) {
    const styleRow = styleBreakdownRows.find(
      (row) => row.styleCode === loggedCardSignal.styleCode,
    );

    insights.push({
      title: 'Game Log Signal',
      sampleSize: loggedCardSignal.plays,
      confidence: getProfileInsightConfidence(loggedCardSignal.plays),
      evidenceLabel: formatCount(loggedCardSignal.plays, 'logged card play'),
      styleCode: styleRow?.styleCode ?? loggedCardSignal.styleCode,
      styleName: styleRow?.styleName ?? formatStyleName(loggedCardSignal.styleCode),
      card: {
        cardName: loggedCardSignal.cardName,
        fullImageUrl: loggedCardSignal.fullImageUrl,
        id: loggedCardSignal.cardId,
        thumbnailUrl: loggedCardSignal.thumbnailUrl,
      },
      body: `Imported game logs add texture to your ${styleRow?.styleName ?? formatStyleName(loggedCardSignal.styleCode)} games: ${loggedCardSignal.cardName} is your most repeated logged card there, appearing in ${formatCount(loggedCardSignal.plays, 'play')} with a ${formatInsightPercent(loggedCardSignal.wins / loggedCardSignal.plays)} win rate.`,
    });
  }

  return insights.slice(0, 3);
}

// Fetch a player's flagged key cards or logged card plays from the matching
// analytics view. The raw game/card rows feed both the aggregated profile card
// lists and the style sentence insights. Image URLs ride along so each card can
// link to its full art. The lookup is optional so a missing live analytics view
// cannot break the rest of My Profile.
async function listProfileCardRows(
  supabase: AnalyticsSupabaseClient,
  view: 'player_card_outcomes' | 'player_key_cards',
  playerIds: string[],
): Promise<RawProfileCardRow[]> {
  if (playerIds.length === 0) {
    return [];
  }

  const { data, error } = await getAnalyticsClient(supabase)
    .from(view)
    .select(
      `card_id, card_name, full_image_url, game_id, is_winner, player_id, thumbnail_url${
        view === 'player_card_outcomes'
          ? ', corporation_name, map_name, outcome_method, pace_bucket, player_count, style_code'
          : ''
      }`,
    )
    .in('player_id', playerIds);

  if (error) {
    console.warn(`[profile] Optional ${view} lookup failed`, error);
    return [];
  }

  // Supabase's compile-time select parser cannot represent the conditional
  // context suffix above, but both view shapes are normalized by the optional
  // context fields on RawProfileCardRow.
  return (data as unknown as RawProfileCardRow[] | null) ?? [];
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
    .select(PROFILE_RESULT_SELECT)
    .in('player_id', linkedPlayerIds);

  if (ownRowsError) {
    throw ownRowsError;
  }

  const normalizedOwnRows = (
    await resolvePlayerLabelsInRows(
      supabase,
      (ownRows as RawProfileGameResultRow[] | null) ?? [],
    )
  ).map(mapProfileGameResultRow);

  if (normalizedOwnRows.length === 0) {
    const publiclyLabeledPlayers = await resolvePlayerLabelsInRows(
      supabase,
      linkedPlayers,
      [['id', 'display_name']],
    );

    return buildProfileAnalyticsFromRows({
      linkedPlayers: publiclyLabeledPlayers,
      ownRows: normalizedOwnRows,
      sharedRows: [],
    });
  }

  const sharedGameIds = [...new Set(normalizedOwnRows.map((row) => row.gameId))];

  let normalizedSharedRows: ProfileGameResultRow[] = [];
  let resourceLookupRows: ProfileGameResultRow[] = normalizedOwnRows;

  if (sharedGameIds.length > 0) {
    const { data: sharedRows, error: sharedRowsError } = await getAnalyticsClient(
      supabase,
    )
      .from('player_game_results')
      .select(PROFILE_RESULT_SELECT)
      .in('game_id', sharedGameIds);

    if (sharedRowsError) {
      throw sharedRowsError;
    }

    const rawSharedRows = (sharedRows as RawProfileGameResultRow[] | null) ?? [];
    resourceLookupRows = rawSharedRows.map(mapProfileGameResultRow);
    normalizedSharedRows = (
      await resolvePlayerLabelsInRows(
        supabase,
        rawSharedRows,
      )
    ).map(mapProfileGameResultRow);
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

  const [viewCardOutcomeRows, globalCardWinRates, resourceLogData] = await Promise.all([
    listProfileCardRows(supabase, 'player_card_outcomes', linkedPlayerIds),
    loadGlobalCardWinRates(),
    listProfileResourceLogData(supabase, sharedGameIds),
  ]);
  const resourceAliasRows = resourceLogData
    ? await listProfileGameLogAliases(
        supabase,
        resourceLookupRows.map((row) => row.groupId),
      )
    : [];
  const profileCardIds = viewCardOutcomeRows
    .map((row) => row.card_id)
    .filter((cardId): cardId is string => Boolean(cardId));
  const eventCardIds = resourceLogData
    ? resourceLogData.events
        .map((event) => event.card_id)
        .filter((cardId): cardId is string => Boolean(cardId))
    : [];
  const cardCatalogRows = await listProfileCardCatalogRows(supabase, [
    ...profileCardIds,
    ...eventCardIds,
  ]);
  const resourceCardOutcomeRows =
    viewCardOutcomeRows.length === 0 && resourceLogData
      ? buildProfileCardRowsFromResourceLog({
          aliases: resourceAliasRows,
          cardCatalogRows,
          events: resourceLogData.events,
          imports: resourceLogData.imports,
          linkedPlayerIds,
          sharedRows: resourceLookupRows,
        })
      : [];
  const cardOutcomeRows =
    viewCardOutcomeRows.length > 0 ? viewCardOutcomeRows : resourceCardOutcomeRows;

  const built = buildProfileAnalyticsFromRows({
    cardOutcomeRows,
    linkedPlayers,
    opponentIdentityByPlayerId,
    ownRows: normalizedOwnRows,
    sharedRows: normalizedSharedRows,
  });
  const globalParameterTempoProfile = resourceLogData
    ? buildProfileGlobalParameterTempoProfile({
        aliases: resourceAliasRows,
        events: resourceLogData.events,
        imports: resourceLogData.imports,
        linkedPlayerIds,
        sharedRows: resourceLookupRows,
      })
    : null;
  const phaseTempoProfile = resourceLogData
    ? buildProfilePhaseTempoProfile({
        aliases: resourceAliasRows,
        events: resourceLogData.events,
        imports: resourceLogData.imports,
        linkedPlayerIds,
        sharedRows: resourceLookupRows,
      })
    : null;
  const resourceRemovalProfile = resourceLogData
    ? buildProfileResourceRemovalProfile({
        aliases: resourceAliasRows,
        events: resourceLogData.events,
        imports: resourceLogData.imports,
        linkedPlayerIds,
        sharedRows: resourceLookupRows,
      })
    : null;
  const expansionProfile = buildProfileExpansionProfile({
    aliases: resourceAliasRows,
    cardCatalogRows,
    events: resourceLogData?.events ?? [],
    gameLengthProfile: built.gameLengthProfile,
    globalParameterTempoProfile,
    headToHeadRows: built.headToHeadRows,
    imports: resourceLogData?.imports ?? [],
    leadPressure: built.leadPressure,
    linkedPlayerIds,
    ownRows: normalizedOwnRows,
    phaseTempoProfile,
    resourceRemovalProfile,
    sharedRows: resourceLookupRows,
    styleBreakdownRows: built.styleBreakdownRows,
  });

  return {
    ...built,
    expansionProfile,
    keyCards: buildVictoryImpactKeyCards(
      cardOutcomeRows,
      globalCardWinRates.winRateByCardName,
      globalCardWinRates.baselineWinRate,
      built.performance?.winRate ?? globalCardWinRates.baselineWinRate,
    ),
    lossCards: buildLossImpactCards(
      cardOutcomeRows,
      globalCardWinRates.winRateByCardName,
      globalCardWinRates.baselineWinRate,
      built.performance?.winRate ?? globalCardWinRates.baselineWinRate,
    ),
    cardOutcomes: aggregateProfileCardRows(cardOutcomeRows),
    globalParameterTempoProfile,
    phaseTempoProfile,
    resourceRemovalProfile,
    tagOutcomes: buildProfileTagStats(cardOutcomeRows, cardCatalogRows),
  };
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

  const ownRows = (
    await resolvePlayerLabelsInRows(
      supabase,
      (ownData as RawFocusGameResultRow[] | null) ?? [],
    )
  ).map(mapFocusGameResultRow);
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

  const allRows = (
    await resolvePlayerLabelsInRows(
      supabase,
      (allData as RawFocusGameResultRow[] | null) ?? [],
    )
  ).map(mapFocusGameResultRow);

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

    const usernameByPlayerId = await fetchUsernamesByPlayerId(
      supabase,
      ((participants ?? []) as PlayerIdentityRow[]).map((player) => player.id),
    );
    const labelByPlayerId = buildAnalyticsPlayerLabelMap(
      ((participants ?? []) as PlayerIdentityRow[]).map((player) => player.id),
      usernameByPlayerId,
    );

    for (const player of (participants ?? []) as PlayerIdentityRow[]) {
      const canonicalId = canonicalPersonId(player);
      identityByPlayerId.set(player.id, {
        canonicalId,
        displayName: labelByPlayerId.get(player.id) ?? 'Unclaimed player',
      });

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
      styleBreakdownRows: profile.styleBreakdownRows,
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

export async function listSharedGameResultRows(
  userId: string,
): Promise<SharedGameResultRow[]> {
  const linkedPlayers = await getLinkedPlayers(userId);

  if (linkedPlayers.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const linkedPlayerIds = linkedPlayers.map((player) => player.id);
  const client = getAnalyticsClient(supabase);
  const { data: ownRows, error: ownError } = await client
    .from('player_game_results')
    .select('game_id')
    .in('player_id', linkedPlayerIds);

  if (ownError) {
    throw ownError;
  }

  const gameIds = [
    ...new Set(
      ((ownRows as Array<{ game_id: string | null }> | null) ?? [])
        .map((row) => row.game_id)
        .filter((gameId): gameId is string => Boolean(gameId)),
    ),
  ];

  if (gameIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from('player_game_results')
    .select(SHARED_RESULT_SELECT)
    .in('game_id', gameIds);

  if (error) {
    throw error;
  }

  const rows = await resolvePlayerLabelsInRows(
    supabase,
    (data as RawSharedGameResultRow[] | null) ?? [],
  );

  return rows
    .map(mapSharedGameResultRow)
    .sort(
      (left, right) =>
        left.playedOn.localeCompare(right.playedOn) ||
        left.gameId.localeCompare(right.gameId) ||
        left.placement - right.placement ||
        left.playerName.localeCompare(right.playerName),
    );
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

  const lineupRows = lineupRaw as RawLineupEffectRow[];
  const lineupLabelById = new Map(
    lineupRows.map((row) => [
      row.player_id,
      lookup(row.player_id, row.player_name).displayName,
    ]),
  );
  rewriteLineupLabels(lineupRows, (id) => lineupLabelById.get(id));

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
      mergeLineupEffects(lineupRows.map(mapLineupEffectRow), lookup),
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

  const usernameByPlayerId = await fetchUsernamesByPlayerId(
    supabase,
    ((players ?? []) as PlayerIdentityRow[]).map((player) => player.id),
  );
  const labelByPlayerId = buildAnalyticsPlayerLabelMap(
    ((players ?? []) as PlayerIdentityRow[]).map((player) => player.id),
    usernameByPlayerId,
  );

  for (const player of (players ?? []) as PlayerIdentityRow[]) {
    const canonicalId = canonicalPersonId(player);
    const label = labelByPlayerId.get(player.id) ?? 'Unclaimed player';
    identityByPlayerId.set(player.id, {
      canonicalId,
      displayName: label,
    });

    const isLinked = Boolean(player.linked_user_id);
    const shouldPreferName =
      !displayNameByCanonical.has(canonicalId) ||
      (isLinked && !linkedPreferredCanonicals.has(canonicalId));

    if (shouldPreferName) {
      displayNameByCanonical.set(canonicalId, label);

      if (isLinked) {
        linkedPreferredCanonicals.add(canonicalId);
      }
    }
  }

  const lookup: IdentityLookup = (playerId, _fallbackName) => {
    const identity = identityByPlayerId.get(playerId);
    const canonicalId = identity?.canonicalId ?? playerId;

    return {
      canonicalId,
      displayName:
        displayNameByCanonical.get(canonicalId) ??
        identity?.displayName ??
        'Unclaimed player',
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
