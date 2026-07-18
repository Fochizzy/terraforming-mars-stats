import { getPublicEnv } from '@/lib/env';

export type PublicGameAssetBucket =
  | 'tm-corporation-logos'
  | 'tm-score-icons'
  | 'tm-tag-icons';

// The three asset families were replaced in Supabase on 2026-07-18. Keeping
// the version in the URL prevents a browser from reusing an older object that
// was uploaded at the same Storage path.
export const GAME_ASSET_CACHE_NONCE = '20260718-v2';

export function buildSupabaseGameAssetUrl({
  bucket,
  cacheNonce = GAME_ASSET_CACHE_NONCE,
  path,
  supabaseUrl,
}: {
  bucket: PublicGameAssetBucket;
  cacheNonce?: string;
  path: string;
  supabaseUrl: string;
}) {
  const baseUrl = supabaseUrl.replace(/\/+$/, '');
  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${baseUrl}/storage/v1/object/public/${bucket}/${encodedPath}?cacheNonce=${encodeURIComponent(cacheNonce)}`;
}

export function getSupabaseGameAssetUrl(
  bucket: PublicGameAssetBucket,
  path: string,
) {
  return buildSupabaseGameAssetUrl({
    bucket,
    path,
    supabaseUrl: getPublicEnv().NEXT_PUBLIC_SUPABASE_URL,
  });
}
