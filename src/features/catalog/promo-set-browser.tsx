'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { ChartFrame } from '@/components/charts/chart-frame';
import { SelectChevron } from '@/components/ui/select-chevron';
import { CardStatsButton } from '@/features/catalog/card-stats-dialog';
import type { PromoCardOption, PromoSetOption } from '@/lib/db/reference-repo';

type PromoSetBrowserProps = {
  cards: PromoCardOption[];
  promoSets: PromoSetOption[];
};

function buildSetLabel(promoSet: PromoSetOption) {
  if (promoSet.promoYear) {
    return `${promoSet.promoYear} ${promoSet.displayName}`;
  }

  return promoSet.displayName;
}

export function PromoSetBrowser({
  cards,
  promoSets,
}: PromoSetBrowserProps) {
  const initialPromoSetId = promoSets[0]?.id ?? '';
  const [selectedPromoSetId, setSelectedPromoSetId] = useState(initialPromoSetId);

  const cardsByPromoSet = useMemo(() => {
    return cards.reduce<Record<string, PromoCardOption[]>>((groups, card) => {
      const nextGroup = groups[card.promoSetId] ?? [];
      nextGroup.push(card);
      groups[card.promoSetId] = nextGroup;
      return groups;
    }, {});
  }, [cards]);

  const activePromoSet =
    promoSets.find((promoSet) => promoSet.id === selectedPromoSetId) ??
    promoSets[0] ??
    null;
  const activeCards = activePromoSet ? cardsByPromoSet[activePromoSet.id] ?? [] : [];

  if (promoSets.length === 0) {
    return (
      <ChartFrame title="Promo Sets">
        <p className="tm-body-copy text-sm">
          Promo cards will appear here once the catalog import has been loaded.
        </p>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame title="Promo Sets">
      <div className="flex flex-col gap-4">
        <p className="tm-body-copy text-sm">
          Browse each promo year and release set, then select a card for its
          image and win-rate stats.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[220px] flex-1">
            <label className="tm-data-label" htmlFor="promo-set-select">
              Promo Set
            </label>
            <select
              aria-label="Promo set"
              className="tm-input mt-2 w-full appearance-none pr-9"
              id="promo-set-select"
              onChange={(event) => setSelectedPromoSetId(event.target.value)}
              value={activePromoSet?.id ?? ''}
            >
              {promoSets.map((promoSet) => (
                <option key={promoSet.id} value={promoSet.id}>
                  {buildSetLabel(promoSet)}
                </option>
              ))}
            </select>
            <span className="mt-2 block">
              <SelectChevron />
            </span>
          </div>
          {activePromoSet ? (
            <span className="tm-coverage-badge">
              {activePromoSet.editionLabel}
              {activePromoSet.promoYear ? ` · ${activePromoSet.promoYear}` : ''}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {promoSets.map((promoSet) => {
            const isActive = promoSet.id === activePromoSet?.id;
            return (
              <button
                className={
                  isActive
                    ? 'rounded-full border px-3 py-1 text-xs transition'
                    : 'rounded-full border border-transparent px-3 py-1 text-xs transition'
                }
                key={promoSet.id}
                onClick={() => setSelectedPromoSetId(promoSet.id)}
                style={
                  isActive
                    ? {
                        background: 'rgba(217, 145, 74, 0.18)',
                        borderColor: 'var(--tm-copper-400)',
                        color: 'var(--tm-dust-300)',
                      }
                    : {
                        background: 'rgba(28, 19, 17, 0.42)',
                        color: 'var(--tm-muted)',
                      }
                }
                type="button"
              >
                {promoSet.editionLabel}
              </button>
            );
          })}
        </div>

        {activePromoSet ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="tm-panel-title text-base">{activePromoSet.displayName}</h3>
              <span className="tm-coverage-badge">{activeCards.length} cards</span>
            </div>
            {activeCards.length === 0 ? (
              <p className="tm-muted-copy text-sm">
                No cards are linked to this promo set yet.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {activeCards.map((card) => (
                  <CardStatsButton
                    card={{
                      cardName: card.cardName,
                      fullImageUrl: card.fullImageUrl,
                      id: card.id,
                      thumbnailUrl: card.thumbnailUrl,
                    }}
                    className="tm-stat-card grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-3 text-left"
                    key={card.id}
                  >
                    <Image
                      alt={`${card.cardName} thumbnail`}
                      className="h-[96px] w-[72px] rounded-md object-cover"
                      height={96}
                      src={card.thumbnailUrl}
                      unoptimized
                      width={72}
                    />
                    <div className="min-w-0 flex flex-col gap-1">
                      <p className="tm-data-label">{card.cardNumber}</p>
                      <h4 className="break-words font-semibold text-stone-100">
                        {card.cardName}
                      </h4>
                      <p className="tm-muted-copy break-words text-sm">{card.cardType}</p>
                      <span className="tm-accent-copy text-xs">Open card stats</span>
                    </div>
                  </CardStatsButton>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </ChartFrame>
  );
}
