import {
  type IdentityLookup,
  mergeAwardFunderWinnerMatrix,
  mergeAwardOutcomes,
  mergeGameLengthPerformance,
  mergeGenerationDistribution,
  mergeGroupMapPerformance,
  mergeMilestoneEconomics,
  mergePlacementDistribution,
  mergePlayerAwardFundingOutcomes,
  mergePlayerCountPerformance,
  mergePlayerMapPerformance,
  mergePlayerMilestoneClaims,
  remapCardOutcomes,
  remapGenerationPace,
  remapTagOutcomes,
  remapTilePlacements,
} from '@/lib/db/overall-analytics-aggregators';
import { resolvePlayerLabelsInRows } from '@/lib/db/player-label-resolution';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type PlacementDistributionRow = {
  gamesPlayed: number;
  groupId: string;
  placement: number;
  playerId: string;
  playerName: string;
};

export type PlayerCountPerformanceRow = {
  averagePlacement: number;
  averageScore: number;
  gamesPlayed: number;
  groupId: string;
  playerCount: number;
  playerId: string;
  playerName: string;
  winRate: number;
  wins: number;
};

export type GenerationDistributionRow = {
  gamesPlayed: number;
  generationCount: number;
  groupId: string;
};

export type GameLengthBucket = 'long' | 'short' | 'standard';

export type GameLengthPerformanceRow = {
  averagePointsPerGeneration: number;
  averageScore: number;
  gamesPlayed: number;
  groupId: string;
  lengthBucket: GameLengthBucket;
  playerId: string;
  playerName: string;
  winRate: number;
  wins: number;
};

export type GroupMapPerformanceRow = {
  averageGenerationCount: number;
  averageScore: number;
  gamesPlayed: number;
  groupId: string;
  mapId: string | null;
  mapName: string;
};

export type PlayerMapPerformanceRow = {
  averagePlacement: number;
  averageScore: number;
  gamesPlayed: number;
  groupId: string;
  mapId: string | null;
  mapName: string;
  playerId: string;
  playerName: string;
  winRate: number;
  wins: number;
};

export type MilestoneEconomicsRow = {
  averageClaimerPlacement: number;
  claimRate: number;
  claimerWinRate: number;
  claimerWins: number;
  claims: number;
  groupId: string;
  milestoneId: string;
  milestoneName: string;
};

export type PlayerMilestoneClaimRow = {
  claimerWins: number;
  claims: number;
  groupId: string;
  milestoneId: string;
  milestoneName: string;
  playerId: string;
  playerName: string;
};

export type AwardOutcomeRow = {
  awardId: string;
  awardName: string;
  funderFirstPlaceCount?: number;
  funderFirstPlaceRate?: number;
  funderGameWonCount?: number;
  funderGameWonRate?: number;
  funderSecondPlaceCount?: number;
  funderSecondPlaceRate?: number;
  fundedCount: number;
  funderWonCount: number;
  funderWonRate: number;
  groupId: string;
  snipedCount: number;
};

export type PlayerAwardFundingOutcomeRow = {
  awardId: string;
  awardName: string;
  funderFirstPlaceCount: number;
  funderFirstPlaceRate: number;
  funderGameWonCount: number;
  funderGameWonRate: number;
  funderPlayerId: string;
  funderPlayerName: string;
  funderSecondPlaceCount: number;
  funderSecondPlaceRate: number;
  fundedCount: number;
  groupId: string;
};

export type AwardFunderWinnerRow = {
  awardId: string;
  awardName: string;
  firstPlaceAwards: number;
  funderPlayerId: string;
  funderPlayerName: string;
  groupId: string;
  winnerPlayerId: string;
  winnerPlayerName: string;
};

export type GenerationPaceRow = {
  awardsFunded: number;
  cardsPlayed: number;
  citiesPlaced: number;
  gameId: string;
  generationNumber: number;
  greeneriesPlaced: number;
  groupId: string;
  milestonesClaimed: number;
  playedOn: string;
  playerId: string;
  playerName: string;
  tilesPlaced: number;
};

export type TilePlacementRow = {
  boardSpace: string;
  gameId: string;
  groupId: string;
  mapName: string;
  placements: number;
  playedOn: string;
  playerId: string | null;
  playerName: string | null;
  tileType: string;
};

export type TagOutcomeRow = {
  corporationId: string | null;
  corporationName: string;
  gameId: string;
  groupId: string;
  isWinner: boolean;
  playedOn: string;
  playerId: string;
  playerName: string;
  tagCode: string;
  tagCount: number;
  totalPoints: number;
};

export type CardOutcomeRow = {
  cardId: string;
  cardName: string;
  gameId: string;
  groupId: string;
  isWinner: boolean;
  playedOn: string;
  playerId: string;
  playerName: string;
};

export type ExtendedGroupAnalytics = {
  awardFunderWinnerRows: AwardFunderWinnerRow[];
  awardOutcomeRows: AwardOutcomeRow[];
  cardOutcomeRows: CardOutcomeRow[];
  gameLengthPerformanceRows: GameLengthPerformanceRow[];
  generationDistributionRows: GenerationDistributionRow[];
  generationPaceRows: GenerationPaceRow[];
  groupMapPerformanceRows: GroupMapPerformanceRow[];
  milestoneEconomicsRows: MilestoneEconomicsRow[];
  placementDistributionRows: PlacementDistributionRow[];
  playerCountPerformanceRows: PlayerCountPerformanceRow[];
  playerAwardFundingRows?: PlayerAwardFundingOutcomeRow[];
  playerMapPerformanceRows: PlayerMapPerformanceRow[];
  playerMilestoneClaimRows: PlayerMilestoneClaimRow[];
  tagOutcomeRows: TagOutcomeRow[];
  tilePlacementRows: TilePlacementRow[];
};

type ExtendedAnalyticsSupabaseClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

type RawPlacementDistributionRow = {
  games_played: number;
  group_id: string;
  placement: number;
  player_id: string;
  player_name: string;
};

type RawPlayerCountPerformanceRow = {
  average_placement: number | string;
  average_score: number | string;
  games_played: number;
  group_id: string;
  player_count: number;
  player_id: string;
  player_name: string;
  win_rate: number | string;
  wins: number;
};

type RawGenerationDistributionRow = {
  games_played: number;
  generation_count: number;
  group_id: string;
};

type RawGameLengthPerformanceRow = {
  average_points_per_generation: number | string;
  average_score: number | string;
  games_played: number;
  group_id: string;
  length_bucket: string;
  player_id: string;
  player_name: string;
  win_rate: number | string;
  wins: number;
};

type RawGroupMapPerformanceRow = {
  average_generation_count: number | string;
  average_score: number | string;
  games_played: number;
  group_id: string;
  map_id: string | null;
  map_name: string;
};

type RawPlayerMapPerformanceRow = {
  average_placement: number | string;
  average_score: number | string;
  games_played: number;
  group_id: string;
  map_id: string | null;
  map_name: string;
  player_id: string;
  player_name: string;
  win_rate: number | string;
  wins: number;
};

type RawMilestoneEconomicsRow = {
  average_claimer_placement: number | string;
  claim_rate: number | string;
  claimer_win_rate: number | string;
  claimer_wins: number;
  claims: number;
  group_id: string;
  milestone_id: string;
  milestone_name: string;
};

type RawPlayerMilestoneClaimRow = {
  claimer_wins: number;
  claims: number;
  group_id: string;
  milestone_id: string;
  milestone_name: string;
  player_id: string;
  player_name: string;
};

type RawAwardOutcomeRow = {
  award_id: string;
  award_name: string;
  funder_first_place_count?: number;
  funder_first_place_rate?: number | string;
  funder_game_won_count?: number;
  funder_game_won_rate?: number | string;
  funder_second_place_count?: number;
  funder_second_place_rate?: number | string;
  funded_count: number;
  funder_won_count: number;
  funder_won_rate: number | string;
  group_id: string;
  sniped_count: number;
};

type RawPlayerAwardFundingOutcomeRow = {
  award_id: string;
  award_name: string;
  funder_first_place_count: number;
  funder_first_place_rate: number | string;
  funder_game_won_count: number;
  funder_game_won_rate: number | string;
  funder_player_id: string;
  funder_player_name: string;
  funder_second_place_count: number;
  funder_second_place_rate: number | string;
  funded_count: number;
  group_id: string;
};

type RawAwardFunderWinnerRow = {
  award_id: string;
  award_name: string;
  first_place_awards: number;
  funder_player_id: string;
  funder_player_name: string;
  group_id: string;
  winner_player_id: string;
  winner_player_name: string;
};

type RawGenerationPaceRow = {
  awards_funded: number;
  cards_played: number;
  cities_placed: number;
  game_id: string;
  generation_number: number;
  greeneries_placed: number;
  group_id: string;
  milestones_claimed: number;
  played_on: string;
  player_id: string;
  player_name: string;
  tiles_placed: number;
};

type RawTilePlacementRow = {
  board_space: string;
  game_id: string;
  group_id: string;
  map_name: string;
  placements: number;
  played_on: string;
  player_id: string | null;
  player_name: string | null;
  tile_type: string;
};

type RawTagOutcomeRow = {
  corporation_id: string | null;
  corporation_name: string;
  game_id: string;
  group_id: string;
  is_winner: boolean;
  played_on: string;
  player_id: string;
  player_name: string;
  tag_code: string;
  tag_count: number;
  total_points: number;
};

type RawCardOutcomeRow = {
  card_id: string;
  card_name: string;
  game_id: string;
  group_id: string;
  is_winner: boolean;
  played_on: string;
  player_id: string;
  player_name: string;
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || typeof value === 'undefined') {
    return 0;
  }

  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

function toGameLengthBucket(value: string): GameLengthBucket {
  if (value === 'short' || value === 'long') {
    return value;
  }

  return 'standard';
}

function getAnalyticsClient(supabase: ExtendedAnalyticsSupabaseClient) {
  return supabase.schema('analytics');
}

function mapPlacementDistributionRow(
  row: RawPlacementDistributionRow,
): PlacementDistributionRow {
  return {
    gamesPlayed: row.games_played,
    groupId: row.group_id,
    placement: row.placement,
    playerId: row.player_id,
    playerName: row.player_name,
  };
}

function mapPlayerCountPerformanceRow(
  row: RawPlayerCountPerformanceRow,
): PlayerCountPerformanceRow {
  return {
    averagePlacement: toNumber(row.average_placement),
    averageScore: toNumber(row.average_score),
    gamesPlayed: row.games_played,
    groupId: row.group_id,
    playerCount: row.player_count,
    playerId: row.player_id,
    playerName: row.player_name,
    winRate: toNumber(row.win_rate),
    wins: row.wins,
  };
}

function mapGenerationDistributionRow(
  row: RawGenerationDistributionRow,
): GenerationDistributionRow {
  return {
    gamesPlayed: row.games_played,
    generationCount: row.generation_count,
    groupId: row.group_id,
  };
}

function mapGameLengthPerformanceRow(
  row: RawGameLengthPerformanceRow,
): GameLengthPerformanceRow {
  return {
    averagePointsPerGeneration: toNumber(row.average_points_per_generation),
    averageScore: toNumber(row.average_score),
    gamesPlayed: row.games_played,
    groupId: row.group_id,
    lengthBucket: toGameLengthBucket(row.length_bucket),
    playerId: row.player_id,
    playerName: row.player_name,
    winRate: toNumber(row.win_rate),
    wins: row.wins,
  };
}

function mapGroupMapPerformanceRow(
  row: RawGroupMapPerformanceRow,
): GroupMapPerformanceRow {
  return {
    averageGenerationCount: toNumber(row.average_generation_count),
    averageScore: toNumber(row.average_score),
    gamesPlayed: row.games_played,
    groupId: row.group_id,
    mapId: row.map_id,
    mapName: row.map_name,
  };
}

function mapPlayerMapPerformanceRow(
  row: RawPlayerMapPerformanceRow,
): PlayerMapPerformanceRow {
  return {
    averagePlacement: toNumber(row.average_placement),
    averageScore: toNumber(row.average_score),
    gamesPlayed: row.games_played,
    groupId: row.group_id,
    mapId: row.map_id,
    mapName: row.map_name,
    playerId: row.player_id,
    playerName: row.player_name,
    winRate: toNumber(row.win_rate),
    wins: row.wins,
  };
}

function mapMilestoneEconomicsRow(
  row: RawMilestoneEconomicsRow,
): MilestoneEconomicsRow {
  return {
    averageClaimerPlacement: toNumber(row.average_claimer_placement),
    claimRate: toNumber(row.claim_rate),
    claimerWinRate: toNumber(row.claimer_win_rate),
    claimerWins: row.claimer_wins,
    claims: row.claims,
    groupId: row.group_id,
    milestoneId: row.milestone_id,
    milestoneName: row.milestone_name,
  };
}

function mapPlayerMilestoneClaimRow(
  row: RawPlayerMilestoneClaimRow,
): PlayerMilestoneClaimRow {
  return {
    claimerWins: row.claimer_wins,
    claims: row.claims,
    groupId: row.group_id,
    milestoneId: row.milestone_id,
    milestoneName: row.milestone_name,
    playerId: row.player_id,
    playerName: row.player_name,
  };
}

function mapAwardOutcomeRow(row: RawAwardOutcomeRow): AwardOutcomeRow {
  return {
    awardId: row.award_id,
    awardName: row.award_name,
    funderFirstPlaceCount: row.funder_first_place_count,
    funderFirstPlaceRate: toNumber(row.funder_first_place_rate),
    funderGameWonCount: row.funder_game_won_count,
    funderGameWonRate: toNumber(row.funder_game_won_rate),
    funderSecondPlaceCount: row.funder_second_place_count,
    funderSecondPlaceRate: toNumber(row.funder_second_place_rate),
    fundedCount: row.funded_count,
    funderWonCount: row.funder_won_count,
    funderWonRate: toNumber(row.funder_won_rate),
    groupId: row.group_id,
    snipedCount: row.sniped_count,
  };
}

function mapPlayerAwardFundingOutcomeRow(
  row: RawPlayerAwardFundingOutcomeRow,
): PlayerAwardFundingOutcomeRow {
  return {
    awardId: row.award_id,
    awardName: row.award_name,
    funderFirstPlaceCount: row.funder_first_place_count,
    funderFirstPlaceRate: toNumber(row.funder_first_place_rate),
    funderGameWonCount: row.funder_game_won_count,
    funderGameWonRate: toNumber(row.funder_game_won_rate),
    funderPlayerId: row.funder_player_id,
    funderPlayerName: row.funder_player_name,
    funderSecondPlaceCount: row.funder_second_place_count,
    funderSecondPlaceRate: toNumber(row.funder_second_place_rate),
    fundedCount: row.funded_count,
    groupId: row.group_id,
  };
}

function mapAwardFunderWinnerRow(
  row: RawAwardFunderWinnerRow,
): AwardFunderWinnerRow {
  return {
    awardId: row.award_id,
    awardName: row.award_name,
    firstPlaceAwards: row.first_place_awards,
    funderPlayerId: row.funder_player_id,
    funderPlayerName: row.funder_player_name,
    groupId: row.group_id,
    winnerPlayerId: row.winner_player_id,
    winnerPlayerName: row.winner_player_name,
  };
}

function mapGenerationPaceRow(row: RawGenerationPaceRow): GenerationPaceRow {
  return {
    awardsFunded: row.awards_funded,
    cardsPlayed: row.cards_played,
    citiesPlaced: row.cities_placed,
    gameId: row.game_id,
    generationNumber: row.generation_number,
    greeneriesPlaced: row.greeneries_placed,
    groupId: row.group_id,
    milestonesClaimed: row.milestones_claimed,
    playedOn: row.played_on,
    playerId: row.player_id,
    playerName: row.player_name,
    tilesPlaced: row.tiles_placed,
  };
}

function mapTilePlacementRow(row: RawTilePlacementRow): TilePlacementRow {
  return {
    boardSpace: row.board_space,
    gameId: row.game_id,
    groupId: row.group_id,
    mapName: row.map_name,
    placements: row.placements,
    playedOn: row.played_on,
    playerId: row.player_id,
    playerName: row.player_name,
    tileType: row.tile_type,
  };
}

function mapTagOutcomeRow(row: RawTagOutcomeRow): TagOutcomeRow {
  return {
    corporationId: row.corporation_id,
    corporationName: row.corporation_name,
    gameId: row.game_id,
    groupId: row.group_id,
    isWinner: row.is_winner,
    playedOn: row.played_on,
    playerId: row.player_id,
    playerName: row.player_name,
    tagCode: row.tag_code,
    tagCount: row.tag_count,
    totalPoints: row.total_points,
  };
}

function mapCardOutcomeRow(row: RawCardOutcomeRow): CardOutcomeRow {
  return {
    cardId: row.card_id,
    cardName: row.card_name,
    gameId: row.game_id,
    groupId: row.group_id,
    isWinner: row.is_winner,
    playedOn: row.played_on,
    playerId: row.player_id,
    playerName: row.player_name,
  };
}

export function sortPlacementDistributionRows(rows: PlacementDistributionRow[]) {
  return [...rows].sort(
    (left, right) =>
      left.playerName.localeCompare(right.playerName) ||
      left.placement - right.placement,
  );
}

export function sortGenerationPaceRows(rows: GenerationPaceRow[]) {
  return [...rows].sort(
    (left, right) =>
      left.playedOn.localeCompare(right.playedOn) ||
      left.gameId.localeCompare(right.gameId) ||
      left.generationNumber - right.generationNumber ||
      left.playerName.localeCompare(right.playerName),
  );
}

async function listView<TRaw, TRow>(
  view: string,
  groupId: string | string[],
  mapRow: (row: TRaw) => TRow,
) {
  const supabase = await createSupabaseServerClient();
  const base = getAnalyticsClient(supabase).from(view).select('*');
  const { data, error } = await (Array.isArray(groupId)
    ? base.in('group_id', groupId)
    : base.eq('group_id', groupId));

  if (error) {
    throw error;
  }

  const rows = await resolvePlayerLabelsInRows(supabase, (data ?? []) as TRaw[]);
  return rows.map(mapRow);
}

export async function listPlacementDistribution(groupId: string) {
  return sortPlacementDistributionRows(
    await listView(
      'player_placement_distribution',
      groupId,
      mapPlacementDistributionRow,
    ),
  );
}

export async function listPlayerCountPerformance(groupId: string) {
  const rows = await listView(
    'player_count_performance',
    groupId,
    mapPlayerCountPerformanceRow,
  );

  return rows.sort(
    (left, right) =>
      left.playerName.localeCompare(right.playerName) ||
      left.playerCount - right.playerCount,
  );
}

export async function listGenerationDistribution(groupId: string) {
  const rows = await listView(
    'group_generation_distribution',
    groupId,
    mapGenerationDistributionRow,
  );

  return rows.sort((left, right) => left.generationCount - right.generationCount);
}

export async function listGameLengthPerformance(groupId: string) {
  const bucketOrder: Record<GameLengthBucket, number> = {
    long: 2,
    short: 0,
    standard: 1,
  };
  const rows = await listView(
    'player_game_length_performance',
    groupId,
    mapGameLengthPerformanceRow,
  );

  return rows.sort(
    (left, right) =>
      left.playerName.localeCompare(right.playerName) ||
      bucketOrder[left.lengthBucket] - bucketOrder[right.lengthBucket],
  );
}

export async function listGroupMapPerformance(groupId: string) {
  const rows = await listView(
    'group_map_performance',
    groupId,
    mapGroupMapPerformanceRow,
  );

  return rows.sort(
    (left, right) =>
      right.gamesPlayed - left.gamesPlayed ||
      left.mapName.localeCompare(right.mapName),
  );
}

export async function listPlayerMapPerformance(groupId: string) {
  const rows = await listView(
    'player_map_performance',
    groupId,
    mapPlayerMapPerformanceRow,
  );

  return rows.sort(
    (left, right) =>
      left.playerName.localeCompare(right.playerName) ||
      right.gamesPlayed - left.gamesPlayed ||
      left.mapName.localeCompare(right.mapName),
  );
}

export async function listMilestoneEconomics(groupId: string) {
  const rows = await listView(
    'group_milestone_economics',
    groupId,
    mapMilestoneEconomicsRow,
  );

  return rows.sort(
    (left, right) =>
      right.claims - left.claims ||
      left.milestoneName.localeCompare(right.milestoneName),
  );
}

export async function listPlayerMilestoneClaims(groupId: string) {
  const rows = await listView(
    'player_milestone_claims',
    groupId,
    mapPlayerMilestoneClaimRow,
  );

  return rows.sort(
    (left, right) =>
      right.claims - left.claims ||
      left.playerName.localeCompare(right.playerName) ||
      left.milestoneName.localeCompare(right.milestoneName),
  );
}

export async function listAwardOutcomes(groupId: string) {
  const rows = await listView(
    'group_award_outcomes',
    groupId,
    mapAwardOutcomeRow,
  );

  return rows.sort(
    (left, right) =>
      right.fundedCount - left.fundedCount ||
      left.awardName.localeCompare(right.awardName),
  );
}

export async function listPlayerAwardFundingOutcomes(groupId: string) {
  const rows = await listView(
    'player_award_funding_outcomes',
    groupId,
    mapPlayerAwardFundingOutcomeRow,
  );

  return rows.sort(
    (left, right) =>
      left.funderPlayerName.localeCompare(right.funderPlayerName) ||
      right.fundedCount - left.fundedCount ||
      left.awardName.localeCompare(right.awardName),
  );
}

export async function listAwardFunderWinnerMatrix(groupId: string) {
  const rows = await listView(
    'award_funder_winner_matrix',
    groupId,
    mapAwardFunderWinnerRow,
  );

  return rows.sort(
    (left, right) =>
      left.funderPlayerName.localeCompare(right.funderPlayerName) ||
      left.winnerPlayerName.localeCompare(right.winnerPlayerName) ||
      left.awardName.localeCompare(right.awardName),
  );
}

export async function listGenerationPace(groupId: string) {
  return sortGenerationPaceRows(
    await listView('game_generation_pace', groupId, mapGenerationPaceRow),
  );
}

export async function listTilePlacements(groupId: string) {
  const rows = await listView(
    'game_tile_placements',
    groupId,
    mapTilePlacementRow,
  );

  return rows.sort(
    (left, right) =>
      left.playedOn.localeCompare(right.playedOn) ||
      left.gameId.localeCompare(right.gameId) ||
      Number(left.boardSpace) - Number(right.boardSpace),
  );
}

export async function listTagOutcomes(groupId: string) {
  const rows = await listView('player_tag_outcomes', groupId, mapTagOutcomeRow);

  return rows.sort(
    (left, right) =>
      left.playerName.localeCompare(right.playerName) ||
      left.playedOn.localeCompare(right.playedOn) ||
      left.tagCode.localeCompare(right.tagCode),
  );
}

export async function listCardOutcomes(groupId: string) {
  const rows = await listView(
    'player_card_outcomes',
    groupId,
    mapCardOutcomeRow,
  );

  return rows.sort(
    (left, right) =>
      left.playerName.localeCompare(right.playerName) ||
      left.playedOn.localeCompare(right.playedOn) ||
      left.cardName.localeCompare(right.cardName),
  );
}

export async function getExtendedGroupAnalytics(
  groupId: string,
): Promise<ExtendedGroupAnalytics> {
  const [
    placementDistributionRows,
    playerCountPerformanceRows,
    generationDistributionRows,
    gameLengthPerformanceRows,
    groupMapPerformanceRows,
    playerMapPerformanceRows,
    milestoneEconomicsRows,
    playerMilestoneClaimRows,
    awardOutcomeRows,
    playerAwardFundingRows,
    awardFunderWinnerRows,
    generationPaceRows,
    tilePlacementRows,
    tagOutcomeRows,
    cardOutcomeRows,
  ] = await Promise.all([
    listPlacementDistribution(groupId),
    listPlayerCountPerformance(groupId),
    listGenerationDistribution(groupId),
    listGameLengthPerformance(groupId),
    listGroupMapPerformance(groupId),
    listPlayerMapPerformance(groupId),
    listMilestoneEconomics(groupId),
    listPlayerMilestoneClaims(groupId),
    listAwardOutcomes(groupId),
    listPlayerAwardFundingOutcomes(groupId),
    listAwardFunderWinnerMatrix(groupId),
    listGenerationPace(groupId),
    listTilePlacements(groupId),
    listTagOutcomes(groupId),
    listCardOutcomes(groupId),
  ]);

  return {
    awardFunderWinnerRows,
    awardOutcomeRows,
    cardOutcomeRows,
    gameLengthPerformanceRows,
    generationDistributionRows,
    generationPaceRows,
    groupMapPerformanceRows,
    milestoneEconomicsRows,
    placementDistributionRows,
    playerCountPerformanceRows,
    playerAwardFundingRows,
    playerMapPerformanceRows,
    playerMilestoneClaimRows,
    tagOutcomeRows,
    tilePlacementRows,
  };
}

export type AwardEconomicsScope = 'global' | 'personal';

export type AwardEconomics = {
  awardFunderWinnerRows: AwardFunderWinnerRow[];
  awardOutcomeRows: AwardOutcomeRow[];
};

/**
 * Award funding economics aggregated across many games at once, independent of
 * the active group. Backed by the SECURITY DEFINER `get_award_economics` RPC.
 * scope = 'personal' (default) covers games a player linked to the caller played
 * in; scope = 'global' covers every finalized game.
 */
export async function getAwardEconomics(
  scope: AwardEconomicsScope = 'personal',
): Promise<AwardEconomics> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_award_economics', { scope });

  if (error) {
    throw error;
  }

  const payload = (data ?? {}) as {
    matrix?: Omit<RawAwardFunderWinnerRow, 'group_id'>[];
    outcomes?: Omit<RawAwardOutcomeRow, 'group_id'>[];
  };

  const matrixRows = await resolvePlayerLabelsInRows(supabase, payload.matrix ?? []);

  return {
    awardFunderWinnerRows: matrixRows.map((row) =>
      mapAwardFunderWinnerRow({ ...row, group_id: 'global' }),
    ),
    awardOutcomeRows: (payload.outcomes ?? []).map((row) =>
      mapAwardOutcomeRow({ ...row, group_id: 'global' }),
    ),
  };
}

export function buildEmptyExtendedAnalytics(): ExtendedGroupAnalytics {
  return {
    awardFunderWinnerRows: [],
    awardOutcomeRows: [],
    cardOutcomeRows: [],
    gameLengthPerformanceRows: [],
    generationDistributionRows: [],
    generationPaceRows: [],
    groupMapPerformanceRows: [],
    milestoneEconomicsRows: [],
    placementDistributionRows: [],
    playerCountPerformanceRows: [],
    playerMapPerformanceRows: [],
    playerMilestoneClaimRows: [],
    tagOutcomeRows: [],
    tilePlacementRows: [],
  };
}

const GAME_LENGTH_BUCKET_ORDER: Record<GameLengthBucket, number> = {
  long: 2,
  short: 0,
  standard: 1,
};

/**
 * Cross-group ("Overall") extended analytics: every extended view fetched across
 * the caller's whole group set and re-aggregated to canonical persons via the
 * helpers in overall-analytics-aggregators. `lookup` maps each per-group player
 * id to a stable identity; `totalFinalizedGames` is the denominator for the
 * milestone claim-rate. Output is shaped exactly like getExtendedGroupAnalytics
 * so the dashboard sections consume it unchanged.
 */
export async function getOverallExtendedAnalytics(
  groupIds: string[],
  lookup: IdentityLookup,
  totalFinalizedGames: number,
): Promise<ExtendedGroupAnalytics> {
  if (groupIds.length === 0) {
    return buildEmptyExtendedAnalytics();
  }

  const [
    placementRows,
    playerCountRows,
    generationDistributionRaw,
    gameLengthRows,
    groupMapRows,
    playerMapRows,
    milestoneEconomicsRaw,
    playerMilestoneRows,
    awardOutcomeRaw,
    playerAwardFundingRaw,
    awardMatrixRows,
    generationPaceRaw,
    tilePlacementRaw,
    tagOutcomeRaw,
    cardOutcomeRaw,
  ] = await Promise.all([
    listView<RawPlacementDistributionRow, PlacementDistributionRow>(
      'player_placement_distribution',
      groupIds,
      mapPlacementDistributionRow,
    ),
    listView<RawPlayerCountPerformanceRow, PlayerCountPerformanceRow>(
      'player_count_performance',
      groupIds,
      mapPlayerCountPerformanceRow,
    ),
    listView<RawGenerationDistributionRow, GenerationDistributionRow>(
      'group_generation_distribution',
      groupIds,
      mapGenerationDistributionRow,
    ),
    listView<RawGameLengthPerformanceRow, GameLengthPerformanceRow>(
      'player_game_length_performance',
      groupIds,
      mapGameLengthPerformanceRow,
    ),
    listView<RawGroupMapPerformanceRow, GroupMapPerformanceRow>(
      'group_map_performance',
      groupIds,
      mapGroupMapPerformanceRow,
    ),
    listView<RawPlayerMapPerformanceRow, PlayerMapPerformanceRow>(
      'player_map_performance',
      groupIds,
      mapPlayerMapPerformanceRow,
    ),
    listView<RawMilestoneEconomicsRow, MilestoneEconomicsRow>(
      'group_milestone_economics',
      groupIds,
      mapMilestoneEconomicsRow,
    ),
    listView<RawPlayerMilestoneClaimRow, PlayerMilestoneClaimRow>(
      'player_milestone_claims',
      groupIds,
      mapPlayerMilestoneClaimRow,
    ),
    listView<RawAwardOutcomeRow, AwardOutcomeRow>(
      'group_award_outcomes',
      groupIds,
      mapAwardOutcomeRow,
    ),
    listView<RawPlayerAwardFundingOutcomeRow, PlayerAwardFundingOutcomeRow>(
      'player_award_funding_outcomes',
      groupIds,
      mapPlayerAwardFundingOutcomeRow,
    ),
    listView<RawAwardFunderWinnerRow, AwardFunderWinnerRow>(
      'award_funder_winner_matrix',
      groupIds,
      mapAwardFunderWinnerRow,
    ),
    listView<RawGenerationPaceRow, GenerationPaceRow>(
      'game_generation_pace',
      groupIds,
      mapGenerationPaceRow,
    ),
    listView<RawTilePlacementRow, TilePlacementRow>(
      'game_tile_placements',
      groupIds,
      mapTilePlacementRow,
    ),
    listView<RawTagOutcomeRow, TagOutcomeRow>(
      'player_tag_outcomes',
      groupIds,
      mapTagOutcomeRow,
    ),
    listView<RawCardOutcomeRow, CardOutcomeRow>(
      'player_card_outcomes',
      groupIds,
      mapCardOutcomeRow,
    ),
  ]);

  return {
    placementDistributionRows: sortPlacementDistributionRows(
      mergePlacementDistribution(placementRows, lookup),
    ),
    playerCountPerformanceRows: mergePlayerCountPerformance(
      playerCountRows,
      lookup,
    ).sort(
      (left, right) =>
        left.playerName.localeCompare(right.playerName) ||
        left.playerCount - right.playerCount,
    ),
    generationDistributionRows: mergeGenerationDistribution(
      generationDistributionRaw,
    ).sort((left, right) => left.generationCount - right.generationCount),
    gameLengthPerformanceRows: mergeGameLengthPerformance(
      gameLengthRows,
      lookup,
    ).sort(
      (left, right) =>
        left.playerName.localeCompare(right.playerName) ||
        GAME_LENGTH_BUCKET_ORDER[left.lengthBucket] -
          GAME_LENGTH_BUCKET_ORDER[right.lengthBucket],
    ),
    groupMapPerformanceRows: mergeGroupMapPerformance(groupMapRows).sort(
      (left, right) =>
        right.gamesPlayed - left.gamesPlayed ||
        left.mapName.localeCompare(right.mapName),
    ),
    playerMapPerformanceRows: mergePlayerMapPerformance(
      playerMapRows,
      lookup,
    ).sort(
      (left, right) =>
        left.playerName.localeCompare(right.playerName) ||
        right.gamesPlayed - left.gamesPlayed ||
        left.mapName.localeCompare(right.mapName),
    ),
    milestoneEconomicsRows: mergeMilestoneEconomics(
      milestoneEconomicsRaw,
      totalFinalizedGames,
    ).sort(
      (left, right) =>
        right.claims - left.claims ||
        left.milestoneName.localeCompare(right.milestoneName),
    ),
    playerMilestoneClaimRows: mergePlayerMilestoneClaims(
      playerMilestoneRows,
      lookup,
    ).sort(
      (left, right) =>
        right.claims - left.claims ||
        left.playerName.localeCompare(right.playerName) ||
        left.milestoneName.localeCompare(right.milestoneName),
    ),
    awardOutcomeRows: mergeAwardOutcomes(awardOutcomeRaw).sort(
      (left, right) =>
        right.fundedCount - left.fundedCount ||
        left.awardName.localeCompare(right.awardName),
    ),
    awardFunderWinnerRows: mergeAwardFunderWinnerMatrix(
      awardMatrixRows,
      lookup,
    ).sort(
      (left, right) =>
        left.funderPlayerName.localeCompare(right.funderPlayerName) ||
        left.winnerPlayerName.localeCompare(right.winnerPlayerName) ||
        left.awardName.localeCompare(right.awardName),
    ),
    playerAwardFundingRows: mergePlayerAwardFundingOutcomes(
      playerAwardFundingRaw,
      lookup,
    ).sort(
      (left, right) =>
        left.funderPlayerName.localeCompare(right.funderPlayerName) ||
        right.fundedCount - left.fundedCount ||
        left.awardName.localeCompare(right.awardName),
    ),
    generationPaceRows: sortGenerationPaceRows(
      remapGenerationPace(generationPaceRaw, lookup),
    ),
    tilePlacementRows: remapTilePlacements(tilePlacementRaw, lookup).sort(
      (left, right) =>
        left.playedOn.localeCompare(right.playedOn) ||
        left.gameId.localeCompare(right.gameId) ||
        Number(left.boardSpace) - Number(right.boardSpace),
    ),
    tagOutcomeRows: remapTagOutcomes(tagOutcomeRaw, lookup).sort(
      (left, right) =>
        left.playerName.localeCompare(right.playerName) ||
        left.playedOn.localeCompare(right.playedOn) ||
        left.tagCode.localeCompare(right.tagCode),
    ),
    cardOutcomeRows: remapCardOutcomes(cardOutcomeRaw, lookup).sort(
      (left, right) =>
        left.playerName.localeCompare(right.playerName) ||
        left.playedOn.localeCompare(right.playedOn) ||
        left.cardName.localeCompare(right.cardName),
    ),
  };
}
