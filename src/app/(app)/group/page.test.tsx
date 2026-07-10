import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupPage from './page';

const mockState = vi.hoisted(() => ({
  getGroupAnalytics: vi.fn(),
  requireGroupContextOrRedirect: vi.fn(),
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

vi.mock('@/features/analytics/group-dashboard', () => ({
  GroupDashboard: () => <div data-testid="group-dashboard" />,
}));

vi.mock('@/features/groups/group-switcher', () => ({
  GroupSwitcher: () => <div>Group Switcher</div>,
}));

vi.mock('@/features/groups/require-group-context', () => ({
  requireGroupContextOrRedirect: mockState.requireGroupContextOrRedirect,
}));

vi.mock('@/lib/db/analytics-repo', () => ({
  getGroupAnalytics: mockState.getGroupAnalytics,
}));

describe('GroupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockState.requireGroupContextOrRedirect.mockResolvedValue({
      groupId: 'group-1',
      groupName: 'Mars Club',
      role: 'viewer',
      userId: 'user-1',
    });
    mockState.getGroupAnalytics.mockResolvedValue({
      coverage: null,
      headToHeadRows: [],
      leaderboardRows: [],
      lineupEffectRows: [],
      scoreAverages: null,
      styleAgreementRows: [],
    });
  });

  it('shows group settings access for any group member role', async () => {
    render(await GroupPage());

    expect(screen.getByRole('heading', { name: 'Group' })).toBeInTheDocument();
    expect(screen.getByText('Group Switcher')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /group settings/i }),
    ).toHaveAttribute('href', '/group/settings');
    expect(
      screen.getByRole('link', { name: /review saved games/i }),
    ).toHaveAttribute('href', '/log-game/review');
    expect(screen.getByTestId('group-dashboard')).toBeInTheDocument();
  });

  // The personal comparison moved to its own screen at /profile/comparison.
  it('does not render the personal play comparison', async () => {
    render(await GroupPage());

    expect(screen.queryByText('My Play vs Overall')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Group')).not.toBeInTheDocument();
  });
});
