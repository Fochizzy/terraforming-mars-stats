'use client';

import { useMemo, useState } from 'react';
import { ChartFrame } from '@/components/charts/chart-frame';
import type { GlobalAwardMetricRow } from '@/lib/db/analytics-repo';

const MAP_IMAGE_BASE_URL =
  'https://qjtwgrjjwnqafbvkkfex.supabase.co/storage/v1/object/public/tm-map-images';

const mapImageFiles: Record<string, string> = {
  'amazonis planatia': 'Amazonis_Planatia.png',
  'amazonis planitia': 'Amazonis_Planatia.png',
  'arabia terra': 'Arabia_Terra.png',
  elysium: 'Elysium.png',
  hellas: 'Hellas.png',
  hollandia: 'Hollandia.png',
  'terra cimmeria': 'Terra_Cimmeria.png',
  tharsis: 'Tharsis.png',
  'utopia planitia': 'Utopia_Planitia.png',
  'vastitas borealis': 'Vastitas_Borealis.png',
  'vastitas borealis nova': 'Vastitas_Borealis_Nova.png',
};

const mapOrder = [
  'tharsis',
  'hellas',
  'elysium',
  'utopia planitia',
  'amazonis planitia',
  'arabia terra',
  'hollandia',
  'terra cimmeria',
  'vastitas borealis',
  'vastitas borealis nova',
] as const;

type MapOption = {
  imageFile: string | null;
  key: string;
  label: string;
  normalizedName: string;
};

type AggregatedAwardRow = {
  averageAwardRoi: number;
  averageFundedGeneration: number | null;
  awardId: string;
  awardName: string;
  awardWinnerWinRate: number;
  funderSuccessRate: number;
  funderWins: number;
  gamesPlayed: number;
  playerCount: number;
  winnerFunderMismatchRate: number;
  winnerWins: number;
};

function formatDecimal(value: number | null, maximumFractionDigits = 2) {
  if (value === null) {
    return '-';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function humanizeCode(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\s+/g, ' ');
}

function getMapKey(row: GlobalAwardMetricRow) {
  return row.mapId ?? row.mapName ?? 'all';
}

function resolveMapName(mapId: string | null, mapName: string | null) {
  const candidates = [mapName, mapId]
    .filter((value): value is string => Boolean(value))
    .map(normalizeName);

  for (const candidate of candidates) {
    if (mapImageFiles[candidate]) {
      return candidate;
    }

    const partialMatch = Object.keys(mapImageFiles).find(
      (knownName) => candidate.includes(knownName) || knownName.includes(candidate),
    );

    if (partialMatch) {
      return partialMatch;
    }
  }

  return candidates[0] ?? 'all';
}

function buildMapOptions(rows: GlobalAwardMetricRow[]): MapOption[] {
  const mapSpecificRows = rows.filter((row) => row.mapId !== null || row.mapName !== null);
  const sourceRows = mapSpecificRows.length > 0 ? mapSpecificRows : rows;
  const options = new Map<string, MapOption>();

  for (const row of sourceRows) {
    const key = getMapKey(row);
    const normalizedName = resolveMapName(row.mapId, row.mapName);
    const label = row.mapName ?? (row.mapId ? humanizeCode(row.mapId) : 'All maps');

    if (!options.has(key)) {
      options.set(key, {
        imageFile: mapImageFiles[normalizedName] ?? null,
        key,
        label,
        normalizedName,
      });
    }
  }

  return [...options.values()].sort((left, right) => {
    const leftIndex = mapOrder.indexOf(left.normalizedName as (typeof mapOrder)[number]);
    const rightIndex = mapOrder.indexOf(right.normalizedName as (typeof mapOrder)[number]);
    const normalizedLeftIndex = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const normalizedRightIndex = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

    return normalizedLeftIndex - normalizedRightIndex || left.label.localeCompare(right.label);
  });
}

function aggregateAwardRows(rows: GlobalAwardMetricRow[]): AggregatedAwardRow[] {
  const grouped = new Map<
    string,
    {
      averageAwardRoiTotal: number;
      averageFundedGenerationTotal: number;
      awardId: string;
      awardName: string;
      fundedGenerationGames: number;
      funderWins: number;
      gamesPlayed: number;
      playerCount: number;
      winnerFunderMismatchTotal: number;
      winnerWins: number;
    }
  >();

  for (const row of rows) {
    const awardName = row.awardName ?? humanizeCode(row.awardId);
    const key = normalizeName(awardName);
    const current = grouped.get(key) ?? {
      averageAwardRoiTotal: 0,
      averageFundedGenerationTotal: 0,
      awardId: row.awardId,
      awardName,
      fundedGenerationGames: 0,
      funderWins: 0,
      gamesPlayed: 0,
      playerCount: 0,
      winnerFunderMismatchTotal: 0,
      winnerWins: 0,
    };

    current.gamesPlayed += row.gamesPlayed;
    current.funderWins += row.funderWins;
    current.winnerWins += row.winnerWins;
    current.playerCount = Math.max(current.playerCount, row.playerCount);
    current.averageAwardRoiTotal += row.averageAwardRoi * row.gamesPlayed;
    current.winnerFunderMismatchTotal +=
      row.winnerFunderMismatchRate * row.gamesPlayed;

    if (row.averageFundedGeneration !== null) {
      current.averageFundedGenerationTotal +=
        row.averageFundedGeneration * row.gamesPlayed;
      current.fundedGenerationGames += row.gamesPlayed;
    }

    grouped.set(key, current);
  }

  return [...grouped.values()]
    .map((row) => ({
      averageAwardRoi:
        row.gamesPlayed > 0 ? row.averageAwardRoiTotal / row.gamesPlayed : 0,
      averageFundedGeneration:
        row.fundedGenerationGames > 0
          ? row.averageFundedGenerationTotal / row.fundedGenerationGames
          : null,
      awardId: row.awardId,
      awardName: row.awardName,
      awardWinnerWinRate: row.gamesPlayed > 0 ? row.winnerWins / row.gamesPlayed : 0,
      funderSuccessRate: row.gamesPlayed > 0 ? row.funderWins / row.gamesPlayed : 0,
      funderWins: row.funderWins,
      gamesPlayed: row.gamesPlayed,
      playerCount: row.playerCount,
      winnerFunderMismatchRate:
        row.gamesPlayed > 0 ? row.winnerFunderMismatchTotal / row.gamesPlayed : 0,
      winnerWins: row.winnerWins,
    }))
    .sort(
      (left, right) =>
        right.gamesPlayed - left.gamesPlayed ||
        right.funderSuccessRate - left.funderSuccessRate ||
        left.awardName.localeCompare(right.awardName),
    )
    .slice(0, 5);
}

function MapPreview({ option, awardCount }: { option: MapOption; awardCount: number }) {
  const imageUrl = option.imageFile
    ? `${MAP_IMAGE_BASE_URL}/${encodeURIComponent(option.imageFile)}`
    : null;

  return (
    <figure className="overflow-hidden rounded-2xl border border-orange-400/20 bg-stone-950/70 shadow-inner shadow-black/30">
      <div className="relative aspect-square min-h-[280px] w-full bg-black">
        {imageUrl ? (
          <img
            alt={`${option.label} map`}
            className="h-full w-full object-contain"
            decoding="async"
            loading="lazy"
            src={imageUrl}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-stone-500">
            No uploaded map image is available for {option.label}.
          </div>
        )}
      </div>
      <figcaption className="border-t border-stone-800 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-stone-100">{option.label}</p>
            <p className="tm-muted-copy mt-1 text-sm">
              Award performance across the five awards available on this board.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-orange-400/25 bg-orange-400/10 px-2.5 py-1 text-xs font-medium text-orange-100">
            {awardCount} {awardCount === 1 ? 'award' : 'awards'}
          </span>
        </div>
      </figcaption>
    </figure>
  );
}

export function AwardMapSummary({ rows }: { rows: GlobalAwardMetricRow[] }) {
  const mapOptions = useMemo(() => buildMapOptions(rows), [rows]);
  const [selectedMapKey, setSelectedMapKey] = useState<string>(
    () => mapOptions[0]?.key ?? 'all',
  );
  const selectedMap =
    mapOptions.find((option) => option.key === selectedMapKey) ?? mapOptions[0] ?? null;
  const hasMapSpecificRows = rows.some((row) => row.mapId !== null || row.mapName !== null);
  const selectedRows = useMemo(() => {
    if (!selectedMap) {
      return [];
    }

    const matchingRows = rows.filter((row) => {
      if (!hasMapSpecificRows) {
        return true;
      }

      return getMapKey(row) === selectedMap.key;
    });

    return aggregateAwardRows(matchingRows);
  }, [hasMapSpecificRows, rows, selectedMap]);

  return (
    <ChartFrame
      description="Choose a board to compare its five unique awards. Duplicate summary rows are combined."
      title="Award Funding ROI"
    >
      {rows.length === 0 || !selectedMap ? (
        <p className="text-sm text-stone-400">
          Global award metrics will appear after opted-in Supabase summaries refresh.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] lg:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="max-w-sm">
              <label className="tm-data-label block" htmlFor="award-map-select">
                Map
              </label>
              <select
                aria-label="Award map"
                className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm font-medium text-stone-100 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                id="award-map-select"
                onChange={(event) => setSelectedMapKey(event.target.value)}
                value={selectedMap.key}
              >
                {mapOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {selectedRows.map((row) => (
                <article className="tm-stat-card" key={normalizeName(row.awardName)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-stone-100">
                        {row.awardName}
                      </h3>
                      <p className="tm-muted-copy mt-1 text-sm">
                        funded {row.gamesPlayed}x | funder took 1st {row.funderWins}x
                      </p>
                    </div>
                    <span className="tm-accent-copy whitespace-nowrap text-sm font-semibold">
                      {formatPercent(row.funderSuccessRate)} ROI
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-stone-300 sm:grid-cols-2">
                    <p className="rounded-lg border border-stone-800 bg-stone-950/45 px-2.5 py-2">
                      Winner win rate{' '}
                      <span className="font-semibold text-stone-100">
                        {formatPercent(row.awardWinnerWinRate)}
                      </span>
                    </p>
                    <p className="rounded-lg border border-stone-800 bg-stone-950/45 px-2.5 py-2">
                      Avg award ROI{' '}
                      <span className="font-semibold text-stone-100">
                        {formatDecimal(row.averageAwardRoi)}
                      </span>
                    </p>
                  </div>
                  <p className="tm-muted-copy mt-2 text-xs">
                    {row.playerCount} players
                    {row.averageFundedGeneration !== null
                      ? ` | funded gen ${formatDecimal(row.averageFundedGeneration)}`
                      : ''}
                    {` | mismatch ${formatPercent(row.winnerFunderMismatchRate)}`}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <MapPreview awardCount={selectedRows.length} option={selectedMap} />
        </div>
      )}
    </ChartFrame>
  );
}
