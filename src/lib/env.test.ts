import { afterEach, describe, expect, it } from 'vitest';
import { getPublicEnv, getServerEnv } from './env';

describe('env helpers', () => {
  const mutableEnv = process.env as unknown as Record<string, string | undefined>;
  const originalPublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalPublicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const originalImportBucket = process.env.SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE;
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    if (originalPublicUrl === undefined) {
      delete mutableEnv['NEXT_PUBLIC_SUPABASE_URL'];
    } else {
      mutableEnv['NEXT_PUBLIC_SUPABASE_URL'] = originalPublicUrl;
    }

    if (originalPublicKey === undefined) {
      delete mutableEnv['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];
    } else {
      mutableEnv['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] = originalPublicKey;
    }

    if (originalImportBucket === undefined) {
      delete mutableEnv['SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE'];
    } else {
      mutableEnv['SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE'] = originalImportBucket;
    }

    if (originalServiceRoleKey === undefined) {
      delete mutableEnv['SUPABASE_SERVICE_ROLE_KEY'];
      return;
    }

    mutableEnv['SUPABASE_SERVICE_ROLE_KEY'] = originalServiceRoleKey;
  });

  it('falls back to the bundled public Supabase config when runtime env is absent', () => {
    delete mutableEnv['NEXT_PUBLIC_SUPABASE_URL'];
    delete mutableEnv['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];

    expect(getPublicEnv()).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: 'https://qjtwgrjjwnqafbvkkfex.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        'sb_publishable_bOcMTVbweIlEwP5aQZIjKQ_1LbYrmHG',
    });
  });

  it('honors explicit public Supabase env overrides', () => {
    mutableEnv['NEXT_PUBLIC_SUPABASE_URL'] = 'https://override.example.com';
    mutableEnv['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] = 'override-publishable-key';

    expect(getPublicEnv()).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: 'https://override.example.com',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'override-publishable-key',
    });
  });

  it('defaults the import evidence bucket for runtime reads', () => {
    delete mutableEnv['SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE'];

    expect(getServerEnv().SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE).toBe(
      'tm-import-evidence',
    );
  });

  it('honors an explicit import evidence bucket override', () => {
    mutableEnv['SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE'] = 'custom-imports';

    expect(getServerEnv().SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE).toBe(
      'custom-imports',
    );
  });

  it('strips copied BOM and surrounding whitespace from runtime secrets', () => {
    mutableEnv['SUPABASE_SERVICE_ROLE_KEY'] = '\uFEFF  sb_secret_example  ';

    expect(getServerEnv().SUPABASE_SERVICE_ROLE_KEY).toBe('sb_secret_example');
  });
});
