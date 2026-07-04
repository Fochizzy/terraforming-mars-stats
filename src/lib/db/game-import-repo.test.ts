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
