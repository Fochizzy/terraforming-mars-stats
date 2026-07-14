'use client';

import { useState } from 'react';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartFrame } from '@/components/charts/chart-frame';
import {
  chartAxisTick,
  chartGridStroke,
  chartSeriesColors,
  chartTooltipStyle,
} from '@/components/charts/chart-theme';
import { MapInfoButton } from '@/components/ui/map-info-button';
import { MapImage } from '@/components/ui/map-image';
import { SelectChevron } from '@/components/ui/select-chevron';
import type {
  GroupMapPerformanceRow,
  PlayerMapPerformanceRow,
  TilePlacementRow,
} from '@/lib/db/extended-analytics-repo';
import type { MapAwardGroup } from '@/lib/db/reference-repo';

export type MapPerformanceDatum = {
  averageScore: number;
  detail: string;
  gamesPlayed: number;
  mapName: string;
  winRate: number | null;
};

export function buildMapPerformanceData(input: {
  focusPlayerId: string | null;
  groupRows: GroupMapPerformanceRow[];
  playerRows: PlayerMapPerformanceRow[];
}): MapPerformanceDatum[] {
  if (input.focusPlayerId) {
    return input.playerRows
      .filter((row) => row.playerId === input.focusPlayerId)
      .map((row) => ({
        averageScore: Math.round(row.averageScore * 10) / 10,
        detail: `avg place ${row.averagePlacement.toFixed(1)}`,
        gamesPlayed: row.gamesPlayed,
        mapName: row.mapName,
        winRate: Math.round(row.winRate * 100),
      }));
  }

  return input.groupRows.map((row) => ({
    averageScore: Math.round(row.averageScore * 10) / 10,
    detail: `avg ${row.averageGenerationCount.toFixed(1)} gens`,
    gamesPlayed: row.gamesPlayed,
    mapName: row.mapName,
    winRate: null,
  }));
}

export function buildPlayerMapNarratives(input: {
  mapName: string;
  playerId: string;
  playerRows: PlayerMapPerformanceRow[];
  tileRows: TilePlacementRow[];
}) {
  const playerMaps = input.playerRows.filter(
    (row) => row.playerId === input.playerId,
  );
  const row = playerMaps.find((candidate) => candidate.mapName === input.mapName);

  if (!row) {
    return [];
  }

  const totalGames = playerMaps.reduce((sum, candidate) => sum + candidate.gamesPlayed, 0);
  const baselineWinRate =
    totalGames > 0
      ? playerMaps.reduce(
          (sum, candidate) => sum + candidate.winRate * candidate.gamesPlayed,
          0,
        ) / totalGames
      : 0;
  const baselinePlacement =
    totalGames > 0
      ? playerMaps.reduce(
          (sum, candidate) => sum + candidate.averagePlacement * candidate.gamesPlayed,
          0,
        ) / totalGames
      : row.averagePlacement;
  const mapTiles = input.tileRows.filter(
    (tile) => tile.playerId === input.playerId && tile.mapName === input.mapName,
  );
  const tileCounts = new Map<string, number>();

  for (const tile of mapTiles) {
    tileCounts.set(
      tile.tileType,
      (tileCounts.get(tile.tileType) ?? 0) + tile.placements,
    );
  }

  const strongestTile = [...tileCounts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )[0];
  const winDelta = Math.round((row.winRate - baselineWinRate) * 100);
  const narratives: string[] = [];

  if (winDelta >= 0) {
    narratives.push(
      `What has worked: you win ${Math.round(row.winRate * 100)}% on ${row.mapName}, ${Math.abs(winDelta)} points above your across-map baseline, while averaging ${row.averagePlacement.toFixed(1)} place.`,
    );
  } else {
    narratives.push(
      `What has worked: your ${row.averageScore.toFixed(1)}-point average is the clearest established output on ${row.mapName}, with an average finish of ${row.averagePlacement.toFixed(1)}.`,
    );
  }

  if (strongestTile) {
    narratives.push(
      `Your most repeated recorded board action here is ${strongestTile[0]} placement (${strongestTile[1]} total), which describes the board plan most visible in your imported logs.`,
    );
  }

  if (winDelta < 0 || row.averagePlacement > baselinePlacement) {
    narratives.push(
      `What has not worked: results trail your usual map performance by ${Math.abs(winDelta)} win-rate points${row.averagePlacement > baselinePlacement ? `, and placement is ${Math.abs(row.averagePlacement - baselinePlacement).toFixed(1)} spots worse than your across-map norm` : ''}.`,
    );
  } else {
    narratives.push(
      `No clear negative pattern has separated yet; the main limitation is that this conclusion comes from ${row.gamesPlayed} ${row.gamesPlayed === 1 ? 'game' : 'games'}.`,
    );
  }

  if (row.gamesPlayed < 5 && !narratives[narratives.length - 1].includes('comes from')) {
    narratives.push(
      `Treat this as an early signal because only ${row.gamesPlayed} ${row.gamesPlayed === 1 ? 'game is' : 'games are'} recorded on this map.`,
    );
  }

  return narratives;
}

export function MapPerformanceSection(props: {
  focusPlayerId: string | null;
  focusPlayerName: string | null;
  groupRows: GroupMapPerformanceRow[];
  mapGroups?: MapAwardGroup[];
  playerRows: PlayerMapPerformanceRow[];
  tileRows?: TilePlacementRow[];
}) {
  const data = buildMapPerformanceData({
    focusPlayerId: props.focusPlayerId,
    groupRows: props.groupRows,
    playerRows: props.playerRows,
  });
  const mapGroupByName = new Map(
    (props.mapGroups ?? []).map((mapGroup) => [mapGroup.mapName, mapGroup]),
  );
  const [selectedMapName, setSelectedMapName] = useState<string | null>(null);
  const activeMap =
    data.find((entry) => entry.mapName === selectedMapName) ?? data[0] ?? null;
  const activeMapGroup = activeMap
    ? mapGroupByName.get(activeMap.mapName)
    : undefined;
  const activeNarratives =
    props.focusPlayerId && activeMap
      ? buildPlayerMapNarratives({
          mapName: activeMap.mapName,
          playerId: props.focusPlayerId,
          playerRows: props.playerRows,
          tileRows: props.tileRows ?? [],
        })
      : [];

  return (
    <ChartFrame
      description="Win rate and average score split out by the board map each game was played on."
      title={
        props.focusPlayerName
          ? `Map Performance for ${props.focusPlayerName}`
          : 'Map Performance'
      }
    >
      {data.length === 0 ? (
        <p className="tm-muted-copy text-sm">
          Map splits will appear after finalized games are logged.
        </p>
      ) : props.focusPlayerId && activeMap ? (
        <div className="flex flex-col gap-4">
          <div className="relative max-w-sm">
            <label className="tm-data-label" htmlFor="profile-map-select">
              Map
            </label>
            <select
              className="tm-input mt-2 w-full appearance-none pr-9"
              id="profile-map-select"
              onChange={(event) => setSelectedMapName(event.target.value)}
              value={activeMap.mapName}
            >
              {data.map((entry) => (
                <option key={entry.mapName} value={entry.mapName}>
                  {entry.mapName}
                </option>
              ))}
            </select>
            <span className="mt-2 block">
              <SelectChevron />
            </span>
          </div>
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
            <article className="tm-stat-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold text-stone-100">
                  {activeMapGroup ? (
                    <MapInfoButton
                      awardNames={activeMapGroup.awardNames}
                      mapCode={activeMapGroup.mapCode}
                      mapName={activeMap.mapName}
                      milestoneNames={activeMapGroup.milestoneNames}
                    />
                  ) : (
                    activeMap.mapName
                  )}
                </h3>
                <p className="tm-accent-copy text-sm">{activeMap.winRate}% wins</p>
              </div>
              <p className="tm-muted-copy mt-2 text-sm">
                {activeMap.gamesPlayed} results | avg {activeMap.averageScore} points |{' '}
                {activeMap.detail}
              </p>
              <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 text-sm text-stone-200">
                {activeNarratives.map((narrative) => (
                  <p key={narrative}>{narrative}</p>
                ))}
              </div>
            </article>
            <div className="flex min-h-[260px] items-center justify-center overflow-hidden rounded border border-white/10 bg-black/20 p-3">
              {activeMapGroup ? (
                <MapImage
                  className="h-auto w-full rounded"
                  code={activeMapGroup.mapCode}
                  height={420}
                  mapName={activeMapGroup.mapName}
                  width={560}
                />
              ) : (
                <p className="tm-muted-copy text-sm">
                  A board image is not available for this map yet.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <ResponsiveContainer height={240} width="100%">
            <BarChart
              data={data}
              margin={{ bottom: 12, left: 0, right: 12, top: 12 }}
            >
              <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
              <XAxis dataKey="mapName" tick={chartAxisTick} />
              <YAxis tick={chartAxisTick} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar
                dataKey={props.focusPlayerId ? 'winRate' : 'averageScore'}
                fill={chartSeriesColors.tr}
                name={props.focusPlayerId ? 'Win rate %' : 'Avg score'}
                radius={[10, 10, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="grid gap-3 md:grid-cols-3">
            {data.map((entry) => {
              const mapGroup = mapGroupByName.get(entry.mapName);
              const narratives = props.focusPlayerId
                ? buildPlayerMapNarratives({
                    mapName: entry.mapName,
                    playerId: props.focusPlayerId,
                    playerRows: props.playerRows,
                    tileRows: props.tileRows ?? [],
                  })
                : [];

              return (
                <article className="tm-stat-card" key={entry.mapName}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-stone-100">
                      {mapGroup ? (
                        <MapInfoButton
                          awardNames={mapGroup.awardNames}
                          mapCode={mapGroup.mapCode}
                          mapName={entry.mapName}
                          milestoneNames={mapGroup.milestoneNames}
                        />
                      ) : (
                        entry.mapName
                      )}
                    </h3>
                    {entry.winRate !== null ? (
                      <p className="tm-accent-copy text-sm">
                        {entry.winRate}% wins
                      </p>
                    ) : null}
                  </div>
                  <p className="tm-muted-copy mt-2 text-sm">
                    {entry.gamesPlayed}{' '}
                    {entry.winRate !== null ? 'results' : 'games'} | avg{' '}
                    {entry.averageScore} points | {entry.detail}
                  </p>
                  {narratives.length > 0 ? (
                    <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3 text-sm text-stone-200">
                      {narratives.map((narrative) => (
                        <p key={narrative}>{narrative}</p>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </ChartFrame>
  );
}
