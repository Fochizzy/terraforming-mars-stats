import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import * as repo from './player-import-alias-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('savePlayerImportAlias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts a normalized alias scoped to the active group', async () => {
    const upsert = vi.fn().mockResolvedValue({
      error: null,
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'player_import_aliases') {
          return {
            upsert,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    await repo.savePlayerImportAlias({
      aliasText: ' Izzy H. ',
      groupId: 'group-1',
      playerId: 'player-1',
      sourceType: 'screenshot_ocr',
    });

    expect(upsert).toHaveBeenCalledWith(
      {
        alias_text: ' Izzy H. ',
        group_id: 'group-1',
        normalized_alias: 'izzy h',
        player_id: 'player-1',
        source_type: 'screenshot_ocr',
      },
      {
        onConflict: 'group_id,source_type,normalized_alias',
      },
    );
  });
});

describe('listPlayerImportAliasesForGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists saved aliases for one group only', async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [
        {
          alias_text: 'Izzy H.',
          normalized_alias: 'izzy h',
          player_id: 'player-1',
          source_type: 'screenshot_ocr',
        },
      ],
      error: null,
    });
    const select = vi.fn().mockReturnThis();

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'player_import_aliases') {
          return {
            eq,
            select,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    const result = await repo.listPlayerImportAliasesForGroup('group-1');

    expect(select).toHaveBeenCalledWith(
      'alias_text, normalized_alias, player_id, source_type',
    );
    expect(eq).toHaveBeenCalledWith('group_id', 'group-1');
    expect(result).toEqual([
      {
        aliasText: 'Izzy H.',
        normalizedAlias: 'izzy h',
        playerId: 'player-1',
        sourceType: 'screenshot_ocr',
      },
    ]);
  });

  /**
   * `player_import_aliases` is granted to service_role only, so the signed-in
   * reader gets 42501. Alias hints are a matching aid, not a requirement, and
   * losing them must not fail the import the way it did on the live site.
   */
  it('returns no aliases when the current role may not read them', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const eq = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: '42501',
        hint: 'Grant the required privileges to the current role with: GRANT SELECT ON public.player_import_aliases TO authenticated;',
        message: 'permission denied for table player_import_aliases',
      },
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn(() => ({ eq, select: vi.fn().mockReturnThis() })),
    } as never);

    await expect(
      repo.listPlayerImportAliasesForGroup('group-1'),
    ).resolves.toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);

    warn.mockRestore();
  });

  it('still throws when the read fails for any other reason', async () => {
    const eq = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST205', message: 'relation does not exist' },
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn(() => ({ eq, select: vi.fn().mockReturnThis() })),
    } as never);

    await expect(
      repo.listPlayerImportAliasesForGroup('group-1'),
    ).rejects.toMatchObject({ code: 'PGRST205' });
  });
});
