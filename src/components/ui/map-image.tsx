import Image from 'next/image';
import { getPublicEnv } from '@/lib/env';

// Board-map art is self-hosted in the public tm-map-images Supabase bucket,
// keyed by map code (see scripts/catalog/upload-game-asset-images.ts). Building
// the URL from the code avoids a DB round-trip for a small, fixed vocabulary.
const MAP_IMAGE_PREFIX = `${getPublicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tm-map-images/`;

// The exact set uploaded to the bucket. A map code with no image renders nothing
// instead of a broken image.
const MAP_IMAGE_CODES: ReadonlySet<string> = new Set([
  'amazonis_planitia',
  'arabia_terra',
  'elysium',
  'hellas',
  'hollandia',
  'terra_cimmeria',
  'terra_cimmeria_nova',
  'tharsis',
  'utopia_planitia',
  'vastitas_borealis',
  'vastitas_borealis_nova',
]);

export function hasMapImage(code: string): boolean {
  return MAP_IMAGE_CODES.has(code);
}

export function getMapImageUrl(code: string): string | null {
  return MAP_IMAGE_CODES.has(code) ? `${MAP_IMAGE_PREFIX}${code}.webp` : null;
}

export function MapImage({
  className,
  code,
  height = 240,
  mapName,
  width = 320,
}: {
  className?: string;
  code: string;
  height?: number;
  mapName: string;
  width?: number;
}) {
  if (!MAP_IMAGE_CODES.has(code)) {
    return null;
  }

  return (
    <Image
      alt={`${mapName} board map`}
      className={className}
      height={height}
      src={`${MAP_IMAGE_PREFIX}${code}.webp`}
      unoptimized
      width={width}
    />
  );
}
