'use client';

import { useState } from 'react';
import { CardStatsButton } from '@/features/catalog/card-stats-dialog';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';
import type {
  CardImageMeta,
  CardWinStat,
} from '@/lib/db/selection-stats-repo';
import {
  buildGlobalCardImpactData,
  formatImpactPoints,
  GLOBAL_CARD_IMPACT_MIN_PLAYS,
  type GlobalCardImpactDatum,
} from './global-card-impact';

export const GLOBAL_KEY_CARD_LIMIT = 10;

// Cards need enough plays before a win rate says anything about victory impact;
// below this a single game swings the rate by tens of points.
export const GLOBAL_KEY_CARD_MIN_PLAYS = GLOBAL_CARD_IMPACT_MIN_PLAYS;

export type GlobalKeyCardDatum = GlobalCardImpactDatum;

// "Key cards" across every recorded game: rank cards by a composite of victory
// impact and play-count confidence. A high win rate with little evidence is
// shrunk toward the baseline before ranking.
export function buildGlobalKeyCardData(
  cards: CardWinStat[],
  baselineWinRate: number,
  {
    limit,
    minPlays = GLOBAL_KEY_CARD_MIN_PLAYS,
  }: { limit?: number; minPlays?: number } = {},
): GlobalKeyCardDatum[] {
  return buildGlobalCardImpactData(cards, baselineWinRate, 'positive', {
    limit,
    minPlays,
  });
}

function formatBaselineLift(card: GlobalKeyCardDatum) {
  const points = Math.abs(Math.round(card.victoryImpact * 100));
  return `${points} ${points === 1 ? 'pt' : 'pts'} above baseline`;
}

function formatEvidenceConfidence(card: GlobalKeyCardDatum) {
  return `${Math.round(card.evidenceWeight * 100)}% confidence`;
}

function formatPlayCount(plays: number) {
  return `${plays} ${plays === 1 ? 'play' : 'plays'}`;
}

function positiveCardCountLabel(count: number) {
  return `${count} positive ${count === 1 ? 'card' : 'cards'}`;
}

export function GlobalKeyCardsSection(props: {
  cards: CardWinStat[];
  baselineWinRate: number;
  /** card name -> catalog id + art, so each card can open its stats dialog. */
  cardMetaByName?: Map<string, CardImageMeta>;
}) {
  const [expanded, setExpanded] = useState(false);
  const data = buildGlobalKeyCardData(props.cards, props.baselineWinRate);
  const visibleData = expanded ? data : data.slice(0, GLOBAL_KEY_CARD_LIMIT);
  const baselinePercent = Math.round(props.baselineWinRate * 100);
  const cardMetaByName = props.cardMetaByName ?? new Map<string, CardImageMeta>();
  const remainingCount = Math.max(0, data.length - GLOBAL_KEY_CARD_LIMIT);
  const maximumImpact = Math.max(
    ...data.map((card) => Math.abs(card.impactScore)),
    0.01,
  );

  return (
    <section className="flex flex-col gap-4" aria-labelledby="global-key-cards-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h3 className="tm-data-label text-xs" id="global-key-cards-title">
            Key Cards (Highest Victory Impact)
          </h3>
          <p className="tm-muted-copy mt-2 max-w-3xl text-sm leading-6">
            <GlossaryRichText>
              Cards with the strongest play-count-adjusted relationship to wins.
              Rankings combine win-rate difference and sample confidence.
            </GlossaryRichText>
          </p>
        </div>
        <details className="group shrink-0 text-xs sm:text-right">
          <summary className="cursor-pointer list-none font-medium text-stone-400 transition hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 [&::-webkit-details-marker]:hidden">
            How this is calculated
            <span
              aria-hidden="true"
              className="ml-1 inline-block transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="tm-muted-copy mt-2 max-w-md rounded-xl border border-white/10 bg-black/15 p-3 text-left leading-relaxed sm:absolute sm:right-8 sm:z-10 sm:w-[28rem]">
            The impact score multiplies each card&apos;s difference from the{' '}
            {baselinePercent}% global baseline by its play-count confidence. Only
            cards with at least {GLOBAL_KEY_CARD_MIN_PLAYS} recorded plays are
            ranked, so repeated evidence carries more weight than a single result.
          </p>
        </details>
      </div>

      {data.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
          <GlossaryRichText>
            Key cards will appear once finalized game logs record enough card plays to measure their impact.
          </GlossaryRichText>
        </p>
      ) : (
        <div>
          <div className="tm-data-label hidden grid-cols-[2.5rem_minmax(20rem,1fr)_11rem_8rem_5rem] items-end gap-4 px-4 pb-2 text-[0.68rem] lg:grid">
            <span aria-hidden="true">#</span>
            <span>Card</span>
            <span className="text-right">Impact score</span>
            <span className="text-right">Global win rate</span>
            <span className="text-right">Plays</span>
          </div>

          <ol className="grid gap-2.5" role="list">
            {visibleData.map((card, index) => {
              const meta = cardMetaByName.get(card.cardName);
              const impactWidth = Math.max(
                12,
                Math.round((Math.abs(card.impactScore) / maximumImpact) * 100),
              );

              return (
                <li
                  className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 gap-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] transition-colors hover:border-white/15 hover:bg-white/[0.04] lg:grid-cols-[2.5rem_minmax(20rem,1fr)_11rem_8rem_5rem] lg:items-center lg:gap-4"
                  key={card.cardName}
                >
                  <span
                    aria-label={`Rank ${index + 1}`}
                    className="inline-flex h-7 w-7 items-center justify-center self-start rounded-full border border-white/10 bg-black/20 text-xs font-semibold tabular-nums text-stone-500 lg:self-center"
                  >
                    {index + 1}
                  </span>

                  <div className="min-w-0">
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
                    <p className="tm-muted-copy mt-1.5 text-xs leading-5">
                      {formatBaselineLift(card)} &middot; {formatEvidenceConfidence(card)} &middot;{' '}
                      {formatPlayCount(card.plays)}
                    </p>
                  </div>

                  <div className="col-span-2 border-t border-white/[0.06] pt-3 tabular-nums lg:col-span-1 lg:border-0 lg:pt-0 lg:text-right">
                    <div className="flex items-baseline justify-between gap-3 lg:block">
                      <span className="tm-data-label text-[0.65rem] lg:hidden">
                        Impact score
                      </span>
                      <strong className="text-sm font-semibold text-emerald-300">
                        {formatImpactPoints(card.impactScore, 1)}
                      </strong>
                    </div>
                    <div
                      aria-label={`${card.cardName} positive impact strength`}
                      className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-300/10"
                      role="img"
                    >
                      <div
                        className="h-full rounded-full bg-emerald-300/55"
                        style={{ width: `${impactWidth}%` }}
                      />
                    </div>
                  </div>

                  <div className="col-span-2 flex items-baseline justify-between gap-3 tabular-nums lg:col-span-1 lg:block lg:text-right">
                    <span className="tm-data-label text-[0.65rem] lg:hidden">
                      Global win rate
                    </span>
                    <span className="font-medium text-stone-200">
                      {Math.round(card.winRate * 100)}%
                    </span>
                  </div>

                  <div className="col-span-2 flex items-baseline justify-between gap-3 tabular-nums lg:col-span-1 lg:block lg:text-right">
                    <span className="tm-data-label text-[0.65rem] lg:hidden">
                      Plays
                    </span>
                    <span className="font-medium text-stone-200">{card.plays}</span>
                  </div>
                </li>
              );
            })}
          </ol>

          {data.length > GLOBAL_KEY_CARD_LIMIT ? (
            <button
              aria-expanded={expanded}
              className="tm-button-secondary mx-auto mt-5 flex w-full max-w-sm items-center justify-center px-5 py-2.5 text-xs sm:w-auto sm:min-w-72"
              onClick={() => setExpanded((current) => !current)}
              type="button"
            >
              {expanded
                ? `Show top ${GLOBAL_KEY_CARD_LIMIT} up`
                : `View all ${positiveCardCountLabel(remainingCount)} ->`}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
