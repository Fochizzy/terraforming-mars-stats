import { normalizeDomainText } from '@/lib/ocr/domain-matcher';

export type ImportTileBoard = 'mars' | 'moon';
export type ImportTileKind = 'city' | 'greenery' | 'ocean' | 'special';

export type ImportTileDefinition = {
  board: ImportTileBoard;
  canonicalCode: string;
  canonicalName: string;
  countsAsCity: boolean;
  countsAsGreenery: boolean;
  countsAsOcean: boolean;
  isHazard: boolean;
  kind: ImportTileKind;
};

type DefinitionInput = Omit<
  ImportTileDefinition,
  'countsAsCity' | 'countsAsGreenery' | 'countsAsOcean' | 'isHazard'
> &
  Partial<
    Pick<
      ImportTileDefinition,
      'countsAsCity' | 'countsAsGreenery' | 'countsAsOcean' | 'isHazard'
    >
  >;

function tile(input: DefinitionInput): ImportTileDefinition {
  return {
    countsAsCity: false,
    countsAsGreenery: false,
    countsAsOcean: false,
    isHazard: false,
    ...input,
  };
}

/**
 * Canonical labels emitted by the upstream `tileTypeToString` registry at
 * terraform-ing-mars commit 7a6f98f09ac2a558969c092d317c313806af7b73.
 *
 * This registry identifies every current TileType without implementing the
 * expansion rules behind it. Unknown future labels remain visible as unresolved
 * import evidence; they are never silently collapsed into a known tile.
 */
export const TERRAFORMING_MARS_TILE_TYPES: readonly ImportTileDefinition[] = [
  tile({ board: 'mars', canonicalCode: 'greenery', canonicalName: 'greenery', countsAsGreenery: true, kind: 'greenery' }),
  tile({ board: 'mars', canonicalCode: 'ocean', canonicalName: 'ocean', countsAsOcean: true, kind: 'ocean' }),
  tile({ board: 'mars', canonicalCode: 'city', canonicalName: 'city', countsAsCity: true, kind: 'city' }),
  tile({ board: 'mars', canonicalCode: 'capital', canonicalName: 'Capital', countsAsCity: true, kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'commercial_district', canonicalName: 'Commercial District', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'ecological_zone', canonicalName: 'Ecological Zone', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'industrial_center', canonicalName: 'Industrial Center', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'lava_flows', canonicalName: 'Lava Flows', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'mining_area', canonicalName: 'Mining Area', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'mining_rights', canonicalName: 'Mining Rights', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'mohole_area', canonicalName: 'Mohole Area', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'natural_preserve', canonicalName: 'Natural Preserve', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'nuclear_zone', canonicalName: 'Nuclear Zone', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'restricted_area', canonicalName: 'Restricted Area', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'deimos_down', canonicalName: 'Deimos Down', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'great_dam', canonicalName: 'Great Dam', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'magnetic_field_generators', canonicalName: 'Magnetic Field Generators', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'bio_fertilizer_facility', canonicalName: 'Bio-Fertilizer Facility', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'metallic_asteroid', canonicalName: 'Metallic Asteroid', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'solar_farm', canonicalName: 'Solar Farm', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'ocean_city', canonicalName: 'Ocean City', countsAsCity: true, countsAsOcean: true, kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'ocean_farm', canonicalName: 'Ocean Farm', countsAsOcean: true, kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'ocean_sanctuary', canonicalName: 'Ocean Sanctuary', countsAsOcean: true, kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'mild_dust_storm', canonicalName: 'Mild Dust Storm', isHazard: true, kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'severe_dust_storm', canonicalName: 'Severe Dust Storm', isHazard: true, kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'mild_erosion', canonicalName: 'Mild Erosion', isHazard: true, kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'severe_erosion', canonicalName: 'Severe Erosion', isHazard: true, kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'mining_steel', canonicalName: 'Mining (Steel)', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'mining_titanium', canonicalName: 'Mining (Titanium)', kind: 'special' }),
  tile({ board: 'moon', canonicalCode: 'moon_mine', canonicalName: 'Mine', kind: 'special' }),
  tile({ board: 'moon', canonicalCode: 'moon_habitat', canonicalName: 'Habitat', kind: 'special' }),
  tile({ board: 'moon', canonicalCode: 'moon_road', canonicalName: 'Road', kind: 'special' }),
  tile({ board: 'moon', canonicalCode: 'luna_trade_station', canonicalName: 'Luna Trade Station', kind: 'special' }),
  tile({ board: 'moon', canonicalCode: 'luna_mining_hub', canonicalName: 'Luna Mining Hub', kind: 'special' }),
  tile({ board: 'moon', canonicalCode: 'luna_train_station', canonicalName: 'Luna Train Station', kind: 'special' }),
  tile({ board: 'moon', canonicalCode: 'lunar_mine_urbanization', canonicalName: 'Lunar Mine Urbanization', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'wetlands', canonicalName: 'Wetlands', countsAsGreenery: true, countsAsOcean: true, kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'red_city', canonicalName: 'Red City', countsAsCity: true, kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'martian_nature_wonders', canonicalName: 'Martian Nature Wonders', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'crashlanding', canonicalName: 'Crashlanding', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'mars_nomads', canonicalName: 'Mars Nomads', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'rey_skywalker', canonicalName: 'Rey ... Skywalker?! (IX)', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'man_made_volcano', canonicalName: 'Man-made Volcano', kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'new_holland', canonicalName: 'New Holland', countsAsCity: true, countsAsOcean: true, kind: 'special' }),
  tile({ board: 'mars', canonicalCode: 'neural_instance', canonicalName: 'Neural Instance', kind: 'special' }),
];

const TILE_TYPE_BY_NORMALIZED_NAME = new Map(
  TERRAFORMING_MARS_TILE_TYPES.map((definition) => [
    normalizeDomainText(definition.canonicalName),
    definition,
  ]),
);

export function findTerraformingMarsTileType(
  value: string,
): ImportTileDefinition | null {
  return TILE_TYPE_BY_NORMALIZED_NAME.get(normalizeDomainText(value)) ?? null;
}
