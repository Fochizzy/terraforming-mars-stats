import { describe, expect, it } from 'vitest';
import type {
  ImportMapReferenceCatalog,
  MapOption,
} from '@/lib/db/reference-repo';
import type { ImportObjectiveEvidence } from './parse-terraforming-mars-log';
import { detectImportBoardMap } from './detect-import-board-map';

// Default objective sets per map (milestones / awards), from the upstream map
// definitions. Terra Cimmeria and Terra Cimmeria Nova share an identical board
// but have different objective sets — the case oceans cannot resolve alone.
const MAP_OBJECTIVES: Record<string, { name: string; m: string[]; a: string[] }> = {
  hellas: {
    name: 'Hellas',
    m: ['Diversifier', 'Tactician', 'Polar Explorer', 'Energizer', 'Rim Settler'],
    a: ['Cultivator', 'Magnate', 'Space Baron', 'Excentric', 'Contractor'],
  },
  elysium: {
    name: 'Elysium',
    m: ['Generalist', 'Specialist', 'Ecologist', 'Tycoon', 'Legend'],
    a: ['Celebrity', 'Industrialist', 'Desert Settler', 'Estate Dealer', 'Benefactor'],
  },
  tharsis: {
    name: 'Tharsis',
    m: ['Terraformer', 'Mayor', 'Gardener', 'Builder', 'Planner'],
    a: ['Landlord', 'Banker', 'Scientist', 'Thermalist', 'Miner'],
  },
  terra_cimmeria: {
    name: 'Terra Cimmeria',
    m: ['T. Collector', 'Firestarter', 'Terra Pioneer', 'Spacefarer', 'Gambler'],
    a: ['T. Politician', 'TC Award 2', 'TC Award 3', 'TC Award 4', 'TC Award 5'],
  },
  terra_cimmeria_nova: {
    name: 'Terra Cimmeria Nova',
    m: ['Planetologist', 'Architect', 'Coastguard', 'C. Forester', 'Fundraiser'],
    a: ['A. Zoologist', 'TCN Award 2', 'TCN Award 3', 'TCN Award 4', 'TCN Award 5'],
  },
  vastitas_borealis_nova: {
    name: 'Vastitas Borealis Nova',
    m: ['Agronomist', 'V. Spacefarer', 'Geologist', 'Engineer', 'Farmer'],
    a: ['VBN Award 1', 'VBN Award 2', 'VBN Award 3', 'VBN Award 4', 'VBN Award 5'],
  },
  hollandia: { name: 'Hollandia', m: [], a: [] },
};

function objectiveId(kind: 'ms' | 'aw', code: string, index: number) {
  return `${kind}-${code}-${index}`;
}

function buildCatalog(): ImportMapReferenceCatalog {
  const maps: MapOption[] = Object.entries(MAP_OBJECTIVES).map(([code, def]) => ({
    id: `id-${code}`,
    code,
    name: def.name,
  }));
  const milestones = Object.entries(MAP_OBJECTIVES).flatMap(([code, def]) =>
    def.m.map((name, index) => ({
      mapId: `id-${code}`,
      milestoneId: objectiveId('ms', code, index),
      milestoneName: name,
    })),
  );
  const awards = Object.entries(MAP_OBJECTIVES).flatMap(([code, def]) =>
    def.a.map((name, index) => ({
      mapId: `id-${code}`,
      awardId: objectiveId('aw', code, index),
      awardName: name,
    })),
  );
  const allMilestones = milestones.map((relationship) => ({
    id: relationship.milestoneId,
    name: relationship.milestoneName,
  }));
  const allAwards = awards.map((relationship) => ({
    id: relationship.awardId,
    name: relationship.awardName,
  }));
  return { aliases: [], allAwards, allMilestones, awards, maps, milestones };
}

const catalog = buildCatalog();

// Build recognized milestone evidence for the map's default milestones.
function milestonesOf(code: string, count = MAP_OBJECTIVES[code].m.length): ImportObjectiveEvidence[] {
  return MAP_OBJECTIVES[code].m.slice(0, count).map((name, index) => ({
    candidateEntityIds: [objectiveId('ms', code, index)],
    canonicalId: objectiveId('ms', code, index),
    canonicalName: name,
    lineNumber: index + 1,
    normalizedValue: name.toLowerCase(),
    normalizedPlayerValue: 'player',
    originalLine: `Player claimed ${name} milestone`,
    originalPlayerValue: 'Player',
    originalValue: name,
    resolution: 'exact',
    source: 'exported_log',
    type: 'milestone',
  }));
}

// Real placed ocean sets (validated against Downloads logs / fingerprints).
const HELLAS_OCEANS = ['03', '08', '14', '21', '26', '27', '34', '35', '46'];
const TERRA_CIMMERIA_OCEANS = ['03', '07', '08', '13', '37', '52', '53', '58', '59', '60', '61', '63'];
const HOLLANDIA_OCEANS = ['03', '06', '08', '15', '23', '32', '45', '46', '52', '53', '54', '58'];

const detect = (
  oceanSpaceIds: string[],
  objectiveEvidence: ImportObjectiveEvidence[],
  offReserveOceanAllowance = 0,
) => detectImportBoardMap({ oceanSpaceIds, objectiveEvidence, catalog, offReserveOceanAllowance });

describe('detectImportBoardMap', () => {
  it('confidently identifies a map from a full ocean set corroborated by standard objectives', () => {
    const result = detect(HELLAS_OCEANS, milestonesOf('hellas'));
    expect(result).toMatchObject({
      kind: 'confident',
      detectedMapCode: 'hellas',
      objectiveConfiguration: 'standard',
      mapSource: 'oceans+objectives',
    });
  });

  it('uses objectives to resolve a sparse ocean placement consistent with several maps', () => {
    // One ocean [34] is shared by Hellas, Tharsis, and Vastitas Borealis Nova.
    const result = detect(['34'], milestonesOf('hellas'));
    expect(result).toMatchObject({
      kind: 'confident',
      detectedMapCode: 'hellas',
      mapSource: 'oceans+objectives',
    });
  });

  it('breaks the Terra Cimmeria / Nova tie with objectives', () => {
    const result = detect(TERRA_CIMMERIA_OCEANS, milestonesOf('terra_cimmeria'));
    expect(result).toMatchObject({
      kind: 'confident',
      detectedMapCode: 'terra_cimmeria',
      mapSource: 'oceans+objectives',
    });
  });

  it('is ambiguous when the Terra Cimmeria board has randomized objectives', () => {
    // Hellas objectives on the identical TC/TCN board: cannot pick between them.
    const result = detect(TERRA_CIMMERIA_OCEANS, milestonesOf('hellas'));
    expect(result.kind).toBe('ambiguous');
    expect(result.objectiveConfiguration).toBe('randomized');
    expect(result.detectedMapCode).toBeNull();
  });

  it('keeps a confident map but flags randomized objectives when they match no single map', () => {
    // Oceans uniquely pin Hellas; a mixed objective set matches no map's defaults.
    const mixed = [...milestonesOf('hellas', 1), ...milestonesOf('elysium', 1)];
    const result = detect(HELLAS_OCEANS, mixed);
    expect(result).toMatchObject({
      kind: 'confident',
      detectedMapCode: 'hellas',
      objectiveConfiguration: 'randomized',
      mapSource: 'oceans',
    });
  });

  it('flags a conflict when oceans and standard objectives point to different maps', () => {
    const result = detect(HELLAS_OCEANS, milestonesOf('elysium'));
    expect(result.kind).toBe('conflicting');
    expect(result.detectedMapCode).toBe('hellas');
    expect(result.message).toContain('Elysium');
  });

  it('identifies a map from objectives alone when no oceans were placed', () => {
    const result = detect([], milestonesOf('elysium'));
    expect(result).toMatchObject({
      kind: 'confident',
      detectedMapCode: 'elysium',
      mapSource: 'objectives',
      objectiveConfiguration: 'standard',
    });
  });

  it('reports missing when there is no ocean or objective evidence', () => {
    const result = detect([], []);
    expect(result).toMatchObject({ kind: 'missing', detectedMapCode: null });
  });

  it('marks a randomized/unsupported board (Hollandia) as unsupported', () => {
    const result = detect(HOLLANDIA_OCEANS, []);
    expect(result).toMatchObject({
      kind: 'unsupported',
      detectedMapCode: 'hollandia',
    });
  });

  it('never defaults to Tharsis for unresolvable evidence', () => {
    const result = detect(['34'], []); // sparse, no objectives
    expect(result.kind).toBe('ambiguous');
    expect(result.detectedMapCode).not.toBe('tharsis');
    expect(result.detectedMapCode).toBeNull();
  });

  it('honours the off-reserve ocean allowance', () => {
    const withOffReserve = [...HELLAS_OCEANS, '02']; // 02 is on no map
    // Strict: the extra ocean fits no map, objectives still point to Hellas.
    expect(detect(withOffReserve, milestonesOf('hellas'), 0).kind).toBe('conflicting');
    // With a 1-ocean allowance (Artificial Lake played), Hellas is confident.
    expect(detect(withOffReserve, milestonesOf('hellas'), 1)).toMatchObject({
      kind: 'confident',
      detectedMapCode: 'hellas',
    });
  });
});
