'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { type CardWinStats, getCardWinStats } from './card-stats-actions';

export type CardStatsCard = {
  cardName: string;
  fullImageUrl: string | null;
  id: string;
  thumbnailUrl?: string | null;
};

function formatWinRate(wins: number, games: number) {
  if (games <= 0) {
    return '—';
  }

  return `${Math.round((wins / games) * 100)}%`;
}

function StatBlock({
  games,
  label,
  wins,
}: {
  games: number;
  label: string;
  wins: number;
}) {
  return (
    <div className="tm-stat-card">
      <p className="tm-data-label">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-stone-100">
        {formatWinRate(wins, games)}
      </p>
      <p className="tm-muted-copy mt-1 text-sm">
        {games > 0
          ? `${wins}/${games} ${games === 1 ? 'game' : 'games'}`
          : 'No games recorded yet'}
      </p>
    </div>
  );
}

function CardStatsDialog({
  card,
  onClose,
}: {
  card: CardStatsCard;
  onClose: () => void;
}) {
  const [stats, setStats] = useState<CardWinStats | null>(null);
  const [status, setStatus] = useState<'error' | 'loading' | 'ready'>(
    'loading',
  );

  useEffect(() => {
    let active = true;

    setStatus('loading');
    setStats(null);

    getCardWinStats(card.id)
      .then((result) => {
        if (active) {
          setStats(result);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (active) {
          setStatus('error');
        }
      });

    return () => {
      active = false;
    };
  }, [card.id]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const image = card.fullImageUrl ?? card.thumbnailUrl ?? null;

  return (
    <div
      aria-label={`${card.cardName} statistics`}
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
          <h2 className="tm-panel-title text-lg font-semibold">
            {card.cardName}
          </h2>
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
              alt={`${card.cardName} card`}
              className="max-h-[320px] w-auto rounded-md object-contain"
              height={440}
              src={image}
              unoptimized
              width={315}
            />
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3">
          {status === 'loading' ? (
            <p className="tm-muted-copy col-span-2 text-sm">
              Loading card statistics…
            </p>
          ) : null}
          {status === 'error' ? (
            <p className="col-span-2 text-sm text-stone-400">
              Card statistics couldn&apos;t be loaded right now.
            </p>
          ) : null}
          {status === 'ready' && stats ? (
            <>
              <StatBlock
                games={stats.personalGames}
                label="Your win rate"
                wins={stats.personalWins}
              />
              <StatBlock
                games={stats.globalGames}
                label="Global win rate"
                wins={stats.globalWins}
              />
            </>
          ) : null}
        </div>

        {card.fullImageUrl ? (
          <a
            className="tm-button-secondary mt-4 inline-flex w-fit px-4 py-2 text-sm"
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

export function CardStatsButton({
  card,
  children,
  className,
}: {
  card: CardStatsCard;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label={`Show statistics for ${card.cardName}`}
        className={className}
        onClick={() => setOpen(true)}
        type="button"
      >
        {children}
      </button>
      {open ? (
        <CardStatsDialog card={card} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
