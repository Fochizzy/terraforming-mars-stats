'use client';

import { useMemo, useState } from 'react';
import { ChartFrame } from '@/components/charts/chart-frame';
import { SelectChevron } from '@/components/ui/select-chevron';
import type { TilePlacementRow } from '@/lib/db/extended-analytics-repo';

// Official Mars board: nine staggered rows of 61 on-planet hexes, numbered
// left-to-right, top-to-bottom. Spaces beyond 61 (Phobos/Ganymede colonies)
// surface in the off-board list instead of the grid.
export const BOARD_ROW_LENGTHS = [5, 6, 7, 8, 9, 8, 7, 6, 5] as const;

const HEX_WIDTH = 44;
const HEX_RADIUS = 21;
const ROW_HEIGHT = 38;
const BOARD_PADDING = 14;
const BOARD_WIDTH = BOARD_PADDING * 2 + 9 * HEX_WIDTH;
const BOARD_HEIGHT =
  BOARD_PADDING * 2 + (BOARD_ROW_LENGTHS.length - 1) * ROW_HEIGHT + HEX_WIDTH;

const TILE_FILL_COLORS: Record<string, string> = {
  city: '#3388bb',
  greenery: 'var(--tm-greenery)',
  ocean: 'var(--tm-ocean)',
};

export type BoardCell = {
  cx: number;
  cy: number;
  spaceId: string;
};

export function buildBoardGrid(): BoardCell[] {
  const cells: BoardCell[] = [];
  let spaceNumber = 1;

  BOARD_ROW_LENGTHS.forEach((rowLength, rowIndex) => {
    const rowStartX =
      BOARD_PADDING + ((9 - rowLength) * HEX_WIDTH) / 2 + HEX_WIDTH / 2;

    for (let column = 0; column < rowLength; column += 1) {
      cells.push({
        cx: rowStartX + column * HEX_WIDTH,
        cy: BOARD_PADDING + HEX_WIDTH / 2 + rowIndex * ROW_HEIGHT,
        spaceId: String(spaceNumber),
      });
      spaceNumber += 1;
    }
  });

  return cells;
}

function buildHexPoints(cx: number, cy: number) {
  return Array.from({ length: 6 }, (_, corner) => {
    const angle = (Math.PI / 180) * (60 * corner + 30);

    return `${(cx + HEX_RADIUS * Math.cos(angle)).toFixed(1)},${(
      cy + HEX_RADIUS * Math.sin(angle)
    ).toFixed(1)}`;
  }).join(' ');
}

export type BoardHeatmapModel = {
  countsBySpace: Map<string, number>;
  maxCount: number;
  offBoardCounts: Array<{ count: number; spaceId: string }>;
};

export function aggregateBoardSpaces(
  rows: TilePlacementRow[],
  filters: {
    gameId: string | null;
    mapName: string | null;
    tileType: string | null;
  },
): BoardHeatmapModel {
  const countsBySpace = new Map<string, number>();
  const offBoardBySpace = new Map<string, number>();
  let maxCount = 0;
  const knownSpaces = new Set(buildBoardGrid().map((cell) => cell.spaceId));

  for (const row of rows) {
    if (filters.gameId && row.gameId !== filters.gameId) {
      continue;
    }

    if (filters.mapName && row.mapName !== filters.mapName) {
      continue;
    }

    if (filters.tileType && row.tileType !== filters.tileType) {
      continue;
    }

    if (knownSpaces.has(row.boardSpace)) {
      const next = (countsBySpace.get(row.boardSpace) ?? 0) + row.placements;

      countsBySpace.set(row.boardSpace, next);
      maxCount = Math.max(maxCount, next);
    } else {
      offBoardBySpace.set(
        row.boardSpace,
        (offBoardBySpace.get(row.boardSpace) ?? 0) + row.placements,
      );
    }
  }

  return {
    countsBySpace,
    maxCount,
    offBoardCounts: [...offBoardBySpace.entries()]
      .map(([spaceId, count]) => ({ count, spaceId }))
      .sort(
        (left, right) =>
          right.count - left.count || left.spaceId.localeCompare(right.spaceId),
      ),
  };
}

function buildSelectOptions(rows: TilePlacementRow[]) {
  const mapNames = [...new Set(rows.map((row) => row.mapName))].sort(
    (left, right) => left.localeCompare(right),
  );
  const tileTypes = [...new Set(rows.map((row) => row.tileType))].sort(
    (left, right) => left.localeCompare(right),
  );
  const gamesById = new Map<string, string>();

  for (const row of rows) {
    if (!gamesById.has(row.gameId)) {
      gamesById.set(row.gameId, `${row.playedOn}`);
    }
  }

  const games = [...gamesById.entries()]
    .map(([gameId, label]) => ({ gameId, label }))
    .sort(
      (left, right) =>
        right.label.localeCompare(left.label) ||
        left.gameId.localeCompare(right.gameId),
    );

  return { games, mapNames, tileTypes };
}

export function BoardHeatmapSection(props: { rows: TilePlacementRow[] }) {
  const options = useMemo(() => buildSelectOptions(props.rows), [props.rows]);
  const [selectedMapName, setSelectedMapName] = useState<string | null>(null);
  const [selectedTileType, setSelectedTileType] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const activeMapName =
    selectedMapName && options.mapNames.includes(selectedMapName)
      ? selectedMapName
      : options.mapNames[0] ?? null;
  const activeTileType =
    selectedTileType && options.tileTypes.includes(selectedTileType)
      ? selectedTileType
      : null;
  const activeGameId =
    selectedGameId && options.games.some((game) => game.gameId === selectedGameId)
      ? selectedGameId
      : null;
  const model = aggregateBoardSpaces(props.rows, {
    gameId: activeGameId,
    mapName: activeMapName,
    tileType: activeTileType,
  });
  const cells = useMemo(buildBoardGrid, []);
  const fillColor = activeTileType
    ? TILE_FILL_COLORS[activeTileType] ?? 'var(--tm-copper-500)'
    : 'var(--tm-copper-500)';

  return (
    <ChartFrame title="Board Heatmap">
      {props.rows.length === 0 ? (
        <p className="tm-muted-copy text-sm">
          The board heatmap unlocks for finalized games imported from a game
          log with tile placements.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[160px]">
              <label className="tm-data-label" htmlFor="heatmap-map-select">
                Map
              </label>
              <select
                className="tm-input mt-2 w-full appearance-none pr-9"
                id="heatmap-map-select"
                onChange={(event) => setSelectedMapName(event.target.value)}
                value={activeMapName ?? ''}
              >
                {options.mapNames.map((mapName) => (
                  <option key={mapName} value={mapName}>
                    {mapName}
                  </option>
                ))}
              </select>
              <span className="mt-2 block">
                <SelectChevron />
              </span>
            </div>
            <div className="relative min-w-[160px]">
              <label className="tm-data-label" htmlFor="heatmap-tile-select">
                Tile Type
              </label>
              <select
                className="tm-input mt-2 w-full appearance-none pr-9"
                id="heatmap-tile-select"
                onChange={(event) =>
                  setSelectedTileType(
                    event.target.value === 'all' ? null : event.target.value,
                  )
                }
                value={activeTileType ?? 'all'}
              >
                <option value="all">All tiles</option>
                {options.tileTypes.map((tileType) => (
                  <option key={tileType} value={tileType}>
                    {tileType}
                  </option>
                ))}
              </select>
              <span className="mt-2 block">
                <SelectChevron />
              </span>
            </div>
            <div className="relative min-w-[200px]">
              <label className="tm-data-label" htmlFor="heatmap-game-select">
                Game
              </label>
              <select
                className="tm-input mt-2 w-full appearance-none pr-9"
                id="heatmap-game-select"
                onChange={(event) =>
                  setSelectedGameId(
                    event.target.value === 'all' ? null : event.target.value,
                  )
                }
                value={activeGameId ?? 'all'}
              >
                <option value="all">All games</option>
                {options.games.map((game) => (
                  <option key={game.gameId} value={game.gameId}>
                    {game.label}
                  </option>
                ))}
              </select>
              <span className="mt-2 block">
                <SelectChevron />
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <svg
              aria-label="Tile placement heatmap"
              height={BOARD_HEIGHT}
              role="img"
              viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
              width={BOARD_WIDTH}
            >
              {cells.map((cell) => {
                const count = model.countsBySpace.get(cell.spaceId) ?? 0;
                const intensity =
                  model.maxCount === 0 ? 0 : count / model.maxCount;

                return (
                  <g key={cell.spaceId}>
                    <polygon
                      fill={fillColor}
                      fillOpacity={count > 0 ? 0.18 + intensity * 0.72 : 0.05}
                      points={buildHexPoints(cell.cx, cell.cy)}
                      stroke="rgba(192, 162, 127, 0.35)"
                      strokeWidth={1}
                    >
                      <title>
                        {`Space ${cell.spaceId}: ${count} placement${count === 1 ? '' : 's'}`}
                      </title>
                    </polygon>
                    {count > 0 ? (
                      <text
                        fill="var(--tm-text)"
                        fontSize={11}
                        textAnchor="middle"
                        x={cell.cx}
                        y={cell.cy + 4}
                      >
                        {count}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>
          </div>
          {model.offBoardCounts.length > 0 ? (
            <p className="tm-muted-copy text-xs">
              Off-board placements:{' '}
              {model.offBoardCounts
                .map((entry) => `${entry.spaceId} (${entry.count})`)
                .join(', ')}
            </p>
          ) : null}
          <p className="tm-muted-copy text-xs">
            Placement frequency across imported logs — darker means more
            contested. Spaces are numbered left-to-right from the top row.
          </p>
        </div>
      )}
    </ChartFrame>
  );
}
