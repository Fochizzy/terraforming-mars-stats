export type BoardSpaceDefinition = {
  id: string;
  neighbors: string[];
  reservedTile?: 'Noctis City';
};

export type BoardSpaceMap = {
  mapId: string;
  spaces: Record<string, BoardSpaceDefinition>;
};

const tharsisSpaces: Record<string, BoardSpaceDefinition> = {
  '21': { id: '21', neighbors: ['20', '22', '29', '30'] },
  '31': {
    id: '31',
    neighbors: ['30', '32', '39', '40'],
    reservedTile: 'Noctis City',
  },
};

export function getBoardSpaceMap(mapId: string): BoardSpaceMap {
  if (mapId !== 'tharsis') {
    throw new Error(`Unsupported board map for curated board import: ${mapId}`);
  }

  return {
    mapId: 'tharsis',
    spaces: tharsisSpaces,
  };
}
