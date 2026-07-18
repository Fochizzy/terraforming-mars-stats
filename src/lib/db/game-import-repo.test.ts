import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { captureGameMechanicsFromRawLog } from './game-mechanic-capture-repo';
import * as repo from './game-import-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('./game-mechanic-capture-repo', () => ({
  captureGameMechanicsFromRawLog: vi.fn(),
}));

describe('saveGameLogImport', () => {
  const mutableEnv = process.env as unknown as Record<string, string | undefined>;

  beforeEach(() => {
    vi.clearAllMocks();
    delete mutableEnv['SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE'];
  });

  it('stores raw logs and screenshot metadata in separate tables', async () => {
    const upload = vi.fn().mockResolvedValue({
      data: { path: 'game-1/abc-endgame-results-png' },
      error: null,
    });
    const storageFrom = vi.fn(() => ({
      upload,
    }));
    const importInsert = vi.fn().mockReturnThis();
    const importSelect = vi.fn().mockReturnThis();
    const importSingle = vi.fn().mockResolvedValue({
      data: { id: 'import-1' },
      error: null,
    });
    const screenshotInsert = vi.fn().mockReturnThis();
    const screenshotSelect = vi.fn().mockReturnThis();
    const screenshotSingle = vi.fn().mockResolvedValue({
      data: { id: 'screenshot-1' },
      error: null,
    });

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
          return {
            insert: screenshotInsert,
            select: screenshotSelect,
            single: screenshotSingle,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      storage: {
        from: storageFrom,
      },
    } as never);

    const screenshotFile = new File(['image-bits'], 'Endgame Results!!.PNG', {
      type: 'image/png',
    });

    const result = await repo.saveGameLogImport({
      gameId: 'game-1',
      rawLogText: 'Friday Mars won\nSecond Seat lost',
      screenshotParse: {
        detectedLayout: 'digital_endgame_results',
        extractedFields: {
          playerRows: [{ playerName: 'Friday Mars', totalPoints: 62 }],
        },
        ocrEngineVersion: 'tesseract.js-v7',
        parseStatus: 'parsed',
      },
      screenshotFile,
      userId: 'user-1',
    });

    expect(captureGameMechanicsFromRawLog).toHaveBeenCalledWith({
      gameId: 'game-1',
      gameLogImportId: 'import-1',
      rawLogText: 'Friday Mars won\nSecond Seat lost',
      resolveParticipantIds: false,
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
    expect(importInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        created_by_user_id: 'user-1',
        detected_source: 'manual_web_import',
        game_id: 'game-1',
        line_count: 2,
        parse_status: 'score_extracted',
        parser_version: 'manual-web-import-v1',
        raw_log_text: 'Friday Mars won\nSecond Seat lost',
        unparsed_line_count: 2,
      }),
    );
    expect(importInsert).not.toHaveBeenCalledWith(
      expect.objectContaining({
        screenshot_mime_type: expect.anything(),
      }),
    );
    expect(screenshotInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        confidence_summary: {},
        created_by_user_id: 'user-1',
        detected_layout: 'digital_endgame_results',
        extracted_fields: {
          playerRows: [{ playerName: 'Friday Mars', totalPoints: 62 }],
        },
        file_size_bytes: screenshotFile.size,
        game_id: 'game-1',
        game_log_import_id: 'import-1',
        mime_type: 'image/png',
        ocr_engine_version: 'tesseract.js-v7',
        original_name: 'Endgame Results!!.PNG',
        parse_status: 'parsed',
        storage_object_path: result.screenshotObjectPath,
      }),
    );
  });

  it('stores separate endgame and board screenshot rows for one import', async () => {
    const upload = vi
      .fn()
      .mockResolvedValueOnce({
        data: { path: 'game-1/endgame-png' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { path: 'game-1/board-png' },
        error: null,
      });
    const storageFrom = vi.fn(() => ({
      upload,
    }));
    const importInsert = vi.fn().mockReturnThis();
    const importSelect = vi.fn().mockReturnThis();
    const importSingle = vi.fn().mockResolvedValue({
      data: { id: 'import-1' },
      error: null,
    });
    const screenshotInsert = vi.fn().mockReturnThis();
    const screenshotSelect = vi.fn().mockReturnThis();
    const screenshotSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: { id: 'screen-1' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: 'screen-2' },
        error: null,
      });

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
          return {
            insert: screenshotInsert,
            select: screenshotSelect,
            single: screenshotSingle,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      storage: {
        from: storageFrom,
      },
    } as never);

    await repo.saveGameLogImport({
      gameId: 'game-1',
      rawLogText: 'Friday Mars played Tardigrades',
      screenshots: [
        {
          file: new File(['endgame'], 'endgame.png', { type: 'image/png' }),
          kind: 'endgame_score',
          parse: { parseStatus: 'parsed' },
        },
        {
          file: new File(['board'], 'board.png', { type: 'image/png' }),
          kind: 'board_state',
          parse: { parseStatus: 'parsed' },
        },
      ],
      userId: 'user-1',
    });

    expect(screenshotInsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        display_order: 0,
        evidence_kind: 'endgame_score',
        original_name: 'endgame.png',
      }),
    );
    expect(screenshotInsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        display_order: 0,
        evidence_kind: 'board_state',
        original_name: 'board.png',
      }),
    );
  });

  it('stores a combined parse status when the log parsed but screenshot score extraction found no rows', async () => {
    const upload = vi.fn().mockResolvedValue({
      data: { path: 'game-9/score-jpg' },
      error: null,
    });
    const storageFrom = vi.fn(() => ({
      upload,
    }));
    const importInsert = vi.fn().mockReturnThis();
    const importSelect = vi.fn().mockReturnThis();
    const importSingle = vi.fn().mockResolvedValue({
      data: { id: 'import-9' },
      error: null,
    });
    const screenshotInsert = vi.fn().mockReturnThis();
    const screenshotSelect = vi.fn().mockReturnThis();
    const screenshotSingle = vi.fn().mockResolvedValue({
      data: { id: 'screenshot-9' },
      error: null,
    });

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
          return {
            insert: screenshotInsert,
            select: screenshotSelect,
            single: screenshotSingle,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      storage: {
        from: storageFrom,
      },
    } as never);

    const screenshotFile = new File(['image-bits'], 'Score.jpg', {
      type: 'image/jpeg',
    });

    await repo.saveGameLogImport({
      gameId: 'game-9',
      logParseSummary: {
        contextLineCount: 1,
        drawInfoLineCount: 0,
        ignoredLineCount: 2,
        parsedEventCount: 4,
      },
      rawLogText: 'Generation 1\nIzzy played Earth Catapult',
      screenshotParse: {
        detectedLayout: null,
        extractedFields: {
          playerRows: [],
        },
        ocrEngineVersion: 'tesseract.js-v7',
        parseStatus: 'score_extraction_skipped',
      },
      screenshotFile,
      userId: 'user-9',
    });

    expect(importInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        parse_status: 'log_parsed_score_extraction_skipped',
        parser_version: 'manual-web-import-v2',
      }),
    );
    expect(screenshotInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        parse_status: 'score_extraction_skipped',
      }),
    );
  });

  it('uses the configured import-evidence bucket override when present', async () => {
    mutableEnv['SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE'] =
      'custom-import-bucket';

    const upload = vi.fn().mockResolvedValue({
      data: { path: 'game-2/custom-endgame-png' },
      error: null,
    });
    const storageFrom = vi.fn(() => ({
      upload,
    }));
    const importInsert = vi.fn().mockReturnThis();
    const importSelect = vi.fn().mockReturnThis();
    const importSingle = vi.fn().mockResolvedValue({
      data: { id: 'import-2' },
      error: null,
    });
    const screenshotInsert = vi.fn().mockReturnThis();
    const screenshotSelect = vi.fn().mockReturnThis();
    const screenshotSingle = vi.fn().mockResolvedValue({
      data: { id: 'screenshot-2' },
      error: null,
    });

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
          return {
            insert: screenshotInsert,
            select: screenshotSelect,
            single: screenshotSingle,
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

  it('removes an uploaded screenshot when the raw import row insert fails', async () => {
    const upload = vi.fn().mockResolvedValue({
      data: { path: 'game-4/failing-raw-import-png' },
      error: null,
    });
    const remove = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const storageFrom = vi.fn(() => ({
      remove,
      upload,
    }));
    const importInsert = vi.fn().mockReturnThis();
    const importSelect = vi.fn().mockReturnThis();
    const importSingle = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('raw import insert failed'),
    });

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
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn(),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      storage: {
        from: storageFrom,
      },
    } as never);

    const screenshotFile = new File(['image-bits'], 'failing raw import.png', {
      type: 'image/png',
    });

    await expect(
      repo.saveGameLogImport({
        gameId: 'game-4',
        rawLogText: 'Failed raw import',
        screenshotFile,
        userId: 'user-4',
      }),
    ).rejects.toThrow('raw import insert failed');

    expect(remove).toHaveBeenCalledWith([
      expect.stringMatching(/^game-4\/[a-z0-9-]+-failing-raw-import-png$/),
    ]);
  });

  it('surfaces cleanup failures when screenshot metadata insert fails', async () => {
    const upload = vi.fn().mockResolvedValue({
      data: { path: 'game-3/failing-endgame-png' },
      error: null,
    });
    const remove = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: 'StorageCleanup',
        details: 'remove failed for uploaded object',
        hint: 'Check the evidence bucket',
        message: 'storage cleanup failed',
      },
    });
    const storageFrom = vi.fn(() => ({
      remove,
      upload,
    }));
    const importInsert = vi.fn().mockReturnThis();
    const importSelect = vi.fn().mockReturnThis();
    const importSingle = vi.fn().mockResolvedValue({
      data: { id: 'import-failed' },
      error: null,
    });
    const cleanupEq = vi.fn().mockResolvedValue({
      error: {
        code: 'RawCleanup',
        details: 'delete affected 0 rows',
        hint: 'Check raw import state',
        message: 'raw import cleanup failed',
      },
    });
    const cleanupDelete = vi.fn(() => ({
      eq: cleanupEq,
    }));
    const screenshotInsert = vi.fn().mockReturnThis();
    const screenshotSelect = vi.fn().mockReturnThis();
    const screenshotSingle = vi.fn().mockResolvedValue({
      data: null,
      error: Object.assign(new Error('screenshot insert failed'), {
        code: 'ScreenshotInsertFailed',
        details: 'insert into split screenshot table failed',
        hint: 'Check the screenshot/import pairing',
      }),
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'game_log_imports') {
          return {
            delete: cleanupDelete,
            insert: importInsert,
            select: importSelect,
            single: importSingle,
          };
        }

        if (table === 'game_result_screenshot_imports') {
          return {
            insert: screenshotInsert,
            select: screenshotSelect,
            single: screenshotSingle,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      storage: {
        from: storageFrom,
      },
    } as never);

    const screenshotFile = new File(['image-bits'], 'failing endgame.png', {
      type: 'image/png',
    });

    await expect(
      repo.saveGameLogImport({
        gameId: 'game-3',
        rawLogText: 'Cleanup import',
        screenshotFile,
        userId: 'user-3',
      }),
    ).rejects.toThrow(
      'screenshot insert failed | code: ScreenshotInsertFailed | details: insert into split screenshot table failed | hint: Check the screenshot/import pairing Cleanup failed: storage cleanup failed | code: StorageCleanup | details: remove failed for uploaded object | hint: Check the evidence bucket; raw import cleanup failed | code: RawCleanup | details: delete affected 0 rows | hint: Check raw import state',
    );

    expect(cleanupDelete).toHaveBeenCalledTimes(1);
    expect(cleanupEq).toHaveBeenCalledWith('id', 'import-failed');
    expect(remove).toHaveBeenCalledWith([
      expect.stringMatching(/^game-3\/[a-z0-9-]+-failing-endgame-png$/),
    ]);
  });

  it('falls back to legacy screenshot columns when the split screenshot table is missing', async () => {
    const upload = vi.fn().mockResolvedValue({
      data: { path: 'game-5/legacy-endgame-png' },
      error: null,
    });
    const storageFrom = vi.fn(() => ({
      upload,
    }));
    const importInsert = vi.fn().mockReturnThis();
    const importSelect = vi.fn().mockReturnThis();
    const importSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: { id: 'import-legacy' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: 'import-legacy' },
        error: null,
      });
    const importUpdate = vi.fn().mockReturnThis();
    const importEq = vi.fn().mockReturnThis();
    const screenshotInsert = vi.fn().mockReturnThis();
    const screenshotSelect = vi.fn().mockReturnThis();
    const screenshotSingle = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: 'PGRST205',
        details: null,
        hint: "Perhaps you meant the table 'public.game_log_imports'",
        message:
          "Could not find the table 'public.game_result_screenshot_imports' in the schema cache",
      },
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'game_log_imports') {
          return {
            eq: importEq,
            insert: importInsert,
            select: importSelect,
            single: importSingle,
            update: importUpdate,
          };
        }

        if (table === 'game_result_screenshot_imports') {
          return {
            insert: screenshotInsert,
            select: screenshotSelect,
            single: screenshotSingle,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      storage: {
        from: storageFrom,
      },
    } as never);

    const screenshotFile = new File(['image-bits'], 'legacy endgame.png', {
      type: 'image/png',
    });

    const result = await repo.saveGameLogImport({
      gameId: 'game-5',
      rawLogText: 'Legacy screenshot import',
      screenshotFile,
      userId: 'user-5',
    });

    expect(result).toEqual({
      id: 'import-legacy',
      screenshotObjectPath: expect.stringMatching(
        /^game-5\/[a-z0-9-]+-legacy-endgame-png$/,
      ),
    });
    expect(screenshotInsert).toHaveBeenCalledTimes(1);
    expect(importUpdate).toHaveBeenCalledWith({
      screenshot_mime_type: 'image/png',
      screenshot_object_path: result.screenshotObjectPath,
      screenshot_original_name: 'legacy endgame.png',
      screenshot_size_bytes: screenshotFile.size,
    });
    expect(importEq).toHaveBeenCalledWith('id', 'import-legacy');
  });
});

describe('saveGameLogEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaces stale parsed rows through an atomic RPC on a successful shorter reparse', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        { id: 'event-1', event_order: 1 },
        { id: 'event-2', event_order: 2 },
      ],
      error: null,
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc,
    } as never);

    const result = await repo.saveGameLogEvents({
      events: [
        {
          confidenceLevel: 'high',
          eventOrder: 1,
          eventType: 'generation_started',
          generationNumber: 4,
          lineClassification: 'event',
          payload: { generation: 4 },
          rawLine: 'Generation 4',
        },
        {
          boardSpace: '29',
          confidenceLevel: 'medium',
          eventOrder: 2,
          eventType: 'tile_placed',
          lineClassification: 'event',
          payload: { tileType: 'greenery' },
          rawLine: 'Izzy placed greenery tile at 29',
          tileType: 'greenery',
        },
      ],
      gameLogImportId: 'import-1',
    });

    expect(rpc).toHaveBeenCalledWith('replace_game_log_events', {
      p_events: [
        {
          board_space: null,
          card_id: null,
          confidence_level: 'high',
          event_order: 1,
          event_type: 'generation_started',
          generation_number: 4,
          line_classification: 'event',
          payload: { generation: 4 },
          raw_line: 'Generation 4',
          resource_amount: null,
          resource_type: null,
          tile_type: null,
        },
        {
          board_space: '29',
          card_id: null,
          confidence_level: 'medium',
          event_order: 2,
          event_type: 'tile_placed',
          generation_number: null,
          line_classification: 'event',
          payload: { tileType: 'greenery' },
          raw_line: 'Izzy placed greenery tile at 29',
          resource_amount: null,
          resource_type: null,
          tile_type: 'greenery',
        },
      ],
      p_game_log_import_id: 'import-1',
    });
    expect(result).toEqual([
      { eventOrder: 1, id: 'event-1' },
      { eventOrder: 2, id: 'event-2' },
    ]);
  });

  it('does not wipe previously saved rows when the atomic replacement RPC fails', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('event replacement failed'),
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc,
    } as never);

    await expect(
      repo.saveGameLogEvents({
        events: [
          {
            confidenceLevel: 'high',
            eventOrder: 1,
            eventType: 'generation_started',
            generationNumber: 5,
            lineClassification: 'event',
            payload: { generation: 5 },
            rawLine: 'Generation 5',
          },
        ],
        gameLogImportId: 'import-2',
      }),
    ).rejects.toThrow('event replacement failed');

    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('preserves previously saved rows when a reparse returns zero events', async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [
        { id: 'event-7', event_order: 1 },
        { id: 'event-8', event_order: 2 },
      ],
      error: null,
    });
    const limit = vi.fn().mockReturnThis();
    const order = vi.fn().mockReturnThis();
    const select = vi.fn().mockReturnThis();
    const deleteFn = vi.fn();

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'game_log_events') {
          return {
            delete: deleteFn,
            eq,
            limit,
            order,
            select,
            upsert: vi.fn(),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    const result = await repo.saveGameLogEvents({
      events: [],
      gameLogImportId: 'import-3',
    });

    expect(deleteFn).not.toHaveBeenCalled();
    expect(select).toHaveBeenCalledWith('id, event_order');
    expect(eq).toHaveBeenCalledWith('game_log_import_id', 'import-3');
    expect(order).not.toHaveBeenCalled();
    expect(limit).not.toHaveBeenCalled();
    expect(result).toEqual([
      { eventOrder: 1, id: 'event-7' },
      { eventOrder: 2, id: 'event-8' },
    ]);
  });
});

describe('saveGameLogTagSummaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaces import tag counts with one row per canonical tag per player', async () => {
    const eq = vi.fn().mockResolvedValue({
      error: null,
    });
    const deleteFn = vi.fn(() => ({
      eq,
    }));
    const select = vi.fn().mockResolvedValue({
      data: [
        { id: 'tag-row-1', tag_code: 'building' },
        { id: 'tag-row-2', tag_code: 'science' },
      ],
      error: null,
    });
    const insert = vi.fn((rows: Array<Record<string, unknown>>) => ({
      select,
      rows,
    }));

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'game_log_tag_summaries') {
          return {
            delete: deleteFn,
            insert,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    const result = await repo.saveGameLogTagSummaries({
      gameLogImportId: 'import-1',
      tagSummaries: [
        {
          matchedCardCount: 2,
          matchedCards: [],
          playedCardCount: 3,
          playerName: 'Friday Mars',
          tagCounts: {
            animal: 0,
            building: 1,
            city: 0,
            earth: 1,
            event: 0,
            jovian: 0,
            microbe: 0,
            moon: 0,
            plant: 0,
            power: 1,
            science: 1,
            space: 0,
            venus: 0,
            wild: 0,
          },
          totalTags: 4,
          unresolvedCardCount: 1,
          unresolvedCards: [],
        },
      ],
    });

    expect(deleteFn).toHaveBeenCalledTimes(1);
    expect(eq).toHaveBeenCalledWith('game_log_import_id', 'import-1');
    expect(insert).toHaveBeenCalledTimes(1);

    const rows = insert.mock.calls[0]?.[0] ?? [];

    expect(rows).toHaveLength(14);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          game_log_import_id: 'import-1',
          matched_card_count: 2,
          normalized_player_name: 'friday mars',
          player_name: 'Friday Mars',
          played_card_count: 3,
          tag_code: 'building',
          tag_count: 1,
          total_tag_count: 4,
          unresolved_card_count: 1,
        }),
        expect.objectContaining({
          game_log_import_id: 'import-1',
          player_name: 'Friday Mars',
          tag_code: 'event',
          tag_count: 0,
        }),
      ]),
    );
    expect(select).toHaveBeenCalledWith('id, tag_code');
    expect(result).toEqual([
      { id: 'tag-row-1', tagCode: 'building' },
      { id: 'tag-row-2', tagCode: 'science' },
    ]);
  });

  it('retries tag summary inserts with legacy tag codes when the database constraint is older', async () => {
    const eq = vi.fn().mockResolvedValue({
      error: null,
    });
    const deleteFn = vi.fn(() => ({
      eq,
    }));
    const select = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: '23514',
          details:
            'Failing row contains a tag_code that is not accepted by game_log_tag_summaries_tag_code_check.',
          message:
            'new row for relation "game_log_tag_summaries" violates check constraint "game_log_tag_summaries_tag_code_check"',
        },
      })
      .mockResolvedValueOnce({
        data: [{ id: 'legacy-row-1', tag_code: 'building' }],
        error: null,
      });
    const insert = vi.fn((rows: Array<Record<string, unknown>>) => ({
      select,
      rows,
    }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'game_log_tag_summaries') {
          return {
            delete: deleteFn,
            insert,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    const result = await repo.saveGameLogTagSummaries({
      gameLogImportId: 'import-1',
      tagSummaries: [
        {
          matchedCardCount: 2,
          matchedCards: [],
          playedCardCount: 2,
          playerName: 'Friday Mars',
          tagCounts: {
            animal: 0,
            building: 1,
            city: 0,
            earth: 0,
            event: 0,
            jovian: 0,
            microbe: 0,
            moon: 2,
            plant: 0,
            power: 0,
            science: 0,
            space: 1,
            venus: 0,
            wild: 0,
          },
          totalTags: 4,
          unresolvedCardCount: 0,
          unresolvedCards: [],
        },
      ],
    });

    expect(insert).toHaveBeenCalledTimes(2);

    const firstRows = insert.mock.calls[0]?.[0] ?? [];
    const retryRows = insert.mock.calls[1]?.[0] ?? [];

    expect(firstRows).toHaveLength(14);
    expect(firstRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tag_code: 'moon', tag_count: 2 }),
        expect.objectContaining({ tag_code: 'venus' }),
        expect.objectContaining({ tag_code: 'wild' }),
      ]),
    );
    expect(retryRows).toHaveLength(11);
    expect(retryRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tag_code: 'building', tag_count: 1 }),
        expect.objectContaining({ tag_code: 'event', tag_count: 0 }),
      ]),
    );
    expect(retryRows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tag_code: 'moon' }),
        expect.objectContaining({ tag_code: 'venus' }),
        expect.objectContaining({ tag_code: 'wild' }),
      ]),
    );
    expect(warn).toHaveBeenCalledWith(
      'Game log tag summary schema rejected newer tag codes; retrying with legacy tag set.',
      expect.any(Object),
    );
    expect(result).toEqual([{ id: 'legacy-row-1', tagCode: 'building' }]);

    warn.mockRestore();
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
        screenshot_original_name: null,
      },
      error: null,
    });
    const limit = vi.fn().mockReturnThis();
    const order = vi.fn().mockReturnThis();
    const eq = vi.fn().mockReturnThis();
    const select = vi.fn().mockReturnThis();
    const screenshotMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        original_name: 'endgame.png',
        parse_status: 'score_extraction_skipped',
      },
      error: null,
    });
    const screenshotLimit = vi.fn().mockReturnThis();
    const screenshotOrder = vi.fn().mockReturnThis();
    const screenshotEq = vi.fn().mockReturnThis();
    const screenshotSelect = vi.fn().mockReturnThis();

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

        if (table === 'game_result_screenshot_imports') {
          return {
            eq: screenshotEq,
            limit: screenshotLimit,
            maybeSingle: screenshotMaybeSingle,
            order: screenshotOrder,
            select: screenshotSelect,
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
    expect(screenshotSelect).toHaveBeenCalledWith('original_name, parse_status');
    expect(screenshotEq).toHaveBeenCalledWith('game_log_import_id', 'import-2');
    expect(screenshotOrder).toHaveBeenCalledWith('created_at', {
      ascending: false,
    });
    expect(screenshotLimit).toHaveBeenCalledWith(1);
    expect(result).toEqual({
      createdAt: '2026-07-03T23:25:00.000Z',
      detectedSource: 'manual_web_import',
      id: 'import-2',
      lineCount: 3,
      parseStatus: 'score_extraction_skipped',
      rawLogText: 'Friday Mars won\nSecond Seat lost\nFinal credits: 8',
      screenshotOriginalName: 'endgame.png',
    });
  });

  it('keeps the latest raw import paired with its own screenshot when a game has multiple imports', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        created_at: '2026-07-04T07:00:00.000Z',
        detected_source: 'manual_web_import',
        id: 'import-new',
        line_count: 2,
        parse_status: 'saved_as_draft',
        raw_log_text: 'new raw log',
        screenshot_original_name: null,
      },
      error: null,
    });
    const limit = vi.fn().mockReturnThis();
    const order = vi.fn().mockReturnThis();
    const eq = vi.fn().mockReturnThis();
    const select = vi.fn().mockReturnThis();
    const screenshotMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        original_name: 'new-screenshot.png',
      },
      error: null,
    });
    const screenshotLimit = vi.fn().mockReturnThis();
    const screenshotOrder = vi.fn().mockReturnThis();
    const screenshotEq = vi.fn().mockReturnThis();
    const screenshotSelect = vi.fn().mockReturnThis();

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

        if (table === 'game_result_screenshot_imports') {
          return {
            eq: screenshotEq,
            limit: screenshotLimit,
            maybeSingle: screenshotMaybeSingle,
            order: screenshotOrder,
            select: screenshotSelect,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    const result = await repo.getLatestGameLogImportSummary({
      gameId: 'game-1',
    });

    expect(eq).toHaveBeenCalledWith('game_id', 'game-1');
    expect(screenshotEq).toHaveBeenCalledWith(
      'game_log_import_id',
      'import-new',
    );
    expect(result).toEqual({
      createdAt: '2026-07-04T07:00:00.000Z',
      detectedSource: 'manual_web_import',
      id: 'import-new',
      lineCount: 2,
      parseStatus: 'saved_as_draft',
      rawLogText: 'new raw log',
      screenshotOriginalName: 'new-screenshot.png',
    });
  });

  it('falls back to legacy screenshot metadata on game_log_imports when no split screenshot row exists', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        created_at: '2026-07-02T18:00:00.000Z',
        detected_source: 'manual_web_import',
        id: 'legacy-import-1',
        line_count: 4,
        parse_status: 'saved_as_draft',
        raw_log_text: 'legacy raw log',
        screenshot_original_name: 'legacy-endgame.png',
      },
      error: null,
    });
    const limit = vi.fn().mockReturnThis();
    const order = vi.fn().mockReturnThis();
    const eq = vi.fn().mockReturnThis();
    const select = vi.fn().mockReturnThis();
    const screenshotMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const screenshotLimit = vi.fn().mockReturnThis();
    const screenshotOrder = vi.fn().mockReturnThis();
    const screenshotEq = vi.fn().mockReturnThis();
    const screenshotSelect = vi.fn().mockReturnThis();

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

        if (table === 'game_result_screenshot_imports') {
          return {
            eq: screenshotEq,
            limit: screenshotLimit,
            maybeSingle: screenshotMaybeSingle,
            order: screenshotOrder,
            select: screenshotSelect,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    const result = await repo.getLatestGameLogImportSummary({
      gameId: 'game-1',
    });

    expect(screenshotEq).toHaveBeenCalledWith(
      'game_log_import_id',
      'legacy-import-1',
    );
    expect(result).toEqual({
      createdAt: '2026-07-02T18:00:00.000Z',
      detectedSource: 'manual_web_import',
      id: 'legacy-import-1',
      lineCount: 4,
      parseStatus: 'saved_as_draft',
      rawLogText: 'legacy raw log',
      screenshotOriginalName: 'legacy-endgame.png',
    });
  });

  it('falls back to legacy screenshot metadata when the split screenshot table is missing', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        created_at: '2026-07-04T09:48:00.000Z',
        detected_source: 'manual_web_import',
        id: 'legacy-import-2',
        line_count: 5,
        parse_status: 'saved_as_draft',
        raw_log_text: 'legacy screenshot table missing',
        screenshot_original_name: 'legacy-only.png',
      },
      error: null,
    });
    const limit = vi.fn().mockReturnThis();
    const order = vi.fn().mockReturnThis();
    const eq = vi.fn().mockReturnThis();
    const select = vi.fn().mockReturnThis();
    const screenshotMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: 'PGRST205',
        details: null,
        hint: "Perhaps you meant the table 'public.game_log_imports'",
        message:
          "Could not find the table 'public.game_result_screenshot_imports' in the schema cache",
      },
    });
    const screenshotLimit = vi.fn().mockReturnThis();
    const screenshotOrder = vi.fn().mockReturnThis();
    const screenshotEq = vi.fn().mockReturnThis();
    const screenshotSelect = vi.fn().mockReturnThis();

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

        if (table === 'game_result_screenshot_imports') {
          return {
            eq: screenshotEq,
            limit: screenshotLimit,
            maybeSingle: screenshotMaybeSingle,
            order: screenshotOrder,
            select: screenshotSelect,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    const result = await repo.getLatestGameLogImportSummary({
      gameId: 'game-2',
    });

    expect(screenshotEq).toHaveBeenCalledWith(
      'game_log_import_id',
      'legacy-import-2',
    );
    expect(result).toEqual({
      createdAt: '2026-07-04T09:48:00.000Z',
      detectedSource: 'manual_web_import',
      id: 'legacy-import-2',
      lineCount: 5,
      parseStatus: 'saved_as_draft',
      rawLogText: 'legacy screenshot table missing',
      screenshotOriginalName: 'legacy-only.png',
    });
  });
});

describe('findDuplicateGameLogImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips the query and returns false when the log text is blank', async () => {
    const from = vi.fn();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ from } as never);

    const result = await repo.findDuplicateGameLogImport({
      groupId: 'group-1',
      rawLogText: '   ',
    });

    expect(result).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it('reports a duplicate scoped to the group and trimmed log text', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);

    const result = await repo.findDuplicateGameLogImport({
      groupId: 'group-1',
      rawLogText: '  Friday Mars won  ',
    });

    expect(result).toBe(true);
    expect(rpc).toHaveBeenCalledWith('find_duplicate_game_log_import', {
      p_group_id: 'group-1',
      p_raw_log_text: 'Friday Mars won',
    });
  });

  it('returns false when no matching import exists in the group', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);

    const result = await repo.findDuplicateGameLogImport({
      groupId: 'group-1',
      rawLogText: 'Unique log',
    });

    expect(result).toBe(false);
  });

  it('throws when the duplicate lookup query fails', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'boom' } });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);

    await expect(
      repo.findDuplicateGameLogImport({
        groupId: 'group-1',
        rawLogText: 'Some log',
      }),
    ).rejects.toEqual({ message: 'boom' });
  });
});
