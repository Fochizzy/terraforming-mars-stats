import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCreateImportDraftFormData } from '@/lib/imports/import-draft-form-data';

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

const EXPORTED_GAME_LOG = [
  'Friday Mars played Steel Works',
  'Friday Mars played Builder Hall',
].join('\n');

const CARD_SCORING_REFERENCES = [
  {
    cardName: 'Steel Works',
    cardNumber: '007',
    cardType: 'Project',
    expansionCode: 'base',
    fullImageUrl: 'https://example.com/steel-works.png',
    id: 'card-steel-works',
    imageUrl: 'https://example.com/steel-works.png',
    promoSetSlug: null,
    requiredExpansionCodes: ['base'],
    sourceCardId: 'project:base:007',
    sourceTags: ['Building'],
    thumbnailUrl: 'https://example.com/steel-works-thumb.png',
  },
  {
    cardName: 'Builder Hall',
    cardNumber: '008',
    cardType: 'Project',
    expansionCode: 'base',
    fullImageUrl: 'https://example.com/builder-hall.png',
    id: 'card-builder-hall',
    imageUrl: 'https://example.com/builder-hall.png',
    promoSetSlug: null,
    requiredExpansionCodes: ['base'],
    sourceCardId: 'project:base:008',
    sourceTags: ['Building'],
    thumbnailUrl: 'https://example.com/builder-hall-thumb.png',
  },
];

const CARD_OPTIONS = CARD_SCORING_REFERENCES.map((card) => ({
  cardName: card.cardName,
  cardNumber: card.cardNumber,
  expansionCode: card.expansionCode,
  id: card.id,
  promoSetSlug: card.promoSetSlug,
  requiredExpansionCodes: card.requiredExpansionCodes,
}));

const captureState = vi.hoisted(() => ({
  logGameImportShellProps: null as CapturedLogGameImportShellProps | null,
}));

const importTracker = vi.hoisted(() => ({
  readGameResultScreenshot: 0,
}));

const ocrMocks = vi.hoisted(() => ({
  readGameResultScreenshot: vi.fn(),
}));

const mockState = vi.hoisted(() => ({
  createPlayerIfMissing: vi.fn(),
  getCardScoringRuleCache: vi.fn(),
  getCurrentGroupContext: vi.fn(),
  getGroupSettings: vi.fn(),
  getUser: vi.fn(),
  listCardScoringReferences: vi.fn(),
  listCards: vi.fn(),
  listCorporations: vi.fn(),
  listImportResolutionPlayers: vi.fn(),
  listMapAwards: vi.fn(),
  listMapMilestones: vi.fn(),
  listMaps: vi.fn(),
  listPlayerImportAliasesForGroup: vi.fn(),
  listPreludes: vi.fn(),
  listStyles: vi.fn(),
  readOcrTextLinesFromUrl: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  resolveOrCreateImportGroup: vi.fn(),
  saveDraftGame: vi.fn(),
  saveGameLogEvents: vi.fn(),
  saveGameLogImport: vi.fn(),
  savePlayerImportAlias: vi.fn(),
  upsertCardScoringRuleCache: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockState.revalidatePath,
}));

vi.mock('next/navigation', () => ({
  redirect: mockState.redirect,
}));

vi.mock('@/components/layout/app-shell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

vi.mock('@/features/imports/log-game-import-shell', () => ({
  LogGameImportShell: (props: CapturedLogGameImportShellProps) => {
    captureState.logGameImportShellProps = props;

    return <div data-testid="log-game-import-shell" />;
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: mockState.getUser,
    },
  })),
}));

vi.mock('@/lib/db/import-group-repo', () => ({
  resolveOrCreateImportGroup: mockState.resolveOrCreateImportGroup,
}));

vi.mock('@/lib/db/game-draft-repo', () => ({
  saveDraftGame: mockState.saveDraftGame,
}));

vi.mock('@/lib/db/game-import-repo', () => ({
  saveGameLogEvents: mockState.saveGameLogEvents,
  saveGameLogImport: mockState.saveGameLogImport,
}));

vi.mock('@/lib/db/player-import-alias-repo', () => ({
  listPlayerImportAliasesForGroup: mockState.listPlayerImportAliasesForGroup,
  savePlayerImportAlias: mockState.savePlayerImportAlias,
}));

vi.mock('@/lib/db/group-context-repo', () => ({
  getCurrentGroupContext: mockState.getCurrentGroupContext,
}));

vi.mock('@/lib/db/group-settings-repo', () => ({
  getGroupSettings: mockState.getGroupSettings,
}));

vi.mock('@/lib/db/import-player-resolution-repo', () => ({
  listImportResolutionPlayers: mockState.listImportResolutionPlayers,
}));

vi.mock('@/lib/db/player-repo', () => ({
  createPlayerIfMissing: mockState.createPlayerIfMissing,
}));

vi.mock('@/lib/db/reference-repo', () => ({
  listCardScoringReferences: mockState.listCardScoringReferences,
  listCards: mockState.listCards,
  listCorporations: mockState.listCorporations,
  listMapAwards: mockState.listMapAwards,
  listMapMilestones: mockState.listMapMilestones,
  listMaps: mockState.listMaps,
  listPreludes: mockState.listPreludes,
  listStyles: mockState.listStyles,
}));

vi.mock('@/lib/db/card-scoring-rule-cache-repo', () => ({
  getCardScoringRuleCache: mockState.getCardScoringRuleCache,
  upsertCardScoringRuleCache: mockState.upsertCardScoringRuleCache,
}));

vi.mock('@/lib/imports/card-scoring/read-ocr-text-lines', () => ({
  readOcrTextLinesFromBuffer: vi.fn(),
  readOcrTextLinesFromFile: vi.fn(),
  readOcrTextLinesFromUrl: mockState.readOcrTextLinesFromUrl,
}));

vi.mock('@/lib/imports/read-game-result-screenshot', () => {
  importTracker.readGameResultScreenshot += 1;

  return {
    readGameResultScreenshot: ocrMocks.readGameResultScreenshot,
  };
});

async function renderPageAndCaptureShellProps() {
  const { default: LogGameImportPage } = await import('./page');

  render(await LogGameImportPage());

  expect(screen.getByTestId('log-game-import-shell')).toBeInTheDocument();
  expect(captureState.logGameImportShellProps).not.toBeNull();

  return captureState.logGameImportShellProps!;
}

describe('LogGameImportPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    captureState.logGameImportShellProps = null;
    importTracker.readGameResultScreenshot = 0;

    mockState.getUser.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
      },
      error: null,
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
    mockState.listCardScoringReferences.mockResolvedValue(
      CARD_SCORING_REFERENCES,
    );
    mockState.listCards.mockResolvedValue(CARD_OPTIONS);
    mockState.listCorporations.mockResolvedValue([]);
    mockState.listMapAwards.mockResolvedValue([]);
    mockState.listMapMilestones.mockResolvedValue([]);
    mockState.listPreludes.mockResolvedValue([]);
    mockState.listStyles.mockResolvedValue([]);
    mockState.listImportResolutionPlayers.mockResolvedValue([
      {
        displayName: 'Friday Mars',
        gamesPlayed: 11,
        id: 'player-1',
        linkedFullName: 'Friday Mars',
        linkedUsername: 'friday-mars',
      },
    ]);
    mockState.listPlayerImportAliasesForGroup.mockResolvedValue([]);
    mockState.saveDraftGame.mockResolvedValue({ gameId: 'game-1' });
    mockState.saveGameLogImport.mockResolvedValue({ id: 'import-1' });
    mockState.saveGameLogEvents.mockResolvedValue([]);
    mockState.savePlayerImportAlias.mockResolvedValue(undefined);
    mockState.getCardScoringRuleCache.mockResolvedValue(null);
    mockState.upsertCardScoringRuleCache.mockResolvedValue(undefined);
    mockState.readOcrTextLinesFromUrl.mockImplementation(async (url: string) => {
      if (url.includes('builder-hall')) {
        return ['1 VP for every 2 building tags you have.'];
      }

      return ['Action: gain 2 steel.'];
    });
    ocrMocks.readGameResultScreenshot.mockReset();
    ocrMocks.readGameResultScreenshot.mockResolvedValue({
      endgameLines: [],
      scoreDetailsColumns: [],
    });
  });

  it('does not eagerly load screenshot OCR modules when the page module is imported', async () => {
    await import('./page');

    expect(importTracker.readGameResultScreenshot).toBe(0);
  });

  it('analyzes import evidence through the real page action and parses score details from the combined result screenshot', async () => {
    const shellProps = await renderPageAndCaptureShellProps();
    const gameResultScreenshot = new File(['screenshot'], 'game-result.png', {
      type: 'image/png',
    });
    ocrMocks.readGameResultScreenshot.mockResolvedValue({
      endgameLines: [
        'Victory points breakdown after 12 generations',
        'Friday Mars 18 5 2 0 0 1 26 8',
      ],
      scoreDetailsColumns: [
        {
          textLines: ['Friday Mars', 'Builder Hall 1'],
        },
      ],
    });
    const analyzeFormData = buildCreateImportDraftFormData({
      confirmedPlayerLinks: [],
      endgameScreenshot: gameResultScreenshot,
      exportedGameLog: EXPORTED_GAME_LOG,
      generationCount: 10,
      mapId: 'tharsis',
      participants: 'Friday Mars',
      playedOn: '2026-07-07',
      playerCount: 1,
    });

    const result = await shellProps.onAnalyzeImportEvidence(analyzeFormData);

    expect(result).toMatchObject({
      status: 'success',
    });
    expect(result).toMatchObject({
      review: {
        cardScoring: [
          {
            autoScoredCards: [
              expect.objectContaining({
                cardName: 'Builder Hall',
                points: 1,
                sourceType: 'ocr',
              }),
            ],
            pendingCards: [],
            playerName: 'Friday Mars',
            totals: expect.objectContaining({
              complete: true,
              other: 1,
              total: 1,
            }),
          },
        ],
        playerLinks: [
          expect.objectContaining({
            importedName: 'Friday Mars',
            requiresConfirmation: false,
            selectedPlayerId: 'player-1',
            status: 'exact',
          }),
        ],
      },
    });
  });

  it('keeps import analysis usable when card-scoring OCR crashes unexpectedly', async () => {
    vi.doMock('@/lib/imports/card-scoring/calculate-import-card-scores', () => ({
      calculateImportCardScores: vi.fn(async () => {
        throw new TypeError(
          "Cannot read properties of undefined (reading 'endsWith')",
        );
      }),
    }));

    const shellProps = await renderPageAndCaptureShellProps();
    const analyzeFormData = buildCreateImportDraftFormData({
      boardScreenshots: [
        new File(['board'], 'board.png', { type: 'image/png' }),
      ],
      confirmedPlayerLinks: [],
      endgameScreenshot: null,
      exportedGameLog: EXPORTED_GAME_LOG,
      generationCount: 10,
      mapId: 'tharsis',
      participants: 'Friday Mars',
      playedOn: '2026-07-07',
      playerCount: 1,
    });

    const result = await shellProps.onAnalyzeImportEvidence(analyzeFormData);

    expect(result).toMatchObject({
      status: 'success',
    });
    expect(result).toMatchObject({
      review: {
        cardScoring: [],
        playerLinks: [
          expect.objectContaining({
            importedName: 'Friday Mars',
            requiresConfirmation: false,
            selectedPlayerId: 'player-1',
            status: 'exact',
          }),
        ],
      },
    });
  });

  it('surfaces log score rows in the success message when screenshot parsing finds none', async () => {
    const shellProps = await renderPageAndCaptureShellProps();
    const analyzeFormData = buildCreateImportDraftFormData({
      boardScreenshots: [
        new File(['board'], 'board.png', { type: 'image/png' }),
      ],
      confirmedPlayerLinks: [],
      endgameScreenshot: null,
      exportedGameLog:
        `${EXPORTED_GAME_LOG}\n` +
        'Friday Mars: TR 18, Milestones 5, Awards 2, Total 61',
      generationCount: 10,
      mapId: 'tharsis',
      participants: 'Friday Mars',
      playedOn: '2026-07-07',
      playerCount: 1,
    });

    const result = await shellProps.onAnalyzeImportEvidence(analyzeFormData);

    expect(result).toMatchObject({
      message:
        "Parsed 2 log events, 1 log score row, and 0 screenshot score rows. We'll use the log score breakdown where available.",
      status: 'success',
    });
  });

  it('uses the selected map option id as a manual map fallback when OCR cannot infer the board map', async () => {
    mockState.getGroupSettings.mockResolvedValue({
      defaultExpansionCodes: ['base'],
      defaultMapId: 'map-tharsis',
      defaultPromoSetSlugs: [],
    });
    mockState.listMaps.mockResolvedValue([
      { code: 'tharsis', id: 'map-tharsis', name: 'Tharsis' },
    ]);

    const shellProps = await renderPageAndCaptureShellProps();
    const analyzeFormData = buildCreateImportDraftFormData({
      boardScreenshots: [
        new File(['board'], 'board.png', { type: 'image/png' }),
      ],
      confirmedPlayerLinks: [],
      endgameScreenshot: null,
      exportedGameLog: EXPORTED_GAME_LOG,
      generationCount: 10,
      mapId: 'map-tharsis',
      participants: 'Friday Mars',
      playedOn: '2026-07-07',
      playerCount: 1,
    });

    const result = await shellProps.onAnalyzeImportEvidence(analyzeFormData);

    expect(result).toMatchObject({
      status: 'success',
    });
  });

  it('saves the selected map option id in the draft even when board parsing uses the map code', async () => {
    mockState.getGroupSettings.mockResolvedValue({
      defaultExpansionCodes: ['base'],
      defaultMapId: 'map-tharsis',
      defaultPromoSetSlugs: [],
    });
    mockState.listMaps.mockResolvedValue([
      { code: 'tharsis', id: 'map-tharsis', name: 'Tharsis' },
    ]);

    const shellProps = await renderPageAndCaptureShellProps();
    const createDraftFormData = buildCreateImportDraftFormData({
      boardScreenshots: [
        new File(['board'], 'board.png', { type: 'image/png' }),
      ],
      confirmedPlayerLinks: [
        {
          importedName: 'Friday Mars',
          playerId: 'player-1',
        },
      ],
      endgameScreenshot: null,
      exportedGameLog: EXPORTED_GAME_LOG,
      generationCount: 10,
      mapId: 'map-tharsis',
      participants: 'Friday Mars',
      playedOn: '2026-07-07',
      playerCount: 1,
    });

    const result = await shellProps.onCreateImportDraft(createDraftFormData);

    expect(result).toMatchObject({
      gameId: 'game-1',
      status: 'success',
    });
    expect(mockState.saveDraftGame).toHaveBeenCalledWith(
      expect.objectContaining({
        form: expect.objectContaining({
          mapId: 'map-tharsis',
        }),
      }),
    );
  });

  it('creates an import draft through the real page action and persists the parsed output', async () => {
    const shellProps = await renderPageAndCaptureShellProps();
    const gameResultScreenshot = new File(['screenshot'], 'game-result.png', {
      type: 'image/png',
    });
    ocrMocks.readGameResultScreenshot.mockResolvedValue({
      endgameLines: [
        'Victory points breakdown after 12 generations',
        'Friday Mars 18 5 2 0 0 1 26 8',
      ],
      scoreDetailsColumns: [
        {
          textLines: ['Friday Mars', 'Builder Hall 1'],
        },
      ],
    });
    const createDraftFormData = buildCreateImportDraftFormData({
      confirmedPlayerLinks: [
        {
          importedName: 'Friday Mars',
          playerId: 'player-1',
        },
      ],
      endgameScreenshot: gameResultScreenshot,
      exportedGameLog: EXPORTED_GAME_LOG,
      generationCount: 10,
      mapId: 'tharsis',
      participants: 'Friday Mars',
      playedOn: '2026-07-07',
      playerCount: 1,
    });

    const result = await shellProps.onCreateImportDraft(createDraftFormData);

    expect(result).toMatchObject({
      gameId: 'game-1',
      status: 'success',
    });
    expect(mockState.saveDraftGame).toHaveBeenCalledWith(
      expect.objectContaining({
        form: expect.objectContaining({
          playerScores: expect.objectContaining({
            'player-1': expect.objectContaining({
              cardPointsTotal: 1,
            }),
          }),
          selectedPlayerIds: ['player-1'],
        }),
        userId: 'user-1',
      }),
    );
    expect(mockState.saveGameLogImport).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: 'game-1',
        logParseSummary: {
          contextLineCount: 0,
          drawInfoLineCount: 0,
          ignoredLineCount: 0,
          parsedEventCount: 2,
        },
        rawLogText: EXPORTED_GAME_LOG,
        screenshots: [expect.objectContaining({ kind: 'endgame_score' })],
        userId: 'user-1',
      }),
    );
    expect(mockState.saveGameLogEvents).toHaveBeenCalledTimes(1);

    const saveGameLogEventsInput = mockState.saveGameLogEvents.mock.calls[0]?.[0];

    expect(saveGameLogEventsInput).toMatchObject({
      gameLogImportId: 'import-1',
    });
    expect(saveGameLogEventsInput?.events).toHaveLength(2);
    expect(saveGameLogEventsInput?.events).toEqual([
      expect.objectContaining({
        cardId: 'card-steel-works',
        eventOrder: 1,
        eventType: 'card_played',
        payload: {
          actor: 'Friday Mars',
          cardName: 'Steel Works',
        },
        rawLine: 'Friday Mars played Steel Works',
      }),
      expect.objectContaining({
        cardId: 'card-builder-hall',
        eventOrder: 2,
        eventType: 'card_played',
        payload: {
          actor: 'Friday Mars',
          cardName: 'Builder Hall',
        },
        rawLine: 'Friday Mars played Builder Hall',
      }),
    ]);
  });

  it('uses the selected map and infers generation count from the uploaded game result screenshot before saving the draft', async () => {
    const shellProps = await renderPageAndCaptureShellProps();
    ocrMocks.readGameResultScreenshot.mockResolvedValue({
      endgameLines: [
        'Victory points breakdown after 11 generations',
        'Friday Mars 18 5 10 7 22 62 8',
      ],
      scoreDetailsColumns: [],
    });
    const createDraftFormData = new FormData();
    const endgameScreenshot = new File(['endgame'], 'vp-breakdown.png', {
      type: 'image/png',
    });

    createDraftFormData.set('playedOn', '2026-07-07');
    createDraftFormData.set('playerCount', '1');
    createDraftFormData.set('mapId', 'tharsis');
    createDraftFormData.set('participants', 'Friday Mars');
    createDraftFormData.set('exportedGameLog', EXPORTED_GAME_LOG);
    createDraftFormData.set('endgameScreenshot', endgameScreenshot);
    createDraftFormData.set(
      'confirmedPlayerLinks',
      JSON.stringify([{ importedName: 'Friday Mars', playerId: 'player-1' }]),
    );

    const result = await shellProps.onCreateImportDraft(createDraftFormData);

    expect(result).toMatchObject({
      gameId: 'game-1',
      status: 'success',
    });
    expect(mockState.saveDraftGame).toHaveBeenCalledWith(
      expect.objectContaining({
        form: expect.objectContaining({
          generationCount: 11,
          mapId: 'tharsis',
        }),
      }),
    );
  });
});
