import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { EloLeaderboardRow } from '@/lib/elo-leaderboard-model';
import { resolvePlayerLabelsInRows } from './player-label-resolution';
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

  const resolvedRows = await resolvePlayerLabelsInRows(
    supabase,
    (data ?? []) as RawEloRow[],
  );

  return mergeEloRowsByUsername(resolvedRows.map((row) => ({
    averageWinMargin:
      row.average_win_margin === null ? null : Number(row.average_win_margin),
    eloRating: Number(row.elo_rating),
    gamesPlayed: Number(row.games_played),
    lastChange: Number(row.last_change),
    playerId: row.player_id,
    playerName: row.player_name,
    winRate: Number(row.win_rate),
    wins: Number(row.wins),
  }))) satisfies EloLeaderboardRow[];
}

/**
 * The database function now rates canonical account identities directly. Keep
 * this defensive merge so a deployment cannot briefly show duplicate rows if
 * application code reaches production before its migration finishes.
 */
export function mergeEloRowsByUsername(rows: EloLeaderboardRow[]) {
  const byUsername = new Map<string, EloLeaderboardRow[]>();

  for (const row of rows) {
    const key = row.playerName.trim().toLocaleLowerCase('en-US');
    const matches = byUsername.get(key) ?? [];
    matches.push(row);
    byUsername.set(key, matches);
  }

  return [...byUsername.values()]
    .map((matches) => {
      if (matches.length === 1) {
        return matches[0];
      }

      const gamesPlayed = matches.reduce((sum, row) => sum + row.gamesPlayed, 0);
      const wins = matches.reduce((sum, row) => sum + row.wins, 0);
      const marginWeight = matches.reduce(
        (sum, row) => sum + (row.averageWinMargin === null ? 0 : row.wins),
        0,
      );
      const averageWinMargin =
        marginWeight === 0
          ? null
          : matches.reduce(
              (sum, row) =>
                sum + (row.averageWinMargin ?? 0) * row.wins,
              0,
            ) / marginWeight;

      return {
        averageWinMargin,
        // Independent legacy rows each started at 1500, so combine only their
        // movement away from the common baseline.
        eloRating: Math.round(
          1500 +
            matches.reduce((sum, row) => sum + (row.eloRating - 1500), 0),
        ),
        gamesPlayed,
        lastChange: matches.reduce((sum, row) => sum + row.lastChange, 0),
        playerId: matches[0].playerId,
        playerName: matches[0].playerName,
        winRate: gamesPlayed === 0 ? 0 : wins / gamesPlayed,
        wins,
      } satisfies EloLeaderboardRow;
    })
    .sort(
      (left, right) =>
        right.eloRating - left.eloRating ||
        right.wins - left.wins ||
        right.gamesPlayed - left.gamesPlayed ||
        left.playerName.localeCompare(right.playerName),
    );
}

export async function getHiddenLeaderboardPlayerIds(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('user_hidden_leaderboard_players')
    .select('player_id')
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []).map((row) => String(row.player_id));
}

export async function setHiddenLeaderboardPlayer(input: {
  hidden: boolean;
  playerId: string;
  userId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const query = input.hidden
    ? supabase.from('user_hidden_leaderboard_players').upsert(
        { player_id: input.playerId, user_id: input.userId },
        { onConflict: 'user_id,player_id' },
      )
    : supabase
        .from('user_hidden_leaderboard_players')
        .delete()
        .eq('user_id', input.userId)
        .eq('player_id', input.playerId);
  const { error } = await query;
  if (error) throw error;
}
