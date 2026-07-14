'use client';

import { Fragment, useState } from 'react';
import { CardStatsButton } from '@/features/catalog/card-stats-dialog';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';
import type { CardWinStat } from '@/lib/db/selection-stats-repo';
import {
  buildGlobalCardImpactData,
  describeGlobalCardImpact,
  formatImpactPoints,
  GLOBAL_CARD_IMPACT_MIN_PLAYS,
  type GlobalCardImpactDatum,
} from './global-card-impact';

export const GLOBAL_LOSS_CARD_LIMIT = 5;

// Cards need enough plays before a win rate says anything about how they
// correlate with losses; below this a single game swings the rate by tens of
// points. Mirrors the key-cards floor so both lists stay noise-free.
export const GLOBAL_LOSS_CARD_MIN_PLAYS = GLOBAL_CARD_IMPACT_MIN_PLAYS;

export type GlobalLossCardMeta = {
  fullImageUrl: string | null;
  id: string;
  thumbnailUrl: string | null;
};

export type GlobalLossCardDatum = GlobalCardImpactDatum;

// The inverse of the key-cards ranking: surface negative impact after applying
// the same play-count confidence. A steep drop across few plays is shrunk
// toward the baseline before ranking.
export function buildGlobalLossCardData(
  cards: CardWinStat[],
  baselineWinRate: number,
  {
    limit,
    minPlays = GLOBAL_LOSS_CARD_MIN_PLAYS,
  }: { limit?: number; minPlays?: number } = {},
): GlobalLossCardDatum[] {
  return buildGlobalCardImpactData(cards, baselineWinRate, 'negative', {
    limit,
    minPlays,
  });
}

export function GlobalLossCardsSection(props: {
  cards: CardWinStat[];
  baselineWinRate: number;
  /** card name -> catalog id + art, so each card can open its stats dialog. */
  cardMetaByName: Map<string, GlobalLossCardMeta>;
}) {
  const [expanded, setExpanded] = useState(false);
  const data = buildGlobalLossCardData(props.cards, props.baselineWinRate);
  const visibleData = expanded ? data : data.slice(0, GLOBAL_LOSS_CARD_LIMIT);
  const baselinePercent = Math.round(props.baselineWinRate * 100);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="tm-data-label text-xs">Cards Most Correlated With Losses</h3>
      <p className="tm-muted-copy text-sm">
        <GlossaryRichText>
          {`Cards whose play-count-adjusted impact score sits furthest below the ${baselinePercent}% baseline win rate across every recorded game. The score blends win-rate drop with repeat-play evidence, and cards with fewer than ${GLOBAL_LOSS_CARD_MIN_PLAYS} plays are held back. The top ${GLOBAL_LOSS_CARD_LIMIT} are shown first.`}
        </GlossaryRichText>
      </p>
      {data.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--tm-muted)' }}>
          <GlossaryRichText>
            Loss-correlated cards will appear once finalized game logs record enough card plays to measure their impact.
          </GlossaryRichText>
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="tm-data-label">
                <th className="py-1 pr-3">Card</th>
                <th className="py-1 pr-3">Impact score</th>
                <th className="py-1 pr-3">Global win rate</th>
                <th className="py-1 pr-3">Plays</th>
              </tr>
            </thead>
            <tbody>
              {visibleData.map((card) => {
                const meta = props.cardMetaByName.get(card.cardName);

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
                      <td className="py-1 pr-3 font-semibold text-rose-400">
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
          {data.length > GLOBAL_LOSS_CARD_LIMIT ? (
            <button
              aria-expanded={expanded}
              className="tm-button-secondary mt-4 w-full px-4 py-2 text-xs"
              onClick={() => setExpanded((current) => !current)}
              type="button"
            >
              {expanded
                ? `Show top ${GLOBAL_LOSS_CARD_LIMIT}`
                : `See more negative cards (${data.length - GLOBAL_LOSS_CARD_LIMIT})`}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
