import Image from 'next/image';
import { ChartFrame } from '@/components/charts/chart-frame';
import { CardStatsButton } from '@/features/catalog/card-stats-dialog';
import type { ProfileCardStat } from '@/lib/db/analytics-repo';
import { formatPercent } from './performance-delta';

function CardCell({ card }: { card: ProfileCardStat }) {
  const thumbnail = card.thumbnailUrl ? (
    <Image
      alt={`${card.cardName} thumbnail`}
      className="h-[56px] w-[41px] shrink-0 rounded-sm object-cover"
      height={56}
      src={card.thumbnailUrl}
      unoptimized
      width={41}
    />
  ) : null;

  return (
    <CardStatsButton
      card={{
        cardName: card.cardName,
        fullImageUrl: card.fullImageUrl,
        id: card.cardId,
        thumbnailUrl: card.thumbnailUrl,
      }}
      className="flex items-center gap-3 text-left transition hover:text-[rgb(221,161,93)]"
    >
      {thumbnail}
      <span className="min-w-0 break-words font-semibold text-stone-100">
        {card.cardName}
      </span>
    </CardStatsButton>
  );
}

function ProfileCardTable({
  cards,
  countLabel,
  emptyCopy,
}: {
  cards: ProfileCardStat[];
  countLabel: string;
  emptyCopy: string;
}) {
  if (cards.length === 0) {
    return <p className="tm-muted-copy text-sm">{emptyCopy}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="tm-data-label">
            <th className="py-1 pr-3">Card</th>
            <th className="py-1 pr-3">{countLabel}</th>
            <th className="py-1 pr-3">Win rate</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr className="border-t border-white/5" key={card.cardId}>
              <td className="py-2 pr-3">
                <CardCell card={card} />
              </td>
              <td className="py-2 pr-3 align-middle">{card.plays}</td>
              <td className="py-2 pr-3 align-middle">
                {formatPercent(card.winRate)}
                <span className="tm-muted-copy ml-1 text-xs">
                  ({card.wins}/{card.plays})
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProfileCardPanels({
  cardOutcomes,
  keyCards,
  playerName,
}: {
  cardOutcomes: ProfileCardStat[];
  keyCards: ProfileCardStat[];
  playerName: string;
}) {
  return (
    <>
      <ChartFrame
        description="The cards you flagged as pivotal when logging games, ranked by how often you flagged them, with your win rate in those games. Click a card to open its full image."
        title="My Key Cards"
      >
        <ProfileCardTable
          cards={keyCards}
          countLabel="Games"
          emptyCopy={`No key cards are recorded for ${playerName} yet. Flag the cards that shaped a game when you log it to build this list.`}
        />
      </ChartFrame>
      <ChartFrame
        description="Your most-played cards drawn from imported game logs, with your win rate when they were in play. Click a card to open its full image."
        title="My Most-Played Cards"
      >
        <ProfileCardTable
          cards={cardOutcomes}
          countLabel="Plays"
          emptyCopy={`No logged card plays for ${playerName} yet. Import a finalized game log to see your most-played cards.`}
        />
      </ChartFrame>
    </>
  );
}
