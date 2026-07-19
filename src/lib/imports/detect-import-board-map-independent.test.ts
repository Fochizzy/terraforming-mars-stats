import { describe, expect, it } from 'vitest';
import type { ImportMapReferenceCatalog } from '@/lib/db/reference-repo';
import { detectImportBoardMapIndependent } from './detect-import-board-map-independent';
import type { ImportObjectiveEvidence } from './parse-terraforming-mars-log';

const catalog: ImportMapReferenceCatalog = {
  aliases: [],
  allAwards: [],
  allMilestones: [],
  awards: [],
  maps: [
    { code: 'hellas', id: 'hellas-id', name: 'Hellas' },
    { code: 'tharsis', id: 'tharsis-id', name: 'Tharsis' },
    { code: 'terra_cimmeria', id: 'tc-id', name: 'Terra Cimmeria' },
    { code: 'terra_cimmeria_nova', id: 'tcn-id', name: 'Terra Cimmeria Nova' },
    { code: 'hollandia', id: 'hollandia-id', name: 'Hollandia' },
  ],
  milestones: [
    { mapId: 'hellas-id', milestoneId: 'hellas-ms', milestoneName: 'Diversifier' },
    { mapId: 'tc-id', milestoneId: 'tc-ms', milestoneName: 'T. Collector' },
    { mapId: 'tcn-id', milestoneId: 'tcn-ms', milestoneName: 'Planetologist' },
  ],
};

function objective(canonicalId: string): ImportObjectiveEvidence {
  return {
    candidateEntityIds: [canonicalId],
    canonicalId,
    canonicalName: canonicalId,
    lineNumber: 1,
    normalizedPlayerValue: 'player',
    normalizedValue: canonicalId,
    originalLine: `Player claimed ${canonicalId} milestone`,
    originalPlayerValue: 'Player',
    originalValue: canonicalId,
    resolution: 'exact',
    source: 'exported_log',
    type: 'milestone',
  };
}

describe('independent map detection', () => {
  it('uses ocean geometry for randomized objectives and ignores off-map objectives', () => {
    expect(
      detectImportBoardMapIndependent({
        catalog,
        objectiveConfiguration: 'randomized_full',
        objectiveEvidence: [objective('tc-ms')],
        oceanSpaceIds: ['03', '08', '14', '21', '26', '27', '34', '35', '46'],
      }),
    ).toMatchObject({
      detectedMapCode: 'hellas',
      kind: 'confident',
      mapSource: 'oceans',
      objectiveConfiguration: 'randomized_full',
    });
  });

  it('excludes a verified off-reserve ocean exception from the reserved-ocean fingerprint', () => {
    const hellasOceans = ['03', '08', '14', '21', '26', '27', '34', '35', '46'];
    // '99' is not an ocean hex on any map, so it breaks every fingerprint.
    const withOffReserveOcean = [...hellasOceans, '99'];

    // Without the exception, the stray ocean prevents a confident Hellas match.
    expect(
      detectImportBoardMapIndependent({
        catalog,
        objectiveConfiguration: 'randomized_full',
        objectiveEvidence: [],
        oceanSpaceIds: withOffReserveOcean,
      }),
    ).not.toMatchObject({ detectedMapCode: 'hellas', kind: 'confident' });

    // With the stray ocean verified as a source-backed off-reserve exception,
    // Hellas matches again — but only that specific space is excused.
    expect(
      detectImportBoardMapIndependent({
        catalog,
        objectiveConfiguration: 'randomized_full',
        objectiveEvidence: [],
        oceanSpaceIds: withOffReserveOcean,
        offReserveOceanExceptionSpaceIds: ['99'],
      }),
    ).toMatchObject({
      detectedMapCode: 'hellas',
      kind: 'confident',
      mapSource: 'oceans',
    });
  });

  it('does not infer a map from randomized objectives when oceans are absent', () => {
    expect(
      detectImportBoardMapIndependent({
        catalog,
        objectiveConfiguration: 'randomized_limited',
        objectiveEvidence: [objective('hellas-ms')],
        oceanSpaceIds: [],
      }),
    ).toMatchObject({ detectedMapId: null, kind: 'ambiguous', mapSource: 'none' });
  });

  it('allows board-defined objectives to resolve identical Terra Cimmeria boards', () => {
    expect(
      detectImportBoardMapIndependent({
        catalog,
        objectiveConfiguration: 'board_defined',
        objectiveEvidence: [objective('tcn-ms')],
        oceanSpaceIds: ['03', '07', '08', '13', '37', '52', '53', '58', '59', '60', '61', '63'],
      }),
    ).toMatchObject({ detectedMapCode: 'terra_cimmeria_nova', kind: 'confident' });
  });

  it('supports Hollandia when its randomized objective requirement is confirmed', () => {
    expect(
      detectImportBoardMapIndependent({
        catalog,
        objectiveConfiguration: 'randomized_unspecified',
        objectiveEvidence: [],
        oceanSpaceIds: ['03', '06', '08', '15', '23', '32', '45', '46', '52', '53', '54', '58'],
      }),
    ).toMatchObject({ detectedMapCode: 'hollandia', kind: 'confident' });
  });

  it('rejects board-defined objective configuration for Hollandia', () => {
    expect(
      detectImportBoardMapIndependent({
        catalog,
        objectiveConfiguration: 'board_defined',
        objectiveEvidence: [],
        oceanSpaceIds: ['03', '06', '08', '15', '23', '32', '45', '46', '52', '53', '54', '58'],
      }).kind,
    ).toBe('conflicting');
  });
});
