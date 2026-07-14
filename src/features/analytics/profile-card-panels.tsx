import Image from 'next/image';
import { Fragment } from 'react';
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
        {card.contextLabel ? (
          <span className="tm-muted-copy mt-1 block text-xs font-normal">
            {card.contextLabel} · {card.evidenceConfidence} confidence
          </span>
        ) : null}
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

function cardImpactReason(card: ProfileCardStat) {
  const impact = card.victoryImpact ?? 0;
  const points = Math.abs(Math.round(impact * 100));
  const result = `${card.wins} of ${card.plays} ${card.plays === 1 ? 'game' : 'games'}`;
  const context = card.contextLabel
    ? ` after accounting for your ${card.contextLabel} context`
    : ' after accounting for your recorded corporation, play style, scoring method, game pace, table size, and map';
  const confidence = card.evidenceConfidence
    ? ` This is ${card.evidenceConfidence.toLowerCase()}-confidence evidence based on ${card.plays} ${card.plays === 1 ? 'play' : 'plays'}.`
    : '';

  if (impact >= 0) {
    return `It made the list because you won ${result} with it and${context}, it raised your expected win rate by ${points} ${points === 1 ? 'point' : 'points'}.${confidence}`;
  }

  return `It made the list because you won ${result} with it and${context}, it lowered your expected win rate by ${points} ${points === 1 ? 'point' : 'points'}.${confidence}`;
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
            <Fragment key={card.cardId}>
            <tr className="border-t border-white/5">
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
            {showImpact ? (
              <tr className="border-t border-white/5">
                <td
                  className="tm-muted-copy pb-3 pr-3 text-xs leading-relaxed"
                  colSpan={4}
                >
                  {cardImpactReason(card)}
                </td>
              </tr>
            ) : null}
            </Fragment>
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
        description="The cards that most raise your odds of winning after accounting for play count, corporation, play style, scoring method, game pace, table size, and map. Click a card to open its full image."
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
              Key cards are not picked by hand. Context-adjusted victory impact compares each result with your normal performance using that corporation, play style, scoring method, game pace, table size, and map, then blends in global card performance and play-count confidence.
            </GlossaryRichText>
          </p>
        ) : null}
      </ChartFrame>
      <ChartFrame
        description="The cards most correlated with losses after accounting for play count, corporation, play style, scoring method, game pace, table size, and map."
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
              Loss-correlated cards use the same context adjustment and play-count confidence, so one bad game or a naturally difficult corporation/style combination cannot condemn a card.
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
