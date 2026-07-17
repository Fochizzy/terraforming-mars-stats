import bannerImage from '../../../assets/banner.png';
import type {
  AssetPresentationIntent,
  AvailableAsset,
  ResolvedAsset,
} from './asset-types';
import { buildAssetFallback, normalizeAssetLookupKey } from './asset-resolver';

export type StaticSiteAssetKey =
  | 'application-banner'
  | 'auth-mars-background'
  | 'global-mars-background';

type StaticSiteAssetDefinition = {
  alt: string;
  decorative: boolean;
  family: 'background' | 'brand';
  height: number;
  label: string;
  path: string;
  sourceType: 'bundled-static' | 'public-static';
  width: number;
};

const importedBanner = bannerImage as unknown as string | { src: string };
const bannerPath =
  typeof importedBanner === 'string' ? importedBanner : importedBanner.src;

const staticSiteAssets = {
  'application-banner': {
    alt: 'Terraforming Mars Statistics',
    decorative: false,
    family: 'brand',
    height: 793,
    label: 'Terraforming Mars Statistics',
    path: bannerPath,
    sourceType: 'bundled-static',
    width: 1983,
  },
  'auth-mars-background': {
    alt: '',
    decorative: true,
    family: 'background',
    height: 341,
    label: 'Authentication Mars background',
    path: '/auth-mars-background.svg',
    sourceType: 'public-static',
    width: 512,
  },
  'global-mars-background': {
    alt: '',
    decorative: true,
    family: 'background',
    height: 549,
    label: 'Global Mars background',
    path: '/mars-background.png',
    sourceType: 'public-static',
    width: 975,
  },
} as const satisfies Record<StaticSiteAssetKey, StaticSiteAssetDefinition>;

/** Tracked brand/background metadata only; this does not integrate any page. */
export function resolveStaticSiteAsset(
  key: StaticSiteAssetKey,
  intent: AssetPresentationIntent = {},
): ResolvedAsset {
  const definition = staticSiteAssets[key];
  const canonicalKey = normalizeAssetLookupKey(key) ?? key;
  const decorative = intent.decorative ?? definition.decorative;
  const alt = decorative ? '' : intent.alt?.trim() || definition.alt;
  const source =
    definition.sourceType === 'bundled-static'
      ? {
          access: 'bundled' as const,
          path: definition.path,
          type: 'bundled-static' as const,
        }
      : {
          access: 'public' as const,
          path: definition.path,
          type: 'public-static' as const,
        };

  return {
    alt,
    aspectRatio: definition.width / definition.height,
    canonicalKey,
    decorative,
    fallback: buildAssetFallback(definition.family, definition.label),
    family: definition.family,
    height: definition.height,
    source,
    status: 'available',
    url: definition.path,
    width: definition.width,
  } satisfies AvailableAsset;
}
