import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { refreshGameMetricSnapshots } from './metric-refresh-repo';
import * as repo from './game-import-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('./metric-refresh-repo', () => ({
  refreshGameMetricSnapshots: vi.fn(),
}));

describe('saveGameLogImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE;
  });

  it('uploads screenshot evidence and saves import metadata for a draft game', async () => {
    const upload = vi.fn().mockResolvedValue({
      data: { path: 'game-1/abc-endgame-results-png' },
      error: null,
    });
    const storageFrom = vi.fn(() => ({
      upload,
    }));
    const insert = vi.fn().mockReturnThis();
    const select = vi.fn().mockReturnThis();
    const single = vi.fn().mockResolvedValue({
      data: { id: 'import-1' },
      error: null,
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'game_log_imports') {
          return {
            insert,
            select,
            single,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      storage: {
        from: storageFrom,
      },
    } as never);

    const repoModule = repo as {
      saveGameLogImport?: (input: {
        gameId: string;
        rawLogText: string;
        screenshotFile: File | null;
        userId: string;
      }) => Promise<{ id: string; screenshotObjectPath: string | null }>;
    };

    expect(repoModule.saveGameLogImport).toBeTypeOf('function');
    if (!repoModule.saveGameLogImport) {
      return;
    }

    const screenshotFile = new File(['image-bits'], 'Endgame Results!!.PNG', {
      type: 'image/png',
    });

    const result = await repoModule.saveGameLogImport({
      gameId: 'game-1',
      rawLogText: 'Friday Mars won\nSecond Seat lost',
      screenshotFile,
      userId: 'user-1',
    });

    expect(result.id).toBe('import-1');
    expect(result.screenshotObjectPath).toMatch(
      /^game-1\/[a-z0-9-]+-endgame-results-png$/,
    );

    expect(upload).toHaveBeenCalledTimes(1);
    expect(storageFrom).toHaveBeenCalledWith('tm-import-evidence');
    expect(upload.mock.calls[0]?.[0]).toMatch(
      /^game-1\/[a-z0-9-]+-endgame-results-png$/,
    );
    expect(upload).toHaveBeenCalledWith(
      expect.any(String),
      screenshotFile,
      expect.objectContaining({
        contentType: 'image/png',
        upsert: false,
      }),
    );
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        created_by_user_id: 'user-1',
        detected_source: 'manual_web_import',
        game_id: 'game-1',
        line_count: 2,
        parse_status: 'saved_as_draft',
        parser_version: 'manual-web-import-v1',
        raw_log_text: 'Friday Mars won\nSecond Seat lost',
        screenshot_mime_type: 'image/png',
        screenshot_object_path: result.screenshotObjectPath,
      }),
    );
  });

  it('persists parser provenance and structured screenshot fields', async () => {
    const upload = vi.fn().mockResolvedValue({ data: {}, error: null });
    const importInsert = vi.fn().mockReturnThis();
    const importSelect = vi.fn().mockReturnThis();
    const importSingle = vi.fn().mockResolvedValue({
      data: { id: 'import-structured' },
      error: null,
    });
    const screenshotInsert = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'game_log_imports') {
          return {
            insert: importInsert,
            select: importSelect,
            single: importSingle,
          };
        }
        if (table === 'game_result_screenshot_imports') {
          return { insert: screenshotInsert };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
      storage: { from: vi.fn(() => ({ upload })) },
    } as never);

    const screenshotFile = new File(['image'], 'endgame.png', {
      type: 'image/png',
    });
    await repo.saveGameLogImport({
      gameId: 'game-structured',
      parseMetadata: {
        confidenceSummary: { player_count: 2 },
        detectedSource: 'terraforming_mars_exported_log',
        parseStatus: 'parsed_setup_fields',
        parserVersion: 'terraforming-mars-exported-log-v1',
        screenshot: {
          confidenceSummary: { mean_confidence: 0.98 },
          detectedLayout: 'terraforming_mars_base_endgame_score_table',
          extractedFields: { score_rows: [{ total_points: 90 }] },
          ocrEngineVersion: 'terraforming-mars-endgame-score-table-v1',
          parseStatus: 'parsed_needs_verification',
        },
        validationErrors: [],
      },
      rawLogText: 'Generation 12',
      screenshotFile,
      userId: 'user-structured',
    });

    expect(importInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        detected_source: 'terraforming_mars_exported_log',
        parse_status: 'parsed_setup_fields',
        parser_version: 'terraforming-mars-exported-log-v1',
        validation_errors: [],
      }),
    );
    expect(screenshotInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        detected_layout: 'terraforming_mars_base_endgame_score_table',
        extracted_fields: { score_rows: [{ total_points: 90 }] },
        game_log_import_id: 'import-structured',
        parse_status: 'parsed_needs_verification',
      }),
    );
  });

  it('uses the configured import-evidence bucket override when present', async () => {
    process.env.SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE = 'custom-import-bucket';

    const upload = vi.fn().mockResolvedValue({
      data: { path: 'game-2/custom-endgame-png' },
      error: null,
    });
    const storageFrom = vi.fn(() => ({
      upload,
    }));
    const insert = vi.fn().mockReturnThis();
    const select = vi.fn().mockReturnThis();
    const single = vi.fn().mockResolvedValue({
      data: { id: 'import-2' },
      error: null,
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'game_log_imports') {
          return {
            insert,
            select,
            single,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      storage: {
        from: storageFrom,
      },
    } as never);

    const screenshotFile = new File(['image-bits'], 'custom endgame.png', {
      type: 'image/png',
    });

    await repo.saveGameLogImport({
      gameId: 'game-2',
      rawLogText: 'Custom import',
      screenshotFile,
      userId: 'user-2',
    });

    expect(storageFrom).toHaveBeenCalledWith('custom-import-bucket');
  });
});

describe('saveParsedGameLogEvents', () => {
  it('replaces parsed events and runs the import integrity validator', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);

    await repo.saveParsedGameLogEvents({
      events: [
        {
          card_id: 'card-1',
          confidence_level: 'high',
          event_order: 4,
          event_type: 'card_played',
          generation_number: 1,
          line_classification: 'played_card',
          payload: { actor: 'Private source name' },
          raw_line: 'Private source name played a card',
          review_state: 'not_required',
        },
      ],
      gameLogImportId: 'import-1',
    });

    expect(rpc).toHaveBeenNthCalledWith(1, 'replace_game_log_events', {
      p_events: [
        expect.objectContaining({
          card_id: 'card-1',
          event_order: 4,
          event_type: 'card_played',
        }),
      ],
      p_game_log_import_id: 'import-1',
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'validate_game_log_import', {
      p_game_log_import_id: 'import-1',
    });
  });
});

describe('saveGameExpansionFacts', () => {
  it('upserts canonical parser state without collapsing missing Venus scale to zero', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === 'game_expansion_facts') {
        return { upsert };
      }
      throw new Error(`Unexpected table ${table}`);
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ from } as never);

    await repo.saveGameExpansionFacts({
      facts: {
        coloniesState: 'confirmed_absent',
        colonyBuiltCount: 0,
        colonyTradeCount: 0,
        detectionProvenance: { colonies_evidence: [] },
        finalVenusScale: null,
        parserVersion: 'terraforming-mars-venus-colonies-v1',
        sourceCoverage: { complete: true },
        venusEventCount: 0,
        venusNextState: 'confirmed_absent',
      },
      gameId: 'game-1',
      gameLogImportId: 'import-1',
    });

    expect(from).toHaveBeenCalledWith('game_expansion_facts');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        colonies_state: 'confirmed_absent',
        final_venus_scale: null,
        game_id: 'game-1',
        source_game_log_import_id: 'import-1',
        venus_event_count: 0,
        venus_next_state: 'confirmed_absent',
      }),
      { onConflict: 'game_id' },
    );
  });
});

describe('saveGameLogTagSummaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaces canonical tag summary rows through an atomic RPC and refreshes finalized metrics', async () => {
    vi.mocked(refreshGameMetricSnapshots).mockResolvedValue(undefined);

    const rpc = vi.fn().mockResolvedValue({
      data: [
        { id: 'tag-row-1', tag_code: 'science' },
        { id: 'tag-row-2', tag_code: 'space' },
      ],
      error: null,
    });
    const importMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        game_id: 'game-final',
        games: { status: 'finalized' },
      },
      error: null,
    });
    const importEq = vi.fn(() => ({ maybeSingle: importMaybeSingle }));
    const importSelect = vi.fn(() => ({ eq: importEq }));

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      rpc,
      from: vi.fn((table: string) => {
        if (table === 'game_log_imports') {
          return {
            select: importSelect,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    const result = await repo.saveGameLogTagSummaries({
      gameLogImportId: 'import-1',
      summaries: [
        {
          gamePlayerId: 'game-player-1',
          matchedCardCount: 3,
          normalizedPlayerName: 'friday mars',
          playedCardCount: 4,
          playerName: 'Friday Mars',
          tagCode: 'science',
          tagCount: 5,
          totalTagCount: 8,
          unresolvedCardCount: 1,
        },
        {
          matchedCardCount: 0,
          normalizedPlayerName: 'friday mars',
          playedCardCount: 0,
          playerName: 'Friday Mars',
          tagCode: 'space',
          tagCount: 0,
          totalTagCount: 8,
          unresolvedCardCount: 0,
        },
      ],
    });

    expect(rpc).toHaveBeenCalledWith('replace_game_log_tag_summaries', {
      p_game_log_import_id: 'import-1',
      p_summaries: [
        {
          game_player_id: 'game-player-1',
          matched_card_count: 3,
          normalized_player_name: 'friday mars',
          played_card_count: 4,
          player_name: 'Friday Mars',
          tag_code: 'science',
          tag_count: 5,
          tag_evidence_coverage: 0.75,
          total_tag_count: 8,
          unresolved_card_count: 1,
        },
        {
          game_player_id: null,
          matched_card_count: 0,
          normalized_player_name: 'friday mars',
          played_card_count: 0,
          player_name: 'Friday Mars',
          tag_code: 'space',
          tag_count: 0,
          tag_evidence_coverage: 0,
          total_tag_count: 8,
          unresolved_card_count: 0,
        },
      ],
    });
    expect(importSelect).toHaveBeenCalledWith('game_id, games!inner(status)');
    expect(importEq).toHaveBeenCalledWith('id', 'import-1');
    expect(refreshGameMetricSnapshots).toHaveBeenCalledWith('game-final');
    expect(result).toEqual([
      { id: 'tag-row-1', tagCode: 'science' },
      { id: 'tag-row-2', tagCode: 'space' },
    ]);
  });

  it('throws RPC errors without checking status or refreshing metrics', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('tag summary replacement failed'),
    });
    const from = vi.fn((table: string) => {
      throw new Error(`Unexpected table ${table}`);
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from,
      rpc,
    } as never);

    await expect(
      repo.saveGameLogTagSummaries({
        gameLogImportId: 'import-failed',
        summaries: [
          {
            matchedCardCount: 1,
            normalizedPlayerName: 'friday mars',
            playedCardCount: 2,
            playerName: 'Friday Mars',
            tagCode: 'science',
            tagCount: 1,
            totalTagCount: 1,
            unresolvedCardCount: 1,
          },
        ],
      }),
    ).rejects.toThrow('tag summary replacement failed');

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalled();
    expect(refreshGameMetricSnapshots).not.toHaveBeenCalled();
  });

  it('does not refresh metrics when tag summaries are saved for a draft import', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ id: 'tag-row-3', tag_code: 'plant' }],
      error: null,
    });
    const importMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        game_id: 'game-draft',
        games: [{ status: 'draft' }],
      },
      error: null,
    });
    const importEq = vi.fn(() => ({ maybeSingle: importMaybeSingle }));
    const importSelect = vi.fn(() => ({ eq: importEq }));

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      rpc,
      from: vi.fn((table: string) => {
        if (table === 'game_log_imports') {
          return {
            select: importSelect,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    await repo.saveGameLogTagSummaries({
      gameLogImportId: 'import-draft',
      summaries: [
        {
          matchedCardCount: 2,
          normalizedPlayerName: 'izzy hodnett',
          playedCardCount: 2,
          playerName: 'Izzy Hodnett',
          tagCode: 'plant',
          tagCount: 3,
          totalTagCount: 3,
          unresolvedCardCount: 0,
        },
      ],
    });

    expect(importEq).toHaveBeenCalledWith('id', 'import-draft');
    expect(refreshGameMetricSnapshots).not.toHaveBeenCalled();
  });

  it('sends empty summaries to the RPC as an intentional clear and refreshes finalized metrics', async () => {
    vi.mocked(refreshGameMetricSnapshots).mockResolvedValue(undefined);

    const rpc = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const importMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        game_id: 'game-final',
        games: { status: 'finalized' },
      },
      error: null,
    });
    const importEq = vi.fn(() => ({ maybeSingle: importMaybeSingle }));
    const importSelect = vi.fn(() => ({ eq: importEq }));

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      rpc,
      from: vi.fn((table: string) => {
        if (table === 'game_log_imports') {
          return {
            select: importSelect,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    const result = await repo.saveGameLogTagSummaries({
      gameLogImportId: 'import-empty',
      summaries: [],
    });

    expect(rpc).toHaveBeenCalledWith('replace_game_log_tag_summaries', {
      p_game_log_import_id: 'import-empty',
      p_summaries: [],
    });
    expect(refreshGameMetricSnapshots).toHaveBeenCalledWith('game-final');
    expect(result).toEqual([]);
  });
});

describe('getLatestGameLogImportSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the most recent saved import evidence summary for a draft game', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        created_at: '2026-07-03T23:25:00.000Z',
        detected_source: 'manual_web_import',
        id: 'import-2',
        line_count: 3,
        parse_status: 'saved_as_draft',
        raw_log_text: 'Friday Mars won\nSecond Seat lost\nFinal credits: 8',
        screenshot_original_name: 'endgame.png',
      },
      error: null,
    });
    const limit = vi.fn().mockReturnThis();
    const order = vi.fn().mockReturnThis();
    const eq = vi.fn().mockReturnThis();
    const select = vi.fn().mockReturnThis();

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'game_log_imports') {
          return {
            eq,
            limit,
            maybeSingle,
            order,
            select,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    const result = await repo.getLatestGameLogImportSummary({
      gameId: 'game-1',
    });

    expect(select).toHaveBeenCalledWith(
      [
        'id',
        'created_at',
        'detected_source',
        'line_count',
        'parse_status',
        'raw_log_text',
        'screenshot_original_name',
      ].join(', '),
    );
    expect(eq).toHaveBeenCalledWith('game_id', 'game-1');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(limit).toHaveBeenCalledWith(1);
    expect(result).toEqual({
      createdAt: '2026-07-03T23:25:00.000Z',
      detectedSource: 'manual_web_import',
      id: 'import-2',
      lineCount: 3,
      parseStatus: 'saved_as_draft',
      rawLogText: 'Friday Mars won\nSecond Seat lost\nFinal credits: 8',
      screenshotOriginalName: 'endgame.png',
    });
  });
});
