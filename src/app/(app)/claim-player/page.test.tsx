import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClaimPlayerPage from './page';
import { listClaimablePlayerProfiles } from '@/lib/db/player-claim-repo';

vi.mock('@/components/layout/app-shell', () => ({
  AppShell: ({
    children,
    title,
  }: {
    children: ReactNode;
    title: string;
  }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('@/lib/db/player-claim-repo', () => ({
  claimAllExactPlayerProfiles: vi.fn(),
  claimSavedPlayerProfile: vi.fn(),
  listClaimablePlayerProfiles: vi.fn(),
}));

describe('ClaimPlayerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders matched saved player candidates with group names', async () => {
    vi.mocked(listClaimablePlayerProfiles).mockResolvedValue([
      {
        exactMatch: true,
        groupId: 'group-1',
        groupName: 'Mars Club',
        matchReason: 'exact',
        playerId: 'player-1',
        playerName: 'Friday Mars',
      },
    ]);

    render(
      await ClaimPlayerPage({
        searchParams: Promise.resolve({ next: '/profile' }),
      }),
    );

    expect(screen.getByText(/friday mars/i)).toBeInTheDocument();
    expect(screen.getByText(/mars club/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /claim this profile/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /skip for now/i }),
    ).toBeInTheDocument();
  });

  it('groups multiple exact matches into a single claim-all action', async () => {
    vi.mocked(listClaimablePlayerProfiles).mockResolvedValue([
      {
        exactMatch: true,
        groupId: 'group-1',
        groupName: 'Mars Club',
        matchReason: 'exact',
        playerId: 'player-1',
        playerName: 'Friday Mars',
      },
      {
        exactMatch: true,
        groupId: 'group-2',
        groupName: 'Second Table',
        matchReason: 'exact',
        playerId: 'player-2',
        playerName: 'Friday Mars',
      },
    ]);

    render(
      await ClaimPlayerPage({
        searchParams: Promise.resolve({ next: '/profile' }),
      }),
    );

    expect(screen.getByText(/across 2 groups/i)).toBeInTheDocument();
    expect(screen.getByText(/mars club/i)).toBeInTheDocument();
    expect(screen.getByText(/second table/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /claim all my profiles/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^claim this profile$/i }),
    ).not.toBeInTheDocument();
  });

  it('renders a keep-account message when no claimable profiles exist yet', async () => {
    vi.mocked(listClaimablePlayerProfiles).mockResolvedValue([]);

    render(
      await ClaimPlayerPage({
        searchParams: Promise.resolve({ next: '/profile' }),
      }),
    );

    expect(
      screen.getByText(/no matching saved player profiles were found yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /skip for now/i }),
    ).toBeInTheDocument();
  });
});
