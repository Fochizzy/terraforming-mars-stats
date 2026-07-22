// End-to-end test of the production import server action (Workstream 5):
// from a submitted exported log through the real parsers to the exact
// canonical persistence payloads. Repositories are mocked at the database
// boundary; everything between the action's input and those calls is real.

import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportGameReferenceCatalog } from '@/lib/db/reference-repo';
import type { CreateImportDraftInput } from '@/lib/imports/build-import-draft';
import { buildImportSourceEvidence } from '@/lib/imports/build-import-source-evidence';
import LogGameImportPage from './page';

const PLAYER_ID = '11111111-1111-4111-8111-111111111111';
const GROUP_ID = '22222222-2222-4222-8222-222222222222';
const GAME_ID = '33333333-3333-4333-8333-333333333333';
const IMPORT_ID = '44444444-4444-4444-8444-444444444444';

const mocks = vi.hoisted(() => ({
  attachImportIdentityStaging: vi.fn(),
  correctAndSaveOcrText: vi.fn(),
  discardImportIdentityStaging: vi.fn(),
  stageImportPlayerIdentityEvidence: vi.fn(),
  findDuplicateGameLogImportSources: vi.fn(),
  getCurrentGroupContext: vi.fn(),
  getGroupSettings: vi.fn(),
  listImportGameReferenceCatalog: vi.fn(),
  listImportPlayerIdentityCandidates: vi.fn(),
  markGameLogImportRunComplete: vi.fn(),
  requireCurrentGroupContext: vi.fn(),
  resolveImportPlayerIdentities: vi.fn(),
  revalidatePath: vi.fn(),
  saveDraftGame: vi.fn(),
  saveGameExpansionFacts: vi.fn(),
  saveGameLogImport: vi.fn(),
  saveParsedGameLogEvents: vi.fn(),
  shellProps: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/lib/db/group-context-repo', () => ({
  getCurrentGroupContext: mocks.getCurrentGroupContext,
  requireCurrentGroupContext: mocks.requireCurrentGroupContext,
}));
vi.mock('@/lib/db/group-settings-repo', () => ({
  getGroupSettings: mocks.getGroupSettings,
}));
vi.mock('@/lib/db/reference-repo', () => ({
  listImportGameReferenceCatalog: mocks.listImportGameReferenceCatalog,
}));
vi.mock('@/lib/db/import-player-identity-repo', () => ({
  attachImportIdentityStaging: mocks.attachImportIdentityStaging,
  discardImportIdentityStaging: mocks.discardImportIdentityStaging,
  listImportPlayerIdentityCandidates: mocks.listImportPlayerIdentityCandidates,
  resolveImportPlayerIdentities: mocks.resolveImportPlayerIdentities,
  stageImportPlayerIdentityEvidence: mocks.stageImportPlayerIdentityEvidence,
}));
vi.mock('@/lib/db/game-draft-repo', () => ({
  saveDraftGame: mocks.saveDraftGame,
}));
vi.mock('@/lib/db/game-import-repo', () => ({
  findDuplicateGameLogImportSources: mocks.findDuplicateGameLogImportSources,
  markGameLogImportRunComplete: mocks.markGameLogImportRunComplete,
  saveGameExpansionFacts: mocks.saveGameExpansionFacts,
  saveGameLogImport: mocks.saveGameLogImport,
  saveParsedGameLogEvents: mocks.saveParsedGameLogEvents,
}));
vi.mock('@/lib/db/ocr-correction-repo', () => ({
  correctAndSaveOcrText: mocks.correctAndSaveOcrText,
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/components/layout/app-shell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));
vi.mock('@/features/groups/group-switcher', () => ({
  GroupSwitcher: () => null,
}));
vi.mock('@/features/imports/log-game-import-shell', () => ({
  LogGameImportShell: (props: Record<string, unknown>) => {
    mocks.shellProps.push(props);
    return null;
  },
}));

const AWARD_NAMES = ['Landlord', 'Scientist', 'Banker', 'Thermalist', 'Miner'];
const MILESTONE_NAMES = [
  'Terraformer',
  'Mayor',
  'Gardener',
  'Builder',
  'Planner',
];

const referenceCatalog: ImportGameReferenceCatalog = {
  aliases: [],
  allAwards: AWARD_NAMES.map((name) => ({ id: `award-${name}`, name })),
  allMilestones: MILESTONE_NAMES.map((name) => ({
    id: `milestone-${name}`,
    name,
  })),
  awards: AWARD_NAMES.map((name) => ({
    awardId: `award-${name}`,
    awardName: name,
    mapId: 'map-tharsis',
  })),
  cards: [],
  corporations: [],
  entityAliases: [],
  maps: [{ code: 'tharsis', id: 'map-tharsis', name: 'Tharsis' }],
  milestones: MILESTONE_NAMES.map((name) => ({
    mapId: 'map-tharsis',
    milestoneId: `milestone-${name}`,
    milestoneName: name,
  })),
  preludes: [],
};

// A minimal, format-faithful exported-log fragment: player identity, two
// generations, one milestone claim, one flat tile placement, one unknown tile
// label, and a colony trade with an unknown colony (needs-review paths), with
// no Venus/Colonies option evidence and no complete-game terminators.
const exportedGameLog = [
  'Good luck FridayMars!',
  'Generation 1',
  'FridayMars placed Ocean tile at 07',
  'FridayMars placed Unreleased Future Tile tile at 12',
  'Generation 2',
  'FridayMars claimed Mayor milestone',
].join('\n');

const scoreRow = {
  awardPoints: 0,
  cardPointsTotal: 10,
  citiesPoints: 2,
  finalMegacredits: 21,
  greeneryPoints: 3,
  milestonePoints: 5,
  normalizedPlayerName: 'fridaymars',
  originalPlayerName: 'FridayMars',
  sourceWords: [],
  status: 'exact_base_layout' as const,
  totalPoints: 60,
  trPoints: 40,
  unsupportedComponentCount: 0,
};

async function invokeAction(values: CreateImportDraftInput) {
  mocks.shellProps.length = 0;
  render(await LogGameImportPage());
  const props = mocks.shellProps.at(-1);
  if (!props) {
    throw new Error('LogGameImportShell was not rendered');
  }
  const onCreateImportDraft = props.onCreateImportDraft as (
    input: CreateImportDraftInput,
  ) => Promise<unknown>;
  return onCreateImportDraft(values);
}

describe('import server action canonical persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentGroupContext.mockResolvedValue({
      groupId: GROUP_ID,
      groupName: 'Friday Group',
      userId: 'user-1',
    });
    mocks.requireCurrentGroupContext.mockResolvedValue({
      groupId: GROUP_ID,
      groupName: 'Friday Group',
      userId: 'user-1',
    });
    mocks.getGroupSettings.mockResolvedValue({
      defaultGuaranteedMergerOffer: true,
      defaultMapId: null,
      defaultPromoSetSlugs: [],
      globalAnalyticsEnabled: false,
      groupId: GROUP_ID,
      groupName: 'Friday Group',
    });
    mocks.listImportGameReferenceCatalog.mockResolvedValue(referenceCatalog);
    mocks.listImportPlayerIdentityCandidates.mockResolvedValue([]);
    mocks.stageImportPlayerIdentityEvidence.mockResolvedValue('staging-1');
    mocks.attachImportIdentityStaging.mockResolvedValue(true);
    mocks.resolveImportPlayerIdentities.mockResolvedValue([
      {
        decision: 'linked',
        identityMode: 'existing_player',
        parserIdentity: 'terraforming-mars-exported-log-v1',
        selectedPlayerId: PLAYER_ID,
        sourceFormat: 'terraforming_mars_exported_log',
        sourcePlayerText: 'FridayMars',
        state: 'linked_registered_player',
        valueSource: 'imported',
      },
    ]);
    mocks.findDuplicateGameLogImportSources.mockResolvedValue({
      deployedRpcDetected: false,
      matches: [],
    });
    mocks.markGameLogImportRunComplete.mockResolvedValue(undefined);
    mocks.saveDraftGame.mockResolvedValue({ gameId: GAME_ID });
    mocks.saveGameLogImport.mockResolvedValue({
      id: IMPORT_ID,
      screenshotObjectPath: null,
    });
    mocks.saveParsedGameLogEvents.mockResolvedValue([]);
    mocks.saveGameExpansionFacts.mockResolvedValue(undefined);
  });

  it('persists source identity, split review contract, map evidence, and expansion state', async () => {
    const result = await invokeAction({
      endgameScreenshot: null,
      exportedGameLog,
      generationCount: 2,
      mapId: 'map-tharsis',
      objectiveConfiguration: 'board_defined',
      playedOn: '2026-07-19',
      playerCount: 1,
      playerIdentities: [
        {
          mode: 'existing_player',
          selectedPlayerId: PLAYER_ID,
          sourcePlayerText: 'FridayMars',
          valueSource: 'imported',
        },
      ],
      scoreRows: [scoreRow],
    });

    expect(result).toMatchObject({ gameId: GAME_ID, status: 'success' });
    expect(mocks.stageImportPlayerIdentityEvidence).toHaveBeenCalledWith({
      groupId: GROUP_ID,
      parserIdentity: 'terraforming-mars-exported-log-v1',
      requestingUserId: 'user-1',
      sourceFormat: 'terraforming_mars_exported_log',
      sourcePlayerTexts: ['FridayMars'],
    });
    expect(mocks.resolveImportPlayerIdentities).toHaveBeenCalledWith(
      expect.objectContaining({
        authoritativeSourcePlayerTexts: ['FridayMars'],
        requestingUserId: 'user-1',
        stagingId: 'staging-1',
      }),
    );
    expect(mocks.attachImportIdentityStaging).toHaveBeenCalledWith({
      gameId: GAME_ID,
      gameLogImportId: IMPORT_ID,
      requestingUserId: 'user-1',
      stagingId: 'staging-1',
    });
    expect(
      mocks.stageImportPlayerIdentityEvidence.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.resolveImportPlayerIdentities.mock.invocationCallOrder[0]);
    expect(mocks.resolveImportPlayerIdentities.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.attachImportIdentityStaging.mock.invocationCallOrder[0],
    );

    // --- Source identity and parser-run identity (Workstream 5) ---
    const importPayload = mocks.saveGameLogImport.mock.calls[0][0];
    const summary = importPayload.parseMetadata.confidenceSummary;
    const expectedEvidence = await buildImportSourceEvidence({
      exportedLogText: exportedGameLog,
      parserVersion: importPayload.parseMetadata.parserVersion,
    });
    expect(summary.source).toEqual({
      duplicate_source_acknowledged: null,
      hash_scope: 'original_source_bytes',
      original_byte_length: expectedEvidence.originalByteLength,
      original_sha256: expectedEvidence.originalSha256,
      parser_run_identity: expectedEvidence.parserRunIdentity,
      parser_version: importPayload.parseMetadata.parserVersion,
      source_has_outer_whitespace: false,
      stored_text_matches_original: true,
    });
    expect(summary.source.original_sha256).toMatch(/^[0-9a-f]{64}$/);

    // --- Map evidence persists with the confirmed configuration ---
    expect(summary.map).toMatchObject({
      objective_configuration: 'board_defined',
      selected_map_id: 'map-tharsis',
    });
    expect(Array.isArray(summary.map.tile_actions)).toBe(true);
    expect(summary.map.tile_actions).toHaveLength(2);

    // --- Player resolutions are persisted verbatim ---
    expect(importPayload.playerResolutions).toHaveLength(1);
    expect(importPayload.playerResolutions[0]).toMatchObject({
      selectedPlayerId: PLAYER_ID,
      sourcePlayerText: 'FridayMars',
    });

    // --- Canonical events carry the split confidence/review contract ---
    const events = mocks.saveParsedGameLogEvents.mock.calls[0][0].events;
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(['high', 'medium', 'low']).toContain(event.confidence_level);
      expect([
        'not_required',
        'needs_review',
        'reviewed',
        'rejected',
      ]).toContain(event.review_state);
    }
    const unknownTile = events.find(
      (event: { payload: { is_known_tile_type?: boolean } }) =>
        event.payload?.is_known_tile_type === false,
    );
    expect(unknownTile).toMatchObject({
      confidence_level: 'low',
      review_state: 'needs_review',
    });
    const knownOcean = events.find(
      (event: { tile_type?: string | null }) => event.tile_type === 'ocean',
    );
    expect(knownOcean).toMatchObject({
      confidence_level: 'high',
      event_type: 'tile_placed',
      player_id: PLAYER_ID,
      review_state: 'not_required',
    });

    // --- Expansion facts: an incomplete log never becomes confirmed absence,
    // and a missing final Venus scale stays null rather than zero ---
    const expansion = mocks.saveGameExpansionFacts.mock.calls[0][0];
    expect(expansion).toMatchObject({ gameId: GAME_ID, gameLogImportId: IMPORT_ID });
    expect(expansion.facts.venusNextState).toBe('incomplete_evidence');
    expect(expansion.facts.coloniesState).toBe('incomplete_evidence');
    expect(expansion.facts.finalVenusScale).toBeNull();
    expect(summary.expansions).toMatchObject({
      final_venus_scale: null,
      venus_next_state: 'incomplete_evidence',
    });

    // --- No private normalization output in any persistence payload ---
    // The retired `normalizedImportedValue` matching key is private
    // personal-name data; every payload the action hands to a persistence
    // boundary (draft snapshot, import row + confidence summary, events,
    // expansion facts) must be free of it in both naming conventions.
    const persistedPayloads = JSON.stringify([
      mocks.saveDraftGame.mock.calls,
      mocks.saveGameLogImport.mock.calls,
      mocks.saveParsedGameLogEvents.mock.calls,
      mocks.saveGameExpansionFacts.mock.calls,
    ]);
    expect(persistedPayloads).not.toContain('normalizedImportedValue');
    expect(persistedPayloads).not.toContain('normalized_imported_value');
  });

  it('rejects saving when the objective setup is still unconfirmed', async () => {
    await expect(
      invokeAction({
        endgameScreenshot: null,
        exportedGameLog,
        generationCount: 2,
        mapId: 'map-tharsis',
        objectiveConfiguration: 'unknown',
        playedOn: '2026-07-19',
        playerCount: 1,
        playerIdentities: [
          {
            mode: 'existing_player',
            selectedPlayerId: PLAYER_ID,
            sourcePlayerText: 'FridayMars',
            valueSource: 'imported',
          },
        ],
        scoreRows: [scoreRow],
      }),
    ).rejects.toThrow(/confirm the objective setup/i);
    expect(mocks.saveDraftGame).not.toHaveBeenCalled();
    expect(mocks.saveGameLogImport).not.toHaveBeenCalled();
  });

  const baseValues = () => ({
    endgameScreenshot: null,
    exportedGameLog,
    generationCount: 2,
    mapId: 'map-tharsis',
    objectiveConfiguration: 'board_defined' as const,
    playedOn: '2026-07-19',
    playerCount: 1,
    playerIdentities: [
      {
        mode: 'existing_player' as const,
        selectedPlayerId: PLAYER_ID,
        sourcePlayerText: 'FridayMars',
        valueSource: 'imported' as const,
      },
    ],
    scoreRows: [scoreRow],
  });

  it('hashes and stores the exact original bytes when the submission carries outer whitespace', async () => {
    const paddedLog = `\n  ${exportedGameLog}\n\n`;
    const result = await invokeAction({
      ...baseValues(),
      exportedGameLog: paddedLog,
    });
    expect(result).toMatchObject({ status: 'success' });

    const importPayload = mocks.saveGameLogImport.mock.calls[0][0];
    // The stored text is byte-identical to the submission — no trim anywhere.
    expect(importPayload.rawLogText).toBe(paddedLog);

    const originalEvidence = await buildImportSourceEvidence({
      exportedLogText: paddedLog,
      parserVersion: importPayload.parseMetadata.parserVersion,
    });
    const trimmedEvidence = await buildImportSourceEvidence({
      exportedLogText: paddedLog.trim(),
      parserVersion: importPayload.parseMetadata.parserVersion,
    });
    const summary = importPayload.parseMetadata.confidenceSummary;
    expect(summary.source.original_sha256).toBe(
      originalEvidence.originalSha256,
    );
    expect(summary.source.original_sha256).not.toBe(
      trimmedEvidence.originalSha256,
    );
    expect(summary.source.source_has_outer_whitespace).toBe(true);
    expect(importPayload.sourceEvidence).toEqual({
      originalByteLength: originalEvidence.originalByteLength,
      originalSha256: originalEvidence.originalSha256,
      parserRunIdentity: originalEvidence.parserRunIdentity,
    });

    // Parsing still succeeds because the parser input is a separately
    // trimmed value; the persisted events match the untrimmed submission's
    // evidence line for line.
    const events = mocks.saveParsedGameLogEvents.mock.calls[0][0].events;
    expect(events.length).toBeGreaterThan(0);
    expect(
      events.find(
        (event: { tile_type?: string | null }) => event.tile_type === 'ocean',
      ),
    ).toBeTruthy();
  });

  it('returns a reviewable duplicate state before any write when the source already backs a game', async () => {
    mocks.findDuplicateGameLogImportSources.mockResolvedValue({
      deployedRpcDetected: true,
      matches: [
        {
          createdAt: '2026-07-18T10:00:00Z',
          gameId: 'existing-game-1',
          gameLogImportId: 'existing-import-1',
          gameStatus: 'finalized',
          matchScope: 'exact_bytes',
          parserVersion: 'terraforming-mars-exported-log-v1',
          sameParserVersion: true,
        },
      ],
    });

    const result = await invokeAction(baseValues());
    expect(result).toMatchObject({
      status: 'duplicate_source',
      duplicates: [
        expect.objectContaining({
          gameId: 'existing-game-1',
          gameStatus: 'finalized',
          matchScope: 'exact_bytes',
        }),
      ],
    });
    // Nothing was created: no guest resolution, no draft, no import row.
    expect(mocks.resolveImportPlayerIdentities).not.toHaveBeenCalled();
    expect(mocks.saveDraftGame).not.toHaveBeenCalled();
    expect(mocks.saveGameLogImport).not.toHaveBeenCalled();
  });

  it('surfaces a deployed-RPC duplicate signal even when no classified match is visible', async () => {
    mocks.findDuplicateGameLogImportSources.mockResolvedValue({
      deployedRpcDetected: true,
      matches: [],
    });

    const result = await invokeAction(baseValues());
    expect(result).toMatchObject({ status: 'duplicate_source' });
    expect(mocks.saveDraftGame).not.toHaveBeenCalled();
  });

  it('proceeds on explicit acknowledgment and records the documented association', async () => {
    mocks.findDuplicateGameLogImportSources.mockResolvedValue({
      deployedRpcDetected: true,
      matches: [
        {
          createdAt: '2026-07-18T10:00:00Z',
          gameId: 'existing-game-1',
          gameLogImportId: 'existing-import-1',
          gameStatus: 'draft',
          matchScope: 'trimmed_equal',
          parserVersion: 'terraforming-mars-exported-log-v1',
          sameParserVersion: true,
        },
      ],
    });

    const result = await invokeAction({
      ...baseValues(),
      acknowledgeDuplicateSource: true,
    });
    expect(result).toMatchObject({ status: 'success' });

    const summary =
      mocks.saveGameLogImport.mock.calls[0][0].parseMetadata.confidenceSummary;
    expect(summary.source.duplicate_source_acknowledged).toEqual({
      acknowledged: true,
      matched_game_ids: ['existing-game-1'],
    });
  });

  it('marks the persistence run complete only after every canonical write lands', async () => {
    const result = await invokeAction(baseValues());
    expect(result).toMatchObject({ status: 'success' });

    const summary =
      mocks.saveGameLogImport.mock.calls[0][0].parseMetadata.confidenceSummary;
    expect(summary.run).toMatchObject({ state: 'persisting' });
    expect(mocks.markGameLogImportRunComplete).toHaveBeenCalledWith({
      confidenceSummary: summary,
      gameLogImportId: IMPORT_ID,
    });
  });

  it('leaves the run in persisting state when a canonical write fails (failure injection)', async () => {
    mocks.saveParsedGameLogEvents.mockRejectedValue(
      new Error('injected event persistence failure'),
    );

    await expect(invokeAction(baseValues())).rejects.toThrow(
      'injected event persistence failure',
    );
    // The run never completes, so readers keep treating the import as a
    // partial record instead of a successful one.
    expect(mocks.markGameLogImportRunComplete).not.toHaveBeenCalled();
  });
});
