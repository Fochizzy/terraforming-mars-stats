import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { isRenderableCardImage } from './card-image';
import { CardStatsButton } from './card-stats-dialog';

vi.mock('./card-stats-actions', () => ({
  getCardWinStats: vi.fn().mockResolvedValue({
    globalGames: 0,
    globalWins: 0,
    personalGames: 0,
    personalWins: 0,
  }),
}));

describe('isRenderableCardImage', () => {
  it('accepts real saved image URLs', () => {
    expect(
      isRenderableCardImage(
        'https://project.supabase.co/storage/v1/object/public/tm-card-full/abc.webp',
      ),
    ).toBe(true);
    expect(
      isRenderableCardImage('https://cards.hadronikle.com/projects/Base.png'),
    ).toBe(true);
  });

  it('rejects the legacy Heroku search page, the /file.svg placeholder, and empties', () => {
    expect(
      isRenderableCardImage(
        'https://terraforming-mars.herokuapp.com/cards#~trbgpcseCmalt&search=Acidizing',
      ),
    ).toBe(false);
    expect(isRenderableCardImage('/file.svg')).toBe(false);
    expect(isRenderableCardImage(null)).toBe(false);
    expect(isRenderableCardImage(undefined)).toBe(false);
    expect(isRenderableCardImage('')).toBe(false);
  });
});

describe('CardStatsButton dialog image', () => {
  it('renders the saved card image and full-image link when the URL is a real image', async () => {
    const user = userEvent.setup();

    render(
      <CardStatsButton
        card={{
          cardName: 'Asteroid',
          fullImageUrl:
            'https://project.supabase.co/storage/v1/object/public/tm-card-full/asteroid.webp',
          id: 'card-1',
          thumbnailUrl: null,
        }}
      >
        open
      </CardStatsButton>,
    );

    await user.click(screen.getByRole('button', { name: /show statistics/i }));

    const dialog = await screen.findByRole('dialog', {
      name: /asteroid statistics/i,
    });
    expect(
      within(dialog).getByRole('img', { name: /asteroid card/i }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('link', { name: /open full image/i }),
    ).toBeInTheDocument();
  });

  it('hides the image and link when the card only has the legacy search-page URL', async () => {
    const user = userEvent.setup();

    render(
      <CardStatsButton
        card={{
          cardName: 'Acidizing',
          fullImageUrl:
            'https://terraforming-mars.herokuapp.com/cards#~trbgpcseCmalt&search=Acidizing',
          id: 'card-2',
          thumbnailUrl: '/file.svg',
        }}
      >
        open
      </CardStatsButton>,
    );

    await user.click(screen.getByRole('button', { name: /show statistics/i }));

    const dialog = await screen.findByRole('dialog', {
      name: /acidizing statistics/i,
    });
    expect(
      within(dialog).queryByRole('img', { name: /acidizing card/i }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('link', { name: /open full image/i }),
    ).not.toBeInTheDocument();
  });

  it('renders supplied win-rate stats in the dialog', async () => {
    const user = userEvent.setup();

    render(
      <CardStatsButton
        card={{
          cardName: 'Research',
          fullImageUrl: 'https://example.com/research.png',
          id: 'card-3',
          thumbnailUrl: null,
        }}
        knownStats={{
          globalGames: 9,
          globalWins: 6,
          personalGames: 5,
          personalWins: 2,
        }}
      >
        open
      </CardStatsButton>,
    );

    await user.click(screen.getByRole('button', { name: /show statistics/i }));

    const dialog = await screen.findByRole('dialog', {
      name: /research statistics/i,
    });

    expect(within(dialog).getByText('40%')).toBeInTheDocument();
    expect(within(dialog).getByText('2/5 games')).toBeInTheDocument();
    expect(within(dialog).getByText('67%')).toBeInTheDocument();
    expect(within(dialog).getByText('6/9 games')).toBeInTheDocument();
  });
});
