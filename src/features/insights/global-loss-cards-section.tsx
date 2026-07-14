import { CardStatsButton } from '@/features/catalog/card-stats-dialog';
import type { CardWinStat } from '@/lib/db/selection-stats-repo';

export const GLOBAL_LOSS_CARD_LIMIT = 5;

// Cards need enough plays before a win rate says anything about how they
// correlate with losses; below this a single game swings the rate by tens of
// points. Mirrors the key-cards floor so both lists stay noise-free.
export const GLOBAL_LOSS_CARD_MIN_PLAYS = 5;

export type GlobalLossCardMeta = {
  fullImageUrl: string | null;
  id: string;
  thumbnailUrl: string | null;
};

export type GlobalLossCardDatum = {
  cardName: string;
  plays: number;
  victoryImpact: number;
  winRate: number;
};

// The inverse of the key-cards ranking: surface the cards whose win rate when
// played sits furthest *below* the baseline win rate for all games — the cards
// most correlated with losing. A steep drop off a couple of plays is noise, so
// cards under the play floor are dropped before ranking.
export function buildGlobalLossCardData(
  cards: CardWinStat[],
  baselineWinRate: number,
  {
    limit = GLOBAL_LOSS_CARD_LIMIT,
    minPlays = GLOBAL_LOSS_CARD_MIN_PLAYS,
  }: { limit?: number; minPlays?: number } = {},
): GlobalLossCardDatum[] {
  return cards
    .filter((card) => card.plays >= minPlays)
    .map((card) => ({
      cardName: card.card_name,
      plays: card.plays,
      victoryImpact: card.win_rate_when_played - baselineWinRate,
      winRate: card.win_rate_when_played,
    }))
    .filter((card) => card.victoryImpact < 0)
    .sort(
      (left, right) =>
        left.victoryImpact - right.victoryImpact ||
        right.plays - left.plays ||
        left.cardName.localeCompare(right.cardName),
    )
    .slice(0, limit);
}

function formatImpactPoints(impact: number) {
  const points = Math.round(impact * 100);
  return `${points > 0 ? '+' : points < 0 ? '−' : ''}${Math.abs(points)} pts`;
}

export function GlobalLossCardsSection(props: {
  cards: CardWinStat[];
  baselineWinRate: number;
  /** card name -> catalog id + art, so each card can open its stats dialog. */
  cardMetaByName: Map<string, GlobalLossCardMeta>;
}) {
  const data = buildGlobalLossCardData(props.cards, props.baselineWinRate);
  const baselinePercent = Math.round(props.baselineWinRate * 100);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="tm-data-label text-xs">Cards Most Correlated With Losses</h3>
      <p className="tm-muted-copy text-sm">
        Cards whose win rate when played sits furthest below the{' '}
        {baselinePercent}% baseline win rate across every recorded game. Cards
        with fewer than {GLOBAL_LOSS_CARD_MIN_PLAYS} plays are held back so a
        single game can&apos;t brand a card. Select a card to open its image with
        your win rate and the global win rate.
      </p>
      {data.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
          Loss-correlated cards will appear once finalized game logs record
          enough card plays to measure their impact.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="tm-data-label">
                <th className="py-1 pr-3">Card</th>
                <th className="py-1 pr-3">Loss impact</th>
                <th className="py-1 pr-3">Global win rate</th>
                <th className="py-1 pr-3">Plays</th>
              </tr>
            </thead>
            <tbody>
              {data.map((card) => {
                const meta = props.cardMetaByName.get(card.cardName);

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
                    <td className="py-1 pr-3 font-semibold text-rose-400">
                      {formatImpactPoints(card.victoryImpact)}
                    </td>
                    <td className="py-1 pr-3">{Math.round(card.winRate * 100)}%</td>
                    <td className="py-1 pr-3">{card.plays}</td>
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
