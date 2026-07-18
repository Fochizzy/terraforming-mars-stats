/**
 * Reserved-ocean board fingerprints, used to identify which map an imported game
 * was played on from the ocean tiles recorded in its exported log.
 *
 * Provenance
 * ----------
 * Derived from the authoritative board layouts in the Terraforming Mars engine
 * that powers the site the logs come from
 * (github.com/terraforming-mars/terraforming-mars, `src/server/boards/*Board.ts`).
 * This is fixed board geometry, not analytics, catalog, or player data, and no
 * production reference data is involved.
 *
 * Space ids
 * ---------
 * Every value is the set of board space ids where an ocean tile is *eligible* to
 * be placed — the blue hexes. These are the same ids the log prints, e.g.
 * `Corey placed ocean tile at 34`. A space id is the 1-based reading-order
 * position on the fixed 61-hex grid (row widths 5,6,7,8,9,8,7,6,5) plus 2, so ids
 * run `03`..`63`. Ocean-eligible spaces are `SpaceType.OCEAN`, plus — on Arabia
 * Terra only — `SpaceType.COVE`, whose board treats coves as ocean-placeable via a
 * `getSpaces` override.
 *
 * How identification works
 * ------------------------
 * The oceans a game actually places are a subset of exactly one map's eligible
 * set (barring the handful of cards that place an ocean off-reserve, which are
 * bounded separately). Nine of the ten fixed maps have a unique ocean set, so
 * placements alone identify them. Terra Cimmeria and Terra Cimmeria Nova share an
 * identical board — oceans cannot tell them apart, so objective evidence is the
 * tie-breaker there. These invariants are locked in map-ocean-fingerprints.test.ts.
 *
 * Hollandia has a fixed board but randomized objectives, so it stays unsupported;
 * its fingerprint is retained only so a match can be surfaced as an explicit
 * unsupported state rather than a silent no-match.
 */

export type MapOceanFingerprint = {
  /** Canonical map code, matching `public.maps.code`. */
  readonly code: string;
  /** Ocean-eligible board space ids (`03`..`63`), ascending. */
  readonly oceanEligibleSpaceIds: readonly string[];
  /** True when the map is randomized/unsupported (Hollandia): do not accept as a positive identification. */
  readonly randomizedUnsupported: boolean;
};

export const MAP_OCEAN_FINGERPRINTS: readonly MapOceanFingerprint[] = [
  {
    code: 'tharsis',
    randomizedUnsupported: false,
    oceanEligibleSpaceIds: ['04', '06', '07', '13', '28', '32', '33', '34', '43', '44', '45', '63'],
  },
  {
    code: 'hellas',
    randomizedUnsupported: false,
    oceanEligibleSpaceIds: ['03', '08', '14', '21', '26', '27', '34', '35', '36', '43', '44', '46'],
  },
  {
    code: 'elysium',
    randomizedUnsupported: false,
    oceanEligibleSpaceIds: ['03', '04', '05', '06', '11', '12', '18', '19', '24', '26', '27', '32'],
  },
  {
    code: 'amazonis_planitia',
    randomizedUnsupported: false,
    oceanEligibleSpaceIds: ['04', '08', '12', '13', '22', '28', '38', '45', '46', '52', '54', '62'],
  },
  {
    code: 'arabia_terra',
    randomizedUnsupported: false,
    // 12 ocean + 5 cove hexes (coves are ocean-eligible on this board only).
    oceanEligibleSpaceIds: ['03', '04', '07', '08', '09', '15', '20', '23', '31', '32', '33', '40', '44', '46', '47', '48', '53'],
  },
  {
    code: 'terra_cimmeria',
    randomizedUnsupported: false,
    oceanEligibleSpaceIds: ['03', '07', '08', '13', '37', '52', '53', '58', '59', '60', '61', '63'],
  },
  {
    code: 'terra_cimmeria_nova',
    randomizedUnsupported: false,
    // Identical board to terra_cimmeria; objective evidence must break the tie.
    oceanEligibleSpaceIds: ['03', '07', '08', '13', '37', '52', '53', '58', '59', '60', '61', '63'],
  },
  {
    code: 'vastitas_borealis',
    randomizedUnsupported: false,
    oceanEligibleSpaceIds: ['19', '20', '24', '25', '26', '27', '32', '37', '41', '48', '53', '59'],
  },
  {
    code: 'vastitas_borealis_nova',
    randomizedUnsupported: false,
    oceanEligibleSpaceIds: ['15', '16', '23', '31', '34', '35', '36', '41', '42', '43', '48', '49'],
  },
  {
    code: 'utopia_planitia',
    randomizedUnsupported: false,
    oceanEligibleSpaceIds: ['14', '21', '25', '26', '27', '36', '40', '48', '49', '55', '56', '62'],
  },
  {
    code: 'hollandia',
    randomizedUnsupported: true,
    oceanEligibleSpaceIds: ['03', '06', '08', '15', '23', '32', '45', '46', '52', '53', '54', '58'],
  },
];

const BY_CODE: ReadonlyMap<string, MapOceanFingerprint> = new Map(
  MAP_OCEAN_FINGERPRINTS.map((fingerprint) => [fingerprint.code, fingerprint]),
);

/** Normalize a map code to the canonical snake_case form used as fingerprint keys. */
export function normalizeMapCode(code: string): string {
  return code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Look up a map's ocean fingerprint by (possibly loosely formatted) code. */
export function getMapOceanFingerprint(code: string): MapOceanFingerprint | undefined {
  return BY_CODE.get(normalizeMapCode(code));
}
