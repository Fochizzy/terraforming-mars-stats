'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';
import type { CardLookupEntry } from '@/lib/catalog/card-lookup-types';
import { CardDetailsDialog } from './card-details-dialog';
import { isRenderableCardImage } from './card-image';

export type CardLookupFilters = {
  expansionCode: string;
  query: string;
  tag: string;
  type: string;
};

function normalizeSearchText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function humanizeCode(value: string) {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatVictoryPoints(card: CardLookupEntry) {
  if (card.victoryPointsKind === 'static') {
    return typeof card.printedVictoryPoints === 'number'
      ? `${card.printedVictoryPoints} VP`
      : 'Fixed VP';
  }

  return card.victoryPointsKind === 'dynamic' ? 'Dynamic VP' : 'No VP';
}

function buildSearchText(card: CardLookupEntry) {
  return normalizeSearchText(
    [
      card.cardName,
      card.cardNumber,
      card.cardType,
      card.expansionCode,
      card.promoSetSlug ?? '',
      formatVictoryPoints(card),
      ...card.requiredExpansionCodes,
      ...card.sourceTags,
    ].join(' '),
  );
}

export function filterCardLookupEntries(
  cards: readonly CardLookupEntry[],
  filters: CardLookupFilters,
) {
  const query = normalizeSearchText(filters.query);

  return cards.filter((card) => {
    if (filters.type !== 'all' && card.cardType !== filters.type) {
      return false;
    }
    if (
      filters.expansionCode !== 'all' &&
      card.expansionCode !== filters.expansionCode
    ) {
      return false;
    }
    if (filters.tag !== 'all' && !card.sourceTags.includes(filters.tag)) {
      return false;
    }

    return query.length === 0 || buildSearchText(card).includes(query);
  });
}

function CardThumbnail({ card }: { card: CardLookupEntry }) {
  const [failed, setFailed] = useState(false);
  const image =
    !failed && isRenderableCardImage(card.thumbnailUrl)
      ? card.thumbnailUrl
      : null;

  return image ? (
    <Image
      alt={`${card.cardName} thumbnail`}
      className="h-[112px] w-[82px] rounded-md object-cover"
      height={112}
      onError={() => setFailed(true)}
      src={image}
      unoptimized
      width={82}
    />
  ) : (
    <span
      aria-label={`${card.cardName} image unavailable`}
      className="flex h-[112px] w-[82px] items-center justify-center rounded-md border border-stone-700 bg-stone-900 px-1 text-center text-[10px] leading-tight text-stone-400"
    >
      No image
    </span>
  );
}

function CardLookupCard({
  card,
  onOpen,
}: {
  card: CardLookupEntry;
  onOpen: (card: CardLookupEntry) => void;
}) {
  return (
    <button
      aria-label={`Open details for ${card.cardName}`}
      className="grid min-w-0 grid-cols-[82px_minmax(0,1fr)] gap-3 rounded-xl border border-stone-700 bg-stone-950/60 p-3 text-left transition hover:border-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
      data-card-id={card.id}
      onClick={() => onOpen(card)}
      type="button"
    >
      <CardThumbnail card={card} />
      <span className="min-w-0">
        <span className="block text-xs uppercase tracking-[0.2em] text-orange-300">
          {card.cardNumber || 'No number'}
        </span>
        <span className="mt-1 block break-words font-semibold text-stone-100">
          {card.cardName}
        </span>
        <span className="mt-1 block break-words text-sm text-stone-300">
          {card.cardType} | {humanizeCode(card.expansionCode)}
        </span>
        <span className="mt-3 flex flex-wrap gap-1">
          {card.victoryPointsKind !== 'none' ? (
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-100">
              {formatVictoryPoints(card)}
            </span>
          ) : null}
          {card.sourceTags.slice(0, 4).map((tag) => (
            <span
              className="rounded-full border border-stone-700 px-2 py-0.5 text-xs text-stone-300"
              key={tag}
            >
              {humanizeCode(tag)}
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}

export function CardLookupBrowser({ cards }: { cards: readonly CardLookupEntry[] }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [expansionCode, setExpansionCode] = useState('all');
  const [tag, setTag] = useState('all');
  const [selectedCard, setSelectedCard] = useState<CardLookupEntry | null>(null);

  const cardTypes = useMemo(
    () => uniqueSorted(cards.map((card) => card.cardType)),
    [cards],
  );
  const expansionCodes = useMemo(
    () => uniqueSorted(cards.map((card) => card.expansionCode)),
    [cards],
  );
  const tags = useMemo(
    () => uniqueSorted(cards.flatMap((card) => card.sourceTags)),
    [cards],
  );
  const visibleCards = useMemo(
    () =>
      filterCardLookupEntries(cards, {
        expansionCode,
        query,
        tag,
        type,
      }),
    [cards, expansionCode, query, tag, type],
  );

  function resetFilters() {
    setQuery('');
    setType('all');
    setExpansionCode('all');
    setTag('all');
  }

  return (
    <>
      <section className="rounded-2xl border border-orange-900/40 bg-black/25 p-4">
        <h2 className="font-serif text-xl font-semibold text-stone-100">
          Card Database
        </h2>
        <p className="mt-1 text-sm leading-6 text-stone-300">
          <GlossaryRichText>
            Search the full available card catalog by name, number, type,
            expansion, tag, or victory-point metadata.
          </GlossaryRichText>
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_repeat(3,minmax(150px,180px))]">
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-orange-300" htmlFor="card-lookup-query">
              Search Card Database
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
              id="card-lookup-query"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Asteroid, 009, space..."
              type="search"
              value={query}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-orange-300" htmlFor="card-lookup-type">
              Card type
            </label>
            <select
              className="mt-2 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
              id="card-lookup-type"
              onChange={(event) => setType(event.target.value)}
              value={type}
            >
              <option value="all">All types</option>
              {cardTypes.map((cardType) => (
                <option key={cardType} value={cardType}>
                  {cardType}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-orange-300" htmlFor="card-lookup-expansion">
              Expansion
            </label>
            <select
              className="mt-2 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
              id="card-lookup-expansion"
              onChange={(event) => setExpansionCode(event.target.value)}
              value={expansionCode}
            >
              <option value="all">All expansions</option>
              {expansionCodes.map((code) => (
                <option key={code} value={code}>
                  {humanizeCode(code)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-orange-300" htmlFor="card-lookup-tag">
              Tag
            </label>
            <select
              className="mt-2 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
              id="card-lookup-tag"
              onChange={(event) => setTag(event.target.value)}
              value={tag}
            >
              <option value="all">All tags</option>
              {tags.map((tagName) => (
                <option key={tagName} value={tagName}>
                  {humanizeCode(tagName)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100" role="status">
            {visibleCards.length} {visibleCards.length === 1 ? 'card' : 'cards'}
          </p>
          <button
            className="rounded-lg border border-stone-600 px-3 py-2 text-sm text-stone-100 hover:border-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            onClick={resetFilters}
            type="button"
          >
            Reset filters
          </button>
        </div>
      </section>

      {visibleCards.length === 0 ? (
        <p className="mt-4 rounded-xl border border-stone-700 bg-stone-950/60 p-4 text-sm text-stone-300">
          No cards match those filters.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCards.map((card) => (
            <CardLookupCard card={card} key={card.id} onOpen={setSelectedCard} />
          ))}
        </div>
      )}

      {selectedCard ? (
        <CardDetailsDialog
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      ) : null}
    </>
  );
}
