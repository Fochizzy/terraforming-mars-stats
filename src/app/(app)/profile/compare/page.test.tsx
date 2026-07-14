import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlayerComparePage from './page';

const mockState = vi.hoisted(() => ({
  getCrossGroupFocusData: vi.fn(),
  getOverallAnalytics: vi.fn(),
  PlayerComparison: vi.fn(),
  requireGroupContextOrRedirect: vi.fn(),
}));

vi.mock('@/components/layout/app-shell', () => ({
  AppShell: ({
    children,
    headerActions,
    title,
  }: {
    children: ReactNode;
    headerActions?: ReactNode;
    title: string;
  }) => (
    <div>
      <h1>{title}</h1>
      <div>{headerActions}</div>
      {children}
    </div>
  ),
}));

vi.mock('@/features/analytics/player-comparison', () => ({
  PlayerComparison: (props: unknown) => {
    mockState.PlayerComparison(props);
    return <div>Player comparison widget</div>;
  },
}));

vi.mock('@/features/groups/require-group-context', () => ({
  requireGroupContextOrRedirect: mockState.requireGroupContextOrRedirect,
}));

vi.mock('@/lib/db/analytics-repo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db/analytics-repo')>();

  return {
    ...actual,
    getCrossGroupFocusData: mockState.getCrossGroupFocusData,
    getOverallAnalytics: mockState.getOverallAnalytics,
  };
});

describe('PlayerComparePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockState.requireGroupContextOrRedirect.mockResolvedValue({
      groupId: 'group-1',
      groupName: 'Mars Club',
      role: 'viewer',
      userId: 'user-1',
    });
    mockState.getCrossGroupFocusData.mockResolvedValue([
      {
        activeGroupPlayerId: 'player-1',
        bundle: {
          coverage: null,
          headToHeadRows: [],
          performance: null,
          scoreAverages: null,
          trendRows: [],
        },
        canonicalId: 'user:user-1',
        displayName: 'Izzy Mars',
        inActiveGroup: true,
        playerIds: ['player-1'],
      },
    ]);
    mockState.getOverallAnalytics.mockResolvedValue({
      analytics: {
        playerInteractionRows: [],
      },
      extended: {
        tagOutcomeRows: [],
      },
    });
  });

  it('loads faced-player comparison data for the signed-in user', async () => {
    render(
      await PlayerComparePage({
        searchParams: Promise.resolve({ playerId: 'name:alex-green' }),
      }),
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Compare Players' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to profile/i })).toHaveAttribute(
      'href',
      '/profile',
    );
    expect(mockState.getCrossGroupFocusData).toHaveBeenCalledWith(
      'user-1',
      'group-1',
    );
    expect(mockState.getOverallAnalytics).toHaveBeenCalledWith('user-1');
    expect(mockState.PlayerComparison).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedOpponentId: 'name:alex-green',
        selfCanonicalId: 'user:user-1',
        unavailable: false,
      }),
    );
  });

  it('passes an unavailable state when comparison data fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockState.getCrossGroupFocusData.mockRejectedValue(
      new Error('analytics offline'),
    );

    render(await PlayerComparePage({}));

    expect(mockState.PlayerComparison).toHaveBeenCalledWith(
      expect.objectContaining({
        unavailable: true,
      }),
    );
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
