import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GlobalStatisticsPage from './page';
import type { SelectionStats } from '@/lib/db/selection-stats-repo';

const mockState = vi.hoisted(() => ({
  getSelectionStats: vi.fn(),
}));

vi.mock('@/components/layout/app-shell', () => ({
  AppShell: ({
    children,
    headerActions,
    showReviewSavedGamesLink,
    title,
  }: {
    children: ReactNode;
    headerActions?: ReactNode;
    showReviewSavedGamesLink?: boolean;
    title: string;
  }) => (
    <div>
      <h1>{title}</h1>
      <div>{headerActions}</div>
      {showReviewSavedGamesLink ? (
        <a href="/log-game/review">Review Saved Games</a>
      ) : null}
      {children}
    </div>
  ),
}));

vi.mock('@/features/insights/selection-stats-section', () => ({
  SelectionStatsScope: ({ heading }: { heading: string; stats: SelectionStats }) => (
    <div data-testid="global-selection-stats">{heading}</div>
  ),
}));

vi.mock('@/lib/db/selection-stats-repo', () => ({
  getSelectionStats: mockState.getSelectionStats,
}));

const sampleStats: SelectionStats = {
  awardFunding: [],
  baselineWinRate: 0.2,
  cards: [],
  corporations: [],
  corporationTags: [],
  pairs: [],
  preludes: [],
  tagWins: [],
};

describe('GlobalStatisticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.getSelectionStats.mockResolvedValue(sampleStats);
  });

  it('renders global statistics from all recorded games', async () => {
    render(await GlobalStatisticsPage());

    expect(mockState.getSelectionStats).toHaveBeenCalledWith('global');
    expect(
      screen.getByRole('heading', { name: 'Global Statistics' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('global-selection-stats')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /review saved games/i }),
    ).toHaveAttribute('href', '/log-game/review');
  });

  it('does not render group-scoped affordances', async () => {
    render(await GlobalStatisticsPage());

    expect(screen.queryByText('Group Switcher')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /group settings/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('group-dashboard')).not.toBeInTheDocument();
  });

  it('falls back to empty stats when the global query fails', async () => {
    mockState.getSelectionStats.mockRejectedValueOnce(new Error('boom'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(await GlobalStatisticsPage());

    expect(
      screen.getByRole('heading', { name: 'Global Statistics' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('global-selection-stats')).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
