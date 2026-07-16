import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LogGamePage from './page';
import { getCurrentGroupContext } from '@/lib/db/group-context-repo';
import { getGroupSettings } from '@/lib/db/group-settings-repo';
import { listPlayers } from '@/lib/db/player-repo';
import {
  getLatestCatalogSnapshotId,
  listCards,
  listCorporations,
  listExpansions,
  listMapAwards,
  listMapMilestones,
  listMaps,
  listPreludes,
  listPromoSets,
  listStyles,
} from '@/lib/db/reference-repo';
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

vi.mock('@/features/games/log-game/log-game-wizard', () => ({
  LogGameWizard: ({
    initialValues,
    playerOptions,
  }: {
    initialValues: {
      groupId: string;
      mapId: string;
      playerCount: number;
    };
    playerOptions: Array<{ id: string }>;
  }) => (
    <div>
      <div>Wizard Group: {initialValues.groupId}</div>
      <div>Wizard Map: {initialValues.mapId}</div>
      <div>Wizard Player Count: {initialValues.playerCount}</div>
      <div>Wizard Player Options: {playerOptions.length}</div>
    </div>
  ),
}));

vi.mock('@/features/groups/group-switcher', () => ({
  GroupSwitcher: () => <div>Group Switcher</div>,
}));

vi.mock('@/features/imports/import-evidence-summary', () => ({
  ImportEvidenceSummary: () => <div>Import Evidence Summary</div>,
}));

vi.mock('@/lib/db/group-context-repo', () => ({
  getCurrentGroupContext: vi.fn(),
}));

vi.mock('@/lib/db/group-settings-repo', () => ({
  getGroupSettings: vi.fn(),
}));

vi.mock('@/lib/db/player-repo', () => ({
  listPlayers: vi.fn(),
}));

vi.mock('@/lib/db/game-draft-repo', () => ({
  finalizeGameLog: vi.fn(),
  getDraftGameForm: vi.fn(),
  saveDraftGame: vi.fn(),
}));

vi.mock('@/lib/db/game-import-repo', () => ({
  getLatestGameLogImportSummary: vi.fn(),
}));

vi.mock('@/lib/db/log-game-player-resolution', () => ({
  resolveLogGamePlayerReferences: vi.fn(),
}));

vi.mock('@/lib/db/reference-repo', () => ({
  getLatestCatalogSnapshotId: vi.fn(),
  listCards: vi.fn(),
  listCorporations: vi.fn(),
  listExpansions: vi.fn(),
  listMapAwards: vi.fn(),
  listMapMilestones: vi.fn(),
  listMaps: vi.fn(),
  listPreludes: vi.fn(),
  listPromoSets: vi.fn(),
  listStyles: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('LogGamePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listMaps).mockResolvedValue([
      { code: 'tharsis', id: 'map-1', name: 'Tharsis' },
    ]);
    vi.mocked(listExpansions).mockResolvedValue([]);
    vi.mocked(listPromoSets).mockResolvedValue([]);
    vi.mocked(listCorporations).mockResolvedValue([]);
    vi.mocked(listPreludes).mockResolvedValue([]);
    vi.mocked(listMapMilestones).mockResolvedValue([]);
    vi.mocked(listMapAwards).mockResolvedValue([]);
    vi.mocked(listStyles).mockResolvedValue([]);
    vi.mocked(listCards).mockResolvedValue([]);
    vi.mocked(getLatestCatalogSnapshotId).mockResolvedValue('catalog-1');
  });

  it('renders log game for a signed-in user with no group using starter defaults', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
    } as never);
    vi.mocked(getCurrentGroupContext).mockResolvedValue(null);

    render(
      await LogGamePage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole('heading', { name: /log game/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        /we'll create your first group automatically when you save your first game/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/wizard group: 00000000-0000-4000-8000-000000000000/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/wizard map: map-1/i)).toBeInTheDocument();
    expect(screen.getByText(/wizard player count: 2/i)).toBeInTheDocument();
    expect(screen.getByText(/wizard player options: 0/i)).toBeInTheDocument();
    expect(navigationMocks.redirect).not.toHaveBeenCalled();
    expect(getGroupSettings).not.toHaveBeenCalled();
    expect(listPlayers).not.toHaveBeenCalled();
  });
});
