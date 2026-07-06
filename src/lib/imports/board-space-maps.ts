export type BoardSpaceDefinition = {
  id: string;
  neighbors: string[];
  reservedTile?: 'Noctis City';
};

export const supportedBoardMapIds = [
  'tharsis',
  'hellas',
  'elysium',
] as const;

export type SupportedBoardMapId = (typeof supportedBoardMapIds)[number];

export type BoardSpaceRegistry = Partial<Record<string, BoardSpaceDefinition>>;

export type BoardSpaceMap = {
  mapId: SupportedBoardMapId;
  spaces: BoardSpaceRegistry;
};

const sharedBoardGeometry = {
  '21': ['20', '22', '29', '30'],
  '31': ['30', '32', '39', '40'],
} as const;

function createBoardSpaces(
  reservedTile?: BoardSpaceDefinition['reservedTile'],
): BoardSpaceRegistry {
  return {
    '21': {
      id: '21',
      neighbors: [...sharedBoardGeometry['21']],
    },
    '31': {
      id: '31',
      neighbors: [...sharedBoardGeometry['31']],
      ...(reservedTile ? { reservedTile } : {}),
    },
  };
}

const boardSpaceMaps: Record<SupportedBoardMapId, BoardSpaceMap> = {
  tharsis: {
    mapId: 'tharsis',
    spaces: createBoardSpaces('Noctis City'),
  },
  hellas: {
    mapId: 'hellas',
    spaces: createBoardSpaces(),
  },
  elysium: {
    mapId: 'elysium',
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
