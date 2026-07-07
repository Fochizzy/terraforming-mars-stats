export type BoardSpaceDefinition = {
  id: string;
  neighbors?: string[];
  reservedTile?: 'Noctis City';
};

export const supportedBoardMapIds = [
  'tharsis',
  'hellas',
  'elysium',
] as const;

export type SupportedBoardMapId = (typeof supportedBoardMapIds)[number];

export type BoardSpaceRegistry = Partial<Record<string, BoardSpaceDefinition>>;

export type BoardRegionRegistry = Record<string, string[]>;

export type BoardSpaceMap = {
  mapId: SupportedBoardMapId;
  regions: BoardRegionRegistry;
  spaces: BoardSpaceRegistry;
};

const sharedBoardGeometry = {
  '21': ['20', '22', '29', '30'],
} as const;

const OFFICIAL_BOARD_SPACE_COUNT = 63;

function createKnownBoardSpaceRegistry() {
  return Object.fromEntries(
    Array.from({ length: OFFICIAL_BOARD_SPACE_COUNT }, (_, index) => {
      const id = String(index + 1);

      return [id, { id } satisfies BoardSpaceDefinition];
    }),
  ) as BoardSpaceRegistry;
}

function createBoardSpaces(
  reservedTile?: BoardSpaceDefinition['reservedTile'],
): BoardSpaceRegistry {
  const spaces = createKnownBoardSpaceRegistry();

  spaces['21'] = {
    id: '21',
    neighbors: [...sharedBoardGeometry['21']],
  };
  spaces['31'] = {
    id: '31',
    ...(reservedTile ? { reservedTile } : {}),
  };

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
