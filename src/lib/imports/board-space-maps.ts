import { buildBoardHexAdjacency } from './board-hex-adjacency';
import {
  buildTerrainBySpaceId,
  reservedCityByMap,
  specialSpacesByMap,
  type BoardSpaceTerrain,
  type SpecialBoardSpace,
} from './board-terrain-data';

export type BoardSpaceDefinition = {
  id: string;
  neighbors?: string[];
  reservedTile?: 'Noctis City';
  specialSpace?: SpecialBoardSpace;
  terrain?: BoardSpaceTerrain;
};

export const supportedBoardMapIds = [
  'tharsis',
  'hellas',
  'elysium',
  'amazonis_planitia',
  'arabia_terra',
  'terra_cimmeria',
  'vastitas_borealis',
  'utopia_planitia',
] as const;

export type SupportedBoardMapId = (typeof supportedBoardMapIds)[number];

export type BoardSpaceRegistry = Partial<Record<string, BoardSpaceDefinition>>;

export type BoardRegionRegistry = Record<string, string[]>;

export type BoardSpaceMap = {
  mapId: SupportedBoardMapId;
  regions: BoardRegionRegistry;
  spaces: BoardSpaceRegistry;
};

// Every map shares the same hexagonal geometry (adjacency), then overlays its
// own terrain (ocean/cove/restricted/volcanic) and reserved city from the
// authoritative board data in board-terrain-data.ts.
function createKnownBoardSpaceRegistry(): BoardSpaceRegistry {
  const adjacency = buildBoardHexAdjacency();

  return Object.fromEntries(
    Object.entries(adjacency).map(([id, neighbors]) => [
      id,
      { id, neighbors } satisfies BoardSpaceDefinition,
    ]),
  ) as BoardSpaceRegistry;
}

function createBoardSpaces(mapId: SupportedBoardMapId): BoardSpaceRegistry {
  const spaces = createKnownBoardSpaceRegistry();

  for (const [spaceId, terrain] of Object.entries(buildTerrainBySpaceId(mapId))) {
    const space = spaces[spaceId];
    if (space) {
      spaces[spaceId] = { ...space, terrain };
    }
  }

  const reservedCity = reservedCityByMap[mapId];
  if (reservedCity) {
    const space = spaces[reservedCity.spaceId];
    if (space) {
      spaces[reservedCity.spaceId] = {
        ...space,
        reservedTile: reservedCity.reservedTile,
      };
    }
  }

  for (const [spaceId, specialSpace] of Object.entries(
    specialSpacesByMap[mapId] ?? {},
  )) {
    const space = spaces[spaceId];
    if (space) {
      spaces[spaceId] = { ...space, specialSpace };
    }
  }

  return spaces;
}

const boardSpaceMaps: Record<SupportedBoardMapId, BoardSpaceMap> =
  Object.fromEntries(
    supportedBoardMapIds.map((mapId) => [
      mapId,
      { mapId, regions: {}, spaces: createBoardSpaces(mapId) },
    ]),
  ) as Record<SupportedBoardMapId, BoardSpaceMap>;

export function isSupportedBoardMapId(
  mapId: string,
): mapId is SupportedBoardMapId {
  return supportedBoardMapIds.includes(mapId as SupportedBoardMapId);
}

export function getBoardSpaceMap(mapId: string): BoardSpaceMap {
  if (!isSupportedBoardMapId(mapId)) {
    throw new Error(`Unsupported board map for curated board import: ${mapId}`);
  }

  return boardSpaceMaps[mapId];
}
