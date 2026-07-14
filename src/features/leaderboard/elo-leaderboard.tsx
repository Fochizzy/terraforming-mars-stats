'use client';

import { useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { buildLeaderboardHeatNarratives, type EloLeaderboardRow } from '@/lib/elo-leaderboard-model';
import { toggleSavedLeaderboardPlayer } from '@/app/(app)/leaderboard/actions';

function RatingTable({ personal, rows, savedIds, onToggle }: {
  personal?: boolean;
  rows: EloLeaderboardRow[];
  savedIds: Set<string>;
  onToggle: (playerId: string, saved: boolean) => void;
}) {
  return (
    <div className="tm-elo-table" role="table" aria-label={personal ? 'Personal Elo leaderboard' : 'Global Elo leaderboard'}>
      {rows.map((row, index) => {
        const saved = savedIds.has(row.playerId);
        return (
          <article className={`tm-elo-row${index === 0 ? ' tm-elo-row--leader' : ''}`} key={row.playerId} role="row">
            {index === 0 ? <Image alt="First-place Terraforming Mars trophy" className="tm-elo-first-trophy" height={1536} src="/leaderboard-trophy.png" width={1024} /> : null}
            <div className="tm-elo-rank">{index + 1}</div>
            <label className="tm-elo-save">
              <input checked={saved} onChange={(event) => onToggle(row.playerId, event.target.checked)} type="checkbox" />
              <span className="sr-only">{saved ? 'Remove' : 'Add'} {row.playerName} {saved ? 'from' : 'to'} personal leaderboard</span>
            </label>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-bold text-stone-50">{row.playerName}</h3>
              <p className="tm-muted-copy text-xs">{row.wins} wins · {(row.winRate * 100).toFixed(0)}% · {row.gamesPlayed} games</p>
            </div>
            <div className="text-right">
              <div className="tm-elo-rating">{row.eloRating}</div>
              <div className={row.lastChange > 0 ? 'tm-text-success text-xs' : row.lastChange < 0 ? 'tm-text-danger text-xs' : 'tm-muted-copy text-xs'}>
                {row.lastChange > 0 ? '+' : ''}{row.lastChange.toFixed(1)} heat
              </div>
            </div>
            <div className="hidden w-28 text-right sm:block">
              <div className="tm-data-label">Win Margin</div>
              <div>{row.averageWinMargin === null ? '—' : `+${row.averageWinMargin.toFixed(1)}`}</div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function EloLeaderboard({ initialSavedIds, rows }: { initialSavedIds: string[]; rows: EloLeaderboardRow[] }) {
  const [savedIds, setSavedIds] = useState(() => new Set(initialSavedIds));
  const [pending, startTransition] = useTransition();
  const personalRows = useMemo(() => rows.filter((row) => savedIds.has(row.playerId)), [rows, savedIds]);
  const toggle = (playerId: string, saved: boolean) => {
    setSavedIds((current) => {
      const next = new Set(current);
      if (saved) next.add(playerId); else next.delete(playerId);
      return next;
    });
    startTransition(async () => toggleSavedLeaderboardPlayer(playerId, saved));
  };

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      <section className="tm-elo-hero">
        <div className="relative z-10 max-w-3xl">
          <p className="tm-display-eyebrow">The Race for Mars</p>
          <h2 className="text-3xl font-black uppercase tracking-[0.12em] text-orange-100">Elo Command Rankings</h2>
          <p className="text-sm text-stone-300">Every finalized game shifts the field. Victories drive the result, score margin raises the stakes, and defeating a stronger opponent produces the largest rating gain.</p>
        </div>
      </section>

      <section className="tm-elo-panel">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="tm-data-label">Private Watchlist</p><h2 className="tm-panel-title text-xl">My Leaderboard</h2></div>
          <span className="tm-elo-badge">{personalRows.length} tracked</span>
        </div>
        {personalRows.length ? <RatingTable personal rows={personalRows} savedIds={savedIds} onToggle={toggle} /> : <p className="tm-muted-copy">Check players in the global field to create your personal leaderboard. Your choices follow your login.</p>}
        <div className="tm-elo-heat mt-5">
          <h3 className="tm-data-label mb-2">Leaderboard Heat</h3>
          {buildLeaderboardHeatNarratives(personalRows).map((sentence) => <p key={sentence}>{sentence}</p>)}
        </div>
      </section>

      <section className="tm-elo-panel">
        <div className="mb-4"><p className="tm-data-label">All Finalized Games</p><h2 className="tm-panel-title text-xl">Global Field</h2></div>
        <RatingTable rows={rows} savedIds={savedIds} onToggle={toggle} />
      </section>
    </div>
  );
}
