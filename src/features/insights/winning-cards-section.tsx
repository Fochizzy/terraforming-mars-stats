import { CardStatsButton } from '@/features/catalog/card-stats-dialog';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';
import type {
  CardImageMeta,
  CardWinStat,
} from '@/lib/db/selection-stats-repo';

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

// Playrate = share of finalized games in the scope that featured this card.
// Each project card is a single copy per game, so plays never exceeds games.
function formatPlayrate(plays: number, totalGames: number) {
  if (!totalGames || totalGames <= 0) {
    return '-';
  }
  return `${Math.round((plays / totalGames) * 100)}%`;
}

export function WinningCardsSection(props: {
  cards: CardWinStat[];
  /** card name -> catalog id + art, so each card can open its stats dialog. */
  cardMetaByName?: Map<string, CardImageMeta>;
  /** Denominator for the "Global playrate" column (all recorded games). */
  globalTotalGames?: number;
  /** The caller's own game count, denominator for "Your playrate". */
  personalTotalGames?: number;
  /** cardName -> plays across the caller's own games. */
  personalPlaysByCardName?: Map<string, number>;
}) {
  const data = buildWinningCardData(props.cards);
  const globalTotalGames = props.globalTotalGames ?? 0;
  const personalTotalGames = props.personalTotalGames ?? 0;
  const personalPlaysByCardName = props.personalPlaysByCardName ?? new Map();
  const cardMetaByName = props.cardMetaByName ?? new Map<string, CardImageMeta>();
  const showPersonal = personalTotalGames > 0;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="tm-data-label text-xs">Most-Played Cards in Wins</h3>
      <p className="tm-muted-copy text-sm">
        <GlossaryRichText>
          Select a card to open its image with your win rate and the global win rate.
        </GlossaryRichText>
      </p>
      {data.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
          <GlossaryRichText>
            Cards played in winning games will appear once finalized game logs record the cards players played.
          </GlossaryRichText>
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="tm-data-label">
                <th className="py-1 pr-3">Card</th>
                <th className="py-1 pr-3">Wins</th>
                <th className="py-1 pr-3">Plays</th>
                {showPersonal ? (
                  <th className="py-1 pr-3">Your playrate</th>
                ) : null}
                <th className="py-1 pr-3">Global playrate</th>
                <th className="py-1 pr-3">Win rate</th>
              </tr>
            </thead>
            <tbody>
              {data.map((card) => {
                const meta = cardMetaByName.get(card.cardName);

                return (
                <tr className="border-t border-white/5" key={card.cardName}>
                  <td className="py-1 pr-3">
                    {meta ? (
                      <CardStatsButton
                        card={{
                          cardName: card.cardName,
                          fullImageUrl: meta.fullImageUrl,
                          id: meta.id,
                          thumbnailUrl: meta.thumbnailUrl,
                        }}
                        className="font-semibold text-stone-100 underline decoration-dotted underline-offset-2 transition hover:text-[rgb(221,161,93)]"
                      >
                        {card.cardName}
                      </CardStatsButton>
                    ) : (
                      <span className="font-semibold text-stone-100">
                        {card.cardName}
                      </span>
                    )}
                  </td>
                  <td className="py-1 pr-3">
                    {card.wins}/{card.plays}
                  </td>
                  <td className="py-1 pr-3">{card.plays}</td>
                  {showPersonal ? (
                    <td className="py-1 pr-3">
                      {formatPlayrate(
                        personalPlaysByCardName.get(card.cardName) ?? 0,
                        personalTotalGames,
                      )}
                    </td>
                  ) : null}
                  <td className="py-1 pr-3">
                    {formatPlayrate(card.plays, globalTotalGames)}
                  </td>
                  <td className="py-1 pr-3">{card.winRate}%</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
