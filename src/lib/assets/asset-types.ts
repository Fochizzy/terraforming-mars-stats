/**
 * Shared asset contract for Phase 1, Step 1.2.
 *
 * A resolved asset always carries its canonical identity, presentation intent,
 * source/access boundary, and deterministic fallback. An unavailable asset is
 * data, not an exception: callers can render it without inventing an image URL.
 */

export const assetFamilies = [
  'corporation-logo',
  'score-source',
  'tag-icon',
  'card-image',
  'map-graphic',
  'prelude-graphic',
  'milestone-graphic',
  'award-graphic',
  'brand',
  'background',
  'import-evidence',
] as const;

export type AssetFamily = (typeof assetFamilies)[number];

export type PublicAssetBucket =
  | 'tm-card-full'
  | 'tm-card-thumbs'
  | 'tm-corporation-logos'
  | 'tm-map-images'
  | 'tm-score-icons'
  | 'tm-tag-icons';

export type PrivateAssetBucket = 'tm-import-evidence';

export type AssetFallbackMetadata = {
  /** Visual treatment used when no image can be shown. */
  kind: 'initials' | 'label';
  /** Full entity label retained for long-name and accessible fallbacks. */
  label: string;
  /** Stable compact label shown inside constrained fallback containers. */
  shortLabel: string;
  /** Complete status message; never conveyed by color alone. */
  message: string;
};

export type AssetUnavailableReason =
  | 'expired-signed-url'
  | 'invalid-canonical-key'
  | 'invalid-url'
  | 'malformed-path'
  | 'missing-configuration'
  | 'missing-path'
  | 'source-unavailable'
  | 'unsigned-private-url'
  | 'unsupported-key';

export type PublicStorageAssetSource = {
  type: 'public-storage';
  access: 'public';
  bucket: PublicAssetBucket;
  path: string;
};

export type SignedStorageAssetSource = {
  type: 'signed-storage';
  access: 'private';
  bucket: PrivateAssetBucket;
  path: string;
  expiresAt: string;
};

export type BundledStaticAssetSource = {
  type: 'bundled-static';
  access: 'bundled';
  path: string;
};

export type PublicStaticAssetSource = {
  type: 'public-static';
  access: 'public';
  path: string;
};

export type ExternalAssetSource = {
  type: 'external-url';
  access: 'public';
  url: string;
};

export type UnavailableAssetSource = {
  type: 'unavailable';
  access: 'unavailable';
  reason: AssetUnavailableReason;
};

export type AssetSource =
  | PublicStorageAssetSource
  | SignedStorageAssetSource
  | BundledStaticAssetSource
  | PublicStaticAssetSource
  | ExternalAssetSource
  | UnavailableAssetSource;

type AssetMetadataBase = {
  /** Stable normalized ID, code, slug, or other canonical entity key. */
  canonicalKey: string;
  family: AssetFamily;
  /** Empty only when `decorative` is true. */
  alt: string;
  decorative: boolean;
  /** Intrinsic dimensions, when confirmed by tracked metadata. */
  width?: number;
  height?: number;
  /** Width divided by height, when confirmed or contractually fixed. */
  aspectRatio?: number;
  fallback: AssetFallbackMetadata;
};

export type AvailableAsset = AssetMetadataBase & {
  status: 'available';
  url: string;
  source:
    | PublicStorageAssetSource
    | SignedStorageAssetSource
    | BundledStaticAssetSource
    | PublicStaticAssetSource
    | ExternalAssetSource;
};

export type UnavailableAsset = AssetMetadataBase & {
  status: 'unavailable';
  url: null;
  source: UnavailableAssetSource;
};

export type ResolvedAsset = AvailableAsset | UnavailableAsset;

export type AssetPresentationIntent = {
  /** Decorative images render with `alt=""` and are hidden from assistive tech. */
  decorative?: boolean;
  /** Optional informative override. Ignored for decorative images. */
  alt?: string;
};
