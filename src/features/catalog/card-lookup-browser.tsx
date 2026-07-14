'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { ChartFrame } from '@/components/charts/chart-frame';
import { SelectChevron } from '@/components/ui/select-chevron';
import { TagIcon } from '@/components/ui/tag-icon';
import { isRenderableCardImage } from './card-image';
import { CardStatsButton } from './card-stats-dialog';

export type CardLookupEntry = {
  cardName: string;
  cardNumber: string;
  cardType: string;
  expansionCode: string;
  fullImageUrl: string;
  id: string;
  promoSetSlug: string | null;
  printedVictoryPoints: number | null;
  requiredExpansionCodes: string[];
  sourceTags: string[];
  thumbnailUrl: string;
  victoryPointsKind: 'none' | 'static' | 'dynamic';
};

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
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function uniqueSorted(values: string[]) {
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

function formatCardCount(count: number) {
  return `${count} ${count === 1 ? 'card' : 'cards'}`;
}

export function filterCardLookupEntries(
  cards: CardLookupEntry[],
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

export function CardLookupBrowser({ cards }: { cards: CardLookupEntry[] }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [expansionCode, setExpansionCode] = useState('all');
  const [tag, setTag] = useState('all');

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

  return (
    <ChartFrame title="Card Database">
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_repeat(3,minmax(150px,180px))]">
          <div>
            <label className="tm-data-label" htmlFor="card-lookup-query">
              Search Card Database
            </label>
            <input
              className="tm-input mt-2 w-full"
              id="card-lookup-query"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Asteroid, 009, space..."
              type="search"
              value={query}
            />
          </div>

          <div className="relative">
            <label className="tm-data-label" htmlFor="card-lookup-type">
              Card Type
            </label>
            <select
              className="tm-input mt-2 w-full appearance-none pr-9"
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
            <span className="mt-2 block">
              <SelectChevron />
            </span>
          </div>

          <div className="relative">
            <label className="tm-data-label" htmlFor="card-lookup-expansion">
              Expansion
            </label>
            <select
              className="tm-input mt-2 w-full appearance-none pr-9"
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
            <span className="mt-2 block">
              <SelectChevron />
            </span>
          </div>

          <div className="relative">
            <label className="tm-data-label" htmlFor="card-lookup-tag">
              Tag
            </label>
            <select
              className="tm-input mt-2 w-full appearance-none pr-9"
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
            <span className="mt-2 block">
              <SelectChevron />
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="tm-coverage-badge">{formatCardCount(visibleCards.length)}</span>
          <button
            className="tm-button-secondary px-4 py-2 text-xs"
            onClick={() => {
              setQuery('');
              setType('all');
              setExpansionCode('all');
              setTag('all');
            }}
            type="button"
          >
            Reset
          </button>
        </div>

        {visibleCards.length === 0 ? (
          <p className="tm-muted-copy text-sm">No cards match those filters.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleCards.map((card) => (
              <CardStatsButton
                card={{
                  cardName: card.cardName,
                  fullImageUrl: card.fullImageUrl,
                  id: card.id,
                  thumbnailUrl: card.thumbnailUrl,
                }}
                className="tm-stat-card grid min-w-0 grid-cols-[82px_minmax(0,1fr)] gap-3 text-left transition hover:border-[rgba(221,161,93,0.52)]"
                key={card.id}
              >
                {isRenderableCardImage(card.thumbnailUrl) ? (
                  <Image
                    alt={`${card.cardName} thumbnail`}
                    className="h-[112px] w-[82px] rounded-md object-cover"
                    height={112}
                    src={card.thumbnailUrl}
                    unoptimized
                    width={82}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-[112px] w-[82px] items-center justify-center rounded-md border border-white/10 bg-white/5 text-center text-[10px] leading-tight text-stone-500"
                  >
                    No image
                  </span>
                )}
                <div className="min-w-0">
                  <p className="tm-data-label">{card.cardNumber || 'No number'}</p>
                  <h3 className="mt-1 break-words font-semibold text-stone-100">
                    {card.cardName}
                  </h3>
                  <p className="tm-muted-copy mt-1 break-words text-sm">
                    {card.cardType} | {humanizeCode(card.expansionCode)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {card.victoryPointsKind !== 'none' ? (
                      <span className="tm-coverage-badge px-2 py-0.5">
                        {formatVictoryPoints(card)}
                      </span>
                    ) : null}
                    {card.sourceTags.slice(0, 4).map((tagName) => (
                      <span
                        className="tm-coverage-badge inline-flex items-center gap-1 px-2 py-0.5"
                        key={tagName}
                      >
                        <TagIcon code={tagName} size={14} />
                        {humanizeCode(tagName)}
                      </span>
                    ))}
                  </div>
                </div>
              </CardStatsButton>
            ))}
          </div>
        )}
      </div>
    </ChartFrame>
  );
}
