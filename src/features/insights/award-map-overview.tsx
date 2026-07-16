'use client';

import { useMemo, useState } from 'react';
import { ChartFrame } from '@/components/charts/chart-frame';
import type { AwardOutcomeRow } from '@/lib/db/extended-analytics-repo';
import type { MapAwardGroup } from '@/lib/db/reference-repo';

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

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\s+/g, ' ');
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function deduplicateAwardOutcomeRows(rows: AwardOutcomeRow[]) {
  const grouped = new Map<
    string,
    {
      awardId: string;
      awardName: string;
      fundedCount: number;
      funderFirstPlaceCount: number;
      funderGameWonCount: number;
      funderSecondPlaceCount: number;
      groupId: string;
      snipedCount: number;
    }
  >();

  for (const row of rows) {
    const key = normalizeName(row.awardName || row.awardId);
    const current = grouped.get(key) ?? {
      awardId: row.awardId,
      awardName: row.awardName,
      fundedCount: 0,
      funderFirstPlaceCount: 0,
      funderGameWonCount: 0,
      funderSecondPlaceCount: 0,
      groupId: row.groupId,
      snipedCount: 0,
    };

    current.fundedCount += row.fundedCount;
    current.funderFirstPlaceCount +=
      row.funderFirstPlaceCount ?? row.funderWonCount ?? 0;
    current.funderGameWonCount += row.funderGameWonCount ?? 0;
    current.funderSecondPlaceCount += row.funderSecondPlaceCount ?? 0;
    current.snipedCount += row.snipedCount;
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .map((row): AwardOutcomeRow => ({
      awardId: row.awardId,
      awardName: row.awardName,
      fundedCount: row.fundedCount,
      funderFirstPlaceCount: row.funderFirstPlaceCount,
      funderFirstPlaceRate:
        row.fundedCount > 0 ? row.funderFirstPlaceCount / row.fundedCount : 0,
      funderGameWonCount: row.funderGameWonCount,
      funderGameWonRate:
        row.fundedCount > 0 ? row.funderGameWonCount / row.fundedCount : 0,
      funderSecondPlaceCount: row.funderSecondPlaceCount,
      funderSecondPlaceRate:
        row.fundedCount > 0 ? row.funderSecondPlaceCount / row.fundedCount : 0,
      funderWonCount: row.funderFirstPlaceCount,
      funderWonRate:
        row.fundedCount > 0 ? row.funderFirstPlaceCount / row.fundedCount : 0,
      groupId: row.groupId,
      snipedCount: row.snipedCount,
    }))
    .sort(
      (left, right) =>
        right.fundedCount - left.fundedCount ||
        right.funderWonRate - left.funderWonRate ||
        left.awardName.localeCompare(right.awardName),
    );
}

function getMapImageFile(group: MapAwardGroup) {
  const candidates = [normalizeName(group.mapName), normalizeName(group.mapCode)];

  for (const candidate of candidates) {
    if (mapImageFiles[candidate]) return mapImageFiles[candidate];

    const partialMatch = Object.keys(mapImageFiles).find(
      (knownName) => candidate.includes(knownName) || knownName.includes(candidate),
    );

    if (partialMatch) return mapImageFiles[partialMatch];
  }

  return null;
}

export function AwardMapOverview({
  mapGroups,
  rows,
}: {
  mapGroups: MapAwardGroup[];
  rows: AwardOutcomeRow[];
}) {
  const deduplicatedRows = useMemo(() => deduplicateAwardOutcomeRows(rows), [rows]);
  const availableMaps = useMemo(
    () => mapGroups.filter((group) => group.awardNames.length > 0),
    [mapGroups],
  );
  const [selectedMapId, setSelectedMapId] = useState(
    () => availableMaps[0]?.mapId ?? '',
  );
  const selectedMap =
    availableMaps.find((group) => group.mapId === selectedMapId) ??
    availableMaps[0] ??
    null;
  const selectedAwardNames = new Set(
    (selectedMap?.awardNames ?? []).map(normalizeName),
  );
  const selectedRows = deduplicatedRows.filter((row) =>
    selectedAwardNames.has(normalizeName(row.awardName)),
  );
  const imageFile = selectedMap ? getMapImageFile(selectedMap) : null;
  const imageUrl = imageFile
    ? `${MAP_IMAGE_BASE_URL}/${encodeURIComponent(imageFile)}`
    : null;
  const averageRoi =
    selectedRows.reduce((sum, row) => sum + row.funderWonRate, 0) /
    Math.max(selectedRows.length, 1);
  const bestAward =
    [...selectedRows].sort(
      (left, right) =>
        right.funderWonRate - left.funderWonRate ||
        right.fundedCount - left.fundedCount,
    )[0] ?? null;

  if (!selectedMap) return null;

  return (
    <ChartFrame
      description="Select a board to inspect its award slate, funding volume, and funder return without duplicate award rows."
      title="Award Funding ROI by Map"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(260px,2fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <label className="tm-data-label" htmlFor="award-map-select">
            Map
          </label>
          <select
            aria-label="Award map"
            className="tm-input w-full max-w-md"
            id="award-map-select"
            onChange={(event) => setSelectedMapId(event.target.value)}
            value={selectedMap.mapId}
          >
            {availableMaps.map((group) => (
              <option key={group.mapId} value={group.mapId}>
                {group.mapName}
              </option>
            ))}
          </select>

          <div className="grid gap-3 sm:grid-cols-3">
            <article className="tm-stat-card">
              <p className="tm-data-label">Awards tracked</p>
              <p className="mt-2 text-2xl font-semibold text-stone-100">
                {selectedRows.length}
              </p>
            </article>
            <article className="tm-stat-card">
              <p className="tm-data-label">Average ROI</p>
              <p className="mt-2 text-2xl font-semibold text-stone-100">
                {formatPercent(averageRoi)}
              </p>
            </article>
            <article className="tm-stat-card">
              <p className="tm-data-label">Best award</p>
              <p className="mt-2 truncate text-lg font-semibold text-stone-100">
                {bestAward?.awardName ?? 'n/a'}
              </p>
            </article>
          </div>

          {selectedRows.length === 0 ? (
            <p className="tm-muted-copy text-sm">
              No finalized funding results match this map yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table
                aria-label={`${selectedMap.mapName} award performance`}
                className="w-full min-w-[620px] text-sm"
              >
                <thead className="bg-black/20">
                  <tr>
                    <th className="px-3 py-2 text-left tm-data-label">Award</th>
                    <th className="px-3 py-2 text-right tm-data-label">Funded</th>
                    <th className="px-3 py-2 text-right tm-data-label">Funder 1st</th>
                    <th className="px-3 py-2 text-right tm-data-label">ROI</th>
                    <th className="px-3 py-2 text-right tm-data-label">Sniped</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRows.map((row) => (
                    <tr className="border-t border-white/5" key={normalizeName(row.awardName)}>
                      <td className="px-3 py-2 font-medium text-stone-100">
                        {row.awardName}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-stone-300">
                        {row.fundedCount}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-stone-300">
                        {row.funderWonCount}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-stone-100">
                        {formatPercent(row.funderWonRate)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-stone-300">
                        {row.snipedCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside aria-label="Selected map" className="self-start">
          <p className="tm-data-label mb-2">Selected map</p>
          <figure className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
            <div className="aspect-square bg-black">
              {imageUrl ? (
                <img
                  alt={`${selectedMap.mapName} map`}
                  className="h-full w-full object-contain"
                  decoding="async"
                  loading="lazy"
                  src={imageUrl}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center tm-muted-copy">
                  Map image unavailable
                </div>
              )}
            </div>
            <figcaption className="border-t border-white/10 px-4 py-3">
              <p className="font-semibold text-stone-100">{selectedMap.mapName}</p>
              <p className="tm-muted-copy mt-1 text-sm">
                {selectedMap.awardNames.length} configured awards
              </p>
            </figcaption>
          </figure>
        </aside>
      </div>
    </ChartFrame>
  );
}
