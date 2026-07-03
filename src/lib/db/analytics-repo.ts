export function sortLeaderboardRows<T extends { weighted_score: number }>(
  rows: T[],
) {
  return [...rows].sort(
    (left, right) => right.weighted_score - left.weighted_score,
  );
}
