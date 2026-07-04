import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import * as repo from './game-import-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('saveGameLogImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE;
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
    expect(importInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        created_by_user_id: 'user-1',
        detected_source: 'manual_web_import',
        game_id: 'game-1',
        line_count: 2,
        parse_status: 'saved_as_draft',
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
        detected_layout: null,
        extracted_fields: {},
        file_size_bytes: screenshotFile.size,
        game_id: 'game-1',
        game_log_import_id: 'import-1',
        mime_type: 'image/png',
        ocr_engine_version: 'pending',
        original_name: 'Endgame Results!!.PNG',
        parse_status: 'saved_as_draft',
        storage_object_path: result.screenshotObjectPath,
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

  it('cleans up the raw import row and uploaded screenshot when screenshot metadata insert fails', async () => {
    const upload = vi.fn().mockResolvedValue({
      data: { path: 'game-3/failing-endgame-png' },
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
      data: { id: 'import-failed' },
      error: null,
    });
    const cleanupEq = vi.fn().mockResolvedValue({
      error: null,
    });
    const cleanupDelete = vi.fn(() => ({
      eq: cleanupEq,
    }));
    const screenshotInsert = vi.fn().mockReturnThis();
    const screenshotSelect = vi.fn().mockReturnThis();
    const screenshotSingle = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('screenshot insert failed'),
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
    ).rejects.toThrow('screenshot insert failed');

    expect(cleanupDelete).toHaveBeenCalledTimes(1);
    expect(cleanupEq).toHaveBeenCalledWith('id', 'import-failed');
    expect(remove).toHaveBeenCalledWith([
      expect.stringMatching(/^game-3\/[a-z0-9-]+-failing-endgame-png$/),
    ]);
  });
});

describe('saveGameLogEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts parsed game log events and only prunes stale rows after the replacement write succeeds', async () => {
    const staleDeleteNot = vi.fn().mockResolvedValue({
      error: null,
    });
    const staleDeleteEq = vi.fn(() => ({
      not: staleDeleteNot,
    }));
    const staleDelete = vi.fn(() => ({
      eq: staleDeleteEq,
    }));
    const upsert = vi.fn().mockReturnThis();
    const select = vi.fn().mockReturnThis();
    const order = vi.fn().mockResolvedValue({
      data: [
        { id: 'event-1', event_order: 1 },
        { id: 'event-2', event_order: 2 },
      ],
      error: null,
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'game_log_events') {
          return {
            delete: staleDelete,
            order,
            select,
            upsert,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    const result = await repo.saveGameLogEvents({
      events: [
        {
          confidenceLevel: 'high',
          eventOrder: 1,
          eventType: 'generation_started',
          gamePlayerId: 'game-player-1',
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

    expect(upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        confidence_level: 'high',
        event_order: 1,
        event_type: 'generation_started',
        game_log_import_id: 'import-1',
        generation_number: 4,
        line_classification: 'event',
        payload: { generation: 4 },
        raw_line: 'Generation 4',
      }),
      expect.objectContaining({
        board_space: '29',
        confidence_level: 'medium',
        event_order: 2,
        event_type: 'tile_placed',
        game_log_import_id: 'import-1',
        line_classification: 'event',
        payload: { tileType: 'greenery' },
        raw_line: 'Izzy placed greenery tile at 29',
        tile_type: 'greenery',
      }),
    ], {
      onConflict: 'game_log_import_id,event_order',
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.not.arrayContaining([
        expect.objectContaining({
          game_player_id: expect.anything(),
        }),
      ]),
      expect.anything(),
    );
    expect(staleDelete).toHaveBeenCalledTimes(1);
    expect(staleDeleteEq).toHaveBeenCalledWith(
      'game_log_import_id',
      'import-1',
    );
    expect(staleDeleteNot).toHaveBeenCalledWith('event_order', 'in', '(1,2)');
    expect(result).toEqual([
      { eventOrder: 1, id: 'event-1' },
      { eventOrder: 2, id: 'event-2' },
    ]);
  });

  it('does not clear previously saved rows when the replacement upsert fails', async () => {
    const staleDeleteNot = vi.fn().mockResolvedValue({
      error: null,
    });
    const staleDeleteEq = vi.fn(() => ({
      not: staleDeleteNot,
    }));
    const staleDelete = vi.fn(() => ({
      eq: staleDeleteEq,
    }));
    const upsert = vi.fn().mockReturnThis();
    const select = vi.fn().mockReturnThis();
    const order = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('event upsert failed'),
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'game_log_events') {
          return {
            delete: staleDelete,
            order,
            select,
            upsert,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
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
    ).rejects.toThrow('event upsert failed');

    expect(staleDelete).not.toHaveBeenCalled();
    expect(staleDeleteEq).not.toHaveBeenCalled();
    expect(staleDeleteNot).not.toHaveBeenCalled();
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
    expect(screenshotSelect).toHaveBeenCalledWith('original_name');
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
      parseStatus: 'saved_as_draft',
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
});
