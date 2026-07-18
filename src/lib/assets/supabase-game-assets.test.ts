import { describe, expect, it } from 'vitest';
import {
  buildSupabaseGameAssetUrl,
  GAME_ASSET_CACHE_NONCE,
} from './supabase-game-assets';

describe('Supabase game asset URLs', () => {
  it('encodes file names while preserving Storage folders', () => {
    expect(
      buildSupabaseGameAssetUrl({
        bucket: 'tm-score-icons',
        path: 'axis/Terraform Rating.png',
        supabaseUrl: 'https://example.supabase.co/',
      }),
    ).toBe(
      `https://example.supabase.co/storage/v1/object/public/tm-score-icons/axis/Terraform%20Rating.png?cacheNonce=${GAME_ASSET_CACHE_NONCE}`,
    );
  });

  it('supports content-hashed corporation logo paths', () => {
    expect(
      buildSupabaseGameAssetUrl({
        bucket: 'tm-corporation-logos',
        path: 'corporation-logo-abc123.png',
        supabaseUrl: 'https://example.supabase.co',
      }),
    ).toContain('/tm-corporation-logos/corporation-logo-abc123.png?cacheNonce=');
  });
});
