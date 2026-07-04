import { afterEach, describe, expect, it } from 'vitest';
import { getPublicEnv, getServerEnv } from './env';

describe('env helpers', () => {
  const originalPublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalPublicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const originalImportBucket = process.env.SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE;

  afterEach(() => {
    if (originalPublicUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalPublicUrl;
    }

    if (originalPublicKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalPublicKey;
    }

    if (originalImportBucket === undefined) {
      delete process.env.SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE;
      return;
    }

    process.env.SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE = originalImportBucket;
  });

  it('falls back to the bundled public Supabase config when runtime env is absent', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(getPublicEnv()).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: 'https://qjtwgrjjwnqafbvkkfex.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        'sb_publishable_bOcMTVbweIlEwP5aQZIjKQ_1LbYrmHG',
    });
  });

  it('honors explicit public Supabase env overrides', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://override.example.com';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'override-publishable-key';

    expect(getPublicEnv()).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: 'https://override.example.com',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'override-publishable-key',
    });
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
