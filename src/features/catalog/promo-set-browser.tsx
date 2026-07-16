'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { SelectChevron } from '@/components/ui/select-chevron';
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
      <section className="tm-panel flex flex-col gap-4">
        <h2 className="tm-panel-title text-lg">Promo Sets</h2>
        <p className="tm-body-copy text-sm">
          Promo cards will appear here once the catalog import has been loaded.
        </p>
      </section>
    );
  }

  return (
    <section className="tm-panel flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="tm-panel-title text-lg">Promo Sets</h2>
        <p className="tm-body-copy text-sm">
          Browse each promo year and release set, then open a full card image from the
          cached catalog reference.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="tm-stat-card">
          <label className="tm-data-label" htmlFor="promo-set-select">
            Promo Set
          </label>
          <div className="relative mt-2">
            <select
              aria-label="Promo set"
              className="tm-input w-full appearance-none pr-9"
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
            <SelectChevron />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
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
        </div>

        {activePromoSet ? (
          <div className="tm-stat-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="tm-panel-title text-base">
                  {activePromoSet.displayName}
                </h3>
                <p className="tm-muted-copy mt-1 text-sm">
                  {activePromoSet.editionLabel}
                  {activePromoSet.promoYear ? ` · ${activePromoSet.promoYear}` : ''}
                </p>
              </div>
              <span className="tm-coverage-badge">{activeCards.length} cards</span>
            </div>
            {activeCards.length === 0 ? (
              <p className="tm-muted-copy mt-4 text-sm">
                No cards are linked to this promo set yet.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {activeCards.map((card) => (
                  <a
                    aria-label={`${card.cardName} full image`}
                    className="tm-stat-card grid grid-cols-[72px_1fr] gap-3"
                    href={card.fullImageUrl}
                    key={card.id}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Image
                      alt={`${card.cardName} thumbnail`}
                      className="h-[96px] w-[72px] rounded-md object-cover"
                      height={96}
                      src={card.thumbnailUrl}
                      unoptimized
                      width={72}
                    />
                    <div className="flex flex-col gap-1">
                      <p className="tm-data-label">{card.cardNumber}</p>
                      <h4 className="font-semibold text-stone-100">{card.cardName}</h4>
                      <p className="tm-muted-copy text-sm">{card.cardType}</p>
                      <span className="tm-accent-copy text-xs">Open full image</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
