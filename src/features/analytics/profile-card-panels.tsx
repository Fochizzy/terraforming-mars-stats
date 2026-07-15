import Image from 'next/image';
import type { ReactNode } from 'react';
import { ChartFrame } from '@/components/charts/chart-frame';
import { isRenderableCardImage } from '@/features/catalog/card-image';
import { CardStatsButton } from '@/features/catalog/card-stats-dialog';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';
import type { ProfileCardStat } from '@/lib/db/analytics-repo';
import { formatPercent } from './performance-delta';

const adjustmentFactors = [
  'Corporation',
  'Play style',
  'Scoring',
  'Pace',
  'Players',
  'Map',
];

const impactGridClass =
  'grid gap-4 lg:grid-cols-[minmax(18rem,1fr)_8rem_10rem] lg:items-start';

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

function AdjustmentFactors() {
  return (
    <div
      aria-label="Adjusted for"
      className="mb-4 flex flex-wrap items-center gap-1.5"
    >
      <span className="mr-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-stone-500">
        Adjusted for
      </span>
      {adjustmentFactors.map((factor) => (
        <span
          className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-stone-400"
          key={factor}
        >
          {factor}
        </span>
      ))}
    </div>
  );
}

function CardThumbnail({
  card,
  compact = false,
}: {
  card: ProfileCardStat;
  compact?: boolean;
}) {
  const sizeClass = compact
    ? 'h-[68px] w-12 rounded-md'
    : 'h-[70px] w-[52px] rounded-sm';
  const interactionClass = compact
    ? 'shadow-md transition-transform group-hover:-translate-y-0.5 group-hover:scale-[1.03]'
    : '';

  if (isRenderableCardImage(card.thumbnailUrl)) {
    return (
      <Image
        alt={`${card.cardName} thumbnail`}
        className={`${sizeClass} ${interactionClass} shrink-0 object-contain`}
        height={compact ? 68 : 70}
        src={card.thumbnailUrl}
        unoptimized
        width={compact ? 48 : 52}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${sizeClass} ${interactionClass} shrink-0 border border-white/10 bg-white/5`}
    />
  );
}

function CardCell({
  card,
  showConfidence,
}: {
  card: ProfileCardStat;
  showConfidence: boolean;
}) {
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
        <CardThumbnail card={card} />
        <span className="min-w-0 pt-1 break-words font-semibold text-stone-100 transition group-hover:text-white">
          {card.cardName}
        </span>
      </CardStatsButton>
      {chips.length > 0 || (showConfidence && card.evidenceConfidence) ? (
        <div className="ml-16 mt-2 flex flex-wrap items-center gap-1.5">
          {chips.map((chip, index) => (
            <span
              className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs font-normal text-stone-300"
              key={`${chip}-${index}`}
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

function winRateToneClass(winRate: number) {
  if (winRate >= 0.5) {
    return 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-200';
  }
  if (winRate >= 0.3) {
    return 'border-amber-400/20 bg-amber-400/[0.08] text-amber-200';
  }
  return 'border-rose-400/20 bg-rose-400/[0.08] text-rose-200';
}

function cardResultSummary(card: ProfileCardStat) {
  const gameLabel = card.plays === 1 ? 'game' : 'games';
  const winLabel = card.wins === 1 ? 'win' : 'wins';

  if (card.victoryImpact === undefined) {
    return `Why it ranked: ${card.wins} ${winLabel} in ${card.plays} comparable ${gameLabel}; estimate adjusted for your recorded game context.`;
  }

  const points = Math.abs(Math.round(card.victoryImpact * 100));
  const pointLabel = points === 1 ? 'percentage point' : 'percentage points';
  const direction = card.victoryImpact >= 0 ? 'higher' : 'lower';

  return `Why it ranked: ${card.wins} ${winLabel} in ${card.plays} comparable ${gameLabel}; adjusted win rate was ${points} ${pointLabel} ${direction}.`;
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

function sampleCountLabel(countLabel: string, count: number) {
  const singular = countLabel.endsWith('s')
    ? countLabel.slice(0, -1)
    : countLabel;
  return `${count} ${(count === 1 ? singular : countLabel).toLowerCase()}`;
}

function SampleCell({
  card,
  countLabel,
}: {
  card: ProfileCardStat;
  countLabel: string;
}) {
  const winLabel = card.wins === 1 ? 'win' : 'wins';

  return (
    <MetricCell label="Sample">
      <span className="block font-semibold text-stone-100">
        {card.wins} / {card.plays} {winLabel}
      </span>
      <span className="mt-0.5 block text-xs font-normal text-stone-500">
        {formatPercent(card.winRate)} win rate ·{' '}
        {sampleCountLabel(countLabel, card.plays)}
      </span>
    </MetricCell>
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
    <div>
      <AdjustmentFactors />
      <div className="grid gap-3">
        <div className={`${impactGridClass} tm-data-label hidden px-4 lg:grid`}>
          <span>Card</span>
          <span className="text-right">Adjusted impact</span>
          <span className="text-right">Sample</span>
        </div>
        <div className="grid gap-3" role="list">
          {cards.map((card) => (
            <article
              className={`${impactGridClass} rounded-xl border border-white/10 bg-black/20 px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:border-white/20 hover:bg-white/[0.035]`}
              key={card.cardId}
              role="listitem"
            >
              <CardCell card={card} showConfidence />
              <MetricCell
                className={`font-semibold ${impactToneClass(card.victoryImpact)}`}
                label="Adjusted impact"
              >
                {formatImpactPoints(card.victoryImpact)}
                <span className="mt-0.5 block text-xs font-normal text-stone-500">
                  Expected win rate
                </span>
              </MetricCell>
              <SampleCell card={card} countLabel={countLabel} />
              <p className="tm-muted-copy border-t border-white/10 pt-3 text-xs leading-relaxed lg:col-span-3 lg:ml-16">
                {cardResultSummary(card)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function MostPlayedCardTable({
  cards,
  emptyCopy,
}: {
  cards: ProfileCardStat[];
  emptyCopy: string;
}) {
  if (cards.length === 0) {
    return <p className="tm-muted-copy px-5 py-5 text-sm sm:px-6">{emptyCopy}</p>;
  }

  return (
    <div>
      <div className="tm-data-label hidden grid-cols-[minmax(0,1fr)_7rem_10rem] gap-6 border-b border-white/[0.06] bg-black/10 px-5 py-3 lg:grid">
        <span>Card</span>
        <span className="text-right">Plays</span>
        <span className="text-right">Win rate</span>
      </div>
      <ol className="divide-y divide-white/[0.06]" role="list">
        {cards.map((card, index) => (
          <li key={card.cardId}>
            <CardStatsButton
              card={{
                cardName: card.cardName,
                fullImageUrl: card.fullImageUrl,
                id: card.cardId,
                thumbnailUrl: card.thumbnailUrl,
              }}
              className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 text-left transition-colors hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/60 sm:px-5 lg:grid-cols-[minmax(0,1fr)_7rem_10rem] lg:gap-6"
            >
              <span className="row-span-2 flex min-w-0 items-center gap-3 lg:row-span-1">
                <span
                  aria-label={`Rank ${index + 1}`}
                  className="w-5 shrink-0 text-right text-sm tabular-nums text-stone-600"
                >
                  {index + 1}
                </span>
                <CardThumbnail card={card} compact />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-stone-100 transition-colors group-hover:text-white">
                    {card.cardName}
                  </span>
                  <span className="mt-1 block text-xs text-stone-500">
                    Click for card statistics
                  </span>
                </span>
              </span>
              <span className="inline-flex justify-self-end rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-sm font-medium tabular-nums text-stone-200">
                {card.plays}
                <span className="ml-1 text-xs font-normal text-stone-500">plays</span>
              </span>
              <span
                className={`inline-flex min-w-[8.5rem] items-baseline justify-between gap-3 justify-self-end rounded-full border px-3 py-1.5 tabular-nums ${winRateToneClass(card.winRate)}`}
              >
                <strong className="text-sm">{formatPercent(card.winRate)}</strong>
                <span className="text-xs font-normal opacity-70">
                  {card.wins}/{card.plays}
                </span>
              </span>
            </CardStatsButton>
          </li>
        ))}
      </ol>
    </div>
  );
}

function MostPlayedCardsPanel({
  cards,
  emptyCopy,
}: {
  cards: ProfileCardStat[];
  emptyCopy: string;
}) {
  return (
    <section className="tm-panel mx-auto w-full max-w-6xl !border-white/10 !p-0">
      <header className="border-b border-white/[0.06] bg-black/10 px-5 py-5 sm:px-6">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-amber-400">
          Card statistics
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-50">
          Most-played cards
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">
          Your most frequently played cards from imported games, with their
          performance when included in your tableau.
        </p>
      </header>
      <div className="bg-black/[0.08]">
        <MostPlayedCardTable cards={cards} emptyCopy={emptyCopy} />
      </div>
    </section>
  );
}

function MethodologyDetails({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
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
        />
        {keyCards.length > 0 ? (
          <MethodologyDetails title="How adjusted impact is calculated">
            <GlossaryRichText>
              Key cards are not picked by hand. Context-adjusted impact compares each result with your normal performance using that corporation, play style, scoring method, game pace, table size, and map, then blends in global card performance and play-count confidence.
            </GlossaryRichText>
          </MethodologyDetails>
        ) : null}
      </ChartFrame>
      <ChartFrame
        description="Cards associated with worse results after accounting for the context of each game."
        title="Cards Linked to Lower Win Rates"
      >
        <ProfileCardTable
          cards={lossCards}
          countLabel="Games"
          emptyCopy={`No loss-correlated cards yet for ${playerName}. Import a finalized game log so we can measure which cards lower your adjusted win rate the most.`}
        />
        {lossCards.length > 0 ? (
          <MethodologyDetails title="How loss correlation is calculated">
            <GlossaryRichText>
              Loss-correlated cards use the same context adjustment and play-count confidence, so one bad game or a naturally difficult corporation and style combination cannot condemn a card.
            </GlossaryRichText>
          </MethodologyDetails>
        ) : null}
      </ChartFrame>
      <MostPlayedCardsPanel
        cards={cardOutcomes}
        emptyCopy={`No logged card plays for ${playerName} yet. Import a finalized game log to see your most-played cards.`}
      />
    </>
  );
}
