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
