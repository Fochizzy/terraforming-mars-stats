'use client';

import { useMemo, useState } from 'react';
import { ChartFrame } from '@/components/charts/chart-frame';
import type { GlobalAwardMetricRow } from '@/lib/db/analytics-repo';

type MapOption = {
  key: string;
  label: string;
  visualKey: 'all' | 'elysium' | 'hellas' | 'tharsis';
};

type MapVisual = {
  accent: string;
  accentSoft: string;
  description: string;
  label: string;
  terrainPath: string;
};

const mapVisuals: Record<MapOption['visualKey'], MapVisual> = {
  all: {
    accent: '#f97316',
    accentSoft: '#7c2d12',
    description: 'Select a map to focus its award economy.',
    label: 'Mars Map Collection',
    terrainPath:
      'M36 262 C92 190 150 218 202 155 C248 101 321 118 361 67 C405 116 466 110 497 181 L497 320 L36 320 Z',
  },
  elysium: {
    accent: '#38bdf8',
    accentSoft: '#075985',
    description: 'Northern plains, long coastlines, and the Elysium volcanic province.',
    label: 'Elysium',
    terrainPath:
      'M27 221 C98 180 127 95 205 111 C274 126 296 67 364 84 C424 99 450 151 505 136 L505 321 L27 321 Z',
  },
  hellas: {
    accent: '#f59e0b',
    accentSoft: '#78350f',
    description: 'The southern basin creates a low, curved center surrounded by high terrain.',
    label: 'Hellas',
    terrainPath:
      'M25 142 C82 94 137 106 183 130 C225 151 272 152 316 118 C367 78 433 92 506 154 L506 321 L25 321 Z',
  },
  tharsis: {
    accent: '#fb7185',
    accentSoft: '#881337',
    description: 'A broad volcanic plateau centered on the classic Tharsis board region.',
    label: 'Tharsis',
    terrainPath:
      'M25 247 C72 197 107 210 152 163 C195 117 236 146 278 96 C321 44 380 59 417 104 C448 141 475 154 506 145 L506 321 L25 321 Z',
  },
};

const mapOrder: MapOption['visualKey'][] = ['tharsis', 'hellas', 'elysium', 'all'];

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

function getVisualKey(mapId: string | null, mapName: string | null): MapOption['visualKey'] {
  const value = `${mapName ?? ''} ${mapId ?? ''}`.toLowerCase();

  if (value.includes('tharsis')) {
    return 'tharsis';
  }

  if (value.includes('hellas')) {
    return 'hellas';
  }

  if (value.includes('elysium')) {
    return 'elysium';
  }

  return 'all';
}

function getMapKey(row: GlobalAwardMetricRow) {
  return row.mapId ?? row.mapName ?? 'all';
}

function buildMapOptions(rows: GlobalAwardMetricRow[]): MapOption[] {
  const mapSpecificRows = rows.filter((row) => row.mapId !== null || row.mapName !== null);
  const sourceRows = mapSpecificRows.length > 0 ? mapSpecificRows : rows;
  const options = new Map<string, MapOption>();

  sourceRows.forEach((row) => {
    const key = getMapKey(row);
    const visualKey = getVisualKey(row.mapId, row.mapName);
    const label = row.mapName ?? (row.mapId ? humanizeCode(row.mapId) : 'All maps');

    if (!options.has(key)) {
      options.set(key, { key, label, visualKey });
    }
  });

  return [...options.values()].sort((left, right) => {
    const orderDifference =
      mapOrder.indexOf(left.visualKey) - mapOrder.indexOf(right.visualKey);

    return orderDifference || left.label.localeCompare(right.label);
  });
}

function MapPreview({ option, awardCount }: { option: MapOption; awardCount: number }) {
  const visual = mapVisuals[option.visualKey];
  const gradientId = `map-gradient-${option.visualKey}`;
  const gridId = `map-grid-${option.visualKey}`;

  return (
    <figure className="overflow-hidden rounded-2xl border border-orange-400/20 bg-stone-950/70 shadow-inner shadow-black/30">
      <div className="relative aspect-[4/3] min-h-[250px] w-full">
        <svg
          aria-label={`${option.label} map preview`}
          className="h-full w-full"
          role="img"
          viewBox="0 0 540 360"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#120d0b" />
              <stop offset="55%" stopColor={visual.accentSoft} />
              <stop offset="100%" stopColor="#1c1917" />
            </linearGradient>
            <pattern height="32" id={gridId} patternUnits="userSpaceOnUse" width="36">
              <path
                d="M9 1 H27 L35 16 L27 31 H9 L1 16 Z"
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
              />
            </pattern>
            <radialGradient id={`${gradientId}-glow`}>
              <stop offset="0%" stopColor={visual.accent} stopOpacity="0.75" />
              <stop offset="100%" stopColor={visual.accent} stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect fill={`url(#${gradientId})`} height="360" rx="24" width="540" />
          <circle cx="444" cy="70" fill={`url(#${gradientId}-glow)`} r="92" />
          <path d={visual.terrainPath} fill="#29201c" opacity="0.85" />
          <path
            d={visual.terrainPath}
            fill="none"
            stroke={visual.accent}
            strokeOpacity="0.42"
            strokeWidth="3"
          />
          <ellipse
            cx={option.visualKey === 'hellas' ? 267 : 178}
            cy={option.visualKey === 'hellas' ? 224 : 176}
            fill="#09090b"
            opacity="0.55"
            rx={option.visualKey === 'hellas' ? 118 : 48}
            ry={option.visualKey === 'hellas' ? 68 : 34}
          />
          <circle cx="96" cy="92" fill="#0c4a6e" opacity="0.62" r="37" />
          <circle cx="452" cy="252" fill="#164e63" opacity="0.58" r="46" />
          <circle cx="355" cy="178" fill="#3f6212" opacity="0.52" r="28" />
          <circle cx="143" cy="274" fill="#3f6212" opacity="0.48" r="24" />
          <rect fill={`url(#${gridId})`} height="360" opacity="0.9" rx="24" width="540" />

          <text
            fill="#fafaf9"
            fontFamily="ui-serif, Georgia, serif"
            fontSize="30"
            fontWeight="700"
            x="28"
            y="48"
          >
            {visual.label}
          </text>
          <text fill="#d6d3d1" fontFamily="ui-sans-serif, system-ui" fontSize="14" x="29" y="72">
            AWARD MAP VIEW
          </text>
        </svg>
      </div>
      <figcaption className="border-t border-stone-800 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-stone-100">{option.label}</p>
            <p className="tm-muted-copy mt-1 text-sm">{visual.description}</p>
          </div>
          <span className="rounded-full border border-orange-400/25 bg-orange-400/10 px-2.5 py-1 text-xs font-medium text-orange-100">
            {awardCount} awards
          </span>
        </div>
      </figcaption>
    </figure>
  );
}

export function AwardMapSummary({ rows }: { rows: GlobalAwardMetricRow[] }) {
  const mapOptions = useMemo(() => buildMapOptions(rows), [rows]);
  const [selectedMapKey, setSelectedMapKey] = useState<string>(() => mapOptions[0]?.key ?? 'all');
  const selectedMap =
    mapOptions.find((option) => option.key === selectedMapKey) ?? mapOptions[0] ?? null;
  const hasMapSpecificRows = rows.some((row) => row.mapId !== null || row.mapName !== null);
  const selectedRows = useMemo(() => {
    if (!selectedMap) {
      return [];
    }

    return rows
      .filter((row) => {
        if (!hasMapSpecificRows) {
          return true;
        }

        return getMapKey(row) === selectedMap.key;
      })
      .sort(
        (left, right) =>
          right.gamesPlayed - left.gamesPlayed ||
          right.funderSuccessRate - left.funderSuccessRate ||
          (left.awardName ?? left.awardId).localeCompare(right.awardName ?? right.awardId),
      );
  }, [hasMapSpecificRows, rows, selectedMap]);

  return (
    <ChartFrame
      description="Choose a board to compare only the awards available on that map."
      title="Award Funding ROI"
    >
      {rows.length === 0 || !selectedMap ? (
        <p className="text-sm text-stone-400">
          Global award metrics will appear after opted-in Supabase summaries refresh.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="max-w-sm">
              <label
                className="tm-data-label block"
                htmlFor="award-map-select"
              >
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
                <article
                  className="tm-stat-card"
                  key={`${getMapKey(row)}-${row.awardId}-${row.playerCount}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-stone-100">
                        {row.awardName ?? humanizeCode(row.awardId)}
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
