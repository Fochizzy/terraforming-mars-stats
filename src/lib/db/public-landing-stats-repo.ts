import { createSupabaseServerClient } from '@/lib/supabase/server';

export type NamedPlayStat = {
  name: string;
  plays: number;
};

export type NamedWinRateStat = {
  name: string;
  plays: number;
  winRate: number;
};

export type PublicLandingStats = {
  finishedGames: number;
  draftGames: number;
  totalPlayers: number;
  totalGroups: number;
  mapsPlayed: number;
  importedGames: number;
  distinctCorporations: number;
  distinctCards: number;
  avgMilestonesPerGame: number | null;
  avgAwardsPerGame: number | null;
  avgWinningScore: number | null;
  highestScore: number | null;
  avgGenerations: number | null;
  topPlayerWinRate: number | null;
  mostPlayedCorp: NamedPlayStat | null;
  topCorpWinRate: NamedWinRateStat | null;
  mostPlayedCard: NamedPlayStat | null;
  topCardWinRate: NamedWinRateStat | null;
};

export const emptyPublicLandingStats: PublicLandingStats = {
  finishedGames: 0,
  draftGames: 0,
  totalPlayers: 0,
  totalGroups: 0,
  mapsPlayed: 0,
  importedGames: 0,
  distinctCorporations: 0,
  distinctCards: 0,
  avgMilestonesPerGame: null,
  avgAwardsPerGame: null,
  avgWinningScore: null,
  highestScore: null,
  avgGenerations: null,
  topPlayerWinRate: null,
  mostPlayedCorp: null,
  topCorpWinRate: null,
  mostPlayedCard: null,
  topCardWinRate: null,
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toNamedPlayStat(value: unknown): NamedPlayStat | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.name !== 'string') {
    return null;
  }
  return { name: record.name, plays: toNumber(record.plays) };
}

function toNamedWinRateStat(value: unknown): NamedWinRateStat | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.name !== 'string') {
    return null;
  }
  return {
    name: record.name,
    plays: toNumber(record.plays),
    winRate: toNumber(record.winRate),
  };
}

export async function getPublicLandingStats(): Promise<PublicLandingStats> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_public_landing_stats');

  if (error) {
    throw error;
  }

  const payload = (data ?? {}) as Record<string, unknown>;

  return {
    finishedGames: toNumber(payload.finishedGames),
    draftGames: toNumber(payload.draftGames),
    totalPlayers: toNumber(payload.totalPlayers),
    totalGroups: toNumber(payload.totalGroups),
    mapsPlayed: toNumber(payload.mapsPlayed),
    importedGames: toNumber(payload.importedGames),
    distinctCorporations: toNumber(payload.distinctCorporations),
    distinctCards: toNumber(payload.distinctCards),
    avgMilestonesPerGame: toNullableNumber(payload.avgMilestonesPerGame),
    avgAwardsPerGame: toNullableNumber(payload.avgAwardsPerGame),
    avgWinningScore: toNullableNumber(payload.avgWinningScore),
    highestScore: toNullableNumber(payload.highestScore),
    avgGenerations: toNullableNumber(payload.avgGenerations),
    topPlayerWinRate: toNullableNumber(payload.topPlayerWinRate),
    mostPlayedCorp: toNamedPlayStat(payload.mostPlayedCorp),
    topCorpWinRate: toNamedWinRateStat(payload.topCorpWinRate),
    mostPlayedCard: toNamedPlayStat(payload.mostPlayedCard),
    topCardWinRate: toNamedWinRateStat(payload.topCardWinRate),
  };
}
