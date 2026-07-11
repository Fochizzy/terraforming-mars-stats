import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LogGameReviewPage from './page';

const mockState = vi.hoisted(() => ({
  capturedWizardProps: [] as Array<Record<string, unknown>>,
  getGroupSettings: vi.fn(),
  getLatestCatalogSnapshotId: vi.fn(),
  getLatestGameLogImportSummary: vi.fn(),
  getSavedGameForm: vi.fn(),
  deleteSavedGame: vi.fn(),
  listCards: vi.fn(),
  listCorporations: vi.fn(),
  listExpansions: vi.fn(),
  listCurrentUserGroups: vi.fn(),
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
  LogGameWizard: (props: Record<string, unknown>) => {
    mockState.capturedWizardProps.push(props);
    return <div data-testid="log-game-wizard" />;
  },
}));

vi.mock('@/features/imports/import-evidence-summary', () => ({
  ImportEvidenceSummary: () => <div data-testid="import-evidence-summary" />,
}));

vi.mock('@/features/groups/require-group-context', () => ({
  requireGroupContextOrRedirect: mockState.requireGroupContextOrRedirect,
}));

vi.mock('@/lib/db/game-draft-repo', () => ({
  deleteSavedGame: mockState.deleteSavedGame,
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
  listCurrentUserGroups: mockState.listCurrentUserGroups,
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
    mockState.capturedWizardProps.length = 0;

    mockState.requireGroupContextOrRedirect.mockResolvedValue({
      groupId: 'group-1',
      groupName: 'Mars Club',
      role: 'owner',
      userId: 'user-1',
    });
    mockState.listCurrentUserGroups.mockResolvedValue([
      {
        groupId: 'group-1',
        groupName: 'Mars Club',
        role: 'owner',
      },
      {
        groupId: 'group-2',
        groupName: 'Second Table',
        role: 'editor',
      },
    ]);
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
        groupId: 'group-1',
        playedOn: '2026-07-07',
        playerCount: 2,
        playerNames: ['Friday Mars', 'Izzy Hodnett'],
        status: 'draft',
        updatedAt: '2026-07-08T09:00:00.000Z',
      },
      {
        gameId: 'game-final',
        groupId: 'group-2',
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
    expect(mockState.listSavedGames).toHaveBeenCalledWith({
      groupIds: ['group-1', 'group-2'],
      limit: 12,
    });
    expect(screen.getByRole('combobox', { name: /saved games group/i })).toHaveValue(
      'all',
    );
    expect(screen.queryByText('Group Switcher')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /resume draft/i })).toHaveAttribute(
      'href',
      '/log-game/review?gameId=game-draft&groupId=group-1',
    );
    expect(screen.getByRole('link', { name: /correct players/i })).toHaveAttribute(
      'href',
      '/log-game/review?gameId=game-final&groupId=group-2',
    );
    expect(screen.getByRole('button', { name: /delete game/i })).toBeInTheDocument();
    expect(screen.queryByTestId('log-game-wizard')).not.toBeInTheDocument();
  });

  it('filters saved games when a group is selected', async () => {
    render(
      await LogGameReviewPage({
        searchParams: Promise.resolve({ groupId: 'group-2' }),
      }),
    );

    expect(mockState.listSavedGames).toHaveBeenCalledWith({
      groupIds: ['group-2'],
      limit: 12,
    });
    expect(screen.getByRole('combobox', { name: /saved games group/i })).toHaveValue(
      'group-2',
    );
  });

  it('renders the log game wizard when review opens with a game id', async () => {
    mockState.getSavedGameForm.mockResolvedValue({
      form: {
        awardClaims: {},
        expansionCodes: ['base'],
        gameId: 'game-final',
        generationCount: 11,
        groupId: 'group-2',
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
        searchParams: Promise.resolve({
          gameId: 'game-final',
          groupId: 'group-2',
        }),
      }),
    );

    expect(screen.getByTestId('log-game-wizard')).toBeInTheDocument();
    expect(screen.queryByText('Group Switcher')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /saved games/i })).not.toBeInTheDocument();
    expect(mockState.getGroupSettings).toHaveBeenCalledWith('group-2');
    expect(mockState.listImportResolutionPlayers).toHaveBeenCalledWith('group-2');
  });

  it('seeds the wizard with the requested game id even when the saved snapshot lacks one', async () => {
    mockState.getSavedGameForm.mockResolvedValue({
      form: {
        awardClaims: {},
        expansionCodes: ['base'],
        gameId: undefined,
        generationCount: 11,
        groupId: 'group-1',
        mapId: 'tharsis',
        milestoneClaims: {},
        notes: '',
        playedOn: '2026-07-07',
        playerCount: 2,
        playerScores: {},
        playerSelections: {},
        playerStyles: {},
        promoSetSlugs: [],
        selectedPlayerIds: ['player-1'],
      },
      status: 'draft',
    });

    render(
      await LogGameReviewPage({
        searchParams: Promise.resolve({ gameId: 'game-draft' }),
      }),
    );

    const wizardProps = mockState.capturedWizardProps.at(-1) as {
      initialValues: { gameId?: string };
    };

    expect(wizardProps.initialValues.gameId).toBe('game-draft');
  });
});
