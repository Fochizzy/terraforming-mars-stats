import type { CardWinStat } from '@/lib/db/selection-stats-repo';

export const GLOBAL_KEY_CARD_LIMIT = 15;

// Cards need enough plays before a win rate says anything about victory impact;
// below this a single game swings the rate by tens of points.
export const GLOBAL_KEY_CARD_MIN_PLAYS = 5;

export type GlobalKeyCardDatum = {
  cardName: string;
  plays: number;
  victoryImpact: number;
  winRate: number;
};

// "Key cards" across every recorded game: rank cards by victory impact — how far
// their win rate when played sits above the baseline win rate for all games —
// rather than by raw play count or win rate alone. A high bar with few plays is
// noise, so cards under the play floor are dropped before ranking.
export function buildGlobalKeyCardData(
  cards: CardWinStat[],
  baselineWinRate: number,
  {
    limit = GLOBAL_KEY_CARD_LIMIT,
    minPlays = GLOBAL_KEY_CARD_MIN_PLAYS,
  }: { limit?: number; minPlays?: number } = {},
): GlobalKeyCardDatum[] {
  return cards
    .filter((card) => card.plays >= minPlays)
    .map((card) => ({
      cardName: card.card_name,
      plays: card.plays,
      victoryImpact: card.win_rate_when_played - baselineWinRate,
      winRate: card.win_rate_when_played,
    }))
    .filter((card) => card.victoryImpact > 0)
    .sort(
      (left, right) =>
        right.victoryImpact - left.victoryImpact ||
        right.plays - left.plays ||
        left.cardName.localeCompare(right.cardName),
    )
    .slice(0, limit);
}

function formatImpactPoints(impact: number) {
  const points = Math.round(impact * 100);
  return `${points > 0 ? '+' : points < 0 ? '−' : ''}${Math.abs(points)} pts`;
}

export function GlobalKeyCardsSection(props: {
  cards: CardWinStat[];
  baselineWinRate: number;
}) {
  const data = buildGlobalKeyCardData(props.cards, props.baselineWinRate);
  const baselinePercent = Math.round(props.baselineWinRate * 100);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="tm-data-label text-xs">Key Cards (Highest Victory Impact)</h3>
      <p className="tm-muted-copy text-sm">
        Cards whose win rate when played sits furthest above the{' '}
        {baselinePercent}% baseline win rate across every recorded game. Cards
        with fewer than {GLOBAL_KEY_CARD_MIN_PLAYS} plays are held back so a
        single game can&apos;t crown a card.
      </p>
      {data.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
          Key cards will appear once finalized game logs record enough card
          plays to measure their impact.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="tm-data-label">
                <th className="py-1 pr-3">Card</th>
                <th className="py-1 pr-3">Victory impact</th>
                <th className="py-1 pr-3">Win rate</th>
                <th className="py-1 pr-3">Plays</th>
              </tr>
            </thead>
            <tbody>
              {data.map((card) => (
                <tr className="border-t border-white/5" key={card.cardName}>
                  <td className="py-1 pr-3 font-semibold text-stone-100">
                    {card.cardName}
                  </td>
                  <td className="py-1 pr-3 font-semibold text-emerald-400">
                    {formatImpactPoints(card.victoryImpact)}
                  </td>
                  <td className="py-1 pr-3">{Math.round(card.winRate * 100)}%</td>
                  <td className="py-1 pr-3">{card.plays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
