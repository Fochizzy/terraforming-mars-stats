import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { EloLeaderboardRow } from '@/lib/elo-leaderboard-model';
export type { EloLeaderboardRow } from '@/lib/elo-leaderboard-model';

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
