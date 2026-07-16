'use client';

import Image from 'next/image';
import { useState } from 'react';
import { getPublicEnv } from '@/lib/env';

// Board-map art is self-hosted in the tm-map-images Supabase storage bucket,
// keyed by map code. Building the URL from the code avoids a DB round-trip for
// a small, fixed vocabulary.
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
  if (!MAP_IMAGE_CODES.has(code)) {
    return null;
  }

  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  return `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tm-map-images/${code}.webp`;
}

type MapImageProps = {
  className?: string;
  code: string;
  height?: number;
  mapName: string;
  width?: number;
};

export function MapImage({
  className,
  code,
  height = 240,
  mapName,
  width = 320,
}: MapImageProps) {
  const [failed, setFailed] = useState(false);
  const url = getMapImageUrl(code);

  if (!url || failed) {
    return (
      <MapImageFallback className={className} mapName={mapName} />
    );
  }

  return (
    <Image
      alt={`${mapName} board map`}
      className={className}
      height={height}
      loading="lazy"
      onError={() => setFailed(true)}
      src={url}
      style={{ objectFit: 'contain', objectPosition: 'center' }}
      unoptimized
      width={width}
    />
  );
}

export function MapImageFallback({
  className,
  mapName,
}: {
  className?: string;
  mapName: string;
}) {
  return (
    <div
      aria-label={`Map image unavailable for ${mapName}`}
      className={className}
      role="img"
      style={{
        alignItems: 'center',
        background: 'radial-gradient(ellipse at center, rgba(42, 28, 20, 0.9), rgba(8, 11, 15, 0.95))',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      {/* Planet silhouette */}
      <svg
        aria-hidden="true"
        fill="none"
        height="48"
        viewBox="0 0 48 48"
        width="48"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="24" cy="24" fill="rgba(142, 61, 31, 0.35)" r="20" stroke="rgba(193, 119, 56, 0.4)" strokeWidth="1.5" />
        <ellipse cx="24" cy="24" fill="none" rx="24" ry="8" stroke="rgba(193, 119, 56, 0.25)" strokeWidth="1" />
      </svg>
      <span
        style={{
          color: 'var(--tm-muted)',
          fontFamily: 'var(--tm-font-display)',
          fontSize: '0.65rem',
          letterSpacing: '0.15em',
          textAlign: 'center',
          textTransform: 'uppercase',
        }}
      >
        {mapName}
      </span>
    </div>
  );
}
