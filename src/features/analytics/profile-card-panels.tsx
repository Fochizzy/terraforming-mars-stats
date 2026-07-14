import Image from 'next/image';
import { ChartFrame } from '@/components/charts/chart-frame';
import { isRenderableCardImage } from '@/features/catalog/card-image';
import { CardStatsButton } from '@/features/catalog/card-stats-dialog';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';
import type { ProfileCardStat } from '@/lib/db/analytics-repo';
import { formatPercent } from './performance-delta';

function CardCell({ card }: { card: ProfileCardStat }) {
  // Cards whose art hasn't been backfilled into Supabase Storage carry the
  // `/file.svg` placeholder or a Heroku search-page URL, which would render as a
  // generic document icon. Show a neutral tile for those instead.
  const thumbnail = isRenderableCardImage(card.thumbnailUrl) ? (
    <Image
      alt={`${card.cardName} thumbnail`}
      className="h-[56px] w-[41px] shrink-0 rounded-sm object-cover"
      height={56}
      src={card.thumbnailUrl}
      unoptimized
      width={41}
    />
  ) : (
    <span
      aria-hidden="true"
      className="h-[56px] w-[41px] shrink-0 rounded-sm border border-white/10 bg-white/5"
    />
  );

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

// Victory impact is a signed win-rate lift stored as a fraction; show it as
// whole percentage points with an explicit sign so a boost reads as "+12 pts".
function formatImpactPoints(impact: number | undefined) {
  if (impact === undefined) {
    return '—';
  }

  const points = Math.round(impact * 100);
  return `${points > 0 ? '+' : points < 0 ? '−' : ''}${Math.abs(points)} pts`;
}

function impactToneClass(impact: number | undefined) {
  if (impact === undefined || Math.round(impact * 100) === 0) {
    return 'text-stone-300';
  }
  return impact > 0 ? 'text-emerald-400' : 'text-rose-400';
}

function ProfileCardTable({
  cards,
  countLabel,
  emptyCopy,
  variant = 'plays',
}: {
  cards: ProfileCardStat[];
  countLabel: string;
  emptyCopy: string;
  variant?: 'impact' | 'plays';
}) {
  if (cards.length === 0) {
    return <p className="tm-muted-copy text-sm">{emptyCopy}</p>;
  }

  const showImpact = variant === 'impact';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="tm-data-label">
            <th className="py-1 pr-3">Card</th>
            {showImpact ? (
              <th className="py-1 pr-3">Victory impact</th>
            ) : null}
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
              {showImpact ? (
                <td
                  className={`py-2 pr-3 align-middle font-semibold ${impactToneClass(card.victoryImpact)}`}
                >
                  {formatImpactPoints(card.victoryImpact)}
                </td>
              ) : null}
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
  lossCards,
  playerName,
}: {
  cardOutcomes: ProfileCardStat[];
  keyCards: ProfileCardStat[];
  lossCards: ProfileCardStat[];
  playerName: string;
}) {
  return (
    <>
      <ChartFrame
        description="The cards that most raise your odds of winning — ranked by how much your win rate with each card, blended with how it performs across every recorded game, beats your baseline win rate. Click a card to open its full image."
        title="My Key Cards"
      >
        <ProfileCardTable
          cards={keyCards}
          countLabel="Games"
          emptyCopy={`No key cards yet for ${playerName}. Import a finalized game log so we can measure which cards lift your win rate the most.`}
          variant="impact"
        />
        {keyCards.length > 0 ? (
          <p className="tm-muted-copy mt-3 text-xs">
            <GlossaryRichText>
              Key cards are not picked by hand. Victory impact is how many points a card adds to your win rate above your baseline, blending your own games with global play data so one lucky game cannot crown a card.
            </GlossaryRichText>
          </p>
        ) : null}
      </ChartFrame>
      <ChartFrame
        description="The cards most correlated with your losses — ranked by how much your win rate with each card, blended with how it performs across every recorded game, falls below your baseline win rate. Click a card to open its full image with your win rate and the global win rate."
        title="My Loss-Correlated Cards"
      >
        <ProfileCardTable
          cards={lossCards}
          countLabel="Games"
          emptyCopy={`No loss-correlated cards yet for ${playerName}. Import a finalized game log so we can measure which cards drag your win rate down the most.`}
          variant="impact"
        />
        {lossCards.length > 0 ? (
          <p className="tm-muted-copy mt-3 text-xs">
            <GlossaryRichText>
              Loss-correlated cards are not picked by hand. Victory impact is how many points a card subtracts from your win rate below your baseline, blending your own games with global play data so one bad game cannot condemn a card.
            </GlossaryRichText>
          </p>
        ) : null}
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
