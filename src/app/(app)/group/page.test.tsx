import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GlobalStatisticsPage from './page';
import type { SelectionStats } from '@/lib/db/selection-stats-repo';

const mockState = vi.hoisted(() => ({
  getCardImageMetaByNames: vi.fn(),
  getFinalTerraformingActionStats: vi.fn(),
  getGlobalInsightMetrics: vi.fn(),
  getSelectionDialogData: vi.fn(),
  getSelectionStats: vi.fn(),
  getStyleEffectiveness: vi.fn(),
  listMapAwardGroups: vi.fn(),
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
  FinalTerraformingActionBlock: ({ rows }: { rows: unknown[] }) => (
    <div data-testid="final-terraforming-actions">{rows.length} rows</div>
  ),
  SelectionStatsScope: ({ heading }: { heading: string; stats: SelectionStats }) => (
    <div data-testid="global-selection-stats">{heading}</div>
  ),
}));

vi.mock('@/features/insights/winning-cards-section', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/features/insights/winning-cards-section')
  >()),
  WinningCardsSection: ({ cards }: { cards: SelectionStats['cards'] }) => (
    <div data-testid="winning-cards">{cards.length} cards</div>
  ),
}));

vi.mock('@/features/insights/global-insight-metrics-section', () => ({
  GlobalInsightMetricsSection: ({
    metrics,
  }: {
    metrics: { summary: { totalGames: number } };
  }) => (
    <div data-testid="global-insight-metrics">
      {metrics.summary.totalGames} metric games
    </div>
  ),
}));

vi.mock('@/lib/db/analytics-repo', () => ({
  buildEmptyGlobalInsightMetrics: () => ({
    cardTiming: [],
    mapTableMeta: [],
    metaSignals: [],
    objectiveConversion: [],
    openingCombos: [],
    summary: {
      averageGeneration: 0,
      averageScore: 0,
      baselineWinRate: 0,
      playerResults: 0,
      totalGames: 0,
    },
    tempoProfile: [],
    terraformingShare: [],
  }),
  getGlobalInsightMetrics: mockState.getGlobalInsightMetrics,
  getStyleEffectiveness: mockState.getStyleEffectiveness,
}));

vi.mock('@/lib/db/reference-repo', () => ({
  listMapAwardGroups: mockState.listMapAwardGroups,
}));

vi.mock('@/lib/db/selection-stats-repo', () => ({
  getCardImageMetaByNames: mockState.getCardImageMetaByNames,
  getFinalTerraformingActionStats: mockState.getFinalTerraformingActionStats,
  getSelectionDialogData: mockState.getSelectionDialogData,
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
  totalGames: 0,
};

describe('GlobalStatisticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.getSelectionStats.mockResolvedValue(sampleStats);
    mockState.getCardImageMetaByNames.mockResolvedValue(new Map());
    mockState.getFinalTerraformingActionStats.mockResolvedValue([]);
    mockState.getGlobalInsightMetrics.mockResolvedValue({
      cardTiming: [],
      mapTableMeta: [],
      metaSignals: [],
      objectiveConversion: [],
      openingCombos: [],
      summary: {
        averageGeneration: 10,
        averageScore: 80,
        baselineWinRate: 0.25,
        playerResults: 16,
        totalGames: 4,
      },
      tempoProfile: [],
      terraformingShare: [],
    });
    mockState.getStyleEffectiveness.mockResolvedValue({
      scoreAverages: null,
      styleRows: [],
    });
    mockState.getSelectionDialogData.mockResolvedValue({
      cardMetaByName: new Map(),
      corporationWinRates: new Map(),
      preludeWinRates: new Map(),
    });
    mockState.listMapAwardGroups.mockResolvedValue([]);
  });

  it('renders global statistics from all recorded games', async () => {
    render(await GlobalStatisticsPage());

    expect(mockState.getSelectionStats).toHaveBeenCalledWith('global');
    expect(mockState.getFinalTerraformingActionStats).toHaveBeenCalledWith({
      scope: 'global',
    });
    expect(mockState.getGlobalInsightMetrics).toHaveBeenCalledWith();
    expect(
      screen.getByRole('heading', { name: 'Global Statistics' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('global-selection-stats')).toBeInTheDocument();
    expect(screen.getByTestId('global-insight-metrics')).toHaveTextContent(
      '4 metric games',
    );
    expect(screen.getByTestId('final-terraforming-actions')).toHaveTextContent(
      '0 rows',
    );
    expect(screen.getByTestId('winning-cards')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /review saved games/i }),
    ).toHaveAttribute('href', '/log-game/review');
  });

  it('does not render the named award-funding matrix', async () => {
    render(await GlobalStatisticsPage());

    expect(screen.queryByTestId('award-economics')).not.toBeInTheDocument();
    expect(screen.queryByText(/Award Funding/i)).not.toBeInTheDocument();
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
