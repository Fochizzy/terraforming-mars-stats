import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PromoSetBrowser } from './promo-set-browser';

vi.mock('./card-stats-actions', () => ({
  getCardWinStats: vi.fn().mockResolvedValue({
    globalGames: 0,
    globalWins: 0,
    personalGames: 0,
    personalWins: 0,
  }),
}));

describe('PromoSetBrowser', () => {
  it('switches between promo sets and shows the cards for the active set', async () => {
    const user = userEvent.setup();

    render(
      <PromoSetBrowser
        cards={[
          {
            cardName: 'Merger',
            cardNumber: 'P39',
            cardType: 'Event',
            expansionCode: 'PROMO',
            fullImageUrl: 'https://example.com/merger.png',
            id: 'card-1',
            promoSetId: 'promo-1',
            thumbnailUrl: 'https://example.com/merger-thumb.png',
          },
          {
            cardName: 'Community Services',
            cardNumber: 'P02',
            cardType: 'Automated',
            expansionCode: 'PROMO',
            fullImageUrl: 'https://example.com/community.png',
            id: 'card-2',
            promoSetId: 'promo-2',
            thumbnailUrl: 'https://example.com/community-thumb.png',
          },
        ]}
        promoSets={[
          {
            displayName: 'Big Box Promos',
            editionLabel: 'Big Box',
            id: 'promo-1',
            promoYear: 2024,
            slug: 'big-box',
          },
          {
            displayName: 'BoardGameGeek Pack',
            editionLabel: 'BGG',
            id: 'promo-2',
            promoYear: 2025,
            slug: 'bgg-pack',
          },
        ]}
      />,
    );

    expect(screen.getByText(/Merger/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /show statistics for merger/i }),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/promo set/i), 'promo-2');

    expect(
      screen.getByRole('heading', { name: /BoardGameGeek Pack/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Community Services/i)).toBeInTheDocument();
    expect(screen.queryByText(/Merger/i)).not.toBeInTheDocument();
  });

  it('renders inside a ChartFrame panel with the shared dashboard card grid', () => {
    render(
      <PromoSetBrowser
        cards={[
          {
            cardName: 'Corporate Stronghold',
            cardNumber: 'P01',
            cardType: 'Automated',
            expansionCode: 'PROMO',
            fullImageUrl: 'https://example.com/corporate-stronghold.png',
            id: 'card-1',
            promoSetId: 'promo-1',
            thumbnailUrl: 'https://example.com/corporate-stronghold-thumb.png',
          },
        ]}
        promoSets={[
          {
            displayName: 'Seasonal Promos',
            editionLabel: 'Seasonal promo',
            id: 'promo-1',
            promoYear: 2026,
            slug: 'seasonal-promos',
          },
        ]}
      />,
    );

    expect(
      screen.getByRole('heading', { name: /^Promo Sets$/i }),
    ).toBeInTheDocument();

    const cardGrid = screen.getByRole('button', {
      name: /show statistics for corporate stronghold/i,
    }).parentElement;

    expect(cardGrid).toHaveClass('grid', 'gap-3', 'md:grid-cols-2');
    expect(
      screen.getByRole('button', {
        name: /show statistics for corporate stronghold/i,
      }),
    ).toHaveClass('min-w-0');
  });
});
