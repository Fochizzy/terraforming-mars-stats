import { buildBoardHexAdjacency } from './board-hex-adjacency';

export type BoardSpaceDefinition = {
  id: string;
  neighbors?: string[];
  reservedTile?: 'Noctis City';
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

// Tharsis reserves the Noctis City hex. Its app-space id (zero-padded) — this
// is informational only (surfaced in snapshot notes), not used for scoring.
const NOCTIS_CITY_SPACE_ID = '31';

// Spaces are keyed by the source app's zero-padded on-planet ids ("03".."63"),
// matching the ids parsed from game logs, with the full shared-geometry
// adjacency graph attached to every hex.
function createKnownBoardSpaceRegistry(): BoardSpaceRegistry {
  const adjacency = buildBoardHexAdjacency();

  return Object.fromEntries(
    Object.entries(adjacency).map(([id, neighbors]) => [
      id,
      { id, neighbors } satisfies BoardSpaceDefinition,
    ]),
  ) as BoardSpaceRegistry;
}

function createBoardSpaces(
  reservedTile?: BoardSpaceDefinition['reservedTile'],
): BoardSpaceRegistry {
  const spaces = createKnownBoardSpaceRegistry();

  if (reservedTile) {
    const noctis = spaces[NOCTIS_CITY_SPACE_ID];
    if (noctis) {
      spaces[NOCTIS_CITY_SPACE_ID] = { ...noctis, reservedTile };
    }
  }

  return spaces;
}

const boardSpaceMaps: Record<SupportedBoardMapId, BoardSpaceMap> = {
  tharsis: {
    mapId: 'tharsis',
    regions: {},
    spaces: createBoardSpaces('Noctis City'),
  },
  hellas: {
    mapId: 'hellas',
    regions: {},
    spaces: createBoardSpaces(),
  },
  elysium: {
    mapId: 'elysium',
    regions: {},
    spaces: createBoardSpaces(),
  },
  // Additional official maps share the standard 61-hex geometry. Their map-
  // specific reserved tiles differ from Tharsis's Noctis City, but that only
  // matters to the (currently unwired) curated board-adjacency scoring, so the
  // generic registry is sufficient for detection and stats.
  amazonis_planitia: {
    mapId: 'amazonis_planitia',
    regions: {},
    spaces: createBoardSpaces(),
  },
  arabia_terra: {
    mapId: 'arabia_terra',
    regions: {},
    spaces: createBoardSpaces(),
  },
  terra_cimmeria: {
    mapId: 'terra_cimmeria',
    regions: {},
    spaces: createBoardSpaces(),
  },
  vastitas_borealis: {
    mapId: 'vastitas_borealis',
    regions: {},
    spaces: createBoardSpaces(),
  },
  utopia_planitia: {
    mapId: 'utopia_planitia',
    regions: {},
    spaces: createBoardSpaces(),
  },
};

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
