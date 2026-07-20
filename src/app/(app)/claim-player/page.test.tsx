import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClaimPlayerPage from './page';
import { loadClaimCandidates } from '@/lib/db/player-claim-repo';

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: navigationMocks.redirect,
}));

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
  loadClaimCandidates: vi.fn(),
}));

describe('ClaimPlayerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders matched saved player candidates with an ordinal group disambiguator, never a raw group name', async () => {
    vi.mocked(loadClaimCandidates).mockResolvedValue({
      candidates: [
        {
          exactMatch: true,
          groupId: 'group-1',
          matchReason: 'exact',
          playerId: 'player-1',
          playerName: 'Friday Mars',
        },
      ],
      status: 'available',
    });

    render(
      await ClaimPlayerPage({
        searchParams: Promise.resolve({ next: '/profile' }),
      }),
    );

    expect(screen.getByText(/friday mars/i)).toBeInTheDocument();
    expect(screen.getByText(/^group 1$/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /claim this profile/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /skip for now/i }),
    ).toBeInTheDocument();
  });

  it('groups multiple exact matches into a single claim-all action', async () => {
    vi.mocked(loadClaimCandidates).mockResolvedValue({
      candidates: [
        {
          exactMatch: true,
          groupId: 'group-1',
          matchReason: 'exact',
          playerId: 'player-1',
          playerName: 'Friday Mars',
        },
        {
          exactMatch: true,
          groupId: 'group-2',
          matchReason: 'exact',
          playerId: 'player-2',
          playerName: 'Friday Mars',
        },
      ],
      status: 'available',
    });

    render(
      await ClaimPlayerPage({
        searchParams: Promise.resolve({ next: '/profile' }),
      }),
    );

    expect(screen.getByText(/across 2 groups/i)).toBeInTheDocument();
    expect(screen.getByText(/^group 1$/i)).toBeInTheDocument();
    expect(screen.getByText(/^group 2$/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /claim all my profiles/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^claim this profile$/i }),
    ).not.toBeInTheDocument();
  });

  it('renders a keep-account message for a genuine empty result (status: empty)', async () => {
    vi.mocked(loadClaimCandidates).mockResolvedValue({ status: 'empty' });

    render(
      await ClaimPlayerPage({
        searchParams: Promise.resolve({ next: '/profile' }),
      }),
    );

    expect(
      screen.getByTestId('claim-empty'),
    ).toHaveTextContent(/no matching saved player profiles were found yet/i);
    expect(
      screen.getByRole('button', { name: /skip for now/i }),
    ).toBeInTheDocument();
  });

  it('renders a distinct temporary-unavailable state when the claim service fails (status: unavailable)', async () => {
    vi.mocked(loadClaimCandidates).mockResolvedValue({ status: 'unavailable' });

    render(
      await ClaimPlayerPage({
        searchParams: Promise.resolve({ next: '/profile' }),
      }),
    );

    const unavailableMessage = screen.getByTestId('claim-unavailable');
    expect(unavailableMessage).toBeInTheDocument();
    expect(screen.queryByTestId('claim-empty')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /skip for now/i }),
    ).toBeInTheDocument();
  });

  it('never renders raw PostgreSQL errors, RPC names, or schema details in the unavailable state', async () => {
    vi.mocked(loadClaimCandidates).mockResolvedValue({ status: 'unavailable' });

    render(
      await ClaimPlayerPage({
        searchParams: Promise.resolve({ next: '/profile' }),
      }),
    );

    const rendered = document.body.textContent ?? '';
    expect(rendered.toLowerCase()).not.toContain('permission denied');
    expect(rendered.toLowerCase()).not.toContain('list_claimable_player_profiles');
    expect(rendered.toLowerCase()).not.toContain('claim_player_profile');
    expect(rendered.toLowerCase()).not.toContain('postgres');
    expect(rendered.toLowerCase()).not.toContain('sql');
    expect(rendered).not.toMatch(/\b\d{5}\b/); // no bare Postgres error codes (e.g. 42501)
  });

  it('redirects to login instead of rendering when the session is invalid (status: unauthorized)', async () => {
    vi.mocked(loadClaimCandidates).mockResolvedValue({ status: 'unauthorized' });

    await ClaimPlayerPage({
      searchParams: Promise.resolve({ next: '/profile' }),
    });

    expect(navigationMocks.redirect).toHaveBeenCalledWith(
      '/login?next=%2Fclaim-player',
    );
  });

  it('never exposes private matching reasons or full names beyond the already-public candidate name', async () => {
    vi.mocked(loadClaimCandidates).mockResolvedValue({
      candidates: [
        {
          exactMatch: false,
          groupId: 'group-2',
          matchReason: 'partial',
          playerId: 'player-2',
          playerName: 'Friday M',
        },
      ],
      status: 'available',
    });

    render(
      await ClaimPlayerPage({
        searchParams: Promise.resolve({ next: '/profile' }),
      }),
    );

    const rendered = document.body.textContent ?? '';
    expect(rendered).not.toContain('partial');
    expect(rendered).not.toContain('exact_match');
    expect(rendered).not.toContain('match_reason');
  });
});
