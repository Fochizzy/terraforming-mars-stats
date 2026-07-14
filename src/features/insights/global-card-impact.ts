import type { CardWinStat } from '@/lib/db/selection-stats-repo';

// Treat ten plays as the equivalent of the baseline prior. This empirical-
// Bayes shrinkage keeps a five-play streak from outranking a repeated signal,
// while still allowing its evidence weight to grow smoothly with more plays.
export const GLOBAL_CARD_IMPACT_PRIOR_PLAYS = 10;
export const GLOBAL_CARD_IMPACT_MIN_PLAYS = 5;

export type GlobalCardImpactDatum = {
  cardName: string;
  evidenceWeight: number;
  impactScore: number;
  plays: number;
  victoryImpact: number;
  winRate: number;
};

export function buildGlobalCardImpactData(
  cards: CardWinStat[],
  baselineWinRate: number,
  direction: 'negative' | 'positive',
  {
    limit,
    minPlays,
  }: {
    limit?: number;
    minPlays: number;
  },
): GlobalCardImpactDatum[] {
  const ranked = cards
    .filter((card) => card.plays >= minPlays)
    .map((card) => {
      const victoryImpact = card.win_rate_when_played - baselineWinRate;
      const evidenceWeight =
        card.plays / (card.plays + GLOBAL_CARD_IMPACT_PRIOR_PLAYS);

      return {
        cardName: card.card_name,
        evidenceWeight,
        // This composite combines performance lift with repeat-play evidence.
        // The displayed score remains in percentage-point units.
        impactScore: victoryImpact * evidenceWeight,
        plays: card.plays,
        victoryImpact,
        winRate: card.win_rate_when_played,
      };
    })
    .filter((card) =>
      direction === 'positive'
        ? card.victoryImpact > 0
        : card.victoryImpact < 0,
    )
    .sort((left, right) => {
      const scoreOrder =
        direction === 'positive'
          ? right.impactScore - left.impactScore
          : left.impactScore - right.impactScore;

      return (
        scoreOrder ||
        right.plays - left.plays ||
        left.cardName.localeCompare(right.cardName)
      );
    });

  return typeof limit === 'number' ? ranked.slice(0, limit) : ranked;
}

export function formatImpactPoints(impact: number, digits = 0) {
  const points = Number((impact * 100).toFixed(digits));
  return `${points > 0 ? '+' : points < 0 ? '−' : ''}${Math.abs(points)} pts`;
}

export function describeGlobalCardImpact(
  card: GlobalCardImpactDatum,
  baselineWinRate: number,
) {
  const playWord = card.plays === 1 ? 'play' : 'plays';
  const evidencePercent = Math.round(card.evidenceWeight * 100);

  return `${Math.round(card.winRate * 100)}% win rate versus the ${Math.round(
    baselineWinRate * 100,
  )}% baseline (${formatImpactPoints(card.victoryImpact)}) across ${card.plays} ${playWord}. Play-count confidence is ${evidencePercent}%, producing a composite impact score of ${formatImpactPoints(card.impactScore, 1)}; both performance and repeated evidence determine the rank.`;
}
