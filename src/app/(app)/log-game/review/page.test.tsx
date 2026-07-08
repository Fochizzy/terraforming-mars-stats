import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LogGameReviewPage from './page';

const mockState = vi.hoisted(() => ({
  getGroupSettings: vi.fn(),
  getLatestCatalogSnapshotId: vi.fn(),
  getLatestGameLogImportSummary: vi.fn(),
  getSavedGameForm: vi.fn(),
  listCards: vi.fn(),
  listCorporations: vi.fn(),
  listExpansions: vi.fn(),
  listImportResolutionPlayers: vi.fn(),
  listMapAwards: vi.fn(),
  listMapMilestones: vi.fn(),
  listMaps: vi.fn(),
  listPreludes: vi.fn(),
  listPromoSets: vi.fn(),
  listSavedGames: vi.fn(),
  listStyles: vi.fn(),
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
      {headerActions}
      {children}
    </div>
  ),
}));

vi.mock('@/features/groups/group-switcher', () => ({
  GroupSwitcher: () => <div>Group Switcher</div>,
}));

vi.mock('@/features/games/log-game/log-game-wizard', () => ({
  LogGameWizard: () => <div data-testid="log-game-wizard" />,
}));

vi.mock('@/features/imports/import-evidence-summary', () => ({
  ImportEvidenceSummary: () => <div data-testid="import-evidence-summary" />,
}));

vi.mock('@/features/groups/require-group-context', () => ({
  requireGroupContextOrRedirect: mockState.requireGroupContextOrRedirect,
}));

vi.mock('@/lib/db/game-draft-repo', () => ({
  getSavedGameForm: mockState.getSavedGameForm,
  listSavedGames: mockState.listSavedGames,
  saveDraftGame: vi.fn(),
  finalizeGameLog: vi.fn(),
}));

vi.mock('@/lib/db/game-import-repo', () => ({
  getLatestGameLogImportSummary: mockState.getLatestGameLogImportSummary,
}));

vi.mock('@/lib/db/import-player-resolution-repo', () => ({
  listImportResolutionPlayers: mockState.listImportResolutionPlayers,
}));

vi.mock('@/lib/db/log-game-player-resolution', () => ({
  resolveLogGamePlayerReferences: vi.fn(),
}));

vi.mock('@/lib/db/group-context-repo', () => ({
  requireCurrentGroupContext: vi.fn(),
}));

vi.mock('@/lib/db/group-settings-repo', () => ({
  getGroupSettings: mockState.getGroupSettings,
}));

vi.mock('@/lib/db/reference-repo', () => ({
  getLatestCatalogSnapshotId: mockState.getLatestCatalogSnapshotId,
  listCards: mockState.listCards,
  listCorporations: mockState.listCorporations,
  listExpansions: mockState.listExpansions,
  listMapAwards: mockState.listMapAwards,
  listMapMilestones: mockState.listMapMilestones,
  listMaps: mockState.listMaps,
  listPreludes: mockState.listPreludes,
  listPromoSets: mockState.listPromoSets,
  listStyles: mockState.listStyles,
}));

describe('LogGameReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockState.requireGroupContextOrRedirect.mockResolvedValue({
      groupId: 'group-1',
      groupName: 'Mars Club',
      role: 'owner',
      userId: 'user-1',
    });
    mockState.getGroupSettings.mockResolvedValue({
      defaultExpansionCodes: ['base'],
      defaultMapId: 'tharsis',
      defaultPromoSetSlugs: [],
    });
    mockState.listMaps.mockResolvedValue([
      { code: 'tharsis', id: 'tharsis', name: 'Tharsis' },
    ]);
    mockState.listExpansions.mockResolvedValue([]);
    mockState.listPromoSets.mockResolvedValue([]);
    mockState.listImportResolutionPlayers.mockResolvedValue([
      {
        displayName: 'Friday Mars',
        gamesPlayed: 3,
        id: 'player-1',
        linkedFullName: 'Friday Mars',
        linkedUsername: 'friday',
      },
    ]);
    mockState.listCorporations.mockResolvedValue([]);
    mockState.listPreludes.mockResolvedValue([]);
    mockState.listMapMilestones.mockResolvedValue([]);
    mockState.listMapAwards.mockResolvedValue([]);
    mockState.listStyles.mockResolvedValue([]);
    mockState.listCards.mockResolvedValue([]);
    mockState.getLatestCatalogSnapshotId.mockResolvedValue('catalog-1');
    mockState.getSavedGameForm.mockResolvedValue(null);
    mockState.listSavedGames.mockResolvedValue([
      {
        gameId: 'game-draft',
        playedOn: '2026-07-07',
        playerCount: 2,
        playerNames: ['Friday Mars', 'Izzy Hodnett'],
        status: 'draft',
        updatedAt: '2026-07-08T09:00:00.000Z',
      },
      {
        gameId: 'game-final',
        playedOn: '2026-07-06',
        playerCount: 4,
        playerNames: ['Friday Mars', 'Sam Terraformer'],
        status: 'finalized',
        updatedAt: '2026-07-08T08:00:00.000Z',
      },
    ]);
    mockState.getLatestGameLogImportSummary.mockResolvedValue(null);
  });

  it('renders saved games when review opens without a game id', async () => {
    render(await LogGameReviewPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole('heading', { name: /saved games/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /resume draft/i })).toHaveAttribute(
      'href',
      '/log-game/review?gameId=game-draft',
    );
    expect(screen.getByRole('link', { name: /correct players/i })).toHaveAttribute(
      'href',
      '/log-game/review?gameId=game-final',
    );
    expect(screen.queryByTestId('log-game-wizard')).not.toBeInTheDocument();
  });

  it('renders the log game wizard when review opens with a game id', async () => {
    mockState.getSavedGameForm.mockResolvedValue({
      form: {
        awardClaims: {},
        expansionCodes: ['base'],
        gameId: 'game-final',
        generationCount: 11,
        groupId: 'group-1',
        mapId: 'tharsis',
        milestoneClaims: {},
        notes: '',
        playedOn: '2026-07-06',
        playerCount: 4,
        playerScores: {},
        playerSelections: {},
        playerStyles: {},
        promoSetSlugs: [],
        selectedPlayerIds: ['player-1'],
      },
      status: 'finalized',
    });

    render(
      await LogGameReviewPage({
        searchParams: Promise.resolve({ gameId: 'game-final' }),
      }),
    );

    expect(screen.getByTestId('log-game-wizard')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /saved games/i })).not.toBeInTheDocument();
  });
});
