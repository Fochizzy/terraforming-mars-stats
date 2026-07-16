"use client";

import Image from "next/image";
import { Info, Key } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ChartFrame } from "@/components/charts/chart-frame";
import { TagLabel } from "@/components/ui/tag-icon";
import { isRenderableCardImage } from "@/features/catalog/card-image";
import { CardStatsButton } from "@/features/catalog/card-stats-dialog";
import { GlossaryRichText } from "@/features/glossary/glossary-rich-text";
import type { ProfileCardStat, ProfileTagStat } from "@/lib/db/analytics-repo";
import { formatPercent } from "./performance-delta";
import { MostPlayedCardsDashboard } from "./most-played-cards-dashboard";

const adjustmentFactors = [
  "Corporation",
  "Play style",
  "Scoring",
  "Pace",
  "Players",
  "Map",
];

const keyCardGridClass =
  "grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 gap-y-3 lg:grid-cols-[4.5rem_minmax(20rem,1fr)_9rem_8rem_6rem] lg:items-center lg:gap-4";

const profileImpactCardLimit = 5;

function confidenceToneClass(
  confidence: ProfileCardStat["evidenceConfidence"],
) {
  switch (confidence) {
    case "High":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
    case "Medium":
      return "border-sky-400/30 bg-sky-400/10 text-sky-200";
    default:
      return "border-white/10 bg-white/5 text-stone-300";
  }
}

function ConfidenceBadge({
  confidence,
}: {
  confidence: ProfileCardStat["evidenceConfidence"];
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

function AdjustmentFactors({ className = "mb-4" }: { className?: string }) {
  return (
    <div
      aria-label="Adjusted for"
      className={`${className} flex flex-wrap items-center gap-1.5`}
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
    ? "h-[68px] w-12 rounded-md"
    : "h-[70px] w-[52px] rounded-sm";
  const interactionClass = compact
    ? "shadow-md transition-transform group-hover:-translate-y-0.5 group-hover:scale-[1.03]"
    : "";

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

function formatImpactScore(impact: number | undefined) {
  if (impact === undefined) {
    return "—";
  }

  const points = impact * 100;
  const value = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(points) ? 0 : 1,
  }).format(Math.abs(points));

  return `${points > 0 ? "+" : points < 0 ? "−" : ""}${value} pts`;
}

function impactToneClass(impact: number | undefined) {
  if (impact === undefined || Math.round(impact * 100) === 0) {
    return "text-stone-300";
  }

  return impact > 0 ? "text-emerald-400" : "text-rose-400";
}

function impactCardSummary(
  card: ProfileCardStat,
  variant: "helpful" | "harmful",
) {
  const gameLabel = card.plays === 1 ? "play" : "plays";
  const confidence = card.evidenceConfidence
    ? `${card.evidenceConfidence.toLowerCase()}-confidence evidence`
    : "context-adjusted evidence";

  if (card.victoryImpact === undefined) {
    return `${formatPercent(card.winRate)} win rate across ${card.plays} ${gameLabel}, using ${confidence}.`;
  }

  const estimateLabel = variant === "helpful" ? "lift" : "impact";

  return `${formatPercent(card.winRate)} win rate across ${card.plays} ${gameLabel}. Estimated ${estimateLabel} is ${formatImpactScore(card.victoryImpact)} after context and play-count adjustment, using ${confidence}.`;
}

function KeyCardMetric({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <span
      className={`col-start-2 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-2.5 text-sm tabular-nums lg:col-auto lg:block lg:border-0 lg:pt-0 lg:text-right ${className}`}
    >
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-stone-500 lg:hidden">
        {label}
      </span>
      <span>{children}</span>
    </span>
  );
}

function keyCardRankClass(index: number) {
  if (index === 0) {
    return "border-amber-300/55 bg-amber-400/15 text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.12)]";
  }
  if (index < 3) {
    return "border-amber-400/35 bg-amber-400/10 text-amber-200";
  }
  return "border-white/10 bg-white/[0.035] text-stone-400";
}

function profileImpactCardCountLabel(
  count: number,
  variant: "helpful" | "harmful",
) {
  return `${count} ${variant} ${count === 1 ? "card" : "cards"}`;
}

function ImpactCardsPanel({
  cards,
  emptyCopy,
  variant,
}: {
  cards: ProfileCardStat[];
  emptyCopy: string;
  variant: "helpful" | "harmful";
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleCards = expanded
    ? cards
    : cards.slice(0, profileImpactCardLimit);
  const remainingCount = Math.max(0, cards.length - profileImpactCardLimit);
  const isHelpful = variant === "helpful";
  const title = isHelpful ? "My Most Helpful Cards" : "My Most Harmful Cards";
  const titleNote = isHelpful
    ? "(Highest Victory Impact)"
    : "(Lowest Victory Impact)";
  const description = isHelpful
    ? "Ranked by estimated win-rate lift after accounting for recorded game context and repeated evidence. Play-count confidence holds back one-off results; the top 5 are shown first."
    : "Ranked by estimated win-rate drag after accounting for recorded game context and repeated evidence. Play-count confidence holds back one-off results; the top 5 are shown first.";
  const borderClass = isHelpful ? "!border-sky-400/15" : "!border-rose-400/15";
  const headerClass = isHelpful
    ? "bg-[linear-gradient(135deg,rgba(14,38,62,0.78),rgba(6,16,29,0.72))]"
    : "bg-[linear-gradient(135deg,rgba(56,19,32,0.68),rgba(6,16,29,0.72))]";
  const iconClass = isHelpful
    ? "border-amber-400/35 bg-amber-400/10 text-amber-300"
    : "border-rose-300/35 bg-rose-400/10 text-rose-200";

  return (
    <section
      className={`tm-panel mx-auto w-full max-w-6xl overflow-hidden ${borderClass} !p-0`}
    >
      <header
        className={`border-b border-sky-300/10 px-5 py-5 sm:px-6 sm:py-6 ${headerClass}`}
      >
        <div className="flex items-start gap-4">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${iconClass}`}
          >
            <Key aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-amber-400">
              Card statistics
            </p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-[0.03em] text-stone-50 sm:text-2xl">
              {title} <span className="text-amber-300">{titleNote}</span>
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-stone-300 sm:text-[0.95rem]">
              {description}
            </p>
          </div>
        </div>
      </header>

      {cards.length === 0 ? (
        <p className="tm-muted-copy px-5 py-6 text-sm sm:px-6">{emptyCopy}</p>
      ) : (
        <>
          <div
            className={`${keyCardGridClass} tm-data-label hidden border-b border-white/[0.06] bg-sky-950/20 px-5 py-3 lg:grid lg:px-6`}
          >
            <span className="text-center">Rank</span>
            <span>Card</span>
            <span className="flex items-center justify-end gap-1.5 text-right">
              Impact score
              <Info aria-hidden="true" className="h-3.5 w-3.5 text-stone-500" />
            </span>
            <span className="text-right">Win rate</span>
            <span className="text-right">Plays</span>
          </div>

          <ol
            className="divide-y divide-white/[0.065] bg-black/[0.1]"
            role="list"
          >
            {visibleCards.map((card, index) => (
              <li
                className="transition-colors hover:bg-sky-300/[0.035]"
                key={card.cardId}
              >
                <CardStatsButton
                  card={{
                    cardName: card.cardName,
                    fullImageUrl: card.fullImageUrl,
                    id: card.cardId,
                    thumbnailUrl: card.thumbnailUrl,
                  }}
                  className={`${keyCardGridClass} group w-full px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/60 sm:px-5 lg:px-6`}
                >
                  <span
                    aria-label={`Rank ${index + 1}`}
                    className={`row-span-5 flex h-9 min-w-9 items-center justify-center self-start rounded-lg border px-2 text-sm font-semibold tabular-nums lg:row-span-1 lg:self-center ${keyCardRankClass(index)}`}
                  >
                    {index + 1}
                  </span>

                  <span className="col-start-2 flex min-w-0 items-start gap-3 lg:col-auto">
                    <CardThumbnail card={card} compact />
                    <span className="min-w-0 pt-0.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="break-words font-semibold text-stone-50 transition-colors group-hover:text-white">
                          {card.cardName}
                        </span>
                        <ConfidenceBadge confidence={card.evidenceConfidence} />
                      </span>
                      <span className="mt-1 block max-w-3xl text-xs leading-5 text-stone-400 sm:text-sm">
                        {impactCardSummary(card, variant)}
                      </span>
                    </span>
                  </span>

                  <KeyCardMetric
                    className={`font-semibold ${impactToneClass(card.victoryImpact)}`}
                    label="Impact score"
                  >
                    {formatImpactScore(card.victoryImpact)}
                  </KeyCardMetric>
                  <KeyCardMetric
                    className="font-semibold text-stone-100"
                    label="Win rate"
                  >
                    {formatPercent(card.winRate)}
                  </KeyCardMetric>
                  <KeyCardMetric
                    className="font-semibold text-stone-100"
                    label="Plays"
                  >
                    {card.plays.toLocaleString("en-US")}
                  </KeyCardMetric>
                </CardStatsButton>
              </li>
            ))}
          </ol>

          {cards.length > profileImpactCardLimit ? (
            <button
              aria-expanded={expanded}
              className="tm-button-secondary mx-auto my-5 flex w-[calc(100%-2.5rem)] max-w-sm items-center justify-center px-5 py-2.5 text-xs sm:w-auto sm:min-w-72"
              onClick={() => setExpanded((current) => !current)}
              type="button"
            >
              {expanded
                ? `Show top ${profileImpactCardLimit} up`
                : `View all ${profileImpactCardCountLabel(
                    remainingCount,
                    variant,
                  )} ->`}
            </button>
          ) : null}

          <details className="border-t border-white/[0.06] bg-black/15 px-5 py-3 text-xs sm:px-6">
            <summary className="cursor-pointer font-medium text-stone-300 transition hover:text-stone-100">
              {isHelpful
                ? "How the ranking works"
                : "How loss correlation is calculated"}
            </summary>
            <div className="mt-3">
              <AdjustmentFactors className="mb-3" />
              <p className="tm-muted-copy max-w-4xl leading-relaxed">
                <GlossaryRichText>
                  {isHelpful
                    ? "Key cards are not picked by hand. Context-adjusted impact compares each result with your normal performance in similar games, then blends in global card performance and play-count confidence so a single lucky result cannot dominate the ranking."
                    : "Loss-correlated cards use the same context adjustment and play-count confidence, so one bad game or a naturally difficult corporation and style combination cannot condemn a card."}
                </GlossaryRichText>
              </p>
            </div>
          </details>
        </>
      )}
    </section>
  );
}

function ProfileTagTable({
  playerName,
  tags,
}: {
  playerName: string;
  tags: ProfileTagStat[];
}) {
  if (tags.length === 0) {
    return (
      <p className="tm-muted-copy text-sm">
        No logged tag data yet for {playerName}. Import finalized game logs with
        matched card plays to see your strongest tag patterns.
      </p>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2" role="list">
      {tags.map((tag) => (
        <article
          className="flex min-w-0 flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.025] px-4 py-3 transition-colors hover:border-white/20 hover:bg-white/[0.045] sm:flex-row sm:items-center sm:justify-between"
          key={tag.tagCode}
          role="listitem"
        >
          <TagLabel
            className="min-w-0 gap-2.5 text-[0.95rem] font-semibold leading-none text-stone-100"
            code={tag.tagCode}
            size={30}
          />
          <dl className="grid grid-cols-3 gap-3 text-right tabular-nums sm:min-w-[17rem]">
            <div>
              <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-stone-500">
                Tags
              </dt>
              <dd className="mt-1 text-sm font-semibold text-stone-100">
                {tag.totalTags.toLocaleString("en-US")}
              </dd>
            </div>
            <div>
              <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-stone-500">
                Games
              </dt>
              <dd className="mt-1 text-sm font-semibold text-stone-100">
                {tag.games.toLocaleString("en-US")}
              </dd>
              <dd className="tm-muted-copy mt-0.5 whitespace-nowrap text-[0.7rem]">
                {tag.averageTagsPerGame}/game
              </dd>
            </div>
            <div>
              <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-stone-500">
                Win
              </dt>
              <dd className="mt-1 text-sm font-semibold text-stone-100">
                {formatPercent(tag.winRate)}
              </dd>
              <dd className="tm-muted-copy mt-0.5 whitespace-nowrap text-[0.7rem]">
                {tag.wins}/{tag.games}
              </dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

export function ProfileCardPanels({
  cardOutcomes,
  keyCards,
  lossCards,
  playerName,
  tagOutcomes,
}: {
  cardOutcomes: ProfileCardStat[];
  keyCards: ProfileCardStat[];
  lossCards: ProfileCardStat[];
  playerName: string;
  tagOutcomes: ProfileTagStat[];
}) {
  return (
    <>
      <ImpactCardsPanel
        cards={keyCards}
        emptyCopy={`No key cards yet for ${playerName}. Import a finalized game log so we can measure which cards lift your win rate the most.`}
        variant="helpful"
      />
      <ImpactCardsPanel
        cards={lossCards}
        emptyCopy={`No loss-correlated cards yet for ${playerName}. Import a finalized game log so we can measure which cards lower your adjusted win rate the most.`}
        variant="harmful"
      />
      <MostPlayedCardsDashboard
        cards={cardOutcomes}
        emptyCopy={`No logged card plays for ${playerName} yet. Import a finalized game log to see your most-played cards.`}
      />
      <ChartFrame
        description="Your most-used card tags from imported game logs, with win rate across games where each tag appeared."
        title="My Tags"
      >
        <ProfileTagTable playerName={playerName} tags={tagOutcomes} />
      </ChartFrame>
    </>
  );
}
