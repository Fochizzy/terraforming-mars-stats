import Image from 'next/image';
import type { ReactNode } from 'react';
import { ChartFrame } from '@/components/charts/chart-frame';
import { isRenderableCardImage } from '@/features/catalog/card-image';
import { CardStatsButton } from '@/features/catalog/card-stats-dialog';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';
import type { ProfileCardStat } from '@/lib/db/analytics-repo';
import { formatPercent } from './performance-delta';

const impactGridClass =
  'grid gap-4 lg:grid-cols-[minmax(18rem,1fr)_7.5rem_5rem_7.5rem] lg:items-center';
const playsGridClass =
  'grid gap-4 lg:grid-cols-[minmax(18rem,1fr)_5rem_7.5rem] lg:items-center';

function contextChips(contextLabel: string | undefined) {
  return (
    contextLabel
      ?.split(/\s*·\s*/)
      .map((part) => part.trim())
      .filter(Boolean) ?? []
  );
}

function confidenceToneClass(confidence: ProfileCardStat['evidenceConfidence']) {
  switch (confidence) {
    case 'High':
      return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
    case 'Medium':
      return 'border-sky-400/30 bg-sky-400/10 text-sky-200';
    default:
      return 'border-white/10 bg-white/5 text-stone-300';
  }
}

function ConfidenceBadge({
  confidence,
}: {
  confidence: ProfileCardStat['evidenceConfidence'];
}) {
  if (!confidence) {
    return null;
  }

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[0.65rem] font-medium uppercase tracking-[0.12em] ${confidenceToneClass(confidence)}`}
    >
      {confidence} confidence
    </span>
  );
}

function CardCell({
  card,
  showConfidence,
}: {
  card: ProfileCardStat;
  showConfidence: boolean;
}) {
  // Cards whose art hasn't been backfilled into Supabase Storage carry the
  // `/file.svg` placeholder or a Heroku search-page URL, which would render as a
  // generic document icon. Show a neutral tile for those instead.
  const thumbnail = isRenderableCardImage(card.thumbnailUrl) ? (
    <Image
      alt={`${card.cardName} thumbnail`}
      className="h-[70px] w-[52px] shrink-0 rounded-sm object-contain"
      height={70}
      src={card.thumbnailUrl}
      unoptimized
      width={52}
    />
  ) : (
    <span
      aria-hidden="true"
      className="h-[70px] w-[52px] shrink-0 rounded-sm border border-white/10 bg-white/5"
    />
  );
  const chips = contextChips(card.contextLabel);

  return (
    <div className="min-w-0">
      <CardStatsButton
        card={{
          cardName: card.cardName,
          fullImageUrl: card.fullImageUrl,
          id: card.cardId,
          thumbnailUrl: card.thumbnailUrl,
        }}
        className="group flex min-w-0 items-start gap-3 text-left"
      >
        {thumbnail}
        <span className="min-w-0 pt-1 break-words font-semibold text-stone-100 transition group-hover:text-white">
          {card.cardName}
        </span>
      </CardStatsButton>
      {chips.length > 0 || (showConfidence && card.evidenceConfidence) ? (
        <div className="ml-16 mt-2 flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <span
              className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs font-normal text-stone-300"
              key={chip}
            >
              {chip}
            </span>
          ))}
          {showConfidence ? (
            <ConfidenceBadge confidence={card.evidenceConfidence} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// Estimated lift is a signed win-rate change stored as a fraction. Display it
// as percentage points so the unit cannot be confused with victory points.
function formatImpactPoints(impact: number | undefined) {
  if (impact === undefined) {
    return '—';
  }

  const points = Math.round(impact * 100);
  return `${points > 0 ? '+' : points < 0 ? '−' : ''}${Math.abs(points)} pp`;
}

function impactToneClass(impact: number | undefined) {
  if (impact === undefined || Math.round(impact * 100) === 0) {
    return 'text-stone-300';
  }
  return impact > 0 ? 'text-emerald-400' : 'text-rose-400';
}

function cardResultSummary(card: ProfileCardStat) {
  const gameLabel = card.plays === 1 ? 'game' : 'games';
  return `Won ${card.wins} of ${card.plays} ${gameLabel} · Estimate adjusted for your recorded game context.`;
}

function MetricCell({
  children,
  className = '',
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 border-t border-white/10 pt-3 tabular-nums lg:block lg:border-0 lg:pt-0 lg:text-right ${className}`}
    >
      <span className="text-[0.65rem] uppercase tracking-[0.14em] text-stone-500 lg:hidden">
        {label}
      </span>
      <span>{children}</span>
    </div>
  );
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
  const gridClass = showImpact ? impactGridClass : playsGridClass;

  return (
    <div className="grid gap-3">
      <div className={`${gridClass} tm-data-label hidden px-4 lg:grid`}>
        <span>Card</span>
        {showImpact ? <span className="text-right">Estimated lift</span> : null}
        <span className="text-right">{countLabel}</span>
        <span className="text-right">Win rate</span>
      </div>
      <div className="grid gap-3" role="list">
        {cards.map((card) => (
          <article
            className={`${gridClass} rounded-xl border border-white/10 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]`}
            key={card.cardId}
            role="listitem"
          >
            <CardCell card={card} showConfidence={showImpact} />
            {showImpact ? (
              <MetricCell
                className={`font-semibold ${impactToneClass(card.victoryImpact)}`}
                label="Estimated lift"
              >
                {formatImpactPoints(card.victoryImpact)}
              </MetricCell>
            ) : null}
            <MetricCell label={countLabel}>{card.plays}</MetricCell>
            <MetricCell label="Win rate">
              {formatPercent(card.winRate)}
              <span className="ml-1 text-xs font-normal text-stone-500">
                ({card.wins}/{card.plays})
              </span>
            </MetricCell>
            {showImpact ? (
              <p className="tm-muted-copy border-t border-white/10 pt-3 text-xs leading-relaxed lg:col-span-4">
                {cardResultSummary(card)}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function MethodologyDetails({ children, title }: { children: ReactNode; title: string }) {
  return (
    <details className="mt-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs">
      <summary className="cursor-pointer font-medium text-stone-300 transition hover:text-stone-100">
        {title}
      </summary>
      <p className="tm-muted-copy mt-2 leading-relaxed">{children}</p>
    </details>
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
        description="Cards with the strongest estimated win-rate lift after accounting for play count and your recorded game context. Click a card to open its full image."
        title="My Key Cards"
      >
        <ProfileCardTable
          cards={keyCards}
          countLabel="Games"
          emptyCopy={`No key cards yet for ${playerName}. Import a finalized game log so we can measure which cards lift your win rate the most.`}
          variant="impact"
        />
        {keyCards.length > 0 ? (
          <MethodologyDetails title="How estimated lift is calculated">
            <GlossaryRichText>
              Key cards are not picked by hand. Context-adjusted estimated lift compares each result with your normal performance using that corporation, play style, scoring method, game pace, table size, and map, then blends in global card performance and play-count confidence.
            </GlossaryRichText>
          </MethodologyDetails>
        ) : null}
      </ChartFrame>
      <ChartFrame
        description="Cards with the lowest estimated win-rate lift after accounting for play count and your recorded game context."
        title="My Loss-Correlated Cards"
      >
        <ProfileCardTable
          cards={lossCards}
          countLabel="Games"
          emptyCopy={`No loss-correlated cards yet for ${playerName}. Import a finalized game log so we can measure which cards drag your win rate down the most.`}
          variant="impact"
        />
        {lossCards.length > 0 ? (
          <MethodologyDetails title="How loss correlation is calculated">
            <GlossaryRichText>
              Loss-correlated cards use the same context adjustment and play-count confidence, so one bad game or a naturally difficult corporation and style combination cannot condemn a card.
            </GlossaryRichText>
          </MethodologyDetails>
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
