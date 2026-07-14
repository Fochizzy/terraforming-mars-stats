import Image from 'next/image';
import { getPublicEnv } from '@/lib/env';

// Tag icons are self-hosted in the public tm-tag-icons Supabase bucket, keyed by
// tag code (see scripts/catalog/upload-game-asset-images.ts). Building the URL
// from the code avoids a DB round-trip for what is a small, fixed vocabulary.
const TAG_ICON_PREFIX = `${getPublicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tm-tag-icons/`;

// The exact set uploaded to the bucket. A tag code with no icon (e.g. an
// unexpected import value) renders as plain text instead of a broken image.
const TAG_ICON_CODES: ReadonlySet<string> = new Set([
  'animal',
  'building',
  'city',
  'earth',
  'event',
  'galactic',
  'infrastructure',
  'jovian',
  'mars',
  'mercury',
  'microbe',
  'moon',
  'plant',
  'power',
  'radiation',
  'science',
  'space',
  'tourism',
  'venus',
  'wild',
  'wild_planet',
]);

export function normalizeTagIconCode(code: string): string {
  return code.trim().toLowerCase().replace(/\s+/g, '_');
}

export function hasTagIcon(code: string): boolean {
  return TAG_ICON_CODES.has(normalizeTagIconCode(code));
}

export function TagIcon({
  className,
  code,
  size = 22,
}: {
  className?: string;
  code: string;
  /** Rendered width/height in px; icons are square. */
  size?: number;
}) {
  const normalized = normalizeTagIconCode(code);

  if (!TAG_ICON_CODES.has(normalized)) {
    return null;
  }

  return (
    <Image
      alt={`${code} tag`}
      className={className}
      height={size}
      src={`${TAG_ICON_PREFIX}${normalized}.webp`}
      unoptimized
      width={size}
    />
  );
}

/**
 * Icon + code label as a single inline unit, for the many places a tag code is
 * printed in a table or list. Falls back to just the label when no icon exists,
 * and always keeps the raw code as text so lookups by tag name still work.
 */
export function TagLabel({
  className,
  code,
  size = 20,
}: {
  className?: string;
  code: string;
  size?: number;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
      <TagIcon code={code} size={size} />
      {code}
    </span>
  );
}
