import type { SupportedBoardMapId } from './board-space-maps';

// Per-map board terrain, keyed by the app's zero-padded space ids ("03".."63").
// Transcribed from the terraforming-mars app board definitions
// (src/server/boards/<Map>Board.ts), where each space is declared in row order
// with its type. Spaces not listed here are plain land.
//
//   ocean      — the 12 reserved ocean spaces (where ocean tiles may be placed)
//   cove       — Arabia Terra cove spaces (ocean-family placement spots)
//   restricted — no tile may ever be placed here
//   volcanic   — land flagged volcanic (relevant to volcanic-area cards)
//
// Named landmark spaces are tracked separately from terrain: Noctis City
// (Tharsis) is a reserved city, while the Hellas south-pole ocean space and the
// Vastitas Borealis north pole are special land spaces with their own placement
// rules (see reservedCityByMap / specialSpacesByMap below).
export type BoardSpaceTerrain = 'ocean' | 'cove' | 'restricted' | 'volcanic';

type MapTerrain = {
  cove?: string[];
  ocean: string[];
  restricted?: string[];
  volcanic?: string[];
};

export const boardTerrainByMap: Record<SupportedBoardMapId, MapTerrain> = {
  tharsis: {
    ocean: ['04', '06', '07', '13', '28', '32', '33', '34', '43', '44', '45', '63'],
    volcanic: ['09', '14', '21', '29'],
  },
  hellas: {
    ocean: ['03', '08', '14', '21', '26', '27', '34', '35', '36', '43', '44', '46'],
  },
  elysium: {
    ocean: ['03', '04', '05', '06', '11', '12', '18', '19', '24', '26', '27', '32'],
    volcanic: ['08', '14', '20', '37'],
  },
  amazonis_planitia: {
    ocean: ['04', '08', '12', '13', '22', '28', '38', '45', '46', '52', '54', '62'],
    restricted: ['33'],
    volcanic: ['09', '35', '43', '49'],
  },
  arabia_terra: {
    ocean: ['03', '04', '07', '08', '09', '15', '23', '31', '33', '40', '47', '53'],
    cove: ['20', '32', '44', '46', '48'],
    volcanic: ['55', '58', '63'],
  },
  terra_cimmeria: {
    ocean: ['03', '07', '08', '13', '37', '52', '53', '58', '59', '60', '61', '63'],
    volcanic: ['05', '21', '27', '38'],
  },
  vastitas_borealis: {
    ocean: ['19', '20', '24', '25', '26', '27', '32', '37', '41', '48', '53', '59'],
    volcanic: ['07', '12', '21', '22'],
  },
  utopia_planitia: {
    ocean: ['14', '21', '25', '26', '27', '36', '40', '48', '49', '55', '56', '62'],
  },
};

// Reserved city spaces (fixed, non-shuffled city placements). Only Tharsis's
// Noctis City exists among the supported maps.
export const reservedCityByMap: Partial<
  Record<SupportedBoardMapId, { reservedTile: 'Noctis City'; spaceId: string }>
> = {
  tharsis: { reservedTile: 'Noctis City', spaceId: '31' },
};

// Special land spaces with their own placement rules/bonuses (fixed by
// doNotShuffleLastSpace and identified by SpaceName in the app). Space ids match
// the app's SpaceName constants exactly.
export type SpecialBoardSpace =
  | 'Hellas Ocean'
  | 'Vastitas Borealis North Pole';

export const specialSpacesByMap: Partial<
  Record<SupportedBoardMapId, Record<string, SpecialBoardSpace>>
> = {
  // The Hellas south-pole hex: pay 6 M€ to place an ocean here for bonuses.
  hellas: { '61': 'Hellas Ocean' },
  // The Vastitas Borealis north pole special land space.
  vastitas_borealis: { '33': 'Vastitas Borealis North Pole' },
};

// Flatten a map's terrain into a spaceId -> terrain lookup.
export function buildTerrainBySpaceId(
  mapId: SupportedBoardMapId,
): Record<string, BoardSpaceTerrain> {
  const terrain = boardTerrainByMap[mapId];
  const bySpace: Record<string, BoardSpaceTerrain> = {};

  const assign = (spaceIds: string[] | undefined, kind: BoardSpaceTerrain) => {
    for (const spaceId of spaceIds ?? []) {
      bySpace[spaceId] = kind;
    }
  };

  assign(terrain.ocean, 'ocean');
  assign(terrain.cove, 'cove');
  assign(terrain.restricted, 'restricted');
  assign(terrain.volcanic, 'volcanic');

  return bySpace;
}
