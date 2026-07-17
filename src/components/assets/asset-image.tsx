'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { useState } from 'react';
import type {
  AssetFallbackMetadata,
  AssetFamily,
  ResolvedAsset,
} from '@/lib/assets';

const defaultFallback: AssetFallbackMetadata = {
  kind: 'label',
  label: 'Asset',
  message: 'Asset image unavailable',
  shortLabel: 'AS',
};

export type AssetImageProps = {
  asset: ResolvedAsset | null;
  /** Used only when `asset` is null rather than an explicit unavailable result. */
  fallback?: AssetFallbackMetadata;
  /** Used only when `asset` is null. */
  family?: AssetFamily;
  /** Used only when `asset` is null. */
  decorative?: boolean;
  className?: string;
  imageClassName?: string;
  /** Display dimensions. Intrinsic metadata remains on the asset descriptor. */
  width?: number | string;
  height?: number | string;
  aspectRatio?: number;
  sizes?: string;
  loading?: 'eager' | 'lazy';
  objectFit?: 'contain' | 'cover';
};

function dimensionValue(value: number | string | undefined) {
  return typeof value === 'number' ? `${value}px` : value;
}

export function AssetImage({
  asset,
  fallback = defaultFallback,
  family = 'brand',
  decorative = false,
  className,
  imageClassName,
  width,
  height,
  aspectRatio,
  sizes,
  loading = 'lazy',
  objectFit = 'contain',
}: AssetImageProps) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const activeFamily = asset?.family ?? family;
  const activeDecorative = asset?.decorative ?? decorative;
  const activeFallback = asset?.fallback ?? fallback;
  const availableAsset = asset?.status === 'available' ? asset : null;
  const didFail = availableAsset ? failedUrl === availableAsset.url : false;
  const didLoad = availableAsset ? loadedUrl === availableAsset.url : false;
  const showFallback = !availableAsset || didFail;
  const intrinsicRatio =
    asset?.aspectRatio ??
    (asset?.width && asset.height ? asset.width / asset.height : undefined);
  const resolvedRatio = aspectRatio ?? intrinsicRatio ?? 1;
  const resolvedSizes =
    sizes ?? (typeof width === 'number' ? `${width}px` : '100vw');
  const style = {
    aspectRatio: height === undefined ? String(resolvedRatio) : undefined,
    backgroundColor: 'var(--tm-space-850)',
    borderColor: 'var(--tm-panel-border)',
    color: 'var(--tm-muted)',
    height: dimensionValue(height),
    position: 'relative',
    width: dimensionValue(width) ?? '100%',
  } satisfies CSSProperties;
  const wrapperClasses = [
    'relative inline-block min-w-0 shrink-0 overflow-hidden rounded-md border',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={wrapperClasses}
      data-asset-family={activeFamily}
      data-asset-status={showFallback ? 'fallback' : didLoad ? 'ready' : 'loading'}
      style={style}
    >
      {showFallback ? (
        <span
          aria-hidden={activeDecorative ? 'true' : undefined}
          aria-label={activeDecorative ? undefined : activeFallback.message}
          className="absolute inset-0 flex min-w-0 items-center justify-center px-1 text-center"
          role={activeDecorative ? undefined : 'img'}
          title={activeFallback.message}
        >
          <span
            aria-hidden="true"
            className="max-w-full break-words text-xs font-semibold tracking-[0.08em]"
          >
            {activeFallback.shortLabel}
          </span>
          <span
            aria-hidden="true"
            className="absolute right-1 top-0.5 text-[10px] font-bold"
          >
            !
          </span>
        </span>
      ) : (
        <>
          {!didLoad ? (
            <span
              aria-hidden={activeDecorative ? 'true' : undefined}
              className="absolute inset-0 animate-pulse"
              role={activeDecorative ? undefined : 'status'}
            >
              {!activeDecorative ? (
                <span className="sr-only">
                  Loading {activeFallback.label} image
                </span>
              ) : null}
            </span>
          ) : null}
          <Image
            alt={availableAsset.alt}
            aria-hidden={activeDecorative ? 'true' : undefined}
            className={[
              'transition-opacity duration-150',
              didLoad ? 'opacity-100' : 'opacity-0',
              objectFit === 'cover' ? 'object-cover' : 'object-contain',
              imageClassName ?? '',
            ]
              .filter(Boolean)
              .join(' ')}
            fill
            loading={loading}
            onError={() => setFailedUrl(availableAsset.url)}
            onLoad={() => setLoadedUrl(availableAsset.url)}
            sizes={resolvedSizes}
            src={availableAsset.url}
            unoptimized={availableAsset.source.type !== 'bundled-static'}
          />
        </>
      )}
    </span>
  );
}
