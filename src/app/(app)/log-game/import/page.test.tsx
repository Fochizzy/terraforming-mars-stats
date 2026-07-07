import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LogGameImportPage from './page';
import { getCurrentGroupContext } from '@/lib/db/group-context-repo';
import { getGroupSettings } from '@/lib/db/group-settings-repo';
import { listMaps } from '@/lib/db/reference-repo';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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

vi.mock('@/features/imports/log-game-import-shell', () => ({
  LogGameImportShell: ({
    initialValues,
  }: {
    initialValues: {
      generationCount: number;
      mapId: string;
      playedOn: string;
      playerCount: number;
    };
  }) => (
    <div>
      <div>Initial Map: {initialValues.mapId}</div>
      <div>Initial Player Count: {initialValues.playerCount}</div>
      <div>Initial Generation Count: {initialValues.generationCount}</div>
    </div>
  ),
}));

vi.mock('./actions', () => ({
  analyzeImportEvidenceAction: vi.fn(),
  createImportDraftAction: vi.fn(),
}));

vi.mock('@/lib/db/group-context-repo', () => ({
  getCurrentGroupContext: vi.fn(),
}));

vi.mock('@/lib/db/group-settings-repo', () => ({
  getGroupSettings: vi.fn(),
}));

vi.mock('@/lib/db/reference-repo', () => ({
  listCardScoringReferences: vi.fn(),
  listCards: vi.fn(),
  listCorporations: vi.fn(),
  listMapAwards: vi.fn(),
  listMapMilestones: vi.fn(),
  listMaps: vi.fn(),
  listPreludes: vi.fn(),
  listStyles: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('LogGameImportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders web import for a signed-in user with no group using map defaults', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
    } as never);
    vi.mocked(getCurrentGroupContext).mockResolvedValue(null);
    vi.mocked(listMaps).mockResolvedValue([
      { code: 'tharsis', id: 'map-1', name: 'Tharsis' },
    ]);

    render(await LogGameImportPage());

    expect(screen.getByRole('heading', { name: /web import/i })).toBeInTheDocument();
    expect(screen.getByText(/initial map: map-1/i)).toBeInTheDocument();
    expect(screen.getByText(/initial player count: 4/i)).toBeInTheDocument();
    expect(screen.getByText(/initial generation count: 10/i)).toBeInTheDocument();
    expect(navigationMocks.redirect).not.toHaveBeenCalled();
    expect(getGroupSettings).not.toHaveBeenCalled();
  });
});
