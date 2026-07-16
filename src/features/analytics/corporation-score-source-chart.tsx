'use client';

import { useMemo, useState } from 'react';
import type { CorporationScoreSourceRow } from '@/lib/db/corporation-score-source-repo';

type SourceKey =
  | 'averageTrPoints'
  | 'averageCitiesPoints'
  | 'averageGreeneryPoints'
  | 'averageMilestonePoints'
  | 'averageAwardPoints'
  | 'averageBaseCardPoints'
  | 'averageJovianPoints'
  | 'averageAnimalPoints'
  | 'averageMicrobePoints'
  | 'averageOtherCardPoints';

type SortMode = 'average-vp' | 'games' | 'win-rate';

const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://qjtwgrjjwnqafbvkkfex.supabase.co'}/storage/v1/object/public`;

const sources: Array<{
  color: string;
  icon: string;
  key: SourceKey;
  label: string;
  shortLabel: string;
}> = [
  { key: 'averageTrPoints', label: 'Terraform Rating', shortLabel: 'TR', icon: 'Terraform_Rating.png', color: '#d94b0b' },
  { key: 'averageCitiesPoints', label: 'Cities', shortLabel: 'Cities', icon: 'Cities.png', color: '#1679b8' },
  { key: 'averageGreeneryPoints', label: 'Greenery', shortLabel: 'Greenery', icon: 'Greenery.png', color: '#5f9f20' },
  { key: 'averageMilestonePoints', label: 'Milestones', shortLabel: 'Milestones', icon: 'Milestones.png', color: '#7446a8' },
  { key: 'averageAwardPoints', label: 'Awards', shortLabel: 'Awards', icon: 'Awards.png', color: '#b72d55' },
  { key: 'averageBaseCardPoints', label: 'Card Points', shortLabel: 'Cards', icon: 'Card_Points.png', color: '#d49413' },
  { key: 'averageJovianPoints', label: 'Jovian', shortLabel: 'Jovian', icon: 'Jovian.png', color: '#168b9b' },
  { key: 'averageAnimalPoints', label: 'Animal', shortLabel: 'Animal', icon: 'Animal.png', color: '#b86b19' },
  { key: 'averageMicrobePoints', label: 'Microbe', shortLabel: 'Microbe', icon: 'Microbe.png', color: '#79a52a' },
  { key: 'averageOtherCardPoints', label: 'Other Card', shortLabel: 'Other', icon: 'Other_Card.png', color: '#697386' },
];

function publicUrl(bucket: string, path: string) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${storageBase}/${bucket}/${encodedPath}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function CorporationLogo({ row }: { row: CorporationScoreSourceRow }) {
  if (!row.logoPath) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm font-bold text-stone-300">
        {row.corporationName.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/35 p-1.5">
      <img
        alt={`${row.corporationName} logo`}
        className="h-full w-full object-contain"
        loading="lazy"
        src={publicUrl('tm-corporation-logos', row.logoPath)}
      />
    </div>
  );
}

export function CorporationScoreSourceChart({
  rows,
}: {
  rows: CorporationScoreSourceRow[];
}) {
  const [minimumGames, setMinimumGames] = useState(1);
  const [sortMode, setSortMode] = useState<SortMode>('average-vp');

  const visibleRows = useMemo(() => {
    const filtered = rows.filter((row) => row.gamesPlayed >= minimumGames);

    return [...filtered].sort((left, right) => {
      if (sortMode === 'games') {
        return right.gamesPlayed - left.gamesPlayed || right.averageTotalPoints - left.averageTotalPoints;
      }
      if (sortMode === 'win-rate') {
        return right.winRate - left.winRate || right.gamesPlayed - left.gamesPlayed;
      }
      return right.averageTotalPoints - left.averageTotalPoints || right.gamesPlayed - left.gamesPlayed;
    });
  }, [minimumGames, rows, sortMode]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-stone-400">
        No finalized corporation score-source rows are available yet.
      </p>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-base font-semibold text-stone-100">Where Points Come From</p>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-400">
            Average share of tracked final VP by corporation. Every bar is normalized to 100%.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="rounded-xl border border-lime-300/20 bg-black/25 px-3 py-2">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-lime-300/80">
              Minimum sample
            </span>
            <select
              className="mt-1 w-full bg-transparent text-sm text-stone-100 outline-none"
              onChange={(event) => setMinimumGames(Number(event.target.value))}
              value={minimumGames}
            >
              {[1, 2, 3, 5, 10].map((value) => (
                <option className="bg-stone-950" key={value} value={value}>
                  {value}+ plays
                </option>
              ))}
            </select>
          </label>
          <label className="rounded-xl border border-sky-300/20 bg-black/25 px-3 py-2">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300/80">
              Sort by
            </span>
            <select
              className="mt-1 w-full bg-transparent text-sm text-stone-100 outline-none"
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              value={sortMode}
            >
              <option className="bg-stone-950" value="average-vp">Average final VP</option>
              <option className="bg-stone-950" value="games">Most played</option>
              <option className="bg-stone-950" value="win-rate">Win rate</option>
            </select>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/[0.08] bg-black/20 p-3">
        {sources.map((source) => (
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-stone-200" key={source.key}>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10" style={{ backgroundColor: `${source.color}33` }}>
              <img alt="" className="h-5 w-5 object-contain" src={publicUrl('tm-score-icons', source.icon)} />
            </span>
            <span>{source.shortLabel}</span>
          </div>
        ))}
      </div>

      {visibleRows.length === 0 ? (
        <p className="rounded-xl border border-white/[0.07] bg-black/15 p-4 text-sm text-stone-400">
          No corporations meet the selected minimum sample.
        </p>
      ) : (
        <div className="space-y-2.5">
          {visibleRows.map((row) => {
            const trackedTotal = sources.reduce(
              (total, source) => total + Math.max(row[source.key], 0),
              0,
            );

            return (
              <article
                className="grid gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-3 transition hover:border-orange-300/20 hover:bg-orange-300/[0.025] lg:grid-cols-[240px_minmax(0,1fr)_92px] lg:items-center"
                key={row.corporationId}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CorporationLogo row={row} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-stone-100">{row.corporationName}</p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {row.gamesPlayed} {row.gamesPlayed === 1 ? 'play' : 'plays'} · {Math.round(row.winRate * 100)}% wins
                    </p>
                  </div>
                </div>

                <div>
                  <div
                    aria-label={`${row.corporationName} tracked scoring composition`}
                    className="flex h-11 overflow-hidden rounded-xl border border-white/10 bg-stone-950/75"
                    role="img"
                  >
                    {sources.map((source) => {
                      const value = Math.max(row[source.key], 0);
                      const share = trackedTotal > 0 ? value / trackedTotal : 0;
                      if (share <= 0) return null;

                      return (
                        <div
                          className="group relative flex min-w-0 items-center justify-center border-r border-black/20 px-1 text-[11px] font-semibold text-white last:border-r-0"
                          key={source.key}
                          style={{ backgroundColor: source.color, width: `${share * 100}%` }}
                          title={`${source.label}: ${formatNumber(value)} VP (${Math.round(share * 100)}%)`}
                        >
                          {share >= 0.075 ? `${Math.round(share * 100)}%` : null}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-stone-600">
                    <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-lime-300/20 bg-lime-300/[0.06] px-3 py-2 lg:block lg:text-right">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lime-300/70">Avg final VP</span>
                  <p className="text-lg font-bold tabular-nums text-lime-200">{formatNumber(row.averageTotalPoints)}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
