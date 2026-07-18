import { getPublicEnv } from '@/lib/env';
import type {
  AssetFallbackMetadata,
  AssetFamily,
  AssetPresentationIntent,
  AssetUnavailableReason,
  AvailableAsset,
  PrivateAssetBucket,
  PublicAssetBucket,
  ResolvedAsset,
  UnavailableAsset,
} from './asset-types';

export type AssetResolverOptions = {
  /** Test/preview override. `null` explicitly represents missing configuration. */
  supabaseUrl?: string | null;
};

export type ScoreSourceKey =
  | 'animal'
  | 'award'
  | 'card'
  | 'city'
  | 'greenery'
  | 'jovian'
  | 'microbe'
  | 'milestone'
  | 'other_card'
  | 'tr';

export type ScoreSourceVariant = 'axis' | 'standard';

export type TagCode =
  | 'animal'
  | 'building'
  | 'city'
  | 'clone'
  | 'crime'
  | 'earth'
  | 'event'
  | 'jovian'
  | 'mars'
  | 'microbe'
  | 'moon'
  | 'plant'
  | 'power'
  | 'science'
  | 'space'
  | 'venus'
  | 'wild';

export const LOG_GAME_BACKGROUND_STORAGE_PATH =
  'backgrounds/log-game-mars-horizon-f78061b5.png';

type CommonAssetInput = AssetPresentationIntent & {
  canonicalKey: string | null | undefined;
  family: AssetFamily;
  label: string | null | undefined;
  width?: number;
  height?: number;
  aspectRatio?: number;
};

const fallbackCodeByFamily = {
  'award-graphic': 'AW',
  background: 'BG',
  brand: 'TM',
  'card-image': 'CD',
  'corporation-logo': 'CO',
  'import-evidence': 'EV',
  'map-graphic': 'MP',
  'milestone-graphic': 'MS',
  'prelude-graphic': 'PR',
  'score-source': 'SC',
  'tag-icon': 'TG',
} as const satisfies Record<AssetFamily, string>;

const scoreSourceRegistry = {
  animal: { label: 'Animal', path: 'Animal.png' },
  award: { label: 'Awards', path: 'Awards.png' },
  card: { label: 'Card Points', path: 'Card_Points.png' },
  city: { label: 'Cities', path: 'City.png' },
  greenery: { label: 'Greenery', path: 'Greenery.png' },
  jovian: { label: 'Jovian', path: 'Jovian.png' },
  microbe: { label: 'Microbe', path: 'Microbe.png' },
  milestone: { label: 'Milestones', path: 'Milestones.png' },
  'other-card': { label: 'Other Card', path: 'Other_Card.png' },
  tr: { label: 'Terraform Rating', path: 'Terraform_Rating.png' },
} as const;

const tagIconPathByCode = {
  animal: 'animal.webp',
  building: 'building.webp',
  city: 'city.webp',
  earth: 'earth.webp',
  event: 'event.webp',
  jovian: 'jovian.webp',
  mars: 'mars.webp',
  microbe: 'microbe.webp',
  moon: 'moon.webp',
  plant: 'plant.webp',
  power: 'power.webp',
  science: 'science.webp',
  space: 'space.webp',
  venus: 'venus.webp',
  wild: 'wild.webp',
} as const;

const unavailableTagCodes = new Set(['clone', 'crime']);

/**
 * Normalizes stable lookup keys once: Unicode compatibility form, trimmed,
 * case-insensitive, with whitespace/underscore separators represented as `-`.
 * Display names must not be passed in place of canonical IDs/codes.
 */
export function normalizeAssetLookupKey(
  value: string | null | undefined,
): string | null {
  const normalized = value
    ?.normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');

  return normalized ? normalized : null;
}

/**
 * Returns a decoded canonical object path. Absolute/root-relative URLs,
 * traversal, empty segments, query/hash fragments, and ambiguous separators
 * are rejected rather than guessed.
 */
export function normalizeStoredAssetPath(
  value: string | null | undefined,
): string | null {
  const candidate = value?.trim();
  if (
    !candidate ||
    candidate.startsWith('/') ||
    candidate.includes('\\') ||
    candidate.includes('?') ||
    candidate.includes('#') ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return null;
  }

  const segments = candidate.split('/');
  if (segments.some((segment) => segment.length === 0)) {
    return null;
  }

  const decodedSegments: string[] = [];
  for (const segment of segments) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return null;
    }
    if (
      !decoded ||
      decoded === '.' ||
      decoded === '..' ||
      decoded.includes('/') ||
      decoded.includes('\\') ||
      decoded.includes('?') ||
      decoded.includes('#') ||
      /[\u0000-\u001f\u007f]/.test(decoded)
    ) {
      return null;
    }
    decodedSegments.push(decoded);
  }

  return decodedSegments.join('/');
}

function normalizeHttpUrl(
  value: string | null | undefined,
  { allowSigned }: { allowSigned: boolean },
): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const localHttp =
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    if ((url.protocol !== 'https:' && !localHttp) || url.username || url.password) {
      return null;
    }
    if (
      !allowSigned &&
      (url.pathname.includes('/storage/v1/object/sign/') ||
        url.searchParams.has('token') ||
        url.searchParams.has('apikey'))
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function getSupabaseUrl(options?: AssetResolverOptions): string | null {
  if (options && Object.prototype.hasOwnProperty.call(options, 'supabaseUrl')) {
    return options.supabaseUrl ?? null;
  }

  try {
    return getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
  } catch {
    return null;
  }
}

export function buildPublicStorageUrl({
  bucket,
  path,
  supabaseUrl,
}: {
  bucket: PublicAssetBucket;
  path: string;
  supabaseUrl: string;
}): string | null {
  const baseUrl = normalizeHttpUrl(supabaseUrl, { allowSigned: false });
  const normalizedPath = normalizeStoredAssetPath(path);
  if (!baseUrl || !normalizedPath) {
    return null;
  }

  const encodedPath = encodeStoredAssetPath(normalizedPath);

  return `${baseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

function encodeStoredAssetPath(normalizedPath: string): string {
  return normalizedPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function buildAssetFallback(
  family: AssetFamily,
  label: string | null | undefined,
): AssetFallbackMetadata {
  const normalizedLabel = label?.trim().replace(/\s+/g, ' ') || 'Asset';
  const words = normalizedLabel.match(/[\p{L}\p{N}]+/gu) ?? [];
  const shortLabel =
    words.length >= 2
      ? `${words[0]!.charAt(0)}${words[1]!.charAt(0)}`.toUpperCase()
      : words.length === 1
        ? words[0]!.slice(0, 2).toUpperCase()
        : fallbackCodeByFamily[family];

  return {
    kind: family === 'corporation-logo' ? 'initials' : 'label',
    label: normalizedLabel,
    shortLabel: shortLabel || fallbackCodeByFamily[family],
    message: `${normalizedLabel} image unavailable`,
  };
}

function buildBase(input: CommonAssetInput) {
  const canonicalKey = normalizeAssetLookupKey(input.canonicalKey);
  const fallback = buildAssetFallback(input.family, input.label);
  const decorative = input.decorative ?? false;
  const defaultAlt = `${fallback.label} image`;

  return {
    alt: decorative ? '' : input.alt?.trim() || defaultAlt,
    aspectRatio: input.aspectRatio,
    canonicalKey,
    decorative,
    fallback,
    family: input.family,
    height: input.height,
    width: input.width,
  };
}

function unavailableAsset(
  input: CommonAssetInput,
  reason: AssetUnavailableReason,
): UnavailableAsset {
  const base = buildBase(input);
  return {
    ...base,
    canonicalKey: base.canonicalKey ?? 'unknown',
    source: { access: 'unavailable', reason, type: 'unavailable' },
    status: 'unavailable',
    url: null,
  };
}

function resolvePublicStorageAsset(
  input: CommonAssetInput & {
    bucket: PublicAssetBucket;
    path: string | null | undefined;
  },
  options?: AssetResolverOptions,
): ResolvedAsset {
  const base = buildBase(input);
  if (!base.canonicalKey) {
    return unavailableAsset(input, 'invalid-canonical-key');
  }
  if (!input.path?.trim()) {
    return unavailableAsset(input, 'missing-path');
  }
  const normalizedPath = normalizeStoredAssetPath(input.path);
  if (!normalizedPath) {
    return unavailableAsset(input, 'malformed-path');
  }
  const supabaseUrl = getSupabaseUrl(options);
  if (!supabaseUrl) {
    return unavailableAsset(input, 'missing-configuration');
  }
  const url = buildPublicStorageUrl({
    bucket: input.bucket,
    path: normalizedPath,
    supabaseUrl,
  });
  if (!url) {
    return unavailableAsset(input, 'missing-configuration');
  }

  return {
    ...base,
    canonicalKey: base.canonicalKey,
    source: {
      access: 'public',
      bucket: input.bucket,
      path: normalizedPath,
      type: 'public-storage',
    },
    status: 'available',
    url,
  };
}

function resolveExternalAsset(
  input: CommonAssetInput & { url: string | null | undefined },
): ResolvedAsset {
  const base = buildBase(input);
  if (!base.canonicalKey) {
    return unavailableAsset(input, 'invalid-canonical-key');
  }
  const url = normalizeHttpUrl(input.url, { allowSigned: false });
  if (!url) {
    return unavailableAsset(input, 'invalid-url');
  }
  return {
    ...base,
    canonicalKey: base.canonicalKey,
    source: { access: 'public', type: 'external-url', url },
    status: 'available',
    url,
  };
}

export function resolveCorporationLogoAsset(
  input: AssetPresentationIntent & {
    corporationId: string | null | undefined;
    logoPath: string | null | undefined;
    name: string | null | undefined;
  },
  options?: AssetResolverOptions,
): ResolvedAsset {
  const label = input.name?.trim() || 'Corporation';
  return resolvePublicStorageAsset(
    {
      ...input,
      alt: input.alt ?? `${label} logo`,
      aspectRatio: 1,
      bucket: 'tm-corporation-logos',
      canonicalKey: input.corporationId,
      family: 'corporation-logo',
      label,
      path: input.logoPath,
    },
    options,
  );
}

export function resolveLogGameBackgroundAsset(
  options?: AssetResolverOptions,
): ResolvedAsset {
  return resolvePublicStorageAsset(
    {
      aspectRatio: 1.5,
      bucket: 'tm-map-images',
      canonicalKey: 'log-game-mars-horizon-f78061b5',
      decorative: true,
      family: 'background',
      height: 1024,
      label: 'Log a Game Mars landscape',
      path: LOG_GAME_BACKGROUND_STORAGE_PATH,
      width: 1536,
    },
    options,
  );
}

export function resolveScoreSourceAsset(
  key: ScoreSourceKey,
  options?: AssetResolverOptions &
    AssetPresentationIntent & { variant?: ScoreSourceVariant },
): ResolvedAsset {
  const canonicalKey = normalizeAssetLookupKey(key);
  const definition = canonicalKey
    ? scoreSourceRegistry[canonicalKey as keyof typeof scoreSourceRegistry]
    : undefined;
  const label = definition?.label ?? 'Score source';
  if (!definition) {
    return unavailableAsset(
      { ...options, canonicalKey: key, family: 'score-source', label },
      'unsupported-key',
    );
  }

  const path =
    options?.variant === 'axis' ? `axis/${definition.path}` : definition.path;
  return resolvePublicStorageAsset(
    {
      ...options,
      alt: options?.alt ?? `${label} score source`,
      aspectRatio: 1,
      bucket: 'tm-score-icons',
      canonicalKey,
      family: 'score-source',
      label,
      path,
    },
    options,
  );
}

export function resolveTagIconAsset(
  input: AssetPresentationIntent & {
    tagCode: string | null | undefined;
  },
  options?: AssetResolverOptions,
): ResolvedAsset {
  const canonicalKey = normalizeAssetLookupKey(input.tagCode);
  const path = canonicalKey
    ? tagIconPathByCode[canonicalKey as keyof typeof tagIconPathByCode]
    : undefined;
  const label = canonicalKey
    ? canonicalKey.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
    : 'Tag';

  if (!canonicalKey) {
    return unavailableAsset(
      { ...input, canonicalKey, family: 'tag-icon', label },
      'invalid-canonical-key',
    );
  }
  if (!path) {
    return unavailableAsset(
      { ...input, canonicalKey, family: 'tag-icon', label },
      unavailableTagCodes.has(canonicalKey) ? 'source-unavailable' : 'unsupported-key',
    );
  }

  return resolvePublicStorageAsset(
    {
      ...input,
      alt: input.alt ?? `${label} tag`,
      aspectRatio: 1,
      bucket: 'tm-tag-icons',
      canonicalKey,
      family: 'tag-icon',
      label,
      path,
    },
    options,
  );
}

export function resolveCardImageAsset(
  input: AssetPresentationIntent & {
    sourceCardId: string | null | undefined;
    cardName: string | null | undefined;
    pathOrUrl: string | null | undefined;
    variant: 'full' | 'thumbnail';
  },
  options?: AssetResolverOptions,
): ResolvedAsset {
  const label = input.cardName?.trim() || 'Card';
  const common = {
    ...input,
    alt: input.alt ?? `${label} ${input.variant}`,
    aspectRatio: 3 / 4,
    canonicalKey: input.sourceCardId,
    family: 'card-image' as const,
    label,
  };
  const candidate = input.pathOrUrl?.trim();
  if (!candidate) {
    return unavailableAsset(common, 'missing-path');
  }
  if (/^https?:\/\//i.test(candidate)) {
    return resolveExternalAsset({ ...common, url: candidate });
  }
  return resolvePublicStorageAsset(
    {
      ...common,
      bucket: input.variant === 'thumbnail' ? 'tm-card-thumbs' : 'tm-card-full',
      path: candidate,
    },
    options,
  );
}

export function resolveMapGraphicAsset(
  input: AssetPresentationIntent & {
    mapCode: string | null | undefined;
    mapName: string | null | undefined;
    path: string | null | undefined;
    width?: number;
    height?: number;
    aspectRatio?: number;
  },
  options?: AssetResolverOptions,
): ResolvedAsset {
  const label = input.mapName?.trim() || 'Map';
  return resolvePublicStorageAsset(
    {
      ...input,
      alt: input.alt ?? `${label} map`,
      bucket: 'tm-map-images',
      canonicalKey: input.mapCode,
      family: 'map-graphic',
      label,
    },
    options,
  );
}

type UnavailableCatalogFamily =
  | 'award-graphic'
  | 'milestone-graphic'
  | 'prelude-graphic';

export function resolveUnavailableCatalogAsset(
  input: AssetPresentationIntent & {
    family: UnavailableCatalogFamily;
    canonicalKey: string | null | undefined;
    label: string | null | undefined;
  },
): ResolvedAsset {
  if (!normalizeAssetLookupKey(input.canonicalKey)) {
    return unavailableAsset(input, 'invalid-canonical-key');
  }
  return unavailableAsset(input, 'source-unavailable');
}

export function resolveSignedImportEvidenceAsset(input: {
  canonicalKey: string | null | undefined;
  label: string | null | undefined;
  objectPath: string | null | undefined;
  signedUrl: string | null | undefined;
  expiresAt: string;
  alt?: string;
  decorative?: boolean;
  width?: number;
  height?: number;
  aspectRatio?: number;
}): ResolvedAsset {
  const common: CommonAssetInput = {
    ...input,
    family: 'import-evidence',
  };
  const base = buildBase(common);
  if (!base.canonicalKey) {
    return unavailableAsset(common, 'invalid-canonical-key');
  }
  if (!input.objectPath?.trim()) {
    return unavailableAsset(common, 'missing-path');
  }
  const path = normalizeStoredAssetPath(input.objectPath);
  if (!path) {
    return unavailableAsset(common, 'malformed-path');
  }
  const url = normalizeHttpUrl(input.signedUrl, { allowSigned: true });
  if (!url) {
    return unavailableAsset(common, 'invalid-url');
  }
  const parsed = new URL(url);
  const bucket: PrivateAssetBucket = 'tm-import-evidence';
  const expectedSignedPath = `/storage/v1/object/sign/${bucket}/${encodeStoredAssetPath(path)}`;
  if (
    !parsed.pathname.endsWith(expectedSignedPath) ||
    !parsed.searchParams.has('token')
  ) {
    return unavailableAsset(common, 'unsigned-private-url');
  }
  const expiry = Date.parse(input.expiresAt);
  if (!Number.isFinite(expiry) || expiry <= Date.now()) {
    return unavailableAsset(common, 'expired-signed-url');
  }

  return {
    ...base,
    canonicalKey: base.canonicalKey,
    source: {
      access: 'private',
      bucket,
      expiresAt: new Date(expiry).toISOString(),
      path,
      type: 'signed-storage',
    },
    status: 'available',
    url,
  } satisfies AvailableAsset;
}
