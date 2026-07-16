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

function getAwardLabel(row: GlobalAwardMetricRow) {
  return row.awardName ?? humanizeCode(row.awardId);
}

function getRoiTone(value: number) {
  if (value >= 0.8) {
    return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  }

  if (value >= 0.65) {
    return 'border-sky-400/30 bg-sky-400/10 text-sky-200';
  }

  return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
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
    <aside
      aria-label="Selected map"
      className="w-full max-w-[360px] justify-self-center lg:justify-self-end"
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-300">
        Selected map
      </p>
      <figure className="overflow-hidden rounded-2xl border border-orange-400/20 bg-stone-950/75 shadow-lg shadow-black/25">
        <div className="relative aspect-[4/3] w-full">
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
        <figcaption className="border-t border-stone-800 px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-stone-100">{option.label}</p>
              <p className="tm-muted-copy mt-1 text-sm leading-5">{visual.description}</p>
            </div>
            <span className="shrink-0 rounded-full border border-orange-400/25 bg-orange-400/10 px-2.5 py-1 text-xs font-medium text-orange-100">
              {awardCount} awards
            </span>
          </div>
        </figcaption>
      </figure>
    </aside>
  );
}

export function AwardMapSummary({ rows }: { rows: GlobalAwardMetricRow[] }) {
  const mapOptions = useMemo(() => buildMapOptions(rows), [rows]);
  const [selectedMapKey, setSelectedMapKey] = useState<string>(() => mapOptions[0]?.key ?? 'all');
  const [isSelectOpen, setIsSelectOpen] = useState(false);
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
          getAwardLabel(left).localeCompare(getAwardLabel(right)),
      );
  }, [hasMapSpecificRows, rows, selectedMap]);
  const summary = useMemo(() => {
    if (selectedRows.length === 0) {
      return {
        averageRoi: 0,
        bestAward: null as GlobalAwardMetricRow | null,
      };
    }

    const bestAward = selectedRows.reduce((best, row) =>
      row.funderSuccessRate > best.funderSuccessRate ? row : best,
    );
    const averageRoi =
      selectedRows.reduce((total, row) => total + row.funderSuccessRate, 0) /
      selectedRows.length;

    return { averageRoi, bestAward };
  }, [selectedRows]);

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
        <div className="rounded-2xl border border-orange-400/15 bg-stone-950/25 p-4 sm:p-5 lg:p-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(300px,2fr)] lg:items-start lg:gap-8">
            <div className="min-w-0">
              <div className="w-full sm:w-60">
                <label className="tm-data-label block" htmlFor="award-map-select">
                  Map
                </label>
                <div className="group relative mt-2">
                  <select
                    aria-label="Award map"
                    className="w-full appearance-none rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 pr-11 text-sm font-medium text-stone-100 outline-none transition hover:border-orange-400/60 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                    id="award-map-select"
                    onBlur={() => setIsSelectOpen(false)}
                    onChange={(event) => {
                      setSelectedMapKey(event.target.value);
                      setIsSelectOpen(false);
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === ' ' ||
                        event.key === 'Enter' ||
                        event.key === 'ArrowDown'
                      ) {
                        setIsSelectOpen(true);
                      }
                    }}
                    onPointerDown={() => setIsSelectOpen((current) => !current)}
                    value={selectedMap.key}
                  >
                    {mapOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    aria-hidden="true"
                    className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-300 transition-transform duration-200 ${
                      isSelectOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="m6 9 6 6 6-6"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                  Map performance
                </p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-stone-100 sm:text-xl">
                  Award performance on {selectedMap.label}
                </h3>
                <p className="tm-muted-copy mt-1 max-w-2xl text-sm leading-6">
                  Compare how often award funders converted their investment into first place.
                </p>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <article className="rounded-xl border border-stone-800 bg-stone-950/45 px-3.5 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                    Awards tracked
                  </p>
                  <p className="mt-1.5 text-xl font-semibold text-stone-100">
                    {selectedRows.length}
                  </p>
                </article>
                <article className="rounded-xl border border-stone-800 bg-stone-950/45 px-3.5 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                    Average ROI
                  </p>
                  <p className="mt-1.5 text-xl font-semibold text-stone-100">
                    {formatPercent(summary.averageRoi)}
                  </p>
                </article>
                <article className="rounded-xl border border-stone-800 bg-stone-950/45 px-3.5 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                    Most profitable
                  </p>
                  <p className="mt-1.5 truncate text-sm font-semibold text-stone-100">
                    {summary.bestAward ? getAwardLabel(summary.bestAward) : '-'}
                  </p>
                  {summary.bestAward ? (
                    <p className="mt-0.5 text-xs text-stone-400">
                      {formatPercent(summary.bestAward.funderSuccessRate)} ROI
                    </p>
                  ) : null}
                </article>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-stone-800 bg-stone-950/35">
                {selectedRows.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-stone-400">
                    No award metrics are available for this map yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table
                      aria-label={`${selectedMap.label} award performance`}
                      className="w-full min-w-[620px] border-collapse text-left"
                    >
                      <thead className="border-b border-stone-800 bg-stone-950/65">
                        <tr className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                          <th className="px-4 py-3" scope="col">
                            Award
                          </th>
                          <th className="px-3 py-3 text-right" scope="col">
                            Funded
                          </th>
                          <th className="px-3 py-3 text-right" scope="col">
                            Funder wins
                          </th>
                          <th className="px-4 py-3 text-right" scope="col">
                            ROI
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-800/90">
                        {selectedRows.map((row) => (
                          <tr
                            className="transition-colors hover:bg-stone-900/55"
                            key={`${getMapKey(row)}-${row.awardId}-${row.playerCount}`}
                          >
                            <th className="px-4 py-3.5 align-top" scope="row">
                              <p className="text-sm font-semibold text-stone-100">
                                {getAwardLabel(row)}
                              </p>
                              <p className="mt-1 text-xs font-normal leading-5 text-stone-400">
                                Winner win rate {formatPercent(row.awardWinnerWinRate)} · Avg award ROI{' '}
                                {formatDecimal(row.averageAwardRoi)} · {row.playerCount} players
                                {row.averageFundedGeneration !== null
                                  ? ` · funded gen ${formatDecimal(row.averageFundedGeneration)}`
                                  : ''}
                              </p>
                            </th>
                            <td className="px-3 py-3.5 text-right align-top text-sm font-medium text-stone-200">
                              {row.gamesPlayed}x
                            </td>
                            <td className="px-3 py-3.5 text-right align-top text-sm font-medium text-stone-200">
                              {row.funderWins}x
                            </td>
                            <td className="px-4 py-3.5 text-right align-top">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${getRoiTone(
                                  row.funderSuccessRate,
                                )}`}
                              >
                                {formatPercent(row.funderSuccessRate)} ROI
                              </span>
                              <p className="mt-1 text-[11px] text-stone-500">
                                {formatPercent(row.winnerFunderMismatchRate)} mismatch
                              </p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <MapPreview awardCount={selectedRows.length} option={selectedMap} />
          </div>
        </div>
      )}
    </ChartFrame>
  );
}
