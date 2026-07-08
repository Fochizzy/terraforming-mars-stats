import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  CardLookupBrowser,
  filterCardLookupEntries,
  type CardLookupEntry,
} from './card-lookup-browser';

const cards: CardLookupEntry[] = [
  {
    cardName: 'Asteroid',
    cardNumber: '009',
    cardType: 'Event',
    expansionCode: 'base',
    fullImageUrl: 'https://example.com/asteroid.png',
    id: 'card-1',
    promoSetSlug: null,
    requiredExpansionCodes: [],
    sourceTags: ['space', 'event'],
    thumbnailUrl: 'https://example.com/asteroid-thumb.png',
  },
  {
    cardName: 'Ecoline',
    cardNumber: 'C02',
    cardType: 'Corporation',
    expansionCode: 'base',
    fullImageUrl: 'https://example.com/ecoline.png',
    id: 'card-2',
    promoSetSlug: null,
    requiredExpansionCodes: [],
    sourceTags: ['plant'],
    thumbnailUrl: 'https://example.com/ecoline-thumb.png',
  },
  {
    cardName: 'Merger',
    cardNumber: 'P39',
    cardType: 'Prelude',
    expansionCode: 'promo',
    fullImageUrl: 'https://example.com/merger.png',
    id: 'card-3',
    promoSetSlug: 'big-box-promos',
    requiredExpansionCodes: ['prelude'],
    sourceTags: ['wild'],
    thumbnailUrl: 'https://example.com/merger-thumb.png',
  },
];

describe('filterCardLookupEntries', () => {
  it('searches card names, numbers, types, expansions, promo sets, and tags', () => {
    expect(
      filterCardLookupEntries(cards, {
        expansionCode: 'all',
        query: 'space',
        tag: 'all',
        type: 'all',
      }).map((card) => card.cardName),
    ).toEqual(['Asteroid']);

    expect(
      filterCardLookupEntries(cards, {
        expansionCode: 'all',
        query: 'P39',
        tag: 'all',
        type: 'all',
      }).map((card) => card.cardName),
    ).toEqual(['Merger']);

    expect(
      filterCardLookupEntries(cards, {
        expansionCode: 'all',
        query: 'corporation',
        tag: 'all',
        type: 'all',
      }).map((card) => card.cardName),
    ).toEqual(['Ecoline']);

    expect(
      filterCardLookupEntries(cards, {
        expansionCode: 'all',
        query: 'big box',
        tag: 'all',
        type: 'all',
      }).map((card) => card.cardName),
    ).toEqual(['Merger']);
  });

  it('combines typed filters with text search', () => {
    expect(
      filterCardLookupEntries(cards, {
        expansionCode: 'base',
        query: '',
        tag: 'plant',
        type: 'Corporation',
      }).map((card) => card.cardName),
    ).toEqual(['Ecoline']);

    expect(
      filterCardLookupEntries(cards, {
        expansionCode: 'base',
        query: '',
        tag: 'plant',
        type: 'Event',
      }),
    ).toEqual([]);
  });
});

describe('CardLookupBrowser', () => {
  it('renders a searchable card database with full-image links', async () => {
    const user = userEvent.setup();

    render(<CardLookupBrowser cards={cards} />);

    expect(
      screen.getByRole('heading', { name: /card database/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/3 cards/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /open full image for asteroid/i }),
    ).toHaveAttribute('href', 'https://example.com/asteroid.png');

    await user.type(screen.getByLabelText(/search card database/i), 'space');

    expect(screen.getByText(/1 card/i)).toBeInTheDocument();
    expect(screen.getByText(/Asteroid/i)).toBeInTheDocument();
    expect(screen.queryByText(/Ecoline/i)).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText(/search card database/i));
    await user.selectOptions(screen.getByLabelText(/card type/i), 'Corporation');

    expect(screen.getByText(/Ecoline/i)).toBeInTheDocument();
    expect(screen.queryByText(/Asteroid/i)).not.toBeInTheDocument();
  });

  it('shows a useful empty state when no database rows match', async () => {
    const user = userEvent.setup();

    render(<CardLookupBrowser cards={cards} />);

    await user.type(screen.getByLabelText(/search card database/i), 'not a card');

    expect(screen.getByText(/no cards match/i)).toBeInTheDocument();
  });
});
