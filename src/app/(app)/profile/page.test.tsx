import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from './page';
import { getCurrentGroupContext } from '@/lib/db/group-context-repo';
import { getProfileAnalytics } from '@/lib/db/analytics-repo';

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: navigationMocks.redirect,
}));

vi.mock('@/components/layout/app-shell', () => ({
  AppShell: ({
    children,
    navItems,
    title,
  }: {
    children: ReactNode;
    navItems?: Array<{ href: string; label: string }>;
    title: string;
  }) => (
    <div>
      <h1>{title}</h1>
      <nav>
        {navItems?.map((item) => (
          <a href={item.href} key={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
      {children}
    </div>
  ),
}));

vi.mock('@/features/groups/group-switcher', () => ({
  GroupSwitcher: () => <div>Group Switcher</div>,
}));

vi.mock('@/lib/db/group-context-repo', () => ({
  getCurrentGroupContext: vi.fn(),
}));

vi.mock('@/lib/db/analytics-repo', () => ({
  getProfileAnalytics: vi.fn(),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a claim prompt when the signed-in user has no group yet', async () => {
    vi.mocked(getCurrentGroupContext).mockResolvedValue(null);

    render(await ProfilePage());

    expect(
      screen.getByText(
        /claim a saved player profile to join the group that already has your history/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /review saved player matches/i }),
    ).toHaveAttribute('href', '/claim-player');
    expect(screen.getByRole('link', { name: /log game/i })).toHaveAttribute(
      'href',
      '/log-game',
    );
    expect(
      screen.queryByRole('link', { name: /^group$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /insights/i }),
    ).not.toBeInTheDocument();
    expect(navigationMocks.redirect).not.toHaveBeenCalled();
    expect(getProfileAnalytics).not.toHaveBeenCalled();
  });

  it('renders a safe fallback when loading analytics throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getCurrentGroupContext).mockResolvedValue({
      groupId: 'group-1',
      groupName: 'Mars Club',
      role: 'owner',
      userId: 'user-1',
    });
    vi.mocked(getProfileAnalytics).mockRejectedValue(
      new Error('permission denied for schema analytics'),
    );

    render(await ProfilePage());

    expect(
      screen.getByText(/couldn't load your finalized-game profile analytics right now/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /open saved players/i }),
    ).toHaveAttribute('href', '/group/players');
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
