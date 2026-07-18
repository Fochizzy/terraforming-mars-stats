'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { AvailableAsset } from '@/lib/assets';

/**
 * Rank is always conveyed by the visible "#N" text; the laurel is purely
 * decorative on top of it, so a failed image load just leaves the badge.
 */
export function LeaderboardRankBadge({
  laurelAsset,
  rank,
}: {
  laurelAsset: AvailableAsset | null;
  rank: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = laurelAsset !== null && !imageFailed;

  return (
    <div className="flex items-center gap-2">
      <span className="tm-data-label w-6 flex-shrink-0 text-center text-xs">
        #{rank}
      </span>
      <div className="relative h-12 w-12 flex-shrink-0">
        {showImage ? (
          <Image
            alt=""
            aria-hidden="true"
            className="object-contain"
            fill
            onError={() => setImageFailed(true)}
            src={laurelAsset.url}
            unoptimized={laurelAsset.source.type !== 'bundled-static'}
          />
        ) : null}
      </div>
    </div>
  );
}
