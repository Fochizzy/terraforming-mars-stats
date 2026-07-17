import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { CardLookupEntry } from '@/lib/catalog/card-lookup-types';
import {
  CardLookupBrowser,
  filterCardLookupEntries,
} from './card-lookup-browser';

const cards: CardLookupEntry[] = [
  {
    id: 'card-asteroid',
    cardNumber: '009',
    cardName: 'Asteroid',
    cardType: 'Event',
    expansionCode: 'base',
    promoSetSlug: null,
    printedVictoryPoints: null,
    requiredExpansionCodes: [],
    thumbnailUrl: 'https://assets.example.test/asteroid.webp',
    fullImageUrl: 'https://assets.example.test/asteroid-full.webp',
    sourceTags: ['space', 'event'],
    victoryPointsKind: 'none',
  },
  {
    id: 'card-ecoline',
    cardNumber: 'CORP01',
    cardName: 'Ecoline',
    cardType: 'Corporation',
    expansionCode: 'base',
    promoSetSlug: null,
    printedVictoryPoints: 0,
    requiredExpansionCodes: [],
    thumbnailUrl: null,
    fullImageUrl: null,
    sourceTags: ['plant'],
    victoryPointsKind: 'static',
  },
  {
    id: 'card-merger',
    cardNumber: 'P39',
    cardName: 'Merger',
    cardType: 'Prelude',
    expansionCode: 'prelude',
    promoSetSlug: 'big-box',
    printedVictoryPoints: null,
    requiredExpansionCodes: ['prelude'],
    thumbnailUrl: 'https://assets.example.test/merger.webp',
    fullImageUrl: 'https://assets.example.test/merger-full.webp',
    sourceTags: ['corporation', 'tagless'],
    victoryPointsKind: 'dynamic',
  },
];

describe('CardLookupBrowser', () => {
  it('searches the full records by name, number, and metadata', () => {
    expect(
      filterCardLookupEntries(cards, {
        expansionCode: 'all',
        query: 'asteroid',
        tag: 'all',
        type: 'all',
      }).map((card) => card.id),
    ).toEqual(['card-asteroid']);
    expect(
      filterCardLookupEntries(cards, {
        expansionCode: 'all',
        query: 'P39',
        tag: 'all',
        type: 'all',
      }).map((card) => card.id),
    ).toEqual(['card-merger']);
    expect(
      filterCardLookupEntries(cards, {
        expansionCode: 'all',
        query: 'big box dynamic',
        tag: 'all',
        type: 'all',
      }).map((card) => card.id),
    ).toEqual(['card-merger']);
  });

  it('composes filters, reports results, resets, uses stable IDs, and opens detail by keyboard', async () => {
    const user = userEvent.setup();
    render(<CardLookupBrowser cards={cards} />);

    expect(screen.getByRole('status')).toHaveTextContent('3 cards');
    expect(screen.getByLabelText('Ecoline image unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open details for asteroid/i })).toHaveAttribute(
      'data-card-id',
      'card-asteroid',
    );

    await user.selectOptions(screen.getByLabelText(/^card type$/i), 'Event');
    await user.selectOptions(screen.getByLabelText(/^expansion$/i), 'base');
    await user.selectOptions(screen.getByLabelText(/^tag$/i), 'space');
    expect(screen.getByRole('status')).toHaveTextContent('1 card');
    expect(screen.getByText('Asteroid')).toBeInTheDocument();
    expect(screen.queryByText('Ecoline')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/search card database/i), 'nope');
    expect(screen.getByText(/no cards match those filters/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /reset filters/i }));
    expect(screen.getByRole('status')).toHaveTextContent('3 cards');

    const merger = screen.getByRole('button', { name: /open details for merger/i });
    merger.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: /merger details/i })).toBeInTheDocument();
    expect(screen.getByText(/card outcome statistics are unavailable/i)).toHaveAttribute(
      'role',
      'status',
    );
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(merger).toHaveFocus();
  });
});
