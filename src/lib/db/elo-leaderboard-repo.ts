import { createSupabaseServerClient } from '@/lib/supabase/server';

export type EloLeaderboardRow = {
  averageWinMargin: number | null;
  eloRating: number;
  gamesPlayed: number;
  lastChange: number;
  playerId: string;
  playerName: string;
  winRate: number;
  wins: number;
};

type RawEloRow = {
  average_win_margin: number | string | null;
  elo_rating: number | string;
  games_played: number | string;
  last_change: number | string;
  player_id: string;
  player_name: string;
  win_rate: number | string;
  wins: number | string;
};

export async function getEloLeaderboard() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_elo_leaderboard');

  if (error) throw error;

  return ((data ?? []) as RawEloRow[]).map((row) => ({
    averageWinMargin:
      row.average_win_margin === null ? null : Number(row.average_win_margin),
    eloRating: Number(row.elo_rating),
    gamesPlayed: Number(row.games_played),
    lastChange: Number(row.last_change),
    playerId: row.player_id,
    playerName: row.player_name,
    winRate: Number(row.win_rate),
    wins: Number(row.wins),
  })) satisfies EloLeaderboardRow[];
}

export async function getSavedLeaderboardPlayerIds(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('user_leaderboard_players')
    .select('player_id')
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []).map((row) => String(row.player_id));
}

export async function setSavedLeaderboardPlayer(input: {
  playerId: string;
  saved: boolean;
  userId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const query = input.saved
    ? supabase.from('user_leaderboard_players').upsert(
        { player_id: input.playerId, user_id: input.userId },
        { onConflict: 'user_id,player_id' },
      )
    : supabase
        .from('user_leaderboard_players')
        .delete()
        .eq('user_id', input.userId)
        .eq('player_id', input.playerId);
  const { error } = await query;
  if (error) throw error;
}

export function buildLeaderboardHeatNarratives(rows: EloLeaderboardRow[]) {
  if (rows.length === 0) {
    return ['Save players to build your personal race for Mars.'];
  }
  const sorted = [...rows].sort((a, b) => b.eloRating - a.eloRating);
  const leader = sorted[0];
  const hottest = [...rows].sort((a, b) => b.lastChange - a.lastChange)[0];
  const closestGap = sorted.length > 1 ? leader.eloRating - sorted[1].eloRating : null;
  const narratives = [
    `${leader.playerName} controls the summit at ${leader.eloRating} Elo${closestGap !== null ? `, ${closestGap} points clear of the nearest challenger` : ''}.`,
  ];
  if (hottest.lastChange > 0) {
    narratives.push(`${hottest.playerName} carries the most heat after gaining ${hottest.lastChange.toFixed(1)} Elo in their latest result.`);
  }
  if (sorted.length > 1) {
    narratives.push(`The personal field spans ${leader.eloRating - sorted.at(-1)!.eloRating} Elo points; wins against the leaders create the largest upset opportunity.`);
  }
  return narratives;
}
