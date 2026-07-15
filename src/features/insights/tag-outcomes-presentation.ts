export type TagWinRatePresentationDatum = {
  averageTagCount: number;
  maxTagCount: number;
  results: number;
  tagCode: string;
  winRate: number;
  wins: number;
};

export type TagWinRateBand = 'strong' | 'competitive' | 'mixed' | 'winless';

export type TagWinRateSummary<T extends TagWinRatePresentationDatum> = {
  best: T;
  mostPlayed: T;
  weakest: T;
};

export function formatTagName(tagCode: string) {
  return tagCode
    .split(/[_-]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function getTagWinRateBand(winRate: number): TagWinRateBand {
  if (winRate > 50) {
    return 'strong';
  }

  if (winRate >= 40) {
    return 'competitive';
  }

  if (winRate > 0) {
    return 'mixed';
  }

  return 'winless';
}

export function isLowSampleTag(results: number) {
  return results < 5;
}

export function buildTagWinRateSummary<
  T extends TagWinRatePresentationDatum,
>(data: T[]): TagWinRateSummary<T> | null {
  if (data.length === 0) {
    return null;
  }

  const best = [...data].sort(
    (left, right) =>
      right.winRate - left.winRate ||
      right.results - left.results ||
      right.averageTagCount - left.averageTagCount ||
      left.tagCode.localeCompare(right.tagCode),
  )[0];
  const mostPlayed = [...data].sort(
    (left, right) =>
      right.results - left.results ||
      right.averageTagCount - left.averageTagCount ||
      right.maxTagCount - left.maxTagCount ||
      left.tagCode.localeCompare(right.tagCode),
  )[0];
  const weakest = [...data].sort(
    (left, right) =>
      left.winRate - right.winRate ||
      right.results - left.results ||
      right.averageTagCount - left.averageTagCount ||
      left.tagCode.localeCompare(right.tagCode),
  )[0];

  return { best, mostPlayed, weakest };
}
