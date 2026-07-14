'use client';

import { Fragment, useState } from 'react';
import { CardStatsButton } from '@/features/catalog/card-stats-dialog';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';
import type {
  CardImageMeta,
  CardWinStat,
} from '@/lib/db/selection-stats-repo';
import {
  buildGlobalCardImpactData,
  describeGlobalCardImpact,
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

  return (
    <div className="flex flex-col gap-3">
      <h3 className="tm-data-label text-xs">Key Cards (Highest Victory Impact)</h3>
      <p className="tm-muted-copy text-sm">
        <GlossaryRichText>
          {`Cards whose play-count-adjusted impact score sits furthest above the ${baselinePercent}% baseline win rate across every recorded game. The score blends win-rate lift with repeat-play evidence, and cards with fewer than ${GLOBAL_KEY_CARD_MIN_PLAYS} plays are held back. The top ${GLOBAL_KEY_CARD_LIMIT} are shown first.`}
        </GlossaryRichText>
      </p>
      {data.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
          <GlossaryRichText>
            Key cards will appear once finalized game logs record enough card plays to measure their impact.
          </GlossaryRichText>
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="tm-data-label">
                <th className="py-1 pr-3">Card</th>
                <th className="py-1 pr-3">Impact score</th>
                <th className="py-1 pr-3">Win rate</th>
                <th className="py-1 pr-3">Plays</th>
              </tr>
            </thead>
            <tbody>
              {visibleData.map((card) => {
                const meta = cardMetaByName.get(card.cardName);

                return (
                  <Fragment key={card.cardName}>
                    <tr className="border-t border-white/5">
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
                      <td className="py-1 pr-3 font-semibold text-emerald-400">
                        {formatImpactPoints(card.impactScore, 1)}
                      </td>
                      <td className="py-1 pr-3">
                        {Math.round(card.winRate * 100)}%
                      </td>
                      <td className="py-1 pr-3">{card.plays}</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td
                        className="tm-muted-copy pb-3 pr-3 text-xs leading-relaxed"
                        colSpan={4}
                      >
                        {describeGlobalCardImpact(card, props.baselineWinRate)}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {data.length > GLOBAL_KEY_CARD_LIMIT ? (
            <button
              aria-expanded={expanded}
              className="tm-button-secondary mt-4 w-full px-4 py-2 text-xs"
              onClick={() => setExpanded((current) => !current)}
              type="button"
            >
              {expanded
                ? `Show top ${GLOBAL_KEY_CARD_LIMIT}`
                : `See more positive cards (${data.length - GLOBAL_KEY_CARD_LIMIT})`}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
