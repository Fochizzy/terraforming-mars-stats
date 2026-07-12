import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from './page';
import {
  emptyPublicLandingStats,
  type PublicLandingStats,
} from '@/lib/db/public-landing-stats-repo';

const mockState = vi.hoisted(() => ({
  getPublicLandingStats: vi.fn(),
}));

vi.mock('@/lib/db/public-landing-stats-repo', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/db/public-landing-stats-repo')>();
  return {
    ...actual,
    getPublicLandingStats: mockState.getPublicLandingStats,
  };
});

const sampleStats: PublicLandingStats = {
  ...emptyPublicLandingStats,
  finishedGames: 28,
  totalPlayers: 17,
  totalGroups: 6,
  mapsPlayed: 3,
  topCorpWinRate: { name: 'Mons Insurance', plays: 5, winRate: 0.8 },
};

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.getPublicLandingStats.mockResolvedValue(sampleStats);
  });

  it('renders the Terraforming Mars stats CTA', async () => {
    render(await HomePage());

    const heading = screen.getByRole('heading', {
      name: /terraforming mars stats/i,
    });
    const signInLink = screen.getByRole('link', {
      name: /sign in to your group/i,
    });

    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('sr-only');
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveClass('tm-button-primary');
  });

  it('crops the banner artwork inside the hero module', async () => {
    const { container } = render(await HomePage());

    const bannerFrame = container.querySelector('.tm-landing-banner-frame');

    expect(bannerFrame).toHaveClass('tm-landing-banner-frame--cropped');
    expect(bannerFrame?.parentElement).toHaveClass('tm-landing-hero-module');
  });

  it('expands a global statistic when a highlight chip is clicked', async () => {
    const user = userEvent.setup();
    render(await HomePage());

    const winRatesChip = screen.getByRole('button', { name: /win rates/i });
    expect(winRatesChip).toHaveAttribute('aria-expanded', 'false');

    await user.click(winRatesChip);

    expect(winRatesChip).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByText(/best win rate — Mons Insurance \(5 plays\)/i),
    ).toBeVisible();
  });

  it('falls back to empty stats when the query fails', async () => {
    mockState.getPublicLandingStats.mockRejectedValueOnce(new Error('boom'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(await HomePage());

    expect(
      screen.getByRole('heading', { name: /terraforming mars stats/i }),
    ).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
