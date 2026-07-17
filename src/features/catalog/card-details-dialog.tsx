'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';
import type { CardLookupEntry } from '@/lib/catalog/card-lookup-types';
import { isRenderableCardImage } from './card-image';

function humanizeCode(value: string) {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function victoryPointLabel(card: CardLookupEntry) {
  if (card.victoryPointsKind === 'static') {
    return typeof card.printedVictoryPoints === 'number'
      ? `${card.printedVictoryPoints} VP`
      : 'Fixed VP';
  }

  return card.victoryPointsKind === 'dynamic' ? 'Dynamic VP' : 'No VP';
}

export function CardDetailsDialog({
  card,
  onClose,
}: {
  card: CardLookupEntry;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const activeElementRef = useRef<HTMLElement | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const candidateImage = card.fullImageUrl ?? card.thumbnailUrl;
  const image =
    !imageFailed && isRenderableCardImage(candidateImage)
      ? candidateImage
      : null;

  useEffect(() => {
    activeElementRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      activeElementRef.current?.focus();
    };
  }, [onClose]);

  return (
    <div
      aria-label={`${card.cardName} details`}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-700 bg-stone-950 p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-orange-300">
              {card.cardNumber || 'No number'}
            </p>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-stone-100">
              {card.cardName}
            </h2>
          </div>
          <button
            aria-label="Close card details"
            className="rounded-lg border border-stone-600 px-3 py-1 text-sm text-stone-100 hover:border-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            Close
          </button>
        </div>

        {image ? (
          <div className="mt-4 flex justify-center">
            <Image
              alt={`${card.cardName} card`}
              className="max-h-[360px] w-auto rounded-md object-contain"
              height={440}
              onError={() => setImageFailed(true)}
              src={image}
              unoptimized
              width={315}
            />
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-stone-700 bg-stone-900/50 p-4 text-sm text-stone-300">
            Card image unavailable.
          </p>
        )}

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-3">
            <dt className="text-xs uppercase tracking-[0.15em] text-stone-400">
              Type
            </dt>
            <dd className="mt-1 text-sm text-stone-100">{card.cardType}</dd>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-3">
            <dt className="text-xs uppercase tracking-[0.15em] text-stone-400">
              Expansion
            </dt>
            <dd className="mt-1 text-sm text-stone-100">
              {humanizeCode(card.expansionCode)}
            </dd>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-3">
            <dt className="text-xs uppercase tracking-[0.15em] text-stone-400">
              Victory points
            </dt>
            <dd className="mt-1 text-sm text-stone-100">
              {victoryPointLabel(card)}
            </dd>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-3">
            <dt className="text-xs uppercase tracking-[0.15em] text-stone-400">
              Required expansions
            </dt>
            <dd className="mt-1 text-sm text-stone-100">
              {card.requiredExpansionCodes.length > 0
                ? card.requiredExpansionCodes.map(humanizeCode).join(', ')
                : 'None recorded'}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <h3 className="text-xs uppercase tracking-[0.15em] text-stone-400">
            Tags
          </h3>
          <p className="mt-1 text-sm text-stone-100">
            {card.sourceTags.length > 0
              ? card.sourceTags.map(humanizeCode).join(', ')
              : 'No tags recorded'}
          </p>
        </div>

        <p className="mt-4 text-sm leading-6 text-stone-300">
          <GlossaryRichText>
            Tags and victory points are catalog metadata. Card outcome statistics
            require recorded gameplay evidence and coverage.
          </GlossaryRichText>
        </p>
        <p
          className="mt-3 rounded-lg border border-amber-400/50 bg-amber-300/10 p-3 text-sm text-amber-100"
          role="status"
        >
          Card outcome statistics are unavailable: the current approved catalog
          contract has no card-outcome reader.
        </p>

        {isRenderableCardImage(card.fullImageUrl) ? (
          <a
            className="mt-4 inline-flex rounded-lg border border-cyan-500/60 px-3 py-2 text-sm font-medium text-cyan-100 underline underline-offset-2 hover:border-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            href={card.fullImageUrl}
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
