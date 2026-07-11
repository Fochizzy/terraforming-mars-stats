import type { CardWinStat } from '@/lib/db/selection-stats-repo';

export const WINNING_CARD_LIMIT = 15;

// get_selection_stats already rounds win_rate_when_played to three decimals, so
// for the modest per-card play counts we track, plays × rate reconstructs the
// underlying win count exactly once rounded — no need to widen the RPC payload.
function deriveWins(card: CardWinStat) {
  return Math.round(card.plays * card.win_rate_when_played);
}

export type WinningCardDatum = {
  cardName: string;
  plays: number;
  winRate: number;
  wins: number;
};

// "Most commonly used cards when there is a win": rank cards by how often they
// were in play in a game the player went on to win, not by raw play count or by
// win rate (which lets a single lucky play top the list).
export function buildWinningCardData(
  cards: CardWinStat[],
  limit = WINNING_CARD_LIMIT,
): WinningCardDatum[] {
  return cards
    .map((card) => ({
      cardName: card.card_name,
      plays: card.plays,
      winRate: Math.round(card.win_rate_when_played * 100),
      wins: deriveWins(card),
    }))
    .filter((card) => card.wins > 0)
    .sort(
      (left, right) =>
        right.wins - left.wins ||
        right.plays - left.plays ||
        left.cardName.localeCompare(right.cardName),
    )
    .slice(0, limit);
}

export function WinningCardsSection(props: { cards: CardWinStat[] }) {
  const data = buildWinningCardData(props.cards);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="tm-data-label text-xs">Most-Played Cards in Wins</h3>
      {data.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
          Cards played in winning games will appear once finalized game logs
          record the cards players played.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="tm-data-label">
                <th className="py-1 pr-3">Card</th>
                <th className="py-1 pr-3">Wins</th>
                <th className="py-1 pr-3">Plays</th>
                <th className="py-1 pr-3">Win rate</th>
              </tr>
            </thead>
            <tbody>
              {data.map((card) => (
                <tr className="border-t border-white/5" key={card.cardName}>
                  <td className="py-1 pr-3 font-semibold text-stone-100">
                    {card.cardName}
                  </td>
                  <td className="py-1 pr-3">
                    {card.wins}/{card.plays}
                  </td>
                  <td className="py-1 pr-3">{card.plays}</td>
                  <td className="py-1 pr-3">{card.winRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
