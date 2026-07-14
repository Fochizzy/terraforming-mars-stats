'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { isRenderableCardImage } from '@/features/catalog/card-image';
import type { CardImageMeta } from '@/lib/db/selection-stats-repo';

export type SelectionWinScope = {
  plays: number;
  winRate: number;
};

export type SelectionDialogEntry = {
  global: SelectionWinScope | null;
  personal: SelectionWinScope | null;
};

function formatWinRate(scope: SelectionWinScope | null) {
  if (!scope || scope.plays <= 0) {
    return '—';
  }
  return `${Math.round(scope.winRate * 100)}%`;
}

function StatBlock({
  label,
  scope,
}: {
  label: string;
  scope: SelectionWinScope | null;
}) {
  const plays = scope?.plays ?? 0;
  const wins = scope ? Math.round(scope.plays * scope.winRate) : 0;

  return (
    <div className="tm-stat-card">
      <p className="tm-data-label">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-stone-100">
        {formatWinRate(scope)}
      </p>
      <p className="tm-muted-copy mt-1 text-sm">
        {plays > 0
          ? `${wins}/${plays} ${plays === 1 ? 'game' : 'games'}`
          : 'No games recorded yet'}
      </p>
    </div>
  );
}

function SelectionStatsDialog({
  entry,
  kind,
  meta,
  name,
  onClose,
}: {
  entry: SelectionDialogEntry | undefined;
  kind: 'Corporation' | 'Prelude';
  meta: CardImageMeta | undefined;
  name: string;
  onClose: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const candidateImage = meta?.fullImageUrl ?? meta?.thumbnailUrl ?? null;
  const image =
    !imageFailed && isRenderableCardImage(candidateImage) ? candidateImage : null;

  return (
    <div
      aria-label={`${name} statistics`}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="tm-panel max-h-[90vh] w-full max-w-md overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="tm-data-label text-xs">{kind}</p>
            <h2 className="tm-panel-title text-lg font-semibold">{name}</h2>
          </div>
          <button
            aria-label="Close"
            className="tm-button-secondary px-3 py-1 text-sm"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        {image ? (
          <div className="mt-4 flex justify-center">
            <Image
              alt={`${name} card`}
              className="max-h-[320px] w-auto rounded-md object-contain"
              height={440}
              onError={() => setImageFailed(true)}
              src={image}
              unoptimized
              width={315}
            />
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatBlock label="Your win rate" scope={entry?.personal ?? null} />
          <StatBlock label="Global win rate" scope={entry?.global ?? null} />
        </div>

        {isRenderableCardImage(meta?.fullImageUrl) ? (
          <a
            className="tm-button-secondary mt-4 inline-flex w-fit px-4 py-2 text-sm"
            href={meta?.fullImageUrl ?? undefined}
            rel="noreferrer"
            target="_blank"
          >
            Open full image
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function SelectionStatsButton({
  className,
  entry,
  kind,
  meta,
  name,
}: {
  className?: string;
  entry: SelectionDialogEntry | undefined;
  kind: 'Corporation' | 'Prelude';
  meta: CardImageMeta | undefined;
  name: string;
}) {
  const [open, setOpen] = useState(false);

  // If neither catalog art nor stats are available, keep the label inert.
  if (!meta && !entry) {
    return <span className={className}>{name}</span>;
  }

  return (
    <>
      <button
        aria-label={`Show statistics for ${name}`}
        className={className}
        onClick={() => setOpen(true)}
        type="button"
      >
        {name}
      </button>
      {open ? (
        <SelectionStatsDialog
          entry={entry}
          kind={kind}
          meta={meta}
          name={name}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
