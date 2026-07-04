'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
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
      <section className="rounded-2xl border border-orange-900/40 bg-black/25 p-4">
        <h2 className="font-serif text-lg font-semibold">Promo Sets</h2>
        <p className="mt-4 text-sm text-stone-300">
          Promo cards will appear here once the catalog import has been loaded.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-orange-900/40 bg-black/25 p-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-lg font-semibold">Promo Sets</h2>
        <p className="text-sm text-stone-300">
          Browse each promo year and release set, then open a full card image from the
          cached catalog reference.
        </p>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="rounded-2xl border border-stone-800 bg-stone-950/50 p-3">
          <label
            className="text-xs uppercase tracking-[0.2em] text-orange-300"
            htmlFor="promo-set-select"
          >
            Promo Set
          </label>
          <select
            aria-label="Promo set"
            className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
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
          <div className="mt-3 flex flex-wrap gap-2">
            {promoSets.map((promoSet) => {
              const isActive = promoSet.id === activePromoSet?.id;
              return (
                <button
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    isActive
                      ? 'border-orange-400 bg-orange-400/15 text-orange-100'
                      : 'border-stone-700 bg-stone-900/40 text-stone-300'
                  }`}
                  key={promoSet.id}
                  onClick={() => setSelectedPromoSetId(promoSet.id)}
                  type="button"
                >
                  {promoSet.editionLabel}
                </button>
              );
            })}
          </div>
        </div>

        {activePromoSet ? (
          <div className="rounded-2xl border border-stone-800 bg-stone-950/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-xl font-semibold text-stone-100">
                  {activePromoSet.displayName}
                </h3>
                <p className="text-sm text-stone-300">
                  {activePromoSet.editionLabel}
                  {activePromoSet.promoYear ? ` · ${activePromoSet.promoYear}` : ''}
                </p>
              </div>
              <p className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
                {activeCards.length} cards
              </p>
            </div>
            {activeCards.length === 0 ? (
              <p className="mt-4 text-sm text-stone-300">
                No cards are linked to this promo set yet.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {activeCards.map((card) => (
                  <a
                    aria-label={`${card.cardName} full image`}
                    className="grid grid-cols-[72px_1fr] gap-3 rounded-xl border border-stone-700 bg-stone-950/60 p-3"
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
                      <p className="text-xs uppercase tracking-[0.2em] text-orange-300">
                        {card.cardNumber}
                      </p>
                      <h4 className="font-semibold text-stone-100">{card.cardName}</h4>
                      <p className="text-sm text-stone-300">{card.cardType}</p>
                      <span className="text-xs text-cyan-200">
                        Open full image
                      </span>
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
