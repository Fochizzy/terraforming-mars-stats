import { afterEach, describe, expect, it } from 'vitest';
import { getServerEnv } from './env';

describe('getServerEnv', () => {
  const originalImportBucket = process.env.SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE;

  afterEach(() => {
    if (originalImportBucket === undefined) {
      delete process.env.SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE;
      return;
    }

    process.env.SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE = originalImportBucket;
  });

  it('defaults the import evidence bucket for runtime reads', () => {
    delete process.env.SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE;

    expect(getServerEnv().SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE).toBe(
      'tm-import-evidence',
    );
  });

  it('honors an explicit import evidence bucket override', () => {
    process.env.SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE = 'custom-imports';

    expect(getServerEnv().SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE).toBe(
      'custom-imports',
    );
  });
});
