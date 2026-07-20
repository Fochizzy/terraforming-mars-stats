import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ImportMapReferenceCatalog } from '@/lib/db/reference-repo';
import { detectImportBoardMapIndependent } from './detect-import-board-map-independent';
import { evaluateImportMapGate } from './import-map-gate';
import type { ImportObjectiveEvidence } from './parse-terraforming-mars-log';
import { parseTerraformingMarsPlayedEntities } from './parse-terraforming-mars-played-entities';
import { parseTerraformingMarsTileActions } from './parse-terraforming-mars-tile-actions';
import { resolveOffReserveOceanEvidence } from './resolve-off-reserve-ocean-evidence';

// The one shared client/server map gate, driven end to end from the real
// off-reserve fixture through the same pure pipeline both sides use:
// parse tile actions → resolve exception evidence → detect → gate.

const fixtureText = readFileSync(
  resolve(
    process.cwd(),
    'src/lib/imports/fixtures/synthetic-off-reserve-ocean-full-export.txt',
  ),
  'utf8',
);

const cardCatalog = {
  cards: [
    {
      cardName: 'Artificial Lake',
      cardNumber: '116',
      expansionCode: 'base',
      id: 'card-artificial-lake',
      promoSetSlug: null,
    },
  ],
  corporations: [],
  entityAliases: [],
  preludes: [],
};

const mapCatalog: ImportMapReferenceCatalog = {
  aliases: [],
  allAwards: [],
  allMilestones: [{ id: 'milestone-terraformer', name: 'Terraformer' }],
  awards: [],
  maps: [{ code: 'tharsis', id: 'map-tharsis', name: 'Tharsis' }],
  milestones: [
    {
      mapId: 'map-tharsis',
      milestoneId: 'milestone-terraformer',
      milestoneName: 'Terraformer',
    },
  ],
};

const tharsisMilestoneEvidence: ImportObjectiveEvidence[] = [
  {
    candidateEntityIds: [],
    canonicalId: 'milestone-terraformer',
    canonicalName: 'Terraformer',
    lineNumber: 4,
    normalizedPlayerValue: 'player a',
    originalLine: 'Player A claimed Terraformer milestone',
    originalPlayerValue: 'Player A',
    originalValue: 'Terraformer',
    resolution: 'exact',
    source: 'exported_log',
    type: 'milestone',
  } as unknown as ImportObjectiveEvidence,
];

function pipeline(input: {
  objectiveEvidence: ImportObjectiveEvidence[];
  withExceptionEvidence: boolean;
}) {
  const tileActionSet = parseTerraformingMarsTileActions(fixtureText);
  const playedEntities = parseTerraformingMarsPlayedEntities({
    catalog: cardCatalog as never,
    exportedLogText: fixtureText,
  });
  const offReserve = input.withExceptionEvidence
    ? resolveOffReserveOceanEvidence({
        cards: cardCatalog.cards,
        playedEntityEvidence: playedEntities.evidence,
        tileActions: tileActionSet.actions,
      })
    : { exceptionSpaceIds: [], exceptions: [] };
  const mapReview = detectImportBoardMapIndependent({
    catalog: mapCatalog,
    objectiveConfiguration: 'board_defined',
    objectiveEvidence: input.objectiveEvidence,
    oceanSpaceIds: tileActionSet.oceanSpaceIds,
    offReserveOceanExceptionSpaceIds: offReserve.exceptionSpaceIds,
  });
  return { mapReview, offReserve };
}

describe('evaluateImportMapGate (shared client/server rule)', () => {
  it('passes a verified off-reserve-ocean exception on both sides', () => {
    const { mapReview, offReserve } = pipeline({
      objectiveEvidence: tharsisMilestoneEvidence,
      withExceptionEvidence: true,
    });
    expect(offReserve.exceptionSpaceIds).toEqual(['08']);
    expect(mapReview.kind).toBe('confident');
    expect(mapReview.detectedMapCode).toBe('tharsis');

    const gate = evaluateImportMapGate({
      confirmedMapId: 'map-tharsis',
      mapReview,
    });
    expect(gate).toEqual({ blocked: false, message: null, reason: null });
  });

  it('keeps an ordinary unexplained off-reserve ocean blocked', () => {
    const { mapReview } = pipeline({
      objectiveEvidence: tharsisMilestoneEvidence,
      withExceptionEvidence: false,
    });
    // Board-defined Tharsis objectives against an ocean outside Tharsis's
    // reserved spaces, with no verified exception card: a true conflict.
    expect(mapReview.kind).toBe('conflicting');

    const gate = evaluateImportMapGate({
      confirmedMapId: 'map-tharsis',
      mapReview,
    });
    expect(gate.blocked).toBe(true);
    expect(gate.reason).toBe('conflicting');
    expect(gate.message).toBe(mapReview.message);
  });

  it('leaves incomplete exception evidence ambiguous — deferred to the confirmed map, not blocked', () => {
    const { mapReview } = pipeline({
      objectiveEvidence: [],
      withExceptionEvidence: false,
    });
    expect(mapReview.kind).not.toBe('confident');
    expect(mapReview.kind).not.toBe('conflicting');

    const gate = evaluateImportMapGate({
      confirmedMapId: 'map-tharsis',
      mapReview,
    });
    expect(gate.blocked).toBe(false);
  });

  it('keeps an unknown map unknown — missing detection never blocks the confirmed map', () => {
    const mapReview = detectImportBoardMapIndependent({
      catalog: mapCatalog,
      objectiveConfiguration: 'board_defined',
      objectiveEvidence: [],
      oceanSpaceIds: [],
      offReserveOceanExceptionSpaceIds: [],
    });
    expect(mapReview.detectedMapId).toBeNull();

    const gate = evaluateImportMapGate({
      confirmedMapId: 'map-tharsis',
      mapReview,
    });
    expect(gate.blocked).toBe(false);
  });

  it('blocks a confident detection of a different map than the confirmed one', () => {
    const gate = evaluateImportMapGate({
      confirmedMapId: 'map-hellas',
      mapReview: {
        detectedMapId: 'map-tharsis',
        kind: 'confident',
        message: 'The board evidence identifies Tharsis.',
      },
    });
    expect(gate.blocked).toBe(true);
    expect(gate.reason).toBe('confident_mismatch');
  });
});
