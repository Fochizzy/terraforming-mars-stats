import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LogGamePage from './page';

type CapturedLogGameImportShellProps = {
  initialValues: {
    generationCount: number;
    mapId: string;
    playedOn: string;
    playerCount: number;
  };
  mapOptions: Array<{ code: string; id: string; name: string }>;
  onAnalyzeImportEvidence: (formData: FormData) => Promise<unknown>;
  onCreateImportDraft: (formData: FormData) => Promise<unknown>;
  onCreateImportPlayer: (importedName: string) => Promise<unknown>;
};

const captureState = vi.hoisted(() => ({
  logGameImportShellProps: null as CapturedLogGameImportShellProps | null,
}));

const mockState = vi.hoisted(() => ({
  getCurrentGroupContext: vi.fn(),
  getDraftGameForm: vi.fn(),
  getGroupSettings: vi.fn(),
  getLatestCatalogSnapshotId: vi.fn(),
  getLatestGameLogImportSummary: vi.fn(),
  getUser: vi.fn(),
  listCards: vi.fn(),
  listCorporations: vi.fn(),
  listExpansions: vi.fn(),
  listMapAwards: vi.fn(),
  listMapMilestones: vi.fn(),
  listMaps: vi.fn(),
  listPlayers: vi.fn(),
  listPreludes: vi.fn(),
  listPromoSets: vi.fn(),
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

vi.mock('@/features/imports/log-game-import-shell', () => ({
  LogGameImportShell: (props: CapturedLogGameImportShellProps) => {
    captureState.logGameImportShellProps = props;

    return <div data-testid="log-game-import-shell" />;
  },
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

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: mockState.getUser,
    },
  })),
}));

vi.mock('@/lib/db/group-context-repo', () => ({
  getCurrentGroupContext: mockState.getCurrentGroupContext,
  requireCurrentGroupContext: vi.fn(),
}));

vi.mock('@/lib/db/group-settings-repo', () => ({
  getGroupSettings: mockState.getGroupSettings,
}));

vi.mock('@/lib/db/game-draft-repo', () => ({
  getDraftGameForm: mockState.getDraftGameForm,
}));

vi.mock('@/lib/db/game-import-repo', () => ({
  getLatestGameLogImportSummary: mockState.getLatestGameLogImportSummary,
}));

vi.mock('@/lib/db/player-repo', () => ({
  listPlayers: mockState.listPlayers,
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

describe('LogGamePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captureState.logGameImportShellProps = null;

    mockState.getUser.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
      },
      error: null,
    });
    mockState.requireGroupContextOrRedirect.mockResolvedValue({
      groupId: 'group-1',
      groupName: 'Mars Club',
      role: 'owner',
      userId: 'user-1',
    });
    mockState.getCurrentGroupContext.mockResolvedValue({
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
    mockState.listPlayers.mockResolvedValue([
      { display_name: 'Friday Mars', id: 'player-1' },
    ]);
    mockState.listExpansions.mockResolvedValue([]);
    mockState.listPromoSets.mockResolvedValue([]);
    mockState.listCorporations.mockResolvedValue([]);
    mockState.listPreludes.mockResolvedValue([]);
    mockState.listMapMilestones.mockResolvedValue([]);
    mockState.listMapAwards.mockResolvedValue([]);
    mockState.listStyles.mockResolvedValue([]);
    mockState.listCards.mockResolvedValue([]);
    mockState.getLatestCatalogSnapshotId.mockResolvedValue('catalog-1');
    mockState.getDraftGameForm.mockResolvedValue(null);
    mockState.getLatestGameLogImportSummary.mockResolvedValue(null);
  });

  it('renders the web import experience as the default log-game entry page', async () => {
    render(await LogGamePage());

    expect(
      screen.getByRole('heading', { name: /web import/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /review saved games/i }),
    ).toHaveAttribute('href', '/log-game/review');
    expect(screen.getByTestId('log-game-import-shell')).toBeInTheDocument();
    expect(screen.queryByTestId('log-game-wizard')).not.toBeInTheDocument();
    expect(captureState.logGameImportShellProps).not.toBeNull();
  });
});
