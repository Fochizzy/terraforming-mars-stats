'use client';

import { useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import { toggleHiddenLeaderboardPlayer } from '@/app/(app)/leaderboard/actions';
import {
  buildLeaderboardHeatNarratives,
  type EloLeaderboardRow,
} from '@/lib/elo-leaderboard-model';

const podiumEmblems = [
  {
    alt: 'Gold first-place Terraforming Mars emblem',
    src: '/leaderboard-gold.png',
  },
  {
    alt: 'Silver second-place Terraforming Mars emblem',
    src: '/leaderboard-silver.png',
  },
  {
    alt: 'Bronze third-place Terraforming Mars emblem',
    src: '/leaderboard-bronze.png',
  },
] as const;

function RatingTable({
  onHide,
  rows,
}: {
  onHide: (playerId: string) => void;
  rows: EloLeaderboardRow[];
}) {
  return (
    <div className="tm-elo-table" role="table" aria-label="Personal Elo leaderboard">
      {rows.map((row, index) => {
        const emblem = podiumEmblems[index] ?? null;

        return (
          <article
            className={`tm-elo-row${emblem ? ' tm-elo-row--podium' : ''}${index === 0 ? ' tm-elo-row--leader' : ''}`}
            key={row.playerId}
            role="row"
          >
            {emblem ? (
              <div className="tm-elo-crest">
                <Image
                  alt={emblem.alt}
                  className="tm-elo-emblem"
                  height={512}
                  src={emblem.src}
                  width={512}
                />
              </div>
            ) : null}
            <div className="tm-elo-rank">{index + 1}</div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-bold text-stone-50">
                {row.playerName}
              </h3>
              <p className="tm-muted-copy text-xs">
                {row.wins} wins | {(row.winRate * 100).toFixed(0)}% |{' '}
                {row.gamesPlayed} games
              </p>
            </div>
            <div className="text-right">
              <div className="tm-elo-rating">{row.eloRating}</div>
              <div
                className={
                  row.lastChange > 0
                    ? 'tm-text-success text-xs'
                    : row.lastChange < 0
                      ? 'tm-text-danger text-xs'
                      : 'tm-muted-copy text-xs'
                }
              >
                {row.lastChange > 0 ? '+' : ''}
                {row.lastChange.toFixed(1)} heat
              </div>
            </div>
            <div className="hidden w-28 text-right sm:block">
              <div className="tm-data-label">Win Margin</div>
              <div>
                {row.averageWinMargin === null
                  ? 'n/a'
                  : `+${row.averageWinMargin.toFixed(1)}`}
              </div>
            </div>
            <button
              aria-label={`Hide ${row.playerName} from my leaderboard`}
              className="tm-elo-visibility-button"
              onClick={() => onHide(row.playerId)}
              title={`Hide ${row.playerName}`}
              type="button"
            >
              <EyeOff aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">Hide</span>
            </button>
          </article>
        );
      })}
    </div>
  );
}

function HiddenPlayersList({
  hiddenRows,
  onShow,
}: {
  hiddenRows: EloLeaderboardRow[];
  onShow: (playerId: string) => void;
}) {
  if (hiddenRows.length === 0) {
    return null;
  }

  return (
    <div className="tm-elo-hidden-list">
      <div>
        <h3 className="tm-data-label">Hidden Players</h3>
        <p className="tm-muted-copy mt-1 text-xs">
          These players are removed from your leaderboard only.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {hiddenRows.map((row) => (
          <button
            className="tm-elo-restore-button"
            key={row.playerId}
            onClick={() => onShow(row.playerId)}
            type="button"
          >
            <Eye aria-hidden="true" className="h-4 w-4" />
            <span>{row.playerName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function EloLeaderboard({
  initialHiddenIds,
  rows,
}: {
  initialHiddenIds: string[];
  rows: EloLeaderboardRow[];
}) {
  const [hiddenIds, setHiddenIds] = useState(() => new Set(initialHiddenIds));
  const [pending, startTransition] = useTransition();
  const visibleRows = useMemo(
    () => rows.filter((row) => !hiddenIds.has(row.playerId)),
    [hiddenIds, rows],
  );
  const hiddenRows = useMemo(
    () => rows.filter((row) => hiddenIds.has(row.playerId)),
    [hiddenIds, rows],
  );

  const toggleHidden = (playerId: string, hidden: boolean) => {
    setHiddenIds((current) => {
      const next = new Set(current);
      if (hidden) {
        next.add(playerId);
      } else {
        next.delete(playerId);
      }
      return next;
    });
    startTransition(async () => toggleHiddenLeaderboardPlayer(playerId, hidden));
  };

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      <section className="tm-elo-hero">
        <div className="relative z-10 max-w-3xl">
          <p className="tm-display-eyebrow">The Race for Mars</p>
          <h2 className="text-2xl font-black uppercase tracking-[0.12em] text-orange-100 sm:text-3xl">
            Elo Command Rankings
          </h2>
          <p className="text-sm text-stone-300">
            Every finalized game shifts the field. Victories drive the result,
            score margin raises the stakes, and defeating a stronger opponent
            produces the largest rating gain.
          </p>
        </div>
      </section>

      <section className="tm-elo-panel">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="tm-data-label">All Finalized Games</p>
            <h2 className="tm-panel-title text-lg">My Leaderboard</h2>
          </div>
          <span className="tm-elo-badge">{hiddenRows.length} hidden</span>
        </div>
        {visibleRows.length ? (
          <RatingTable
            onHide={(playerId) => toggleHidden(playerId, true)}
            rows={visibleRows}
          />
        ) : (
          <p className="tm-muted-copy">
            Every player is hidden. Show someone below to rebuild your
            leaderboard.
          </p>
        )}
        <HiddenPlayersList
          hiddenRows={hiddenRows}
          onShow={(playerId) => toggleHidden(playerId, false)}
        />
        <div className="tm-elo-heat mt-4">
          <h3 className="tm-data-label mb-2">Leaderboard Heat</h3>
          {buildLeaderboardHeatNarratives(visibleRows).map((sentence) => (
            <p key={sentence}>{sentence}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
